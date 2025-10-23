"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheManager = void 0;
const logger_1 = require("./logger");
class CacheManager {
    redis;
    defaultTTL = 300; // 5 минут
    constructor(redis) {
        this.redis = redis;
    }
    async get(key) {
        try {
            const data = await this.redis.get(key);
            return data ? JSON.parse(data) : null;
        }
        catch (error) {
            logger_1.logger.error('Cache get error:', error);
            return null;
        }
    }
    async set(key, value, ttl) {
        try {
            const serialized = JSON.stringify(value);
            await this.redis.set(key, serialized, ttl || this.defaultTTL);
        }
        catch (error) {
            logger_1.logger.error('Cache set error:', error);
        }
    }
    async del(key) {
        try {
            await this.redis.del(key);
        }
        catch (error) {
            logger_1.logger.error('Cache delete error:', error);
        }
    }
    async exists(key) {
        try {
            return await this.redis.exists(key);
        }
        catch (error) {
            logger_1.logger.error('Cache exists error:', error);
            return false;
        }
    }
    // Специализированные методы для кэширования пользователей
    async cacheUser(userId, userData, ttl = 600) {
        await this.set(`user:${userId}`, userData, ttl);
    }
    async getCachedUser(userId) {
        return await this.get(`user:${userId}`);
    }
    async invalidateUser(userId) {
        await this.del(`user:${userId}`);
    }
    // Кэширование лидерборда
    async cacheLeaderboard(guildId, leaderboard, ttl = 300) {
        await this.set(`leaderboard:${guildId}`, leaderboard, ttl);
    }
    async getCachedLeaderboard(guildId) {
        return await this.get(`leaderboard:${guildId}`);
    }
    // Кэширование настроек гильдии
    async cacheGuildSettings(guildId, settings, ttl = 1800) {
        await this.set(`guild:${guildId}`, settings, ttl);
    }
    async getCachedGuildSettings(guildId) {
        return await this.get(`guild:${guildId}`);
    }
}
exports.CacheManager = CacheManager;
//# sourceMappingURL=cache.js.map