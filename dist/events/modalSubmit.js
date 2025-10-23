"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const logger_1 = require("../utils/logger");
const luxon_1 = require("luxon");
exports.default = {
    name: 'modalSubmit',
    async execute(interaction, bot) {
        const customId = interaction.customId;
        try {
            switch (customId) {
                // === УПРАВЛЕНИЕ LEVEL ===
                case 'xp_minwords_modal': {
                    const value = interaction.fields.getTextInputValue('xp_min_word');
                    // переводим в целое число
                    const minWords = Math.max(3, Math.floor(Number(value)));
                    if (isNaN(minWords) || minWords < 3) {
                        await interaction.reply({
                            content: '❌ Некорректное количество слов. Введите целое число 3 или больше.',
                            ephemeral: true
                        });
                        return;
                    }
                    // Сохраняем именно целое число!
                    await bot.settingsService.updateSetting(interaction.guild.id, 'levels.min_message_length', minWords);
                    await interaction.reply({
                        content: `✅ Минимальное количество слов для начисления XP установлено: **${minWords}**`,
                        ephemeral: true
                    });
                    break;
                }
                case 'xp_text_multiplier_modal': {
                    const value = interaction.fields.getTextInputValue('xp_text_multiplier');
                    const multiplier = parseFloat(value);
                    if (isNaN(multiplier) || multiplier <= 0) {
                        await interaction.reply({
                            content: '❌ Некорректный множитель XP. Введите число больше 0.',
                            ephemeral: true
                        });
                        return;
                    }
                    await bot.settingsService.updateSetting(interaction.guild.id, 'levels.xp_multiplier', multiplier);
                    await interaction.reply({
                        content: `✅ Множитель XP установлен на **${multiplier}x**`,
                        ephemeral: true
                    });
                    break;
                }
                case 'xp_voice_multiplier_modal': {
                    const value = interaction.fields.getTextInputValue('xp_voice_multiplier');
                    const multiplier = parseFloat(value);
                    if (isNaN(multiplier) || multiplier <= 0) {
                        await interaction.reply({
                            content: '❌ Некорректный множитель XP. Введите число больше 0.',
                            ephemeral: true
                        });
                        return;
                    }
                    await bot.settingsService.updateSetting(interaction.guild.id, 'levels.voice_xp_multiplier', multiplier);
                    await interaction.reply({
                        content: `✅ Множитель XP установлен на **${multiplier}x**`,
                        ephemeral: true
                    });
                    break;
                }
                case 'coins_multiplier_modal': {
                    const value = interaction.fields.getTextInputValue('coins_multiplier');
                    const multiplier = parseFloat(value);
                    if (isNaN(multiplier) || multiplier <= 0) {
                        await interaction.reply({
                            content: '❌ Множитель должен быть числом больше 0.',
                            ephemeral: true
                        });
                        return;
                    }
                    await bot.settingsService.updateSetting(interaction.guild.id, 'levels.coins_multiplier', multiplier);
                    await interaction.reply({
                        content: `✅ Множитель монет за уровень установлен на **${multiplier}x**`,
                        ephemeral: true
                    });
                    break;
                }
                case 'levelup_channel_modal': {
                    const channelId = interaction.fields.getTextInputValue('channel_id');
                    const channel = interaction.guild.channels.cache.get(channelId);
                    if (!channel || ![
                        discord_js_1.ChannelType.GuildText,
                        discord_js_1.ChannelType.PublicThread,
                        discord_js_1.ChannelType.PrivateThread
                    ].includes(channel.type)) {
                        await interaction.reply({
                            content: '❌ Некорректный ID канала. Убедитесь, что это текстовый канал.',
                            ephemeral: true
                        });
                        return;
                    }
                    await bot.settingsService.updateSetting(interaction.guild.id, 'levels.levelup_channel', channelId);
                    await interaction.reply({
                        content: `✅ Канал уведомлений о повышении установлен: <#${channelId}>`,
                        ephemeral: true
                    });
                    break;
                }
                case 'text_xp_channels_modal': {
                    const value = interaction.fields.getTextInputValue('text_xp_channels').trim();
                    if (value.toLowerCase() === 'clear') {
                        await bot.settingsService.updateSetting(interaction.guild.id, 'levels.xp_text', []);
                        await interaction.reply({
                            content: '✅ Каналы текстового XP очищены. XP теперь начисляется во всех каналах.',
                            ephemeral: true
                        });
                        return;
                    }
                    const channelIds = value.split(' ').filter(id => id.length > 0);
                    const validChannels = [];
                    for (const id of channelIds) {
                        const channel = interaction.guild.channels.cache.get(id);
                        if (channel) {
                            validChannels.push(id);
                        }
                    }
                    if (validChannels.length === 0) {
                        await interaction.reply({
                            content: '❌ Не найдено ни одного действительного канала.',
                            ephemeral: true
                        });
                        return;
                    }
                    await bot.settingsService.updateSetting(interaction.guild.id, 'levels.xp_text', validChannels);
                    await interaction.reply({
                        content: `✅ Каналы текстового XP обновлены. Добавлено ${validChannels.length} каналов.`,
                        ephemeral: true
                    });
                    break;
                }
                case 'voice_xp_channels_modal': {
                    const value = interaction.fields.getTextInputValue('voice_xp_channels').trim();
                    if (value.toLowerCase() === 'clear') {
                        await bot.settingsService.updateSetting(interaction.guild.id, 'levels.xp_voice', []);
                        await interaction.reply({
                            content: '✅ Каналы голосового XP очищены. XP теперь начисляется во всех голосовых каналах.',
                            ephemeral: true
                        });
                        return;
                    }
                    const channelIds = value.split(' ').filter(id => id.length > 0);
                    const validChannels = [];
                    for (const id of channelIds) {
                        const channel = interaction.guild.channels.cache.get(id);
                        if (channel) {
                            validChannels.push(id);
                        }
                    }
                    if (validChannels.length === 0) {
                        await interaction.reply({
                            content: '❌ Не найдено ни одного действительного канала.',
                            ephemeral: true
                        });
                        return;
                    }
                    await bot.settingsService.updateSetting(interaction.guild.id, 'levels.xp_voice', validChannels);
                    await interaction.reply({
                        content: `✅ Каналы голосового XP обновлены. Добавлено ${validChannels.length} каналов.`,
                        ephemeral: true
                    });
                    break;
                }
                case 'ignored_channels_modal': {
                    const value = interaction.fields.getTextInputValue('ignored_channels').trim();
                    if (value.toLowerCase() === 'clear') {
                        await bot.settingsService.updateSetting(interaction.guild.id, 'levels.ignored', []);
                        await interaction.reply({
                            content: '✅ Игнорируемые каналы очищены.',
                            ephemeral: true
                        });
                        return;
                    }
                    const channelIds = value.split(' ').filter(id => id.length > 0);
                    const validChannels = [];
                    for (const id of channelIds) {
                        const channel = interaction.guild.channels.cache.get(id);
                        if (channel) {
                            validChannels.push(id);
                        }
                    }
                    if (validChannels.length === 0) {
                        await interaction.reply({
                            content: '❌ Не найдено ни одного действительного канала.',
                            ephemeral: true
                        });
                        return;
                    }
                    await bot.settingsService.updateSetting(interaction.guild.id, 'levels.ignored', validChannels);
                    await interaction.reply({
                        content: `✅ Игнорируемые каналы обновлены. Добавлено ${validChannels.length} каналов.`,
                        ephemeral: true
                    });
                    break;
                }
                case 'level_ignored_roles_modal': {
                    const value = interaction.fields.getTextInputValue('level_ignored_roles').trim();
                    if (value.toLowerCase() === 'clear') {
                        await bot.settingsService.updateSetting(interaction.guild.id, 'levels.ignored_roles', []);
                        await interaction.reply({ content: '✅ Игнорируемые роли очищены.', ephemeral: true });
                        return;
                    }
                    const roleIds = value.split(' ').filter(id => id.length > 0);
                    const validRoles = roleIds.filter(id => interaction.guild.roles.cache.has(id));
                    if (validRoles.length === 0) {
                        await interaction.reply({ content: '❌ Не найдено ни одной действительной роли.', ephemeral: true });
                        return;
                    }
                    await bot.settingsService.updateSetting(interaction.guild.id, 'levels.ignored_roles', validRoles);
                    await interaction.reply({ content: `✅ Игнорируемые роли обновлены. Добавлено ${validRoles.length} ролей.`, ephemeral: true });
                    break;
                }
                case 'level_ignored_users_modal': {
                    const value = interaction.fields.getTextInputValue('level_ignored_users').trim();
                    if (value.toLowerCase() === 'clear') {
                        await bot.settingsService.updateSetting(interaction.guild.id, 'levels.ignored_users', []);
                        await interaction.reply({ content: '✅ Игнорируемые пользователи очищены.', ephemeral: true });
                        return;
                    }
                    const userIds = value.split(' ').filter(id => id.length > 0);
                    const validUsers = userIds.filter(id => interaction.guild.members.cache.has(id));
                    if (validUsers.length === 0) {
                        await interaction.reply({ content: '❌ Не найдено ни одного действительного пользователя.', ephemeral: true });
                        return;
                    }
                    await bot.settingsService.updateSetting(interaction.guild.id, 'levels.ignored_users', validUsers);
                    await interaction.reply({ content: `✅ Игнорируемые пользователи обновлены. Добавлено ${validUsers.length} пользователей.`, ephemeral: true });
                    break;
                }
                case 'confirm_reset_levels': {
                    try {
                        const guildId = interaction.guild.id;
                        const text = interaction.fields.getTextInputValue('confirm_text_levels')?.trim().toLowerCase();
                        if (text === 'да' || text === 'yes') {
                            await bot.settingsService.resetCategory(guildId, 'levels'); // удалит все keys вида "levels.%", инвалидирует кэш
                            await interaction.reply({ content: 'Настройки уровней сброшены.', ephemeral: true });
                        }
                        else {
                            await interaction.reply({ content: 'Сброс отменён.', ephemeral: true });
                        }
                    }
                    catch (err) {
                        await (interaction.replied || interaction.deferred
                            ? interaction.followUp({ content: 'Ошибка при сбросе настроек уровней.', ephemeral: true })
                            : interaction.reply({ content: 'Ошибка при сбросе настроек уровней.', ephemeral: true }));
                    }
                    break;
                }
                // === УПРАВЛЕНИЕ ИИ ===
                case 'ai_chance_modal': {
                    const value = interaction.fields.getTextInputValue('ai_chance');
                    const chance = parseFloat(value);
                    if (isNaN(chance) || chance < 0 || chance > 100) {
                        await interaction.reply({
                            content: '❌ Шанс должен быть числом от 0 до 100.',
                            ephemeral: true
                        });
                        return;
                    }
                    await bot.settingsService.updateSetting(interaction.guild.id, 'ai.response_chance', chance / 100);
                    await interaction.reply({
                        content: `✅ Шанс ответа AI установлен на **${chance}%**`,
                        ephemeral: true
                    });
                    break;
                }
                case 'ai_cooldown_modal': {
                    const value = interaction.fields.getTextInputValue('ai_cooldown');
                    const cooldown = parseInt(value, 10);
                    if (isNaN(cooldown) || cooldown < 5 || cooldown > 3600) {
                        await interaction.reply({
                            content: '❌ Кулдаун должен быть числом от 5 до 3600 секунд.',
                            ephemeral: true
                        });
                        return;
                    }
                    await bot.settingsService.updateSetting(interaction.guild.id, 'ai.cooldown', cooldown);
                    await interaction.reply({
                        content: `✅ Кулдаун AI установлен на **${cooldown} секунд**`,
                        ephemeral: true
                    });
                    break;
                }
                case 'ai_words_modal': {
                    const minWords = parseInt(interaction.fields.getTextInputValue('ai_min_words'), 10);
                    const maxWords = parseInt(interaction.fields.getTextInputValue('ai_max_words'), 10);
                    if (isNaN(minWords) || isNaN(maxWords) || minWords < 1 || maxWords < minWords || maxWords > 100) {
                        await interaction.reply({
                            content: '❌ Некорректные значения. Минимум >=1, максимум >= минимума и <=100.',
                            ephemeral: true
                        });
                        return;
                    }
                    await bot.settingsService.updateSetting(interaction.guild.id, 'ai.min_words', minWords);
                    await bot.settingsService.updateSetting(interaction.guild.id, 'ai.max_words', maxWords);
                    await interaction.reply({
                        content: `✅ Длина ответов AI: от **${minWords}** до **${maxWords}** слов`,
                        ephemeral: true
                    });
                    break;
                }
                case 'ai_channels_modal': {
                    const value = interaction.fields.getTextInputValue('ai_channels').trim();
                    if (value.toLowerCase() === 'clear') {
                        await bot.settingsService.updateSetting(interaction.guild.id, 'ai.channels', []);
                        await interaction.reply({
                            content: '✅ AI-каналы очищены. AI теперь работает во всех каналах.',
                            ephemeral: true
                        });
                        return;
                    }
                    const channelIds = value.split(' ').filter(id => id.length > 0);
                    const validChannels = [];
                    for (const id of channelIds) {
                        const channel = interaction.guild.channels.cache.get(id);
                        if (channel) {
                            validChannels.push(id);
                        }
                    }
                    if (validChannels.length === 0) {
                        await interaction.reply({
                            content: '❌ Не найдено ни одного действительного канала.',
                            ephemeral: true
                        });
                        return;
                    }
                    await bot.settingsService.updateSetting(interaction.guild.id, 'ai.channels', validChannels);
                    await interaction.reply({
                        content: `✅ AI-каналы обновлены. Добавлено ${validChannels.length} каналов.`,
                        ephemeral: true
                    });
                    break;
                }
                case 'ai_channels_ignored_modal': {
                    const value = interaction.fields.getTextInputValue('ai_channels_ignored').trim();
                    if (value.toLowerCase() === 'clear') {
                        await bot.settingsService.updateSetting(interaction.guild.id, 'ai.ignored_channels', []);
                        await interaction.reply({
                            content: '✅ Игнорируеммые AI-каналы очищены.',
                            ephemeral: true
                        });
                        return;
                    }
                    const channelIds = value.split(' ').filter(id => id.length > 0);
                    const validChannels = [];
                    for (const id of channelIds) {
                        const channel = interaction.guild.channels.cache.get(id);
                        if (channel) {
                            validChannels.push(id);
                        }
                    }
                    if (validChannels.length === 0) {
                        await interaction.reply({
                            content: '❌ Не найдено ни одного действительного канала.',
                            ephemeral: true
                        });
                        return;
                    }
                    await bot.settingsService.updateSetting(interaction.guild.id, 'ai.ignored_channels', validChannels);
                    await interaction.reply({
                        content: `✅ Игнорируеммые AI-каналы обновлены. Добавлено ${validChannels.length} каналов.`,
                        ephemeral: true
                    });
                    break;
                }
                case 'confirm_reset_ai': {
                    try {
                        const guildId = interaction.guild.id;
                        const text = interaction.fields.getTextInputValue('confirm_text_ai')?.trim().toLowerCase();
                        if (text === 'да' || text === 'yes') {
                            await bot.settingsService.resetCategory(guildId, 'ai'); // удалит все keys вида "levels.%", инвалидирует кэш
                            await interaction.reply({ content: 'Настройки ИИ сброшены.', ephemeral: true });
                        }
                        else {
                            await interaction.reply({ content: 'Сброс отменён.', ephemeral: true });
                        }
                    }
                    catch (err) {
                        await (interaction.replied || interaction.deferred
                            ? interaction.followUp({ content: 'Ошибка при сбросе настроек ИИ.', ephemeral: true })
                            : interaction.reply({ content: 'Ошибка при сбросе настроек ИИ.', ephemeral: true }));
                    }
                    break;
                }
                // === УПРАВЛЕНИЕ ECONOMY ===
                case 'daily_bonus_modal': {
                    const minStr = interaction.fields.getTextInputValue('daily_bonus_amount_min').trim();
                    const maxStr = interaction.fields.getTextInputValue('daily_bonus_amount_max').trim();
                    const minBonus = parseInt(minStr, 10);
                    const maxBonus = parseInt(maxStr, 10);
                    if (isNaN(minBonus) || isNaN(maxBonus) ||
                        minBonus < 1 || maxBonus < minBonus || maxBonus > 1000000) {
                        await interaction.reply({
                            content: '❌ Минимум >= 1, максимум >= минимума и максимум <= 1 000 000.',
                            ephemeral: true
                        });
                        return;
                    }
                    await bot.settingsService.updateSetting(interaction.guild.id, 'economy.daily_bonus_min', minBonus);
                    await bot.settingsService.updateSetting(interaction.guild.id, 'economy.daily_bonus_max', maxBonus);
                    await interaction.reply({
                        content: `✅ Бонус обновлён: от **${minBonus}** до **${maxBonus}** монет.`,
                        ephemeral: true
                    });
                    break;
                }
                case 'weekly_bonus_modal': {
                    const minStr = interaction.fields.getTextInputValue('weekly_bonus_amount_min').trim();
                    const maxStr = interaction.fields.getTextInputValue('weekly_bonus_amount_max').trim();
                    const minBonus = parseInt(minStr, 10);
                    const maxBonus = parseInt(maxStr, 10);
                    if (isNaN(minBonus) || isNaN(maxBonus) ||
                        minBonus < 1 || maxBonus < minBonus || maxBonus > 1000000) {
                        await interaction.reply({
                            content: '❌ Минимум >= 1, максимум >= минимума и максимум <= 1 000 000.',
                            ephemeral: true
                        });
                        return;
                    }
                    await bot.settingsService.updateSetting(interaction.guild.id, 'economy.weekly_bonus_min', minBonus);
                    await bot.settingsService.updateSetting(interaction.guild.id, 'economy.weekly_bonus_max', maxBonus);
                    await interaction.reply({
                        content: `✅ Бонус обновлён: от **${minBonus}** до **${maxBonus}** монет.`,
                        ephemeral: true
                    });
                    break;
                }
                case 'shop_multiplier_modal': {
                    const value = interaction.fields.getTextInputValue('shop_multiplier').trim();
                    const multiplier = parseFloat(value);
                    if (isNaN(multiplier) || multiplier <= 0 || multiplier > 10) {
                        await interaction.reply({
                            content: '❌ Множитель должен быть числом от 0.01 до 10.',
                            ephemeral: true
                        });
                        return;
                    }
                    await bot.settingsService.updateSetting(interaction.guild.id, 'economy.prices_multiplier', multiplier);
                    await interaction.reply({
                        content: `✅ Множитель цен магазина обновлён: **${multiplier}x**`,
                        ephemeral: true
                    });
                    break;
                }
                case 'coins_currency_modal': {
                    const value = interaction.fields.getTextInputValue('coins_currency').trim();
                    if (!value || value.length < 1 || value.length > 20) {
                        await interaction.reply({
                            content: '❌ Название валюты должно быть от 1 до 20 символов.',
                            ephemeral: true
                        });
                        return;
                    }
                    await bot.settingsService.updateSetting(interaction.guild.id, 'economy.currency_name', value);
                    await interaction.reply({
                        content: `✅ Название валюты обновлено: **${value}**`,
                        ephemeral: true
                    });
                    break;
                }
                case 'confirm_reset_economy': {
                    try {
                        const guildId = interaction.guild.id;
                        const text = interaction.fields.getTextInputValue('confirm_text_economy')?.trim().toLowerCase();
                        if (text === 'да' || text === 'yes') {
                            await bot.settingsService.resetCategory(guildId, 'economy'); // удалит все keys вида "levels.%", инвалидирует кэш
                            await interaction.reply({ content: 'Настройки экономики сброшены.', ephemeral: true });
                        }
                        else {
                            await interaction.reply({ content: 'Сброс отменён.', ephemeral: true });
                        }
                    }
                    catch (err) {
                        await (interaction.replied || interaction.deferred
                            ? interaction.followUp({ content: 'Ошибка при сбросе настроек экономики.', ephemeral: true })
                            : interaction.reply({ content: 'Ошибка при сбросе настроек экономики.', ephemeral: true }));
                    }
                    break;
                }
                case 'coins_sign_modal': {
                    const value = interaction.fields.getTextInputValue('coins_sign').trim();
                    if (!value || value.length < 1 || value.length > 5) {
                        await interaction.reply({
                            content: '❌ Символ/эмодзи валюты должен быть от 1 до 5 символов.',
                            ephemeral: true
                        });
                        return;
                    }
                    await bot.settingsService.updateSetting(interaction.guild.id, 'economy.currency_emoji', value);
                    await interaction.reply({
                        content: `✅ Символ валюты обновлён: **${value}**`,
                        ephemeral: true
                    });
                    break;
                }
                // === УПРАВЛЕНИЕ BATTLEPASS ===
                case 'set_bp_levels_modal': {
                    const value = interaction.fields.getTextInputValue('set_bp_levels_value').trim();
                    const levels = Math.max(1, Math.floor(Number(value)));
                    if (isNaN(levels) || levels < 1) {
                        await interaction.reply({
                            content: '❌ Количество уровней должно быть целым положительным числом.', ephemeral: true
                        });
                        return;
                    }
                    await bot.settingsService.updateSetting(interaction.guild.id, 'battlepass.levels', levels);
                    await interaction.reply({
                        content: `✅ Количество уровней Battle Pass установлено на **${levels}**.`, ephemeral: true
                    });
                    break;
                }
                case 'set_bp_xp_for_levels_modal': {
                    const value = interaction.fields.getTextInputValue('bp_xp_for_levels_value').trim();
                    const xp = Math.max(1, Math.floor(Number(value)));
                    if (isNaN(xp) || xp < 1) {
                        await interaction.reply({
                            content: '❌ Требуемое XP должно быть положительным числом.', ephemeral: true
                        });
                        return;
                    }
                    await bot.settingsService.updateSetting(interaction.guild.id, 'battlepass.xp_for_level', xp);
                    await interaction.reply({
                        content: `✅ Требуемый XP для любого уровня теперь **${xp}**.`, ephemeral: true
                    });
                    break;
                }
                case 'add_bp_dailyquest_modal': {
                    const text = interaction.fields.getTextInputValue('daily_quest_text').trim();
                    const targetStr = interaction.fields.getTextInputValue('daily_quest_target')?.trim();
                    const rewardStr = interaction.fields.getTextInputValue('daily_quest_reward').trim();
                    const type = interaction.fields.getTextInputValue('daily_quest_type').trim().toLowerCase();
                    const gameType = interaction.fields.getTextInputValue('daily_quest_gametype')?.trim().toLowerCase();
                    const target = Math.max(1, Math.floor(Number(targetStr)));
                    const reward = Math.max(1, Math.floor(Number(rewardStr)));
                    // ---- Логические проверки ----
                    // Текст, числа
                    if (!text || isNaN(target) || target < 1 || isNaN(reward) || reward < 1) {
                        await interaction.reply({
                            content: '❌ Некорректная задача, количество или награда. Заполните все поля корректно.',
                            ephemeral: true
                        });
                        return;
                    }
                    // Если выбран не-игровой тип, но указан gameType — ошибка
                    const allowedTypes = ['messages', 'voice', 'streak', 'gift', 'invites', 'custom', 'game'];
                    if (!allowedTypes.includes(type)) {
                        await interaction.reply({
                            content: `❌ Неизвестный тип задачи: "${type}". Используйте только: messages, voice, streak, gift, invites, custom, game.`,
                            ephemeral: true
                        });
                        return;
                    }
                    if (type !== 'game' && gameType) {
                        await interaction.reply({
                            content: '❌ Параметр "Тип игры" допустим только для типа задачи "game".',
                            ephemeral: true
                        });
                        return;
                    }
                    if (type === 'game' && gameType && !['slots', 'dice', 'coin', 'duel'].includes(gameType)) {
                        await interaction.reply({
                            content: '❌ Параметр "Тип игры" может быть только: slots, dice, coin, duel.',
                            ephemeral: true
                        });
                        return;
                    }
                    const settings = await bot.settingsService.getGuildSettings(interaction.guild.id);
                    const quests = Array.isArray(settings.battlepass.daily_quests) ? settings.battlepass.daily_quests : [];
                    let questObj = { text, target, reward, type };
                    if (type === 'game') {
                        if (gameType)
                            questObj.gameType = gameType;
                    }
                    quests.push(questObj);
                    await bot.settingsService.updateSetting(interaction.guild.id, 'battlepass.daily_quests', quests);
                    await interaction.reply({
                        content: `✅ Ежедневное задание добавлено: ${text} (x${target}, ${reward}xp)`,
                        ephemeral: true
                    });
                    break;
                }
                case 'remove_bp_dailyquest_modal': {
                    const idxStr = interaction.fields.getTextInputValue('daily_quest_index')?.trim();
                    const idx = Number(idxStr);
                    if (isNaN(idx) || idx < 1) {
                        await interaction.reply({ content: '❌ Индекс должен быть целым числом ≥ 1.', ephemeral: true });
                        return;
                    }
                    const settings = await bot.settingsService.getGuildSettings(interaction.guild.id);
                    const quests = Array.isArray(settings.battlepass.daily_quests) ? settings.battlepass.daily_quests : [];
                    if (idx > quests.length) {
                        await interaction.reply({ content: `❌ Нет задания под номером ${idx}.`, ephemeral: true });
                        return;
                    }
                    const [removed] = quests.splice(idx - 1, 1);
                    await bot.settingsService.updateSetting(interaction.guild.id, 'battlepass.daily_quests', quests);
                    await interaction.reply({ content: `✅ Ежедневное задание удалено: ${removed?.text ?? "n/a"}`, ephemeral: true });
                    break;
                }
                case 'add_bp_weeklyquest_modal': {
                    const text = interaction.fields.getTextInputValue('weekly_quest_text').trim();
                    const targetStr = interaction.fields.getTextInputValue('weekly_quest_target')?.trim();
                    const rewardStr = interaction.fields.getTextInputValue('weekly_quest_reward').trim();
                    const type = interaction.fields.getTextInputValue('weekly_quest_type').trim().toLowerCase();
                    const gameType = interaction.fields.getTextInputValue('weekly_quest_gametype')?.trim().toLowerCase();
                    const target = Math.max(1, Math.floor(Number(targetStr)));
                    const reward = Math.max(1, Math.floor(Number(rewardStr)));
                    // ---- Логические проверки ----
                    if (!text || isNaN(target) || target < 1 || isNaN(reward) || reward < 1) {
                        await interaction.reply({
                            content: '❌ Некорректная задача, количество или награда. Заполните все поля корректно.',
                            ephemeral: true
                        });
                        return;
                    }
                    const allowedTypes = ['messages', 'voice', 'streak', 'gift', 'invites', 'custom', 'game'];
                    if (!allowedTypes.includes(type)) {
                        await interaction.reply({
                            content: `❌ Неизвестный тип задачи: "${type}". Используйте только: messages, voice, streak, gift, invites, custom, game.`,
                            ephemeral: true
                        });
                        return;
                    }
                    if (type !== 'game' && gameType) {
                        await interaction.reply({
                            content: '❌ Параметр "Тип игры" допустим только для типа задачи "game".',
                            ephemeral: true
                        });
                        return;
                    }
                    if (type === 'game' && gameType && !['slots', 'dice', 'coin', 'duel'].includes(gameType)) {
                        await interaction.reply({
                            content: '❌ Параметр "Тип игры" может быть только: slots, dice, coin, duel.',
                            ephemeral: true
                        });
                        return;
                    }
                    const settings = await bot.settingsService.getGuildSettings(interaction.guild.id);
                    const quests = Array.isArray(settings.battlepass.weekly_quests) ? settings.battlepass.weekly_quests : [];
                    let questObj = { text, target, reward, type };
                    if (type === 'game') {
                        if (gameType)
                            questObj.gameType = gameType;
                    }
                    quests.push(questObj);
                    await bot.settingsService.updateSetting(interaction.guild.id, 'battlepass.weekly_quests', quests);
                    await interaction.reply({
                        content: `✅ Еженедельное задание добавлено: ${text} (x${target}, ${reward}xp)`,
                        ephemeral: true
                    });
                    break;
                }
                case 'remove_bp_weeklyquest_modal': {
                    const idxStr = interaction.fields.getTextInputValue('weekly_quest_index')?.trim();
                    const idx = Number(idxStr);
                    if (isNaN(idx) || idx < 1) {
                        await interaction.reply({ content: '❌ Индекс должен быть целым числом ≥ 1.', ephemeral: true });
                        return;
                    }
                    const settings = await bot.settingsService.getGuildSettings(interaction.guild.id);
                    const quests = Array.isArray(settings.battlepass.weekly_quests) ? settings.battlepass.weekly_quests : [];
                    if (idx > quests.length) {
                        await interaction.reply({ content: `❌ Нет задания под номером ${idx}.`, ephemeral: true });
                        return;
                    }
                    const [removed] = quests.splice(idx - 1, 1);
                    await bot.settingsService.updateSetting(interaction.guild.id, 'battlepass.weekly_quests', quests);
                    await interaction.reply({ content: `✅ Еженедельное задание удалено: ${removed?.text ?? "n/a"}`, ephemeral: true });
                    break;
                }
                case 'add_bp_reward_modal': {
                    const levelStr = interaction.fields.getTextInputValue('bp_reward_level').trim();
                    const rewardText = interaction.fields.getTextInputValue('bp_reward_text').trim();
                    const type = interaction.fields.getTextInputValue('bp_reward_type').trim().toLowerCase();
                    const level = Math.max(1, Math.floor(Number(levelStr)));
                    if (!rewardText || isNaN(level) || level < 1) {
                        await interaction.reply({
                            content: '❌ Некорректный уровень или награда.',
                            ephemeral: true
                        });
                        return;
                    }
                    const settings = await bot.settingsService.getGuildSettings(interaction.guild.id);
                    let rewards = Array.isArray(settings.battlepass.rewards) ? settings.battlepass.rewards : [];
                    // Обновить если уже есть или добавить новый
                    rewards = rewards.filter(r => r.level !== level);
                    rewards.push({ level, reward: rewardText, type });
                    await bot.settingsService.updateSetting(interaction.guild.id, 'battlepass.rewards', rewards);
                    await interaction.reply({
                        content: `✅ Награда для уровня ${level} добавлена: ${rewardText}.`,
                        ephemeral: true
                    });
                    break;
                }
                case 'remove_bp_reward_modal': {
                    const levelStr = interaction.fields.getTextInputValue('bp_reward_level')?.trim();
                    const level = Math.floor(Number(levelStr));
                    if (isNaN(level) || level < 1) {
                        await interaction.reply({ content: '❌ Номер уровня должен быть целым числом ≥ 1.', ephemeral: true });
                        return;
                    }
                    const settings = await bot.settingsService.getGuildSettings(interaction.guild.id);
                    let rewards = Array.isArray(settings.battlepass.rewards) ? settings.battlepass.rewards : [];
                    const lenBefore = rewards.length;
                    rewards = rewards.filter(r => r.level !== level);
                    if (rewards.length === lenBefore) {
                        await interaction.reply({ content: `❌ Нет награды для уровня ${level}.`, ephemeral: true });
                        return;
                    }
                    await bot.settingsService.updateSetting(interaction.guild.id, 'battlepass.rewards', rewards);
                    await interaction.reply({ content: `✅ Награда для уровня ${level} удалена.`, ephemeral: true });
                    break;
                }
                case 'confirm_reset_battlepass': {
                    const text = interaction.fields.getTextInputValue('confirm_text_battlepass').trim().toLowerCase();
                    if (text === 'да' || text === 'yes') {
                        await bot.settingsService.resetCategory(interaction.guild.id, 'battlepass');
                        await interaction.reply({ content: 'Настройки Battle Pass сброшены.', ephemeral: true });
                    }
                    else {
                        await interaction.reply({ content: 'Сброс отменён.', ephemeral: true });
                    }
                    break;
                }
                // === УПРАВЛЕНИЕ СИСТЕМОЙ ===
                case 'set_timezone_modal': {
                    const value = interaction.fields.getTextInputValue('timezone_value').trim();
                    // Проверим, существует ли такая зона через luxon
                    try {
                        const test = luxon_1.DateTime.local().setZone(value);
                        if (!test.isValid)
                            throw new Error('Invalid timezone');
                        await bot.settingsService.updateSetting(interaction.guild.id, 'system.timezone', value);
                        await interaction.reply({
                            content: `✅ Таймзона успешно установлена: **${value}** (текущее время: ${test.toFormat('dd.MM.yyyy HH:mm')})`,
                            ephemeral: true
                        });
                    }
                    catch {
                        await interaction.reply({
                            content: '❌ Некорректная таймзона. Пример: Europe/Moscow, UTC, America/New_York',
                            ephemeral: true
                        });
                    }
                    break;
                }
                case 'set_language_modal': {
                    const value = interaction.fields.getTextInputValue('language_value').trim().toLowerCase();
                    // Список поддерживаемых языков
                    const allowed = ['ru', 'ua', 'uk'];
                    if (!allowed.includes(value)) {
                        await interaction.reply({
                            content: '❌ Такой язык не поддерживается. Примеры: ru, ua, uk',
                            ephemeral: true
                        });
                        return;
                    }
                    await bot.settingsService.updateSetting(interaction.guild.id, 'system.language', value);
                    await interaction.reply({
                        content: `✅ Язык интерфейса успешно установлен: **${value}**`,
                        ephemeral: true
                    });
                    break;
                }
                // === УПРАВЛЕНИЕ АДМИНИСТРИРОВАНИЕМ ===
                case 'admin_roles_modal': {
                    const value = interaction.fields.getTextInputValue('admin_roles').trim();
                    if (value.toLowerCase() === 'clear') {
                        await bot.settingsService.updateSetting(interaction.guild.id, 'admin.roles', []);
                        await interaction.reply({
                            content: '✅ Административные роли очищены.',
                            ephemeral: true
                        });
                        return;
                    }
                    const roleIds = value.split(' ').filter(id => id.length > 0);
                    const validRoles = [];
                    for (const id of roleIds) {
                        const role = interaction.guild.roles.cache.get(id);
                        if (role) {
                            validRoles.push(id);
                        }
                    }
                    if (validRoles.length === 0) {
                        await interaction.reply({
                            content: '❌ Не найдено ни одной действительной роли.',
                            ephemeral: true
                        });
                        return;
                    }
                    await bot.settingsService.updateSetting(interaction.guild.id, 'admin.roles', validRoles);
                    await interaction.reply({
                        content: `✅ Административные роли обновлены. Добавлено ${validRoles.length} ролей.`,
                        ephemeral: true
                    });
                    break;
                }
                case 'admin_users_modal': {
                    const value = interaction.fields.getTextInputValue('admin_users').trim();
                    if (value.toLowerCase() === 'clear') {
                        await bot.settingsService.updateSetting(interaction.guild.id, 'admin.users', []);
                        await interaction.reply({
                            content: '✅ Административные пользователи очищены.',
                            ephemeral: true
                        });
                        return;
                    }
                    const userIds = value.split(' ').filter(id => id.length > 0);
                    // Валидируем, что ID имеют правильный формат (Discord Snowflake)
                    const validUserIds = userIds.filter(id => /^\d{17,19}$/.test(id));
                    if (validUserIds.length === 0) {
                        await interaction.reply({
                            content: '❌ Не найдено ни одного действительного ID пользователя.',
                            ephemeral: true
                        });
                        return;
                    }
                    await bot.settingsService.updateSetting(interaction.guild.id, 'admin.users', validUserIds);
                    await interaction.reply({
                        content: `✅ Административные пользователи обновлены. Добавлено ${validUserIds.length} пользователей.`,
                        ephemeral: true
                    });
                    break;
                }
                case 'ignored_roles_modal': {
                    const value = interaction.fields.getTextInputValue('ignored_roles').trim();
                    if (value.toLowerCase() === 'clear') {
                        await bot.settingsService.updateSetting(interaction.guild.id, 'ignored_roles', []);
                        await interaction.reply({
                            content: '✅ Игнорируемые роли очищены.',
                            ephemeral: true
                        });
                        return;
                    }
                    const roleIds = value.split(' ').filter(id => id.length > 0);
                    const validRoles = [];
                    for (const id of roleIds) {
                        const role = interaction.guild.roles.cache.get(id);
                        if (role) {
                            validRoles.push(id);
                        }
                    }
                    if (validRoles.length === 0) {
                        await interaction.reply({
                            content: '❌ Не найдено ни одной действительной роли.',
                            ephemeral: true
                        });
                        return;
                    }
                    await bot.settingsService.updateSetting(interaction.guild.id, 'ignored_roles', validRoles);
                    await interaction.reply({
                        content: `✅ Игнорируемые роли обновлены. Добавлено ${validRoles.length} ролей.`,
                        ephemeral: true
                    });
                    break;
                }
                // === УПРАВЛЕНИЕ МОДЕРАЦИЕЙ ===
                case 'confirm_reset_moderation': {
                    try {
                        const guildId = interaction.guild.id;
                        const text = interaction.fields.getTextInputValue('confirm_text_moderation')?.trim().toLowerCase();
                        if (text === 'да' || text === 'yes') {
                            await bot.settingsService.resetCategory(guildId, 'moderation'); // удалит все keys вида "levels.%", инвалидирует кэш
                            await interaction.reply({ content: 'Настройки модерации сброшены.', ephemeral: true });
                        }
                        else {
                            await interaction.reply({ content: 'Сброс отменён.', ephemeral: true });
                        }
                    }
                    catch (err) {
                        await (interaction.replied || interaction.deferred
                            ? interaction.followUp({ content: 'Ошибка при сбросе настроек модерации.', ephemeral: true })
                            : interaction.reply({ content: 'Ошибка при сбросе настроек модерации.', ephemeral: true }));
                    }
                    break;
                }
                default:
                    logger_1.logger.warn(`Unhandled modal: ${customId}`);
                    await interaction.reply({
                        content: '❌ Неизвестная форма. Обратитесь к разработчику.',
                        ephemeral: true
                    });
            }
        }
        catch (error) {
            logger_1.logger.error(`Error handling modal ${customId}:`, error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '❌ Произошла ошибка при сохранении настройки.',
                    ephemeral: true
                });
            }
        }
    }
};
//# sourceMappingURL=modalSubmit.js.map