#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { google } from 'googleapis';
import { z } from 'zod';
import { GmailService, DriveService, CalendarService } from './services';
import {
  GmailSearchSchema,
  GmailSendSchema,
  GmailReadSchema,
  DriveSearchSchema,
  DriveReadSchema,
  DriveListSchema,
  CalendarListEventsSchema,
  CalendarCreateEventSchema,
  CalendarGetEventSchema
} from './types';

class GoogleWorkspaceMCPServer {
  private server: McpServer;
  private oauth2Client: any;

  constructor() {
    // Initialize OAuth client
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.PUBLIC_URL || 'http://localhost:3000'}/auth/callback`
    );

    // Initialize MCP Server
    this.server = new McpServer({
      name: 'google-workspace-mcp',
      version: '1.0.0'
    });

    this.setupTools();
  }

  private setupTools() {
    // Gmail Search Tool
    this.server.tool(
      'gmail_search',
      {
        query: z.string().describe('Gmail search query using Gmail operators. Examples: "from:boss@company.com subject:report", "has:attachment newer_than:7d", "label:important is:unread"'),
        maxResults: z.number().min(1).max(100).default(10).describe('Maximum number of emails to return (1-100)')
      },
      async ({ query, maxResults = 10 }) => {
        const gmailService = new GmailService(this.oauth2Client);
        const results = await gmailService.search(query, maxResults);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(results, null, 2)
            }
          ]
        };
      }
    );

    // Gmail Send Tool
    this.server.tool(
      'gmail_send',
      {
        to: z.string().describe('Recipient email address. Can be a single email or multiple emails separated by commas.'),
        subject: z.string().describe('Email subject line'),
        body: z.string().describe('Email body content in plain text')
      },
      async ({ to, subject, body }) => {
        const gmailService = new GmailService(this.oauth2Client);
        const result = await gmailService.send(to, subject, body);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }
    );

    // Gmail Read Tool
    this.server.tool(
      'gmail_read',
      {
        messageId: z.string().describe('The Gmail message ID obtained from gmail_search results. This is the unique identifier for the email.')
      },
      async ({ messageId }) => {
        const gmailService = new GmailService(this.oauth2Client);
        const result = await gmailService.read(messageId);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }
    );

    // Drive Search Tool
    this.server.tool(
      'drive_search',
      {
        query: z.string().describe('Drive search query using Drive operators. Examples: "name contains \'presentation\'", "mimeType = \'application/vnd.google-apps.document\'", "fullText contains \'meeting notes\'", "modifiedTime > \'2024-01-01T00:00:00\'"'),
        maxResults: z.number().min(1).max(100).default(10).describe('Maximum number of files to return (1-100)')
      },
      async ({ query, maxResults = 10 }) => {
        const driveService = new DriveService(this.oauth2Client);
        const results = await driveService.search(query, maxResults);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(results, null, 2)
            }
          ]
        };
      }
    );

    // Drive Read Tool
    this.server.tool(
      'drive_read',
      {
        fileId: z.string().describe('The Google Drive file ID obtained from drive_search results. Must be a text-based file.')
      },
      async ({ fileId }) => {
        const driveService = new DriveService(this.oauth2Client);
        const result = await driveService.read(fileId);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }
    );

    // Drive List Tool
    this.server.tool(
      'drive_list',
      {
        folderId: z.string().default('root').describe('The Google Drive folder ID to list contents from. Use "root" for the main Drive folder.'),
        maxResults: z.number().min(1).max(100).default(20).describe('Maximum number of items to return (1-100)')
      },
      async ({ folderId = 'root', maxResults = 20 }) => {
        const driveService = new DriveService(this.oauth2Client);
        const results = await driveService.list(folderId, maxResults);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(results, null, 2)
            }
          ]
        };
      }
    );

    // Calendar List Events Tool
    this.server.tool(
      'calendar_list_events',
      {
        calendarId: z.string().default('primary').describe('Calendar ID to query. Use "primary" for your main calendar.'),
        maxResults: z.number().min(1).max(100).default(10).describe('Maximum number of events to return (1-100)'),
        timeMin: z.string().optional().describe('Start time for events in ISO 8601 format (e.g., "2024-01-01T00:00:00Z"). If not provided, shows events from now.'),
        timeMax: z.string().optional().describe('End time for events in ISO 8601 format (e.g., "2024-12-31T23:59:59Z"). If not provided, shows all future events.')
      },
      async ({ calendarId = 'primary', maxResults = 10, timeMin, timeMax }) => {
        const calendarService = new CalendarService(this.oauth2Client);
        const results = await calendarService.listEvents(calendarId, maxResults, timeMin, timeMax);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(results, null, 2)
            }
          ]
        };
      }
    );

    // Calendar Create Event Tool
    this.server.tool(
      'calendar_create_event',
      {
        calendarId: z.string().default('primary').describe('Calendar ID where to create the event. Use "primary" for your main calendar.'),
        summary: z.string().describe('Event title or summary that will appear in the calendar'),
        description: z.string().optional().describe('Detailed description of the event'),
        start: z.object({
          dateTime: z.string().describe('Start date and time in ISO 8601 format (e.g., "2024-12-25T10:00:00Z" or "2024-12-25T10:00:00-05:00")'),
          timeZone: z.string().default('UTC').describe('Time zone for the event (e.g., "America/New_York", "Europe/London", "UTC")')
        }),
        end: z.object({
          dateTime: z.string().describe('End date and time in ISO 8601 format (e.g., "2024-12-25T11:00:00Z")'),
          timeZone: z.string().default('UTC').describe('Time zone for the event end (should match start timeZone)')
        })
      },
      async ({ calendarId = 'primary', summary, description, start, end }) => {
        const calendarService = new CalendarService(this.oauth2Client);
        const result = await calendarService.createEvent(calendarId, summary, start, end, description);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }
    );

    // Calendar Get Event Tool
    this.server.tool(
      'calendar_get_event',
      {
        calendarId: z.string().default('primary').describe('Calendar ID where the event is located. Use "primary" for your main calendar.'),
        eventId: z.string().describe('The unique event ID obtained from calendar_list_events results')
      },
      async ({ calendarId = 'primary', eventId }) => {
        const calendarService = new CalendarService(this.oauth2Client);
        const result = await calendarService.getEvent(calendarId, eventId);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }
    );
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

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.log('Google Workspace MCP server running on stdio');
  }
}

export { GoogleWorkspaceMCPServer };