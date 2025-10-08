const { google } = require('googleapis');

class OAuth2Manager {
  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.PUBLIC_URL || 'http://localhost:3000'}/auth/callback`
    );
    this.tokens = null;
  }

  getAuthUrl() {
    const scopes = [
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/drive',
      'https://www.googleapis.com/auth/calendar'
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent'
    });
  }

  async handleCallback(code) {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      this.oauth2Client.setCredentials(tokens);
      this.tokens = tokens;
      console.log('Tokens obtained successfully');
    } catch (error) {
      console.error('Error handling callback:', error);
      throw error;
    }
  }

  getTokens() {
    return this.tokens;
  }

  async refreshTokens() {
    if (!this.tokens || !this.tokens.refresh_token) {
      throw new Error('No refresh token available');
    }

    try {
      this.oauth2Client.setCredentials(this.tokens);
      const { credentials } = await this.oauth2Client.refreshAccessToken();
      this.tokens = credentials;
      this.oauth2Client.setCredentials(this.tokens);
      return this.tokens;
    } catch (error) {
      console.error('Error refreshing tokens:', error);
      throw error;
    }
  }

  getClient() {
    return this.oauth2Client;
  }

  disconnect() {
    this.tokens = null;
    // Reset the client
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.PUBLIC_URL || 'http://localhost:3000'}/auth/callback`
    );
  }
}

module.exports = OAuth2Manager;