import { Request, Response, NextFunction } from 'express';
import { NotificationService } from '../services/notification.service';
import { QueueService } from '../services/queue.service';
import { AuthRequest } from '../middleware/auth.middleware';
import { ErrorResponse } from '../utils/errorResponse';
import { asyncHandler } from '../middleware/async.middleware';
import logger from '../utils/logger';
import {
    NotificationType,
    NotificationChannel,
    NotificationPriority,
    SendNotificationRequest,
    NotificationPreferencesRequest,
} from '../types/notification.types';

/**
 * @description Send notification to user
 * @route POST /api/notifications/send
 * @access Private
 */
export const sendNotification = asyncHandler(
    async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
        const { userId, type, channels, data, priority, scheduledAt } = req.body;

        // Validate required fields
        if (!userId || !type || !data) {
            return next(new ErrorResponse('userId, type, and data are required', 400));
        }

        // Validate notification type
        if (!Object.values(NotificationType).includes(type)) {
            return next(new ErrorResponse('Invalid notification type', 400));
        }

        // Validate channels if provided
        if (channels && !Array.isArray(channels)) {
            return next(new ErrorResponse('Channels must be an array', 400));
        }

        if (
            channels &&
            !channels.every((channel: string) =>
                Object.values(NotificationChannel).includes(channel as NotificationChannel),
            )
        ) {
            return next(new ErrorResponse('Invalid notification channel', 400));
        }

        // Validate priority if provided
        if (priority && !Object.values(NotificationPriority).includes(priority)) {
            return next(new ErrorResponse('Invalid notification priority', 400));
        }

        // Validate scheduledAt if provided
        let scheduledDate: Date | undefined;
        if (scheduledAt) {
            scheduledDate = new Date(scheduledAt);
            if (isNaN(scheduledDate.getTime())) {
                return next(new ErrorResponse('Invalid scheduledAt date format', 400));
            }
            if (scheduledDate <= new Date()) {
                return next(new ErrorResponse('scheduledAt must be in the future', 400));
            }
        }

        try {
            const request: SendNotificationRequest = {
                userId,
                type,
                channels: channels || undefined,
                data,
                priority: priority || NotificationPriority.NORMAL,
                scheduledAt: scheduledDate,
            };

            const result = await NotificationService.sendNotification(request);

            logger.info('Notification send request processed', {
                userId,
                type,
                jobIds: result.jobIds,
                success: result.success,
            });

            res.status(200).json({
                success: true,
                data: result,
            });
        } catch (error) {
            logger.error('Failed to send notification', {
                userId,
                type,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            return next(new ErrorResponse('Failed to send notification', 500));
        }
    },
);

/**
 * @description Send bulk notifications
 * @route POST /api/notifications/send-bulk
 * @access Private (Admin only)
 */
export const sendBulkNotifications = asyncHandler(
    async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
        const { notifications } = req.body;

        if (!Array.isArray(notifications) || notifications.length === 0) {
            return next(
                new ErrorResponse('notifications array is required and must not be empty', 400),
            );
        }

        if (notifications.length > 1000) {
            return next(new ErrorResponse('Maximum 1000 notifications per bulk request', 400));
        }

        // Validate each notification request
        for (const [index, notification] of notifications.entries()) {
            if (!notification.userId || !notification.type || !notification.data) {
                return next(
                    new ErrorResponse(
                        `Invalid notification at index ${index}: userId, type, and data are required`,
                        400,
                    ),
                );
            }

            if (!Object.values(NotificationType).includes(notification.type)) {
                return next(new ErrorResponse(`Invalid notification type at index ${index}`, 400));
            }
        }

        try {
            const results = await NotificationService.sendBulkNotifications(notifications);

            const successCount = results.filter((r) => r.success).length;
            const failureCount = results.length - successCount;

            logger.info('Bulk notifications processed', {
                total: notifications.length,
                success: successCount,
                failed: failureCount,
            });

            res.status(200).json({
                success: true,
                data: {
                    results,
                    summary: {
                        total: notifications.length,
                        success: successCount,
                        failed: failureCount,
                    },
                },
            });
        } catch (error) {
            logger.error('Failed to send bulk notifications', {
                count: notifications.length,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            return next(new ErrorResponse('Failed to send bulk notifications', 500));
        }
    },
);

/**
 * @description Get user notification preferences
 * @route GET /api/notifications/preferences
 * @access Private
 */
export const getNotificationPreferences = asyncHandler(
    async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
        const userId = req.userId!;

        try {
            let preferences = await NotificationService.getUserPreferences(userId);

            // Create default preferences if none exist
            if (!preferences) {
                const { notificationDb } = await import('../model/notification.model');
                preferences = await notificationDb.createDefaultPreferences(userId);
            }

            res.status(200).json({
                success: true,
                data: preferences,
            });
        } catch (error) {
            logger.error('Failed to get notification preferences', {
                userId,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            return next(new ErrorResponse('Failed to get notification preferences', 500));
        }
    },
);

/**
 * @description Update user notification preferences
 * @route PUT /api/notifications/preferences
 * @access Private
 */
export const updateNotificationPreferences = asyncHandler(
    async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
        const userId = req.userId!;
        const updates: NotificationPreferencesRequest = req.body;

        // Validate the update structure
        if (typeof updates !== 'object' || updates === null) {
            return next(new ErrorResponse('Invalid preferences format', 400));
        }

        // Validate email preferences if provided
        if (updates.email) {
            const validEmailKeys = [
                'enabled',
                'transactionUpdates',
                'securityAlerts',
                'marketingEmails',
                'systemNotifications',
            ];
            for (const key of Object.keys(updates.email)) {
                if (!validEmailKeys.includes(key)) {
                    return next(new ErrorResponse(`Invalid email preference key: ${key}`, 400));
                }
                if (typeof (updates.email as any)[key] !== 'boolean') {
                    return next(new ErrorResponse(`Email preference ${key} must be boolean`, 400));
                }
            }
        }

        // Validate SMS preferences if provided
        if (updates.sms) {
            const validSmsKeys = [
                'enabled',
                'transactionUpdates',
                'securityAlerts',
                'criticalAlerts',
            ];
            for (const key of Object.keys(updates.sms)) {
                if (!validSmsKeys.includes(key)) {
                    return next(new ErrorResponse(`Invalid SMS preference key: ${key}`, 400));
                }
                if (typeof (updates.sms as any)[key] !== 'boolean') {
                    return next(new ErrorResponse(`SMS preference ${key} must be boolean`, 400));
                }
            }
        }

        // Validate push preferences if provided
        if (updates.push) {
            const validPushKeys = [
                'enabled',
                'transactionUpdates',
                'securityAlerts',
                'marketingUpdates',
                'systemNotifications',
            ];
            for (const key of Object.keys(updates.push)) {
                if (!validPushKeys.includes(key)) {
                    return next(new ErrorResponse(`Invalid push preference key: ${key}`, 400));
                }
                if (typeof (updates.push as any)[key] !== 'boolean') {
                    return next(new ErrorResponse(`Push preference ${key} must be boolean`, 400));
                }
            }
        }

        try {
            const updatedPreferences = await NotificationService.updateUserPreferences(
                userId,
                updates as any,
            );

            if (!updatedPreferences) {
                return next(new ErrorResponse('Failed to update preferences', 500));
            }

            logger.info('Notification preferences updated', {
                userId,
                updates: Object.keys(updates),
            });

            res.status(200).json({
                success: true,
                data: updatedPreferences,
            });
        } catch (error) {
            logger.error('Failed to update notification preferences', {
                userId,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            return next(new ErrorResponse('Failed to update notification preferences', 500));
        }
    },
);

/**
 * @description Get user notification history
 * @route GET /api/notifications/history
 * @access Private
 */
export const getNotificationHistory = asyncHandler(
    async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
        const userId = req.userId!;
        const { limit = '50', offset = '0', type, channel, status } = req.query;

        // Validate query parameters
        const limitNum = parseInt(limit as string, 10);
        const offsetNum = parseInt(offset as string, 10);

        if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
            return next(new ErrorResponse('Limit must be between 1 and 100', 400));
        }

        if (isNaN(offsetNum) || offsetNum < 0) {
            return next(new ErrorResponse('Offset must be a non-negative number', 400));
        }

        // Validate type filter if provided
        if (type && !Object.values(NotificationType).includes(type as NotificationType)) {
            return next(new ErrorResponse('Invalid notification type filter', 400));
        }

        // Validate channel filter if provided
        if (
            channel &&
            !Object.values(NotificationChannel).includes(channel as NotificationChannel)
        ) {
            return next(new ErrorResponse('Invalid notification channel filter', 400));
        }

        try {
            let history = await NotificationService.getUserNotificationHistory(
                userId,
                limitNum,
                offsetNum,
            );

            // Apply filters
            if (type) {
                history = history.filter((h) => h.type === type);
            }

            if (channel) {
                history = history.filter((h) => h.channel === channel);
            }

            if (status) {
                history = history.filter((h) => h.status === status);
            }

            res.status(200).json({
                success: true,
                data: {
                    history,
                    pagination: {
                        limit: limitNum,
                        offset: offsetNum,
                        total: history.length,
                    },
                },
            });
        } catch (error) {
            logger.error('Failed to get notification history', {
                userId,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            return next(new ErrorResponse('Failed to get notification history', 500));
        }
    },
);

/**
 * @description Get notification analytics
 * @route GET /api/notifications/analytics
 * @access Private (Admin only)
 */
export const getNotificationAnalytics = asyncHandler(
    async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
        const { startDate, endDate, userId } = req.query;

        let start: Date | undefined;
        let end: Date | undefined;

        // Validate date parameters
        if (startDate) {
            start = new Date(startDate as string);
            if (isNaN(start.getTime())) {
                return next(new ErrorResponse('Invalid startDate format', 400));
            }
        }

        if (endDate) {
            end = new Date(endDate as string);
            if (isNaN(end.getTime())) {
                return next(new ErrorResponse('Invalid endDate format', 400));
            }
        }

        if (start && end && start >= end) {
            return next(new ErrorResponse('startDate must be before endDate', 400));
        }

        try {
            const analytics = await NotificationService.getAnalytics(start, end, userId as string);

            res.status(200).json({
                success: true,
                data: analytics,
            });
        } catch (error) {
            logger.error('Failed to get notification analytics', {
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            return next(new ErrorResponse('Failed to get notification analytics', 500));
        }
    },
);

/**
 * @description Get notification templates
 * @route GET /api/notifications/templates
 * @access Private (Admin only)
 */
export const getNotificationTemplates = asyncHandler(
    async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const templates = await NotificationService.getTemplates();

            res.status(200).json({
                success: true,
                data: templates,
            });
        } catch (error) {
            logger.error('Failed to get notification templates', {
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            return next(new ErrorResponse('Failed to get notification templates', 500));
        }
    },
);

/**
 * @description Create notification template
 * @route POST /api/notifications/templates
 * @access Private (Admin only)
 */
export const createNotificationTemplate = asyncHandler(
    async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
        const { name, type, channels, subject, content, variables, isActive } = req.body;

        // Validate required fields
        if (!name || !type || !channels || !subject || !content) {
            return next(
                new ErrorResponse('name, type, channels, subject, and content are required', 400),
            );
        }

        // Validate type
        if (!Object.values(NotificationType).includes(type)) {
            return next(new ErrorResponse('Invalid notification type', 400));
        }

        // Validate channels
        if (!Array.isArray(channels) || channels.length === 0) {
            return next(new ErrorResponse('channels must be a non-empty array', 400));
        }

        if (!channels.every((channel) => Object.values(NotificationChannel).includes(channel))) {
            return next(new ErrorResponse('Invalid notification channel', 400));
        }

        // Validate variables
        if (variables && !Array.isArray(variables)) {
            return next(new ErrorResponse('variables must be an array', 400));
        }

        try {
            const template = await NotificationService.createTemplate({
                name,
                type,
                channels,
                subject,
                content,
                variables: variables || [],
                isActive: isActive !== undefined ? isActive : true,
            });

            logger.info('Notification template created', {
                templateId: template.id,
                name,
                type,
                channels,
            });

            res.status(201).json({
                success: true,
                data: template,
            });
        } catch (error) {
            logger.error('Failed to create notification template', {
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            return next(new ErrorResponse('Failed to create notification template', 500));
        }
    },
);

/**
 * @description Update notification template
 * @route PUT /api/notifications/templates/:id
 * @access Private (Admin only)
 */
export const updateNotificationTemplate = asyncHandler(
    async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
        const { id } = req.params;
        const updates = req.body;

        if (!id) {
            return next(new ErrorResponse('Template ID is required', 400));
        }

        // Validate updates if type is being changed
        if (updates.type && !Object.values(NotificationType).includes(updates.type)) {
            return next(new ErrorResponse('Invalid notification type', 400));
        }

        // Validate channels if being changed
        if (updates.channels) {
            if (!Array.isArray(updates.channels) || updates.channels.length === 0) {
                return next(new ErrorResponse('channels must be a non-empty array', 400));
            }

            if (
                !updates.channels.every((channel: string) =>
                    Object.values(NotificationChannel).includes(channel as NotificationChannel),
                )
            ) {
                return next(new ErrorResponse('Invalid notification channel', 400));
            }
        }

        // Validate variables if being changed
        if (updates.variables && !Array.isArray(updates.variables)) {
            return next(new ErrorResponse('variables must be an array', 400));
        }

        try {
            const template = await NotificationService.updateTemplate(id, updates);

            if (!template) {
                return next(new ErrorResponse('Template not found', 404));
            }

            logger.info('Notification template updated', {
                templateId: id,
                updates: Object.keys(updates),
            });

            res.status(200).json({
                success: true,
                data: template,
            });
        } catch (error) {
            logger.error('Failed to update notification template', {
                templateId: id,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            return next(new ErrorResponse('Failed to update notification template', 500));
        }
    },
);

/**
 * @description Get queue statistics
 * @route GET /api/notifications/queue/stats
 * @access Private (Admin only)
 */
export const getQueueStats = asyncHandler(
    async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const stats = await QueueService.getQueueStats();
            const health = await QueueService.healthCheck();

            res.status(200).json({
                success: true,
                data: {
                    ...stats,
                    healthy: health.healthy,
                    error: health.error,
                },
            });
        } catch (error) {
            logger.error('Failed to get queue stats', {
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            return next(new ErrorResponse('Failed to get queue stats', 500));
        }
    },
);

/**
 * @description Retry failed notification jobs
 * @route POST /api/notifications/queue/retry
 * @access Private (Admin only)
 */
export const retryFailedJobs = asyncHandler(
    async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
        const { limit = 10 } = req.body;

        const limitNum = parseInt(limit, 10);
        if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
            return next(new ErrorResponse('Limit must be between 1 and 100', 400));
        }

        try {
            const retriedCount = await QueueService.retryFailedJobs(limitNum);

            logger.info('Retried failed notification jobs', { retriedCount });

            res.status(200).json({
                success: true,
                data: {
                    retriedCount,
                },
            });
        } catch (error) {
            logger.error('Failed to retry failed jobs', {
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            return next(new ErrorResponse('Failed to retry failed jobs', 500));
        }
    },
);

/**
 * @description Clean old queue jobs
 * @route POST /api/notifications/queue/clean
 * @access Private (Admin only)
 */
export const cleanOldJobs = asyncHandler(
    async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            await QueueService.cleanOldJobs();

            logger.info('Cleaned old queue jobs');

            res.status(200).json({
                success: true,
                message: 'Old jobs cleaned successfully',
            });
        } catch (error) {
            logger.error('Failed to clean old jobs', {
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            return next(new ErrorResponse('Failed to clean old jobs', 500));
        }
    },
);

// Quick notification helpers

/**
 * @description Send transaction confirmation notification
 * @route POST /api/notifications/transaction-confirmation
 * @access Private
 */
export const sendTransactionConfirmation = asyncHandler(
    async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
        const userId = req.userId!;
        const { amount, currency, transactionId, recipientName, date } = req.body;

        if (!amount || !currency || !transactionId || !recipientName || !date) {
            return next(
                new ErrorResponse(
                    'amount, currency, transactionId, recipientName, and date are required',
                    400,
                ),
            );
        }

        try {
            const result = await NotificationService.sendTransactionConfirmation(userId, {
                amount,
                currency,
                transactionId,
                recipientName,
                date,
            });

            res.status(200).json({
                success: true,
                data: result,
            });
        } catch (error) {
            logger.error('Failed to send transaction confirmation', {
                userId,
                transactionId,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            return next(new ErrorResponse('Failed to send transaction confirmation', 500));
        }
    },
);

/**
 * @description Send security alert notification
 * @route POST /api/notifications/security-alert
 * @access Private
 */
export const sendSecurityAlert = asyncHandler(
    async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
        const userId = req.userId!;
        const { alertType, description, timestamp, ipAddress } = req.body;

        if (!alertType || !description || !timestamp || !ipAddress) {
            return next(
                new ErrorResponse(
                    'alertType, description, timestamp, and ipAddress are required',
                    400,
                ),
            );
        }

        try {
            const result = await NotificationService.sendSecurityAlert(userId, {
                alertType,
                description,
                timestamp,
                ipAddress,
            });

            res.status(200).json({
                success: true,
                data: result,
            });
        } catch (error) {
            logger.error('Failed to send security alert', {
                userId,
                alertType,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            return next(new ErrorResponse('Failed to send security alert', 500));
        }
    },
);
