import cron from 'node-cron';
import { DatabaseService } from '../database/DatabaseService';
import { RedisService } from '../cache/RedisService';
import { SettingsService } from '../settings/SettingsService';
import { GuildSettings } from '../settings/SettingsService';
import { logger } from '../../utils/logger';

export class SchedulerService {
    private database: DatabaseService;
    private redis: RedisService;
    private settingsService: SettingsService;

    private tasks: Map<string, cron.ScheduledTask> = new Map();

    constructor(database: DatabaseService, redis: RedisService, settingsService: SettingsService) {
        this.database = database;
        this.redis = redis;
        this.settingsService = settingsService;
    }

    start(): void {
        logger.info('Initializing Scheduler Service...');

        // Очистка старых данных каждый день в 02:00
        this.scheduleCleanup();
        this.scheduleBackup();
        this.scheduleStatisticsUpdate();

        logger.info('Scheduler service started with dynamic settings support');
    }

    private scheduleCleanup(): void {
        const task = cron.schedule('0 2 * * *', async () => {
            const settings = await this.getGlobalFallbackSettings();

            if (!settings.moderation.enabled && !settings.moderation.spam_protection) {
                logger.debug('Cleanup skipped: moderation features disabled in settings');
                return;
            }

            await this.cleanupOldData();
        });

        this.tasks.set('cleanup', task);
    }

    private scheduleBackup(): void {
        const task = cron.schedule('0 3 * * 0', async () => {
            const settings = await this.getGlobalFallbackSettings();

            if (!settings.economy.shop_enabled) { // Пример: используем shop_enabled как флаг активности бэкапа
                logger.debug('Markov backup skipped: backups disabled via settings');
                return;
            }

            await this.backupMarkovData();
        });

        this.tasks.set('backup', task);
    }

    private scheduleStatisticsUpdate(): void {
        const task = cron.schedule('0 * * * *', async () => {
            await this.updateStatistics();
        });

        this.tasks.set('statistics', task);
    }

    private async getGlobalFallbackSettings(): Promise<GuildSettings> {
        try {
            // Попробуем взять настройки для одной из гильдий (для глобальных задач)
            const guildId = await this.getAnyGuildId();
            if (guildId) {
                return await this.settingsService.getGuildSettings(guildId);
            }
        } catch (error) {
            logger.warn('Could not load guild settings for scheduler, using defaults', error);
        }

        // Возвращаем дефолтные настройки из SettingsService
        return (this.settingsService as any).defaultSettings; // Доступ к приватному полю
    }

    private async getAnyGuildId(): Promise<string | null> {
        const result: any[] = await this.database.rawQuery(
            'SELECT DISTINCT guild_id FROM bot_settings LIMIT 1'
        );
        return result[0] ? result[0].guild_id : null;
    }

    private async cleanupOldData(): Promise<void> {
        try {
            logger.info('Starting cleanup of old data...');
    
            // Удаляем старые записи голосового времени (старше 30 дней)
            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                .toISOString().split('T')[0];
            const sql = 'DELETE FROM voice_activity WHERE joined_at < ?';
            await this.database.rawQuery(sql, [thirtyDaysAgo]);
    
            // Очистка кэша (пример)
            // await this.redis.delPattern('voice_stats:*'); // если есть RedisService.delPattern
    
            logger.info('Cleanup completed');
        } catch (error) {
            logger.error('Error during cleanup:', error);
        }
    }

    private async backupMarkovData(): Promise<void> {
        try {
            logger.info('Starting Markov data backup...');
    
            const sql = 'SELECT * FROM markov_chains WHERE created_at > DATE_SUB(NOW(), INTERVAL 7 DAY)';
            const recentData: any[] = await this.database.rawQuery(sql);
    
            await this.redis.set('markov_backup', JSON.stringify(recentData), 7 * 24 * 60 * 60); // 7 дней
    
            logger.info(`Backed up ${recentData.length} Markov entries`);
        } catch (error) {
            logger.error('Error during Markov backup:', error);
        }
    }    

    private async updateStatistics(): Promise<void> {
        try {
            const [totalUsers, totalGuilds, totalMessages] = await Promise.all([
                this.database.rawQuery('SELECT COUNT(*) as count FROM users'),
                this.database.rawQuery('SELECT COUNT(*) as count FROM guilds'),
                this.database.rawQuery('SELECT COUNT(*) as count FROM markov_chains')
            ]);
            const stats = {
                totalUsers: totalUsers[0]?.count || 0,
                totalGuilds: totalGuilds[0]?.count || 0,
                totalMessages: totalMessages[0]?.count || 0,
                updated: new Date().toISOString()
            };
    
            await this.redis.set('bot_statistics', JSON.stringify(stats), 3600); // 1 час
        } catch (error) {
            logger.error('Error updating statistics:', error);
        }
    }

    stop(): void {
        for (const [name, task] of this.tasks) {
            task.stop();
            logger.debug(`Scheduled task stopped: ${name}`);
        }
        this.tasks.clear();
    }

    restart(): void {
        this.stop();
        this.start();
    }
}