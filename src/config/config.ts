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
        fromEmail: process.env.FROM_EMAIL || 'noreply@yourapp.com',
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
    app: {
        baseUrl: process.env.BASE_URL || 'http://localhost:3000',
    },
};
