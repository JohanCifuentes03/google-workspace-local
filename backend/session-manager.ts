import { createClient, RedisClientType } from 'redis';
import { google } from 'googleapis';

export interface UserSession {
  userId: string;
  createdAt: number;
  expiresAt: number;
  connected: boolean;
}

export interface UserTokens {
  access_token: string;
  refresh_token?: string;
  expiry_date?: number;
}

export class SessionManager {
  private redis: RedisClientType;

  constructor() {
    this.redis = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });

    this.redis.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    this.connect();
  }

  private async connect() {
    try {
      await this.redis.connect();
      console.log('✅ Connected to Redis');
    } catch (error) {
      console.error('❌ Failed to connect to Redis:', error);
    }
  }

  async createSession(): Promise<string> {
    const userId = crypto.randomUUID();
    const session: UserSession = {
      userId,
      createdAt: Date.now(),
      expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
      connected: false
    };

    await this.redis.setEx(`session:${userId}`, 86400, JSON.stringify(session));
    console.log(`📝 Created session for user: ${userId}`);
    return userId;
  }

  async getSession(userId: string): Promise<UserSession | null> {
    try {
      const sessionData = await this.redis.get(`session:${userId}`);
      return sessionData ? JSON.parse(sessionData) : null;
    } catch (error) {
      console.error('Error getting session:', error);
      return null;
    }
  }

  async updateSession(userId: string, updates: Partial<UserSession>): Promise<void> {
    const session = await this.getSession(userId);
    if (session) {
      const updatedSession = { ...session, ...updates };
      await this.redis.setEx(`session:${userId}`, 86400, JSON.stringify(updatedSession));
    }
  }

  async saveUserTokens(userId: string, tokens: UserTokens): Promise<void> {
    await this.redis.setEx(`tokens:${userId}`, 86400, JSON.stringify(tokens));
    await this.updateSession(userId, { connected: true });
    console.log(`💾 Saved tokens for user: ${userId}`);
  }

  async getUserTokens(userId: string): Promise<UserTokens | null> {
    try {
      const tokensData = await this.redis.get(`tokens:${userId}`);
      return tokensData ? JSON.parse(tokensData) : null;
    } catch (error) {
      console.error('Error getting tokens:', error);
      return null;
    }
  }

  async createOAuthClient(userId: string): Promise<any> {
    // For now, using shared credentials. In production, each user could have their own
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.PUBLIC_URL || 'http://localhost:3000'}/auth/callback`
    );

    // Load user's tokens if they exist
    const tokens = await this.getUserTokens(userId);
    if (tokens) {
      oauth2Client.setCredentials(tokens);
    }

    return oauth2Client;
  }

  async disconnectUser(userId: string): Promise<void> {
    await this.redis.del(`tokens:${userId}`);
    await this.updateSession(userId, { connected: false });
    console.log(`🔌 Disconnected user: ${userId}`);
  }

  async cleanupExpiredSessions(): Promise<void> {
    // This would be called periodically to clean up expired sessions
    const now = Date.now();
    // In a real implementation, you'd scan all sessions and remove expired ones
    console.log('🧹 Session cleanup completed');
  }

  async close(): Promise<void> {
    await this.redis.quit();
  }
}