import dotenv from 'dotenv';
dotenv.config();

export const config = {
    jwt: {
        accessSecret: process.env.JWT_ACCESS_SECRET || 'default-access-secret',
        refreshSecret: process.env.JWT_REFRESH_SECRET || 'default-refresh-secret',
        accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    },
    email: {
        sendgridApiKey: process.env.SENDGRID_API_KEY,
        fromEmail: process.env.FROM_EMAIL || 'noreply@chainremit.com',
        fromName: process.env.FROM_NAME || 'ChainRemit',
    },
    sms: {
        twilioAccountSid: process.env.TWILIO_ACCOUNT_SID,
        twilioAuthToken: process.env.TWILIO_AUTH_TOKEN,
        twilioPhoneNumber: process.env.TWILIO_PHONE_NUMBER,
    },
    push: {
        firebaseServerKey: process.env.FIREBASE_SERVER_KEY,
        firebaseDatabaseUrl: process.env.FIREBASE_DATABASE_URL,
        firebaseProjectId: process.env.FIREBASE_PROJECT_ID,
    },
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
    },
    oauth: {
        google: {
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        },
        apple: {
            clientId: process.env.APPLE_CLIENT_ID,
            teamId: process.env.APPLE_TEAM_ID,
            keyId: process.env.APPLE_KEY_ID,
            privateKey: process.env.APPLE_PRIVATE_KEY,
        },
    },
    notification: {
        maxRetries: parseInt(process.env.NOTIFICATION_MAX_RETRIES || '3'),
        retryDelay: parseInt(process.env.NOTIFICATION_RETRY_DELAY || '5000'),
        batchSize: parseInt(process.env.NOTIFICATION_BATCH_SIZE || '100'),
    },
    app: {
        baseUrl: process.env.BASE_URL || 'http://localhost:3000',
    },
};
