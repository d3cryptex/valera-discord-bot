"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisService = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const logger_1 = require("../../utils/logger");
class RedisService {
    client = null;
    async connect() {
        try {
            const host = process.env.REDIS_HOST;
            const port = parseInt(process.env.REDIS_PORT || '6379', 10);
            const password = process.env.REDIS_PASSWORD;
            if (!host) {
                throw new Error('REDIS_HOST is not defined');
            }
            const config = {
                host,
                port,
                retryStrategy: (times) => {
                    const delay = Math.min(times * 50, 2000);
                    return delay;
                },
                maxRetriesPerRequest: 3,
                connectTimeout: 10000,
            };
            if (password) {
                config.password = password;
            }
            this.client = new ioredis_1.default(config);
            this.client.on('error', (error) => {
                logger_1.logger.error('Redis error:', error);
            });
            this.client.on('connect', () => {
                logger_1.logger.info('Connected to Redis');
            });
        }
        catch (error) {
            logger_1.logger.error('Failed to connect to Redis:', error);
            throw error;
        }
    }
    async disconnect() {
        if (this.client) {
            await this.client.quit();
            this.client = null;
            logger_1.logger.info('Disconnected from Redis');
        }
    }
    async set(key, value, ttl) {
        if (!this.client)
            throw new Error('Redis not connected');
        if (ttl) {
            await this.client.setex(key, ttl, value);
        }
        else {
            await this.client.set(key, value);
        }
    }
    async get(key) {
        if (!this.client)
            throw new Error('Redis not connected');
        return await this.client.get(key);
    }
    async del(key) {
        if (!this.client)
            throw new Error('Redis not connected');
        await this.client.del(key);
    }
    async exists(key) {
        if (!this.client)
            throw new Error('Redis not connected');
        const result = await this.client.exists(key);
        return result === 1;
    }
}
exports.RedisService = RedisService;
//# sourceMappingURL=RedisService.js.map