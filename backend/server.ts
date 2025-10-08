#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { google } from 'googleapis';

class GoogleWorkspaceMCPServer {
  private server: Server;
  private oauth2Client: any;
  private tools: Tool[];

  constructor() {
    // Initialize OAuth client
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.PUBLIC_URL || 'http://localhost:3000'}/auth/callback`
    );

    // Initialize MCP Server
    this.server = new Server(
      {
        name: 'google-workspace-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Initialize tools
    this.tools = this.createTools();

    this.setupToolHandlers();
  }

  private createTools(): Tool[] {
    return [
      // Gmail Search Tool
      {
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
        }
      },

      // Gmail Send Tool
      {
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
        }
      },

      // Gmail Read Tool
      {
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
        }
      },

      // Drive Search Tool
      {
        name: 'drive_search',
        description: 'Search for files in Google Drive using Drive search queries. Returns file metadata including name, type, size, and modification date. Use Drive query syntax like "name contains \'report\'", "mimeType = \'application/pdf\'", "modifiedTime > \'2024-01-01T00:00:00\'"',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Drive search query using Drive operators. Examples: "name contains \'presentation\'", "mimeType = \'application/vnd.google-apps.document\'", "fullText contains \'meeting notes\'", "modifiedTime > \'2024-01-01T00:00:00\'"'
            },
            maxResults: {
              type: 'number',
              description: 'Maximum number of files to return (1-100)',
              default: 10,
              minimum: 1,
              maximum: 100
            }
          },
          required: ['query']
        }
      },

      // Drive Read Tool
      {
        name: 'drive_read',
        description: 'Read the text content of a Google Drive file. Only works with text-based files (txt, json, js, etc.). For binary files or Google Docs, returns a message indicating the file type. Use drive_search first to find file IDs.',
        inputSchema: {
          type: 'object',
          properties: {
            fileId: {
              type: 'string',
              description: 'The Google Drive file ID obtained from drive_search results. Must be a text-based file.'
            }
          },
          required: ['fileId']
        }
      },

      // Drive List Tool
      {
        name: 'drive_list',
        description: 'List files and folders in a specific Google Drive folder. Returns all direct children of the specified folder. Use "root" for the root folder, or provide a folder ID from drive_search results.',
        inputSchema: {
          type: 'object',
          properties: {
            folderId: {
              type: 'string',
              description: 'The Google Drive folder ID to list contents from. Use "root" for the main Drive folder.',
              default: 'root'
            },
            maxResults: {
              type: 'number',
              description: 'Maximum number of items to return (1-100)',
              default: 20,
              minimum: 1,
              maximum: 100
            }
          }
        }
      },

      // Calendar List Events Tool
      {
        name: 'calendar_list_events',
        description: 'List upcoming events from Google Calendar. Returns events with title, time, location, and attendees. By default shows future events from now. Use timeMin/timeMax to filter date ranges.',
        inputSchema: {
          type: 'object',
          properties: {
            calendarId: {
              type: 'string',
              description: 'Calendar ID to query. Use "primary" for your main calendar.',
              default: 'primary'
            },
            maxResults: {
              type: 'number',
              description: 'Maximum number of events to return (1-100)',
              default: 10,
              minimum: 1,
              maximum: 100
            },
            timeMin: {
              type: 'string',
              description: 'Start time for events in ISO 8601 format (e.g., "2024-01-01T00:00:00Z"). If not provided, shows events from now.'
            },
            timeMax: {
              type: 'string',
              description: 'End time for events in ISO 8601 format (e.g., "2024-12-31T23:59:59Z"). If not provided, shows all future events.'
            }
          }
        }
      },

      // Calendar Create Event Tool
      {
        name: 'calendar_create_event',
        description: 'Create a new event in Google Calendar. The event will be added to your specified calendar with title, description, and time details. Use ISO 8601 format for dates (e.g., "2024-12-25T10:00:00Z").',
        inputSchema: {
          type: 'object',
          properties: {
            calendarId: {
              type: 'string',
              description: 'Calendar ID where to create the event. Use "primary" for your main calendar.',
              default: 'primary'
            },
            summary: {
              type: 'string',
              description: 'Event title or summary that will appear in the calendar'
            },
            description: {
              type: 'string',
              description: 'Detailed description of the event'
            },
            start: {
              type: 'object',
              description: 'Event start date and time',
              properties: {
                dateTime: {
                  type: 'string',
                  description: 'Start date and time in ISO 8601 format (e.g., "2024-12-25T10:00:00Z" or "2024-12-25T10:00:00-05:00")'
                },
                timeZone: {
                  type: 'string',
                  description: 'Time zone for the event (e.g., "America/New_York", "Europe/London", "UTC")',
                  default: 'UTC'
                }
              },
              required: ['dateTime']
            },
            end: {
              type: 'object',
              description: 'Event end date and time',
              properties: {
                dateTime: {
                  type: 'string',
                  description: 'End date and time in ISO 8601 format (e.g., "2024-12-25T11:00:00Z")'
                },
                timeZone: {
                  type: 'string',
                  description: 'Time zone for the event end (should match start timeZone)',
                  default: 'UTC'
                }
              },
              required: ['dateTime']
            }
          },
          required: ['summary', 'start', 'end']
        }
      },

      // Calendar Get Event Tool
      {
        name: 'calendar_get_event',
        description: 'Get complete details of a specific calendar event by its ID. Returns full event information including attendees, location, description, and all metadata. Use calendar_list_events first to find event IDs.',
        inputSchema: {
          type: 'object',
          properties: {
            calendarId: {
              type: 'string',
              description: 'Calendar ID where the event is located. Use "primary" for your main calendar.',
              default: 'primary'
            },
            eventId: {
              type: 'string',
              description: 'The unique event ID obtained from calendar_list_events results'
            }
          },
          required: ['eventId']
        }
      }
    ];
  }

  private setupToolHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: this.tools
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      const tool = this.tools.find(t => t.name === name);
      if (!tool) {
        throw new Error(`Tool '${name}' not found`);
      }

      // Execute the tool based on name
      const result = await this.executeTool(name, args);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    });
  }

  private async executeTool(name: string, args: any): Promise<any> {
    switch (name) {
      case 'gmail_search':
        return this.executeGmailSearch(args);
      case 'gmail_send':
        return this.executeGmailSend(args);
      case 'gmail_read':
        return this.executeGmailRead(args);
      case 'drive_search':
        return this.executeDriveSearch(args);
      case 'drive_read':
        return this.executeDriveRead(args);
      case 'drive_list':
        return this.executeDriveList(args);
      case 'calendar_list_events':
        return this.executeCalendarListEvents(args);
      case 'calendar_create_event':
        return this.executeCalendarCreateEvent(args);
      case 'calendar_get_event':
        return this.executeCalendarGetEvent(args);
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  // Tool implementations
  private async executeGmailSearch(args: any): Promise<any> {
    const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
    const { query, maxResults = 10 } = args;

    const res = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults: Math.min(maxResults, 100)
    });

    const messages = res.data.messages || [];
    const detailedMessages = [];

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
  }

  private async executeGmailSend(args: any): Promise<any> {
    const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
    const { to, subject, body } = args;

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
  }

  private async executeGmailRead(args: any): Promise<any> {
    const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
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
      subject: headers.find((h: any) => h.name === 'Subject')?.value,
      from: headers.find((h: any) => h.name === 'From')?.value,
      to: headers.find((h: any) => h.name === 'To')?.value,
      date: headers.find((h: any) => h.name === 'Date')?.value,
      body: body
    };
  }

  private async executeDriveSearch(args: any): Promise<any> {
    const drive = google.drive({ version: 'v3', auth: this.oauth2Client });
    const { query, maxResults = 10 } = args;

    const res = await drive.files.list({
      q: query,
      pageSize: Math.min(maxResults, 100),
      fields: 'files(id,name,mimeType,modifiedTime,size,webViewLink)'
    });

    return res.data.files?.map((file: any) => ({
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      modifiedTime: file.modifiedTime,
      size: file.size,
      webViewLink: file.webViewLink
    })) || [];
  }

  private async executeDriveRead(args: any): Promise<any> {
    const drive = google.drive({ version: 'v3', auth: this.oauth2Client });
    const { fileId } = args;

    const metadata = await drive.files.get({
      fileId: fileId,
      fields: 'name,mimeType,size'
    });

    let content = '';
    if (metadata.data.mimeType?.startsWith('text/') ||
        metadata.data.mimeType === 'application/json' ||
        metadata.data.mimeType === 'application/javascript') {

      const res = await drive.files.get({
        fileId: fileId,
        alt: 'media'
      }, { responseType: 'text' });

      content = res.data as string;
    } else {
      content = `File is of type ${metadata.data.mimeType} and cannot be read as text.`;
    }

    return {
      id: fileId,
      name: metadata.data.name,
      mimeType: metadata.data.mimeType,
      size: metadata.data.size,
      content: content
    };
  }

  private async executeDriveList(args: any): Promise<any> {
    const drive = google.drive({ version: 'v3', auth: this.oauth2Client });
    const { folderId = 'root', maxResults = 20 } = args;

    const query = folderId === 'root' ? "'root' in parents" : `'${folderId}' in parents`;

    const res = await drive.files.list({
      q: query + " and trashed = false",
      pageSize: Math.min(maxResults, 100),
      fields: 'files(id,name,mimeType,modifiedTime,size,webViewLink)',
      orderBy: 'modifiedTime desc'
    });

    return res.data.files?.map((file: any) => ({
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      modifiedTime: file.modifiedTime,
      size: file.size,
      webViewLink: file.webViewLink
    })) || [];
  }

  private async executeCalendarListEvents(args: any): Promise<any> {
    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
    const { calendarId = 'primary', maxResults = 10, timeMin, timeMax } = args;

    const params: any = {
      calendarId: calendarId,
      maxResults: Math.min(maxResults, 100),
      singleEvents: true,
      orderBy: 'startTime'
    };

    if (timeMin) params.timeMin = timeMin;
    if (timeMax) params.timeMax = timeMax;

    const res = await calendar.events.list(params);

    return res.data.items?.map((event: any) => ({
      id: event.id,
      summary: event.summary,
      description: event.description,
      start: event.start,
      end: event.end,
      status: event.status,
      htmlLink: event.htmlLink
    })) || [];
  }

  private async executeCalendarCreateEvent(args: any): Promise<any> {
    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
    const { calendarId = 'primary', summary, description, start, end } = args;

    const event = {
      summary,
      description,
      start: {
        dateTime: start.dateTime,
        timeZone: start.timeZone || 'UTC'
      },
      end: {
        dateTime: end.dateTime,
        timeZone: end.timeZone || 'UTC'
      }
    };

    const res = await calendar.events.insert({
      calendarId: calendarId,
      requestBody: event
    });

    return {
      id: res.data.id,
      summary: res.data.summary,
      htmlLink: res.data.htmlLink,
      status: 'created'
    };
  }

  private async executeCalendarGetEvent(args: any): Promise<any> {
    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
    const { calendarId = 'primary', eventId } = args;

    const res = await calendar.events.get({
      calendarId: calendarId,
      eventId: eventId
    });

    const event = res.data;
    return {
      id: event.id,
      summary: event.summary,
      description: event.description,
      start: event.start,
      end: event.end,
      status: event.status,
      htmlLink: event.htmlLink,
      attendees: event.attendees,
      location: event.location
    };
  }

  // OAuth methods
  getAuthUrl(): string {
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

  async handleCallback(code: string): Promise<void> {
    const { tokens } = await this.oauth2Client.getToken(code);
    this.oauth2Client.setCredentials(tokens);
    console.log('Tokens obtained successfully');
  }

  getTokens(): any {
    return this.oauth2Client.credentials;
  }

  disconnect(): void {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.PUBLIC_URL || 'http://localhost:3000'}/auth/callback`
    );
  }

  getTools(): Tool[] {
    return this.tools;
  }

  async executeToolPublic(name: string, args: any): Promise<any> {
    return this.executeTool(name, args);
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.log('Google Workspace MCP server running on stdio');
  }
}

export { GoogleWorkspaceMCPServer };