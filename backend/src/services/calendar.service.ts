import { google } from 'googleapis';
import { ICalendarService } from '../types';

export class CalendarService implements ICalendarService {
  constructor(private oauthClient: any) {}

  async listEvents(calendarId: string = 'primary', maxResults: number = 10, timeMin?: string, timeMax?: string): Promise<any[]> {
    const calendar = google.calendar({ version: 'v3', auth: this.oauthClient });

    try {
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
    } catch (error: any) {
      throw new Error(`Calendar list events failed: ${error.message}`);
    }
  }

  async createEvent(calendarId: string, summary: string, start: any, end: any, description?: string): Promise<any> {
    const calendar = google.calendar({ version: 'v3', auth: this.oauthClient });

    try {
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
    } catch (error: any) {
      throw new Error(`Calendar create event failed: ${error.message}`);
    }
  }

  async getEvent(calendarId: string, eventId: string): Promise<any> {
    const calendar = google.calendar({ version: 'v3', auth: this.oauthClient });

    try {
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
    } catch (error: any) {
      throw new Error(`Calendar get event failed: ${error.message}`);
    }
  }
}