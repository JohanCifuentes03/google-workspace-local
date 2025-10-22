import { google } from 'googleapis';
import { IAuthService, OAuthConfig, UserTokens } from '../types';

export class AuthService implements IAuthService {
  private config: OAuthConfig;

  constructor(config: OAuthConfig) {
    this.config = config;
  }

  createOAuthClient(userId: string): any {
    return new google.auth.OAuth2(
      this.config.clientId,
      this.config.clientSecret,
      this.config.redirectUrl
    );
  }

  getAuthUrl(userId: string): string {
    const oauth2Client = this.createOAuthClient(userId);

    const scopes = [
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/drive',
      'https://www.googleapis.com/auth/calendar'
    ];

    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
      state: userId
    });
  }

  async handleCallback(code: string, userId: string): Promise<void> {
    const oauth2Client = this.createOAuthClient(userId);

    try {
      const { tokens } = await oauth2Client.getToken(code);
      oauth2Client.setCredentials(tokens);
      console.log(`✅ Tokens obtained for user: ${userId}`);
    } catch (error) {
      console.error('❌ Error handling OAuth callback:', error);
      throw error;
    }
  }

  async refreshTokens(userId: string): Promise<any> {
    // This would need to be implemented with token storage
    throw new Error('Refresh tokens not implemented - needs token storage integration');
  }

  async disconnect(userId: string): Promise<void> {
    // This would need to be implemented with token storage
    console.log(`🔌 Disconnected user: ${userId}`);
  }
}