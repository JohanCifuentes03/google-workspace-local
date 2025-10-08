require('dotenv').config();
const express = require('express');
const cors = require('cors');
const OAuth2Manager = require('./auth');
const { createGmailTools } = require('./tools/gmail');
const { createDriveTools } = require('./tools/drive');
const { createCalendarTools } = require('./tools/calendar');

const app = express();
app.use(cors());
app.use(express.json());

let oauth = null;
let tools = null;

try {
  oauth = new OAuth2Manager();
  console.log('✅ OAuth manager initialized');
} catch (error) {
  console.error('❌ Failed to initialize OAuth manager:', error.message);
  process.exit(1);
}

// Initialize tools when OAuth is ready
const initializeTools = () => {
  if (!tools) {
    tools = {
      ...createGmailTools(oauth),
      ...createDriveTools(oauth),
      ...createCalendarTools(oauth),
    };
  }
  return tools;
};

// OAuth endpoints
app.get('/auth/start', (req, res) => {
  try {
    const authUrl = oauth.getAuthUrl();
    res.redirect(authUrl);
  } catch (error) {
    res.status(500).send('Error generating auth URL');
  }
});

app.get('/auth/callback', async (req, res) => {
  const { code } = req.query;
  try {
    await oauth.handleCallback(code);
    initializeTools(); // Initialize tools with authenticated client
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Conectado</title>
          <script>
            window.onload = function() {
              window.opener.postMessage('connected', '*');
              setTimeout(() => window.close(), 1000);
            };
          </script>
        </head>
        <body>
          <h1>✅ Conectado! Esta ventana se cerrará automáticamente.</h1>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Auth callback error:', error);
    res.status(500).send('Error en autenticación');
  }
});

// Status endpoint
app.get('/status', (req, res) => {
  const tokens = oauth.getTokens();
  const connected = tokens !== null;
  const baseUrl = process.env.PUBLIC_URL || `http://localhost:${process.env.PORT || 3000}`;
  res.json({
    connected,
    mcpUrl: connected ? `${baseUrl}/mcp` : null
  });
});

// Disconnect endpoint
app.post('/disconnect', (req, res) => {
  oauth.disconnect();
  tools = null; // Reset tools
  res.json({ success: true });
});

// MCP endpoint
app.all('/mcp', async (req, res) => {
  const tokens = oauth.getTokens();
  if (!tokens) {
    return res.status(401).json({ error: 'Not connected to Google Workspace' });
  }

  try {
    const { method, params, id } = req.body;
    console.log('MCP Request received:', JSON.stringify(req.body, null, 2));

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
      const allTools = initializeTools();
      result = {
        tools: Object.values(allTools).map(tool => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema,
        }))
      };
    } else if (method === 'tools/call') {
      const { name, arguments: args } = params;
      const allTools = initializeTools();
      const tool = allTools[name];

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
  } catch (error) {
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

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🌐 Public URL: ${process.env.PUBLIC_URL || 'http://localhost:' + PORT}`);
  console.log(`🔗 MCP URL: ${process.env.PUBLIC_URL || 'http://localhost:' + PORT}/mcp`);
  console.log(`💡 To expose publicly: run 'ngrok http ${PORT}' in another terminal`);
});

// Handle server errors
server.on('error', (error) => {
  console.error('❌ Server error:', error.message);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});