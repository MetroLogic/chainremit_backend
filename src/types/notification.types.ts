export interface NotificationPreferences {
    userId: string;
    email: {
        enabled: boolean;
        transactionUpdates: boolean;
        securityAlerts: boolean;
        marketingEmails: boolean;
        systemNotifications: boolean;
    };
    sms: {
        enabled: boolean;
        transactionUpdates: boolean;
        securityAlerts: boolean;
        criticalAlerts: boolean;
    };
    push: {
        enabled: boolean;
        transactionUpdates: boolean;
        securityAlerts: boolean;
        marketingUpdates: boolean;
        systemNotifications: boolean;
    };
    createdAt: Date;
    updatedAt: Date;
}

export interface NotificationTemplate {
    id: string;
    name: string;
    type: NotificationType;
    channels: NotificationChannel[];
    subject: string;
    content: string;
    variables: string[];
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface NotificationHistory {
    id: string;
    userId: string;
    templateId: string;
    type: NotificationType;
    channel: NotificationChannel;
    recipient: string;
    subject: string;
    content: string;
    status: NotificationStatus;
    deliveredAt?: Date;
    failedAt?: Date;
    errorMessage?: string;
    retryCount: number;
    metadata: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
}

export interface NotificationJob {
    id: string;
    userId: string;
    templateId: string;
    type: NotificationType;
    channel: NotificationChannel;
    recipient: string;
    data: Record<string, any>;
    priority: NotificationPriority;
    scheduledAt?: Date;
    attempts: number;
    maxAttempts: number;
    createdAt: Date;
}

export interface NotificationAnalytics {
    totalSent: number;
    totalDelivered: number;
    totalFailed: number;
    deliveryRate: number;
    averageDeliveryTime: number;
    channelBreakdown: {
        email: {
            sent: number;
            delivered: number;
            failed: number;
            rate: number;
        };
        sms: {
            sent: number;
            delivered: number;
            failed: number;
            rate: number;
        };
        push: {
            sent: number;
            delivered: number;
            failed: number;
            rate: number;
        };
    };
    typeBreakdown: Record<
        NotificationType,
        {
            sent: number;
            delivered: number;
            failed: number;
            rate: number;
        }
    >;
    dailyStats: Array<{
        date: string;
        sent: number;
        delivered: number;
        failed: number;
    }>;
}

export enum NotificationType {
    TRANSACTION_CONFIRMATION = 'transaction_confirmation',
    TRANSACTION_PENDING = 'transaction_pending',
    TRANSACTION_FAILED = 'transaction_failed',
    SECURITY_ALERT = 'security_alert',
    LOGIN_ALERT = 'login_alert',
    PASSWORD_RESET = 'password_reset',
    EMAIL_VERIFICATION = 'email_verification',
    KYC_APPROVED = 'kyc_approved',
    KYC_REJECTED = 'kyc_rejected',
    WALLET_CONNECTED = 'wallet_connected',
    BALANCE_LOW = 'balance_low',
    SYSTEM_MAINTENANCE = 'system_maintenance',
    MARKETING_CAMPAIGN = 'marketing_campaign',
    WELCOME = 'welcome',
    PAYMENT_RECEIVED = 'payment_received',
    PAYMENT_SENT = 'payment_sent',
}

export enum NotificationChannel {
    EMAIL = 'email',
    SMS = 'sms',
    PUSH = 'push',
}

export enum NotificationStatus {
    PENDING = 'pending',
    SENT = 'sent',
    DELIVERED = 'delivered',
    FAILED = 'failed',
    RETRYING = 'retrying',
}

export enum NotificationPriority {
    LOW = 'low',
    NORMAL = 'normal',
    HIGH = 'high',
    CRITICAL = 'critical',
}

export interface SendNotificationRequest {
    userId: string;
    type: NotificationType;
    channels?: NotificationChannel[];
    data: Record<string, any>;
    priority?: NotificationPriority;
    scheduledAt?: Date;
}

export interface SendNotificationResponse {
    success: boolean;
    jobIds: string[];
    message: string;
}

export interface NotificationPreferencesRequest {
    email?: {
        enabled?: boolean;
        transactionUpdates?: boolean;
        securityAlerts?: boolean;
        marketingEmails?: boolean;
        systemNotifications?: boolean;
    };
    sms?: {
        enabled?: boolean;
        transactionUpdates?: boolean;
        securityAlerts?: boolean;
        criticalAlerts?: boolean;
    };
    push?: {
        enabled?: boolean;
        transactionUpdates?: boolean;
        securityAlerts?: boolean;
        marketingUpdates?: boolean;
        systemNotifications?: boolean;
    };
}

export interface NotificationConfig {
    email: {
        sendgrid: {
            apiKey: string;
            fromEmail: string;
            fromName: string;
        };
    };
    sms: {
        twilio: {
            accountSid: string;
            authToken: string;
            phoneNumber: string;
        };
    };
    push: {
        firebase: {
            serverKey: string;
            databaseURL: string;
            projectId: string;
        };
    };
    queue: {
        redis: {
            host: string;
            port: number;
            password?: string;
        };
        maxAttempts: number;
        backoffDelay: number;
    };
}

export interface EmailData {
    to: string;
    subject: string;
    html: string;
    text?: string;
    templateId?: string;
    templateData?: Record<string, any>;
}

export interface SMSData {
    to: string;
    message: string;
}

export interface PushData {
    token: string | string[];
    title: string;
    body: string;
    data?: Record<string, any>;
    imageUrl?: string;
}

export interface DeliveryStatus {
    id: string;
    status: NotificationStatus;
    deliveredAt?: Date;
    errorMessage?: string;
}
