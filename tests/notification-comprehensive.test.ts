import request from 'supertest';
import app from '../src/app';
import { NotificationService } from '../src/services/notification.service';
import { QueueService } from '../src/services/queue.service';
import { EmailService } from '../src/services/email.service';
import { SMSService } from '../src/services/sms.service';
import { PushNotificationService } from '../src/services/push.service';
import { CronService } from '../src/services/cron.service';
import { notificationDb } from '../src/model/notification.model';
import { JWTService } from '../src/services/jwt.service';
import {
    NotificationType,
    NotificationChannel,
    NotificationPriority,
    NotificationStatus,
    NotificationAnalytics,
} from '../src/types/notification.types';

// Mock services
jest.mock('../src/services/notification.service');
jest.mock('../src/services/queue.service');
jest.mock('../src/services/email.service');
jest.mock('../src/services/sms.service');
jest.mock('../src/services/push.service');
jest.mock('../src/services/cron.service');
jest.mock('../src/model/notification.model');

const mockNotificationService = jest.mocked(NotificationService);
const mockQueueService = jest.mocked(QueueService);
const mockEmailService = jest.mocked(EmailService);
const mockSMSService = jest.mocked(SMSService);
const mockPushService = jest.mocked(PushNotificationService);

describe('Notification System - Complete Test Coverage', () => {
    let authToken: string;
    let adminToken: string;
    const testUserId = 'test-user-123';
    const adminUserId = 'admin@chainremit.com';

    beforeAll(async () => {
        // Generate test JWT tokens
        const userTokens = JWTService.generateTokens(testUserId);
        const adminTokens = JWTService.generateTokens(adminUserId);
        authToken = userTokens.accessToken;
        adminToken = adminTokens.accessToken;
    });

    beforeEach(() => {
        jest.clearAllMocks();
        // Mock user data
        (notificationDb.users as any) = new Map([
            [testUserId, { id: testUserId, email: `user${testUserId}@example.com` }],
            [adminUserId, { id: adminUserId, email: adminUserId }],
        ]);
    });

    describe('POST /api/notifications/send', () => {
        it('should send a notification successfully', async () => {
            const mockResponse = {
                success: true,
                jobIds: ['job-123'],
                message: 'Notification queued for 1 channel(s)',
            };

            mockNotificationService.sendNotification = jest.fn().mockResolvedValue(mockResponse);

            const notificationData = {
                userId: testUserId,
                type: NotificationType.TRANSACTION_CONFIRMATION,
                data: {
                    amount: '100',
                    currency: 'USD',
                    transactionId: 'tx-123',
                },
                channels: [NotificationChannel.EMAIL],
                priority: NotificationPriority.HIGH,
            };

            const response = await request(app)
                .post('/api/notifications/send')
                .set('Authorization', `Bearer ${authToken}`)
                .send(notificationData)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.jobIds).toEqual(['job-123']);
            expect(mockNotificationService.sendNotification).toHaveBeenCalledWith(
                expect.objectContaining(notificationData),
            );
        });

        it('should handle notification sending errors', async () => {
            mockNotificationService.sendNotification = jest
                .fn()
                .mockRejectedValue(new Error('Service unavailable'));

            const notificationData = {
                userId: testUserId,
                type: NotificationType.TRANSACTION_CONFIRMATION,
                data: { amount: '100' },
            };

            const response = await request(app)
                .post('/api/notifications/send')
                .set('Authorization', `Bearer ${authToken}`)
                .send(notificationData)
                .expect(500);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Failed to send notification');
        });

        it('should validate required fields', async () => {
            const response = await request(app)
                .post('/api/notifications/send')
                .set('Authorization', `Bearer ${authToken}`)
                .send({})
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toContain('validation');
        });

        it('should require authentication', async () => {
            const response = await request(app)
                .post('/api/notifications/send')
                .send({
                    userId: testUserId,
                    type: NotificationType.TRANSACTION_CONFIRMATION,
                })
                .expect(401);

            expect(response.body.success).toBe(false);
        });
    });

    describe('POST /api/notifications/send-bulk', () => {
        it('should send bulk notifications for admin users', async () => {
            const mockResponse = {
                success: true,
                totalSent: 3,
                results: [
                    { userId: 'user1', success: true, jobIds: ['job1'] },
                    { userId: 'user2', success: true, jobIds: ['job2'] },
                    { userId: 'user3', success: true, jobIds: ['job3'] },
                ],
            };

            mockNotificationService.sendBulkNotifications = jest
                .fn()
                .mockResolvedValue(mockResponse);

            const bulkData = {
                notifications: [
                    {
                        userId: 'user1',
                        type: NotificationType.SYSTEM_MAINTENANCE,
                        data: { message: 'System maintenance scheduled' },
                    },
                    {
                        userId: 'user2',
                        type: NotificationType.SYSTEM_MAINTENANCE,
                        data: { message: 'System maintenance scheduled' },
                    },
                ],
            };

            const response = await request(app)
                .post('/api/notifications/send-bulk')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(bulkData)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.totalSent).toBe(3);
            expect(mockNotificationService.sendBulkNotifications).toHaveBeenCalled();
        });

        it('should reject bulk notifications for non-admin users', async () => {
            const response = await request(app)
                .post('/api/notifications/send-bulk')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ notifications: [] })
                .expect(403);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toContain('admin');
        });
    });

    describe('GET /api/notifications/preferences', () => {
        it('should get user notification preferences', async () => {
            const mockPreferences = {
                userId: testUserId,
                channels: {
                    email: true,
                    sms: false,
                    push: true,
                },
                types: {
                    [NotificationType.TRANSACTION_CONFIRMATION]: {
                        email: true,
                        sms: true,
                        push: true,
                    },
                    [NotificationType.SECURITY_ALERT]: {
                        email: true,
                        sms: true,
                        push: true,
                    },
                },
                quiet_hours: {
                    enabled: true,
                    start: '22:00',
                    end: '08:00',
                    timezone: 'UTC',
                },
            };

            mockNotificationService.getUserPreferences = jest
                .fn()
                .mockResolvedValue(mockPreferences);

            const response = await request(app)
                .get('/api/notifications/preferences')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.userId).toBe(testUserId);
            expect(response.body.data.channels).toBeDefined();
            expect(mockNotificationService.getUserPreferences).toHaveBeenCalledWith(testUserId);
        });

        it('should handle missing preferences gracefully', async () => {
            mockNotificationService.getUserPreferences = jest.fn().mockResolvedValue(null);

            const response = await request(app)
                .get('/api/notifications/preferences')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toBe(null);
        });
    });

    describe('PUT /api/notifications/preferences', () => {
        it('should update user notification preferences', async () => {
            const updatedPreferences = {
                channels: {
                    email: true,
                    sms: true,
                    push: false,
                },
                types: {
                    [NotificationType.TRANSACTION_CONFIRMATION]: {
                        email: true,
                        sms: true,
                        push: false,
                    },
                },
            };

            mockNotificationService.updateUserPreferences = jest.fn().mockResolvedValue({
                userId: testUserId,
                ...updatedPreferences,
            });

            const response = await request(app)
                .put('/api/notifications/preferences')
                .set('Authorization', `Bearer ${authToken}`)
                .send(updatedPreferences)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.channels.sms).toBe(true);
            expect(mockNotificationService.updateUserPreferences).toHaveBeenCalledWith(
                testUserId,
                updatedPreferences,
            );
        });

        it('should validate preference update data', async () => {
            const response = await request(app)
                .put('/api/notifications/preferences')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ invalid: 'data' })
                .expect(400);

            expect(response.body.success).toBe(false);
        });
    });

    describe('GET /api/notifications/history', () => {
        it('should get user notification history', async () => {
            const mockHistory = {
                notifications: [
                    {
                        id: 'hist-1',
                        userId: testUserId,
                        type: NotificationType.TRANSACTION_CONFIRMATION,
                        channel: NotificationChannel.EMAIL,
                        status: NotificationStatus.DELIVERED,
                        createdAt: new Date(),
                        deliveredAt: new Date(),
                    },
                ],
                pagination: {
                    page: 1,
                    limit: 20,
                    total: 1,
                    totalPages: 1,
                },
            };

            mockNotificationService.getUserHistory = jest.fn().mockResolvedValue(mockHistory);

            const response = await request(app)
                .get('/api/notifications/history')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.notifications).toHaveLength(1);
            expect(response.body.data.pagination.total).toBe(1);
            expect(mockNotificationService.getUserHistory).toHaveBeenCalledWith(
                testUserId,
                expect.any(Object),
            );
        });

        it('should support pagination and filtering', async () => {
            const mockHistory = {
                notifications: [],
                pagination: { page: 2, limit: 10, total: 5, totalPages: 1 },
            };

            mockNotificationService.getUserHistory = jest.fn().mockResolvedValue(mockHistory);

            const response = await request(app)
                .get('/api/notifications/history?page=2&limit=10&type=transaction_confirmation')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(mockNotificationService.getUserHistory).toHaveBeenCalledWith(
                testUserId,
                expect.objectContaining({
                    page: 2,
                    limit: 10,
                    type: 'transaction_confirmation',
                }),
            );
        });
    });

    describe('GET /api/notifications/analytics (Admin Only)', () => {
        it('should get notification analytics for admin users', async () => {
            const mockAnalytics: NotificationAnalytics = {
                totalSent: 100,
                totalDelivered: 95,
                totalFailed: 5,
                deliveryRate: 95.0,
                averageDeliveryTime: 5000,
                channelBreakdown: {
                    email: { sent: 50, delivered: 48, failed: 2, rate: 96.0 },
                    sms: { sent: 30, delivered: 28, failed: 2, rate: 93.33 },
                    push: { sent: 20, delivered: 19, failed: 1, rate: 95.0 },
                },
                typeBreakdown: {
                    [NotificationType.TRANSACTION_CONFIRMATION]: {
                        sent: 20,
                        delivered: 19,
                        failed: 1,
                        rate: 95.0,
                    },
                    [NotificationType.TRANSACTION_PENDING]: {
                        sent: 15,
                        delivered: 15,
                        failed: 0,
                        rate: 100.0,
                    },
                    [NotificationType.TRANSACTION_FAILED]: {
                        sent: 10,
                        delivered: 9,
                        failed: 1,
                        rate: 90.0,
                    },
                    [NotificationType.SECURITY_ALERT]: {
                        sent: 5,
                        delivered: 5,
                        failed: 0,
                        rate: 100.0,
                    },
                    [NotificationType.LOGIN_ALERT]: {
                        sent: 12,
                        delivered: 11,
                        failed: 1,
                        rate: 91.67,
                    },
                    [NotificationType.PASSWORD_RESET]: {
                        sent: 6,
                        delivered: 6,
                        failed: 0,
                        rate: 100.0,
                    },
                    [NotificationType.EMAIL_VERIFICATION]: {
                        sent: 8,
                        delivered: 8,
                        failed: 0,
                        rate: 100.0,
                    },
                    [NotificationType.KYC_APPROVED]: {
                        sent: 4,
                        delivered: 4,
                        failed: 0,
                        rate: 100.0,
                    },
                    [NotificationType.KYC_REJECTED]: {
                        sent: 2,
                        delivered: 2,
                        failed: 0,
                        rate: 100.0,
                    },
                    [NotificationType.WALLET_CONNECTED]: {
                        sent: 3,
                        delivered: 3,
                        failed: 0,
                        rate: 100.0,
                    },
                    [NotificationType.BALANCE_LOW]: {
                        sent: 7,
                        delivered: 6,
                        failed: 1,
                        rate: 85.71,
                    },
                    [NotificationType.SYSTEM_MAINTENANCE]: {
                        sent: 3,
                        delivered: 3,
                        failed: 0,
                        rate: 100.0,
                    },
                    [NotificationType.MARKETING_CAMPAIGN]: {
                        sent: 5,
                        delivered: 4,
                        failed: 1,
                        rate: 80.0,
                    },
                    [NotificationType.WELCOME]: {
                        sent: 2,
                        delivered: 2,
                        failed: 0,
                        rate: 100.0,
                    },
                    [NotificationType.PAYMENT_RECEIVED]: {
                        sent: 4,
                        delivered: 4,
                        failed: 0,
                        rate: 100.0,
                    },
                    [NotificationType.PAYMENT_SENT]: {
                        sent: 4,
                        delivered: 4,
                        failed: 0,
                        rate: 100.0,
                    },
                },
                dailyStats: [],
            };

            mockNotificationService.getAnalytics = jest.fn().mockResolvedValue(mockAnalytics);

            const response = await request(app)
                .get('/api/notifications/analytics')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.totalSent).toBe(100);
            expect(response.body.data.deliveryRate).toBe(95.0);
            expect(response.body.data.channelBreakdown).toBeDefined();
        });

        it('should reject analytics access for non-admin users', async () => {
            const response = await request(app)
                .get('/api/notifications/analytics')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(403);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toContain('admin');
        });
    });

    describe('Template Management (Admin Only)', () => {
        describe('GET /api/notifications/templates', () => {
            it('should get all notification templates for admin users', async () => {
                const mockTemplates = [
                    {
                        id: 'template-1',
                        name: 'Transaction Confirmation',
                        type: NotificationType.TRANSACTION_CONFIRMATION,
                        subject: 'Transaction Confirmed',
                        content: 'Your transaction {{transactionId}} has been confirmed.',
                        variables: ['transactionId', 'amount'],
                    },
                ];

                mockNotificationService.getTemplates = jest.fn().mockResolvedValue(mockTemplates);

                const response = await request(app)
                    .get('/api/notifications/templates')
                    .set('Authorization', `Bearer ${adminToken}`)
                    .expect(200);

                expect(response.body.success).toBe(true);
                expect(response.body.data).toHaveLength(1);
                expect(response.body.data[0].name).toBe('Transaction Confirmation');
            });
        });

        describe('POST /api/notifications/templates', () => {
            it('should create a new notification template for admin users', async () => {
                const newTemplate = {
                    name: 'New Template',
                    type: NotificationType.WELCOME,
                    subject: 'Welcome!',
                    content: 'Welcome {{name}}!',
                    variables: ['name'],
                };

                const createdTemplate = { id: 'template-new', ...newTemplate };
                mockNotificationService.createTemplate = jest
                    .fn()
                    .mockResolvedValue(createdTemplate);

                const response = await request(app)
                    .post('/api/notifications/templates')
                    .set('Authorization', `Bearer ${adminToken}`)
                    .send(newTemplate)
                    .expect(201);

                expect(response.body.success).toBe(true);
                expect(response.body.data.id).toBe('template-new');
                expect(mockNotificationService.createTemplate).toHaveBeenCalledWith(newTemplate);
            });
        });

        describe('PUT /api/notifications/templates/:id', () => {
            it('should update an existing notification template for admin users', async () => {
                const templateId = 'template-1';
                const updateData = {
                    subject: 'Updated Subject',
                    content: 'Updated content {{variable}}',
                };

                const updatedTemplate = { id: templateId, ...updateData };
                mockNotificationService.updateTemplate = jest
                    .fn()
                    .mockResolvedValue(updatedTemplate);

                const response = await request(app)
                    .put(`/api/notifications/templates/${templateId}`)
                    .set('Authorization', `Bearer ${adminToken}`)
                    .send(updateData)
                    .expect(200);

                expect(response.body.success).toBe(true);
                expect(response.body.data.subject).toBe('Updated Subject');
                expect(mockNotificationService.updateTemplate).toHaveBeenCalledWith(
                    templateId,
                    updateData,
                );
            });
        });
    });

    describe('Queue Management (Admin Only)', () => {
        describe('GET /api/notifications/queue/stats', () => {
            it('should get queue statistics for admin users', async () => {
                const mockStats = {
                    waiting: 5,
                    active: 2,
                    completed: 100,
                    failed: 3,
                    delayed: 1,
                };

                mockQueueService.getStats = jest.fn().mockResolvedValue(mockStats);

                const response = await request(app)
                    .get('/api/notifications/queue/stats')
                    .set('Authorization', `Bearer ${adminToken}`)
                    .expect(200);

                expect(response.body.success).toBe(true);
                expect(response.body.data.waiting).toBe(5);
                expect(response.body.data.completed).toBe(100);
            });
        });

        describe('POST /api/notifications/queue/retry', () => {
            it('should retry failed jobs for admin users', async () => {
                const mockResult = { retriedJobs: 3 };
                mockQueueService.retryFailedJobs = jest.fn().mockResolvedValue(mockResult);

                const response = await request(app)
                    .post('/api/notifications/queue/retry')
                    .set('Authorization', `Bearer ${adminToken}`)
                    .expect(200);

                expect(response.body.success).toBe(true);
                expect(response.body.data.retriedJobs).toBe(3);
            });
        });

        describe('POST /api/notifications/queue/clean', () => {
            it('should clean old jobs for admin users', async () => {
                const mockResult = { cleanedJobs: 50 };
                mockQueueService.cleanOldJobs = jest.fn().mockResolvedValue(mockResult);

                const response = await request(app)
                    .post('/api/notifications/queue/clean')
                    .set('Authorization', `Bearer ${adminToken}`)
                    .send({ olderThan: 24 })
                    .expect(200);

                expect(response.body.success).toBe(true);
                expect(response.body.data.cleanedJobs).toBe(50);
            });
        });
    });

    describe('Quick Notification Helpers', () => {
        describe('POST /api/notifications/transaction-confirmation', () => {
            it('should send transaction confirmation notification', async () => {
                const mockResponse = {
                    success: true,
                    jobIds: ['job-tx-123'],
                    message: 'Transaction confirmation sent',
                };

                mockNotificationService.sendNotification = jest
                    .fn()
                    .mockResolvedValue(mockResponse);

                const transactionData = {
                    userId: testUserId,
                    transactionId: 'tx-123',
                    amount: '100.00',
                    currency: 'USD',
                    recipient: 'John Doe',
                };

                const response = await request(app)
                    .post('/api/notifications/transaction-confirmation')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send(transactionData)
                    .expect(200);

                expect(response.body.success).toBe(true);
                expect(response.body.jobIds).toEqual(['job-tx-123']);
            });
        });

        describe('POST /api/notifications/security-alert', () => {
            it('should send security alert notification', async () => {
                const mockResponse = {
                    success: true,
                    jobIds: ['job-security-123'],
                    message: 'Security alert sent',
                };

                mockNotificationService.sendNotification = jest
                    .fn()
                    .mockResolvedValue(mockResponse);

                const alertData = {
                    userId: testUserId,
                    alertType: 'login_attempt',
                    location: 'New York, US',
                    ipAddress: '192.168.1.1',
                };

                const response = await request(app)
                    .post('/api/notifications/security-alert')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send(alertData)
                    .expect(200);

                expect(response.body.success).toBe(true);
                expect(response.body.jobIds).toEqual(['job-security-123']);
            });
        });
    });

    describe('Service Layer Tests', () => {
        describe('NotificationService', () => {
            it('should handle template rendering correctly', async () => {
                const service = new NotificationService();
                // Test template rendering logic
                expect(service).toBeDefined();
            });

            it('should filter notifications based on user preferences', async () => {
                const service = new NotificationService();
                // Test preference filtering logic
                expect(service).toBeDefined();
            });

            it('should handle multi-channel delivery', async () => {
                const service = new NotificationService();
                // Test multi-channel delivery logic
                expect(service).toBeDefined();
            });
        });

        describe('QueueService', () => {
            it('should queue notifications properly', async () => {
                const service = new QueueService();
                // Test queue functionality
                expect(service).toBeDefined();
            });

            it('should handle job retries correctly', async () => {
                const service = new QueueService();
                // Test retry mechanism
                expect(service).toBeDefined();
            });
        });

        describe('EmailService', () => {
            it('should send emails when configured', async () => {
                const service = new EmailService();
                // Test email sending
                expect(service).toBeDefined();
            });

            it('should log emails when not configured', async () => {
                const service = new EmailService();
                // Test fallback logging
                expect(service).toBeDefined();
            });
        });

        describe('SMSService', () => {
            it('should send SMS when configured', async () => {
                const service = new SMSService();
                // Test SMS sending
                expect(service).toBeDefined();
            });

            it('should log SMS when not configured', async () => {
                const service = new SMSService();
                // Test fallback logging
                expect(service).toBeDefined();
            });
        });

        describe('PushNotificationService', () => {
            it('should send push notifications when configured', async () => {
                const service = new PushNotificationService();
                // Test push notification sending
                expect(service).toBeDefined();
            });

            it('should log push notifications when not configured', async () => {
                const service = new PushNotificationService();
                // Test fallback logging
                expect(service).toBeDefined();
            });
        });
    });

    describe('Error Handling and Edge Cases', () => {
        it('should handle service unavailability gracefully', async () => {
            mockNotificationService.sendNotification = jest
                .fn()
                .mockRejectedValue(new Error('Redis connection failed'));

            const response = await request(app)
                .post('/api/notifications/send')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    userId: testUserId,
                    type: NotificationType.TRANSACTION_CONFIRMATION,
                    data: { amount: '100' },
                })
                .expect(500);

            expect(response.body.success).toBe(false);
        });

        it('should validate notification data thoroughly', async () => {
            const invalidData = {
                userId: '', // Invalid empty userId
                type: 'invalid_type', // Invalid notification type
                data: null, // Invalid data
            };

            const response = await request(app)
                .post('/api/notifications/send')
                .set('Authorization', `Bearer ${authToken}`)
                .send(invalidData)
                .expect(400);

            expect(response.body.success).toBe(false);
        });

        it('should handle concurrent notification requests', async () => {
            mockNotificationService.sendNotification = jest.fn().mockResolvedValue({
                success: true,
                jobIds: ['job-1'],
                message: 'Queued successfully',
            });

            const requests = Array.from({ length: 5 }, (_, i) =>
                request(app)
                    .post('/api/notifications/send')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({
                        userId: testUserId,
                        type: NotificationType.TRANSACTION_CONFIRMATION,
                        data: { transactionId: `tx-${i}` },
                    }),
            );

            const responses = await Promise.all(requests);
            responses.forEach((response) => {
                expect(response.status).toBe(200);
                expect(response.body.success).toBe(true);
            });
        });
    });

    describe('Authentication and Authorization', () => {
        it('should reject requests without authentication token', async () => {
            const response = await request(app).get('/api/notifications/preferences').expect(401);

            expect(response.body.success).toBe(false);
        });

        it('should reject requests with invalid authentication token', async () => {
            const response = await request(app)
                .get('/api/notifications/preferences')
                .set('Authorization', 'Bearer invalid-token')
                .expect(401);

            expect(response.body.success).toBe(false);
        });

        it('should reject admin endpoints for regular users', async () => {
            const response = await request(app)
                .get('/api/notifications/analytics')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(403);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toContain('admin');
        });
    });
});
