import { Request, Response, NextFunction } from 'express';
import { db } from '../model//user.model';

export const createRateLimiter = (windowMs: number, max: number, message: string) => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        const key = `rate_limit:${req.ip}`;

        try {
            const result = await db.incrementRateLimit(key, windowMs, max);

            if (!result.allowed) {
                res.status(429).json({ error: message });
                return;
            }

            // Set rate limit headers
            res.set({
                'X-RateLimit-Limit': max.toString(),
                'X-RateLimit-Remaining': result.remaining.toString(),
                'X-RateLimit-Reset': new Date(Date.now() + windowMs).toISOString(),
            });

            next();
        } catch (error) {
            console.error('Rate limiting error:', error);
            next(); // Continue on error
        }
    };
};

export const authRateLimiter = createRateLimiter(
    15 * 60 * 1000, // 15 minutes
    5, // 5 requests
    'Too many authentication attempts, please try again later.',
);

export const passwordResetRateLimiter = createRateLimiter(
    60 * 60 * 1000, // 1 hour
    3, // 3 requests
    'Too many password reset attempts, please try again later.',
);
