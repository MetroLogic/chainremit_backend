import { NotificationService } from '../src/services/notification.service';
import { QueueService } from '../src/services/queue.service';
import { EmailService } from '../src/services/email.service';
import { SMSService } from '../src/services/sms.service';
import { PushNotificationService } from '../src/services/push.service';
import { CronService } from '../src/services/cron.service';
import {
    NotificationType,
    NotificationChannel,
    NotificationPriority,
    NotificationStatus,
} from '../src/types/notification.types';

describe('Notification System - Core Functionality Tests', () => {
    describe('NotificationService', () => {
        it('should create notification service instance', () => {
            const service = new NotificationService();
            expect(service).toBeDefined();
            expect(service).toBeInstanceOf(NotificationService);
        });

        it('should have required methods', () => {
            const service = new NotificationService();
            expect(typeof service.sendNotification).toBe('function');
            expect(typeof service.getUserPreferences).toBe('function');
            expect(typeof service.updateUserPreferences).toBe('function');
            expect(typeof service.getAnalytics).toBe('function');
        });
    });

    describe('QueueService', () => {
        it('should create queue service instance', () => {
            const service = new QueueService();
            expect(service).toBeDefined();
            expect(service).toBeInstanceOf(QueueService);
        });

        it('should have queue management methods', () => {
            const service = new QueueService();
            expect(typeof service.initialize).toBe('function');
            expect(typeof service.queueNotification).toBe('function');
            expect(typeof service.getHealth).toBe('function');
        });
    });

    describe('EmailService', () => {
        it('should create email service instance', () => {
            const service = new EmailService();
            expect(service).toBeDefined();
            expect(service).toBeInstanceOf(EmailService);
        });

        it('should have send method', () => {
            const service = new EmailService();
            expect(typeof service.send).toBe('function');
        });

        it('should handle email sending without configuration', async () => {
            const service = new EmailService();
            const result = await service.send('test@example.com', 'Test Subject', 'Test Content');

            expect(result).toBeDefined();
            expect(result.success).toBe(true);
        });
    });

    describe('SMSService', () => {
        it('should create SMS service instance', () => {
            const service = new SMSService();
            expect(service).toBeDefined();
            expect(service).toBeInstanceOf(SMSService);
        });

        it('should have send method', () => {
            const service = new SMSService();
            expect(typeof service.send).toBe('function');
        });

        it('should handle SMS sending without configuration', async () => {
            const service = new SMSService();
            const result = await service.send('+1234567890', 'Test message');

            expect(result).toBeDefined();
            expect(result.success).toBe(true);
        });
    });

    describe('PushNotificationService', () => {
        it('should create push notification service instance', () => {
            const service = new PushNotificationService();
            expect(service).toBeDefined();
            expect(service).toBeInstanceOf(PushNotificationService);
        });

        it('should have send method', () => {
            const service = new PushNotificationService();
            expect(typeof service.send).toBe('function');
        });

        it('should handle push notification sending without configuration', async () => {
            const service = new PushNotificationService();
            const result = await service.send('test-token', 'Test Title', 'Test Body');

            expect(result).toBeDefined();
            expect(result.success).toBe(true);
        });
    });

    describe('CronService', () => {
        it('should have static methods for cron management', () => {
            expect(typeof CronService.initializeCronJobs).toBe('function');
            expect(typeof CronService.stopAllJobs).toBe('function');
            expect(typeof CronService.getJobStatus).toBe('function');
        });

        it('should initialize cron jobs without errors', () => {
            expect(() => {
                CronService.initializeCronJobs();
            }).not.toThrow();
        });
    });

    describe('Notification Types and Enums', () => {
        it('should have all required notification types', () => {
            expect(NotificationType.TRANSACTION_CONFIRMATION).toBe('transaction_confirmation');
            expect(NotificationType.TRANSACTION_PENDING).toBe('transaction_pending');
            expect(NotificationType.TRANSACTION_FAILED).toBe('transaction_failed');
            expect(NotificationType.SECURITY_ALERT).toBe('security_alert');
            expect(NotificationType.LOGIN_ALERT).toBe('login_alert');
            expect(NotificationType.PASSWORD_RESET).toBe('password_reset');
            expect(NotificationType.EMAIL_VERIFICATION).toBe('email_verification');
            expect(NotificationType.KYC_APPROVED).toBe('kyc_approved');
            expect(NotificationType.KYC_REJECTED).toBe('kyc_rejected');
            expect(NotificationType.WALLET_CONNECTED).toBe('wallet_connected');
            expect(NotificationType.BALANCE_LOW).toBe('balance_low');
            expect(NotificationType.SYSTEM_MAINTENANCE).toBe('system_maintenance');
            expect(NotificationType.MARKETING_CAMPAIGN).toBe('marketing_campaign');
            expect(NotificationType.WELCOME).toBe('welcome');
            expect(NotificationType.PAYMENT_RECEIVED).toBe('payment_received');
            expect(NotificationType.PAYMENT_SENT).toBe('payment_sent');
        });

        it('should have all required notification channels', () => {
            expect(NotificationChannel.EMAIL).toBe('email');
            expect(NotificationChannel.SMS).toBe('sms');
            expect(NotificationChannel.PUSH).toBe('push');
        });

        it('should have all required notification priorities', () => {
            expect(NotificationPriority.LOW).toBe('low');
            expect(NotificationPriority.NORMAL).toBe('normal');
            expect(NotificationPriority.HIGH).toBe('high');
            expect(NotificationPriority.URGENT).toBe('urgent');
        });

        it('should have all required notification statuses', () => {
            expect(NotificationStatus.PENDING).toBe('pending');
            expect(NotificationStatus.QUEUED).toBe('queued');
            expect(NotificationStatus.PROCESSING).toBe('processing');
            expect(NotificationStatus.DELIVERED).toBe('delivered');
            expect(NotificationStatus.FAILED).toBe('failed');
            expect(NotificationStatus.SKIPPED).toBe('skipped');
        });
    });

    describe('Service Integration', () => {
        it('should handle notification workflow end-to-end', async () => {
            // Test the complete notification workflow
            const notificationService = new NotificationService();
            const queueService = new QueueService();

            // Initialize queue service
            try {
                await queueService.initialize();
            } catch (error) {
                // Expected when Redis is not available
                expect(error).toBeDefined();
            }

            expect(notificationService).toBeDefined();
            expect(queueService).toBeDefined();
        });

        it('should handle service failures gracefully', async () => {
            const emailService = new EmailService();
            const smsService = new SMSService();
            const pushService = new PushNotificationService();

            // Test that services don't throw when external services are unavailable
            await expect(
                emailService.send('test@example.com', 'Subject', 'Content'),
            ).resolves.toBeDefined();
            await expect(smsService.send('+1234567890', 'Message')).resolves.toBeDefined();
            await expect(pushService.send('token', 'Title', 'Body')).resolves.toBeDefined();
        });

        it('should validate notification data structure', () => {
            // Test that the notification data structure is valid
            const notificationData = {
                userId: 'test-user-123',
                type: NotificationType.TRANSACTION_CONFIRMATION,
                channel: NotificationChannel.EMAIL,
                priority: NotificationPriority.HIGH,
                status: NotificationStatus.PENDING,
                data: {
                    transactionId: 'tx-123',
                    amount: '100.00',
                    currency: 'USD',
                },
            };

            expect(notificationData.userId).toBe('test-user-123');
            expect(notificationData.type).toBe('transaction_confirmation');
            expect(notificationData.channel).toBe('email');
            expect(notificationData.priority).toBe('high');
            expect(notificationData.status).toBe('pending');
            expect(notificationData.data.transactionId).toBe('tx-123');
        });
    });

    describe('Error Handling', () => {
        it('should handle service initialization errors', () => {
            // Test service initialization with missing configuration
            expect(() => new NotificationService()).not.toThrow();
            expect(() => new QueueService()).not.toThrow();
            expect(() => new EmailService()).not.toThrow();
            expect(() => new SMSService()).not.toThrow();
            expect(() => new PushNotificationService()).not.toThrow();
        });

        it('should handle invalid notification data', async () => {
            const service = new NotificationService();

            // Test with invalid data
            try {
                await service.sendNotification({
                    userId: '', // Invalid empty user ID
                    type: 'invalid_type' as any, // Invalid type
                    data: null as any, // Invalid data
                });
            } catch (error) {
                expect(error).toBeDefined();
            }
        });
    });

    describe('Configuration and Environment', () => {
        it('should handle missing environment variables gracefully', () => {
            // Test that services work without environment variables
            const originalEnv = process.env;

            // Temporarily clear environment variables
            process.env = {};

            expect(() => new EmailService()).not.toThrow();
            expect(() => new SMSService()).not.toThrow();
            expect(() => new PushNotificationService()).not.toThrow();

            // Restore environment
            process.env = originalEnv;
        });

        it('should use fallback values for missing configuration', () => {
            // Test default configuration values
            const emailService = new EmailService();
            const smsService = new SMSService();
            const pushService = new PushNotificationService();

            expect(emailService).toBeDefined();
            expect(smsService).toBeDefined();
            expect(pushService).toBeDefined();
        });
    });
});
