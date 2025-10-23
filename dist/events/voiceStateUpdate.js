"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = voiceStateUpdate;
const logger_1 = require("../utils/logger");
const updateBattlePassProgress_1 = require("../services/battlepass/updateBattlePassProgress");
const voiceSessions = new Map();
async function voiceStateUpdate(bot, oldState, newState) {
    const userId = newState.id;
    const guildId = newState.guild.id;
    const sessionKey = `${userId}-${guildId}`;
    try {
        if (!bot.database.User)
            throw new Error('Database not connected');
        const settings = await bot.settingsService.getGuildSettings(guildId);
        // Join
        if (!oldState.channel && newState.channel) {
            if (bot.settingsService.shouldGiveVoiceXP(settings, newState.channel.id)) {
                const memberRoleIds = newState.member?.roles.cache.map(r => r.id) ?? [];
                const session = {
                    userId,
                    guildId,
                    channelId: newState.channel.id,
                    joinTime: Date.now(),
                    lastAwardedMinute: 0,
                    memberRoleIds
                };
                session.intervalId = setInterval(async () => {
                    const now = Date.now();
                    const minutesSpent = Math.floor((now - session.joinTime) / 60000);
                    if (minutesSpent > session.lastAwardedMinute) {
                        const delta = minutesSpent - session.lastAwardedMinute;
                        const res = await bot.levelService.addVoiceXP(userId, guildId, session.channelId, // FIX: pass channel id
                        delta, // FIX: minutes chunk
                        session.memberRoleIds // optional roles
                        );
                        await (0, updateBattlePassProgress_1.updateBattlePassProgress)({
                            bot,
                            userId,
                            guildId,
                            type: 'voice',
                            amount: delta,
                            isDaily: true,
                            channel: oldState.channel // или текстовый канал
                        });
                        if (res.levelUp) {
                            await announceVoiceLevelUp(bot, guildId, session.channelId, userId, res.newLevel, res.coinsEarned ?? 0);
                        }
                        session.lastAwardedMinute = minutesSpent;
                    }
                }, 60000);
                voiceSessions.set(sessionKey, session);
                logger_1.logger.debug(`User ${userId} joined voice channel ${newState.channel.id} in guild ${guildId}`);
            }
            else {
                voiceSessions.delete(sessionKey);
            }
        }
        // Leave
        if (oldState.channel && !newState.channel) {
            const session = voiceSessions.get(sessionKey);
            if (session) {
                if (session.intervalId)
                    clearInterval(session.intervalId);
                const minutesSpent = Math.floor((Date.now() - session.joinTime) / 60000);
                if (minutesSpent > session.lastAwardedMinute) {
                    const delta = minutesSpent - session.lastAwardedMinute;
                    const roles = oldState.member?.roles.cache.map(r => r.id) ?? session.memberRoleIds ?? [];
                    const res = await bot.levelService.addVoiceXP(userId, guildId, session.channelId, // FIX
                    delta, // FIX
                    roles);
                    if (res.levelUp) {
                        await announceVoiceLevelUp(bot, guildId, session.channelId, userId, res.newLevel, res.coinsEarned ?? 0);
                    }
                }
                voiceSessions.delete(sessionKey);
            }
        }
        // Move
        if (oldState.channel && newState.channel && oldState.channel.id !== newState.channel.id) {
            const session = voiceSessions.get(sessionKey);
            if (session) {
                if (bot.settingsService.shouldGiveVoiceXP(settings, oldState.channel.id) && settings.levels.voice_xp) {
                    const timeSpent = Date.now() - session.joinTime;
                    const minutesSpent = Math.floor(timeSpent / 60000);
                    if (minutesSpent > 0) {
                        const roles = oldState.member?.roles.cache.map(r => r.id) ?? session.memberRoleIds ?? [];
                        const res = await bot.levelService.addVoiceXP(userId, guildId, session.channelId, // FIX
                        minutesSpent, // FIX
                        roles);
                        if (res.levelUp) {
                            await announceVoiceLevelUp(bot, guildId, session.channelId, userId, res.newLevel, res.coinsEarned ?? 0);
                        }
                    }
                }
                if (session.intervalId)
                    clearInterval(session.intervalId);
            }
            if (bot.settingsService.shouldGiveVoiceXP(settings, newState.channel.id)) {
                const memberRoleIds = newState.member?.roles.cache.map(r => r.id) ?? [];
                const newSession = {
                    userId,
                    guildId,
                    channelId: newState.channel.id,
                    joinTime: Date.now(),
                    lastAwardedMinute: 0,
                    memberRoleIds
                };
                newSession.intervalId = setInterval(async () => {
                    const now = Date.now();
                    const minutesSpent = Math.floor((now - newSession.joinTime) / 60000);
                    if (minutesSpent > newSession.lastAwardedMinute) {
                        const res = await bot.levelService.addVoiceXP(userId, guildId, newSession.channelId, // FIX
                        1, // FIX
                        newSession.memberRoleIds);
                        await (0, updateBattlePassProgress_1.updateBattlePassProgress)({
                            bot,
                            userId,
                            guildId,
                            type: "voice",
                            amount: 1,
                            isDaily: true,
                            channel: newState.channel // или текстовый канал, если хотите отправлять туда ачивки
                        });
                        if (res.levelUp) {
                            await announceVoiceLevelUp(bot, guildId, newSession.channelId, userId, res.newLevel, res.coinsEarned ?? 0);
                        }
                        newSession.lastAwardedMinute = minutesSpent;
                    }
                }, 60000);
                voiceSessions.set(sessionKey, newSession);
                logger_1.logger.debug(`User ${userId} joined voice channel ${newState.channel.id} in guild ${guildId}`);
            }
            else {
                voiceSessions.delete(sessionKey);
            }
        }
    }
    catch (error) {
        logger_1.logger.error('Error in voiceStateUpdate:', error);
    }
}
async function announceVoiceLevelUp(bot, guildId, voiceChannelId, userId, newLevel, coins) {
    const settings = await bot.settingsService.getGuildSettings(guildId);
    if (!settings.levels.levelup_messages)
        return;
    const targetChannelId = settings.levels.levelup_channel || voiceChannelId;
    const channel = await bot.client.channels.fetch(targetChannelId).catch(() => null);
    const content = `🎉 <@${userId}> повысил(а) уровень до ${newLevel}! 💰 +${coins} монет`;
    // Отправляем, только если канал поддерживает сообщения
    if (channel && 'isSendable' in channel && channel.isSendable()) {
        await channel.send({ content });
        return;
    }
    // Fallback: системный канал гильдии, если доступен
    const guild = await bot.client.guilds.fetch(guildId).catch(() => null);
    if (guild?.systemChannelId) {
        const sys = await bot.client.channels.fetch(guild.systemChannelId).catch(() => null);
        if (sys && 'isSendable' in sys && sys.isSendable()) {
            await sys.send({ content });
        }
    }
}
//# sourceMappingURL=voiceStateUpdate.js.map