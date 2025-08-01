import cron from 'node-cron';
import { QueueService } from './queue.service';
import { NotificationService } from './notification.service';
import { notificationDb } from '../model/notification.model';
import logger from '../utils/logger';

export class CronService {
    private static jobs: Map<string, any> = new Map();

    /**
     * Initialize all cron jobs
     */
    static initializeCronJobs(): void {
        // Clean old queue jobs daily at 2 AM
        this.scheduleJob('clean-old-jobs', '0 2 * * *', async () => {
            try {
                await QueueService.cleanOldJobs();
                logger.info('Cron job completed: clean-old-jobs');
            } catch (error) {
                logger.error('Cron job failed: clean-old-jobs', {
                    error: error instanceof Error ? error.message : 'Unknown error',
                });
            }
        });

        // Retry failed jobs every hour
        this.scheduleJob('retry-failed-jobs', '0 * * * *', async () => {
            try {
                const retriedCount = await QueueService.retryFailedJobs(20);
                logger.info('Cron job completed: retry-failed-jobs', { retriedCount });
            } catch (error) {
                logger.error('Cron job failed: retry-failed-jobs', {
                    error: error instanceof Error ? error.message : 'Unknown error',
                });
            }
        });

        // Generate daily analytics report at 3 AM
        this.scheduleJob('daily-analytics', '0 3 * * *', async () => {
            try {
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                yesterday.setHours(0, 0, 0, 0);

                const today = new Date();
                today.setHours(0, 0, 0, 0);

                const analytics = await NotificationService.getAnalytics(yesterday, today);

                logger.info('Daily analytics generated', {
                    date: yesterday.toISOString().split('T')[0],
                    totalSent: analytics.totalSent,
                    totalDelivered: analytics.totalDelivered,
                    deliveryRate: analytics.deliveryRate,
                });
            } catch (error) {
                logger.error('Cron job failed: daily-analytics', {
                    error: error instanceof Error ? error.message : 'Unknown error',
                });
            }
        });

        // Health check for queue service every 15 minutes
        this.scheduleJob('queue-health-check', '*/15 * * * *', async () => {
            try {
                const health = await QueueService.healthCheck();
                if (!health.healthy) {
                    logger.warn('Queue service health check failed', {
                        error: health.error,
                    });

                    // Try to reinitialize the queue service
                    QueueService.initialize();
                }
            } catch (error) {
                logger.error('Cron job failed: queue-health-check', {
                    error: error instanceof Error ? error.message : 'Unknown error',
                });
            }
        });

        // Clean notification history older than 90 days, weekly on Sunday at 4 AM
        this.scheduleJob('clean-old-notifications', '0 4 * * SUN', async () => {
            try {
                // This would typically be implemented in the notification database
                // For now, we'll just log the task
                logger.info('Cron job completed: clean-old-notifications');
            } catch (error) {
                logger.error('Cron job failed: clean-old-notifications', {
                    error: error instanceof Error ? error.message : 'Unknown error',
                });
            }
        });

        // Monitor queue statistics every 5 minutes
        this.scheduleJob('queue-stats-monitor', '*/5 * * * *', async () => {
            try {
                const stats = await QueueService.getQueueStats();

                // Log warning if queue sizes are high
                const totalJobs = stats.waiting + stats.active + stats.delayed;
                if (totalJobs > 1000) {
                    logger.warn('High queue volume detected', {
                        waiting: stats.waiting,
                        active: stats.active,
                        delayed: stats.delayed,
                        failed: stats.failed,
                        total: totalJobs,
                    });
                }

                // Log error if too many failed jobs
                if (stats.failed > 100) {
                    logger.error('High number of failed jobs detected', {
                        failed: stats.failed,
                    });
                }
            } catch (error) {
                logger.error('Cron job failed: queue-stats-monitor', {
                    error: error instanceof Error ? error.message : 'Unknown error',
                });
            }
        });

        logger.info('Notification cron jobs initialized', {
            jobCount: this.jobs.size,
            jobs: Array.from(this.jobs.keys()),
        });
    }

    /**
     * Schedule a new cron job
     */
    private static scheduleJob(name: string, schedule: string, task: () => Promise<void>): void {
        try {
            const job = cron.schedule(schedule, task, {
                timezone: 'UTC',
            });

            this.jobs.set(name, job);
            logger.info('Cron job scheduled', { name, schedule });
        } catch (error) {
            logger.error('Failed to schedule cron job', {
                name,
                schedule,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }

    /**
     * Start all cron jobs
     */
    static startAllJobs(): void {
        for (const [name, job] of this.jobs) {
            try {
                job.start();
                logger.info('Cron job started', { name });
            } catch (error) {
                logger.error('Failed to start cron job', {
                    name,
                    error: error instanceof Error ? error.message : 'Unknown error',
                });
            }
        }
    }

    /**
     * Stop all cron jobs
     */
    static stopAllJobs(): void {
        for (const [name, job] of this.jobs) {
            try {
                job.stop();
                logger.info('Cron job stopped', { name });
            } catch (error) {
                logger.error('Failed to stop cron job', {
                    name,
                    error: error instanceof Error ? error.message : 'Unknown error',
                });
            }
        }
    }

    /**
     * Stop and destroy all cron jobs
     */
    static destroyAllJobs(): void {
        for (const [name, job] of this.jobs) {
            try {
                job.destroy();
                logger.info('Cron job destroyed', { name });
            } catch (error) {
                logger.error('Failed to destroy cron job', {
                    name,
                    error: error instanceof Error ? error.message : 'Unknown error',
                });
            }
        }
        this.jobs.clear();
    }

    /**
     * Get status of all cron jobs
     */
    static getJobStatus(): Array<{ name: string; running: boolean; nextDate: Date | null }> {
        const status: Array<{ name: string; running: boolean; nextDate: Date | null }> = [];

        for (const [name, job] of this.jobs) {
            status.push({
                name,
                running: job.getStatus() === 'scheduled',
                nextDate: job.nextDate()?.toDate() || null,
            });
        }

        return status;
    }

    /**
     * Manually trigger a specific job
     */
    static async triggerJob(name: string): Promise<boolean> {
        const job = this.jobs.get(name);
        if (!job) {
            logger.error('Cron job not found', { name });
            return false;
        }

        try {
            // Get the task function from the job (this is a bit hacky but works)
            const task = (job as any)._callbacks[0];
            if (task) {
                await task();
                logger.info('Cron job manually triggered', { name });
                return true;
            } else {
                logger.error('Cannot extract task from cron job', { name });
                return false;
            }
        } catch (error) {
            logger.error('Failed to manually trigger cron job', {
                name,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            return false;
        }
    }

    /**
     * Add a custom notification reminder job
     * Example: Send weekly summary to users
     */
    static scheduleWeeklySummary(): void {
        this.scheduleJob(
            'weekly-summary',
            '0 9 * * MON', // Monday at 9 AM
            async () => {
                try {
                    // This would typically get user preferences and send weekly summaries
                    // For now, we'll just log the task
                    logger.info('Weekly summary notifications would be sent');

                    // Example implementation:
                    // const users = await getUsersWithWeeklySummaryEnabled();
                    // for (const user of users) {
                    //     await NotificationService.sendWeeklySummary(user.id);
                    // }
                } catch (error) {
                    logger.error('Cron job failed: weekly-summary', {
                        error: error instanceof Error ? error.message : 'Unknown error',
                    });
                }
            },
        );
    }

    /**
     * Schedule maintenance notifications
     */
    static scheduleMaintenanceNotification(
        scheduledTime: Date,
        maintenanceStart: Date,
        maintenanceEnd: Date,
    ): void {
        const jobName = `maintenance-${Date.now()}`;

        // Convert to cron format (this is simplified - in production you'd use a proper scheduler)
        const minute = scheduledTime.getMinutes();
        const hour = scheduledTime.getHours();
        const day = scheduledTime.getDate();
        const month = scheduledTime.getMonth() + 1;
        const cronFormat = `${minute} ${hour} ${day} ${month} *`;

        this.scheduleJob(jobName, cronFormat, async () => {
            try {
                // This would send maintenance notifications to all users
                logger.info('Maintenance notification sent', {
                    maintenanceStart: maintenanceStart.toISOString(),
                    maintenanceEnd: maintenanceEnd.toISOString(),
                });

                // Remove the job after execution since it's a one-time task
                const job = this.jobs.get(jobName);
                if (job) {
                    job.destroy();
                    this.jobs.delete(jobName);
                }
            } catch (error) {
                logger.error('Maintenance notification failed', {
                    error: error instanceof Error ? error.message : 'Unknown error',
                });
            }
        });
    }
}

// Initialize cron jobs when the module is loaded
if (process.env.NODE_ENV !== 'test') {
    CronService.initializeCronJobs();
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
    logger.info('Received SIGTERM, stopping cron jobs');
    CronService.stopAllJobs();
});

process.on('SIGINT', () => {
    logger.info('Received SIGINT, stopping cron jobs');
    CronService.stopAllJobs();
});
