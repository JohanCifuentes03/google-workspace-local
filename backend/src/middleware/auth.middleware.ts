import { Request, Response, NextFunction } from 'express';
import { SessionService } from '../services';

const sessionService = new SessionService();

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const session = await sessionService.getSession(userId);
    const tokens = await sessionService.getUserTokens(userId);

    if (!session || !tokens || !tokens.access_token) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Attach user context to request
    (req as any).user = {
      userId,
      session,
      tokens
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Authentication check failed' });
  }
}

export async function optionalAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const { userId } = req.params;

    if (userId) {
      const session = await sessionService.getSession(userId);
      const tokens = await sessionService.getUserTokens(userId);

      if (session && tokens && tokens.access_token) {
        (req as any).user = {
          userId,
          session,
          tokens
        };
      }
    }

    next();
  } catch (error) {
    console.error('Optional auth middleware error:', error);
    next(); // Continue even if auth check fails
  }
}