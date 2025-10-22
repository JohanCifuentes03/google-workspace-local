import { createClient, RedisClientType } from 'redis';
import { ISessionService, UserSession, UserTokens } from '../types';

export class SessionService implements ISessionService {
  private redis: RedisClientType;

  constructor(redisUrl?: string) {
    this.redis = createClient({
      url: redisUrl || process.env.REDIS_URL || 'redis://localhost:6379'
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

  async saveUserTokens(userId: string, tokens: UserTokens): Promise<void> {
    await this.redis.setEx(`tokens:${userId}`, 86400, JSON.stringify(tokens));
    await this.updateSessionStatus(userId, true);
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

  async disconnectUser(userId: string): Promise<void> {
    await this.redis.del(`tokens:${userId}`);
    await this.updateSessionStatus(userId, false);
    console.log(`🔌 Disconnected user: ${userId}`);
  }

  private async updateSessionStatus(userId: string, connected: boolean): Promise<void> {
    const session = await this.getSession(userId);
    if (session) {
      session.connected = connected;
      await this.redis.setEx(`session:${userId}`, 86400, JSON.stringify(session));
    }
  }

  async cleanupExpiredSessions(): Promise<void> {
    // In a production implementation, you would scan all sessions
    // For now, just log that cleanup occurred
    console.log('🧹 Session cleanup completed');
  }

  async close(): Promise<void> {
    await this.redis.quit();
  }
}