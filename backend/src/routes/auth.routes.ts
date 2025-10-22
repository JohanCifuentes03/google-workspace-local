import { Router, Request, Response } from 'express';
import { AuthService, SessionService } from '../services';
import { requireAuth, optionalAuth, asyncHandler } from '../middleware';
import { z } from 'zod';

const router = Router();
const authService = new AuthService({
  clientId: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  redirectUrl: `${process.env.PUBLIC_URL || 'http://localhost:3000'}/auth/callback`
});
const sessionService = new SessionService();

// Create new session
router.get('/session/new', asyncHandler(async (req, res) => {
  console.log('[session/new] incoming request', {
    origin: req.headers.origin,
    referer: req.headers.referer,
    query: req.query,
    userAgent: req.headers['user-agent'],
    accept: req.headers['accept']
  });
  const userId = await sessionService.createSession();
  const baseUrl = process.env.PUBLIC_URL || `http://localhost:${process.env.PORT || 3000}`;

  res.json({
    userId,
    authUrl: `${baseUrl}/auth/start/${userId}`,
    mcpUrl: `${baseUrl}/mcp/${userId}`,
    status: 'created'
  });
}));

// Start OAuth flow
router.get('/auth/start/:userId', asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const session = await sessionService.getSession(userId);

  if (!session) {
    return res.status(404).send('Session not found');
  }

  const authUrl = authService.getAuthUrl(userId);
  res.redirect(authUrl);
}));

// OAuth callback
router.get('/auth/callback', asyncHandler(async (req, res) => {
  const { code, state: userId } = req.query;

  if (!userId || typeof userId !== 'string') {
    return res.status(400).send('Invalid userId in state parameter');
  }

  const oauthClient = authService.createOAuthClient(userId);
  const { tokens } = await oauthClient.getToken(code as string);
  oauthClient.setCredentials(tokens);

  await sessionService.saveUserTokens(userId, tokens);

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
}));

// Get user status
router.get('/status/:userId', optionalAuth, asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const session = await sessionService.getSession(userId);
  const tokens = await sessionService.getUserTokens(userId);

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
}));

// Disconnect user
router.post('/disconnect/:userId', requireAuth, asyncHandler(async (req, res) => {
  const { userId } = req.params;
  await sessionService.disconnectUser(userId);
  res.json({ success: true });
}));

export default router;