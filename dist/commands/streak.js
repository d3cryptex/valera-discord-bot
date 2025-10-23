"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.data = void 0;
exports.execute = execute;
const discord_js_1 = require("discord.js");
const SettingsService_1 = require("../services/settings/SettingsService");
exports.data = new discord_js_1.SlashCommandBuilder()
    .setName('streak')
    .setDescription('Ваша серия ежедневных бонусов');
async function execute(interaction, bot) {
    const guildId = interaction.guild.id;
    const userId = interaction.user.id;
    // Получаем настройки и проверяем включен ли streak/daily бонус
    const settingsService = new SettingsService_1.SettingsService(bot.database, bot.redis);
    const settings = await settingsService.getGuildSettings(guildId);
    if (!settings.economy?.daily_bonus_enabled) {
        const embed = new discord_js_1.EmbedBuilder()
            .setColor('#eb4034')
            .setTitle('Ошибка')
            .setDescription('❌ Серия бонусов отключена.')
            .setFooter({ text: 'Администратор сервера отключил механику серии ежедневных бонусов.' });
        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
    }
    const user = await bot.database.getUser(userId);
    const streak = user.streak ?? 0;
    await interaction.reply({
        embeds: [
            new discord_js_1.EmbedBuilder()
                .setColor(streak < 2 ? '#FFAA00' : '#00FF00')
                .setTitle('🔥 Ваша серия')
                .setDescription(streak > 1
                ? `Вы получаете ежедневные бонусы **${streak}** дней подряд!`
                : 'Серия ещё не началась — заходите за бонусом каждый день.'),
        ],
    });
}
//# sourceMappingURL=streak.js.map