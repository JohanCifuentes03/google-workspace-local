import { google } from 'googleapis';
import { IGmailService } from '../types';

export class GmailService implements IGmailService {
  constructor(private oauthClient: any) {}

  async search(query: string, maxResults: number = 10): Promise<any[]> {
    const gmail = google.gmail({ version: 'v1', auth: this.oauthClient });

    try {
      const res = await gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults: Math.min(maxResults, 100)
      });

      const messages = res.data.messages || [];
      const detailedMessages: any[] = [];

      for (const msg of messages.slice(0, 5)) {
        try {
          const msgRes = await gmail.users.messages.get({
            userId: 'me',
            id: msg.id!,
            format: 'metadata',
            metadataHeaders: ['Subject', 'From', 'To', 'Date']
          });
          const headers = msgRes.data.payload?.headers || [];
          detailedMessages.push({
            id: msg.id,
            threadId: msg.threadId,
            subject: headers.find((h: any) => h.name === 'Subject')?.value,
            from: headers.find((h: any) => h.name === 'From')?.value,
            date: headers.find((h: any) => h.name === 'Date')?.value
          });
        } catch (error) {
          console.error('Error getting message details:', error);
        }
      }

      return detailedMessages;
    } catch (error: any) {
      throw new Error(`Gmail search failed: ${error.message}`);
    }
  }

  async send(to: string, subject: string, body: string): Promise<any> {
    const gmail = google.gmail({ version: 'v1', auth: this.oauthClient });

    try {
      const email = [
        'To: ' + to,
        'Subject: ' + subject,
        '',
        body
      ].join('\r\n');

      const raw = Buffer.from(email).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

      const res = await gmail.users.messages.send({
        userId: 'me',
        requestBody: { raw }
      });

      return {
        messageId: res.data.id,
        threadId: res.data.threadId,
        status: 'sent'
      };
    } catch (error: any) {
      throw new Error(`Gmail send failed: ${error.message}`);
    }
  }

  async read(messageId: string): Promise<any> {
    const gmail = google.gmail({ version: 'v1', auth: this.oauthClient });

    try {
      const res = await gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full'
      });

      const message = res.data;
      const payload = message.payload;
      if (!payload) {
        throw new Error('Message payload not found');
      }

      const headers = payload.headers || [];

      let body = '';
      if (payload.body?.data) {
        body = Buffer.from(payload.body.data, 'base64').toString();
      } else if (payload.parts) {
        const textPart = payload.parts.find((part: any) => part.mimeType === 'text/plain');
        if (textPart?.body?.data) {
          body = Buffer.from(textPart.body.data, 'base64').toString();
        }
      }

      return {
        id: message.id,
        threadId: message.threadId,
        subject: headers.find(h => h.name === 'Subject')?.value,
        from: headers.find(h => h.name === 'From')?.value,
        to: headers.find(h => h.name === 'To')?.value,
        date: headers.find(h => h.name === 'Date')?.value,
        body: body
      };
    } catch (error: any) {
      throw new Error(`Gmail read failed: ${error.message}`);
    }
  }
}