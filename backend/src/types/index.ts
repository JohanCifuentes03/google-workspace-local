import { z } from 'zod';

// User session types
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

// OAuth types
export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUrl: string;
}

// Tool execution types
export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
}

// MCP Tool schemas
export const GmailSearchSchema = z.object({
  query: z.string().describe('Gmail search query using Gmail operators'),
  maxResults: z.number().min(1).max(100).default(10).describe('Maximum number of emails to return')
});

export const GmailSendSchema = z.object({
  to: z.string().describe('Recipient email address'),
  subject: z.string().describe('Email subject line'),
  body: z.string().describe('Email body content in plain text')
});

export const GmailReadSchema = z.object({
  messageId: z.string().describe('The Gmail message ID to read')
});

export const DriveSearchSchema = z.object({
  query: z.string().describe('Drive search query using Drive operators'),
  maxResults: z.number().min(1).max(100).default(10).describe('Maximum number of files to return')
});

export const DriveReadSchema = z.object({
  fileId: z.string().describe('The Google Drive file ID to read')
});

export const DriveListSchema = z.object({
  folderId: z.string().default('root').describe('The Google Drive folder ID to list'),
  maxResults: z.number().min(1).max(100).default(20).describe('Maximum number of items to return')
});

export const CalendarListEventsSchema = z.object({
  calendarId: z.string().default('primary').describe('Calendar ID to query'),
  maxResults: z.number().min(1).max(100).default(10).describe('Maximum number of events to return'),
  timeMin: z.string().optional().describe('Start time in ISO 8601 format'),
  timeMax: z.string().optional().describe('End time in ISO 8601 format')
});

export const CalendarCreateEventSchema = z.object({
  calendarId: z.string().default('primary').describe('Calendar ID where to create the event'),
  summary: z.string().describe('Event title'),
  description: z.string().optional().describe('Event description'),
  start: z.object({
    dateTime: z.string().describe('Start date and time in ISO 8601 format'),
    timeZone: z.string().default('UTC').describe('Time zone')
  }),
  end: z.object({
    dateTime: z.string().describe('End date and time in ISO 8601 format'),
    timeZone: z.string().default('UTC').describe('Time zone')
  })
});

export const CalendarGetEventSchema = z.object({
  calendarId: z.string().default('primary').describe('Calendar ID where the event is located'),
  eventId: z.string().describe('The unique event ID')
});

// Service interfaces
export interface IAuthService {
  createOAuthClient(userId: string): any;
  getAuthUrl(userId: string): string;
  handleCallback(code: string, userId: string): Promise<void>;
  refreshTokens(userId: string): Promise<any>;
  disconnect(userId: string): Promise<void>;
}

export interface ISessionService {
  createSession(): Promise<string>;
  getSession(userId: string): Promise<UserSession | null>;
  saveUserTokens(userId: string, tokens: UserTokens): Promise<void>;
  getUserTokens(userId: string): Promise<UserTokens | null>;
  disconnectUser(userId: string): Promise<void>;
  cleanupExpiredSessions(): Promise<void>;
}

export interface IGmailService {
  search(query: string, maxResults?: number): Promise<any[]>;
  send(to: string, subject: string, body: string): Promise<any>;
  read(messageId: string): Promise<any>;
}

export interface IDriveService {
  search(query: string, maxResults?: number): Promise<any[]>;
  read(fileId: string): Promise<any>;
  list(folderId?: string, maxResults?: number): Promise<any[]>;
}

export interface ICalendarService {
  listEvents(calendarId?: string, maxResults?: number, timeMin?: string, timeMax?: string): Promise<any[]>;
  createEvent(calendarId: string, summary: string, start: any, end: any, description?: string): Promise<any>;
  getEvent(calendarId: string, eventId: string): Promise<any>;
}