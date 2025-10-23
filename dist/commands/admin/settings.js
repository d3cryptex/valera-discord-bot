"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.data = void 0;
exports.execute = execute;
exports.showBPLevelsModal = showBPLevelsModal;
exports.showBPXpForLevelsModal = showBPXpForLevelsModal;
exports.showBPDailyQuestModal = showBPDailyQuestModal;
exports.showRemoveBPDailyQuestModal = showRemoveBPDailyQuestModal;
exports.showBPWeeklyQuestModal = showBPWeeklyQuestModal;
exports.showRemoveBPWeeklyQuestModal = showRemoveBPWeeklyQuestModal;
exports.showBPRewardModal = showBPRewardModal;
exports.showRemoveBPRewardModal = showRemoveBPRewardModal;
exports.resetBattlepassModal = resetBattlepassModal;
const discord_js_1 = require("discord.js");
const SettingsService_1 = require("../../services/settings/SettingsService");
const logger_1 = require("../../utils/logger");
const activeCollectors = new Map();
exports.data = new discord_js_1.SlashCommandBuilder()
    .setName('settings')
    .setDescription('Настройки сервера');
async function execute(interaction, bot) {
    const settingsService = new SettingsService_1.SettingsService(bot.database, bot.redis);
    // Проверяем права
    const member = interaction.member;
    const guildSettings = await settingsService.getGuildSettings(interaction.guild.id);
    if (!await settingsService.hasPermission(member, guildSettings)) {
        const embed = new discord_js_1.EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ Недостаточно прав')
            .setDescription('Только администраторы сервера могут изменять настройки.\n' +
            '**Кто может управлять настройками:**\n' +
            '• Владелец сервера\n' +
            '• Пользователи с правами Administrator\n' +
            '• Роли/пользователи из списка администраторов бота');
        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
    }
    await showAllSettings(interaction, bot, settingsService);
}
async function showAllSettings(interaction, bot, settingsService) {
    if (interaction.isButton()) {
        const i = interaction;
        if (!i.deferred && !i.replied) {
            await i.deferUpdate();
        }
    }
    else if (interaction.isStringSelectMenu()) {
        const i = interaction;
        if (!i.deferred && !i.replied) {
            await i.deferUpdate();
        }
    }
    else if (interaction.isChatInputCommand()) {
        const i = interaction;
        if (!i.deferred && !i.replied) {
            await i.deferReply();
        }
    }
    try {
        const settings = await settingsService.getGuildSettings(interaction.guild.id);
        const embed = new discord_js_1.EmbedBuilder()
            .setColor('#0099FF')
            .setTitle('⚙️ Настройки сервера')
            .setDescription(`Обзор всех настроек для **${interaction.guild.name}**`)
            .addFields([
            {
                name: '📊 Система уровней',
                value: `• Система: ${settings.levels.enabled ? '`🟢 Вкл.`' : '`🔴 Выкл`'}\n` +
                    `• Опыт за текст: ${settings.levels.text_xp ? '`🟢 Вкл.`' : '`🔴 Выкл`'}\n` +
                    `• Опыт за войс: ${settings.levels.voice_xp ? '`🟢 Вкл.`' : '`🔴 Выкл`'}\n` +
                    `• Множитель XP: \`${settings.levels.xp_multiplier}x\``,
                inline: true
            },
            {
                name: '🤖 AI-чат',
                value: `• Система: ${settings.ai.enabled ? '`🟢 Вкл.`' : '`🔴 Выкл`'}\n` +
                    `• Шанс ответа: \`${(settings.ai.response_chance * 100)}%\`\n` +
                    `• Кулдаун: \`${settings.ai.cooldown}с\`\n` +
                    `• Длина ответа: \`${settings.ai.min_words}-${settings.ai.max_words} слов\``,
                inline: true
            },
            {
                name: '💰 Экономика',
                value: `• Магазин: ${settings.economy.shop_enabled ? '`🟢 Вкл.`' : '`🔴 Выкл`'}\n` +
                    `• Ежед. бонус: ${settings.economy.daily_bonus_enabled ? '`🟢 Вкл.`' : '`🔴 Выкл`'}\n` +
                    `• Размер бонуса: \`От ${settings.economy.daily_bonus_max} до ${settings.economy.daily_bonus_min} монет\`\n` +
                    `• Множитель цен: \`${settings.economy.prices_multiplier}x\``,
                inline: true
            },
            {
                name: '👮 Администрирование',
                value: `• Админ ролей: \`${settings.admin.roles.length}\`\n` +
                    `• Админ пользователей: \`${settings.admin.users.length}\`\n`,
                inline: true
            },
            {
                name: '📢 Каналы',
                value: `• AI-каналы: \`${settings.ai.channels.length || '🌐 Все'}\`\n` +
                    `• Каналы для текстового XP: \`${settings.levels.xp_text.length || '🌐 Все'}\`\n` +
                    `• Каналы для голосового XP: \`${settings.levels.xp_voice.length || '🌐 Все'}\`\n` +
                    `• Игнорируемые каналы: \`${settings.levels.ignored.length != 0 ? settings.levels.ignored.length : '❌ Нету'}\``,
                inline: true
            },
            {
                name: '🛡️ Модерация',
                value: `• Автомодер.: ${settings.moderation.enabled ? '`🟢 Вкл.`' : '`🔴 Выкл`'}\n` +
                    `• Защита от спама: ${settings.moderation.spam_protection ? '`🟢 Вкл.`' : '`🔴 Выкл`'}\n` +
                    `• Фильтр мата: ${settings.moderation.profanity_filter ? '`🟢 Вкл.`' : '`🔴 Выкл`'}`,
                inline: true
            }
        ])
            .addFields([
            {
                name: '📝 Сообщения',
                value: `• Уведомления о повышении: ${settings.levels.levelup_messages ? '`🟢 Вкл.`' : '`🔴 Выкл`'}\n` +
                    `• Канал уведомлений: \`${settings.levels.levelup_channel ? `<#${settings.levels.levelup_channel}>` : '🗒️ Там же'}\`\n`,
                inline: true
            },
            {
                name: '🔰 BattlePass',
                value: `• Статус: ${settings.battlepass.enabled ? '`🟢 Вкл.`' : '`🔴 Выкл`'}\n` +
                    `• Уровней: \`${settings.battlepass.levels}\`\n` +
                    `• XP за уровень: \`${settings.battlepass.xp_for_level || '100'}\`\n` +
                    `• Ежедневных задач: \`${settings.battlepass.daily_quests?.length ?? 0}\`\n` +
                    `• Еженедельных задач: \`${settings.battlepass.weekly_quests?.length ?? 0}\`\n` +
                    `• Наград: \`${settings.battlepass.rewards?.length ?? 0}\``,
                inline: true
            }
        ])
            .setFooter({
            text: `Версия: ${settings.system.version} | Язык: ${settings.system.language} | Часовой пояс: ${settings.system.timezone}`,
            iconURL: interaction.client.user.displayAvatarURL()
        })
            .setTimestamp();
        const selectMenu = new discord_js_1.ActionRowBuilder()
            .addComponents(new discord_js_1.StringSelectMenuBuilder()
            .setCustomId('settings_category_select')
            .setPlaceholder('🎛️ Выберите категорию для настройки')
            .addOptions([
            {
                label: 'Система уровней',
                value: 'levels',
                description: 'Настройка опыта и уровней',
                emoji: '📊'
            },
            {
                label: 'AI-чат',
                value: 'ai',
                description: 'Настройка искусственного интеллекта',
                emoji: '🤖'
            },
            {
                label: 'Администрирование',
                value: 'admin',
                description: 'Управление правами доступа',
                emoji: '👮'
            },
            {
                label: 'Экономика',
                value: 'economy',
                description: 'Настройка магазина и бонусов',
                emoji: '💰'
            },
            {
                label: 'BattlePass',
                value: 'battlepass',
                description: 'Настройка battlepass',
                emoji: '🔰'
            },
            {
                label: 'Модерация',
                value: 'moderation',
                description: 'Автомодерация и фильтры',
                emoji: '🛡️'
            },
            {
                label: 'Система',
                value: 'system',
                description: 'Основные настройки бота',
                emoji: '⚙️'
            },
            {
                label: 'Сбросить все настройки',
                value: 'reset',
                description: 'Сброс всех настроек бота',
                emoji: '🔁'
            }
        ]));
        let targetMessage;
        if (interaction.isButton() || interaction.isStringSelectMenu()) {
            const i = interaction;
            // редактируем исходный месседж с компонентом
            await i.message.edit({
                embeds: [embed],
                components: [selectMenu],
            });
            targetMessage = i.message;
        }
        else {
            const i = interaction;
            // редактируем ответ слэш-команды
            await i.editReply({
                embeds: [embed],
                components: [selectMenu],
            });
            targetMessage = await i.fetchReply();
        }
        // далее — создание коллектора на targetMessage без изменений
        const collector = targetMessage.createMessageComponentCollector({
            componentType: discord_js_1.ComponentType.StringSelect,
            time: 300000,
        });
        if (activeCollectors.has(interaction.user.id)) {
            activeCollectors.get(interaction.user.id).stop('new_menu');
            activeCollectors.delete(interaction.user.id);
        }
        activeCollectors.set(interaction.user.id, collector);
        collector.on('collect', async (selectInteraction) => {
            if (activeCollectors.has(interaction.user.id)) {
                activeCollectors.get(interaction.user.id).stop('collected');
                activeCollectors.delete(interaction.user.id);
            }
            if (selectInteraction.user.id !== interaction.user.id) {
                await selectInteraction.reply({
                    content: '❌ Только автор команды может использовать это меню.',
                    ephemeral: true
                });
                return;
            }
            const category = selectInteraction.values[0];
            try {
                switch (category) {
                    case 'levels':
                        await showLevelSettings(selectInteraction, bot, settingsService);
                        break;
                    case 'ai':
                        await showAISettings(selectInteraction, bot, settingsService);
                        break;
                    case 'admin':
                        await showAdminSettings(selectInteraction, bot, settingsService);
                        break;
                    case 'economy':
                        await showEconomySettings(selectInteraction, bot, settingsService);
                        break;
                    case 'battlepass':
                        await showBattlePassSettings(selectInteraction, bot, settingsService);
                        break;
                    case 'moderation':
                        await showModerationSettings(selectInteraction, bot, settingsService);
                        break;
                    case 'system':
                        await showSystemSettings(selectInteraction, bot, settingsService);
                        break;
                    case 'reset':
                        await resetSettings(selectInteraction, bot, settingsService);
                        break;
                }
            }
            catch (error) {
                logger_1.logger.error('Error handling settings category:', error);
                // Правильно обрабатываем ошибку
                if (!selectInteraction.replied && !selectInteraction.deferred) {
                    await selectInteraction.reply({
                        content: '❌ Произошла ошибка при загрузке настроек.',
                        ephemeral: true
                    });
                }
            }
        });
        collector.on('end', async () => {
            try {
                await interaction.editReply({ components: [] });
            }
            catch { }
        });
    }
    catch (error) {
        logger_1.logger.error('Error showing all settings:', error);
        await interaction.editReply({
            content: '❌ Произошла ошибка при загрузке настроек.',
            components: []
        });
    }
}
async function showLevelSettings(interaction, bot, settingsService) {
    if (interaction.isButton() || interaction.isStringSelectMenu()) {
        if (!interaction.deferred && !interaction.replied) {
            await interaction.deferUpdate();
        }
    }
    try {
        const settings = await settingsService.getGuildSettings(interaction.guild.id);
        const embed = new discord_js_1.EmbedBuilder()
            .setColor('#00BFFF') // Голубой для современного техно-стиля
            .setTitle('Настройки системы уровней')
            .addFields([
            {
                name: '⚒️ Статус системы',
                value: `**Система**: ${settings.levels.enabled ? '`🟢 Включена`' : '`🔴 Выключена`'}\n`
                    + `**Опыт в чатах:** ${settings.levels.text_xp ? '`🟢 Включен`' : '`🔴 Выключен`'}\n`
                    + `**Опыт в войсе:** ${settings.levels.voice_xp ? '`🟢 Включен`' : '`🔴 Выключен`'}\n`
                    + `**Левелап-уведомления:** ${settings.levels.levelup_messages ? '`🟢 Включен`' : '`🔴 Выключен`'}\n`
                    + `**Мин. размер сообщения:** \`${settings.levels.min_message_length} символ(ов)\``,
                inline: true
            },
            {
                name: '⚙️ Множители и награды',
                value: `**Текст XP:** \`${settings.levels.xp_multiplier}x\`\n`
                    + `**Войс XP:** \`${settings.levels.voice_xp_multiplier}x\`\n`
                    + `**Монет:** \`${settings.levels.coins_multiplier}x\``,
                inline: true,
            },
            {
                name: '📢 Канал уведомлений',
                value: settings.levels.levelup_channel
                    ? `<#${settings.levels.levelup_channel}>`
                    : '_Используется текущий канал_',
                inline: false,
            },
            {
                name: '🗂️ Ограничения',
                value: `**Текстовые каналы:** \`${settings.levels.xp_text.length ? settings.levels.xp_text.length : '🌐 Все\`'}\n`
                    + `**Голосовые каналы:** \`${settings.levels.xp_voice.length ? settings.levels.xp_voice.length : '🌐 Все\`'}\n`
                    + `**Игнорируемые каналы:** \`${settings.levels.ignored.length != 0 ? settings.levels.ignored.length : '❌ Нету\`'}\n`
                    + `**Игнорируемые роли:** \`${settings.levels.ignored_roles.length != 0 ? settings.levels.ignored_roles.length : '❌ Нету\`'}\n`
                    + `**Игнорируемые пользователи:** \`${settings.levels.ignored_users.length != 0 ? settings.levels.ignored_users.length : '❌ Нету\`'}\n`,
                inline: false
            }
        ])
            .setFooter({
            text: 'ℹ️ Здесь вы управляете системой уровней на сервере.\nВключайте/отключайте XP, регулируйте множители, настраивайте канал уведомлений и права на заработок опыта.'
        });
        const buttons = new discord_js_1.ActionRowBuilder()
            .addComponents(new discord_js_1.ButtonBuilder()
            .setCustomId('toggle_levels_system')
            .setLabel(settings.levels.enabled ? 'Выкл. систему' : 'Вкл. систему')
            .setStyle(settings.levels.enabled ? discord_js_1.ButtonStyle.Danger : discord_js_1.ButtonStyle.Success)
            .setEmoji(settings.levels.enabled ? '🔴' : '🟢'), new discord_js_1.ButtonBuilder()
            .setCustomId('toggle_text_xp')
            .setLabel(settings.levels.text_xp ? 'Выкл. текст XP' : 'Вкл. текст XP')
            .setStyle(settings.levels.text_xp ? discord_js_1.ButtonStyle.Secondary : discord_js_1.ButtonStyle.Primary)
            .setEmoji('💬')
            .setDisabled(!settings.levels.enabled), new discord_js_1.ButtonBuilder()
            .setCustomId('toggle_voice_xp')
            .setLabel(settings.levels.voice_xp ? 'Выкл. войс XP' : 'Вкл. войс XP')
            .setStyle(settings.levels.voice_xp ? discord_js_1.ButtonStyle.Secondary : discord_js_1.ButtonStyle.Primary)
            .setEmoji('🎤')
            .setDisabled(!settings.levels.enabled), new discord_js_1.ButtonBuilder()
            .setCustomId('toggle_levelup_notifications')
            .setLabel(settings.levels.levelup_messages ? 'Выкл. левелап-уведомления' : 'Вкл. левелап-уведомления')
            .setStyle(settings.levels.levelup_messages ? discord_js_1.ButtonStyle.Secondary : discord_js_1.ButtonStyle.Primary)
            .setEmoji(settings.levels.levelup_messages ? '🔕' : '🔔')
            .setDisabled(!settings.levels.enabled));
        const buttons2 = new discord_js_1.ActionRowBuilder()
            .addComponents(new discord_js_1.ButtonBuilder()
            .setCustomId('set_min_text_xp')
            .setLabel('Мин. слов для XP')
            .setStyle(discord_js_1.ButtonStyle.Secondary)
            .setEmoji('✒️')
            .setDisabled(!settings.levels.enabled), new discord_js_1.ButtonBuilder()
            .setCustomId('set_xp_text_multiplier')
            .setLabel('Множитель текст XP')
            .setStyle(discord_js_1.ButtonStyle.Secondary)
            .setEmoji('💬')
            .setDisabled(!settings.levels.enabled), new discord_js_1.ButtonBuilder()
            .setCustomId('set_xp_voice_multiplier')
            .setLabel('Множитель войс XP')
            .setStyle(discord_js_1.ButtonStyle.Secondary)
            .setEmoji('🎙️')
            .setDisabled(!settings.levels.enabled), new discord_js_1.ButtonBuilder()
            .setCustomId('set_coins_multiplier')
            .setLabel('Множитель монет')
            .setStyle(discord_js_1.ButtonStyle.Secondary)
            .setEmoji('🪙')
            .setDisabled(!settings.levels.enabled));
        const buttons3 = new discord_js_1.ActionRowBuilder()
            .addComponents(new discord_js_1.ButtonBuilder()
            .setCustomId('set_levelup_channel')
            .setLabel('Канал уведомлений')
            .setStyle(discord_js_1.ButtonStyle.Primary)
            .setEmoji('📢')
            .setDisabled(!settings.levels.enabled), new discord_js_1.ButtonBuilder()
            .setCustomId('manage_text_xp_channels')
            .setLabel('Текст XP каналы')
            .setStyle(discord_js_1.ButtonStyle.Secondary)
            .setEmoji('💬')
            .setDisabled(!settings.levels.enabled), new discord_js_1.ButtonBuilder()
            .setCustomId('manage_voice_xp_channels')
            .setLabel('Войс XP каналы')
            .setStyle(discord_js_1.ButtonStyle.Secondary)
            .setEmoji('🎤')
            .setDisabled(!settings.levels.enabled));
        const buttons4 = new discord_js_1.ActionRowBuilder()
            .addComponents(new discord_js_1.ButtonBuilder()
            .setCustomId('manage_ignored_channels')
            .setLabel('Игнор. каналы')
            .setStyle(discord_js_1.ButtonStyle.Secondary)
            .setEmoji('🚫')
            .setDisabled(!settings.levels.enabled), new discord_js_1.ButtonBuilder()
            .setCustomId('manage_ignored_roles')
            .setLabel('Игнор. роли')
            .setStyle(discord_js_1.ButtonStyle.Secondary)
            .setEmoji('🗂️')
            .setDisabled(!settings.levels.enabled), new discord_js_1.ButtonBuilder()
            .setCustomId('manage_ignored_users')
            .setLabel('Игнор. пользователи')
            .setStyle(discord_js_1.ButtonStyle.Secondary)
            .setEmoji('👤')
            .setDisabled(!settings.levels.enabled));
        const buttons5 = new discord_js_1.ActionRowBuilder()
            .addComponents(new discord_js_1.ButtonBuilder()
            .setCustomId('reset_levels')
            .setLabel('Сбросить настройки')
            .setStyle(discord_js_1.ButtonStyle.Danger)
            .setEmoji('🔁'), new discord_js_1.ButtonBuilder()
            .setCustomId('back_to_main')
            .setLabel('Назад')
            .setStyle(discord_js_1.ButtonStyle.Secondary)
            .setEmoji('🔙'));
        await interaction.editReply({ embeds: [embed], components: [buttons, buttons2, buttons3, buttons4, buttons5] });
        // Создаем коллектор для обработки кнопок
        setupButtonCollector(interaction, bot, settingsService, 'levels');
    }
    catch (error) {
        logger_1.logger.error('Error showing level settings:', error);
        await interaction.editReply({
            content: '❌ Произошла ошибка при загрузке настроек уровней.',
            components: []
        });
    }
}
async function showAISettings(interaction, bot, settingsService) {
    if (interaction.isButton() || interaction.isStringSelectMenu()) {
        if (!interaction.deferred && !interaction.replied) {
            await interaction.deferUpdate();
        }
    }
    try {
        const settings = await settingsService.getGuildSettings(interaction.guild.id);
        const embed = new discord_js_1.EmbedBuilder()
            .setColor('#9932CC')
            .setTitle('🤖 Настройки AI-чата')
            .setDescription('Настройка искусственного интеллекта на основе Markov Chain')
            .addFields([
            {
                name: '⚒️ Основные настройки',
                value: `• **AI-чат:** ${settings.ai.enabled ? '`🟢 Включен`' : '`🔴 Выключен`'}\n` +
                    `• **Шанс ответа:** \`${(settings.ai.response_chance * 100).toFixed(1)}%\`\n` +
                    `• **Кулдаун между ответами:** \`${settings.ai.cooldown} секунд\``,
                inline: false
            },
            {
                name: '📝 Параметры генерации',
                value: `• **Минимум слов в ответе:** \`${settings.ai.min_words}\`\n` +
                    `• **Максимум слов в ответе:** \`${settings.ai.max_words}\``,
                inline: true
            },
            {
                name: '📢 Активные каналы',
                value: `• **AI работает в:** \`${settings.ai.channels.length ? `${settings.ai.channels.length} каналах` : '🌐 Все'}\`\n` +
                    `• **Игнорируемые каналы:** \`${settings.ai.ignored_channels.length != 0 ? settings.ai.ignored_channels.length : '❌ Нету\`'}`,
                inline: true
            }
        ])
            .setFooter({
            text: 'ℹ️ AI обучается на сообщениях пользователей и генерирует ответы, имитируя стиль общения сервера. Использует алгоритм Markov Chain для создания связных предложений.'
        });
        ;
        const buttons = new discord_js_1.ActionRowBuilder()
            .addComponents(new discord_js_1.ButtonBuilder()
            .setCustomId('toggle_ai_system')
            .setLabel(settings.ai.enabled ? 'Выключить AI' : 'Включить AI')
            .setStyle(settings.ai.enabled ? discord_js_1.ButtonStyle.Danger : discord_js_1.ButtonStyle.Success)
            .setEmoji(settings.ai.enabled ? '🔴' : '🟢'), new discord_js_1.ButtonBuilder()
            .setCustomId('set_ai_chance')
            .setLabel('Изменить шанс ответа')
            .setStyle(discord_js_1.ButtonStyle.Primary)
            .setEmoji('🎲')
            .setDisabled(!settings.ai.enabled), new discord_js_1.ButtonBuilder()
            .setCustomId('set_ai_cooldown')
            .setLabel('Изменить кулдаун')
            .setStyle(discord_js_1.ButtonStyle.Secondary)
            .setEmoji('⏱️')
            .setDisabled(!settings.ai.enabled));
        const buttons2 = new discord_js_1.ActionRowBuilder()
            .addComponents(new discord_js_1.ButtonBuilder()
            .setCustomId('set_ai_words')
            .setLabel('Длина ответов')
            .setStyle(discord_js_1.ButtonStyle.Secondary)
            .setEmoji('📏')
            .setDisabled(!settings.ai.enabled), new discord_js_1.ButtonBuilder()
            .setCustomId('set_ai_channel')
            .setLabel('Каналы')
            .setStyle(discord_js_1.ButtonStyle.Secondary)
            .setEmoji('📝')
            .setDisabled(!settings.ai.enabled), new discord_js_1.ButtonBuilder()
            .setCustomId('set_ai_ignoredchannel')
            .setLabel('Игнорируемые каналы')
            .setStyle(discord_js_1.ButtonStyle.Secondary)
            .setEmoji('🔕')
            .setDisabled(!settings.ai.enabled));
        const buttons3 = new discord_js_1.ActionRowBuilder()
            .addComponents(new discord_js_1.ButtonBuilder()
            .setCustomId('test_ai_response')
            .setLabel('Тестовый ответ')
            .setStyle(discord_js_1.ButtonStyle.Primary)
            .setEmoji('🧪')
            .setDisabled(!settings.ai.enabled), new discord_js_1.ButtonBuilder()
            .setCustomId('reset_ai')
            .setLabel('Сбросить настройки')
            .setStyle(discord_js_1.ButtonStyle.Secondary)
            .setEmoji('🔁'), new discord_js_1.ButtonBuilder()
            .setCustomId('back_to_main')
            .setLabel('Назад')
            .setStyle(discord_js_1.ButtonStyle.Secondary)
            .setEmoji('🔙'));
        await interaction.editReply({ embeds: [embed], components: [buttons, buttons2, buttons3] });
        // Создаем коллектор для обработки кнопок
        setupButtonCollector(interaction, bot, settingsService, 'ai');
    }
    catch (error) {
        logger_1.logger.error('Error showing AI settings:', error);
        const errorOptions = {
            content: 'Произошла ошибка при загрузке настроек AI.',
            components: []
        };
        if (interaction.replied || interaction.deferred) {
            await interaction.editReply(errorOptions);
        }
        else {
            await interaction.reply(errorOptions);
        }
    }
}
const timezoneExamples = [
    '`Europe/Moscow`',
    '`Europe/Kiev`',
    '`Europe/London`',
    '`America/New_York`',
    '`America/Los_Angeles`',
    '`Asia/Almaty`',
    '`Asia/Tokyo`',
    '`UTC`',
];
async function showSystemSettings(interaction, bot, settingsService) {
    if (interaction.isButton() || interaction.isStringSelectMenu()) {
        if (!interaction.deferred && !interaction.replied) {
            await interaction.deferUpdate();
        }
    }
    try {
        const settings = await settingsService.getGuildSettings(interaction.guild.id);
        const embed = new discord_js_1.EmbedBuilder()
            .setColor('#FF9800')
            .setTitle('⚙️ Настройки системы')
            .setDescription('Общие системные параметры для работы бота')
            .addFields([
            {
                name: '🆚 Версия',
                value: `\`${settings.system.version}\``,
                inline: true
            },
            {
                name: '🌐 Временная зона',
                value: `\`${settings.system.timezone}\`\n[Полный список таймзон](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones)`,
                inline: true
            },
            {
                name: '🗣️ Язык интерфейса',
                value: `\`${settings.system.language}\``,
                inline: true
            }
        ])
            .setFooter({
            text: 'ℹ️ • Префикс влияет на запуск текстовых команд\n• Таймзона влияет на отображение времени событий и статистик\n• Язык влияет на сообщения от бота\n• Изменить можно через соответствующие кнопки ниже'
        });
        const buttons = new discord_js_1.ActionRowBuilder()
            .addComponents(new discord_js_1.ButtonBuilder()
            .setCustomId('set_timezone')
            .setLabel('Изменить таймзону')
            .setStyle(discord_js_1.ButtonStyle.Secondary)
            .setEmoji('🌐'), new discord_js_1.ButtonBuilder()
            .setCustomId('set_language')
            .setLabel('Изменить язык')
            .setStyle(discord_js_1.ButtonStyle.Secondary)
            .setEmoji('🗣️'));
        const buttons2 = new discord_js_1.ActionRowBuilder()
            .addComponents(new discord_js_1.ButtonBuilder()
            .setCustomId('back_to_main')
            .setLabel('Назад')
            .setStyle(discord_js_1.ButtonStyle.Secondary)
            .setEmoji('🔙'));
        await interaction.editReply({ embeds: [embed], components: [buttons, buttons2] });
        setupButtonCollector(interaction, bot, settingsService, 'system');
    }
    catch (error) {
        logger_1.logger.error('Error showing system settings:', error);
        await interaction.editReply({
            content: '❌ Произошла ошибка при загрузке системных настроек.',
            components: []
        });
    }
}
const formatHistory = (history) => {
    if (!history || history.length === 0)
        return 'История пуста';
    return history
        .slice(-5) // показываем только 5 последних
        .map(item => `• [${item.date}] <@${item.userId}>: ${item.action}`).join('\n');
};
async function showAdminSettings(interaction, bot, settingsService) {
    if (interaction.isButton() || interaction.isStringSelectMenu()) {
        if (!interaction.deferred && !interaction.replied) {
            await interaction.deferUpdate();
        }
    }
    try {
        const settings = await settingsService.getGuildSettings(interaction.guild.id);
        // Форматируем списки ролей и пользователей
        const formatRoleList = (roles) => {
            return roles.length > 0 ? roles.map(id => `<@&${id}>`).join(' ') : 'Не настроено';
        };
        const formatUserList = (users) => {
            return users.length > 0 ? users.map(id => `<@${id}>`).join(' ') : 'Не настроено';
        };
        const embed = new discord_js_1.EmbedBuilder()
            .setColor('#FF6B6B')
            .setTitle('👮 Настройки администрирования')
            .setDescription('Управление правами доступа к настройкам бота')
            .addFields([
            {
                name: '👑 Автоматические права',
                value: '• **Владелец сервера** - полный доступ\n• **Роли с правом Administrator** - полный доступ',
                inline: false
            },
            {
                name: '🛡️ Административные роли',
                value: `**Роли с правами админа бота:**\n${formatRoleList(settings.admin.roles)}`,
                inline: false
            },
            {
                name: '👤 Административные пользователи',
                value: `**Пользователи с правами админа бота:**\n${formatUserList(settings.admin.users)}`,
                inline: false
            }
        ])
            .setFooter({
            text: 'ℹ️ Права администратора бота\n• Изменение всех настроек\n• Управление магазином\n• Сброс данных\n• Управление AI\n• Модерация функций'
        });
        const buttons = new discord_js_1.ActionRowBuilder()
            .addComponents(new discord_js_1.ButtonBuilder()
            .setCustomId('manage_admin_roles')
            .setLabel('Управление ролями')
            .setStyle(discord_js_1.ButtonStyle.Primary)
            .setEmoji('🛡️'), new discord_js_1.ButtonBuilder()
            .setCustomId('manage_admin_users')
            .setLabel('Управление пользователями')
            .setStyle(discord_js_1.ButtonStyle.Primary)
            .setEmoji('👤'));
        const buttons2 = new discord_js_1.ActionRowBuilder()
            .addComponents(new discord_js_1.ButtonBuilder()
            .setCustomId('reset_admin')
            .setLabel('Сбросить настройки')
            .setStyle(discord_js_1.ButtonStyle.Danger)
            .setEmoji('🔁'), new discord_js_1.ButtonBuilder()
            .setCustomId('back_to_main')
            .setLabel('Назад')
            .setStyle(discord_js_1.ButtonStyle.Secondary)
            .setEmoji('🔙'));
        await interaction.editReply({ embeds: [embed], components: [buttons, buttons2] });
        // Создаем коллектор для обработки кнопок
        setupButtonCollector(interaction, bot, settingsService, 'admin');
    }
    catch (error) {
        logger_1.logger.error('Error showing channel settings:', error);
        await interaction.editReply({
            content: '❌ Произошла ошибка при загрузке админ настроек.',
            components: []
        });
    }
}
async function showEconomySettings(interaction, bot, settingsService) {
    if (interaction.isButton() || interaction.isStringSelectMenu()) {
        if (!interaction.deferred && !interaction.replied) {
            await interaction.deferUpdate();
        }
    }
    try {
        const settings = await settingsService.getGuildSettings(interaction.guild.id);
        const embed = new discord_js_1.EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('💰 Настройки экономики')
            .setDescription('Управление внутриигровой экономикой сервера')
            .addFields([
            {
                name: '🏪 Магазин',
                value: `• **Статус:** ${settings.economy.shop_enabled ? '`🟢 Включен`' : '`🔴 Выключен`'}\n` +
                    `• **Множитель цен:** \`${settings.economy.prices_multiplier}x\`\n` +
                    `• **Название валюты:** \`${settings.economy.currency_name}\`\n` +
                    `• **Знак валюты:** \`${settings.economy.currency_emoji}\``,
                inline: true
            },
            {
                name: '🎁 Ежедневные бонусы',
                value: `• **Статус:** ${settings.economy.daily_bonus_enabled ? '`🟢 Включены`' : '`🔴 Выключены`'}\n` +
                    `• **Размер бонуса: от ** \`${settings.economy.daily_bonus_max} до ${settings.economy.daily_bonus_min} монет\`\n` +
                    `• **Серия ежедневных бонусов:** ${settings.economy.streak_enabled ? '`🟢 Включена`' : '`🔴 Выключена`'}`,
                inline: true
            },
            {
                name: '🏆 Еженедельные бонусы',
                value: `• **Статус:** ${settings.economy.weekly_bonus_enabled ? '`🟢 Включены`' : '`🔴 Выключены`'}\n` +
                    `• **Размер бонуса: от ** \`${settings.economy.weekly_bonus_max} до ${settings.economy.weekly_bonus_min} монет\``,
                inline: true
            },
            {
                name: '💎 Источники монет',
                value: '• Повышение уровня\n• Ежедневные бонусы (если включены)\n• Покупки в магазине (тратятся)\n• События и награды',
                inline: false
            },
            {
                name: 'ℹ️ Как работает экономика',
                value: 'Пользователи зарабатывают монеты за активность и могут тратить их в магазине на роли, привилегии и другие товары. Администраторы могут настроить товары через отдельные команды.',
                inline: false
            }
        ]);
        const buttons = new discord_js_1.ActionRowBuilder()
            .addComponents(new discord_js_1.ButtonBuilder()
            .setCustomId('toggle_shop')
            .setLabel(settings.economy.shop_enabled ? 'Выкл. магазин' : 'Вкл. магазин')
            .setStyle(settings.economy.shop_enabled ? discord_js_1.ButtonStyle.Danger : discord_js_1.ButtonStyle.Success)
            .setEmoji(settings.economy.shop_enabled ? '🔴' : '🟢'), new discord_js_1.ButtonBuilder()
            .setCustomId('set_shop_multiplier')
            .setLabel('Множитель цен')
            .setStyle(discord_js_1.ButtonStyle.Secondary)
            .setEmoji('⚡')
            .setDisabled(!settings.economy.shop_enabled), new discord_js_1.ButtonBuilder()
            .setCustomId('set_coins_name')
            .setLabel('Название валюты')
            .setStyle(discord_js_1.ButtonStyle.Secondary)
            .setEmoji('💸')
            .setDisabled(!settings.economy.shop_enabled), new discord_js_1.ButtonBuilder()
            .setCustomId('set_coins_sign')
            .setLabel('Знак валюты')
            .setStyle(discord_js_1.ButtonStyle.Secondary)
            .setEmoji('💲')
            .setDisabled(!settings.economy.shop_enabled));
        const buttons2 = new discord_js_1.ActionRowBuilder()
            .addComponents(new discord_js_1.ButtonBuilder()
            .setCustomId('toggle_daily_bonus')
            .setLabel(settings.economy.daily_bonus_enabled ? 'Выкл. днев. бонусы' : 'Вкл. днев. бонусы')
            .setStyle(settings.economy.daily_bonus_enabled ? discord_js_1.ButtonStyle.Secondary : discord_js_1.ButtonStyle.Primary)
            .setEmoji('🎁'), new discord_js_1.ButtonBuilder()
            .setCustomId('set_daily_bonus_amount')
            .setLabel('Размер днев. бонуса')
            .setStyle(discord_js_1.ButtonStyle.Secondary)
            .setEmoji('💰')
            .setDisabled(!settings.economy.daily_bonus_enabled), new discord_js_1.ButtonBuilder()
            .setCustomId('toggle_weekly_bonus')
            .setLabel(settings.economy.weekly_bonus_enabled ? 'Выкл. недель. бонусы' : 'Вкл. недель. бонусы')
            .setStyle(settings.economy.weekly_bonus_enabled ? discord_js_1.ButtonStyle.Secondary : discord_js_1.ButtonStyle.Primary)
            .setEmoji('🏆'), new discord_js_1.ButtonBuilder()
            .setCustomId('set_weekly_bonus_amount')
            .setLabel('Размер недель. бонуса')
            .setStyle(discord_js_1.ButtonStyle.Secondary)
            .setEmoji('🪙')
            .setDisabled(!settings.economy.weekly_bonus_enabled), new discord_js_1.ButtonBuilder()
            .setCustomId('toggle_streak')
            .setLabel(settings.economy.streak_enabled ? 'Выкл. серию' : 'Вкл. серию')
            .setStyle(settings.economy.streak_enabled ? discord_js_1.ButtonStyle.Secondary : discord_js_1.ButtonStyle.Primary)
            .setEmoji('🔥'));
        const buttons3 = new discord_js_1.ActionRowBuilder()
            .addComponents(new discord_js_1.ButtonBuilder()
            .setCustomId('shop_items')
            .setLabel('Товары магазина')
            .setStyle(discord_js_1.ButtonStyle.Primary)
            .setEmoji('🛒')
            .setDisabled(!settings.economy.shop_enabled), new discord_js_1.ButtonBuilder()
            .setCustomId('economy_history')
            .setLabel('История транзакций')
            .setStyle(discord_js_1.ButtonStyle.Primary)
            .setEmoji('📜')
            .setDisabled(!settings.economy.shop_enabled), new discord_js_1.ButtonBuilder()
            .setCustomId('economy_stats')
            .setLabel('Статистика')
            .setStyle(discord_js_1.ButtonStyle.Primary)
            .setEmoji('📊')
            .setDisabled(!settings.economy.shop_enabled));
        const buttons4 = new discord_js_1.ActionRowBuilder()
            .addComponents(new discord_js_1.ButtonBuilder()
            .setCustomId('reset_economy')
            .setLabel('Сбросить настройки')
            .setStyle(discord_js_1.ButtonStyle.Danger)
            .setEmoji('🔁'), new discord_js_1.ButtonBuilder()
            .setCustomId('back_to_main')
            .setLabel('Назад')
            .setStyle(discord_js_1.ButtonStyle.Secondary)
            .setEmoji('🔙'));
        await interaction.editReply({ embeds: [embed], components: [buttons, buttons2, buttons3, buttons4] });
        setupButtonCollector(interaction, bot, settingsService, 'economy');
    }
    catch (error) {
        logger_1.logger.error('Error showing economy settings:', error);
        await interaction.editReply({
            content: '❌ Произошла ошибка при загрузке настроек экономики.',
            components: []
        });
    }
}
async function showBattlePassSettings(interaction, bot, settingsService) {
    // defer for buttons/selects
    if (interaction.isButton() || interaction.isStringSelectMenu()) {
        if (!interaction.deferred && !interaction.replied) {
            await interaction.deferUpdate();
        }
    }
    try {
        const settings = await settingsService.getGuildSettings(interaction.guild.id);
        const bp = settings.battlepass;
        const embed = new discord_js_1.EmbedBuilder()
            .setColor('#3b82f6')
            .setTitle('🎮 Настройки Battle Pass')
            .setDescription('Управление сезонным пропуском сервера')
            .addFields([
            {
                name: '⚡ Статус',
                value: bp.enabled ? '`🟢 Включен`' : '`🔴 Выключен`',
                inline: true
            },
            {
                name: '🏆 Количество уровней',
                value: `\`${bp.levels}\``,
                inline: true
            },
            {
                name: '✳️ XP для уровня',
                value: `\`${bp.xp_for_level}\``,
                inline: false
            },
            {
                name: '📅 Ежедневные задания',
                value: bp.daily_quests.length
                    ? bp.daily_quests.map((q, i) => `${i + 1}. ${q.text} (${q.reward}xp)`).join('\n')
                    : '`Нет заданий`',
                inline: false
            },
            {
                name: '🗓️ Еженедельные задания',
                value: bp.weekly_quests.length
                    ? bp.weekly_quests.map((q, i) => `${i + 1}. ${q.text} (${q.reward}xp)`).join('\n')
                    : '`Нет заданий`',
                inline: false
            },
            {
                name: '🎁 Награды',
                value: bp.rewards.length
                    ? bp.rewards.map((r, i) => `Lvl ${r.level}: ${r.reward}`).slice(0, 10).join('\n') + (bp.rewards.length > 10 ? '\n...' : '')
                    : '`Нет наград`',
                inline: false
            }
        ])
            .setFooter({ text: 'Изменяйте настройки и задания через кнопки ниже!' });
        const buttons = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder()
            .setCustomId('toggle_bp')
            .setLabel(bp.enabled ? 'Отключить BP' : 'Включить BP')
            .setStyle(bp.enabled ? discord_js_1.ButtonStyle.Danger : discord_js_1.ButtonStyle.Success)
            .setEmoji(bp.enabled ? '🔴' : '🟢'), new discord_js_1.ButtonBuilder()
            .setCustomId('set_bp_levels')
            .setLabel('Количество уровней')
            .setStyle(discord_js_1.ButtonStyle.Secondary)
            .setEmoji('🏆')
            .setDisabled(!bp.enabled), new discord_js_1.ButtonBuilder()
            .setCustomId('set_bp_xp_for_levels')
            .setLabel('Количество XP для уровня')
            .setStyle(discord_js_1.ButtonStyle.Secondary)
            .setEmoji('✳️')
            .setDisabled(!bp.enabled));
        const buttons2 = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder()
            .setCustomId('add_daily_quest')
            .setLabel('+ Ежед. задание')
            .setStyle(discord_js_1.ButtonStyle.Primary)
            .setEmoji('📅')
            .setDisabled(!bp.enabled), new discord_js_1.ButtonBuilder()
            .setCustomId('add_weekly_quest')
            .setLabel('+ Ежен. задание')
            .setStyle(discord_js_1.ButtonStyle.Primary)
            .setEmoji('🗓️')
            .setDisabled(!bp.enabled), new discord_js_1.ButtonBuilder()
            .setCustomId('add_bp_reward')
            .setLabel('+ Награда')
            .setStyle(discord_js_1.ButtonStyle.Success)
            .setEmoji('🎁')
            .setDisabled(!bp.enabled));
        const buttons3 = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder()
            .setCustomId('remove_daily_quest')
            .setLabel('- Ежед. задание')
            .setStyle(discord_js_1.ButtonStyle.Secondary)
            .setEmoji('❌')
            .setDisabled(!bp.enabled || !bp.daily_quests?.length), new discord_js_1.ButtonBuilder()
            .setCustomId('remove_weekly_quest')
            .setLabel('- Ежен. задание')
            .setStyle(discord_js_1.ButtonStyle.Secondary)
            .setEmoji('❌')
            .setDisabled(!bp.enabled || !bp.weekly_quests?.length), new discord_js_1.ButtonBuilder()
            .setCustomId('remove_bp_reward')
            .setLabel('- Награда')
            .setStyle(discord_js_1.ButtonStyle.Secondary)
            .setEmoji('❌')
            .setDisabled(!bp.enabled || !bp.rewards?.length));
        const buttons4 = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder()
            .setCustomId('reset_bp')
            .setLabel('Сбросить настройки')
            .setStyle(discord_js_1.ButtonStyle.Danger)
            .setEmoji('🔄'), new discord_js_1.ButtonBuilder()
            .setCustomId('back_to_main')
            .setLabel('Назад')
            .setStyle(discord_js_1.ButtonStyle.Secondary)
            .setEmoji('🔙'));
        await interaction.editReply({
            embeds: [embed],
            components: [buttons, buttons2, buttons3, buttons4]
        });
        setupButtonCollector(interaction, bot, settingsService, 'battlepass');
    }
    catch (error) {
        console.error('Error in showBattlePassSettings:', error);
        await interaction.editReply({
            content: '❌ Произошла ошибка при загрузке настроек Battle Pass.',
            components: []
        });
    }
}
async function showModerationSettings(interaction, bot, settingsService) {
    if (interaction.isButton() || interaction.isStringSelectMenu()) {
        if (!interaction.deferred && !interaction.replied) {
            await interaction.deferUpdate();
        }
    }
    try {
        const settings = await settingsService.getGuildSettings(interaction.guild.id);
        const embed = new discord_js_1.EmbedBuilder()
            .setColor('#FF4444')
            .setTitle('🛡️ Настройки модерации')
            .setDescription('Автоматическая модерация и защита сервера')
            .addFields([
            {
                name: '🤖 Автомодерация',
                value: `• **Статус:** \`${settings.moderation.enabled ? '🟢 Включена' : '🔴 Выключена'}\`\n` +
                    `• **Защита от спама:** \`${settings.moderation.spam_protection ? '🟢 Включена' : '🔴 Выключена'}\`\n` +
                    `• **Фильтр мата:** \`${settings.moderation.profanity_filter ? '🟢 Включен' : '🔴 Выключен'}\``,
                inline: false
            },
            {
                name: '🔧 Доступные функции модерации',
                value: '• Защита от спама сообщениями\n• Фильтрация нецензурной лексики\n• Автоматические предупреждения\n• Временные ограничения',
                inline: true
            },
            {
                name: '⚠️ Важно',
                value: 'Модерация работает только для обычных пользователей. Администраторы и пользователи с особыми правами исключены из проверок.',
                inline: true
            }
        ]);
        const buttons = new discord_js_1.ActionRowBuilder()
            .addComponents(new discord_js_1.ButtonBuilder()
            .setCustomId('toggle_auto_mod')
            .setLabel(settings.moderation.enabled ? 'Выкл. автомод' : 'Вкл. автомод')
            .setStyle(settings.moderation.enabled ? discord_js_1.ButtonStyle.Danger : discord_js_1.ButtonStyle.Success)
            .setEmoji(settings.moderation.enabled ? '🔴' : '🟢'), new discord_js_1.ButtonBuilder()
            .setCustomId('toggle_spam_protection')
            .setLabel(settings.moderation.spam_protection ? 'Выкл. антиспам' : 'Вкл. антиспам')
            .setStyle(settings.moderation.spam_protection ? discord_js_1.ButtonStyle.Secondary : discord_js_1.ButtonStyle.Primary)
            .setEmoji('🚫'), new discord_js_1.ButtonBuilder()
            .setCustomId('toggle_profanity_filter')
            .setLabel(settings.moderation.profanity_filter ? 'Выкл. фильтр' : 'Вкл. фильтр')
            .setStyle(settings.moderation.profanity_filter ? discord_js_1.ButtonStyle.Secondary : discord_js_1.ButtonStyle.Primary)
            .setEmoji('🤬'));
        const buttons2 = new discord_js_1.ActionRowBuilder()
            .addComponents(new discord_js_1.ButtonBuilder()
            .setCustomId('moderation_logs')
            .setLabel('Логи модерации')
            .setStyle(discord_js_1.ButtonStyle.Primary)
            .setEmoji('📋'), new discord_js_1.ButtonBuilder()
            .setCustomId('reset_moderation')
            .setLabel('Сбросить настройки')
            .setStyle(discord_js_1.ButtonStyle.Danger)
            .setEmoji('🔁'), new discord_js_1.ButtonBuilder()
            .setCustomId('back_to_main')
            .setLabel('Назад')
            .setStyle(discord_js_1.ButtonStyle.Secondary)
            .setEmoji('🔙'));
        await interaction.editReply({ embeds: [embed], components: [buttons, buttons2] });
        // Создаем коллектор для обработки кнопок
        setupButtonCollector(interaction, bot, settingsService, 'moderation');
    }
    catch (error) {
        logger_1.logger.error('Error showing moderation settings:', error);
        await interaction.editReply({
            content: '❌ Произошла ошибка при загрузке настроек модерации.',
            components: []
        });
    }
}
async function resetSettings(interaction, bot, settingsService) {
    await (interaction.deferReply ? interaction.deferReply({ ephemeral: true }) : interaction.deferUpdate());
    try {
        const confirmEmbed = new discord_js_1.EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('⚠️ Подтверждение сброса настроек')
            .setDescription('**ВНИМАНИЕ!** Это действие удалит ВСЕ настройки сервера и вернет их к значениям по умолчанию.')
            .addFields([
            {
                name: '🗑️ Будет сброшено:',
                value: '• Все настройки системы уровней\n• Настройки AI-чата\n• Список администраторов бота\n• Настройки каналов\n• Экономические настройки\n• Настройки модерации',
                inline: false
            },
            {
                name: '✅ НЕ будет затронуто:',
                value: '• Данные пользователей (уровни, XP, монеты)\n• Товары в магазине\n• Обученные данные AI\n• Логи и статистика',
                inline: false
            }
        ])
            .setFooter({ text: 'Это действие необратимо! Подумайте дважды.' });
        const confirmButtons = new discord_js_1.ActionRowBuilder()
            .addComponents(new discord_js_1.ButtonBuilder()
            .setCustomId('confirm_reset_settings')
            .setLabel('Да, сбросить ВСЕ настройки')
            .setStyle(discord_js_1.ButtonStyle.Danger)
            .setEmoji('🗑️'), new discord_js_1.ButtonBuilder()
            .setCustomId('cancel_reset_settings')
            .setLabel('Отмена')
            .setStyle(discord_js_1.ButtonStyle.Secondary)
            .setEmoji('❌'));
        const response = await interaction.editReply({
            embeds: [confirmEmbed],
            components: [confirmButtons]
        });
        // Создаем коллектор для подтверждения
        const collector = response.createMessageComponentCollector({
            componentType: discord_js_1.ComponentType.Button,
            time: 30000 // 30 секунд
        });
        collector.on('collect', async (buttonInteraction) => {
            if (buttonInteraction.user.id !== interaction.user.id) {
                await buttonInteraction.reply({
                    content: '❌ Только автор команды может подтвердить это действие.',
                    ephemeral: true
                });
                return;
            }
            if (buttonInteraction.customId === 'confirm_reset_settings') {
                try {
                    await settingsService.resetGuildSettings(interaction.guild.id);
                    const successEmbed = new discord_js_1.EmbedBuilder()
                        .setColor('#00FF00')
                        .setTitle('✅ Настройки сброшены')
                        .setDescription('Все настройки сервера были успешно сброшены до значений по умолчанию.')
                        .addFields([
                        {
                            name: '🔄 Что дальше?',
                            value: 'Используйте `/settings view` для настройки бота под ваш сервер заново.',
                            inline: false
                        }
                    ])
                        .setTimestamp();
                    await buttonInteraction.update({
                        embeds: [successEmbed],
                        components: []
                    });
                }
                catch (error) {
                    logger_1.logger.error('Error resetting settings:', error);
                    const errorEmbed = new discord_js_1.EmbedBuilder()
                        .setColor('#FF0000')
                        .setTitle('❌ Ошибка')
                        .setDescription('Произошла ошибка при сбросе настроек. Попробуйте еще раз позже.');
                    await buttonInteraction.update({
                        embeds: [errorEmbed],
                        components: []
                    });
                }
            }
            else {
                const cancelEmbed = new discord_js_1.EmbedBuilder()
                    .setColor('#FFA500')
                    .setTitle('❌ Сброс отменен')
                    .setDescription('Настройки остались без изменений.');
                await buttonInteraction.update({
                    embeds: [cancelEmbed],
                    components: []
                });
            }
            collector.stop();
        });
        collector.on('end', async (collected) => {
            if (collected.size === 0) {
                try {
                    const timeoutEmbed = new discord_js_1.EmbedBuilder()
                        .setColor('#808080')
                        .setTitle('⏰ Время истекло')
                        .setDescription('Сброс настроек отменен из-за истечения времени.');
                    await interaction.editReply({
                        embeds: [timeoutEmbed],
                        components: []
                    });
                }
                catch (error) {
                    // Игнорируем ошибки при обновлении сообщения
                }
            }
        });
    }
    catch (error) {
        logger_1.logger.error('Error in reset settings:', error);
        await interaction.editReply({
            content: '❌ Произошла ошибка при попытке сброса настроек.',
            components: []
        });
    }
}
// Универсальная функция для создания коллектора кнопок
async function setupButtonCollector(interaction, bot, settingsService, category) {
    const userId = interaction.user.id;
    if (activeCollectors.has(userId)) {
        activeCollectors.get(userId).stop('new_interaction');
        activeCollectors.delete(userId);
    }
    let targetMessage;
    if (interaction.isButton() || interaction.isStringSelectMenu()) {
        targetMessage = interaction.message;
    }
    else if (interaction.isChatInputCommand() && (interaction.replied || interaction.deferred)) {
        targetMessage = await interaction.fetchReply();
    }
    else {
        return;
    }
    const collector = targetMessage.createMessageComponentCollector({
        componentType: discord_js_1.ComponentType.Button,
        time: 300000 // 5 минут
    });
    activeCollectors.set(userId, collector);
    collector.on('collect', async (buttonInteraction) => {
        if (buttonInteraction.user.id !== interaction.user.id) {
            await buttonInteraction.reply({
                content: '❌ Только автор команды может использовать эти кнопки.',
                ephemeral: true
            });
            return;
        }
        try {
            await handleButtonInteraction(buttonInteraction, bot, settingsService, category);
            // Если модальное окно открылось успешно — не показываем ошибку
        }
        catch (error) {
            logger_1.logger.error('Error handling button interaction:', error);
            try {
                if (!buttonInteraction.replied && !buttonInteraction.deferred) {
                    await buttonInteraction.reply({
                        content: '❌ Произошла ошибка при обработке действия.',
                        ephemeral: true
                    });
                }
                else if (buttonInteraction.deferred) {
                    // Если interaction был отложен, но ошибка произошла после — используем followUp
                    await buttonInteraction.followUp({
                        content: '❌ Произошла ошибка при обработке действия.',
                        ephemeral: true
                    });
                }
            }
            catch (followUpError) {
                logger_1.logger.error('Error sending error response:', followUpError);
            }
        }
    });
    collector.on('end', (collected, reason) => {
        if (activeCollectors.has(userId)) {
            activeCollectors.delete(userId);
        }
        if (reason === 'time') {
            try {
                interaction.editReply({ components: [] }).catch(() => { });
            }
            catch (error) {
                // Игнорируем
            }
        }
    });
}
// Обработчик взаимодействий с кнопками
async function handleButtonInteraction(interaction, bot, settingsService, category) {
    const customId = interaction.customId;
    const guildId = interaction.guild.id;
    // Кнопка "Назад"
    if (customId === 'back_to_main') {
        await showAllSettings(interaction, bot, settingsService);
        return;
    }
    const MODAL_BUTTONS = [
        'set_min_text_xp',
        'set_xp_text_multiplier',
        'set_xp_voice_multiplier',
        'set_coins_multiplier',
        'set_levelup_channel',
        'set_ai_chance',
        'set_ai_cooldown',
        'set_ai_words',
        'set_ai_channel',
        'set_ai_ignoredchannel',
        'set_daily_bonus_amount',
        'set_weekly_bonus_amount',
        'manage_admin_roles',
        'manage_admin_users',
        'manage_ignored_roles',
        'manage_admin_ignored_roles',
        'manage_ai_channels',
        'manage_text_xp_channels',
        'manage_voice_xp_channels',
        'manage_ignored_channels',
        'manage_ignored_users',
        'set_shop_multiplier',
        'set_coins_name',
        'set_coins_sign',
        'set_bp_levels',
        'set_bp_xp_for_levels',
        'add_daily_quest',
        'remove_daily_quest',
        'add_weekly_quest',
        'remove_weekly_quest',
        'add_bp_reward',
        'remove_bp_reward',
        'set_timezone',
        'set_language',
        'reset_levels',
        'reset_ai',
        'reset_admin',
        'reset_economy',
        'reset_bp',
        'reset_moderation'
    ];
    if (!MODAL_BUTTONS.includes(customId) && !interaction.deferred && !interaction.replied) {
        await interaction.deferUpdate();
    }
    if (category === 'levels') {
        switch (customId) {
            case 'toggle_levels_system':
                const currentState = (await settingsService.getGuildSettings(guildId)).levels.enabled;
                await settingsService.updateSetting(guildId, 'levels.enabled', !currentState);
                await showLevelSettings(interaction, bot, settingsService);
                break;
            case 'toggle_text_xp':
                const textXpState = (await settingsService.getGuildSettings(guildId)).levels.text_xp;
                await settingsService.updateSetting(guildId, 'levels.text_xp', !textXpState);
                await showLevelSettings(interaction, bot, settingsService);
                break;
            case 'toggle_voice_xp':
                const voiceXpState = (await settingsService.getGuildSettings(guildId)).levels.voice_xp;
                await settingsService.updateSetting(guildId, 'levels.voice_xp', !voiceXpState);
                await showLevelSettings(interaction, bot, settingsService);
                break;
            case 'toggle_levelup_notifications':
                const notifState = (await settingsService.getGuildSettings(guildId)).levels.levelup_messages;
                await settingsService.updateSetting(guildId, 'levels.levelup_messages', !notifState);
                await showLevelSettings(interaction, bot, settingsService);
                break;
            case 'set_min_text_xp':
                await showTextMinXPModal(interaction);
                break;
            case 'set_xp_text_multiplier':
                await showTextXPMultiplierModal(interaction);
                break;
            case 'set_xp_voice_multiplier':
                await showVoiceXPMultiplierModal(interaction);
                break;
            case 'set_coins_multiplier':
                await showCoinsMultiplierModal(interaction);
                break;
            case 'set_levelup_channel':
                await showLevelUpChannelModal(interaction);
                break;
            case 'manage_text_xp_channels':
                await showTextXPChannelsModal(interaction);
                break;
            case 'manage_voice_xp_channels':
                await showVoiceXPChannelsModal(interaction);
                break;
            case 'manage_ignored_channels':
                await showIgnoredChannelsModal(interaction);
                break;
            case 'manage_ignored_roles':
                await showIgnoredRolesLevelsModal(interaction);
                break;
            case 'manage_ignored_users':
                await showIgnoredUsersLevelsModal(interaction);
                break;
            case 'reset_levels':
                await resetLevelsModal(interaction, bot);
                break;
        }
    }
    if (category === 'ai') {
        switch (customId) {
            case 'toggle_ai_system':
                const aiState = (await settingsService.getGuildSettings(guildId)).ai.enabled;
                await settingsService.updateSetting(guildId, 'ai.enabled', !aiState);
                await showAISettings(interaction, bot, settingsService);
                break;
            case 'set_ai_chance':
                await showAIChanceModal(interaction);
                break;
            case 'set_ai_cooldown':
                await showAICooldownModal(interaction);
                break;
            case 'set_ai_words':
                await showAIWordsModal(interaction);
                break;
            case 'set_ai_channel':
                await showAIChannelsModal(interaction);
                break;
            case 'set_ai_ignoredchannel':
                await showAIChannelsIgnoredModal(interaction);
                break;
            case 'test_ai_response':
                await testAIResponse(interaction, bot);
                break;
            case 'reset_ai':
                await resetAIModal(interaction, bot);
                break;
        }
    }
    if (category === 'economy') {
        switch (customId) {
            case 'toggle_shop':
                const shopState = (await settingsService.getGuildSettings(guildId)).economy.shop_enabled;
                await settingsService.updateSetting(guildId, 'economy.shop_enabled', !shopState);
                await showEconomySettings(interaction, bot, settingsService);
                break;
            case 'toggle_daily_bonus':
                const dailyState = (await settingsService.getGuildSettings(guildId)).economy.daily_bonus_enabled;
                await settingsService.updateSetting(guildId, 'economy.daily_bonus_enabled', !dailyState);
                await showEconomySettings(interaction, bot, settingsService);
                break;
            case 'toggle_weekly_bonus':
                const weeklyState = (await settingsService.getGuildSettings(guildId)).economy.weekly_bonus_enabled;
                await settingsService.updateSetting(guildId, 'economy.weekly_bonus_enabled', !weeklyState);
                await showEconomySettings(interaction, bot, settingsService);
                break;
            case 'toggle_streak':
                const streakState = (await settingsService.getGuildSettings(guildId)).economy.streak_enabled;
                await settingsService.updateSetting(guildId, 'economy.streak_enabled', !streakState);
                await showEconomySettings(interaction, bot, settingsService);
                break;
            case 'set_daily_bonus_amount':
                await showDailyBonusModal(interaction);
                break;
            case 'set_weekly_bonus_amount':
                await showWeeklyBonusModal(interaction);
                break;
            case 'set_shop_multiplier':
                await showShopMultiplierModal(interaction);
                break;
            case 'set_coins_name':
                await showCoinsCurrencyModal(interaction);
                break;
            case 'set_coins_sign':
                await showSignCurrencyModal(interaction);
                break;
            case 'shop_items':
                await showItemsStats(interaction, bot, settingsService);
                break;
            case 'economy_history':
                await showEconomyHistory(interaction, bot, settingsService);
                break;
            case 'economy_stats':
                await showEconomyStats(interaction, bot, settingsService);
                break;
            case 'reset_economy':
                await resetEconomyModal(interaction, bot);
                break;
        }
    }
    if (category === 'battlepass') {
        switch (customId) {
            case 'toggle_bp':
                const bpState = (await settingsService.getGuildSettings(guildId)).battlepass.enabled;
                await settingsService.updateSetting(guildId, 'battlepass.enabled', !bpState);
                await showBattlePassSettings(interaction, bot, settingsService);
                break;
            case 'set_bp_levels':
                await showBPLevelsModal(interaction);
                break;
            case 'set_bp_xp_for_levels':
                await showBPXpForLevelsModal(interaction);
                break;
            case 'add_daily_quest':
                await showBPDailyQuestModal(interaction);
                break;
            case 'remove_daily_quest':
                await showRemoveBPDailyQuestModal(interaction);
                break;
            case 'add_weekly_quest':
                await showBPWeeklyQuestModal(interaction);
                break;
            case 'remove_weekly_quest':
                await showRemoveBPWeeklyQuestModal(interaction);
                break;
            case 'add_bp_reward':
                await showBPRewardModal(interaction);
                break;
            case 'remove_bp_reward':
                await showRemoveBPRewardModal(interaction);
                break;
            case 'reset_bp':
                await settingsService.updateSetting(guildId, 'battlepass', settingsService.defaultSettings.battlepass);
                await showBattlePassSettings(interaction, bot, settingsService);
                break;
        }
    }
    if (category === 'admin') {
        switch (customId) {
            case 'manage_admin_roles':
                await showAdminRolesModal(interaction);
                break;
            case 'manage_admin_users':
                await showAdminUsersModal(interaction);
                break;
            case 'reset_admin':
                await resetAdminModal(interaction, bot);
                break;
        }
    }
    if (category === 'system') {
        switch (customId) {
            case 'set_timezone':
                await showSetTimezoneModal(interaction);
                break;
            case 'set_language':
                await showSetLanguageModal(interaction);
                break;
        }
    }
    if (category === 'moderation') {
        const guildId = interaction.guild.id;
        const settings = await settingsService.getGuildSettings(guildId);
        switch (customId) {
            case 'toggle_auto_mod': {
                await settingsService.updateSetting(guildId, 'moderation.enabled', !settings.moderation.enabled);
                await showModerationSettings(interaction, bot, settingsService);
                break;
            }
            case 'toggle_spam_protection': {
                await settingsService.updateSetting(guildId, 'moderation.spam_protection', !settings.moderation.spam_protection);
                await showModerationSettings(interaction, bot, settingsService);
                break;
            }
            case 'toggle_profanity_filter': {
                await settingsService.updateSetting(guildId, 'moderation.profanity_filter', !settings.moderation.profanity_filter);
                await showModerationSettings(interaction, bot, settingsService);
                break;
            }
            case 'moderation_logs': {
                await showModerationLogs(interaction, bot, settingsService);
                break;
            }
            case 'reset_moderation':
                await resetModerationModal(interaction, bot);
                break;
        }
    }
}
async function handleModalSubmit(interaction, bot, settingsService) {
    const customId = interaction.customId;
    if (customId === 'xp_multiplier_modal') {
        const multiplierInput = interaction.fields.getTextInputValue('xp_multiplier');
        const multiplier = parseFloat(multiplierInput);
        if (isNaN(multiplier) || multiplier <= 0) {
            await interaction.reply({
                content: '❌ Некорректный множитель XP. Введите число больше 0.',
                ephemeral: true
            });
            return;
        }
        try {
            await settingsService.updateSetting(interaction.guild.id, 'xp_multiplier', multiplier);
            await interaction.reply({
                content: `✅ Множитель XP установлен на **${multiplier}x**`,
                ephemeral: true
            });
        }
        catch (error) {
            logger_1.logger.error('Error updating xp_multiplier:', error);
            await interaction.reply({
                content: '❌ Произошла ошибка при сохранении настройки.',
                ephemeral: true
            });
        }
    }
}
// ====================== МОДАЛЬНЫЕ ОКНА ======================
// --- Уровни ---
async function resetLevelsModal(interaction, bot) {
    const guildId = interaction.guild.id;
    const modal = new discord_js_1.ModalBuilder()
        .setCustomId('confirm_reset_levels')
        .setTitle('Сбросить настройки уровней?');
    const confirmInput = new discord_js_1.TextInputBuilder()
        .setCustomId('confirm_text_levels')
        .setLabel('Напишите "ДА" для подтверждения')
        .setPlaceholder('Введите ДА')
        .setStyle(discord_js_1.TextInputStyle.Short)
        .setRequired(true);
    const row = new discord_js_1.ActionRowBuilder().addComponents(confirmInput);
    modal.addComponents(row);
    await interaction.showModal(modal);
}
async function showTextMinXPModal(interaction) {
    const modal = new discord_js_1.ModalBuilder()
        .setCustomId('xp_minwords_modal')
        .setTitle('Установить минимум слов для XP');
    const multiplierInput = new discord_js_1.TextInputBuilder()
        .setCustomId('xp_min_word')
        .setLabel('Минимально слов (например: 3)')
        .setStyle(discord_js_1.TextInputStyle.Short)
        .setMinLength(3)
        .setMaxLength(100)
        .setPlaceholder('3')
        .setRequired(true);
    const actionRow = new discord_js_1.ActionRowBuilder()
        .addComponents(multiplierInput);
    modal.addComponents(actionRow);
    await interaction.showModal(modal);
}
async function showTextXPMultiplierModal(interaction) {
    const modal = new discord_js_1.ModalBuilder()
        .setCustomId('xp_text_multiplier_modal')
        .setTitle('Установить множитель текстовых XP');
    const multiplierInput = new discord_js_1.TextInputBuilder()
        .setCustomId('xp_text_multiplier')
        .setLabel('Множитель опыта (например: 1.5)')
        .setStyle(discord_js_1.TextInputStyle.Short)
        .setMinLength(1)
        .setMaxLength(10)
        .setPlaceholder('1.0')
        .setRequired(true);
    const actionRow = new discord_js_1.ActionRowBuilder()
        .addComponents(multiplierInput);
    modal.addComponents(actionRow);
    await interaction.showModal(modal);
}
async function showVoiceXPMultiplierModal(interaction) {
    const modal = new discord_js_1.ModalBuilder()
        .setCustomId('xp_voice_multiplier_modal')
        .setTitle('Установить множитель голосовых XP');
    const multiplierInput = new discord_js_1.TextInputBuilder()
        .setCustomId('xp_voice_multiplier')
        .setLabel('Множитель опыта (например: 1.5)')
        .setStyle(discord_js_1.TextInputStyle.Short)
        .setMinLength(1)
        .setMaxLength(10)
        .setPlaceholder('1.0')
        .setRequired(true);
    const actionRow = new discord_js_1.ActionRowBuilder()
        .addComponents(multiplierInput);
    modal.addComponents(actionRow);
    await interaction.showModal(modal);
}
async function showCoinsMultiplierModal(interaction) {
    const modal = new discord_js_1.ModalBuilder()
        .setCustomId('coins_multiplier_modal')
        .setTitle('Установить множитель монет');
    const multiplierInput = new discord_js_1.TextInputBuilder()
        .setCustomId('coins_multiplier')
        .setLabel('Множитель монет (например: 1.0)')
        .setStyle(discord_js_1.TextInputStyle.Short)
        .setMinLength(1)
        .setMaxLength(10)
        .setPlaceholder('1.0')
        .setRequired(true);
    const actionRow = new discord_js_1.ActionRowBuilder()
        .addComponents(multiplierInput);
    modal.addComponents(actionRow);
    await interaction.showModal(modal);
}
async function showLevelUpChannelModal(interaction) {
    const modal = new discord_js_1.ModalBuilder()
        .setCustomId('levelup_channel_modal')
        .setTitle('📢 Установить канал уведомлений');
    const channelInput = new discord_js_1.TextInputBuilder()
        .setCustomId('channel_id')
        .setLabel('ID канала (например: 123456789012345678)')
        .setStyle(discord_js_1.TextInputStyle.Short)
        .setMinLength(17)
        .setMaxLength(20)
        .setPlaceholder('123456789012345678')
        .setRequired(true);
    const actionRow = new discord_js_1.ActionRowBuilder()
        .addComponents(channelInput);
    modal.addComponents(actionRow);
    await interaction.showModal(modal);
}
async function showTextXPChannelsModal(interaction) {
    const modal = new discord_js_1.ModalBuilder()
        .setCustomId('text_xp_channels_modal')
        .setTitle('Управление каналами текстового XP');
    const channelsInput = new discord_js_1.TextInputBuilder()
        .setCustomId('text_xp_channels')
        .setLabel('ID каналов через пробел или "clear"')
        .setStyle(discord_js_1.TextInputStyle.Paragraph)
        .setMaxLength(1000)
        .setPlaceholder('123456789012345678 987654321098765432')
        .setRequired(true);
    const actionRow = new discord_js_1.ActionRowBuilder()
        .addComponents(channelsInput);
    modal.addComponents(actionRow);
    await interaction.showModal(modal);
}
async function showVoiceXPChannelsModal(interaction) {
    const modal = new discord_js_1.ModalBuilder()
        .setCustomId('voice_xp_channels_modal')
        .setTitle('Управление каналами голосового XP');
    const channelsInput = new discord_js_1.TextInputBuilder()
        .setCustomId('voice_xp_channels')
        .setLabel('ID каналов через пробел или "clear"')
        .setStyle(discord_js_1.TextInputStyle.Paragraph)
        .setMaxLength(1000)
        .setPlaceholder('123456789012345678 987654321098765432')
        .setRequired(true);
    const actionRow = new discord_js_1.ActionRowBuilder()
        .addComponents(channelsInput);
    modal.addComponents(actionRow);
    await interaction.showModal(modal);
}
async function showIgnoredChannelsModal(interaction) {
    const modal = new discord_js_1.ModalBuilder()
        .setCustomId('ignored_channels_modal')
        .setTitle('Управление игнорируемыми каналами');
    const channelsInput = new discord_js_1.TextInputBuilder()
        .setCustomId('ignored_channels')
        .setLabel('ID каналов через пробел или "clear"')
        .setStyle(discord_js_1.TextInputStyle.Paragraph)
        .setMaxLength(1000)
        .setPlaceholder('123456789012345678 987654321098765432')
        .setRequired(true);
    const actionRow = new discord_js_1.ActionRowBuilder()
        .addComponents(channelsInput);
    modal.addComponents(actionRow);
    await interaction.showModal(modal);
}
async function showIgnoredRolesLevelsModal(interaction) {
    const modal = new discord_js_1.ModalBuilder()
        .setCustomId('level_ignored_roles_modal')
        .setTitle('Управление игнорируемыми ролями');
    const channelsInput = new discord_js_1.TextInputBuilder()
        .setCustomId('level_ignored_roles')
        .setLabel('ID ролей через пробел или "clear"')
        .setStyle(discord_js_1.TextInputStyle.Paragraph)
        .setMaxLength(1000)
        .setPlaceholder('123456789012345678 987654321098765432')
        .setRequired(true);
    const actionRow = new discord_js_1.ActionRowBuilder()
        .addComponents(channelsInput);
    modal.addComponents(actionRow);
    await interaction.showModal(modal);
}
async function showIgnoredUsersLevelsModal(interaction) {
    const modal = new discord_js_1.ModalBuilder()
        .setCustomId('level_ignored_users_modal')
        .setTitle('Управление игнорируемыми пользователями');
    const channelsInput = new discord_js_1.TextInputBuilder()
        .setCustomId('level_ignored_users')
        .setLabel('ID пользователей через пробел или "clear"')
        .setStyle(discord_js_1.TextInputStyle.Paragraph)
        .setMaxLength(1000)
        .setPlaceholder('123456789012345678 987654321098765432')
        .setRequired(true);
    const actionRow = new discord_js_1.ActionRowBuilder()
        .addComponents(channelsInput);
    modal.addComponents(actionRow);
    await interaction.showModal(modal);
}
// --- AI --- 
async function resetAIModal(interaction, bot) {
    const guildId = interaction.guild.id;
    const modal = new discord_js_1.ModalBuilder()
        .setCustomId('confirm_reset_ai')
        .setTitle('Сбросить настройки ИИ?');
    const confirmInput = new discord_js_1.TextInputBuilder()
        .setCustomId('confirm_text_ai')
        .setLabel('Напишите "ДА" для подтверждения')
        .setPlaceholder('Введите ДА')
        .setStyle(discord_js_1.TextInputStyle.Short)
        .setRequired(true);
    const row = new discord_js_1.ActionRowBuilder().addComponents(confirmInput);
    modal.addComponents(row);
    await interaction.showModal(modal);
}
async function showAIChanceModal(interaction) {
    const modal = new discord_js_1.ModalBuilder()
        .setCustomId('ai_chance_modal')
        .setTitle('Установить шанс ответа AI');
    const chanceInput = new discord_js_1.TextInputBuilder()
        .setCustomId('ai_chance')
        .setLabel('Шанс ответа в процентах (0-100)')
        .setStyle(discord_js_1.TextInputStyle.Short)
        .setMinLength(1)
        .setMaxLength(5)
        .setPlaceholder('5')
        .setRequired(true);
    const actionRow = new discord_js_1.ActionRowBuilder()
        .addComponents(chanceInput);
    modal.addComponents(actionRow);
    await interaction.showModal(modal);
}
async function showAICooldownModal(interaction) {
    const modal = new discord_js_1.ModalBuilder()
        .setCustomId('ai_cooldown_modal')
        .setTitle('Установить кулдаун AI');
    const cooldownInput = new discord_js_1.TextInputBuilder()
        .setCustomId('ai_cooldown')
        .setLabel('Кулдаун в секундах (например: 30)')
        .setStyle(discord_js_1.TextInputStyle.Short)
        .setMinLength(1)
        .setMaxLength(4)
        .setPlaceholder('30')
        .setRequired(true);
    const actionRow = new discord_js_1.ActionRowBuilder()
        .addComponents(cooldownInput);
    modal.addComponents(actionRow);
    await interaction.showModal(modal);
}
async function showAIWordsModal(interaction) {
    const modal = new discord_js_1.ModalBuilder()
        .setCustomId('ai_words_modal')
        .setTitle('Установить длину ответов AI');
    const minWordsInput = new discord_js_1.TextInputBuilder()
        .setCustomId('ai_min_words')
        .setLabel('Минимальное количество слов')
        .setStyle(discord_js_1.TextInputStyle.Short)
        .setMinLength(1)
        .setMaxLength(3)
        .setPlaceholder('3')
        .setRequired(true);
    const maxWordsInput = new discord_js_1.TextInputBuilder()
        .setCustomId('ai_max_words')
        .setLabel('Максимальное количество слов')
        .setStyle(discord_js_1.TextInputStyle.Short)
        .setMinLength(1)
        .setMaxLength(3)
        .setPlaceholder('15')
        .setRequired(true);
    const row1 = new discord_js_1.ActionRowBuilder().addComponents(minWordsInput);
    const row2 = new discord_js_1.ActionRowBuilder().addComponents(maxWordsInput);
    modal.addComponents(row1, row2);
    await interaction.showModal(modal);
}
async function showAIChannelsModal(interaction) {
    const modal = new discord_js_1.ModalBuilder()
        .setCustomId('ai_channels_modal')
        .setTitle('Управление AI каналами');
    const channelsInput = new discord_js_1.TextInputBuilder()
        .setCustomId('ai_channels')
        .setLabel('ID каналов через пробел или "clear"')
        .setStyle(discord_js_1.TextInputStyle.Paragraph)
        .setMaxLength(1000)
        .setPlaceholder('123456789012345678 987654321098765432')
        .setRequired(true);
    const actionRow = new discord_js_1.ActionRowBuilder()
        .addComponents(channelsInput);
    modal.addComponents(actionRow);
    await interaction.showModal(modal);
}
async function testAIResponse(interaction, bot) {
    try {
        const response = await bot.markov.generateResponse(interaction.guild.id, interaction.channel.id);
        if (response) {
            const embed = new discord_js_1.EmbedBuilder()
                .setColor('#9932CC')
                .setTitle('🧪 Тестовый AI ответ')
                .setDescription(`"${response}"`)
                .setFooter({ text: 'Это тестовый ответ на основе обученных данных' });
            await interaction.channel.send({ embeds: [embed] }); // <<<<< ОТПРАВКА КАК ОТДЕЛЬНОЕ СООБЩЕНИЕ
        }
        else {
            const embed = new discord_js_1.EmbedBuilder()
                .setColor('#eb4034')
                .setTitle('Ошибка')
                .setDescription('❌ Не удалось сгенерировать ответ. Возможно, недостаточно данных для обучения.');
            await interaction.channel.send({ embeds: [embed] });
        }
    }
    catch (error) {
        logger_1.logger.error('Error testing AI response:', error);
        const embed = new discord_js_1.EmbedBuilder()
            .setColor('#eb4034')
            .setTitle('Ошибка')
            .setDescription('❌ Произошла ошибка при генерации тестового ответа.');
        await interaction.channel.send({ embeds: [embed] });
    }
}
async function showAIChannelsIgnoredModal(interaction) {
    const modal = new discord_js_1.ModalBuilder()
        .setCustomId('ai_channels_ignored_modal')
        .setTitle('Управление игнорируемыми AI каналами');
    const channelsInput = new discord_js_1.TextInputBuilder()
        .setCustomId('ai_channels_ignored')
        .setLabel('ID каналов через пробел или "clear"')
        .setStyle(discord_js_1.TextInputStyle.Paragraph)
        .setMaxLength(1000)
        .setPlaceholder('123456789012345678 987654321098765432')
        .setRequired(true);
    const actionRow = new discord_js_1.ActionRowBuilder()
        .addComponents(channelsInput);
    modal.addComponents(actionRow);
    await interaction.showModal(modal);
}
// --- Экономика ---
async function resetEconomyModal(interaction, bot) {
    const guildId = interaction.guild.id;
    const modal = new discord_js_1.ModalBuilder()
        .setCustomId('confirm_reset_economy')
        .setTitle('Сбросить настройки экономики?');
    const confirmInput = new discord_js_1.TextInputBuilder()
        .setCustomId('confirm_text_economy')
        .setLabel('Напишите "ДА" для подтверждения')
        .setPlaceholder('Введите ДА')
        .setStyle(discord_js_1.TextInputStyle.Short)
        .setRequired(true);
    const row = new discord_js_1.ActionRowBuilder().addComponents(confirmInput);
    modal.addComponents(row);
    await interaction.showModal(modal);
}
async function showDailyBonusModal(interaction) {
    const modal = new discord_js_1.ModalBuilder()
        .setCustomId('daily_bonus_modal')
        .setTitle('Установить размер ежедневного бонуса');
    const minInput = new discord_js_1.TextInputBuilder()
        .setCustomId('daily_bonus_amount_min')
        .setLabel('Минимум (монет ≥ 1)')
        .setStyle(discord_js_1.TextInputStyle.Short)
        .setMinLength(1)
        .setMaxLength(7)
        .setPlaceholder('100')
        .setRequired(true);
    const maxInput = new discord_js_1.TextInputBuilder()
        .setCustomId('daily_bonus_amount_max')
        .setLabel('Максимум (монет ≤ 1000000)')
        .setStyle(discord_js_1.TextInputStyle.Short)
        .setMinLength(1)
        .setMaxLength(7)
        .setPlaceholder('1000')
        .setRequired(true);
    const row1 = new discord_js_1.ActionRowBuilder().addComponents(minInput);
    const row2 = new discord_js_1.ActionRowBuilder().addComponents(maxInput);
    modal.addComponents(row1, row2);
    await interaction.showModal(modal);
}
async function showWeeklyBonusModal(interaction) {
    const modal = new discord_js_1.ModalBuilder()
        .setCustomId('weekly_bonus_modal')
        .setTitle('Установить размер ежедневного бонуса');
    const minInput = new discord_js_1.TextInputBuilder()
        .setCustomId('weekly_bonus_amount_min')
        .setLabel('Минимум (монет ≥ 1)')
        .setStyle(discord_js_1.TextInputStyle.Short)
        .setMinLength(1)
        .setMaxLength(7)
        .setPlaceholder('100')
        .setRequired(true);
    const maxInput = new discord_js_1.TextInputBuilder()
        .setCustomId('weekly_bonus_amount_max')
        .setLabel('Максимум (монет ≤ 1000000)')
        .setStyle(discord_js_1.TextInputStyle.Short)
        .setMinLength(1)
        .setMaxLength(7)
        .setPlaceholder('1000')
        .setRequired(true);
    const row1 = new discord_js_1.ActionRowBuilder().addComponents(minInput);
    const row2 = new discord_js_1.ActionRowBuilder().addComponents(maxInput);
    modal.addComponents(row1, row2);
    await interaction.showModal(modal);
}
async function showShopMultiplierModal(interaction) {
    const modal = new discord_js_1.ModalBuilder()
        .setCustomId('shop_multiplier_modal')
        .setTitle('Установить множитель цен');
    const multiplierInput = new discord_js_1.TextInputBuilder()
        .setCustomId('shop_multiplier')
        .setLabel('Множитель цен (например: 1.0)')
        .setStyle(discord_js_1.TextInputStyle.Short)
        .setMinLength(1)
        .setMaxLength(10)
        .setPlaceholder('1.0')
        .setRequired(true);
    const actionRow = new discord_js_1.ActionRowBuilder()
        .addComponents(multiplierInput);
    modal.addComponents(actionRow);
    await interaction.showModal(modal);
}
async function showCoinsCurrencyModal(interaction) {
    const modal = new discord_js_1.ModalBuilder()
        .setCustomId('coins_currency_modal')
        .setTitle('Установить название валюты');
    const channelsInput = new discord_js_1.TextInputBuilder()
        .setCustomId('coins_currency')
        .setLabel('Название валюты')
        .setStyle(discord_js_1.TextInputStyle.Paragraph)
        .setMaxLength(20)
        .setPlaceholder('Coins')
        .setRequired(true);
    const actionRow = new discord_js_1.ActionRowBuilder()
        .addComponents(channelsInput);
    modal.addComponents(actionRow);
    await interaction.showModal(modal);
}
async function showSignCurrencyModal(interaction) {
    const modal = new discord_js_1.ModalBuilder()
        .setCustomId('coins_sign_modal')
        .setTitle('Установить знак валюты');
    const channelsInput = new discord_js_1.TextInputBuilder()
        .setCustomId('coins_sign')
        .setLabel('Знак валюты')
        .setStyle(discord_js_1.TextInputStyle.Paragraph)
        .setMaxLength(5)
        .setPlaceholder('💰')
        .setRequired(true);
    const actionRow = new discord_js_1.ActionRowBuilder()
        .addComponents(channelsInput);
    modal.addComponents(actionRow);
    await interaction.showModal(modal);
}
async function showItemsStats(interaction, bot, settingsService) {
    try {
        const guildId = interaction.guild.id;
        const settings = await settingsService.getGuildSettings(guildId);
        let shopItems = [];
        let totalItems = 0;
        if (bot.database.ShopItems && bot.database.UserPurchases) {
            const itemsRawAny = await bot.database.rawQuery(`
                SELECT 
                    si.id,
                    si.name,
                    si.price,
                    si.role_id,
                    COUNT(up.id) as purchase_count
                FROM shop_items si
                LEFT JOIN user_purchases up ON si.id = up.item_id
                WHERE si.guild_id = ? AND si.is_active = 1
                GROUP BY si.id, si.name, si.price, si.role_id
                ORDER BY purchase_count DESC
                LIMIT 10
            `, [guildId]);
            let shopRows = [];
            if (Array.isArray(itemsRawAny)) {
                shopRows = itemsRawAny;
            }
            else if (Array.isArray(itemsRawAny.rows)) {
                shopRows = itemsRawAny.rows;
            }
            else if (Array.isArray(itemsRawAny[0])) {
                shopRows = itemsRawAny[0];
            }
            else {
                shopRows = [];
            }
            shopItems = shopRows.map(item => ({
                ...item,
                role_id: item.role_id ?? item.roleid ?? null,
                purchase_count: Number(item.purchase_count) || 0
            }));
            totalItems = await bot.database.ShopItems.count({
                where: { guild_id: guildId, is_active: true }
            });
        }
        const itemsList = shopItems.length
            ? shopItems.map((item, i) => {
                const roleInfo = item.role_id ? `<@&${item.role_id}>` : 'Без роли';
                return `${i + 1}. **${item.name}** — ${item.price} ${settings.economy.currency_emoji} | Продано: ${item.purchase_count} | Роль: ${roleInfo}`;
            }).join('\n')
            : 'Нет товаров в магазине';
        const embed = new discord_js_1.EmbedBuilder()
            .setColor('#9B59B6')
            .setTitle('🛒 Товары магазина')
            .setDescription('Статистика по товарам и продажам')
            .addFields({ name: 'Статус магазина', value: settings.economy.shop_enabled ? '🟢 Включён' : '🔴 Выключен', inline: true }, { name: 'Всего товаров', value: `${totalItems}`, inline: true }, { name: 'Множитель цен', value: `${settings.economy.prices_multiplier}x`, inline: true }, { name: 'Топ-10 товаров по продажам', value: itemsList, inline: false }, { name: 'ℹ️ Управление товарами', value: 'Используйте команды `/shop add` и `/shop remove` для управления товарами', inline: false })
            .setTimestamp();
        if (!interaction.deferred && !interaction.replied) {
            await interaction.deferUpdate();
        }
        await interaction.followUp({ embeds: [embed], ephemeral: true });
    }
    catch (err) {
        logger_1.logger.error('Error in showItemsStats:', err);
        try {
            if (!interaction.replied) {
                await interaction.followUp({ content: 'Ошибка при получении статистики товаров.', ephemeral: true });
            }
        }
        catch { }
    }
}
async function showEconomyHistory(interaction, bot, settingsService) {
    try {
        const guildId = interaction.guild.id;
        const settings = await settingsService.getGuildSettings(guildId);
        let purchases = [];
        let totalPurchases = 0;
        if (bot.database.UserPurchases && bot.database.ShopItems) {
            const purchasesResult = await bot.database.rawQuery(`
                SELECT 
                    up.id,
                    up.user_id,
                    si.name as item_name,
                    si.price as item_price,
                    up.createdAt
                FROM user_purchases up
                INNER JOIN shop_items si ON up.item_id = si.id
                WHERE up.guild_id = ?
                ORDER BY up.createdAt DESC
                LIMIT 15
            `, [guildId]);
            // Универсально обработать результат:
            let rows = [];
            if (Array.isArray(purchasesResult)) {
                rows = purchasesResult;
            }
            else if (Array.isArray(purchasesResult.rows)) {
                rows = purchasesResult.rows;
            }
            else if (Array.isArray(purchasesResult[0])) {
                rows = purchasesResult[0];
            }
            else {
                rows = [];
            }
            purchases = rows.map((p) => ({
                id: p.id,
                user_id: p.user_id,
                item_name: p.item_name,
                item_price: p.item_price,
                createdAt: p.createdAt
            }));
            totalPurchases = await bot.database.UserPurchases.count({
                where: { guild_id: guildId }
            });
        }
        const historyLines = purchases.length
            ? purchases.map((purchase, i) => {
                const date = new Date(purchase.createdAt).toLocaleString('ru-RU', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                });
                return `🛒 <@${purchase.user_id}> купил **${purchase.item_name}** за ${purchase.item_price} ${settings.economy.currency_emoji} (${date})`;
            }).join('\n')
            : 'История покупок пуста';
        const embed = new discord_js_1.EmbedBuilder()
            .setColor('#3498DB')
            .setTitle('📜 История покупок')
            .setDescription('Последние покупки в магазине сервера')
            .addFields({ name: 'Всего покупок', value: `${totalPurchases}`, inline: true }, { name: 'Показано', value: `${Math.min(purchases.length, 15)}`, inline: true }, { name: '\u200b', value: '\u200b', inline: true }, { name: '📋 Последние 15 покупок', value: historyLines, inline: false })
            .setFooter({ text: 'История обновляется в реальном времени' })
            .setTimestamp();
        if (!interaction.deferred && !interaction.replied) {
            await interaction.deferUpdate();
        }
        await interaction.followUp({ embeds: [embed], ephemeral: true });
    }
    catch (err) {
        logger_1.logger.error('Error in showEconomyHistory:', err);
        try {
            if (!interaction.replied) {
                await interaction.followUp({ content: 'Ошибка при получении истории покупок.', ephemeral: true });
            }
        }
        catch { }
    }
}
async function showEconomyStats(interaction, bot, settingsService) {
    try {
        const guildId = interaction.guild.id;
        const settings = await settingsService.getGuildSettings(guildId);
        // Базовые агрегаты
        let topUsers = [];
        let totalCoins = 0;
        if (bot.database.User) {
            // Топ-10 по монетам
            topUsers = await bot.database.User.findAll({
                attributes: ['id', 'username', 'coins', 'level'],
                order: [['coins', 'DESC']],
                limit: 10,
                raw: true,
            });
            // Сумма монет через статический агрегат модели
            const totalCoinsRaw = await bot.database.User.sum('coins');
            totalCoins = Number(totalCoinsRaw ?? 0);
        }
        const topLines = topUsers.length
            ? topUsers.map((u, i) => `${i + 1}. ${u.username ?? 'Unknown'} — ${u.coins} 🪙`).join('\n')
            : 'Пока нет данных';
        const embed = new discord_js_1.EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('Экономика — статистика')
            .setDescription('Сводка по настройкам и лидерам экономики')
            .addFields({ name: 'Магазин', value: settings.economy.shop_enabled ? 'Включён' : 'Выключен', inline: true }, { name: 'Множитель монет', value: `${settings.economy.prices_multiplier ?? 1}x`, inline: true }, { name: 'Дейли бонус', value: settings.economy.daily_bonus_enabled ? `${settings.economy.daily_bonus_max ?? 0} от ${settings.economy.daily_bonus_min ?? 0} 🪙` : 'Выключен', inline: true }, { name: 'Сумма монет (все пользователи)', value: `${totalCoins} 🪙`, inline: false }, { name: 'Топ-10 по монетам', value: topLines, inline: false })
            .setTimestamp();
        // Для клика по кнопке — корректный паттерн ответа
        if (!interaction.deferred && !interaction.replied) {
            await interaction.deferUpdate();
        }
        await interaction.followUp({ embeds: [embed], ephemeral: true });
    }
    catch (err) {
        logger_1.logger.error('Error in showEconomyStats:', err);
        try {
            if (!interaction.replied) {
                await interaction.followUp({ content: 'Ошибка при получении статистики экономики.', ephemeral: true });
            }
        }
        catch { }
    }
}
// --- Battlepass ---
async function showBPLevelsModal(interaction) {
    const modal = new discord_js_1.ModalBuilder()
        .setCustomId('set_bp_levels_modal')
        .setTitle('Установить количество уровней Battle Pass');
    const input = new discord_js_1.TextInputBuilder()
        .setCustomId('set_bp_levels_value')
        .setLabel('Введите новое количество уровней')
        .setPlaceholder('Напр: 50')
        .setStyle(discord_js_1.TextInputStyle.Short)
        .setRequired(true);
    const row = new discord_js_1.ActionRowBuilder().addComponents(input);
    modal.addComponents(row);
    await interaction.showModal(modal);
}
async function showBPXpForLevelsModal(interaction) {
    const modal = new discord_js_1.ModalBuilder()
        .setCustomId('set_bp_xp_for_levels_modal')
        .setTitle('Настроить XP для уровня BattlePass');
    const input = new discord_js_1.TextInputBuilder()
        .setCustomId('bp_xp_for_levels_value')
        .setLabel('Требуемое количество XP для любого уровня')
        .setPlaceholder('Например: 100')
        .setStyle(discord_js_1.TextInputStyle.Short)
        .setRequired(true);
    modal.addComponents(new discord_js_1.ActionRowBuilder().addComponents(input));
    await interaction.showModal(modal);
}
async function showBPDailyQuestModal(interaction) {
    const modal = new discord_js_1.ModalBuilder()
        .setCustomId('add_bp_dailyquest_modal')
        .setTitle('Добавить ежедневное задание');
    const textInput = new discord_js_1.TextInputBuilder()
        .setCustomId('daily_quest_text')
        .setLabel('Текст задания')
        .setPlaceholder('Например: Отправить 10 сообщений')
        .setStyle(discord_js_1.TextInputStyle.Short)
        .setRequired(true);
    const targetInput = new discord_js_1.TextInputBuilder()
        .setCustomId('daily_quest_target')
        .setLabel('Требуемое число (например, 10 сообщений — 10)')
        .setPlaceholder('10')
        .setStyle(discord_js_1.TextInputStyle.Short)
        .setRequired(true);
    const rewardInput = new discord_js_1.TextInputBuilder()
        .setCustomId('daily_quest_reward')
        .setLabel('Награда (xp)')
        .setPlaceholder('Например: 20')
        .setStyle(discord_js_1.TextInputStyle.Short)
        .setRequired(true);
    const typeInput = new discord_js_1.TextInputBuilder()
        .setCustomId('daily_quest_type')
        .setLabel('Тип задачи')
        .setPlaceholder('messages / voice / streak / gift / invites / custom')
        .setStyle(discord_js_1.TextInputStyle.Short)
        .setRequired(true);
    const gameTypeInput = new discord_js_1.TextInputBuilder()
        .setCustomId('daily_quest_gametype')
        .setLabel('Тип игры (для game-квестов)')
        .setPlaceholder('slots / dice / coin / duel (оставь пустым для любых)')
        .setStyle(discord_js_1.TextInputStyle.Short)
        .setRequired(false);
    modal.addComponents(new discord_js_1.ActionRowBuilder().addComponents(textInput), new discord_js_1.ActionRowBuilder().addComponents(targetInput), new discord_js_1.ActionRowBuilder().addComponents(rewardInput), new discord_js_1.ActionRowBuilder().addComponents(typeInput), new discord_js_1.ActionRowBuilder().addComponents(gameTypeInput));
    await interaction.showModal(modal);
}
async function showRemoveBPDailyQuestModal(interaction) {
    const modal = new discord_js_1.ModalBuilder()
        .setCustomId('remove_bp_dailyquest_modal')
        .setTitle('Удалить ежедневное задание');
    const indexInput = new discord_js_1.TextInputBuilder()
        .setCustomId('daily_quest_index')
        .setLabel('Номер задания для удаления (1, 2, 3...)')
        .setPlaceholder('1')
        .setStyle(discord_js_1.TextInputStyle.Short)
        .setRequired(true);
    modal.addComponents(new discord_js_1.ActionRowBuilder().addComponents(indexInput));
    await interaction.showModal(modal);
}
async function showBPWeeklyQuestModal(interaction) {
    const modal = new discord_js_1.ModalBuilder()
        .setCustomId('add_bp_weeklyquest_modal')
        .setTitle('Добавить еженедельное задание');
    const textInput = new discord_js_1.TextInputBuilder()
        .setCustomId('weekly_quest_text')
        .setLabel('Текст задания')
        .setPlaceholder('Например: Получить streak 7 дней')
        .setStyle(discord_js_1.TextInputStyle.Short)
        .setRequired(true);
    const targetInput = new discord_js_1.TextInputBuilder()
        .setCustomId('weekly_quest_target')
        .setLabel('Требуемое число (например, 7 дней streak — 7)')
        .setPlaceholder('7')
        .setStyle(discord_js_1.TextInputStyle.Short)
        .setRequired(true);
    const rewardInput = new discord_js_1.TextInputBuilder()
        .setCustomId('weekly_quest_reward')
        .setLabel('Награда (xp)')
        .setPlaceholder('100')
        .setStyle(discord_js_1.TextInputStyle.Short)
        .setRequired(true);
    const typeInput = new discord_js_1.TextInputBuilder()
        .setCustomId('weekly_quest_type')
        .setLabel('Тип задачи')
        .setPlaceholder('messages / voice / streak / gift / invites / custom')
        .setStyle(discord_js_1.TextInputStyle.Short)
        .setRequired(true);
    const gameTypeInput = new discord_js_1.TextInputBuilder()
        .setCustomId('weekly_quest_gametype')
        .setLabel('Тип игры (для game-квестов)')
        .setPlaceholder('slots / dice / coin / duel (оставь пустым для любых)')
        .setStyle(discord_js_1.TextInputStyle.Short)
        .setRequired(false);
    modal.addComponents(new discord_js_1.ActionRowBuilder().addComponents(textInput), new discord_js_1.ActionRowBuilder().addComponents(targetInput), new discord_js_1.ActionRowBuilder().addComponents(rewardInput), new discord_js_1.ActionRowBuilder().addComponents(typeInput), new discord_js_1.ActionRowBuilder().addComponents(gameTypeInput));
    await interaction.showModal(modal);
}
async function showRemoveBPWeeklyQuestModal(interaction) {
    const modal = new discord_js_1.ModalBuilder()
        .setCustomId('remove_bp_weeklyquest_modal')
        .setTitle('Удалить недельное задание');
    const indexInput = new discord_js_1.TextInputBuilder()
        .setCustomId('weekly_quest_index')
        .setLabel('Номер задания для удаления')
        .setPlaceholder('1')
        .setStyle(discord_js_1.TextInputStyle.Short)
        .setRequired(true);
    modal.addComponents(new discord_js_1.ActionRowBuilder().addComponents(indexInput));
    await interaction.showModal(modal);
}
async function showBPRewardModal(interaction) {
    const modal = new discord_js_1.ModalBuilder()
        .setCustomId('add_bp_reward_modal')
        .setTitle('Добавить/изменить награду за уровень');
    const levelInput = new discord_js_1.TextInputBuilder()
        .setCustomId('bp_reward_level')
        .setLabel('Номер уровня')
        .setPlaceholder('Например: 10')
        .setStyle(discord_js_1.TextInputStyle.Short)
        .setRequired(true);
    const rewardInput = new discord_js_1.TextInputBuilder()
        .setCustomId('bp_reward_text')
        .setLabel('Награда (текст, роль, количество монет)')
        .setPlaceholder('Например: 👑 Особая роль!')
        .setStyle(discord_js_1.TextInputStyle.Short)
        .setRequired(true);
    const typeInput = new discord_js_1.TextInputBuilder()
        .setCustomId('bp_reward_type')
        .setLabel('Тип награды (role, coins, custom)')
        .setPlaceholder('role')
        .setStyle(discord_js_1.TextInputStyle.Short)
        .setRequired(true);
    modal.addComponents(new discord_js_1.ActionRowBuilder().addComponents(levelInput), new discord_js_1.ActionRowBuilder().addComponents(rewardInput), new discord_js_1.ActionRowBuilder().addComponents(typeInput));
    await interaction.showModal(modal);
}
async function showRemoveBPRewardModal(interaction) {
    const modal = new discord_js_1.ModalBuilder()
        .setCustomId('remove_bp_reward_modal')
        .setTitle('Удалить награду за уровень');
    const levelInput = new discord_js_1.TextInputBuilder()
        .setCustomId('bp_reward_level')
        .setLabel('Уровень для удаления награды')
        .setPlaceholder('10')
        .setStyle(discord_js_1.TextInputStyle.Short)
        .setRequired(true);
    modal.addComponents(new discord_js_1.ActionRowBuilder().addComponents(levelInput));
    await interaction.showModal(modal);
}
async function resetBattlepassModal(interaction) {
    const modal = new discord_js_1.ModalBuilder()
        .setCustomId('confirm_reset_battlepass')
        .setTitle('Сбросить Battle Pass?');
    const confirmInput = new discord_js_1.TextInputBuilder()
        .setCustomId('confirm_text_battlepass')
        .setLabel('Напишите "ДА" для подтверждения')
        .setPlaceholder('Введите ДА')
        .setStyle(discord_js_1.TextInputStyle.Short)
        .setRequired(true);
    const row = new discord_js_1.ActionRowBuilder().addComponents(confirmInput);
    modal.addComponents(row);
    await interaction.showModal(modal);
}
// --- Администрирование ---
async function resetAdminModal(interaction, bot) {
    const guildId = interaction.guild.id;
    const modal = new discord_js_1.ModalBuilder()
        .setCustomId('confirm_reset_ai')
        .setTitle('Сбросить настройки ИИ?');
    const confirmInput = new discord_js_1.TextInputBuilder()
        .setCustomId('confirm_text_ai')
        .setLabel('Напишите "ДА" для подтверждения')
        .setPlaceholder('Введите ДА')
        .setStyle(discord_js_1.TextInputStyle.Short)
        .setRequired(true);
    const row = new discord_js_1.ActionRowBuilder().addComponents(confirmInput);
    modal.addComponents(row);
    await interaction.showModal(modal);
}
async function showAdminRolesModal(interaction) {
    const modal = new discord_js_1.ModalBuilder()
        .setCustomId('admin_roles_modal')
        .setTitle('Управление админ ролями');
    const rolesInput = new discord_js_1.TextInputBuilder()
        .setCustomId('admin_roles')
        .setLabel('ID ролей через пробел (или "clear")')
        .setStyle(discord_js_1.TextInputStyle.Paragraph)
        .setMaxLength(1000)
        .setPlaceholder('123456789012345678 987654321098765432')
        .setRequired(true);
    const actionRow = new discord_js_1.ActionRowBuilder()
        .addComponents(rolesInput);
    modal.addComponents(actionRow);
    await interaction.showModal(modal);
}
async function showAdminUsersModal(interaction) {
    const modal = new discord_js_1.ModalBuilder()
        .setCustomId('admin_users_modal')
        .setTitle('👤 Управление админ пользователями');
    const usersInput = new discord_js_1.TextInputBuilder()
        .setCustomId('admin_users')
        .setLabel('ID пользователей через пробел (или "clear")')
        .setStyle(discord_js_1.TextInputStyle.Paragraph)
        .setMaxLength(1000)
        .setPlaceholder('123456789012345678 987654321098765432')
        .setRequired(true);
    const actionRow = new discord_js_1.ActionRowBuilder()
        .addComponents(usersInput);
    modal.addComponents(actionRow);
    await interaction.showModal(modal);
}
// --- Система ---
async function showSetTimezoneModal(interaction) {
    const modal = new discord_js_1.ModalBuilder()
        .setCustomId('set_timezone_modal')
        .setTitle('Изменить таймзону бота');
    const zoneInput = new discord_js_1.TextInputBuilder()
        .setCustomId('timezone_value')
        .setLabel('Введите таймзону (например: Europe/Moscow)')
        .setStyle(discord_js_1.TextInputStyle.Short)
        .setMinLength(3)
        .setMaxLength(50)
        .setPlaceholder('Europe/Moscow, UTC, Asia/Almaty, America/New_York')
        .setRequired(true);
    const row = new discord_js_1.ActionRowBuilder().addComponents(zoneInput);
    modal.addComponents(row);
    await interaction.showModal(modal);
}
async function showSetLanguageModal(interaction) {
    const modal = new discord_js_1.ModalBuilder()
        .setCustomId('set_language_modal')
        .setTitle('Выбор языка интерфейса');
    const examples = 'ru, ua, uk';
    const langInput = new discord_js_1.TextInputBuilder()
        .setCustomId('language_value')
        .setLabel('Введите код языка (например: ru, ua, uk)')
        .setStyle(discord_js_1.TextInputStyle.Short)
        .setMinLength(2)
        .setMaxLength(5)
        .setPlaceholder(examples)
        .setRequired(true);
    modal.addComponents(new discord_js_1.ActionRowBuilder().addComponents(langInput));
    await interaction.showModal(modal);
}
// --- Модерация ---
async function resetModerationModal(interaction, bot) {
    const guildId = interaction.guild.id;
    const modal = new discord_js_1.ModalBuilder()
        .setCustomId('confirm_reset_moderation')
        .setTitle('Сбросить настройки модерации?');
    const confirmInput = new discord_js_1.TextInputBuilder()
        .setCustomId('confirm_text_moderation')
        .setLabel('Напишите "ДА" для подтверждения')
        .setPlaceholder('Введите ДА')
        .setStyle(discord_js_1.TextInputStyle.Short)
        .setRequired(true);
    const row = new discord_js_1.ActionRowBuilder().addComponents(confirmInput);
    modal.addComponents(row);
    await interaction.showModal(modal);
}
async function showModerationLogs(interaction, bot, settingsService) {
    try {
        const guildId = interaction.guild.id;
        const settings = await settingsService.getGuildSettings(guildId);
        if (!settings.moderation.enabled) {
            if (!interaction.deferred && !interaction.replied)
                await interaction.deferUpdate();
            return interaction.followUp({ content: 'Автомод выключен — логов нет.', ephemeral: true });
        }
        let channel = interaction.channel;
        if (!channel || !channel.isTextBased()) {
            if (!interaction.deferred && !interaction.replied)
                await interaction.deferUpdate();
            return interaction.followUp({ content: 'Этот канал не текстовый, логи здесь не читаются.', ephemeral: true });
        }
        const msgs = await channel.messages.fetch({ limit: 100 });
        const botId = interaction.client.user.id;
        const automodMsgs = msgs
            .filter(m => m.author.id === botId && m.embeds?.[0]?.title?.toLowerCase() === 'automod')
            .first(10);
        const lines = automodMsgs.length
            ? automodMsgs.map(m => {
                const ts = `<t:${Math.floor(m.createdTimestamp / 1000)}:f>`;
                const e = m.embeds[0];
                const get = (n) => e.fields?.find(f => f.name === n)?.value ?? '';
                const user = get('Пользователь') || '—';
                const punishment = get('Наказание') || '—';
                const reason = get('Причина') || e.description || '—';
                return `${ts} — ${user} • ${punishment} • ${reason}`.slice(0, 200);
            }).join('\n')
            : 'Логи авто‑модерации не найдены за последние 100 сообщений.';
        const embed = new discord_js_1.EmbedBuilder()
            .setColor('#FF4444')
            .setTitle('Логи авто‑модерации')
            .setDescription(lines)
            .setTimestamp();
        if (!interaction.deferred && !interaction.replied)
            await interaction.deferUpdate();
        await interaction.followUp({ embeds: [embed], ephemeral: true });
    }
    catch (err) {
        logger_1.logger.error('Error in showModerationLogs:', err);
        try {
            if (!interaction.replied) {
                await interaction.followUp({ content: 'Ошибка при получении логов модерации.', ephemeral: true });
            }
        }
        catch { }
    }
}
//# sourceMappingURL=settings.js.map