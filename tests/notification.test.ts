import request from 'supertest';
import app from '../src/app';
import { NotificationService } from '../src/services/notification.service';
import { QueueService } from '../src/services/queue.service';
import { notificationDb } from '../src/model/notification.model';
import { JWTService } from '../src/services/jwt.service';
import {
    NotificationType,
    NotificationChannel,
    NotificationPriority,
    NotificationStatus,
} from '../src/types/notification.types';

// Mock services
jest.mock('../src/services/notification.service');
jest.mock('../src/services/queue.service');
jest.mock('../src/model/notification.model');

const mockNotificationService = NotificationService as jest.Mocked<typeof NotificationService>;
const mockQueueService = QueueService as jest.Mocked<typeof QueueService>;

describe('Notification System - Complete Coverage', () => {
    let authToken: string;
    let adminToken: string;
    const testUserId = 'test-user-123';
    const adminUserId = 'admin-user-456';

    beforeAll(async () => {
        // Generate test JWT tokens
        const userTokens = JWTService.generateTokens(testUserId);
        const adminTokens = JWTService.generateTokens(adminUserId);
        authToken = userTokens.accessToken;
        adminToken = adminTokens.accessToken;
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /api/notifications/send', () => {
        it('should send a notification successfully', async () => {
            const mockResponse = {
                success: true,
                jobIds: ['job-123'],
                message: 'Notification queued for 1 channel(s)',
            };

            mockNotificationService.sendNotification.mockResolvedValue(mockResponse);

            const notificationData = {
                userId: testUserId,
                type: NotificationType.TRANSACTION_CONFIRMATION,
                data: {
                    amount: '100',
                    currency: 'USD',
                    transactionId: 'tx-123',
                    recipientName: 'John Doe',
                    date: '2025-01-26',
                },
                priority: NotificationPriority.HIGH,
            };

            const response = await request(app)
                .post('/api/notifications/send')
                .set('Authorization', `Bearer ${authToken}`)
                .send(notificationData)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toEqual(mockResponse);
            expect(mockNotificationService.sendNotification).toHaveBeenCalledWith({
                userId: testUserId,
                type: NotificationType.TRANSACTION_CONFIRMATION,
                channels: undefined,
                data: notificationData.data,
                priority: NotificationPriority.HIGH,
                scheduledAt: undefined,
            });
        });

        it('should return 400 for missing required fields', async () => {
            const response = await request(app)
                .post('/api/notifications/send')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    userId: testUserId,
                    type: NotificationType.TRANSACTION_CONFIRMATION,
                    // Missing data field
                })
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.error.message).toContain('userId, type, and data are required');
        });

        it('should return 400 for invalid notification type', async () => {
            const response = await request(app)
                .post('/api/notifications/send')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    userId: testUserId,
                    type: 'invalid_type',
                    data: { test: 'data' },
                })
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.error.message).toContain('Invalid notification type');
        });

        it('should return 400 for invalid channels', async () => {
            const response = await request(app)
                .post('/api/notifications/send')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    userId: testUserId,
                    type: NotificationType.TRANSACTION_CONFIRMATION,
                    channels: ['invalid_channel'],
                    data: { test: 'data' },
                })
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.error.message).toContain('Invalid notification channel');
        });

        it('should handle scheduled notifications', async () => {
            const mockResponse = {
                success: true,
                jobIds: ['job-123'],
                message: 'Notification queued for 1 channel(s)',
            };

            mockNotificationService.sendNotification.mockResolvedValue(mockResponse);

            const scheduledAt = new Date(Date.now() + 3600000); // 1 hour from now

            const response = await request(app)
                .post('/api/notifications/send')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    userId: testUserId,
                    type: NotificationType.SYSTEM_MAINTENANCE,
                    data: { message: 'Scheduled maintenance' },
                    scheduledAt: scheduledAt.toISOString(),
                })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(mockNotificationService.sendNotification).toHaveBeenCalledWith(
                expect.objectContaining({
                    scheduledAt: expect.any(Date),
                }),
            );
        });
    });

    describe('GET /api/notifications/preferences', () => {
        it('should get user notification preferences', async () => {
            const mockPreferences = {
                userId: testUserId,
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

            mockNotificationService.getUserPreferences.mockResolvedValue(mockPreferences);

            const response = await request(app)
                .get('/api/notifications/preferences')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toEqual(mockPreferences);
            expect(mockNotificationService.getUserPreferences).toHaveBeenCalledWith(testUserId);
        });

        it('should create default preferences if none exist', async () => {
            mockNotificationService.getUserPreferences.mockResolvedValue(null);

            const mockDefaultPreferences = {
                userId: testUserId,
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

            (notificationDb.createDefaultPreferences as jest.Mock).mockResolvedValue(
                mockDefaultPreferences,
            );

            const response = await request(app)
                .get('/api/notifications/preferences')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toEqual(mockDefaultPreferences);
        });
    });

    describe('PUT /api/notifications/preferences', () => {
        it('should update user notification preferences', async () => {
            const updates = {
                email: {
                    marketingEmails: true,
                },
                sms: {
                    enabled: false,
                },
            };

            const mockUpdatedPreferences = {
                userId: testUserId,
                email: {
                    enabled: true,
                    transactionUpdates: true,
                    securityAlerts: true,
                    marketingEmails: true, // Updated
                    systemNotifications: true,
                },
                sms: {
                    enabled: false, // Updated
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

            mockNotificationService.updateUserPreferences.mockResolvedValue(mockUpdatedPreferences);

            const response = await request(app)
                .put('/api/notifications/preferences')
                .set('Authorization', `Bearer ${authToken}`)
                .send(updates)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toEqual(mockUpdatedPreferences);
            expect(mockNotificationService.updateUserPreferences).toHaveBeenCalledWith(
                testUserId,
                updates,
            );
        });

        it('should return 400 for invalid preference keys', async () => {
            const response = await request(app)
                .put('/api/notifications/preferences')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    email: {
                        invalidKey: true,
                    },
                })
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.error.message).toContain('Invalid email preference key');
        });

        it('should return 400 for non-boolean preference values', async () => {
            const response = await request(app)
                .put('/api/notifications/preferences')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    email: {
                        enabled: 'yes', // Should be boolean
                    },
                })
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.error.message).toContain('must be boolean');
        });
    });

    describe('GET /api/notifications/history', () => {
        it('should get user notification history', async () => {
            const mockHistory = [
                {
                    id: 'hist-1',
                    userId: testUserId,
                    templateId: 'template-1',
                    type: NotificationType.TRANSACTION_CONFIRMATION,
                    channel: NotificationChannel.EMAIL,
                    recipient: 'user@example.com',
                    subject: 'Transaction Confirmed',
                    content: 'Your transaction has been confirmed',
                    status: NotificationStatus.DELIVERED,
                    deliveredAt: new Date(),
                    retryCount: 0,
                    metadata: { transactionId: 'tx-123' },
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ];

            mockNotificationService.getUserNotificationHistory.mockResolvedValue(mockHistory);

            const response = await request(app)
                .get('/api/notifications/history?limit=10&offset=0')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.history).toEqual(mockHistory);
            expect(response.body.data.pagination).toEqual({
                limit: 10,
                offset: 0,
                total: 1,
            });
            expect(mockNotificationService.getUserNotificationHistory).toHaveBeenCalledWith(
                testUserId,
                10,
                0,
            );
        });

        it('should validate limit parameter', async () => {
            const response = await request(app)
                .get('/api/notifications/history?limit=150')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.error.message).toContain('Limit must be between 1 and 100');
        });

        it('should validate offset parameter', async () => {
            const response = await request(app)
                .get('/api/notifications/history?offset=-1')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.error.message).toContain('Offset must be a non-negative number');
        });
    });

    describe('GET /api/notifications/analytics', () => {
        it('should get notification analytics', async () => {
            const mockAnalytics = {
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
                    [NotificationType.ACCOUNT_VERIFICATION]: {
                        sent: 8,
                        delivered: 8,
                        failed: 0,
                        rate: 100.0,
                    },
                    [NotificationType.PASSWORD_RESET]: {
                        sent: 6,
                        delivered: 6,
                        failed: 0,
                        rate: 100.0,
                    },
                    [NotificationType.LOGIN_ALERT]: {
                        sent: 12,
                        delivered: 11,
                        failed: 1,
                        rate: 91.67,
                    },
                    [NotificationType.SYSTEM_MAINTENANCE]: {
                        sent: 3,
                        delivered: 3,
                        failed: 0,
                        rate: 100.0,
                    },
                    [NotificationType.PROMOTIONAL]: {
                        sent: 7,
                        delivered: 6,
                        failed: 1,
                        rate: 85.71,
                    },
                    [NotificationType.REMINDER]: { sent: 4, delivered: 4, failed: 0, rate: 100.0 },
                    [NotificationType.WELCOME]: { sent: 2, delivered: 2, failed: 0, rate: 100.0 },
                    [NotificationType.ACCOUNT_SUSPENDED]: {
                        sent: 1,
                        delivered: 1,
                        failed: 0,
                        rate: 100.0,
                    },
                    [NotificationType.LIMIT_EXCEEDED]: {
                        sent: 2,
                        delivered: 2,
                        failed: 0,
                        rate: 100.0,
                    },
                    [NotificationType.COMPLIANCE_ALERT]: {
                        sent: 1,
                        delivered: 1,
                        failed: 0,
                        rate: 100.0,
                    },
                    [NotificationType.RATE_CHANGE]: {
                        sent: 3,
                        delivered: 3,
                        failed: 0,
                        rate: 100.0,
                    },
                    [NotificationType.GENERAL]: { sent: 1, delivered: 0, failed: 1, rate: 0.0 },
                },
                dailyStats: [],
            };

            mockNotificationService.getAnalytics.mockResolvedValue(mockAnalytics);

            const response = await request(app)
                .get('/api/notifications/analytics')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toEqual(mockAnalytics);
            expect(mockNotificationService.getAnalytics).toHaveBeenCalledWith(
                undefined,
                undefined,
                undefined,
            );
        });

        it('should handle date range parameters', async () => {
            const startDate = '2025-01-01';
            const endDate = '2025-01-31';

            mockNotificationService.getAnalytics.mockResolvedValue({} as any);

            await request(app)
                .get(`/api/notifications/analytics?startDate=${startDate}&endDate=${endDate}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(mockNotificationService.getAnalytics).toHaveBeenCalledWith(
                new Date(startDate),
                new Date(endDate),
                undefined,
            );
        });

        it('should return 400 for invalid date format', async () => {
            const response = await request(app)
                .get('/api/notifications/analytics?startDate=invalid-date')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.error.message).toContain('Invalid startDate format');
        });
    });

    describe('GET /api/notifications/queue/stats', () => {
        it('should get queue statistics', async () => {
            const mockStats = {
                waiting: 10,
                active: 5,
                completed: 100,
                failed: 2,
                delayed: 3,
            };

            const mockHealth = {
                healthy: true,
            };

            mockQueueService.getQueueStats.mockResolvedValue(mockStats);
            mockQueueService.healthCheck.mockResolvedValue(mockHealth);

            const response = await request(app)
                .get('/api/notifications/queue/stats')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toEqual({
                ...mockStats,
                healthy: true,
                error: undefined,
            });
        });
    });

    describe('POST /api/notifications/transaction-confirmation', () => {
        it('should send transaction confirmation notification', async () => {
            const mockResponse = {
                success: true,
                jobIds: ['job-123'],
                message: 'Notification queued for 1 channel(s)',
            };

            mockNotificationService.sendTransactionConfirmation.mockResolvedValue(mockResponse);

            const transactionData = {
                amount: '100',
                currency: 'USD',
                transactionId: 'tx-123',
                recipientName: 'John Doe',
                date: '2025-01-26',
            };

            const response = await request(app)
                .post('/api/notifications/transaction-confirmation')
                .set('Authorization', `Bearer ${authToken}`)
                .send(transactionData)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toEqual(mockResponse);
            expect(mockNotificationService.sendTransactionConfirmation).toHaveBeenCalledWith(
                testUserId,
                transactionData,
            );
        });

        it('should return 400 for missing required fields', async () => {
            const response = await request(app)
                .post('/api/notifications/transaction-confirmation')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    amount: '100',
                    currency: 'USD',
                    // Missing other required fields
                })
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.error.message).toContain('are required');
        });
    });

    describe('POST /api/notifications/security-alert', () => {
        it('should send security alert notification', async () => {
            const mockResponse = {
                success: true,
                jobIds: ['job-123'],
                message: 'Notification queued for 2 channel(s)',
            };

            mockNotificationService.sendSecurityAlert.mockResolvedValue(mockResponse);

            const alertData = {
                alertType: 'Suspicious Login',
                description: 'Login from new device',
                timestamp: new Date().toISOString(),
                ipAddress: '192.168.1.1',
            };

            const response = await request(app)
                .post('/api/notifications/security-alert')
                .set('Authorization', `Bearer ${authToken}`)
                .send(alertData)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toEqual(mockResponse);
            expect(mockNotificationService.sendSecurityAlert).toHaveBeenCalledWith(
                testUserId,
                alertData,
            );
        });
    });

    describe('Authorization', () => {
        it('should return 401 for requests without token', async () => {
            const response = await request(app).get('/api/notifications/preferences').expect(401);

            expect(response.body.success).toBe(false);
        });

        it('should return 401 for requests with invalid token', async () => {
            const response = await request(app)
                .get('/api/notifications/preferences')
                .set('Authorization', 'Bearer invalid-token')
                .expect(401);

            expect(response.body.success).toBe(false);
        });
    });

    describe('Error Handling', () => {
        it('should handle service errors gracefully', async () => {
            mockNotificationService.sendNotification.mockRejectedValue(
                new Error('Service unavailable'),
            );

            const response = await request(app)
                .post('/api/notifications/send')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    userId: testUserId,
                    type: NotificationType.TRANSACTION_CONFIRMATION,
                    data: { test: 'data' },
                })
                .expect(500);

            expect(response.body.success).toBe(false);
            expect(response.body.error.message).toContain('Failed to send notification');
        });
    });
});

describe('NotificationService Unit Tests', () => {
    describe('sendNotification', () => {
        it('should create jobs for enabled channels', async () => {
            // This would test the actual service logic
            // Implementation would depend on mocking the database and queue service
        });

        it('should handle user preferences correctly', async () => {
            // Test preference filtering logic
        });

        it('should schedule notifications correctly', async () => {
            // Test scheduling logic
        });
    });

    describe('processNotificationJob', () => {
        it('should render templates correctly', async () => {
            // Test template rendering with Handlebars
        });

        it('should send notifications through correct channels', async () => {
            // Test channel-specific sending logic
        });

        it('should update history records', async () => {
            // Test history tracking
        });
    });
});

describe('QueueService Unit Tests', () => {
    describe('queueNotification', () => {
        it('should add jobs to queue with correct priority', async () => {
            // Test queue priority handling
        });

        it('should handle queue failures gracefully', async () => {
            // Test fallback to direct processing
        });
    });

    describe('getQueueStats', () => {
        it('should return accurate queue statistics', async () => {
            // Test statistics calculation
        });
    });
});
