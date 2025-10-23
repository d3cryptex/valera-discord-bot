import Redis, { RedisOptions } from 'ioredis';
import { logger } from '../../utils/logger';

export class RedisService {
    private client: Redis | null = null;

    async connect(): Promise<void> {
        try {
            const host = process.env.REDIS_HOST;
            const port = parseInt(process.env.REDIS_PORT || '6379', 10);
            const password = process.env.REDIS_PASSWORD;

            if (!host) {
                throw new Error('REDIS_HOST is not defined');
            }

            const config: RedisOptions = {
                host,
                port,
                retryStrategy: (times: number) => {  // ✅ Указали тип `times: number`
                    const delay = Math.min(times * 50, 2000);
                    return delay;
                },
                maxRetriesPerRequest: 3,
                connectTimeout: 10000,
            };

            if (password) {
                config.password = password;
            }

            this.client = new Redis(config);

            this.client.on('error', (error) => {
                logger.error('Redis error:', error);
            });

            this.client.on('connect', () => {
                logger.info('Connected to Redis');
            });
        } catch (error) {
            logger.error('Failed to connect to Redis:', error);
            throw error;
        }
    }

    async disconnect(): Promise<void> {
        if (this.client) {
            await this.client.quit();
            this.client = null;
            logger.info('Disconnected from Redis');
        }
    }

    async set(key: string, value: string, ttl?: number): Promise<void> {
        if (!this.client) throw new Error('Redis not connected');
        if (ttl) {
            await this.client.setex(key, ttl, value);
        } else {
            await this.client.set(key, value);
        }
    }

    async get(key: string): Promise<string | null> {
        if (!this.client) throw new Error('Redis not connected');
        return await this.client.get(key);
    }

    async del(key: string): Promise<void> {
        if (!this.client) throw new Error('Redis not connected');
        await this.client.del(key);
    }

    async exists(key: string): Promise<boolean> {
        if (!this.client) throw new Error('Redis not connected');
        const result = await this.client.exists(key);
        return result === 1;
    }
}