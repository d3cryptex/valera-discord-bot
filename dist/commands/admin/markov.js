"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.data = void 0;
exports.execute = execute;
const discord_js_1 = require("discord.js");
const logger_1 = require("../../utils/logger");
const SettingsService_1 = require("../../services/settings/SettingsService");
exports.data = new discord_js_1.SlashCommandBuilder()
    .setName('markov')
    .setDescription('Управление AI-чатом (только для администраторов)')
    .setDefaultMemberPermissions(discord_js_1.PermissionFlagsBits.Administrator)
    .addSubcommand(subcommand => subcommand
    .setName('generate')
    .setDescription('Принудительно сгенерировать ответ')
    .addStringOption(option => option
    .setName('start_word')
    .setDescription('Стартовое слово (опционально)')))
    .addSubcommand(subcommand => subcommand
    .setName('stats')
    .setDescription('Статистика обученной модели'))
    .addSubcommand(subcommand => subcommand
    .setName('clear')
    .setDescription('Очистить данные обучения (ОСТОРОЖНО!)'))
    .addSubcommand(subcommand => subcommand
    .setName('meme')
    .setDescription('Создать мем из последних изображений и AI-текста'));
async function execute(interaction, bot) {
    const settingsService = new SettingsService_1.SettingsService(bot.database, bot.redis);
    const settings = await settingsService.getGuildSettings(interaction.guild.id);
    if (!settings.economy.shop_enabled) {
        const embed = new discord_js_1.EmbedBuilder()
            .setColor('#eb4034')
            .setTitle('Ошибка')
            .setDescription('❌ ИИ выключен на этом сервере.');
        await interaction.editReply({ embeds: [embed] });
        return;
    }
    const subcommand = interaction.options.getSubcommand();
    switch (subcommand) {
        case 'generate':
            await handleGenerate(interaction, bot);
            break;
        case 'stats':
            await handleStats(interaction, bot);
            break;
        case 'clear':
            await handleClear(interaction, bot);
            break;
        case 'meme':
            await handleMeme(interaction, bot);
            break;
    }
}
async function handleMeme(interaction, bot) {
    await interaction.deferReply();
    try {
        if (!interaction.guildId) {
            await interaction.editReply({ content: 'Мемы работают только на серверах!' });
            return;
        }
        // 1-3 картинки случайно, можно option заменить на строгое значение
        const count = Math.floor(Math.random() * 3) + 1;
        const imagePaths = await bot.database.getRandomMemeImages(interaction.guildId, count);
        if (!imagePaths.length) {
            const embed = new discord_js_1.EmbedBuilder()
                .setColor('#eb4034')
                .setTitle('Ошибка')
                .setDescription('❌ Нет сохранённых картинок на сервере!');
            await interaction.editReply({ embeds: [embed] });
            return;
        }
        const topText = (await bot.markov.generateResponse(interaction.guildId, interaction.channelId)) || '';
        const bottomText = (await bot.markov.generateResponse(interaction.guildId, interaction.channelId)) || '';
        let buffer;
        if (imagePaths.length === 1) {
            // Обычный мем: одна картинка — текст сверху/снизу
            buffer = await bot.markov.makeMultiImageMeme(imagePaths, topText, bottomText);
        }
        else {
            // Оверлей: main — первая, overlays — остальные
            const [mainPath, ...overlays] = imagePaths;
            buffer = await bot.markov.makeOverlayMeme(mainPath, overlays, topText, bottomText);
        }
        const attachment = new discord_js_1.AttachmentBuilder(buffer, { name: 'ai_meme.png' });
        await interaction.editReply({
            files: [attachment]
        });
    }
    catch (error) {
        logger_1.logger.error('Error generating AI meme:', error);
        const embed = new discord_js_1.EmbedBuilder()
            .setColor('#eb4034')
            .setTitle('Ошибка')
            .setDescription('❌ Произошла ошибка при создании мема.');
        await interaction.editReply({ embeds: [embed] });
    }
}
async function handleGenerate(interaction, bot) {
    await interaction.deferReply();
    try {
        const response = await bot.markov.generateResponse(interaction.guild.id, interaction.channel.id);
        if (response) {
            const embed = new discord_js_1.EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('🤖 AI Ответ')
                .setDescription(response)
                .setFooter({ text: 'Случайное стартовое слово (bigram)' });
            await interaction.editReply({ embeds: [embed] });
        }
        else {
            const embed = new discord_js_1.EmbedBuilder()
                .setColor('#eb4034')
                .setTitle('Ошибка')
                .setDescription('❌ Не удалось сгенерировать ответ. Возможно, недостаточно данных для обучения.');
            await interaction.editReply({ embeds: [embed] });
            return;
        }
    }
    catch (error) {
        logger_1.logger.error('Error generating Markov response:', error);
        const embed = new discord_js_1.EmbedBuilder()
            .setColor('#eb4034')
            .setTitle('Ошибка')
            .setDescription('❌ Произошла ошибка при генерации ответа.');
        await interaction.editReply({ embeds: [embed] });
        return;
    }
}
async function handleStats(interaction, bot) {
    await interaction.deferReply();
    try {
        if (!bot.database.MarkovBigram)
            throw new Error('Database not connected');
        // Общее количество пар
        const totalPairs = await bot.database.MarkovBigram.count({
            where: { guild_id: interaction.guild.id }
        });
        // Количество уникальных слов
        const uniqueTokens = await bot.database.MarkovBigram.count({
            where: { guild_id: interaction.guild.id },
            distinct: true,
            col: 'curr_token'
        });
        const settings = await bot.settingsService.getGuildSettings(interaction.guild.id);
        const embed = new discord_js_1.EmbedBuilder()
            .setColor('#0099FF')
            .setTitle('📊 Статистика AI-модели (Bigram)')
            .addFields([
            { name: 'Всего пар биграмм:', value: totalPairs.toString(), inline: true },
            { name: 'Уникальных токенов:', value: uniqueTokens.toString(), inline: true },
            { name: 'Вероятность ответа:', value: `${(settings.ai.response_chance * 100)}%`, inline: true }
        ])
            .setFooter({ text: 'Модель обучается на сообщениях пользователей (Bigram chain)' });
        await interaction.editReply({ embeds: [embed] });
    }
    catch (error) {
        logger_1.logger.error('Error getting Markov stats:', error);
        const embed = new discord_js_1.EmbedBuilder()
            .setColor('#eb4034')
            .setTitle('Ошибка')
            .setDescription('❌ Произошла ошибка при получении статистики.');
        await interaction.editReply({ embeds: [embed] });
        return;
    }
}
async function handleClear(interaction, bot) {
    await interaction.deferReply();
    try {
        if (!bot.database.MarkovBigram) {
            throw new Error('Database not connected');
        }
        // Удаляем все записи для данного сервера
        await bot.database.MarkovBigram.destroy({
            where: { guild_id: interaction.guild.id }
        });
        const embed = new discord_js_1.EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('🗑️ Данные очищены')
            .setDescription('Все данные обучения AI-модели для этого сервера были удалены.')
            .setFooter({ text: 'Модель начнет обучение заново с новых сообщений' });
        await interaction.editReply({ embeds: [embed] });
    }
    catch (error) {
        logger_1.logger.error('Error clearing Markov data:', error);
        const embed = new discord_js_1.EmbedBuilder()
            .setColor('#eb4034')
            .setTitle('Ошибка')
            .setDescription('❌ Произошла ошибка при очистке данных.');
        await interaction.editReply({ embeds: [embed] });
        return;
    }
}
//# sourceMappingURL=markov.js.map