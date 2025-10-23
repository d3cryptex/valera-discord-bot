import { DatabaseService } from '../database/DatabaseService';
import { RedisService } from '../cache/RedisService';
import { logger } from '../../utils/logger';
import { GuildMember } from 'discord.js';
import { Op } from 'sequelize';

export interface GuildSettings {
  levels: {
    enabled: boolean,
    text_xp: boolean,
    voice_xp: boolean,
    levelup_messages: boolean,

    min_message_length: number
    xp_multiplier: number,
    voice_xp_multiplier: number,
    coins_multiplier: number,

    levelup_channel?: string | null;
    xp_text: string[],
    xp_voice: string[],
    ignored: string[],
    ignored_roles: string[],
    ignored_users: string[],

  },
  economy: {
    shop_enabled: boolean,
    prices_multiplier: number,
    daily_bonus_enabled: boolean,
    daily_bonus_min: number,
    daily_bonus_max: number,
    weekly_bonus_enabled: boolean,     
    weekly_bonus_min: number,          
    weekly_bonus_max: number,      
    streak_enabled: boolean,  
    shop_items: any[],
    currency_name: string,
    currency_emoji: string,
    history: any[]
  },
  battlepass: {                        
    enabled: boolean,                  
    levels: number,      
    xp_for_level: number,                
    daily_quests: any[],                
    weekly_quests: any[],               
    rewards: any[],                     
  },
  ai: {
    enabled: boolean,
    response_chance: number,
    min_words: number,
    max_words: number,
    cooldown: number,
    channels: string[],
    ignored_channels: string[]
  },
  moderation: {
    enabled: boolean,
    spam_protection: boolean,
    profanity_filter: boolean,
    ignored_channels: string[],
    ignored_roles: string[],
    history: any[]
  },
  channels: {
    welcome: string | null,
    logs: string | null
  },
  admin: {
    roles: string[],
    users: string[]
  },
  custom: {
    experimental: boolean,
    misc: Record<string, any>
  },
  system: {
    version: string,
    timezone: string,
    language: string
  }
}

export class SettingsService {
  private database: DatabaseService;
  private redis: RedisService;
  public defaultSettings: GuildSettings;

  constructor(database: DatabaseService, redis: RedisService) {
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
  async getGuildSettings(guildId: string): Promise<GuildSettings> {
    try {
      if (!this.database.BotSettings) throw new Error('Database not connected');
      
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
      let settings: GuildSettings = JSON.parse(JSON.stringify(this.defaultSettings));
      for (const row of rows) {
        const [category, subkey] = row.setting_key.split('.');
        const value = JSON.parse(row.setting_value);

        if (category && subkey && settings.hasOwnProperty(category) && (settings as any)[category].hasOwnProperty(subkey)) {
          (settings as any)[category][subkey] = value;
        } else if (row.setting_key in settings) {
          (settings as any)[row.setting_key] = value; // fallback for simple keys
        }
      }

      // Кэшируем
      await this.redis.set(`settings:${guildId}`, JSON.stringify(settings), 1800);
      return settings;
    } catch (error) {
      logger.error('Error getting guild settings:', error);
      return this.defaultSettings;
    }
  }

  // Гибкий update для любого вложенного поля ('levels.xp_multiplier', 'economy.shop_enabled', ...)
  async updateSetting(guildId: string, key: string, value: any): Promise<void> {
    if (!this.database.BotSettings) throw new Error('Database not connected');
    await this.database.BotSettings.upsert({
        guild_id: guildId,
        setting_key: key,
        setting_value: JSON.stringify(value)
    });
    await this.addChangeHistory(guildId, key, value);
    await this.redis.del(`settings:${guildId}`);
  } 

  async addChangeHistory(guildId: string, key: string, newValue: any): Promise<void> {
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
    let history: any[] = [];
    let raw = await this.redis.get(historyKey);
    if (raw) {
      history = JSON.parse(raw);
    } else {
      history = [];
    }
    history.push(entry);
    await this.redis.set(historyKey, JSON.stringify(history), 7 * 24 * 3600);
  }

  async getChangeHistory(guildId: string): Promise<any[]> {
    const historyKey = `history:${guildId}`;
    try {
      const history = await this.redis.get(historyKey);
      return history ? JSON.parse(history) : [];
    } catch { return []; }
  }

  async resetGuildSettings(guildId: string): Promise<void> {
    try {
      if (!this.database.BotSettings) throw new Error('Database not connected');
      await this.database.BotSettings.destroy({ where: { guild_id: guildId } });
      await this.redis.del(`settings:${guildId}`);
      logger.info(`Reset settings for guild ${guildId}`);
    } catch (error) {
      logger.error('Error resetting settings:', error);
      throw error;
    }
  }

  async hasPermission(member: GuildMember, settings: GuildSettings): Promise<boolean> {
    if (member.guild.ownerId === member.id) return true;
    if (member.permissions.has('Administrator')) return true;
    if (settings.admin.users.includes(member.id)) return true;
    const hasAdminRole = member.roles.cache.some(role => settings.admin.roles.includes(role.id));
    return hasAdminRole;
  }

  // -------- Логика работы с вложенными объектами --------------
  shouldProcessAI(settings: GuildSettings, channelId: string): boolean {
    if (!settings.ai.enabled) return false;
    if (settings.ai.channels.length === 0) {
      if (settings.moderation.ignored_channels.includes(channelId)) return false;
      return true;
    }
    if (settings.ai.channels.includes(channelId)) {
      if (settings.moderation.ignored_channels.includes(channelId)) return false;
      return true;
    }
    return false;
  }

  shouldGiveTextXP(settings: GuildSettings, channelId: string): boolean {  
    if (!settings.levels.enabled || !settings.levels.text_xp) return false;
    if (settings.levels.ignored.includes(channelId)) return false;
    if (settings.levels.xp_text.length === 0) return true;
    return settings.levels.xp_text.includes(channelId);
  }

  shouldGiveVoiceXP(settings: GuildSettings, channelId: string): boolean {
    if (!settings.levels.enabled || !settings.levels.voice_xp) return false;
    if (settings.levels.ignored.includes(channelId)) return false;
    if (settings.levels.xp_voice.length === 0) return true;
    return settings.levels.xp_voice.includes(channelId);
  }

  // Получение любого вложенного поля по строке category.subkey
  get(settings: GuildSettings, fullPath: string): any {
    const [category, subkey] = fullPath.split('.');
    return category && subkey ? (settings as any)[category][subkey] : undefined;
  }

  async importGuildSettings(guildId: string, settings: GuildSettings): Promise<void> {
    try {
      if (!this.database.BotSettings) throw new Error('Database not connected');
      // Сохраняем каждое вложенное поле отдельно!
      for (const category in settings) {
        if (typeof (settings as any)[category] !== 'object') continue;
        for (const subkey in (settings as any)[category]) {
          await this.updateSetting(guildId, `${category}.${subkey}`, (settings as any)[category][subkey]);
        }
      }
      await this.redis.del(`settings:${guildId}`);
      logger.info(`Imported full settings for guild ${guildId}`);
    } catch (error) {
      logger.error('Error importing settings:', error);
      throw error;
    }
  }

  async resetCategory(guildId: string, category: string): Promise<void> {
    try {
      if (!this.database.BotSettings) throw new Error('Database not connected');
      // Удаляем все настройки для данной категории
      await this.database.BotSettings.destroy({ where: { guild_id: guildId, setting_key: { [Op.like]: `${category}.%` } } });
      await this.redis.del(`settings:${guildId}`);
      logger.info(`Reset category ${category} for guild ${guildId}`);
    } catch (error) {
      logger.error('Error resetting category:', error);
      throw error;
    }
  }
}

