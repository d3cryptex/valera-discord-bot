import { RedisService } from '../services/cache/RedisService';
import { logger } from './logger';

export class CacheManager {
    private redis: RedisService;
    private defaultTTL: number = 300; // 5 минут

    constructor(redis: RedisService) {
        this.redis = redis;
    }

    async get<T>(key: string): Promise<T | null> {
        try {
            const data = await this.redis.get(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            logger.error('Cache get error:', error);
            return null;
        }
    }

    async set(key: string, value: any, ttl?: number): Promise<void> {
        try {
            const serialized = JSON.stringify(value);
            await this.redis.set(key, serialized, ttl || this.defaultTTL);
        } catch (error) {
            logger.error('Cache set error:', error);
        }
    }

    async del(key: string): Promise<void> {
        try {
            await this.redis.del(key);
        } catch (error) {
            logger.error('Cache delete error:', error);
        }
    }

    async exists(key: string): Promise<boolean> {
        try {
            return await this.redis.exists(key);
        } catch (error) {
            logger.error('Cache exists error:', error);
            return false;
        }
    }

    // Специализированные методы для кэширования пользователей
    async cacheUser(userId: string, userData: any, ttl: number = 600): Promise<void> {
        await this.set(`user:${userId}`, userData, ttl);
    }

    async getCachedUser(userId: string): Promise<any> {
        return await this.get(`user:${userId}`);
    }

    async invalidateUser(userId: string): Promise<void> {
        await this.del(`user:${userId}`);
    }

    // Кэширование лидерборда
    async cacheLeaderboard(guildId: string, leaderboard: any[], ttl: number = 300): Promise<void> {
        await this.set(`leaderboard:${guildId}`, leaderboard, ttl);
    }

    async getCachedLeaderboard(guildId: string): Promise<any[] | null> {
        return await this.get(`leaderboard:${guildId}`);
    }

    // Кэширование настроек гильдии
    async cacheGuildSettings(guildId: string, settings: any, ttl: number = 1800): Promise<void> {
        await this.set(`guild:${guildId}`, settings, ttl);
    }

    async getCachedGuildSettings(guildId: string): Promise<any> {
        return await this.get(`guild:${guildId}`);
    }
}