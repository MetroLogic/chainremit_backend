import { Request, Response, NextFunction } from 'express';
import { JWTService } from '../services/jwt.service';

export interface AuthRequest extends Request {
    userId?: string;
}

export const authenticateToken = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        res.status(401).json({ error: 'Access token required' });
        return;
    }

    const decoded = await JWTService.verifyAccessToken(token);
    if (!decoded) {
        res.status(403).json({ error: 'Invalid or expired access token' });
        return;
    }

    req.userId = decoded.userId;
    next();
};
