#!/usr/bin/env node

// Check if running as MCP server or HTTP server
const isMcpMode = process.argv.includes('--mcp') || process.env.MCP_MODE === 'true';

if (isMcpMode) {
  // Run as MCP stdio server
  import('./server').then(({ GoogleWorkspaceMCPServer }) => {
    const server = new GoogleWorkspaceMCPServer();
    server.run().catch(console.error);
  });
} else {
  // Run as HTTP server
  import('./app').then(() => {
    console.log('HTTP server started');
  });
}