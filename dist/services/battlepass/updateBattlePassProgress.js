"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateBattlePassProgress = updateBattlePassProgress;
async function updateBattlePassProgress(params) {
    const { bot, userId, guildId, type, amount = 1, isDaily = true, questIndex, messageContent = '', channel, interaction } = params;
    // Получаем все настройки сервера
    const settings = await bot.settingsService.getGuildSettings(guildId);
    const bp = settings.battlepass ?? {};
    const now = Date.now();
    // Берём ротацию квестов как обычно
    // dayOffset/weekOffset — берём как и в messageCreate, если надо специфически — передаём как параметр
    let user = await bot.database.getUser(userId);
    if (!user) {
        await bot.database.createUser(userId, userId);
        user = await bot.database.getUser(userId);
    }
    // Все статусы и счетчики
    let bpDailyStatus = [];
    let bpWeeklyStatus = [];
    try {
        bpDailyStatus = JSON.parse(user.battlepass_daily_status ?? '[]');
    }
    catch { }
    try {
        bpWeeklyStatus = JSON.parse(user.battlepass_weekly_status ?? '[]');
    }
    catch { }
    let dailyCounters = {};
    let weeklyCounters = {};
    try {
        dailyCounters = JSON.parse(user.battlepass_progress_counters_daily || '{}');
    }
    catch { }
    try {
        weeklyCounters = JSON.parse(user.battlepass_progress_counters_weekly || '{}');
    }
    catch { }
    let changed = false;
    let progressChanged = false;
    let quests = isDaily ? bp.daily_quests ?? [] : bp.weekly_quests ?? [];
    let statusArr = isDaily ? bpDailyStatus : bpWeeklyStatus;
    let counters = isDaily ? dailyCounters : weeklyCounters;
    // --- Найти релевантный квест ----
    for (let i = 0; i < quests.length; i++) {
        const quest = quests[i];
        if (quest.type !== type)
            continue;
        if (statusArr[i])
            continue; // если выполнено
        // Уникальный ключ прогресса для каждого типа и квеста
        let cacheKey = `bp_${type}_${isDaily ? "daily" : "weekly"}_${i}`;
        // Счётчик увеличиваем только если это наша задача
        if (['messages', 'voice', 'gift', 'invites'].includes(type)) {
            counters[cacheKey] = (counters[cacheKey] ?? 0) + amount;
            progressChanged = true;
            if ((counters[cacheKey] ?? 0) >= (quest.target ?? 1)) {
                statusArr[i] = true;
                user.battle_pass_exp = (user.battle_pass_exp ?? 0) + (quest.reward ?? 0);
                await processBattlePassLevelUp(user, settings, interaction, bot);
                changed = true;
            }
        }
        else if (type === 'streak') {
            // streak прогресс — просто сравниваем user.streak
            if ((user.streak ?? 0) >= (quest.target ?? 1)) {
                statusArr[i] = true;
                user.battle_pass_exp = (user.battle_pass_exp ?? 0) + (quest.reward ?? 0);
                await processBattlePassLevelUp(user, settings, interaction, bot);
                changed = true;
            }
        }
        else if (type === 'game') {
            // Если есть уточнение типа игры — сверяем:
            if (quest.gameType && quest.gameType !== params.gameType)
                continue;
            // Если квест только на победу
            counters[cacheKey] = (counters[cacheKey] ?? 0) + amount;
            progressChanged = true;
            if ((counters[cacheKey] ?? 0) >= (quest.target ?? 1)) {
                statusArr[i] = true;
                user.battle_pass_exp = (user.battle_pass_exp ?? 0) + (quest.reward ?? 0);
                await processBattlePassLevelUp(user, settings, interaction, bot);
                changed = true;
            }
        }
        else if (type === 'custom') {
            if (quest.custom_word && messageContent.includes(quest.custom_word)) {
                statusArr[i] = true;
                user.battle_pass_exp = (user.battle_pass_exp ?? 0) + (quest.reward ?? 0);
                await processBattlePassLevelUp(user, settings, interaction, bot);
                changed = true;
            }
        }
    }
    // --- Сохранение прогресса ---
    if (changed || progressChanged) {
        await bot.database.User.update(isDaily
            ? {
                battlepass_progress_counters_daily: JSON.stringify(counters),
                battlepass_daily_status: JSON.stringify(statusArr),
                battle_pass_exp: user.battle_pass_exp,
            }
            : {
                battlepass_progress_counters_weekly: JSON.stringify(counters),
                battlepass_weekly_status: JSON.stringify(statusArr),
                battle_pass_exp: user.battle_pass_exp,
            }, { where: { id: userId } });
    }
    // --- Проверка уровня и награды ---
    const bpLevels = bp.levels ?? 18;
    const rewards = bp.rewards ?? [];
    let oldLevel = user.battle_pass_level ?? 1;
    let newLevel = user.battle_pass_level ?? 1;
    while (user.battle_pass_exp >= (newLevel * (typeof bp.xp_for_level === 'number' ? bp.xp_for_level : 100))) {
        newLevel++;
    }
    if (newLevel > oldLevel) {
        for (let lvl = oldLevel + 1; lvl <= newLevel; lvl++) {
            const rewardObj = rewards.find((r) => r.level === lvl);
            if (rewardObj) {
                switch (rewardObj.type) {
                    case 'coins':
                        user.coins = (user.coins ?? 0) + (parseInt(rewardObj.reward) || 0);
                        if (channel && 'send' in channel && typeof channel.send === 'function') {
                            await channel.send(`<@${userId}>, за BP-уровень ${lvl} начислено ${rewardObj.reward} монет!`);
                        }
                        break;
                    case 'role': {
                        const role = channel?.guild?.roles.cache.get(rewardObj.reward);
                        if (role) {
                            const member = await channel.guild?.members.fetch(userId).catch(() => undefined);
                            if (member && !member.roles.cache.has(role.id)) {
                                await member.roles.add(role);
                                if (channel && 'send' in channel && typeof channel.send === 'function') {
                                    await channel.send(`<@${userId}>, вам выдана роль за BP-уровень ${lvl}: <@&${role.id}>`);
                                }
                            }
                        }
                        break;
                    }
                    case 'custom':
                        if (channel && 'send' in channel && typeof channel.send === 'function') {
                            await channel.send(`<@${userId}>, вы получили награду: ${rewardObj.reward}`);
                        }
                        break;
                }
            }
        }
        user.battle_pass_level = newLevel;
        await bot.database.User.update({ battle_pass_level: newLevel, coins: user.coins }, { where: { id: userId } });
    }
}
async function processBattlePassLevelUp(user, settings, interaction, bot) {
    const bpLevels = settings.battlepass?.levels ?? 50;
    const bpXP = typeof settings.battlepass?.xp_for_level === 'number' ? settings.battlepass.xp_for_level : 100;
    const rewardsList = settings.battlepass?.rewards || [];
    let leveledUp = false;
    while (user.battle_pass_exp >= bpXP && user.battle_pass_level < bpLevels) {
        user.battle_pass_exp -= bpXP;
        user.battle_pass_level += 1;
        leveledUp = true;
        // Выдать награду за уровень
        const rewardObj = rewardsList.find((r) => r.level === user.battle_pass_level) ?? {};
        if (rewardObj.type === 'role' && interaction?.guild) {
            try {
                const member = await interaction.guild.members.fetch(user.id);
                await member.roles.add(rewardObj.reward);
            }
            catch { }
        }
        if (rewardObj.type === 'coins') {
            user.coins = (user.coins ?? 0) + Number(rewardObj.reward ?? 0);
        }
    }
    await user.save();
    return leveledUp;
}
//# sourceMappingURL=updateBattlePassProgress.js.map