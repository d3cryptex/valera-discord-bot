"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.data = void 0;
exports.execute = execute;
const discord_js_1 = require("discord.js");
const sequelize_1 = require("sequelize");
exports.data = new discord_js_1.SlashCommandBuilder()
    .setName('server-info')
    .setDescription('Информация о сервере');
async function execute(interaction, bot) {
    await interaction.deferReply();
    try {
        if (!bot.database.User || !bot.database.MarkovBigram) {
            throw new Error('Database not connected');
        }
        const guild = interaction.guild;
        // Получаем количество активных пользователей (с XP > 0)
        const activeUserCount = await bot.database.User.count({
            where: {
                xp: {
                    [sequelize_1.Op.gt]: 0 // Используем Op вместо Sequelize.Op
                }
            }
        });
        // Получаем топ пользователя по уровню
        const topUser = await bot.database.User.findOne({
            order: [
                ['level', 'DESC'],
                ['xp', 'DESC']
            ],
            raw: true,
        });
        // Получаем статистику AI для данного сервера
        const totalWords = await bot.database.MarkovBigram.count({
            where: { guild_id: guild.id }
        });
        const uniqueWords = await bot.database.MarkovBigram.count({
            where: { guild_id: guild.id },
            distinct: true,
            col: 'curr_token'
        });
        const embed = new discord_js_1.EmbedBuilder()
            .setColor('#0099FF')
            .setTitle(`📊 Информация о сервере: ${guild.name}`)
            .setThumbnail(guild.iconURL() || null)
            .addFields([
            {
                name: '👥 Участники',
                value: `Всего: ${guild.memberCount}\nАктивных: ${activeUserCount}`,
                inline: true
            },
            {
                name: '📈 Каналы',
                value: `Текстовых: ${guild.channels.cache.filter(c => c.type === 0).size}\nГолосовых: ${guild.channels.cache.filter(c => c.type === 2).size}`,
                inline: true
            },
            {
                name: '🎭 Роли',
                value: `${guild.roles.cache.size}`,
                inline: true
            },
            {
                name: '🤖 AI Статистика',
                value: `Словарных пар: ${totalWords}\nУникальных слов: ${uniqueWords}`,
                inline: true
            },
            {
                name: '🏆 Топ игрок',
                value: topUser ?
                    `<@${topUser.id}>\nУровень: ${topUser.level}` :
                    'Нет активных игроков',
                inline: true
            },
            {
                name: '📅 Создан',
                value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`,
                inline: true
            }
        ])
            .setFooter({
            text: `ID сервера: ${guild.id}`,
            iconURL: interaction.client.user.displayAvatarURL()
        })
            .setTimestamp();
        if (guild.description) {
            embed.setDescription(guild.description);
        }
        await interaction.editReply({ embeds: [embed] });
    }
    catch (error) {
        console.error('Error in server-info:', error);
        const embed = new discord_js_1.EmbedBuilder()
            .setColor('#eb4034')
            .setTitle('Ошибка')
            .setDescription('❌ Произошла ошибка при получении информации о сервере.');
        await interaction.editReply({ embeds: [embed] });
    }
}
//# sourceMappingURL=server-info.js.map