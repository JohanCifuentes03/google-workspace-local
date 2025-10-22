import { Router, Request, Response } from 'express';
import { AuthService, SessionService, GmailService, DriveService, CalendarService } from '../services';
import { requireAuth, asyncHandler } from '../middleware';

const router = Router();
const sessionService = new SessionService();

// In-memory cache of service instances per user
const userServices = new Map<string, {
  gmail: GmailService;
  drive: DriveService;
  calendar: CalendarService;
}>();

// Helper function to get or create services for a user
async function getUserServices(userId: string) {
  if (userServices.has(userId)) {
    return userServices.get(userId)!;
  }

  const tokens = await sessionService.getUserTokens(userId);
  if (!tokens) {
    throw new Error('User not authenticated');
  }

  const authService = new AuthService({
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    redirectUrl: `${process.env.PUBLIC_URL || 'http://localhost:3000'}/auth/callback`
  });

  const oauthClient = authService.createOAuthClient(userId);
  oauthClient.setCredentials(tokens);

  const services = {
    gmail: new GmailService(oauthClient),
    drive: new DriveService(oauthClient),
    calendar: new CalendarService(oauthClient)
  };

  userServices.set(userId, services);
  return services;
}

// MCP endpoint (per user)
router.all('/mcp/:userId', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { method, params, id } = req.body;

  try {
    let result;

    if (method === 'initialize') {
      result = {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {
            listChanged: true
          }
        },
        serverInfo: {
          name: 'google-workspace-mcp',
          version: '1.0.0'
        }
      };
    } else if (method === 'tools/list') {
      // Return available tools
      result = {
        tools: [
          {
            name: 'gmail_search',
            description: 'Search for emails in Gmail using Gmail search operators',
            inputSchema: {
              type: 'object',
              properties: {
                query: { type: 'string', description: 'Gmail search query' },
                maxResults: { type: 'number', default: 10, minimum: 1, maximum: 100 }
              },
              required: ['query']
            }
          },
          {
            name: 'gmail_send',
            description: 'Send a new email via Gmail',
            inputSchema: {
              type: 'object',
              properties: {
                to: { type: 'string', description: 'Recipient email address' },
                subject: { type: 'string', description: 'Email subject line' },
                body: { type: 'string', description: 'Email body content' }
              },
              required: ['to', 'subject', 'body']
            }
          },
          {
            name: 'gmail_read',
            description: 'Read the full content of a specific email',
            inputSchema: {
              type: 'object',
              properties: {
                messageId: { type: 'string', description: 'The Gmail message ID' }
              },
              required: ['messageId']
            }
          },
          {
            name: 'drive_search',
            description: 'Search for files in Google Drive',
            inputSchema: {
              type: 'object',
              properties: {
                query: { type: 'string', description: 'Drive search query' },
                maxResults: { type: 'number', default: 10, minimum: 1, maximum: 100 }
              },
              required: ['query']
            }
          },
          {
            name: 'drive_read',
            description: 'Read the text content of a Google Drive file',
            inputSchema: {
              type: 'object',
              properties: {
                fileId: { type: 'string', description: 'The Google Drive file ID' }
              },
              required: ['fileId']
            }
          },
          {
            name: 'drive_list',
            description: 'List files and folders in a Google Drive folder',
            inputSchema: {
              type: 'object',
              properties: {
                folderId: { type: 'string', default: 'root', description: 'The Google Drive folder ID' },
                maxResults: { type: 'number', default: 20, minimum: 1, maximum: 100 }
              }
            }
          },
          {
            name: 'calendar_list_events',
            description: 'List upcoming events from Google Calendar',
            inputSchema: {
              type: 'object',
              properties: {
                calendarId: { type: 'string', default: 'primary', description: 'Calendar ID' },
                maxResults: { type: 'number', default: 10, minimum: 1, maximum: 100 },
                timeMin: { type: 'string', description: 'Start time in ISO 8601 format' },
                timeMax: { type: 'string', description: 'End time in ISO 8601 format' }
              }
            }
          },
          {
            name: 'calendar_create_event',
            description: 'Create a new event in Google Calendar',
            inputSchema: {
              type: 'object',
              properties: {
                calendarId: { type: 'string', default: 'primary', description: 'Calendar ID' },
                summary: { type: 'string', description: 'Event title' },
                description: { type: 'string', description: 'Event description' },
                start: {
                  type: 'object',
                  properties: {
                    dateTime: { type: 'string', description: 'Start date and time in ISO 8601 format' },
                    timeZone: { type: 'string', default: 'UTC', description: 'Time zone' }
                  },
                  required: ['dateTime']
                },
                end: {
                  type: 'object',
                  properties: {
                    dateTime: { type: 'string', description: 'End date and time in ISO 8601 format' },
                    timeZone: { type: 'string', default: 'UTC', description: 'Time zone' }
                  },
                  required: ['dateTime']
                }
              },
              required: ['summary', 'start', 'end']
            }
          },
          {
            name: 'calendar_get_event',
            description: 'Get complete details of a specific calendar event',
            inputSchema: {
              type: 'object',
              properties: {
                calendarId: { type: 'string', default: 'primary', description: 'Calendar ID' },
                eventId: { type: 'string', description: 'The unique event ID' }
              },
              required: ['eventId']
            }
          }
        ]
      };
    } else if (method === 'tools/call') {
      const { name, arguments: args } = params;
      const services = await getUserServices(userId);

      let toolResult;
      switch (name) {
        case 'gmail_search':
          toolResult = await services.gmail.search(args.query, args.maxResults);
          break;
        case 'gmail_send':
          toolResult = await services.gmail.send(args.to, args.subject, args.body);
          break;
        case 'gmail_read':
          toolResult = await services.gmail.read(args.messageId);
          break;
        case 'drive_search':
          toolResult = await services.drive.search(args.query, args.maxResults);
          break;
        case 'drive_read':
          toolResult = await services.drive.read(args.fileId);
          break;
        case 'drive_list':
          toolResult = await services.drive.list(args.folderId, args.maxResults);
          break;
        case 'calendar_list_events':
          toolResult = await services.calendar.listEvents(args.calendarId, args.maxResults, args.timeMin, args.timeMax);
          break;
        case 'calendar_create_event':
          toolResult = await services.calendar.createEvent(args.calendarId, args.summary, args.start, args.end, args.description);
          break;
        case 'calendar_get_event':
          toolResult = await services.calendar.getEvent(args.calendarId, args.eventId);
          break;
        default:
          return res.status(200).json({
            jsonrpc: '2.0',
            error: {
              code: -32601,
              message: `Tool '${name}' not found`
            },
            id
          });
      }

      result = {
        content: [
          {
            type: 'text',
            text: JSON.stringify(toolResult, null, 2),
          },
        ],
      };
    } else {
      return res.status(200).json({
        jsonrpc: '2.0',
        error: {
          code: -32601,
          message: `Method '${method}' not supported`
        },
        id
      });
    }

    res.json({
      jsonrpc: '2.0',
      result,
      id
    });
  } catch (error: any) {
    console.error('MCP Server error:', error);
    res.status(200).json({
      jsonrpc: '2.0',
      error: {
        code: -32603,
        message: error.message
      },
      id: req.body?.id || null
    });
  }
}));

export default router;