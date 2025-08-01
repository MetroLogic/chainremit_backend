import { Router } from 'express';
import { protect } from '../guard/protect.guard';
import { requireAdmin } from '../middleware/role.middleware';
import {
    sendNotification,
    sendBulkNotifications,
    getNotificationPreferences,
    updateNotificationPreferences,
    getNotificationHistory,
    getNotificationAnalytics,
    getNotificationTemplates,
    createNotificationTemplate,
    updateNotificationTemplate,
    getQueueStats,
    retryFailedJobs,
    cleanOldJobs,
    sendTransactionConfirmation,
    sendSecurityAlert,
} from '../controller/notification.controller';

const router = Router();

// Core notification endpoints
router.post('/send', protect, sendNotification);
router.post('/send-bulk', protect, requireAdmin, sendBulkNotifications);
router.get('/preferences', protect, getNotificationPreferences);
router.put('/preferences', protect, updateNotificationPreferences);
router.get('/history', protect, getNotificationHistory);

// Analytics endpoints (Admin only)
router.get('/analytics', protect, requireAdmin, getNotificationAnalytics);

// Template management endpoints (Admin only)
router.get('/templates', protect, requireAdmin, getNotificationTemplates);
router.post('/templates', protect, requireAdmin, createNotificationTemplate);
router.put('/templates/:id', protect, requireAdmin, updateNotificationTemplate);

// Queue management endpoints (Admin only)
router.get('/queue/stats', protect, requireAdmin, getQueueStats);
router.post('/queue/retry', protect, requireAdmin, retryFailedJobs);
router.post('/queue/clean', protect, requireAdmin, cleanOldJobs);

// Quick notification helpers
router.post('/transaction-confirmation', protect, sendTransactionConfirmation);
router.post('/security-alert', protect, sendSecurityAlert);

export default router;
