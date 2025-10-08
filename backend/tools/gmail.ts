import { google } from 'googleapis';

function createRawEmail(to: string, subject: string, body: string): string {
  const email = [
    'To: ' + to,
    'Subject: ' + subject,
    '',
    body
  ].join('\r\n');

  return Buffer.from(email).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function createGmailTools(oauth: any) {
  return {
    gmail_search: {
      name: 'gmail_search',
      description: 'Search for emails in Gmail using Gmail search operators. Returns email metadata including subject, sender, and date. Use Gmail search syntax like "from:john@example.com", "subject:meeting", "has:attachment", "newer_than:1d"',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Gmail search query using Gmail operators. Examples: "from:boss@company.com subject:report", "has:attachment newer_than:7d", "label:important is:unread"'
          },
          maxResults: {
            type: 'number',
            description: 'Maximum number of emails to return (1-100)',
            default: 10,
            minimum: 1,
            maximum: 100
          }
        },
        required: ['query']
      },
      execute: async (args: any) => {
        const gmail = google.gmail({ version: 'v1', auth: oauth });

        try {
          const { query, maxResults = 10 } = args;
          const res = await gmail.users.messages.list({
            userId: 'me',
            q: query,
            maxResults: Math.min(maxResults, 100)
          });

          const messages = res.data.messages || [];
          const detailedMessages = [];

          for (const msg of messages.slice(0, 5)) { // Limit to 5 for details
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
    },

    gmail_send: {
      name: 'gmail_send',
      description: 'Send a new email via Gmail. The email will be sent from your authenticated Gmail account. Supports plain text emails.',
      inputSchema: {
        type: 'object',
        properties: {
          to: {
            type: 'string',
            description: 'Recipient email address. Can be a single email or multiple emails separated by commas.'
          },
          subject: {
            type: 'string',
            description: 'Email subject line'
          },
          body: {
            type: 'string',
            description: 'Email body content in plain text'
          }
        },
        required: ['to', 'subject', 'body']
      },
      execute: async (args: any) => {
        const gmail = google.gmail({ version: 'v1', auth: oauth });

        try {
          const { to, subject, body } = args;
          const raw = createRawEmail(to, subject, body);

          const res = await gmail.users.messages.send({
            userId: 'me',
            requestBody: {
              raw: raw
            }
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
    },

    gmail_read: {
      name: 'gmail_read',
      description: 'Read the full content of a specific email by its Gmail message ID. Returns the complete email including headers, body text, and metadata. Use this after searching emails to get the full content.',
      inputSchema: {
        type: 'object',
        properties: {
          messageId: {
            type: 'string',
            description: 'The Gmail message ID obtained from gmail_search results. This is the unique identifier for the email.'
          }
        },
        required: ['messageId']
      },
      execute: async (args: any) => {
        const gmail = google.gmail({ version: 'v1', auth: oauth });

        try {
          const { messageId } = args;
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

          // Extract body
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
  };
}