import { Twilio } from 'twilio';
import { config } from '../config/config';
import logger from '../utils/logger';
import { SMSData } from '../types/notification.types';

export class SMSService {
    private static client: Twilio | null = null;
    private static initialized = false;

    static initialize(): void {
        if (this.initialized) return;

        if (!config.sms.twilioAccountSid || !config.sms.twilioAuthToken) {
            logger.warn(
                'Twilio credentials not configured. SMS notifications will be logged only.',
            );
            this.initialized = true;
            return;
        }

        this.client = new Twilio(config.sms.twilioAccountSid, config.sms.twilioAuthToken);
        this.initialized = true;
        logger.info('SMS service initialized with Twilio');
    }

    static async sendSMS(smsData: SMSData): Promise<boolean> {
        try {
            this.initialize();

            // If no Twilio credentials, log the SMS instead
            if (!this.client) {
                logger.info('SMS notification (logged only)', {
                    to: smsData.to,
                    message: smsData.message,
                });
                return true;
            }

            if (!config.sms.twilioPhoneNumber) {
                logger.error('Twilio phone number not configured');
                return false;
            }

            const message = await this.client.messages.create({
                body: smsData.message,
                from: config.sms.twilioPhoneNumber,
                to: smsData.to,
            });

            logger.info('SMS sent successfully', {
                to: smsData.to,
                messageSid: message.sid,
            });
            return true;
        } catch (error) {
            logger.error('Failed to send SMS', {
                error: error instanceof Error ? error.message : 'Unknown error',
                to: smsData.to,
            });
            return false;
        }
    }

    static async sendBulkSMS(messages: SMSData[]): Promise<{ success: number; failed: number }> {
        let success = 0;
        let failed = 0;

        for (const sms of messages) {
            const result = await this.sendSMS(sms);
            if (result) {
                success++;
            } else {
                failed++;
            }
        }

        logger.info('Bulk SMS sending completed', { success, failed, total: messages.length });
        return { success, failed };
    }

    static async sendTransactionAlert(
        to: string,
        transactionData: {
            amount: string;
            currency: string;
            transactionId: string;
            status: string;
        },
    ): Promise<boolean> {
        const message = `ChainRemit: Your ${transactionData.amount} ${transactionData.currency} transaction (${transactionData.transactionId.substring(0, 8)}...) is ${transactionData.status}. Check app for details.`;

        return await this.sendSMS({ to, message });
    }

    static async sendSecurityAlert(
        to: string,
        alertData: {
            alertType: string;
            timestamp: string;
            ipAddress: string;
        },
    ): Promise<boolean> {
        const message = `ChainRemit Security Alert: ${alertData.alertType} detected at ${alertData.timestamp} from IP ${alertData.ipAddress}. If this wasn't you, secure your account immediately.`;

        return await this.sendSMS({ to, message });
    }

    static async sendOTP(to: string, otp: string, expiryMinutes: number = 10): Promise<boolean> {
        const message = `Your ChainRemit verification code is: ${otp}. This code expires in ${expiryMinutes} minutes. Do not share this code with anyone.`;

        return await this.sendSMS({ to, message });
    }

    static async sendLoginAlert(
        to: string,
        loginData: {
            timestamp: string;
            location?: string;
            device?: string;
        },
    ): Promise<boolean> {
        const locationInfo = loginData.location ? ` from ${loginData.location}` : '';
        const deviceInfo = loginData.device ? ` on ${loginData.device}` : '';

        const message = `ChainRemit: New login to your account at ${loginData.timestamp}${locationInfo}${deviceInfo}. If this wasn't you, secure your account now.`;

        return await this.sendSMS({ to, message });
    }

    static async sendCriticalAlert(
        to: string,
        alertData: {
            title: string;
            description: string;
            actionRequired?: boolean;
        },
    ): Promise<boolean> {
        const actionText = alertData.actionRequired ? ' Action required.' : '';
        const message = `ChainRemit CRITICAL: ${alertData.title} - ${alertData.description}${actionText} Check your account immediately.`;

        return await this.sendSMS({ to, message });
    }

    static async sendBalanceLowAlert(
        to: string,
        balanceData: {
            currentBalance: string;
            currency: string;
            threshold: string;
        },
    ): Promise<boolean> {
        const message = `ChainRemit: Your ${balanceData.currency} balance (${balanceData.currentBalance}) is below ${balanceData.threshold}. Add funds to continue sending money.`;

        return await this.sendSMS({ to, message });
    }

    static formatPhoneNumber(phoneNumber: string, countryCode?: string): string {
        // Remove all non-digits
        let cleaned = phoneNumber.replace(/\D/g, '');

        // If no country code provided and number doesn't start with +, assume US
        if (!countryCode && !cleaned.startsWith('1') && cleaned.length === 10) {
            cleaned = '1' + cleaned;
        }

        // Add country code if provided
        if (countryCode && !cleaned.startsWith(countryCode)) {
            cleaned = countryCode + cleaned;
        }

        // Ensure it starts with +
        if (!cleaned.startsWith('+')) {
            cleaned = '+' + cleaned;
        }

        return cleaned;
    }

    static validatePhoneNumber(phoneNumber: string): boolean {
        // Basic validation - should start with + and contain 10-15 digits
        const phoneRegex = /^\+[1-9]\d{9,14}$/;
        return phoneRegex.test(phoneNumber);
    }
}
