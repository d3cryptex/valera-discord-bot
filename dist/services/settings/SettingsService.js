"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettingsService = void 0;
const logger_1 = require("../../utils/logger");
const sequelize_1 = require("sequelize");
class SettingsService {
    database;
    redis;
    defaultSettings;
    constructor(database, redis) {
        this.database = database;
        this.redis = redis;
        this.defaultSettings = {
            levels: {
                enabled: true,
                text_xp: true,
                voice_xp: true,
                levelup_messages: true,
                min_message_length: 5,
                xp_multiplier: 1.0,
                voice_xp_multiplier: 1.0,
                coins_multiplier: 1.0,
                levelup_channel: null,
                xp_text: [],
                xp_voice: [],
                ignored: [],
                ignored_roles: [],
                ignored_users: [],
            },
            economy: {
                shop_enabled: true,
                prices_multiplier: 1.0,
                daily_bonus_enabled: false,
                daily_bonus_min: 100,
                daily_bonus_max: 1000,
                weekly_bonus_enabled: false,
                weekly_bonus_min: 500,
                weekly_bonus_max: 5000,
                streak_enabled: true,
                shop_items: [],
                currency_name: 'Coins',
                currency_emoji: '💰',
                history: [],
            },
            battlepass: {
                enabled: true,
                levels: 50,
                xp_for_level: 1000,
                daily_quests: [],
                weekly_quests: [],
                rewards: []
            },
            ai: {
                enabled: true,
                response_chance: 0.05,
                min_words: 3,
                max_words: 20,
                cooldown: 30,
                ignored_channels: [],
                channels: []
            },
            moderation: {
                enabled: false,
                spam_protection: true,
                profanity_filter: true,
                ignored_channels: [],
                ignored_roles: [],
                history: []
            },
            channels: {
                welcome: null,
                logs: null
            },
            admin: {
                roles: [],
                users: []
            },
            custom: {
                experimental: false,
                misc: {}
            },
            system: {
                version: '1.0.0',
                timezone: 'Europe/Moscow',
                language: 'ru'
            }
        };
    }
    // Получение настроек гильдии
    async getGuildSettings(guildId) {
        try {
            if (!this.database.BotSettings)
                throw new Error('Database not connected');
            // Кэш
            const cached = await this.redis.get(`settings:${guildId}`);
            if (cached) {
                return JSON.parse(cached);
            }
            // БД
            const rows = await this.database.BotSettings.findAll({
                where: { guild_id: guildId },
                attributes: ['setting_key', 'setting_value'],
                raw: true,
            });
            // Миграция старого формата (простые ключи)
            let settings = JSON.parse(JSON.stringify(this.defaultSettings));
            for (const row of rows) {
                const [category, subkey] = row.setting_key.split('.');
                const value = JSON.parse(row.setting_value);
                if (category && subkey && settings.hasOwnProperty(category) && settings[category].hasOwnProperty(subkey)) {
                    settings[category][subkey] = value;
                }
                else if (row.setting_key in settings) {
                    settings[row.setting_key] = value; // fallback for simple keys
                }
            }
            // Кэшируем
            await this.redis.set(`settings:${guildId}`, JSON.stringify(settings), 1800);
            return settings;
        }
        catch (error) {
            logger_1.logger.error('Error getting guild settings:', error);
            return this.defaultSettings;
        }
    }
    // Гибкий update для любого вложенного поля ('levels.xp_multiplier', 'economy.shop_enabled', ...)
    async updateSetting(guildId, key, value) {
        if (!this.database.BotSettings)
            throw new Error('Database not connected');
        await this.database.BotSettings.upsert({
            guild_id: guildId,
            setting_key: key,
            setting_value: JSON.stringify(value)
        });
        await this.addChangeHistory(guildId, key, value);
        await this.redis.del(`settings:${guildId}`);
    }
    async addChangeHistory(guildId, key, newValue) {
        const historyKey = `history:${guildId}`;
        const prev = await this.getGuildSettings(guildId);
        const oldValue = this.get(prev, key);
        const entry = {
            date: Date.now(),
            user: "system", // Передавай ID или имя пользователя в сигнатуре!
            key,
            old: oldValue,
            new: newValue
        };
        // Храним историю в redis или БД
        let history = [];
        let raw = await this.redis.get(historyKey);
        if (raw) {
            history = JSON.parse(raw);
        }
        else {
            history = [];
        }
        history.push(entry);
        await this.redis.set(historyKey, JSON.stringify(history), 7 * 24 * 3600);
    }
    async getChangeHistory(guildId) {
        const historyKey = `history:${guildId}`;
        try {
            const history = await this.redis.get(historyKey);
            return history ? JSON.parse(history) : [];
        }
        catch {
            return [];
        }
    }
    async resetGuildSettings(guildId) {
        try {
            if (!this.database.BotSettings)
                throw new Error('Database not connected');
            await this.database.BotSettings.destroy({ where: { guild_id: guildId } });
            await this.redis.del(`settings:${guildId}`);
            logger_1.logger.info(`Reset settings for guild ${guildId}`);
        }
        catch (error) {
            logger_1.logger.error('Error resetting settings:', error);
            throw error;
        }
    }
    async hasPermission(member, settings) {
        if (member.guild.ownerId === member.id)
            return true;
        if (member.permissions.has('Administrator'))
            return true;
        if (settings.admin.users.includes(member.id))
            return true;
        const hasAdminRole = member.roles.cache.some(role => settings.admin.roles.includes(role.id));
        return hasAdminRole;
    }
    // -------- Логика работы с вложенными объектами --------------
    shouldProcessAI(settings, channelId) {
        if (!settings.ai.enabled)
            return false;
        if (settings.ai.channels.length === 0) {
            if (settings.moderation.ignored_channels.includes(channelId))
                return false;
            return true;
        }
        if (settings.ai.channels.includes(channelId)) {
            if (settings.moderation.ignored_channels.includes(channelId))
                return false;
            return true;
        }
        return false;
    }
    shouldGiveTextXP(settings, channelId) {
        if (!settings.levels.enabled || !settings.levels.text_xp)
            return false;
        if (settings.levels.ignored.includes(channelId))
            return false;
        if (settings.levels.xp_text.length === 0)
            return true;
        return settings.levels.xp_text.includes(channelId);
    }
    shouldGiveVoiceXP(settings, channelId) {
        if (!settings.levels.enabled || !settings.levels.voice_xp)
            return false;
        if (settings.levels.ignored.includes(channelId))
            return false;
        if (settings.levels.xp_voice.length === 0)
            return true;
        return settings.levels.xp_voice.includes(channelId);
    }
    // Получение любого вложенного поля по строке category.subkey
    get(settings, fullPath) {
        const [category, subkey] = fullPath.split('.');
        return category && subkey ? settings[category][subkey] : undefined;
    }
    async importGuildSettings(guildId, settings) {
        try {
            if (!this.database.BotSettings)
                throw new Error('Database not connected');
            // Сохраняем каждое вложенное поле отдельно!
            for (const category in settings) {
                if (typeof settings[category] !== 'object')
                    continue;
                for (const subkey in settings[category]) {
                    await this.updateSetting(guildId, `${category}.${subkey}`, settings[category][subkey]);
                }
            }
            await this.redis.del(`settings:${guildId}`);
            logger_1.logger.info(`Imported full settings for guild ${guildId}`);
        }
        catch (error) {
            logger_1.logger.error('Error importing settings:', error);
            throw error;
        }
    }
    async resetCategory(guildId, category) {
        try {
            if (!this.database.BotSettings)
                throw new Error('Database not connected');
            // Удаляем все настройки для данной категории
            await this.database.BotSettings.destroy({ where: { guild_id: guildId, setting_key: { [sequelize_1.Op.like]: `${category}.%` } } });
            await this.redis.del(`settings:${guildId}`);
            logger_1.logger.info(`Reset category ${category} for guild ${guildId}`);
        }
        catch (error) {
            logger_1.logger.error('Error resetting category:', error);
            throw error;
        }
    }
}
exports.SettingsService = SettingsService;
//# sourceMappingURL=SettingsService.js.map