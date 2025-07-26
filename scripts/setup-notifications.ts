#!/usr/bin/env node

/**
 * Notification System Setup Script
 *
 * This script sets up the notification system by:
 * 1. Creating default notification templates
 * 2. Setting up Redis queues
 * 3. Initializing notification preferences for existing users
 * 4. Testing the notification services
 */

import { notificationDb } from '../src/model/notification.model';
import { QueueService } from '../src/services/queue.service';
import { EmailService } from '../src/services/email.service';
import { SMSService } from '../src/services/sms.service';
import { PushNotificationService } from '../src/services/push.service';
import { NotificationService } from '../src/services/notification.service';
import { CronService } from '../src/services/cron.service';
import logger from '../src/utils/logger';
import {
    NotificationType,
    NotificationChannel,
    NotificationPriority,
} from '../src/types/notification.types';

class NotificationSetup {
    /**
     * Main setup function
     */
    static async setup(): Promise<void> {
        logger.info('Starting notification system setup...');

        try {
            // 1. Initialize services
            await this.initializeServices();

            // 2. Create additional notification templates
            await this.createNotificationTemplates();

            // 3. Test notification services
            await this.testNotificationServices();

            // 4. Initialize cron jobs
            await this.initializeCronJobs();

            // 5. Verify queue system
            await this.verifyQueueSystem();

            logger.info('Notification system setup completed successfully!');
        } catch (error) {
            logger.error('Notification system setup failed', {
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            process.exit(1);
        }
    }

    /**
     * Initialize notification services
     */
    private static async initializeServices(): Promise<void> {
        logger.info('Initializing notification services...');

        // Initialize email service
        EmailService.initialize();

        // Initialize SMS service
        SMSService.initialize();

        // Initialize push notification service
        PushNotificationService.initialize();

        // Initialize queue service
        QueueService.initialize();

        logger.info('Services initialized successfully');
    }

    /**
     * Create additional notification templates
     */
    private static async createNotificationTemplates(): Promise<void> {
        logger.info('Creating notification templates...');

        const additionalTemplates = [
            {
                name: 'KYC Approved',
                type: NotificationType.KYC_APPROVED,
                channels: [NotificationChannel.EMAIL, NotificationChannel.PUSH],
                subject: 'KYC Verification Approved',
                content: `
                    <h2>KYC Verification Approved</h2>
                    <p>Congratulations! Your KYC verification has been approved.</p>
                    <p>You can now access all features of ChainRemit.</p>
                    <p><strong>Approval Date:</strong> {{approvalDate}}</p>
                    <p><strong>Verification Level:</strong> {{verificationLevel}}</p>
                `,
                variables: ['approvalDate', 'verificationLevel'],
                isActive: true,
            },
            {
                name: 'KYC Rejected',
                type: NotificationType.KYC_REJECTED,
                channels: [NotificationChannel.EMAIL, NotificationChannel.PUSH],
                subject: 'KYC Verification Update Required',
                content: `
                    <h2>KYC Verification Update Required</h2>
                    <p>We need additional information to complete your KYC verification.</p>
                    <p><strong>Reason:</strong> {{rejectionReason}}</p>
                    <p><strong>Required Actions:</strong></p>
                    <ul>{{#each requiredActions}}<li>{{this}}</li>{{/each}}</ul>
                    <p>Please update your documents at your earliest convenience.</p>
                `,
                variables: ['rejectionReason', 'requiredActions'],
                isActive: true,
            },
            {
                name: 'Balance Low Alert',
                type: NotificationType.BALANCE_LOW,
                channels: [
                    NotificationChannel.EMAIL,
                    NotificationChannel.SMS,
                    NotificationChannel.PUSH,
                ],
                subject: 'Balance Low - {{currency}} Wallet',
                content: `
                    <h2>Balance Low Alert</h2>
                    <p>Your {{currency}} wallet balance is running low.</p>
                    <p><strong>Current Balance:</strong> {{currentBalance}} {{currency}}</p>
                    <p><strong>Threshold:</strong> {{threshold}} {{currency}}</p>
                    <p>Consider adding funds to avoid transaction delays.</p>
                `,
                variables: ['currency', 'currentBalance', 'threshold'],
                isActive: true,
            },
            {
                name: 'Wallet Connected',
                type: NotificationType.WALLET_CONNECTED,
                channels: [NotificationChannel.EMAIL, NotificationChannel.PUSH],
                subject: 'New Wallet Connected',
                content: `
                    <h2>Wallet Connected Successfully</h2>
                    <p>A new wallet has been connected to your account.</p>
                    <p><strong>Wallet Address:</strong> {{walletAddress}}</p>
                    <p><strong>Connected At:</strong> {{connectedAt}}</p>
                    <p>If this wasn't you, please secure your account immediately.</p>
                `,
                variables: ['walletAddress', 'connectedAt'],
                isActive: true,
            },
            {
                name: 'Payment Received',
                type: NotificationType.PAYMENT_RECEIVED,
                channels: [
                    NotificationChannel.EMAIL,
                    NotificationChannel.SMS,
                    NotificationChannel.PUSH,
                ],
                subject: 'Payment Received - {{amount}} {{currency}}',
                content: `
                    <h2>Payment Received</h2>
                    <p>You have received a payment!</p>
                    <p><strong>Amount:</strong> {{amount}} {{currency}}</p>
                    <p><strong>From:</strong> {{senderName}}</p>
                    <p><strong>Transaction ID:</strong> {{transactionId}}</p>
                    <p><strong>Message:</strong> {{message}}</p>
                `,
                variables: ['amount', 'currency', 'senderName', 'transactionId', 'message'],
                isActive: true,
            },
            {
                name: 'Payment Sent',
                type: NotificationType.PAYMENT_SENT,
                channels: [NotificationChannel.EMAIL, NotificationChannel.PUSH],
                subject: 'Payment Sent - {{amount}} {{currency}}',
                content: `
                    <h2>Payment Sent Successfully</h2>
                    <p>Your payment has been sent successfully.</p>
                    <p><strong>Amount:</strong> {{amount}} {{currency}}</p>
                    <p><strong>To:</strong> {{recipientName}}</p>
                    <p><strong>Transaction ID:</strong> {{transactionId}}</p>
                    <p><strong>Fee:</strong> {{fee}} {{currency}}</p>
                `,
                variables: ['amount', 'currency', 'recipientName', 'transactionId', 'fee'],
                isActive: true,
            },
            {
                name: 'System Maintenance',
                type: NotificationType.SYSTEM_MAINTENANCE,
                channels: [
                    NotificationChannel.EMAIL,
                    NotificationChannel.SMS,
                    NotificationChannel.PUSH,
                ],
                subject: 'Scheduled Maintenance - {{maintenanceType}}',
                content: `
                    <h2>Scheduled System Maintenance</h2>
                    <p>We will be performing scheduled maintenance on our system.</p>
                    <p><strong>Maintenance Type:</strong> {{maintenanceType}}</p>
                    <p><strong>Start Time:</strong> {{startTime}}</p>
                    <p><strong>End Time:</strong> {{endTime}}</p>
                    <p><strong>Expected Impact:</strong> {{impact}}</p>
                    <p>We apologize for any inconvenience this may cause.</p>
                `,
                variables: ['maintenanceType', 'startTime', 'endTime', 'impact'],
                isActive: true,
            },
        ];

        for (const templateData of additionalTemplates) {
            try {
                const existingTemplate = await notificationDb.findTemplateByTypeAndChannel(
                    templateData.type,
                    templateData.channels[0],
                );

                if (!existingTemplate) {
                    await notificationDb.createTemplate(templateData);
                    logger.info(`Created template: ${templateData.name}`);
                } else {
                    logger.info(`Template already exists: ${templateData.name}`);
                }
            } catch (error) {
                logger.error(`Failed to create template: ${templateData.name}`, {
                    error: error instanceof Error ? error.message : 'Unknown error',
                });
            }
        }

        logger.info('Notification templates setup completed');
    }

    /**
     * Test notification services
     */
    private static async testNotificationServices(): Promise<void> {
        logger.info('Testing notification services...');

        // Test email service
        const emailTest = await EmailService.sendEmail({
            to: 'test@example.com',
            subject: 'ChainRemit Notification System Test',
            html: '<p>This is a test email from the ChainRemit notification system.</p>',
        });

        logger.info('Email service test result:', { success: emailTest });

        // Test SMS service
        const smsTest = await SMSService.sendSMS({
            to: '+1234567890',
            message: 'ChainRemit notification system test message',
        });

        logger.info('SMS service test result:', { success: smsTest });

        // Test push notification service
        const pushTest = await PushNotificationService.sendPushNotification({
            token: 'test-fcm-token',
            title: 'ChainRemit Test',
            body: 'Notification system test',
            data: { test: 'true' },
        });

        logger.info('Push notification service test result:', { success: pushTest });

        logger.info('Service testing completed');
    }

    /**
     * Initialize cron jobs
     */
    private static async initializeCronJobs(): Promise<void> {
        logger.info('Initializing notification cron jobs...');

        try {
            CronService.initializeCronJobs();

            const jobStatus = CronService.getJobStatus();
            logger.info('Cron jobs initialized', {
                jobCount: jobStatus.length,
                jobs: jobStatus.map((job) => ({
                    name: job.name,
                    running: job.running,
                    nextRun: job.nextDate?.toISOString(),
                })),
            });
        } catch (error) {
            logger.error('Failed to initialize cron jobs', {
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }

        logger.info('Cron jobs initialization completed');
    }

    /**
     * Verify queue system
     */
    private static async verifyQueueSystem(): Promise<void> {
        logger.info('Verifying queue system...');

        try {
            // Check queue health
            const health = await QueueService.healthCheck();
            logger.info('Queue health check result:', health);

            if (!health.healthy) {
                throw new Error(`Queue unhealthy: ${health.error}`);
            }

            // Get queue statistics
            const stats = await QueueService.getQueueStats();
            logger.info('Queue statistics:', stats);

            // Send a test notification through the queue
            const testNotification = await NotificationService.sendNotification({
                userId: 'setup-test-user',
                type: NotificationType.WELCOME,
                data: {
                    firstName: 'Test User',
                },
                priority: NotificationPriority.LOW,
            });

            logger.info('Test notification queued:', testNotification);

            // Wait a moment and check if the job was processed
            await new Promise((resolve) => setTimeout(resolve, 2000));

            const updatedStats = await QueueService.getQueueStats();
            logger.info('Updated queue statistics after test:', updatedStats);
        } catch (error) {
            logger.error('Queue system verification failed', {
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }

        logger.info('Queue system verification completed');
    }

    /**
     * Create default preferences for existing users
     */
    static async createDefaultPreferencesForUsers(userIds: string[]): Promise<void> {
        logger.info('Creating default preferences for existing users...', {
            userCount: userIds.length,
        });

        for (const userId of userIds) {
            try {
                const existing = await notificationDb.findPreferencesByUserId(userId);
                if (!existing) {
                    await notificationDb.createDefaultPreferences(userId);
                    logger.info(`Created default preferences for user: ${userId}`);
                }
            } catch (error) {
                logger.error(`Failed to create preferences for user: ${userId}`, {
                    error: error instanceof Error ? error.message : 'Unknown error',
                });
            }
        }

        logger.info('Default preferences creation completed');
    }

    /**
     * Generate sample notifications for testing
     */
    static async generateSampleNotifications(): Promise<void> {
        logger.info('Generating sample notifications for testing...');

        const sampleNotifications = [
            {
                userId: 'sample-user-1',
                type: NotificationType.TRANSACTION_CONFIRMATION,
                data: {
                    amount: '100.00',
                    currency: 'USD',
                    transactionId: 'tx_sample_12345',
                    recipientName: 'John Doe',
                    date: new Date().toLocaleDateString(),
                },
            },
            {
                userId: 'sample-user-2',
                type: NotificationType.SECURITY_ALERT,
                data: {
                    alertType: 'New Device Login',
                    description: 'Login from new device detected',
                    timestamp: new Date().toISOString(),
                    ipAddress: '192.168.1.100',
                },
            },
            {
                userId: 'sample-user-3',
                type: NotificationType.BALANCE_LOW,
                data: {
                    currency: 'ETH',
                    currentBalance: '0.001',
                    threshold: '0.01',
                },
            },
        ];

        for (const notification of sampleNotifications) {
            try {
                const result = await NotificationService.sendNotification({
                    ...notification,
                    priority: NotificationPriority.NORMAL,
                });

                logger.info('Sample notification created', {
                    userId: notification.userId,
                    type: notification.type,
                    jobIds: result.jobIds,
                });
            } catch (error) {
                logger.error('Failed to create sample notification', {
                    userId: notification.userId,
                    type: notification.type,
                    error: error instanceof Error ? error.message : 'Unknown error',
                });
            }
        }

        logger.info('Sample notifications generation completed');
    }

    /**
     * Cleanup old data (for maintenance)
     */
    static async cleanupOldData(): Promise<void> {
        logger.info('Cleaning up old notification data...');

        try {
            await QueueService.cleanOldJobs();
            logger.info('Old queue jobs cleaned');

            // Clean old notification history (older than 90 days)
            const ninetyDaysAgo = new Date();
            ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

            // This would be implemented in the notification database
            // await notificationDb.cleanOldHistory(ninetyDaysAgo);

            logger.info('Old notification data cleanup completed');
        } catch (error) {
            logger.error('Failed to cleanup old data', {
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
}

// Command line interface
const command = process.argv[2];

switch (command) {
    case 'setup':
        NotificationSetup.setup();
        break;
    case 'test':
        NotificationSetup.generateSampleNotifications();
        break;
    case 'cleanup':
        NotificationSetup.cleanupOldData();
        break;
    case 'preferences':
        const userIds = process.argv.slice(3);
        if (userIds.length === 0) {
            console.error('Please provide user IDs');
            process.exit(1);
        }
        NotificationSetup.createDefaultPreferencesForUsers(userIds);
        break;
    default:
        console.log('Available commands:');
        console.log('  setup      - Full notification system setup');
        console.log('  test       - Generate sample notifications');
        console.log('  cleanup    - Clean old notification data');
        console.log('  preferences <userIds...> - Create default preferences for users');
        console.log('');
        console.log('Usage: npm run setup:notifications <command>');
        break;
}

export { NotificationSetup };
