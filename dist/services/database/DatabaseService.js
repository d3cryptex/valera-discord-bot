"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseService = void 0;
const sequelize_1 = require("sequelize");
const promise_1 = __importDefault(require("mysql2/promise"));
const logger_1 = require("../../utils/logger");
class User extends sequelize_1.Model {
}
class MarkovBigram extends sequelize_1.Model {
}
class BotSettings extends sequelize_1.Model {
}
class ShopItems extends sequelize_1.Model {
}
class UserPurchases extends sequelize_1.Model {
}
class MemeImage extends sequelize_1.Model {
}
class DatabaseService {
    sequelize = null;
    User = null;
    MarkovBigram = null;
    BotSettings = null;
    ShopItems = null;
    UserPurchases = null;
    MemeImage = null;
    async connect() {
        try {
            const host = process.env.DB_HOST;
            const port = parseInt(process.env.DB_PORT || '3306', 10);
            const user = process.env.DB_USER;
            const password = process.env.DB_PASSWORD || '';
            const database = process.env.DB_NAME;
            if (!host)
                throw new Error('DB_HOST is not defined');
            if (!user)
                throw new Error('DB_USER is not defined');
            if (!database)
                throw new Error('DB_NAME is not defined');
            // Создаем БД если не существует
            const connection = await promise_1.default.createConnection({ host, port, user, password });
            await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\`;`);
            await connection.end();
            // Подключаемся к БД через Sequelize
            this.sequelize = new sequelize_1.Sequelize(database, user, password, {
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
                pool: {
                    max: 5,
                    min: 0,
                    acquire: 30000,
                    idle: 10000
                },
                logging: false, // отключить логи SQL
            });
            this.User = User.init({
                id: {
                    type: sequelize_1.DataTypes.STRING,
                    primaryKey: true,
                },
                username: {
                    type: sequelize_1.DataTypes.STRING,
                    allowNull: false,
                },
                xp: {
                    type: sequelize_1.DataTypes.INTEGER,
                    defaultValue: 0,
                },
                level: {
                    type: sequelize_1.DataTypes.INTEGER,
                    defaultValue: 1,
                },
                coins: {
                    type: sequelize_1.DataTypes.INTEGER,
                    defaultValue: 0,
                },
                voice_time: {
                    type: sequelize_1.DataTypes.INTEGER,
                    defaultValue: 0,
                },
                streak: {
                    type: sequelize_1.DataTypes.INTEGER,
                    defaultValue: 0,
                    allowNull: false,
                },
                last_streak_date: {
                    type: sequelize_1.DataTypes.STRING(16),
                    allowNull: true,
                },
                battle_pass_level: {
                    type: sequelize_1.DataTypes.INTEGER,
                    defaultValue: 1,
                    allowNull: false,
                },
                battle_pass_exp: {
                    type: sequelize_1.DataTypes.INTEGER,
                    defaultValue: 0,
                    allowNull: false,
                },
                battlepass_daily_status: {
                    type: sequelize_1.DataTypes.TEXT,
                    allowNull: false,
                    defaultValue: '[]',
                },
                battlepass_weekly_status: {
                    type: sequelize_1.DataTypes.TEXT,
                    allowNull: false,
                    defaultValue: '[]',
                },
                battlepass_progress_counters_daily: {
                    type: sequelize_1.DataTypes.TEXT,
                    allowNull: false,
                    defaultValue: '{}',
                },
                battlepass_progress_counters_weekly: {
                    type: sequelize_1.DataTypes.TEXT,
                    allowNull: false,
                    defaultValue: '{}',
                },
            }, {
                sequelize: this.sequelize,
                tableName: 'users',
                timestamps: true,
            });
            this.MarkovBigram = MarkovBigram.init({
                id: { type: sequelize_1.DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
                guild_id: { type: sequelize_1.DataTypes.STRING(32), allowNull: false },
                prev_token: { type: sequelize_1.DataTypes.STRING(64), allowNull: false },
                curr_token: { type: sequelize_1.DataTypes.STRING(64), allowNull: false },
                next_token: { type: sequelize_1.DataTypes.STRING(64), allowNull: false },
                frequency: { type: sequelize_1.DataTypes.INTEGER, defaultValue: 1 },
            }, {
                sequelize: this.sequelize,
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
                    type: sequelize_1.DataTypes.INTEGER,
                    primaryKey: true,
                    autoIncrement: true,
                },
                guild_id: {
                    type: sequelize_1.DataTypes.STRING,
                    allowNull: false,
                },
                setting_key: {
                    type: sequelize_1.DataTypes.STRING,
                    allowNull: false,
                },
                setting_value: {
                    type: sequelize_1.DataTypes.TEXT, // Для JSON строки
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
                    type: sequelize_1.DataTypes.INTEGER,
                    primaryKey: true,
                    autoIncrement: true,
                },
                guild_id: {
                    type: sequelize_1.DataTypes.STRING,
                    allowNull: false,
                },
                name: {
                    type: sequelize_1.DataTypes.STRING,
                    allowNull: false,
                },
                description: {
                    type: sequelize_1.DataTypes.TEXT,
                    allowNull: true,
                },
                price: {
                    type: sequelize_1.DataTypes.INTEGER,
                    allowNull: false,
                },
                role_id: {
                    type: sequelize_1.DataTypes.STRING,
                    allowNull: true,
                },
                is_active: {
                    type: sequelize_1.DataTypes.BOOLEAN,
                    defaultValue: true,
                },
            }, {
                sequelize: this.sequelize,
                tableName: 'shop_items',
                timestamps: true,
            });
            this.UserPurchases = UserPurchases.init({
                id: {
                    type: sequelize_1.DataTypes.INTEGER,
                    primaryKey: true,
                    autoIncrement: true,
                },
                user_id: {
                    type: sequelize_1.DataTypes.STRING,
                    allowNull: false,
                },
                guild_id: {
                    type: sequelize_1.DataTypes.STRING,
                    allowNull: false,
                },
                item_id: {
                    type: sequelize_1.DataTypes.INTEGER,
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
                    type: sequelize_1.DataTypes.INTEGER,
                    primaryKey: true,
                    autoIncrement: true,
                },
                guild_id: { type: sequelize_1.DataTypes.STRING, allowNull: false },
                channel_id: { type: sequelize_1.DataTypes.STRING, allowNull: false },
                message_id: { type: sequelize_1.DataTypes.STRING, allowNull: false },
                user_id: { type: sequelize_1.DataTypes.STRING, allowNull: false },
                file_path: { type: sequelize_1.DataTypes.STRING, allowNull: false },
                original_url: { type: sequelize_1.DataTypes.STRING, allowNull: false },
                created_at: { type: sequelize_1.DataTypes.DATE, allowNull: false, defaultValue: sequelize_1.DataTypes.NOW }
            }, {
                sequelize: this.sequelize,
                tableName: 'meme_images',
                timestamps: false
            });
            // Автоматически создаем таблицы
            await this.sequelize.sync();
            logger_1.logger.info('Connected to MySQL database and tables synced');
        }
        catch (error) {
            logger_1.logger.error('Failed to connect to database:', error);
            throw error;
        }
    }
    async disconnect() {
        if (this.sequelize) {
            await this.sequelize.close();
            this.sequelize = null;
            logger_1.logger.info('Disconnected from database');
        }
    }
    // Пользователи
    async getUser(userId) {
        if (!this.User)
            throw new Error('Database not connected');
        return await this.User.findByPk(userId);
    }
    async createUser(userId, username) {
        if (!this.User)
            throw new Error('Database not connected');
        await this.User.upsert({ id: userId, username });
    }
    async updateUserXP(userId, xp) {
        if (!this.User)
            throw new Error('Database not connected');
        await this.User.increment('xp', { by: xp, where: { id: userId } });
    }
    async setUserXP(userId, xp) {
        if (!this.User)
            throw new Error('Database not connected');
        await this.User.update({ xp }, { where: { id: userId } });
    }
    async updateUserCoins(userId, coins) {
        if (!this.User)
            throw new Error('Database not connected');
        await this.User.increment('coins', { by: coins, where: { id: userId } });
    }
    async setUserCoins(userId, coins) {
        if (!this.User)
            throw new Error('Database not connected');
        await this.User.update({ coins }, { where: { id: userId } });
    }
    async updateUserLevel(userId, level, coins) {
        if (!this.User)
            throw new Error('Database not connected');
        await this.User.update({ level }, { where: { id: userId } });
        await this.User.increment('coins', { by: coins, where: { id: userId } });
    }
    // Markov Chain
    async addMarkovBigram(guildId, prev, curr, next) {
        if (!this.MarkovBigram)
            throw new Error('Database not connected');
        try {
            const existing = await this.MarkovBigram.findOne({
                where: { guild_id: guildId, prev_token: prev, curr_token: curr, next_token: next }
            });
            if (existing) {
                await existing.increment('frequency');
            }
            else {
                await this.MarkovBigram.create({
                    guild_id: guildId,
                    prev_token: prev,
                    curr_token: curr,
                    next_token: next,
                    frequency: 1,
                });
            }
        }
        catch (error) {
            logger_1.logger.error('Error in addMarkovBigram:', error);
        }
    }
    // Возвращает стартовые пары [prev, curr] с частотой
    async getBigramStartCandidates(guildId) {
        if (!this.MarkovBigram)
            throw new Error('Database not connected');
        const rows = await this.MarkovBigram.findAll({
            where: { guild_id: guildId },
            attributes: ['prev_token', 'curr_token'],
            group: ['prev_token', 'curr_token'],
            raw: true
        });
        // Явно проверяем и кастуем к tuple только если обе строки есть
        return rows
            .filter((row) => typeof row.prev_token === "string" && typeof row.curr_token === "string")
            .map((row) => [row.prev_token, row.curr_token]);
    }
    // Для данной пары (prev, curr) возвращает все варианты next_token с их frequency
    async getMarkovBigramOptions(guildId, prev, curr) {
        if (!this.MarkovBigram)
            throw new Error('Database not connected');
        const rows = await this.MarkovBigram.findAll({
            where: { guild_id: guildId, prev_token: prev, curr_token: curr },
            attributes: ['next_token', 'frequency'], raw: true
        });
        const options = {};
        for (const row of rows) {
            if (row.next_token)
                options[row.next_token] = row.frequency;
        }
        return options;
    }
    async saveMemeImage(meta) {
        if (!this.MemeImage)
            throw new Error('Database not connected');
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
    async getRandomMemeImages(guildId, count) {
        if (!this.MemeImage)
            throw new Error('Database not connected');
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const images = await this.MemeImage.findAll({
            where: {
                guild_id: guildId,
                created_at: { [sequelize_1.Op.gte]: weekAgo }
            },
            order: this.sequelize.random(),
            raw: true
        });
        const allowedExts = ['.png', '.jpg', '.jpeg', '.webp'];
        return images
            .map(img => img.file_path)
            .filter(fp => {
            if (!fp)
                return false;
            const ext = (fp.match(/\.[^.]+$/)?.[0] || '').toLowerCase();
            return allowedExts.includes(ext);
        })
            .slice(0, count);
    }
    async rawQuery(sql, params) {
        if (!this.sequelize)
            throw new Error('DB not connected');
        const options = { type: sequelize_1.QueryTypes.SELECT };
        if (params)
            options.replacements = params;
        const [rows] = await this.sequelize.query(sql, options);
        // Гарантируем что rows всегда массив, даже если undefined
        return (rows ?? []);
    }
}
exports.DatabaseService = DatabaseService;
//# sourceMappingURL=DatabaseService.js.map