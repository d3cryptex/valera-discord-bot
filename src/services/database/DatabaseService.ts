import { Sequelize, DataTypes, Model, QueryTypes, Op } from 'sequelize';
import mysql from 'mysql2/promise';
import { logger } from '../../utils/logger';

class User extends Model {
    declare id: string;
    declare username: string;
    declare xp: number;
    declare level: number;
    declare coins: number;
    declare voice_time: number;
    declare streak: number;
    declare last_streak_date: string;
    declare battle_pass_level: number; 
    declare battle_pass_exp: number;   
    declare battlepass_daily_status: string;
    declare battlepass_weekly_status: string;
    declare battlepass_progress_counters_daily: string;
    declare battlepass_progress_counters_weekly: string;
}

class MarkovBigram extends Model {
    declare id: number;
    declare guild_id: string;
    declare prev_token: string;
    declare curr_token: string;
    declare next_token: string;
    declare frequency: number;
}

class BotSettings extends Model {
    declare id: number;
    declare guild_id: string;
    declare setting_key: string;
    declare setting_value: string;
}

class ShopItems extends Model {
    declare id: number;
    declare guild_id: string;
    declare name: string;
    declare description: string | null;
    declare price: number;
    declare role_id: string | null;
    declare is_active: boolean;
}

class UserPurchases extends Model {
    declare id: number;
    declare user_id: string;
    declare guild_id: string;
    declare item_id: number;
}

class MemeImage extends Model {
    declare id: number;
    declare guild_id: string;
    declare channel_id: string;
    declare message_id: string;
    declare user_id: string;
    declare file_path: string;
    declare original_url: string;
    declare created_at: Date;
}

export class DatabaseService {
    private sequelize: Sequelize | null = null;
    public User: typeof User | null = null;
    public MarkovBigram: typeof MarkovBigram | null = null;
    public BotSettings: typeof BotSettings | null = null;
    public ShopItems: typeof ShopItems | null = null;
    public UserPurchases: typeof UserPurchases | null = null;
    public MemeImage: typeof MemeImage | null = null;

    async connect(): Promise<void> {
        try {
            const host = process.env.DB_HOST;
            const port = parseInt(process.env.DB_PORT || '3306', 10);
            const user = process.env.DB_USER;
            const password = process.env.DB_PASSWORD || '';
            const database = process.env.DB_NAME;

            if (!host) throw new Error('DB_HOST is not defined');
            if (!user) throw new Error('DB_USER is not defined');
            if (!database) throw new Error('DB_NAME is not defined');

            // Создаем БД если не существует
            const connection = await mysql.createConnection({ host, port, user, password });
            await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\`;`);
            await connection.end();

            // Подключаемся к БД через Sequelize
            this.sequelize = new Sequelize(database, user, password, {
                host,
                port,
                dialect: 'mysql',
                dialectOptions: {
                    charset: 'utf8mb4',
                },
                define: { 
                    charset: 'utf8mb4',
                    collate: 'utf8mb4_unicode_ci',
                },
                pool: { // Добавьте настройки пула соединений
                    max: 5,
                    min: 0,
                    acquire: 30000,
                    idle: 10000
                },
                logging: false, // отключить логи SQL
            });

            this.User = User.init({
                id: {
                    type: DataTypes.STRING,
                    primaryKey: true,
                },
                username: {
                    type: DataTypes.STRING,
                    allowNull: false,
                },
                xp: {
                    type: DataTypes.INTEGER,
                    defaultValue: 0,
                },
                level: {
                    type: DataTypes.INTEGER,
                    defaultValue: 1,
                },
                coins: {
                    type: DataTypes.INTEGER,
                    defaultValue: 0,
                },
                voice_time: { 
                    type: DataTypes.INTEGER,
                    defaultValue: 0,
                },
                streak: {
                    type: DataTypes.INTEGER,
                    defaultValue: 0,
                    allowNull: false,
                },
                last_streak_date: {
                    type: DataTypes.STRING(16),
                    allowNull: true,
                },
                battle_pass_level: {
                    type: DataTypes.INTEGER,
                    defaultValue: 1,
                    allowNull: false,
                },
                battle_pass_exp: {
                    type: DataTypes.INTEGER,
                    defaultValue: 0,
                    allowNull: false,
                },
                battlepass_daily_status: {
                    type: DataTypes.TEXT,
                    allowNull: false,
                    defaultValue: '[]', 
                },
                battlepass_weekly_status: {
                    type: DataTypes.TEXT,
                    allowNull: false,
                    defaultValue: '[]', 
                },
                battlepass_progress_counters_daily: {
                    type: DataTypes.TEXT,
                    allowNull: false,
                    defaultValue: '{}', 
                },
                battlepass_progress_counters_weekly: {
                    type: DataTypes.TEXT,
                    allowNull: false,
                    defaultValue: '{}', 
                },
            }, {
                sequelize: this.sequelize,
                tableName: 'users',
                timestamps: true,
            });

            this.MarkovBigram = MarkovBigram.init({
                id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
                guild_id: { type: DataTypes.STRING(32), allowNull: false },
                prev_token: { type: DataTypes.STRING(64), allowNull: false },
                curr_token: { type: DataTypes.STRING(64), allowNull: false },
                next_token: { type: DataTypes.STRING(64), allowNull: false },
                frequency: { type: DataTypes.INTEGER, defaultValue: 1 },
            }, {
                sequelize: this.sequelize!,
                tableName: 'markov_bigrams',
                timestamps: false,
                indexes: [
                    {
                        name: 'uniq_guild_prev_curr_next',
                        unique: true,
                        fields: ['guild_id', 'prev_token', 'curr_token', 'next_token']
                    }
                ]
            });

            this.BotSettings = BotSettings.init({
                id: {
                    type: DataTypes.INTEGER,
                    primaryKey: true,
                    autoIncrement: true,
                },
                guild_id: {
                    type: DataTypes.STRING,
                    allowNull: false,
                },
                setting_key: {
                    type: DataTypes.STRING,
                    allowNull: false,
                },
                setting_value: {
                    type: DataTypes.TEXT, // Для JSON строки
                    allowNull: false,
                },
            }, {
                sequelize: this.sequelize,
                tableName: 'bot_settings',
                timestamps: true,
                indexes: [
                    {
                        unique: true,
                        fields: ['guild_id', 'setting_key']
                    }
                ],
            });

            this.ShopItems = ShopItems.init({
                id: {
                    type: DataTypes.INTEGER,
                    primaryKey: true,
                    autoIncrement: true,
                },
                guild_id: {
                    type: DataTypes.STRING,
                    allowNull: false,
                },
                name: {
                    type: DataTypes.STRING,
                    allowNull: false,
                },
                description: {
                    type: DataTypes.TEXT,
                    allowNull: true,
                },
                price: {
                    type: DataTypes.INTEGER,
                    allowNull: false,
                },
                role_id: {
                    type: DataTypes.STRING,
                    allowNull: true,
                },
                is_active: {
                    type: DataTypes.BOOLEAN,
                    defaultValue: true,
                },
            }, {
                sequelize: this.sequelize,
                tableName: 'shop_items',
                timestamps: true,
            });

            this.UserPurchases = UserPurchases.init({
                id: {
                    type: DataTypes.INTEGER,
                    primaryKey: true,
                    autoIncrement: true,
                },
                user_id: {
                    type: DataTypes.STRING,
                    allowNull: false,
                },
                guild_id: {
                    type: DataTypes.STRING,
                    allowNull: false,
                },
                item_id: {
                    type: DataTypes.INTEGER,
                    allowNull: false,
                },
            }, {
                sequelize: this.sequelize,
                tableName: 'user_purchases',
                timestamps: true,
                indexes: [
                    {
                        unique: true,
                        fields: ['user_id', 'item_id']
                    }
                ],
            });

            this.MemeImage = MemeImage.init({
                id: {
                  type: DataTypes.INTEGER,
                  primaryKey: true,
                  autoIncrement: true,
                },
                guild_id: { type: DataTypes.STRING, allowNull: false },
                channel_id: { type: DataTypes.STRING, allowNull: false },
                message_id: { type: DataTypes.STRING, allowNull: false },
                user_id: { type: DataTypes.STRING, allowNull: false },
                file_path: { type: DataTypes.STRING, allowNull: false },
                original_url: { type: DataTypes.STRING, allowNull: false },
                created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
              }, {
                sequelize: this.sequelize,
                tableName: 'meme_images',
                timestamps: false
            });

            // Автоматически создаем таблицы
            await this.sequelize.sync();

            logger.info('Connected to MySQL database and tables synced');
        } catch (error) {
            logger.error('Failed to connect to database:', error);
            throw error;
        }
    }

    async disconnect(): Promise<void> {
        if (this.sequelize) {
            await this.sequelize.close();
            this.sequelize = null;
            logger.info('Disconnected from database');
        }
    }

    // Users
    async getUser(userId: string): Promise<any> {
        if (!this.User) throw new Error('Database not connected');
        return await this.User.findByPk(userId);
    }

    async createUser(userId: string, username: string): Promise<void> {
        if (!this.User) throw new Error('Database not connected');
        await this.User.upsert({ id: userId, username });
    }

    async updateUserXP(userId: string, xp: number): Promise<void> {
        if (!this.User) throw new Error('Database not connected');
        await this.User.increment('xp', { by: xp, where: { id: userId } });
    }

    async setUserXP(userId: string, xp: number): Promise<void> {
        if (!this.User) throw new Error('Database not connected');
        await this.User.update({ xp }, { where: { id: userId } });
    }

    async updateUserCoins(userId: string, coins: number): Promise<void> {
        if (!this.User) throw new Error('Database not connected');
        await this.User.increment('coins', { by: coins, where: { id: userId } });
    }

    async setUserCoins(userId: string, coins: number): Promise<void> {
        if (!this.User) throw new Error('Database not connected');
        await this.User.update({ coins }, { where: { id: userId } });
    }

    async updateUserLevel(userId: string, level: number, coins: number): Promise<void> {
        if (!this.User) throw new Error('Database not connected');
        await this.User.update(
            { level },
            { where: { id: userId } }
        );
        await this.User.increment('coins', { by: coins, where: { id: userId } });
    }

    // Markov Chain
    async addMarkovBigram(guildId: string, prev: string, curr: string, next: string) {
        if (!this.MarkovBigram) throw new Error('Database not connected');
        try {
            const existing = await this.MarkovBigram.findOne({
                where: { guild_id: guildId, prev_token: prev, curr_token: curr, next_token: next }
            });
            if (existing) {
                await existing.increment('frequency');
            } else {
                await this.MarkovBigram.create({
                    guild_id: guildId,
                    prev_token: prev,
                    curr_token: curr,
                    next_token: next,
                    frequency: 1,
                });
            }
        } catch (error) {
            logger.error('Error in addMarkovBigram:', error);
        }
    }

    async getBigramStartCandidates(guildId: string): Promise<[string, string][]> {
        if (!this.MarkovBigram) throw new Error('Database not connected');
        const rows = await this.MarkovBigram.findAll({
            where: { guild_id: guildId },
            attributes: ['prev_token', 'curr_token'],
            group: ['prev_token', 'curr_token'],
            raw: true
        });
        // Явно проверяем и кастуем к tuple только если обе строки есть
        return rows
            .filter((row: any) => typeof row.prev_token === "string" && typeof row.curr_token === "string")
            .map((row: any) => [row.prev_token as string, row.curr_token as string]);
    }

    async getMarkovBigramOptions(
        guildId: string,
        prev: string,
        curr: string
    ): Promise<{ [next: string]: number }> {
        if (!this.MarkovBigram) throw new Error('Database not connected');
        const rows = await this.MarkovBigram.findAll({
            where: { guild_id: guildId, prev_token: prev, curr_token: curr },
            attributes: ['next_token', 'frequency'], raw: true
        });
        const options: { [next: string]: number } = {};
        for (const row of rows) {
            if (row.next_token) options[row.next_token] = row.frequency;
        }
        return options;
    }

    async saveImageOrGif(meta: {
        guildId: string, channelId: string, messageId: string, userId: string,
        filePath: string, originalUrl: string
      }) {
        if (!this.MemeImage) throw new Error('Database not connected');
        await this.MemeImage.create({
          guild_id: meta.guildId,
          channel_id: meta.channelId,
          message_id: meta.messageId,
          user_id: meta.userId,
          file_path: meta.filePath,
          original_url: meta.originalUrl,
          created_at: new Date()
        });
    }

    async getRandomImage(guildId: string, count: number): Promise<string[]> {
        if (!this.MemeImage) throw new Error('Database not connected');
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
        const images = await this.MemeImage.findAll({
            where: {
                guild_id: guildId,
                created_at: { [Op.gte]: weekAgo }
            },
            order: this.sequelize!.random(),
            raw: true
        });
    
        const allowedExts = ['.png', '.jpg', '.jpeg', '.webp'];
    
        return images
            .map(img => img.file_path)
            .filter(fp => {
                if (!fp) return false;
                const ext = (fp.match(/\.[^.]+$/)?.[0] || '').toLowerCase();
                return allowedExts.includes(ext);
            })
            .slice(0, count);
    }

    async getRandomGif(guildId: string): Promise<string | null> {
        if (!this.MemeImage || !this.sequelize) throw new Error('Database not connected');
        
        const gifs = await this.MemeImage.findAll({
            where: {
                guild_id: guildId,
                original_url: { [Op.like]: '%.gif' }
            },
            order: this.sequelize.random(),
            limit: 1,
            raw: true
        });
    
        return gifs.length > 0 ? gifs[0]!.original_url : null;
    }

    async countMarkovBigrams(guildId: string): Promise<number> {
        if (!this.sequelize) throw new Error('Database not connected');
        
        const result = await this.sequelize.query<{ count: number }>(
            'SELECT COUNT(*) as count FROM markov_bigrams WHERE guild_id = ?',
            {
                replacements: [guildId],
                type: QueryTypes.SELECT
            }
        );
        
        return (result[0]?.count as number) || 0;
    }
    
    async deleteOldestMarkovBigrams(guildId: string, count: number): Promise<void> {
        if (!this.sequelize) throw new Error('Database not connected');
        
        await this.sequelize.query(
            `DELETE FROM markov_bigrams 
             WHERE guild_id = ? 
             ORDER BY id ASC 
             LIMIT ?`,
            {
                replacements: [guildId, count],
                type: QueryTypes.DELETE
            }
        );
    }

    public async rawQuery<T = any>(sql: string, params?: any[]): Promise<T[]> {
        if (!this.sequelize) throw new Error('DB not connected');
        const options: any = { type: QueryTypes.SELECT };
        if (params) options.replacements = params;
        const [rows] = await this.sequelize.query(sql, options);
        // Гарантируем что rows всегда массив, даже если undefined
        return (rows ?? []) as T[];
    }
}