import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import { ErrorResponse } from '../utils/errorResponse';
import { db } from '../model/user.model';
import logger from '../utils/logger';

/**
 * Admin role middleware
 * Checks if the authenticated user has admin privileges
 */
export const requireAdmin = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        const userId = req.userId;

        if (!userId) {
            return next(new ErrorResponse('Authentication required', 401));
        }

        // Get user from database
        const user = await db.findUserById(userId);

        if (!user) {
            return next(new ErrorResponse('User not found', 404));
        }

        // Check if user has admin role
        // For now, we'll use a simple check based on email domain or specific user IDs
        // In a real implementation, you'd have a proper role system
        const adminEmails = [
            'admin@chainremit.com',
            'support@chainremit.com',
            'dev@chainremit.com',
        ];

        const adminUserIds = ['admin-user-1', 'admin-user-2'];

        const isAdmin =
            adminEmails.includes(user.email) ||
            adminUserIds.includes(user.id) ||
            user.email.endsWith('@chainremit.com'); // Allow all chainremit.com emails

        if (!isAdmin) {
            logger.warn('Non-admin user attempted to access admin endpoint', {
                userId: user.id,
                email: user.email,
                endpoint: req.path,
            });
            return next(new ErrorResponse('Admin access required', 403));
        }

        logger.info('Admin access granted', {
            userId: user.id,
            email: user.email,
            endpoint: req.path,
        });

        next();
    } catch (error) {
        logger.error('Error in admin middleware', {
            error: error instanceof Error ? error.message : 'Unknown error',
            userId: req.userId,
        });
        return next(new ErrorResponse('Internal server error', 500));
    }
};

/**
 * Super admin role middleware
 * For highest level administrative functions
 */
export const requireSuperAdmin = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        const userId = req.userId;

        if (!userId) {
            return next(new ErrorResponse('Authentication required', 401));
        }

        // Get user from database
        const user = await db.findUserById(userId);

        if (!user) {
            return next(new ErrorResponse('User not found', 404));
        }

        // Super admin check - only specific emails/IDs
        const superAdminEmails = [
            'admin@chainremit.com',
            'ceo@chainremit.com',
            'cto@chainremit.com',
        ];

        const superAdminUserIds = ['super-admin-1'];

        const isSuperAdmin =
            superAdminEmails.includes(user.email) || superAdminUserIds.includes(user.id);

        if (!isSuperAdmin) {
            logger.warn('Non-super-admin user attempted to access super admin endpoint', {
                userId: user.id,
                email: user.email,
                endpoint: req.path,
            });
            return next(new ErrorResponse('Super admin access required', 403));
        }

        logger.info('Super admin access granted', {
            userId: user.id,
            email: user.email,
            endpoint: req.path,
        });

        next();
    } catch (error) {
        logger.error('Error in super admin middleware', {
            error: error instanceof Error ? error.message : 'Unknown error',
            userId: req.userId,
        });
        return next(new ErrorResponse('Internal server error', 500));
    }
};

/**
 * Role-based access control middleware
 * More flexible role checking
 */
export const requireRole = (allowedRoles: string[]) => {
    return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = req.userId;

            if (!userId) {
                return next(new ErrorResponse('Authentication required', 401));
            }

            // Get user from database
            const user = await db.findUserById(userId);

            if (!user) {
                return next(new ErrorResponse('User not found', 404));
            }

            // Determine user role based on email and user ID
            // In a real implementation, you'd store roles in the database
            let userRole = 'user'; // default role

            if (user.email.endsWith('@chainremit.com')) {
                userRole = 'admin';
            }

            const superAdminEmails = [
                'admin@chainremit.com',
                'ceo@chainremit.com',
                'cto@chainremit.com',
            ];
            if (superAdminEmails.includes(user.email)) {
                userRole = 'super_admin';
            }

            if (!allowedRoles.includes(userRole)) {
                logger.warn('User with insufficient role attempted to access endpoint', {
                    userId: user.id,
                    email: user.email,
                    userRole,
                    allowedRoles,
                    endpoint: req.path,
                });
                return next(
                    new ErrorResponse(
                        `Access denied. Required roles: ${allowedRoles.join(', ')}`,
                        403,
                    ),
                );
            }

            logger.info('Role-based access granted', {
                userId: user.id,
                email: user.email,
                userRole,
                endpoint: req.path,
            });

            // Add user role to request for use in controllers
            (req as any).userRole = userRole;

            next();
        } catch (error) {
            logger.error('Error in role middleware', {
                error: error instanceof Error ? error.message : 'Unknown error',
                userId: req.userId,
                allowedRoles,
            });
            return next(new ErrorResponse('Internal server error', 500));
        }
    };
};
