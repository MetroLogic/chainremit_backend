import sgMail from '@sendgrid/mail';
import Handlebars from 'handlebars';
import { config } from '../config/config';
import logger from '../utils/logger';
import { EmailData } from '../types/notification.types';

export class EmailService {
    private static initialized = false;

    static initialize(): void {
        if (this.initialized) return;

        if (!config.email.sendgridApiKey) {
            logger.warn(
                'SendGrid API key not configured. Email notifications will be logged only.',
            );
            this.initialized = true;
            return;
        }

        sgMail.setApiKey(config.email.sendgridApiKey);
        this.initialized = true;
        logger.info('Email service initialized with SendGrid');
    }

    static async sendEmail(emailData: EmailData): Promise<boolean> {
        try {
            this.initialize();

            // If no SendGrid API key, log the email instead
            if (!config.email.sendgridApiKey) {
                logger.info('Email notification (logged only)', {
                    to: emailData.to,
                    subject: emailData.subject,
                    html: emailData.html,
                    templateId: emailData.templateId,
                });
                return true;
            }

            const msg = {
                to: emailData.to,
                from: {
                    email: config.email.fromEmail,
                    name: config.email.fromName,
                },
                subject: emailData.subject,
                html: emailData.html,
                text: emailData.text,
            };

            await sgMail.send(msg);
            logger.info('Email sent successfully', {
                to: emailData.to,
                subject: emailData.subject,
            });
            return true;
        } catch (error) {
            logger.error('Failed to send email', {
                error: error instanceof Error ? error.message : 'Unknown error',
                to: emailData.to,
                subject: emailData.subject,
            });
            return false;
        }
    }

    static async sendTemplateEmail(
        to: string,
        templateContent: string,
        subject: string,
        data: Record<string, any>,
    ): Promise<boolean> {
        try {
            // Compile Handlebars template
            const template = Handlebars.compile(templateContent);
            const html = template(data);

            // Compile subject template
            const subjectTemplate = Handlebars.compile(subject);
            const compiledSubject = subjectTemplate(data);

            return await this.sendEmail({
                to,
                subject: compiledSubject,
                html,
            });
        } catch (error) {
            logger.error('Failed to send template email', {
                error: error instanceof Error ? error.message : 'Unknown error',
                to,
                template: templateContent.substring(0, 100) + '...',
            });
            return false;
        }
    }

    static async sendBulkEmails(emails: EmailData[]): Promise<{ success: number; failed: number }> {
        let success = 0;
        let failed = 0;

        for (const email of emails) {
            const result = await this.sendEmail(email);
            if (result) {
                success++;
            } else {
                failed++;
            }
        }

        logger.info('Bulk email sending completed', { success, failed, total: emails.length });
        return { success, failed };
    }

    static async sendTransactionConfirmation(
        to: string,
        transactionData: {
            amount: string;
            currency: string;
            transactionId: string;
            recipientName: string;
            date: string;
        },
    ): Promise<boolean> {
        const subject = `Transaction Confirmed - ${transactionData.amount} ${transactionData.currency}`;
        const html = `
            <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
                    <h1 style="color: white; margin: 0;">Transaction Confirmed</h1>
                </div>
                
                <div style="padding: 30px; background: #f8f9fa;">
                    <p style="font-size: 16px; margin-bottom: 20px;">
                        Great news! Your transaction has been successfully processed and confirmed.
                    </p>
                    
                    <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                        <h3 style="color: #333; margin-top: 0;">Transaction Details</h3>
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 8px 0; font-weight: bold;">Amount:</td>
                                <td style="padding: 8px 0;">${transactionData.amount} ${transactionData.currency}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; font-weight: bold;">Recipient:</td>
                                <td style="padding: 8px 0;">${transactionData.recipientName}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; font-weight: bold;">Transaction ID:</td>
                                <td style="padding: 8px 0; font-family: monospace; background: #f1f3f4; padding: 4px 8px; border-radius: 4px;">${transactionData.transactionId}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; font-weight: bold;">Date:</td>
                                <td style="padding: 8px 0;">${transactionData.date}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; font-weight: bold;">Status:</td>
                                <td style="padding: 8px 0; color: #28a745; font-weight: bold;">✓ Confirmed</td>
                            </tr>
                        </table>
                    </div>
                    
                    <p style="margin-top: 30px; color: #666;">
                        Your funds have been successfully transferred. The recipient should receive them shortly.
                    </p>
                    
                    <div style="text-align: center; margin-top: 30px;">
                        <a href="${config.app.baseUrl}/transactions/${transactionData.transactionId}" 
                           style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                            View Transaction Details
                        </a>
                    </div>
                </div>
                
                <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 12px;">
                    <p>Thank you for using ChainRemit - Making cross-border payments simple and secure.</p>
                    <p>If you have any questions, contact our support team at support@chainremit.com</p>
                </div>
            </div>
        `;

        return await this.sendEmail({ to, subject, html });
    }

    static async sendSecurityAlert(
        to: string,
        alertData: {
            alertType: string;
            description: string;
            timestamp: string;
            ipAddress: string;
            location?: string;
        },
    ): Promise<boolean> {
        const subject = `Security Alert - ${alertData.alertType}`;
        const html = `
            <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
                <div style="background: #dc3545; padding: 30px; text-align: center;">
                    <h1 style="color: white; margin: 0;">🔒 Security Alert</h1>
                </div>
                
                <div style="padding: 30px; background: #f8f9fa;">
                    <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
                        <strong>⚠️ Important Security Notice</strong>
                    </div>
                    
                    <p style="font-size: 16px;">
                        We detected the following security event on your account:
                    </p>
                    
                    <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 8px 0; font-weight: bold;">Alert Type:</td>
                                <td style="padding: 8px 0;">${alertData.alertType}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; font-weight: bold;">Description:</td>
                                <td style="padding: 8px 0;">${alertData.description}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; font-weight: bold;">Time:</td>
                                <td style="padding: 8px 0;">${alertData.timestamp}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; font-weight: bold;">IP Address:</td>
                                <td style="padding: 8px 0; font-family: monospace;">${alertData.ipAddress}</td>
                            </tr>
                            ${
                                alertData.location
                                    ? `<tr><td style="padding: 8px 0; font-weight: bold;">Location:</td><td style="padding: 8px 0;">${alertData.location}</td></tr>`
                                    : ''
                            }
                        </table>
                    </div>
                    
                    <div style="background: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 5px; margin-top: 20px;">
                        <strong>What should you do?</strong>
                        <ul style="margin: 10px 0 0 0;">
                            <li>If this was you, no action is required</li>
                            <li>If this wasn't you, secure your account immediately</li>
                            <li>Change your password and enable 2FA</li>
                            <li>Review your recent account activity</li>
                        </ul>
                    </div>
                    
                    <div style="text-align: center; margin-top: 30px;">
                        <a href="${config.app.baseUrl}/security" 
                           style="background: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-right: 10px;">
                            Secure My Account
                        </a>
                        <a href="${config.app.baseUrl}/activity" 
                           style="background: #6c757d; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                            View Activity
                        </a>
                    </div>
                </div>
                
                <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 12px;">
                    <p>This is an automated security notification from ChainRemit.</p>
                    <p>If you need help, contact our support team at security@chainremit.com</p>
                </div>
            </div>
        `;

        return await this.sendEmail({ to, subject, html });
    }

    static async sendWelcomeEmail(
        to: string,
        welcomeData: {
            firstName: string;
            verificationLink?: string;
        },
    ): Promise<boolean> {
        const subject = 'Welcome to ChainRemit!';
        const html = `
            <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
                    <h1 style="color: white; margin: 0;">Welcome to ChainRemit!</h1>
                </div>
                
                <div style="padding: 30px; background: #f8f9fa;">
                    <h2 style="color: #333;">Hello ${welcomeData.firstName}! 👋</h2>
                    
                    <p style="font-size: 16px; line-height: 1.6;">
                        Thank you for joining ChainRemit, the future of cross-border payments. 
                        We're excited to have you on board and help you send money across borders 
                        with speed, security, and minimal fees.
                    </p>
                    
                    <div style="background: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin: 25px 0;">
                        <h3 style="color: #333; margin-top: 0;">🚀 Get Started in 3 Easy Steps</h3>
                        <ol style="line-height: 1.8;">
                            <li><strong>Verify your email</strong> - Complete your account verification</li>
                            <li><strong>Complete your profile</strong> - Add your personal information</li>
                            <li><strong>Start sending money</strong> - Make your first cross-border payment</li>
                        </ol>
                    </div>
                    
                    <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 25px 0;">
                        <h4 style="color: #1976d2; margin-top: 0;">💡 Why Choose ChainRemit?</h4>
                        <ul style="margin: 0; line-height: 1.6;">
                            <li>⚡ <strong>Lightning Fast:</strong> Transfers in minutes, not days</li>
                            <li>💰 <strong>Low Fees:</strong> Up to 90% cheaper than traditional services</li>
                            <li>🔒 <strong>Secure:</strong> Blockchain-powered security</li>
                            <li>🌍 <strong>Global:</strong> Send money to 50+ countries</li>
                        </ul>
                    </div>
                    
                    ${
                        welcomeData.verificationLink
                            ? `
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${welcomeData.verificationLink}" 
                           style="background: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                            Verify Your Email
                        </a>
                    </div>
                    `
                            : ''
                    }
                    
                    <div style="text-align: center; margin-top: 30px;">
                        <a href="${config.app.baseUrl}/dashboard" 
                           style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-right: 10px;">
                            Go to Dashboard
                        </a>
                        <a href="${config.app.baseUrl}/help" 
                           style="background: #6c757d; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                            Get Help
                        </a>
                    </div>
                </div>
                
                <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 12px;">
                    <p>Need help getting started? Our support team is here for you!</p>
                    <p>📧 support@chainremit.com | 📞 +1-800-CHAINREMIT</p>
                    <p style="margin-top: 15px;">
                        <a href="${config.app.baseUrl}/unsubscribe" style="color: #ccc;">Unsubscribe</a> | 
                        <a href="${config.app.baseUrl}/privacy" style="color: #ccc;">Privacy Policy</a>
                    </p>
                </div>
            </div>
        `;

        return await this.sendEmail({ to, subject, html });
    }
}
