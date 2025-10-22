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
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Conexión exitosa - Hibot</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #1a1a1a;
            color: #ffffff;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: 20px;
          }
          
          .container {
            text-align: center;
            max-width: 500px;
            background: #2a2a2a;
            border: 1px solid #404040;
            border-radius: 16px;
            padding: 48px 32px;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
          }
          
          .hibot-logo {
            width: 56px;
            height: 64px;
            margin: 0 auto 32px;
            fill: #22c55e;
            animation: fadeInScale 0.5s ease-out forwards;
            opacity: 0;
          }
          
          h1 {
            font-size: 28px;
            font-weight: 600;
            color: #ffffff;
            margin-bottom: 12px;
            letter-spacing: -0.5px;
          }
          
          .subtitle {
            font-size: 16px;
            color: #a0a0a0;
            margin-bottom: 32px;
            line-height: 1.5;
          }
          
          .info-box {
            background: #1a1a1a;
            border: 1px solid #404040;
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 24px;
          }
          
          .info-label {
            font-size: 12px;
            color: #9ca3af;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 8px;
          }
          
          .info-value {
            font-family: 'Courier New', monospace;
            font-size: 13px;
            color: #d1d5db;
            word-break: break-all;
          }
          
          .closing-message {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            color: #6b7280;
            font-size: 14px;
          }
          
          .spinner {
            width: 16px;
            height: 16px;
            border: 2px solid #404040;
            border-top-color: #22c55e;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }
          
          @keyframes fadeInScale {
            from {
              opacity: 0;
              transform: scale(0.8);
            }
            to {
              opacity: 1;
              transform: scale(1);
            }
          }
          
          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        </style>
        <script>
          window.onload = function() {
            // Send success message to parent window
            window.opener.postMessage({ type: 'connected', userId: '${userId}' }, '*');
            
            // Close window after 2 seconds
            setTimeout(() => {
              window.close();
            }, 2000);
          };
        </script>
      </head>
      <body>
        <div class="container">
          <svg class="hibot-logo" viewBox="0 0 14 16" xmlns="http://www.w3.org/2000/svg">
            <g clip-path="url(#clip0_2461_486)">
              <path d="M7.01242 16C3.16335 16 0.0314916 13.0123 0.025282 9.33689L0 8.52168V0L3.30174 3.66999C4.41192 3.00255 5.68312 2.65267 7.01242 2.65267C10.8655 2.65267 14 5.64624 14 9.32611C14 13.006 10.8655 16 7.01242 16ZM1.33063 8.51091L1.35591 9.32611C1.35591 12.2631 3.89342 14.6526 7.01242 14.6526C10.1314 14.6526 12.6694 12.2631 12.6694 9.32611C12.6694 6.38913 10.1319 4.00011 7.01242 4.00011C5.75808 4.00011 4.56983 4.37874 3.57629 5.09558L3.09593 5.44233L1.33063 3.48V8.51091Z" />
              <path d="M5.9324 10.6755C5.56515 10.6755 5.26709 10.3737 5.26709 10.0018V7.40663C5.26709 7.03474 5.56515 6.73291 5.9324 6.73291C6.29966 6.73291 6.59772 7.03474 6.59772 7.40663V10.0018C6.59772 10.3737 6.29966 10.6755 5.9324 10.6755Z" />
              <path d="M9.1055 10.6755C8.73825 10.6755 8.44019 10.3737 8.44019 10.0018V7.40663C8.44019 7.03474 8.73825 6.73291 9.1055 6.73291C9.47275 6.73291 9.77082 7.03474 9.77082 7.40663V10.0018C9.77082 10.3737 9.47275 10.6755 9.1055 10.6755Z" />
            </g>
            <defs>
              <clipPath id="clip0_2461_486">
                <rect width="14" height="16" fill="white" />
              </clipPath>
            </defs>
          </svg>
          
          <h1>¡Conexión exitosa!</h1>
          <p class="subtitle">Tu cuenta de Google Workspace ha sido conectada correctamente</p>
          
          <div class="info-box">
            <div class="info-label">ID de sesión</div>
            <div class="info-value">${userId}</div>
          </div>
          
          <div class="closing-message">
            <div class="spinner"></div>
            <span>Esta ventana se cerrará automáticamente...</span>
          </div>
        </div>
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