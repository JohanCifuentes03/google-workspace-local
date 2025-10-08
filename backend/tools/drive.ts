import { google } from 'googleapis';

export function createDriveTools(oauth: any) {
  return {
    drive_search: {
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
      },
      execute: async (args: any) => {
        const drive = google.drive({ version: 'v3', auth: oauth });

        try {
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
        } catch (error: any) {
          throw new Error(`Drive search failed: ${error.message}`);
        }
      }
    },

    drive_read: {
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
      },
      execute: async (args: any) => {
        const drive = google.drive({ version: 'v3', auth: oauth });

        try {
          const { fileId } = args;

          // First get file metadata
          const metadata = await drive.files.get({
            fileId: fileId,
            fields: 'name,mimeType,size'
          });

          let content = '';

          // Only read text-based files
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
        } catch (error: any) {
          throw new Error(`Drive read failed: ${error.message}`);
        }
      }
    },

    drive_list: {
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
      },
      execute: async (args: any) => {
        const drive = google.drive({ version: 'v3', auth: oauth });

        try {
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
        } catch (error: any) {
          throw new Error(`Drive list failed: ${error.message}`);
        }
      }
    }
  };
}