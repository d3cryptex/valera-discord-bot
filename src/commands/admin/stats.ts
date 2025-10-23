import { PermissionFlagsBits, SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { DiscordBot } from '../../index';
import { logger } from '../../utils/logger'; 
import { isUserAdmin } from '../../utils/helpers';

export const data = new SlashCommandBuilder()
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setName('stats')
    .setDescription('Статистика бота');

export async function execute(interaction: ChatInputCommandInteraction, bot: DiscordBot) {
    await interaction.deferReply();

    const settings = await bot.settingsService.getGuildSettings(interaction.guild!.id);
    const admin = settings.admin ?? { roles: [], users: [] };
    if (!isUserAdmin(interaction, admin)) {
        const embed = new EmbedBuilder()
            .setColor('#eb4034')
            .setTitle('Ошибка')
            .setDescription('⛔ У вас нет прав на просмотр статистики бота!')
        await interaction.editReply({ embeds: [embed]});
        return;
    }

    try {
        if (!bot.database.User || !bot.database.MarkovBigram) {
            throw new Error('Database not connected');
        }

        // Получаем статистику из кэша
        const cachedStats = await bot.redis.get('bot_statistics');
        let stats;

        if (cachedStats) {
            stats = JSON.parse(cachedStats);
        } else {
            // Если нет кэша, получаем из базы через Sequelize
            const totalUsers = await bot.database.User.count();
            const totalMarkov = await bot.database.MarkovBigram.count(); 

            stats = {
                totalUsers,
                totalMarkov
            };

            // Кэшируем на 5 минут
            await bot.redis.set('bot_statistics', JSON.stringify(stats), 300);
        }

        // Статистика процесса
        const uptime = process.uptime();
        const memoryUsage = process.memoryUsage();

        // Создаем объект footer с правильной типизацией
        const footerData: { text: string; iconURL?: string } = {
            text: `Bot-Hosting.net | Node.js ${process.version}`
        };

        // Добавляем iconURL только если он существует
        const avatarURL = bot.client.user?.displayAvatarURL();
        if (avatarURL) {
            footerData.iconURL = avatarURL;
        }

        const embed = new EmbedBuilder()
            .setColor('#00BFFF')
            .setTitle('📊 Статистика бота')
            .addFields([
                { name: '👥 Пользователи', value: stats.totalUsers.toString(), inline: true },
                { name: '🏠 Серверы', value: bot.client.guilds.cache.size.toString(), inline: true },
                { name: '🧠 Markov данные (Bigram)', value: stats.totalMarkov?.toString() || '0', inline: true },
                { name: '⏱️ Время работы', value: formatUptime(uptime), inline: true },
                { name: '💾 Память', value: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`, inline: true },
                { name: '🚀 Ping', value: `${bot.client.ws.ping}ms`, inline: true }
            ])
            .setFooter(footerData)
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });

    } catch (error) {
        logger.error('Error in stats command:', error);
        const embed = new EmbedBuilder()
            .setColor('#eb4034')
            .setTitle('Ошибка')
            .setDescription('❌ Произошла ошибка при получении статистики.');
        await interaction.editReply({ embeds: [embed] });
    }
}

function formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}д ${hours}ч ${minutes}м`;
    if (hours > 0) return `${hours}ч ${minutes}м`;
    return `${minutes}м`;
}