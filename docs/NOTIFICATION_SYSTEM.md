# Notification System Documentation

## Overview

The ChainRemit notification system is a comprehensive, multi-channel notification platform that supports email, SMS, and push notifications. It provides reliable delivery, template management, user preferences, analytics, and queue-based processing with retry mechanisms.

## Features

### ✅ Core Features

- **Multi-channel Support**: Email, SMS, and Push notifications
- **Template System**: Handlebars-based templates with variable substitution
- **User Preferences**: Granular control over notification types and channels
- **Queue System**: Redis-based queue with retry mechanisms and dead letter queues
- **Analytics**: Comprehensive delivery tracking and reporting
- **Scheduled Notifications**: Support for future-scheduled notifications
- **Batch Processing**: Efficient bulk notification handling
- **Error Handling**: Robust error handling with fallback mechanisms

### ✅ External Service Integrations

- **Email**: SendGrid integration
- **SMS**: Twilio integration
- **Push**: Firebase Cloud Messaging (FCM)
- **Queue**: Redis with Bull queue
- **Templates**: Handlebars template engine

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Client App    │───▶│ Notification API │───▶│ Queue Service   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │                         │
                                ▼                         ▼
                       ┌──────────────────┐    ┌─────────────────┐
                       │ Preference Mgmt  │    │ Job Processor   │
                       └──────────────────┘    └─────────────────┘
                                │                         │
                                ▼                         ▼
                       ┌──────────────────┐    ┌─────────────────┐
                       │ Template Engine  │    │ Channel Services│
                       └──────────────────┘    └─────────────────┘
                                                         │
                              ┌──────────────────────────┼──────────────────────────┐
                              ▼                          ▼                          ▼
                    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
                    │ Email Service   │    │  SMS Service    │    │  Push Service   │
                    │   (SendGrid)    │    │   (Twilio)      │    │   (Firebase)    │
                    └─────────────────┘    └─────────────────┘    └─────────────────┘
```

## API Endpoints

### Core Notification Endpoints

#### Send Notification

```http
POST /api/notifications/send
Authorization: Bearer <token>
Content-Type: application/json

{
  "userId": "user-123",
  "type": "transaction_confirmation",
  "channels": ["email", "push"],
  "data": {
    "amount": "100.00",
    "currency": "USD",
    "transactionId": "tx-123",
    "recipientName": "John Doe",
    "date": "2025-01-26"
  },
  "priority": "high",
  "scheduledAt": "2025-01-27T10:00:00Z"
}
```

#### Send Bulk Notifications

```http
POST /api/notifications/send-bulk
Authorization: Bearer <token>
Content-Type: application/json

{
  "notifications": [
    {
      "userId": "user-123",
      "type": "transaction_confirmation",
      "data": { ... }
    },
    {
      "userId": "user-456",
      "type": "security_alert",
      "data": { ... }
    }
  ]
}
```

### User Preference Management

#### Get Preferences

```http
GET /api/notifications/preferences
Authorization: Bearer <token>
```

#### Update Preferences

```http
PUT /api/notifications/preferences
Authorization: Bearer <token>
Content-Type: application/json

{
  "email": {
    "enabled": true,
    "transactionUpdates": true,
    "securityAlerts": true,
    "marketingEmails": false,
    "systemNotifications": true
  },
  "sms": {
    "enabled": true,
    "transactionUpdates": true,
    "securityAlerts": true,
    "criticalAlerts": true
  },
  "push": {
    "enabled": true,
    "transactionUpdates": true,
    "securityAlerts": true,
    "marketingUpdates": false,
    "systemNotifications": true
  }
}
```

### Notification History

#### Get History

```http
GET /api/notifications/history?limit=50&offset=0&type=transaction_confirmation&channel=email&status=delivered
Authorization: Bearer <token>
```

### Analytics (Admin Only)

#### Get Analytics

```http
GET /api/notifications/analytics?startDate=2025-01-01&endDate=2025-01-31&userId=user-123
Authorization: Bearer <admin-token>
```

### Template Management (Admin Only)

#### Get Templates

```http
GET /api/notifications/templates
Authorization: Bearer <admin-token>
```

#### Create Template

```http
POST /api/notifications/templates
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "name": "Custom Template",
  "type": "marketing_campaign",
  "channels": ["email", "push"],
  "subject": "Special Offer - {{offerName}}",
  "content": "<h2>{{offerName}}</h2><p>{{offerDescription}}</p>",
  "variables": ["offerName", "offerDescription"],
  "isActive": true
}
```

#### Update Template

```http
PUT /api/notifications/templates/:id
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "subject": "Updated Subject - {{offerName}}",
  "isActive": false
}
```

### Queue Management (Admin Only)

#### Get Queue Stats

```http
GET /api/notifications/queue/stats
Authorization: Bearer <admin-token>
```

#### Retry Failed Jobs

```http
POST /api/notifications/queue/retry
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "limit": 20
}
```

#### Clean Old Jobs

```http
POST /api/notifications/queue/clean
Authorization: Bearer <admin-token>
```

### Quick Notification Helpers

#### Transaction Confirmation

```http
POST /api/notifications/transaction-confirmation
Authorization: Bearer <token>
Content-Type: application/json

{
  "amount": "100.00",
  "currency": "USD",
  "transactionId": "tx-123",
  "recipientName": "John Doe",
  "date": "2025-01-26"
}
```

#### Security Alert

```http
POST /api/notifications/security-alert
Authorization: Bearer <token>
Content-Type: application/json

{
  "alertType": "Suspicious Login",
  "description": "Login from new device",
  "timestamp": "2025-01-26T10:30:00Z",
  "ipAddress": "192.168.1.1"
}
```

## Configuration

### Environment Variables

```bash
# Email Configuration (SendGrid)
SENDGRID_API_KEY=SG.your-sendgrid-api-key
FROM_EMAIL=noreply@chainremit.com
FROM_NAME=ChainRemit

# SMS Configuration (Twilio)
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+1234567890

# Push Notification Configuration (Firebase)
FIREBASE_SERVER_KEY=your-firebase-server-key
FIREBASE_DATABASE_URL=https://your-project.firebaseio.com
FIREBASE_PROJECT_ID=your-firebase-project-id

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# Notification Configuration
NOTIFICATION_MAX_RETRIES=3
NOTIFICATION_RETRY_DELAY=5000
NOTIFICATION_BATCH_SIZE=100
```

### Service Configuration

```typescript
// src/config/config.ts
export const config = {
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
    notification: {
        maxRetries: parseInt(process.env.NOTIFICATION_MAX_RETRIES || '3'),
        retryDelay: parseInt(process.env.NOTIFICATION_RETRY_DELAY || '5000'),
        batchSize: parseInt(process.env.NOTIFICATION_BATCH_SIZE || '100'),
    },
};
```

## Notification Types

```typescript
enum NotificationType {
    // Transaction Related
    TRANSACTION_CONFIRMATION = 'transaction_confirmation',
    TRANSACTION_PENDING = 'transaction_pending',
    TRANSACTION_FAILED = 'transaction_failed',
    PAYMENT_RECEIVED = 'payment_received',
    PAYMENT_SENT = 'payment_sent',

    // Security Related
    SECURITY_ALERT = 'security_alert',
    LOGIN_ALERT = 'login_alert',
    PASSWORD_RESET = 'password_reset',

    // Account Related
    EMAIL_VERIFICATION = 'email_verification',
    KYC_APPROVED = 'kyc_approved',
    KYC_REJECTED = 'kyc_rejected',
    WALLET_CONNECTED = 'wallet_connected',

    // System Related
    BALANCE_LOW = 'balance_low',
    SYSTEM_MAINTENANCE = 'system_maintenance',
    WELCOME = 'welcome',

    // Marketing
    MARKETING_CAMPAIGN = 'marketing_campaign',
}
```

## Template System

### Template Variables

Templates use Handlebars syntax for variable substitution:

```html
<h2>Transaction Confirmed - {{amount}} {{currency}}</h2>
<p>Dear {{firstName}},</p>
<p>Your transaction has been confirmed:</p>
<ul>
    <li>Amount: {{amount}} {{currency}}</li>
    <li>Transaction ID: {{transactionId}}</li>
    <li>Date: {{date}}</li>
</ul>

{{#if recipientMessage}}
<p>Message: {{recipientMessage}}</p>
{{/if}}

<p>Transaction fees: {{fee}} {{currency}}</p>
```

### Helper Functions

You can register custom Handlebars helpers:

```typescript
import Handlebars from 'handlebars';

// Register currency formatting helper
Handlebars.registerHelper('formatCurrency', function (amount: string, currency: string) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
    }).format(parseFloat(amount));
});

// Register date formatting helper
Handlebars.registerHelper('formatDate', function (date: string) {
    return new Date(date).toLocaleDateString();
});
```

## Usage Examples

### Basic Notification Sending

```typescript
import { NotificationService } from './services/notification.service';
import { NotificationType, NotificationPriority } from './types/notification.types';

// Send a transaction confirmation
const result = await NotificationService.sendTransactionConfirmation('user-123', {
    amount: '100.00',
    currency: 'USD',
    transactionId: 'tx-abc123',
    recipientName: 'John Doe',
    date: new Date().toLocaleDateString(),
});

// Send a security alert
await NotificationService.sendSecurityAlert('user-123', {
    alertType: 'Suspicious Login',
    description: 'Login from new device detected',
    timestamp: new Date().toISOString(),
    ipAddress: '192.168.1.100',
});

// Send a custom notification
await NotificationService.sendNotification({
    userId: 'user-123',
    type: NotificationType.MARKETING_CAMPAIGN,
    channels: [NotificationChannel.EMAIL, NotificationChannel.PUSH],
    data: {
        campaignName: 'Spring Sale',
        discount: '20%',
        expiryDate: '2025-03-31',
    },
    priority: NotificationPriority.LOW,
    scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
});
```

### Managing User Preferences

```typescript
// Get user preferences
const preferences = await NotificationService.getUserPreferences('user-123');

// Update preferences
await NotificationService.updateUserPreferences('user-123', {
    email: {
        marketingEmails: false,
    },
    sms: {
        enabled: false,
    },
});
```

### Queue Management

```typescript
import { QueueService } from './services/queue.service';

// Get queue statistics
const stats = await QueueService.getQueueStats();
console.log('Queue stats:', stats);

// Retry failed jobs
const retriedCount = await QueueService.retryFailedJobs(10);
console.log(`Retried ${retriedCount} jobs`);

// Clean old jobs
await QueueService.cleanOldJobs();
```

## Setup and Installation

### 1. Install Dependencies

The required dependencies are already included in `package.json`:

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env` file with the required configuration:

```bash
cp .env.example .env
# Edit .env with your service credentials
```

### 3. Set Up External Services

#### SendGrid (Email)

1. Create a SendGrid account
2. Generate an API key
3. Add `SENDGRID_API_KEY` to your environment

#### Twilio (SMS)

1. Create a Twilio account
2. Get your Account SID and Auth Token
3. Purchase a phone number
4. Add credentials to environment

#### Firebase (Push Notifications)

1. Create a Firebase project
2. Generate a service account key
3. Add credentials to environment

#### Redis (Queue)

1. Install and run Redis
2. Add connection details to environment

### 4. Initialize the Notification System

```bash
# Run the setup script
npm run setup:notifications setup

# Generate sample notifications for testing
npm run setup:notifications test

# Create default preferences for existing users
npm run setup:notifications preferences user1 user2 user3
```

## Monitoring and Maintenance

### Cron Jobs

The system includes automated maintenance tasks:

- **Clean old jobs**: Daily at 2 AM
- **Retry failed jobs**: Every hour
- **Generate analytics**: Daily at 3 AM
- **Health checks**: Every 15 minutes
- **Queue monitoring**: Every 5 minutes

### Health Checks

Monitor the notification system health:

```typescript
// Check queue health
const health = await QueueService.healthCheck();

// Get queue statistics
const stats = await QueueService.getQueueStats();

// Get analytics
const analytics = await NotificationService.getAnalytics();
```

### Logging

All notification activities are logged with appropriate levels:

```typescript
// Success logs
logger.info('Notification sent successfully', {
    userId: '123',
    type: 'transaction_confirmation',
    channel: 'email',
});

// Error logs
logger.error('Notification delivery failed', {
    userId: '123',
    error: 'Service unavailable',
});
```

### Performance Monitoring

Monitor key metrics:

- **Delivery Rate**: Percentage of successful deliveries
- **Average Delivery Time**: Time from queue to delivery
- **Queue Size**: Number of pending notifications
- **Failed Jobs**: Number of failed delivery attempts
- **Channel Performance**: Success rate by channel

## Security Considerations

### Data Protection

- User preferences are stored securely
- Personal data in notifications is minimized
- Logs exclude sensitive information

### Rate Limiting

- API endpoints have rate limiting
- Queue processing has concurrency limits
- Failed job retry has exponential backoff

### Authentication

- All endpoints require valid JWT tokens
- Admin endpoints require elevated permissions
- Service API keys are environment-protected

## Testing

### Unit Tests

```bash
# Run notification system tests
npm test tests/notification.test.ts

# Run with coverage
npm run test:coverage
```

### Integration Tests

```bash
# Test with actual services (requires configuration)
npm run setup:notifications test
```

### Load Testing

For high-volume testing:

```typescript
// Send bulk notifications
const notifications = Array.from({ length: 1000 }, (_, i) => ({
    userId: `user-${i}`,
    type: NotificationType.TRANSACTION_CONFIRMATION,
    data: {
        /* ... */
    },
}));

await NotificationService.sendBulkNotifications(notifications);
```

## Troubleshooting

### Common Issues

#### Queue Connection Issues

```bash
# Check Redis connection
redis-cli ping

# Check Redis configuration
echo $REDIS_HOST
echo $REDIS_PORT
```

#### Service Integration Issues

```bash
# Test email service
curl -X POST "https://api.sendgrid.com/v3/mail/send" \
  -H "Authorization: Bearer $SENDGRID_API_KEY" \
  -H "Content-Type: application/json"

# Test Twilio service
curl -X POST "https://api.twilio.com/2010-04-01/Accounts/$TWILIO_ACCOUNT_SID/Messages.json" \
  -u "$TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN"
```

#### High Queue Volume

```typescript
// Monitor queue sizes
const stats = await QueueService.getQueueStats();
if (stats.waiting > 10000) {
    // Scale up processing or investigate bottlenecks
}
```

### Debug Mode

Enable debug logging:

```bash
LOG_LEVEL=debug npm run dev
```

### Support

For issues and support:

- Check the logs in `logs/` directory
- Monitor queue statistics
- Review notification analytics
- Contact the development team

## Roadmap

### Upcoming Features

- **WhatsApp Integration**: Business API integration
- **Slack/Discord**: Team notification channels
- **Advanced Analytics**: ML-powered insights
- **A/B Testing**: Template and timing optimization
- **Multi-language**: Internationalization support
- **Rich Media**: Image and video in notifications

### Performance Improvements

- **Horizontal Scaling**: Multi-instance queue processing
- **Caching**: Template and preference caching
- **Optimization**: Database query optimization
- **Monitoring**: Advanced APM integration

---

This comprehensive notification system provides a robust foundation for all notification needs in the ChainRemit platform, with excellent scalability, reliability, and maintainability.
