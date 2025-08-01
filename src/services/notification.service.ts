import Handlebars from 'handlebars';
import { notificationDb } from '../model/notification.model';
import { EmailService } from './email.service';
import { SMSService } from './sms.service';
import { PushNotificationService } from './push.service';
import { QueueService } from './queue.service';
import logger from '../utils/logger';
import {
    NotificationType,
    NotificationChannel,
    NotificationStatus,
    NotificationPriority,
    SendNotificationRequest,
    SendNotificationResponse,
    NotificationPreferences,
    NotificationHistory,
    NotificationAnalytics,
    NotificationTemplate,
    NotificationJob,
    EmailData,
    SMSData,
    PushData,
} from '../types/notification.types';

export class NotificationService {
    /**
     * Send notification to user through specified channels
     */
    static async sendNotification(
        request: SendNotificationRequest,
    ): Promise<SendNotificationResponse> {
        try {
            // Get user preferences
            const preferences = await notificationDb.findPreferencesByUserId(request.userId);
            if (!preferences) {
                // Create default preferences if not found
                await notificationDb.createDefaultPreferences(request.userId);
            }

            // Determine which channels to use
            const channels = request.channels || this.getDefaultChannelsForType(request.type);
            const enabledChannels = await this.filterEnabledChannels(
                request.userId,
                channels,
                request.type,
            );

            if (enabledChannels.length === 0) {
                logger.info('No enabled channels for notification', {
                    userId: request.userId,
                    type: request.type,
                    requestedChannels: channels,
                });
                return {
                    success: true,
                    jobIds: [],
                    message: 'User has disabled notifications for this channel',
                };
            }

            // Create notification jobs for each enabled channel
            const jobIds: string[] = [];
            const priority = request.priority || NotificationPriority.NORMAL;

            for (const channel of enabledChannels) {
                const job = await notificationDb.createJob({
                    userId: request.userId,
                    templateId: '', // Will be set when processing
                    type: request.type,
                    channel,
                    recipient: await this.getRecipientForChannel(request.userId, channel),
                    data: request.data,
                    priority,
                    scheduledAt: request.scheduledAt,
                    attempts: 0,
                    maxAttempts: 3,
                });

                jobIds.push(job.id);

                // Queue the job for processing
                if (request.scheduledAt && request.scheduledAt > new Date()) {
                    await QueueService.scheduleNotification(job, request.scheduledAt);
                } else {
                    await QueueService.queueNotification(job);
                }
            }

            logger.info('Notification jobs created', {
                userId: request.userId,
                type: request.type,
                channels: enabledChannels,
                jobIds,
            });

            return {
                success: true,
                jobIds,
                message: `Notification queued for ${enabledChannels.length} channel(s)`,
            };
        } catch (error) {
            logger.error('Failed to send notification', {
                error: error instanceof Error ? error.message : 'Unknown error',
                request,
            });
            throw error;
        }
    }

    /**
     * Process a notification job
     */
    static async processNotificationJob(job: NotificationJob): Promise<boolean> {
        try {
            logger.info('Processing notification job', {
                jobId: job.id,
                type: job.type,
                channel: job.channel,
                userId: job.userId,
            });

            // Get template for the notification type and channel
            const template = await notificationDb.findTemplateByTypeAndChannel(
                job.type,
                job.channel,
            );
            if (!template) {
                logger.error('No template found for notification', {
                    type: job.type,
                    channel: job.channel,
                });
                return false;
            }

            // Create history record
            const history = await notificationDb.createHistory({
                userId: job.userId,
                templateId: template.id,
                type: job.type,
                channel: job.channel,
                recipient: job.recipient,
                subject: template.subject,
                content: template.content,
                status: NotificationStatus.PENDING,
                retryCount: job.attempts,
                metadata: job.data,
            });

            // Render template with data
            const renderedContent = await this.renderTemplate(template, job.data);

            // Send notification based on channel
            let success = false;
            let errorMessage = '';

            switch (job.channel) {
                case NotificationChannel.EMAIL:
                    success = await this.sendEmailNotification(
                        job.recipient,
                        renderedContent,
                        job.data,
                    );
                    break;
                case NotificationChannel.SMS:
                    success = await this.sendSMSNotification(
                        job.recipient,
                        renderedContent,
                        job.data,
                    );
                    break;
                case NotificationChannel.PUSH:
                    success = await this.sendPushNotification(
                        job.recipient,
                        renderedContent,
                        job.data,
                    );
                    break;
                default:
                    errorMessage = `Unsupported channel: ${job.channel}`;
                    break;
            }

            // Update history record
            if (success) {
                await notificationDb.updateHistory(history.id, {
                    status: NotificationStatus.DELIVERED,
                    deliveredAt: new Date(),
                });
                logger.info('Notification delivered successfully', {
                    jobId: job.id,
                    historyId: history.id,
                });
            } else {
                await notificationDb.updateHistory(history.id, {
                    status: NotificationStatus.FAILED,
                    failedAt: new Date(),
                    errorMessage: errorMessage || 'Delivery failed',
                });
                logger.error('Notification delivery failed', {
                    jobId: job.id,
                    historyId: history.id,
                    error: errorMessage,
                });
            }

            return success;
        } catch (error) {
            logger.error('Error processing notification job', {
                jobId: job.id,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            return false;
        }
    }

    /**
     * Get user notification preferences
     */
    static async getUserPreferences(userId: string): Promise<NotificationPreferences | null> {
        return await notificationDb.findPreferencesByUserId(userId);
    }

    /**
     * Update user notification preferences
     */
    static async updateUserPreferences(
        userId: string,
        updates: Partial<NotificationPreferences>,
    ): Promise<NotificationPreferences | null> {
        return await notificationDb.updatePreferences(userId, updates);
    }

    /**
     * Get notification history for user
     */
    static async getUserNotificationHistory(
        userId: string,
        limit: number = 50,
        offset: number = 0,
    ): Promise<NotificationHistory[]> {
        return await notificationDb.findHistoryByUserId(userId, limit, offset);
    }

    /**
     * Get notification analytics
     */
    static async getAnalytics(
        startDate?: Date,
        endDate?: Date,
        userId?: string,
    ): Promise<NotificationAnalytics> {
        return await notificationDb.getAnalytics(startDate, endDate, userId);
    }

    /**
     * Get all notification templates
     */
    static async getTemplates(): Promise<NotificationTemplate[]> {
        return await notificationDb.getAllTemplates();
    }

    /**
     * Create a new notification template
     */
    static async createTemplate(
        templateData: Omit<NotificationTemplate, 'id' | 'createdAt' | 'updatedAt'>,
    ): Promise<NotificationTemplate> {
        return await notificationDb.createTemplate(templateData);
    }

    /**
     * Update a notification template
     */
    static async updateTemplate(
        templateId: string,
        updates: Partial<NotificationTemplate>,
    ): Promise<NotificationTemplate | null> {
        return await notificationDb.updateTemplate(templateId, updates);
    }

    /**
     * Send bulk notifications
     */
    static async sendBulkNotifications(
        requests: SendNotificationRequest[],
    ): Promise<SendNotificationResponse[]> {
        const results: SendNotificationResponse[] = [];

        for (const request of requests) {
            try {
                const result = await this.sendNotification(request);
                results.push(result);
            } catch (error) {
                results.push({
                    success: false,
                    jobIds: [],
                    message: error instanceof Error ? error.message : 'Unknown error',
                });
            }
        }

        return results;
    }

    // Private helper methods

    private static getDefaultChannelsForType(type: NotificationType): NotificationChannel[] {
        switch (type) {
            case NotificationType.SECURITY_ALERT:
            case NotificationType.LOGIN_ALERT:
                return [NotificationChannel.EMAIL, NotificationChannel.SMS];
            case NotificationType.TRANSACTION_CONFIRMATION:
            case NotificationType.TRANSACTION_PENDING:
            case NotificationType.TRANSACTION_FAILED:
                return [NotificationChannel.EMAIL, NotificationChannel.PUSH];
            case NotificationType.MARKETING_CAMPAIGN:
                return [NotificationChannel.EMAIL, NotificationChannel.PUSH];
            case NotificationType.SYSTEM_MAINTENANCE:
                return [
                    NotificationChannel.EMAIL,
                    NotificationChannel.PUSH,
                    NotificationChannel.SMS,
                ];
            default:
                return [NotificationChannel.EMAIL];
        }
    }

    private static async filterEnabledChannels(
        userId: string,
        channels: NotificationChannel[],
        type: NotificationType,
    ): Promise<NotificationChannel[]> {
        const preferences = await notificationDb.findPreferencesByUserId(userId);
        if (!preferences) {
            return channels; // If no preferences, allow all channels
        }

        const enabledChannels: NotificationChannel[] = [];

        for (const channel of channels) {
            if (this.isChannelEnabledForType(preferences, channel, type)) {
                enabledChannels.push(channel);
            }
        }

        return enabledChannels;
    }

    private static isChannelEnabledForType(
        preferences: NotificationPreferences,
        channel: NotificationChannel,
        type: NotificationType,
    ): boolean {
        switch (channel) {
            case NotificationChannel.EMAIL:
                if (!preferences.email.enabled) return false;
                return this.isEmailTypeEnabled(preferences, type);
            case NotificationChannel.SMS:
                if (!preferences.sms.enabled) return false;
                return this.isSMSTypeEnabled(preferences, type);
            case NotificationChannel.PUSH:
                if (!preferences.push.enabled) return false;
                return this.isPushTypeEnabled(preferences, type);
            default:
                return false;
        }
    }

    private static isEmailTypeEnabled(
        preferences: NotificationPreferences,
        type: NotificationType,
    ): boolean {
        switch (type) {
            case NotificationType.TRANSACTION_CONFIRMATION:
            case NotificationType.TRANSACTION_PENDING:
            case NotificationType.TRANSACTION_FAILED:
            case NotificationType.PAYMENT_RECEIVED:
            case NotificationType.PAYMENT_SENT:
                return preferences.email.transactionUpdates;
            case NotificationType.SECURITY_ALERT:
            case NotificationType.LOGIN_ALERT:
                return preferences.email.securityAlerts;
            case NotificationType.MARKETING_CAMPAIGN:
                return preferences.email.marketingEmails;
            case NotificationType.SYSTEM_MAINTENANCE:
            case NotificationType.WELCOME:
            case NotificationType.EMAIL_VERIFICATION:
                return preferences.email.systemNotifications;
            default:
                return true;
        }
    }

    private static isSMSTypeEnabled(
        preferences: NotificationPreferences,
        type: NotificationType,
    ): boolean {
        switch (type) {
            case NotificationType.TRANSACTION_CONFIRMATION:
            case NotificationType.TRANSACTION_PENDING:
            case NotificationType.TRANSACTION_FAILED:
            case NotificationType.PAYMENT_RECEIVED:
            case NotificationType.PAYMENT_SENT:
                return preferences.sms.transactionUpdates;
            case NotificationType.SECURITY_ALERT:
            case NotificationType.LOGIN_ALERT:
                return preferences.sms.securityAlerts;
            case NotificationType.SYSTEM_MAINTENANCE:
            case NotificationType.BALANCE_LOW:
                return preferences.sms.criticalAlerts;
            default:
                return false;
        }
    }

    private static isPushTypeEnabled(
        preferences: NotificationPreferences,
        type: NotificationType,
    ): boolean {
        switch (type) {
            case NotificationType.TRANSACTION_CONFIRMATION:
            case NotificationType.TRANSACTION_PENDING:
            case NotificationType.TRANSACTION_FAILED:
            case NotificationType.PAYMENT_RECEIVED:
            case NotificationType.PAYMENT_SENT:
                return preferences.push.transactionUpdates;
            case NotificationType.SECURITY_ALERT:
            case NotificationType.LOGIN_ALERT:
                return preferences.push.securityAlerts;
            case NotificationType.MARKETING_CAMPAIGN:
                return preferences.push.marketingUpdates;
            case NotificationType.SYSTEM_MAINTENANCE:
            case NotificationType.WELCOME:
                return preferences.push.systemNotifications;
            default:
                return true;
        }
    }

    private static async getRecipientForChannel(
        userId: string,
        channel: NotificationChannel,
    ): Promise<string> {
        // This would typically fetch from user database
        // For now, using placeholder values
        switch (channel) {
            case NotificationChannel.EMAIL:
                return `user${userId}@example.com`; // Replace with actual email lookup
            case NotificationChannel.SMS:
                return `+1234567890`; // Replace with actual phone lookup
            case NotificationChannel.PUSH:
                return `fcm_token_${userId}`; // Replace with actual FCM token lookup
            default:
                return '';
        }
    }

    private static async renderTemplate(
        template: NotificationTemplate,
        data: Record<string, any>,
    ): Promise<{ subject: string; content: string }> {
        try {
            // Compile Handlebars templates
            const subjectTemplate = Handlebars.compile(template.subject);
            const contentTemplate = Handlebars.compile(template.content);

            // Render with data
            const subject = subjectTemplate(data);
            const content = contentTemplate(data);

            return { subject, content };
        } catch (error) {
            logger.error('Failed to render template', {
                templateId: template.id,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            throw new Error('Template rendering failed');
        }
    }

    private static async sendEmailNotification(
        recipient: string,
        content: { subject: string; content: string },
        data: Record<string, any>,
    ): Promise<boolean> {
        const emailData: EmailData = {
            to: recipient,
            subject: content.subject,
            html: content.content,
        };

        return await EmailService.sendEmail(emailData);
    }

    private static async sendSMSNotification(
        recipient: string,
        content: { subject: string; content: string },
        data: Record<string, any>,
    ): Promise<boolean> {
        // For SMS, use the content as the message (strip HTML if needed)
        const message = content.content.replace(/<[^>]*>/g, '').trim();

        const smsData: SMSData = {
            to: recipient,
            message: message.substring(0, 160), // SMS character limit
        };

        return await SMSService.sendSMS(smsData);
    }

    private static async sendPushNotification(
        recipient: string,
        content: { subject: string; content: string },
        data: Record<string, any>,
    ): Promise<boolean> {
        // Strip HTML from content for push notification body
        const body = content.content.replace(/<[^>]*>/g, '').trim();

        const pushData: PushData = {
            token: recipient,
            title: content.subject,
            body: body.substring(0, 100), // Push notification body limit
            data: data,
        };

        return await PushNotificationService.sendPushNotification(pushData);
    }

    /**
     * Utility method to send quick notifications for common scenarios
     */
    static async sendTransactionConfirmation(
        userId: string,
        transactionData: {
            amount: string;
            currency: string;
            transactionId: string;
            recipientName: string;
            date: string;
        },
    ): Promise<SendNotificationResponse> {
        return await this.sendNotification({
            userId,
            type: NotificationType.TRANSACTION_CONFIRMATION,
            data: transactionData,
            priority: NotificationPriority.HIGH,
        });
    }

    static async sendSecurityAlert(
        userId: string,
        alertData: {
            alertType: string;
            description: string;
            timestamp: string;
            ipAddress: string;
        },
    ): Promise<SendNotificationResponse> {
        return await this.sendNotification({
            userId,
            type: NotificationType.SECURITY_ALERT,
            data: alertData,
            priority: NotificationPriority.CRITICAL,
        });
    }

    static async sendWelcomeMessage(
        userId: string,
        userData: {
            firstName: string;
        },
    ): Promise<SendNotificationResponse> {
        return await this.sendNotification({
            userId,
            type: NotificationType.WELCOME,
            data: userData,
            priority: NotificationPriority.NORMAL,
        });
    }

    static async sendPasswordReset(
        userId: string,
        resetData: {
            resetLink: string;
        },
    ): Promise<SendNotificationResponse> {
        return await this.sendNotification({
            userId,
            type: NotificationType.PASSWORD_RESET,
            data: resetData,
            channels: [NotificationChannel.EMAIL], // Only email for password reset
            priority: NotificationPriority.HIGH,
        });
    }
}
