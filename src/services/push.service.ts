import * as admin from 'firebase-admin';
import { config } from '../config/config';
import logger from '../utils/logger';
import { PushData } from '../types/notification.types';

export class PushNotificationService {
    private static initialized = false;

    static initialize(): void {
        if (this.initialized) return;

        if (!config.push.firebaseServerKey || !config.push.firebaseProjectId) {
            logger.warn(
                'Firebase credentials not configured. Push notifications will be logged only.',
            );
            this.initialized = true;
            return;
        }

        try {
            // Initialize Firebase Admin SDK
            if (!admin.apps.length) {
                admin.initializeApp({
                    credential: admin.credential.cert({
                        projectId: config.push.firebaseProjectId,
                        privateKey: config.push.firebaseServerKey.replace(/\\n/g, '\n'),
                        clientEmail: `firebase-adminsdk@${config.push.firebaseProjectId}.iam.gserviceaccount.com`,
                    }),
                    databaseURL: config.push.firebaseDatabaseUrl,
                });
            }

            this.initialized = true;
            logger.info('Push notification service initialized with Firebase');
        } catch (error) {
            logger.error('Failed to initialize Firebase Admin SDK', {
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            this.initialized = true; // Set to true to prevent retry loops
        }
    }

    static async sendPushNotification(pushData: PushData): Promise<boolean> {
        try {
            this.initialize();

            // If Firebase not properly initialized, log the notification instead
            if (!admin.apps.length) {
                logger.info('Push notification (logged only)', {
                    token: Array.isArray(pushData.token) ? pushData.token.length : 1,
                    title: pushData.title,
                    body: pushData.body,
                });
                return true;
            }

            const message: admin.messaging.Message = {
                notification: {
                    title: pushData.title,
                    body: pushData.body,
                    imageUrl: pushData.imageUrl,
                },
                data: pushData.data || {},
                token: Array.isArray(pushData.token) ? pushData.token[0] : pushData.token,
            };

            if (Array.isArray(pushData.token)) {
                // Send to multiple tokens sequentially
                let successCount = 0;
                let failureCount = 0;

                for (const token of pushData.token) {
                    try {
                        await admin.messaging().send({
                            notification: message.notification,
                            data: message.data,
                            token,
                        });
                        successCount++;
                    } catch (error) {
                        failureCount++;
                        logger.warn('Failed to send push notification to token', { token });
                    }
                }

                logger.info('Push notifications sent', {
                    success: successCount,
                    failed: failureCount,
                    total: pushData.token.length,
                });

                return successCount > 0;
            } else {
                // Send to single token
                await admin.messaging().send(message);

                logger.info('Push notification sent successfully', {
                    title: pushData.title,
                });

                return true;
            }
        } catch (error) {
            logger.error('Failed to send push notification', {
                error: error instanceof Error ? error.message : 'Unknown error',
                title: pushData.title,
            });
            return false;
        }
    }

    static async sendBulkPushNotifications(
        notifications: PushData[],
    ): Promise<{ success: number; failed: number }> {
        let success = 0;
        let failed = 0;

        for (const notification of notifications) {
            const result = await this.sendPushNotification(notification);
            if (result) {
                success++;
            } else {
                failed++;
            }
        }

        logger.info('Bulk push notification sending completed', {
            success,
            failed,
            total: notifications.length,
        });
        return { success, failed };
    }

    static async sendTransactionNotification(
        tokens: string | string[],
        transactionData: {
            amount: string;
            currency: string;
            transactionId: string;
            status: string;
            recipientName?: string;
        },
    ): Promise<boolean> {
        const title = `Transaction ${transactionData.status}`;
        const body = transactionData.recipientName
            ? `${transactionData.amount} ${transactionData.currency} to ${transactionData.recipientName}`
            : `${transactionData.amount} ${transactionData.currency} transaction ${transactionData.status}`;

        return await this.sendPushNotification({
            token: tokens,
            title,
            body,
            data: {
                type: 'transaction_update',
                transactionId: transactionData.transactionId,
                status: transactionData.status,
            },
            imageUrl: 'https://chainremit.com/images/transaction-icon.png',
        });
    }

    static async sendSecurityAlert(
        tokens: string | string[],
        alertData: {
            alertType: string;
            description: string;
            timestamp: string;
        },
    ): Promise<boolean> {
        const title = `🔒 Security Alert`;
        const body = `${alertData.alertType}: ${alertData.description}`;

        return await this.sendPushNotification({
            token: tokens,
            title,
            body,
            data: {
                type: 'security_alert',
                alertType: alertData.alertType,
                timestamp: alertData.timestamp,
            },
            imageUrl: 'https://chainremit.com/images/security-icon.png',
        });
    }

    static async sendWelcomeNotification(
        tokens: string | string[],
        userData: {
            firstName: string;
        },
    ): Promise<boolean> {
        const title = `Welcome to ChainRemit!`;
        const body = `Hi ${userData.firstName}! Start sending money across borders with low fees and fast transfers.`;

        return await this.sendPushNotification({
            token: tokens,
            title,
            body,
            data: {
                type: 'welcome',
                action: 'open_app',
            },
            imageUrl: 'https://chainremit.com/images/welcome-icon.png',
        });
    }

    static async sendMarketingNotification(
        tokens: string | string[],
        campaignData: {
            title: string;
            message: string;
            imageUrl?: string;
            actionUrl?: string;
        },
    ): Promise<boolean> {
        return await this.sendPushNotification({
            token: tokens,
            title: campaignData.title,
            body: campaignData.message,
            data: {
                type: 'marketing',
                actionUrl: campaignData.actionUrl || '',
            },
            imageUrl: campaignData.imageUrl || 'https://chainremit.com/images/marketing-icon.png',
        });
    }

    static async sendSystemNotification(
        tokens: string | string[],
        systemData: {
            title: string;
            message: string;
            priority: 'low' | 'normal' | 'high';
            actionRequired?: boolean;
        },
    ): Promise<boolean> {
        const title = systemData.priority === 'high' ? `🚨 ${systemData.title}` : systemData.title;
        const body = systemData.actionRequired
            ? `${systemData.message} Action required.`
            : systemData.message;

        return await this.sendPushNotification({
            token: tokens,
            title,
            body,
            data: {
                type: 'system_notification',
                priority: systemData.priority,
                actionRequired: systemData.actionRequired?.toString() || 'false',
            },
            imageUrl: 'https://chainremit.com/images/system-icon.png',
        });
    }

    static async sendBalanceLowNotification(
        tokens: string | string[],
        balanceData: {
            currentBalance: string;
            currency: string;
            threshold: string;
        },
    ): Promise<boolean> {
        const title = `💰 Balance Low`;
        const body = `Your ${balanceData.currency} balance (${balanceData.currentBalance}) is below ${balanceData.threshold}. Add funds to continue.`;

        return await this.sendPushNotification({
            token: tokens,
            title,
            body,
            data: {
                type: 'balance_low',
                currency: balanceData.currency,
                currentBalance: balanceData.currentBalance,
            },
            imageUrl: 'https://chainremit.com/images/wallet-icon.png',
        });
    }

    static async subscribeToTopic(tokens: string[], topic: string): Promise<boolean> {
        try {
            this.initialize();

            if (!admin.apps.length) {
                logger.info('Topic subscription (logged only)', { tokens: tokens.length, topic });
                return true;
            }

            const response = await admin.messaging().subscribeToTopic(tokens, topic);

            logger.info('Tokens subscribed to topic', {
                topic,
                success: response.successCount,
                failed: response.failureCount,
            });

            return response.successCount > 0;
        } catch (error) {
            logger.error('Failed to subscribe to topic', {
                error: error instanceof Error ? error.message : 'Unknown error',
                topic,
            });
            return false;
        }
    }

    static async unsubscribeFromTopic(tokens: string[], topic: string): Promise<boolean> {
        try {
            this.initialize();

            if (!admin.apps.length) {
                logger.info('Topic unsubscription (logged only)', { tokens: tokens.length, topic });
                return true;
            }

            const response = await admin.messaging().unsubscribeFromTopic(tokens, topic);

            logger.info('Tokens unsubscribed from topic', {
                topic,
                success: response.successCount,
                failed: response.failureCount,
            });

            return response.successCount > 0;
        } catch (error) {
            logger.error('Failed to unsubscribe from topic', {
                error: error instanceof Error ? error.message : 'Unknown error',
                topic,
            });
            return false;
        }
    }

    static async validateToken(token: string): Promise<boolean> {
        try {
            this.initialize();

            if (!admin.apps.length) {
                return true; // Assume valid if not configured
            }

            // Try to send a dry-run message to validate the token
            await admin.messaging().send(
                {
                    token,
                    notification: {
                        title: 'Test',
                        body: 'Test',
                    },
                },
                true,
            ); // dry-run = true

            return true;
        } catch (error) {
            logger.warn('Invalid push notification token', { token });
            return false;
        }
    }
}
