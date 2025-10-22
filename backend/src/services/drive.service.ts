import { google } from 'googleapis';
import { IDriveService } from '../types';

export class DriveService implements IDriveService {
  constructor(private oauthClient: any) {}

  async search(query: string, maxResults: number = 10): Promise<any[]> {
    const drive = google.drive({ version: 'v3', auth: this.oauthClient });

    try {
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

  async read(fileId: string): Promise<any> {
    const drive = google.drive({ version: 'v3', auth: this.oauthClient });

    try {
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
    } catch (error: any) {
      throw new Error(`Drive read failed: ${error.message}`);
    }
  }

  async list(folderId: string = 'root', maxResults: number = 20): Promise<any[]> {
    const drive = google.drive({ version: 'v3', auth: this.oauthClient });

    try {
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