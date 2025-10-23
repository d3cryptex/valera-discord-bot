"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchedulerService = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const logger_1 = require("../../utils/logger");
class SchedulerService {
    database;
    redis;
    settingsService;
    tasks = new Map();
    constructor(database, redis, settingsService) {
        this.database = database;
        this.redis = redis;
        this.settingsService = settingsService;
    }
    start() {
        logger_1.logger.info('Initializing Scheduler Service...');
        // Очистка старых данных каждый день в 02:00
        this.scheduleCleanup();
        this.scheduleBackup();
        this.scheduleStatisticsUpdate();
        logger_1.logger.info('Scheduler service started with dynamic settings support');
    }
    scheduleCleanup() {
        const task = node_cron_1.default.schedule('0 2 * * *', async () => {
            const settings = await this.getGlobalFallbackSettings();
            if (!settings.moderation.enabled && !settings.moderation.spam_protection) {
                logger_1.logger.debug('Cleanup skipped: moderation features disabled in settings');
                return;
            }
            await this.cleanupOldData();
        });
        this.tasks.set('cleanup', task);
    }
    scheduleBackup() {
        const task = node_cron_1.default.schedule('0 3 * * 0', async () => {
            const settings = await this.getGlobalFallbackSettings();
            if (!settings.economy.shop_enabled) { // Пример: используем shop_enabled как флаг активности бэкапа
                logger_1.logger.debug('Markov backup skipped: backups disabled via settings');
                return;
            }
            await this.backupMarkovData();
        });
        this.tasks.set('backup', task);
    }
    scheduleStatisticsUpdate() {
        const task = node_cron_1.default.schedule('0 * * * *', async () => {
            await this.updateStatistics();
        });
        this.tasks.set('statistics', task);
    }
    async getGlobalFallbackSettings() {
        try {
            // Попробуем взять настройки для одной из гильдий (для глобальных задач)
            const guildId = await this.getAnyGuildId();
            if (guildId) {
                return await this.settingsService.getGuildSettings(guildId);
            }
        }
        catch (error) {
            logger_1.logger.warn('Could not load guild settings for scheduler, using defaults', error);
        }
        // Возвращаем дефолтные настройки из SettingsService
        return this.settingsService.defaultSettings; // Доступ к приватному полю
    }
    async getAnyGuildId() {
        const result = await this.database.rawQuery('SELECT DISTINCT guild_id FROM bot_settings LIMIT 1');
        return result[0] ? result[0].guild_id : null;
    }
    async cleanupOldData() {
        try {
            logger_1.logger.info('Starting cleanup of old data...');
            // Удаляем старые записи голосового времени (старше 30 дней)
            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                .toISOString().split('T')[0];
            const sql = 'DELETE FROM voice_activity WHERE joined_at < ?';
            await this.database.rawQuery(sql, [thirtyDaysAgo]);
            // Очистка кэша (пример)
            // await this.redis.delPattern('voice_stats:*'); // если есть RedisService.delPattern
            logger_1.logger.info('Cleanup completed');
        }
        catch (error) {
            logger_1.logger.error('Error during cleanup:', error);
        }
    }
    async backupMarkovData() {
        try {
            logger_1.logger.info('Starting Markov data backup...');
            const sql = 'SELECT * FROM markov_chains WHERE created_at > DATE_SUB(NOW(), INTERVAL 7 DAY)';
            const recentData = await this.database.rawQuery(sql);
            await this.redis.set('markov_backup', JSON.stringify(recentData), 7 * 24 * 60 * 60); // 7 дней
            logger_1.logger.info(`Backed up ${recentData.length} Markov entries`);
        }
        catch (error) {
            logger_1.logger.error('Error during Markov backup:', error);
        }
    }
    async updateStatistics() {
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
        }
        catch (error) {
            logger_1.logger.error('Error updating statistics:', error);
        }
    }
    stop() {
        for (const [name, task] of this.tasks) {
            task.stop();
            logger_1.logger.debug(`Scheduled task stopped: ${name}`);
        }
        this.tasks.clear();
    }
    restart() {
        this.stop();
        this.start();
    }
}
exports.SchedulerService = SchedulerService;
//# sourceMappingURL=SchedulerService.js.map