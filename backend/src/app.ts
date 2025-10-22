import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { authRoutes, mcpRoutes } from './routes';
import { SessionService } from './services';

const app = express();

// Configure CORS - Allow all origins in development
const corsOrigin = process.env.CORS_ORIGIN || '*';
app.use(cors({
  origin: corsOrigin === '*' ? true : corsOrigin,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-requested-with', 'ngrok-skip-browser-warning'],
  credentials: true,
  exposedHeaders: ['*']
}));

/* CORS preflight middleware:
   Avoid using app.options('*', ...) because some router/path-to-regexp versions
   treat '*' as a route parameter and throw. Use a general middleware that
   handles OPTIONS requests safely.
*/
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (corsOrigin === '*' || !origin || origin === corsOrigin) {
    res.header('Access-Control-Allow-Origin', origin || '*');
  }
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-requested-with, ngrok-skip-browser-warning');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Max-Age', '86400'); // Cache preflight for 24 hours
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  next();
});

app.use(express.json());

const sessionService = new SessionService();

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'google-workspace-mcp-backend'
  });
});

// Routes
app.use('/', authRoutes);
app.use('/', mcpRoutes);

// Cleanup expired sessions periodically
setInterval(async () => {
  await sessionService.cleanupExpiredSessions();
}, 60 * 60 * 1000); // Every hour

const PORT = parseInt(process.env.PORT || '3000', 10);
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Multi-tenant HTTP Server running on port ${PORT}`);
  console.log(`🌐 Public URL: ${process.env.PUBLIC_URL || 'http://localhost:' + PORT}`);
  console.log(`👥 Multi-tenant MCP URLs: {PUBLIC_URL}/mcp?userId={userId}`);
  console.log(`💡 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down...');
  await sessionService.close();
  process.exit(0);
});

export default app;