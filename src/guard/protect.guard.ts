import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { asyncHandler } from '../middleware/async.middleware';
import { ErrorResponse } from '../utils/errorResponse';
import { db } from '../model/user.model';
import { User } from '../types/user.types';

// Extend Request interface to include user property
export interface AuthRequest extends Request {
    user?: User;
}

export const protect = asyncHandler(
    async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
        let token: string | undefined;

        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            // Set token from Bearer token in header
            token = req.headers.authorization.split(' ')[1];
        } else if (req.cookies?.token) {
            // Set token from cookie
            token = req.cookies.token;
        }

        // Make sure token exists
        if (!token) {
            return next(new ErrorResponse('Not authorized to access this route', 401));
        }

        try {
            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
                userId: string;
            };

            // Check if token is valid and fetch user
            if (decoded && decoded.userId) {
                const user = await db.findUserById(decoded.userId);
                if (user) {
                    req.user = user;
                    next();
                } else {
                    return next(new ErrorResponse('Not authorized to access this route', 400));
                }
            } else {
                return next(
                    new ErrorResponse(
                        "Not authorized to access this route, Can't Resolve Request 'HINT: Login Again'",
                        400,
                    ),
                );
            }
        } catch (err) {
            return next(new ErrorResponse('Not authorized to access this route', 401));
        }
    },
);
