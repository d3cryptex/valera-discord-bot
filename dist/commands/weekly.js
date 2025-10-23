"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.data = void 0;
exports.execute = execute;
const discord_js_1 = require("discord.js");
const SettingsService_1 = require("../services/settings/SettingsService");
const luxon_1 = require("luxon");
exports.data = new discord_js_1.SlashCommandBuilder()
    .setName('weekly')
    .setDescription('Получить еженедельный бонус');
async function execute(interaction, bot) {
    await interaction.deferReply();
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;
    const settingsService = new SettingsService_1.SettingsService(bot.database, bot.redis);
    const settings = await settingsService.getGuildSettings(guildId);
    if (!settings.economy?.weekly_bonus_enabled) {
        const embed = new discord_js_1.EmbedBuilder()
            .setColor('#eb4034')
            .setTitle('Ошибка')
            .setDescription('❌ Еженедельные награды отключены')
            .setFooter({ text: 'Администратор сервера отключил механику еженедельных бонусов.' });
        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
    }
    try {
        const weekNum = luxon_1.DateTime.now().weekNumber;
        const key = `weekly:${userId}:${guildId}`;
        const last = await bot.redis.get(key);
        if (last == `${weekNum}`) {
            await interaction.editReply({ embeds: [
                    new discord_js_1.EmbedBuilder()
                        .setTitle('⏰ Уже получено')
                        .setDescription('Еженедельный бонус уже получен, возвращайтесь на следующей неделе!')
                        .setColor('#FFFF00')
                ] });
            return;
        }
        // Бонус — больше чем daily
        const amount = Math.floor(((settings.economy.weekly_bonus_max + settings.economy.weekly_bonus_min) / 2) * 5);
        if (!bot.database.User) {
            throw new Error('Database not connected');
        }
        await bot.database.createUser(userId, interaction.user.username);
        await bot.database.User.increment('coins', { by: amount, where: { id: userId } });
        await bot.redis.set(key, `${weekNum}`, 604800); // неделя
        const user = await bot.database.getUser(userId);
        await interaction.editReply({ embeds: [
                new discord_js_1.EmbedBuilder()
                    .setColor('#00FF00')
                    .setTitle('🎀 Еженедельный бонус получен!')
                    .setDescription(`+${amount} ${settings.economy.currency_emoji}`)
                    .addFields({ name: 'Ваш баланс:', value: `${user.coins} ${settings.economy.currency_emoji}`, inline: true })
                    .setFooter({ text: 'Бонус обновляется каждое воскресенье' })
            ] });
    }
    catch (err) {
        await interaction.editReply({ embeds: [
                new discord_js_1.EmbedBuilder()
                    .setColor('#eb4034')
                    .setTitle('Ошибка')
                    .setDescription('❌ Не удалось получить еженедельный бонус.')
            ] });
    }
}
//# sourceMappingURL=weekly.js.map