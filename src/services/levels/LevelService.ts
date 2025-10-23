import { DatabaseService } from '../database/DatabaseService';
import { RedisService } from '../cache/RedisService';
import { SettingsService } from '../settings/SettingsService';
import { GuildSettings } from '../settings/SettingsService';
import { logger } from '../../utils/logger';

export class LevelService {
    private settingsService: SettingsService;
    private database: DatabaseService;
    private redis: RedisService;
    private xpCooldown: Map<string, number> = new Map();

    constructor(settingsService: SettingsService, database: DatabaseService, redis: RedisService) {
        this.settingsService = settingsService;
        this.database = database;
        this.redis = redis;
    }

    async addMessageXP(userId: string, guildId: string, channelId: string, contentLength: number, memberRoleIds: string[] = []): Promise<{ levelUp: boolean, newLevel?: number, coinsEarned?: number }> {
        const settings = await this.settingsService.getGuildSettings(guildId);

        // Базовые флаги
        if (!settings.levels.enabled || !settings.levels.text_xp) {
            return { levelUp: false };
        }

        // Канальные списки (xp_text, ignored)
        if (!this.settingsService.shouldGiveTextXP(settings, channelId)) {
            return { levelUp: false };
        }

        // Игнор пользователя
        if (settings.levels.ignored_users?.includes(userId)) {
            return { levelUp: false };
        }

        // Игнор по ролям
        if (memberRoleIds?.some(r => settings.levels.ignored_roles?.includes(r))) {
            return { levelUp: false };
        }

        // Минимальная длина сообщения
        const minLen = settings.levels.min_message_length ?? 0;
        if (typeof contentLength === 'number' && contentLength < minLen) {
            return { levelUp: false };
        }

        // Кулдаун (как в твоём коде)
        const cooldownKey = `xp_cooldown:${userId}:${guildId}`;
        const cooldownDuration = settings.ai.cooldown ? settings.ai.cooldown * 1000 : 60000;
        const lastXP = this.xpCooldown.get(cooldownKey) || 0;
        const now = Date.now();
        if (now - lastXP < cooldownDuration) {
            return { levelUp: false };
        }
        this.xpCooldown.set(cooldownKey, now);

        // Начисление XP (без изменений)
        const baseXP = Math.floor(Math.random() * 3) + 1;
        const multiplier = settings.levels.xp_multiplier || 1.0;
        const xpGained = Math.floor(baseXP * multiplier);
        if (xpGained <= 0) return { levelUp: false };

        let user = await this.database.getUser(userId);
        if (!user) {
            await this.database.createUser(userId, 'Unknown');
            user = await this.database.getUser(userId);
        }

        const oldLevel = user.level;
        const newXP = user.xp + xpGained;
        const newLevel = this.calculateLevel(newXP);

        await this.database.updateUserXP(userId, xpGained);

        if (newLevel > oldLevel) {
            const coinsEarned = Math.floor((newLevel * 100) * (settings.levels.coins_multiplier || 1.0));
            await this.database.updateUserLevel(userId, newLevel, coinsEarned);
            logger.info(`User ${userId} leveled up to ${newLevel} in guild ${guildId}`);
            return { levelUp: true, newLevel, coinsEarned };
        }

        return { levelUp: false };
    }

    async addVoiceXP(userId: string, guildId: string, channelId: string, minutes: number, memberRoleIds: string[] = []): Promise<{ levelUp: boolean, newLevel?: number, coinsEarned?: number }> {
        const settings = await this.settingsService.getGuildSettings(guildId);

        if (!settings.levels.enabled || !settings.levels.voice_xp) {
            return { levelUp: false };
        }

        // Канальные списки (xp_voice, ignored)
        if (!this.settingsService.shouldGiveVoiceXP(settings, channelId)) {
            return { levelUp: false };
        }

        // Игнор пользователя и ролей
        if (settings.levels.ignored_users?.includes(userId)) {
            return { levelUp: false };
        }
        if (memberRoleIds?.some(r => settings.levels.ignored_roles?.includes(r))) {
            return { levelUp: false };
        }

        const multiplier = settings.levels.voice_xp_multiplier || 1.0;
        const xpGained = Math.floor(minutes * multiplier);
        if (xpGained <= 0) return { levelUp: false };

        let user = await this.database.getUser(userId);
        if (!user) {
            await this.database.createUser(userId, 'Unknown');
            user = await this.database.getUser(userId);
        }

        const oldLevel = user.level;
        const newXP = user.xp + xpGained;
        const newLevel = this.calculateLevel(newXP);

        await this.database.updateUserXP(userId, xpGained);

        if (newLevel > oldLevel) {
            const coinsEarned = Math.floor((newLevel * 100) * (settings.levels.coins_multiplier || 1.0));
            await this.database.updateUserLevel(userId, newLevel, coinsEarned);
            logger.info(`User ${userId} leveled up to ${newLevel} in guild ${guildId} (voice XP)`);
            return { levelUp: true, newLevel, coinsEarned };
        }

        return { levelUp: false };
    }
 
    calculateLevel(xp: number): number {
        return Math.floor(Math.sqrt(xp / 100)) + 1;
    }

    calculateXPForLevel(level: number): number {
        return Math.pow(level - 1, 2) * 100;
    }
}