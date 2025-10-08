import { google } from 'googleapis';

export function createCalendarTools(oauth: any) {
  return {
    calendar_list_events: {
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
      },
      execute: async (args: any) => {
        const calendar = google.calendar({ version: 'v3', auth: oauth });

        try {
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
        } catch (error: any) {
          throw new Error(`Calendar list events failed: ${error.message}`);
        }
      }
    },

    calendar_create_event: {
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
      },
      execute: async (args: any) => {
        const calendar = google.calendar({ version: 'v3', auth: oauth });

        try {
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
        } catch (error: any) {
          throw new Error(`Calendar create event failed: ${error.message}`);
        }
      }
    },

    calendar_get_event: {
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
      },
      execute: async (args: any) => {
        const calendar = google.calendar({ version: 'v3', auth: oauth });

        try {
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
        } catch (error: any) {
          throw new Error(`Calendar get event failed: ${error.message}`);
        }
      }
    }
  };
}