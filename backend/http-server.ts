import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { SessionManager } from './session-manager';

import { createGmailTools } from './tools/gmail';
import { createDriveTools } from './tools/drive';
import { createCalendarTools } from './tools/calendar';

const app = express();
app.use(cors());
app.use(express.json());

const sessionManager = new SessionManager();

// In-memory cache of MCP servers per user (for performance)
const userMcpServers = new Map<string, any>();

// Helper function to get or create MCP server for a user
async function getUserMcpServer(userId: string) {
  if (userMcpServers.has(userId)) {
    return userMcpServers.get(userId);
  }

  // Create OAuth client for this user
  const oauthClient = await sessionManager.createOAuthClient(userId);

  // Create tools for this user
  const tools = {
    ...createGmailTools(oauthClient),
    ...createDriveTools(oauthClient),
    ...createCalendarTools(oauthClient),
  };

  userMcpServers.set(userId, tools);
  return tools;
}

// Create new session endpoint
app.get('/session/new', async (req, res) => {
  try {
    const userId = await sessionManager.createSession();
    const baseUrl = process.env.PUBLIC_URL || `http://localhost:${process.env.PORT || 3000}`;
    res.json({
      userId,
      authUrl: `${baseUrl}/auth/start/${userId}`,
      mcpUrl: `${baseUrl}/mcp/${userId}`,
      status: 'created'
    });
  } catch (error: any) {
    console.error('Error creating session:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// OAuth endpoints (per user)
app.get('/auth/start/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const session = await sessionManager.getSession(userId);

    if (!session) {
      return res.status(404).send('Session not found');
    }

    const oauthClient = await sessionManager.createOAuthClient(userId);
    const authUrl = oauthClient.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/gmail.modify',
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/calendar'
      ],
      prompt: 'consent',
      state: userId // Pass userId in state parameter
    });

    res.redirect(authUrl);
  } catch (error: any) {
    console.error('Error generating auth URL:', error);
    res.status(500).send('Error generating auth URL');
  }
});

app.get('/auth/callback', async (req, res) => {
  const { code, state: userId } = req.query;

  if (!userId || typeof userId !== 'string') {
    return res.status(400).send('Invalid userId in state parameter');
  }

  try {
    const oauthClient = await sessionManager.createOAuthClient(userId);
    const { tokens } = await oauthClient.getToken(code as string);
    oauthClient.setCredentials(tokens);

    await sessionManager.saveUserTokens(userId, tokens);

    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Conectado</title>
          <script>
            window.onload = function() {
              window.opener.postMessage({ type: 'connected', userId: '${userId}' }, '*');
              setTimeout(() => window.close(), 1000);
            };
          </script>
        </head>
        <body>
          <h1>✅ Conectado! Esta ventana se cerrará automáticamente.</h1>
          <p>Tu ID de usuario: ${userId}</p>
        </body>
      </html>
    `);
  } catch (error: any) {
    console.error('Auth callback error:', error);
    res.status(500).send('Error en autenticación');
  }
});

// Status endpoint (per user)
app.get('/status/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const session = await sessionManager.getSession(userId);
    const tokens = await sessionManager.getUserTokens(userId);

    const connected = session && tokens && tokens.access_token;
    const baseUrl = process.env.PUBLIC_URL || `http://localhost:${process.env.PORT || 3000}`;

    res.json({
      userId,
      connected,
      mcpUrl: connected ? `${baseUrl}/mcp/${userId}` : null,
      session: session ? {
        createdAt: session.createdAt,
        expiresAt: session.expiresAt
      } : null
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to get status' });
  }
});

// Disconnect endpoint (per user)
app.post('/disconnect/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    await sessionManager.disconnectUser(userId);
    userMcpServers.delete(userId); // Remove from cache
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to disconnect' });
  }
});

// MCP endpoint (per user)
app.all('/mcp/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const session = await sessionManager.getSession(userId);
    const tokens = await sessionManager.getUserTokens(userId);

    if (!session || !tokens || !tokens.access_token) {
      return res.status(401).json({ error: 'User not connected to Google Workspace' });
    }

    const { method, params, id } = req.body;

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
      const tools = await getUserMcpServer(userId);
      result = {
        tools: Object.values(tools).map((tool: any) => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema,
        }))
      };
    } else if (method === 'tools/call') {
      const { name, arguments: args } = params;
      const tools = await getUserMcpServer(userId);
      const tool = tools[name];

      if (!tool) {
        return res.status(200).json({
          jsonrpc: '2.0',
          error: {
            code: -32601,
            message: `Tool '${name}' not found`
          },
          id
        });
      }

      const toolResult = await tool.execute(args);
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
});

// Cleanup expired sessions periodically
setInterval(async () => {
  await sessionManager.cleanupExpiredSessions();
}, 60 * 60 * 1000); // Every hour

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Multi-tenant HTTP Server running on http://localhost:${PORT}`);
  console.log(`🌐 Public URL: ${process.env.PUBLIC_URL || 'http://localhost:' + PORT}`);
  console.log(`👥 Multi-tenant MCP URLs: {PUBLIC_URL}/mcp/{userId}`);
  console.log(`💡 To expose publicly: run 'ngrok http ${PORT}' in another terminal`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down...');
  await sessionManager.close();
  process.exit(0);
});