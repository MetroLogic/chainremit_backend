import crypto from 'crypto';
import {
    NotificationPreferences,
    NotificationTemplate,
    NotificationHistory,
    NotificationJob,
    NotificationAnalytics,
    NotificationType,
    NotificationChannel,
    NotificationStatus,
    NotificationPriority,
} from '../types/notification.types';

// In-memory database for notifications - replace with your actual database implementation
class NotificationDatabase {
    private preferences: NotificationPreferences[] = [];
    private templates: NotificationTemplate[] = [];
    private history: NotificationHistory[] = [];
    private jobs: NotificationJob[] = [];

    // Initialize default templates
    constructor() {
        this.initializeDefaultTemplates();
    }

    // Notification Preferences Methods
    async createDefaultPreferences(userId: string): Promise<NotificationPreferences> {
        const preferences: NotificationPreferences = {
            userId,
            email: {
                enabled: true,
                transactionUpdates: true,
                securityAlerts: true,
                marketingEmails: false,
                systemNotifications: true,
            },
            sms: {
                enabled: true,
                transactionUpdates: true,
                securityAlerts: true,
                criticalAlerts: true,
            },
            push: {
                enabled: true,
                transactionUpdates: true,
                securityAlerts: true,
                marketingUpdates: false,
                systemNotifications: true,
            },
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        this.preferences.push(preferences);
        return preferences;
    }

    async findPreferencesByUserId(userId: string): Promise<NotificationPreferences | null> {
        return this.preferences.find((pref) => pref.userId === userId) || null;
    }

    async updatePreferences(
        userId: string,
        updates: Partial<NotificationPreferences>,
    ): Promise<NotificationPreferences | null> {
        const index = this.preferences.findIndex((pref) => pref.userId === userId);
        if (index === -1) return null;

        this.preferences[index] = {
            ...this.preferences[index],
            ...updates,
            updatedAt: new Date(),
        };

        return this.preferences[index];
    }

    // Template Methods
    async createTemplate(
        templateData: Omit<NotificationTemplate, 'id' | 'createdAt' | 'updatedAt'>,
    ): Promise<NotificationTemplate> {
        const template: NotificationTemplate = {
            id: crypto.randomUUID(),
            ...templateData,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        this.templates.push(template);
        return template;
    }

    async findTemplateById(id: string): Promise<NotificationTemplate | null> {
        return this.templates.find((template) => template.id === id) || null;
    }

    async findTemplateByTypeAndChannel(
        type: NotificationType,
        channel: NotificationChannel,
    ): Promise<NotificationTemplate | null> {
        return (
            this.templates.find(
                (template) =>
                    template.type === type &&
                    template.channels.includes(channel) &&
                    template.isActive,
            ) || null
        );
    }

    async getAllTemplates(): Promise<NotificationTemplate[]> {
        return this.templates;
    }

    async updateTemplate(
        id: string,
        updates: Partial<NotificationTemplate>,
    ): Promise<NotificationTemplate | null> {
        const index = this.templates.findIndex((template) => template.id === id);
        if (index === -1) return null;

        this.templates[index] = {
            ...this.templates[index],
            ...updates,
            updatedAt: new Date(),
        };

        return this.templates[index];
    }

    // History Methods
    async createHistory(
        historyData: Omit<NotificationHistory, 'id' | 'createdAt' | 'updatedAt'>,
    ): Promise<NotificationHistory> {
        const history: NotificationHistory = {
            id: crypto.randomUUID(),
            ...historyData,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        this.history.push(history);
        return history;
    }

    async findHistoryById(id: string): Promise<NotificationHistory | null> {
        return this.history.find((h) => h.id === id) || null;
    }

    async findHistoryByUserId(
        userId: string,
        limit: number = 50,
        offset: number = 0,
    ): Promise<NotificationHistory[]> {
        return this.history
            .filter((h) => h.userId === userId)
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
            .slice(offset, offset + limit);
    }

    async updateHistory(
        id: string,
        updates: Partial<NotificationHistory>,
    ): Promise<NotificationHistory | null> {
        const index = this.history.findIndex((h) => h.id === id);
        if (index === -1) return null;

        this.history[index] = {
            ...this.history[index],
            ...updates,
            updatedAt: new Date(),
        };

        return this.history[index];
    }

    // Job Methods
    async createJob(jobData: Omit<NotificationJob, 'id' | 'createdAt'>): Promise<NotificationJob> {
        const job: NotificationJob = {
            id: crypto.randomUUID(),
            ...jobData,
            createdAt: new Date(),
        };

        this.jobs.push(job);
        return job;
    }

    async findJobById(id: string): Promise<NotificationJob | null> {
        return this.jobs.find((job) => job.id === id) || null;
    }

    async deleteJob(id: string): Promise<boolean> {
        const index = this.jobs.findIndex((job) => job.id === id);
        if (index === -1) return false;

        this.jobs.splice(index, 1);
        return true;
    }

    // Analytics Methods
    async getAnalytics(
        startDate?: Date,
        endDate?: Date,
        userId?: string,
    ): Promise<NotificationAnalytics> {
        let filteredHistory = this.history;

        if (startDate || endDate || userId) {
            filteredHistory = this.history.filter((h) => {
                if (userId && h.userId !== userId) return false;
                if (startDate && h.createdAt < startDate) return false;
                if (endDate && h.createdAt > endDate) return false;
                return true;
            });
        }

        const totalSent = filteredHistory.length;
        const totalDelivered = filteredHistory.filter(
            (h) => h.status === NotificationStatus.DELIVERED,
        ).length;
        const totalFailed = filteredHistory.filter(
            (h) => h.status === NotificationStatus.FAILED,
        ).length;

        const deliveryRate = totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0;

        // Calculate average delivery time
        const deliveredNotifications = filteredHistory.filter(
            (h) => h.status === NotificationStatus.DELIVERED && h.deliveredAt,
        );
        const averageDeliveryTime =
            deliveredNotifications.length > 0
                ? deliveredNotifications.reduce((sum, h) => {
                      return sum + (h.deliveredAt!.getTime() - h.createdAt.getTime());
                  }, 0) / deliveredNotifications.length
                : 0;

        // Channel breakdown
        const channelBreakdown = {
            email: this.calculateChannelStats(filteredHistory, NotificationChannel.EMAIL),
            sms: this.calculateChannelStats(filteredHistory, NotificationChannel.SMS),
            push: this.calculateChannelStats(filteredHistory, NotificationChannel.PUSH),
        };

        // Type breakdown
        const typeBreakdown: Record<NotificationType, any> = {} as any;
        Object.values(NotificationType).forEach((type) => {
            typeBreakdown[type] = this.calculateTypeStats(filteredHistory, type);
        });

        // Daily stats
        const dailyStats = this.calculateDailyStats(filteredHistory);

        return {
            totalSent,
            totalDelivered,
            totalFailed,
            deliveryRate,
            averageDeliveryTime,
            channelBreakdown,
            typeBreakdown,
            dailyStats,
        };
    }

    private calculateChannelStats(history: NotificationHistory[], channel: NotificationChannel) {
        const channelHistory = history.filter((h) => h.channel === channel);
        const sent = channelHistory.length;
        const delivered = channelHistory.filter(
            (h) => h.status === NotificationStatus.DELIVERED,
        ).length;
        const failed = channelHistory.filter((h) => h.status === NotificationStatus.FAILED).length;
        const rate = sent > 0 ? (delivered / sent) * 100 : 0;

        return { sent, delivered, failed, rate };
    }

    private calculateTypeStats(history: NotificationHistory[], type: NotificationType) {
        const typeHistory = history.filter((h) => h.type === type);
        const sent = typeHistory.length;
        const delivered = typeHistory.filter(
            (h) => h.status === NotificationStatus.DELIVERED,
        ).length;
        const failed = typeHistory.filter((h) => h.status === NotificationStatus.FAILED).length;
        const rate = sent > 0 ? (delivered / sent) * 100 : 0;

        return { sent, delivered, failed, rate };
    }

    private calculateDailyStats(history: NotificationHistory[]) {
        const dailyMap = new Map<string, { sent: number; delivered: number; failed: number }>();

        history.forEach((h) => {
            const date = h.createdAt.toISOString().split('T')[0];
            const stats = dailyMap.get(date) || { sent: 0, delivered: 0, failed: 0 };

            stats.sent++;
            if (h.status === NotificationStatus.DELIVERED) stats.delivered++;
            if (h.status === NotificationStatus.FAILED) stats.failed++;

            dailyMap.set(date, stats);
        });

        return Array.from(dailyMap.entries())
            .map(([date, stats]) => ({ date, ...stats }))
            .sort((a, b) => a.date.localeCompare(b.date));
    }

    // Initialize default templates
    private initializeDefaultTemplates(): void {
        const defaultTemplates = [
            {
                name: 'Transaction Confirmation',
                type: NotificationType.TRANSACTION_CONFIRMATION,
                channels: [
                    NotificationChannel.EMAIL,
                    NotificationChannel.SMS,
                    NotificationChannel.PUSH,
                ],
                subject: 'Transaction Confirmed - {{amount}} {{currency}}',
                content: `
                    <h2>Transaction Confirmed</h2>
                    <p>Your transaction has been successfully processed.</p>
                    <ul>
                        <li><strong>Amount:</strong> {{amount}} {{currency}}</li>
                        <li><strong>Transaction ID:</strong> {{transactionId}}</li>
                        <li><strong>Date:</strong> {{date}}</li>
                        <li><strong>Status:</strong> Confirmed</li>
                    </ul>
                    <p>Thank you for using ChainRemit!</p>
                `,
                variables: ['amount', 'currency', 'transactionId', 'date'],
                isActive: true,
            },
            {
                name: 'Security Alert',
                type: NotificationType.SECURITY_ALERT,
                channels: [NotificationChannel.EMAIL, NotificationChannel.SMS],
                subject: 'Security Alert - {{alertType}}',
                content: `
                    <h2>Security Alert</h2>
                    <p><strong>Alert Type:</strong> {{alertType}}</p>
                    <p><strong>Description:</strong> {{description}}</p>
                    <p><strong>Time:</strong> {{timestamp}}</p>
                    <p><strong>IP Address:</strong> {{ipAddress}}</p>
                    <p>If this wasn't you, please secure your account immediately.</p>
                `,
                variables: ['alertType', 'description', 'timestamp', 'ipAddress'],
                isActive: true,
            },
            {
                name: 'Welcome Message',
                type: NotificationType.WELCOME,
                channels: [NotificationChannel.EMAIL],
                subject: 'Welcome to ChainRemit!',
                content: `
                    <h2>Welcome to ChainRemit, {{firstName}}!</h2>
                    <p>Thank you for joining our platform. We're excited to have you on board.</p>
                    <p>To get started:</p>
                    <ol>
                        <li>Complete your profile verification</li>
                        <li>Connect your wallet</li>
                        <li>Start sending money across borders</li>
                    </ol>
                    <p>If you have any questions, our support team is here to help.</p>
                `,
                variables: ['firstName'],
                isActive: true,
            },
            {
                name: 'Password Reset',
                type: NotificationType.PASSWORD_RESET,
                channels: [NotificationChannel.EMAIL],
                subject: 'Reset Your Password',
                content: `
                    <h2>Password Reset Request</h2>
                    <p>You requested to reset your password. Click the link below to reset it:</p>
                    <a href="{{resetLink}}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a>
                    <p>This link will expire in 1 hour.</p>
                    <p>If you didn't request this, please ignore this email.</p>
                `,
                variables: ['resetLink'],
                isActive: true,
            },
        ];

        defaultTemplates.forEach((templateData) => {
            const template: NotificationTemplate = {
                id: crypto.randomUUID(),
                ...templateData,
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            this.templates.push(template);
        });
    }

    // Cleanup expired data
    startCleanupTimer(): void {
        // Don't start timers in test environment
        if (process.env.NODE_ENV === 'test') return;
        
        setInterval(
            () => {
                const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
                
                // Clean up old notifications
                this.notifications = this.notifications.filter(
                    (n: NotificationData) => n.createdAt > thirtyDaysAgo,
                );
                
                // Clean up old analytics
                this.analytics = this.analytics.filter((a: any) => a.timestamp > thirtyDaysAgo);
            },
            24 * 60 * 60 * 1000, // Run daily
        );
    }
}

export const notificationDb = new NotificationDatabase();

// Start cleanup timer
notificationDb.startCleanupTimer();
