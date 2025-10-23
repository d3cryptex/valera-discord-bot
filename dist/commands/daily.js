"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.data = void 0;
exports.execute = execute;
const discord_js_1 = require("discord.js");
const SettingsService_1 = require("../services/settings/SettingsService");
const luxon_1 = require("luxon");
const updateBattlePassProgress_1 = require("../services/battlepass/updateBattlePassProgress");
exports.data = new discord_js_1.SlashCommandBuilder()
    .setName('daily')
    .setDescription('Получить ежедневный бонус');
async function execute(interaction, bot) {
    await interaction.deferReply();
    try {
        const settingsService = new SettingsService_1.SettingsService(bot.database, bot.redis);
        const settings = await settingsService.getGuildSettings(interaction.guild.id);
        if (!settings.economy.daily_bonus_enabled) {
            const embed = new discord_js_1.EmbedBuilder()
                .setColor('#eb4034')
                .setTitle('Ошибка')
                .setDescription('❌ Ежедневный бонус отключен на этом сервере.')
                .setFooter({ text: 'Администратор сервера отключил механику ежедневных бонусов.' });
            await interaction.reply({ embeds: [embed], ephemeral: true });
            return;
        }
        const userId = interaction.user.id;
        await bot.database.createUser(userId, interaction.user.username);
        const timezone = settings.system.timezone || 'Europe/Moscow';
        const now = luxon_1.DateTime.now().setZone(timezone);
        const today = now.toFormat('yyyy-MM-dd');
        const lastClaimKey = `daily:${userId}:${interaction.guild.id}`;
        const lastClaim = await bot.redis.get(lastClaimKey);
        // Получаем пользователя (теперь streak в БД)
        const user = await bot.database.getUser(userId);
        let streak = user.streak ?? 0;
        const lastStreakDate = user.last_streak_date ?? null;
        const yesterday = now.minus({ days: 1 }).toFormat('yyyy-MM-dd');
        if (lastClaim === today) {
            await interaction.editReply({ embeds: [
                    new discord_js_1.EmbedBuilder()
                        .setColor('#FFFF00')
                        .setTitle('⏰ Уже получено')
                        .setDescription(`Вы уже получили ежедневный бонус сегодня!\n\nВаша серия: ${streak} дней подряд`)
                        .setFooter({ text: 'Бонусы обновляются в полночь' })
                ] });
            return;
        }
        // streak (логика в БД)
        if (lastStreakDate === yesterday) {
            streak += 1;
        }
        else {
            streak = 1;
        }
        // Начисляем бонус
        const min = settings.economy.daily_bonus_min;
        const max = settings.economy.daily_bonus_max;
        const bonusAmount = Math.floor((Math.random() * (max - min + 1)) + min);
        if (!bot.database.User)
            throw new Error('Database not connected');
        await bot.database.User.increment('coins', {
            by: bonusAmount,
            where: { id: userId }
        });
        // Сохраняем streak и last_streak_date в БД
        await bot.database.User.update({ streak, last_streak_date: today }, { where: { id: userId } });
        await (0, updateBattlePassProgress_1.updateBattlePassProgress)({
            bot,
            userId,
            guildId: interaction.guild.id,
            type: 'streak',
            isDaily: true,
            channel: interaction.channel,
            interaction
        });
        // Сохраняем факт получения бонуса на сегодня
        const midnight = now.plus({ days: 1 }).startOf('day');
        const secondsUntilMidnight = Math.max(1, Math.floor(midnight.diff(now, 'seconds').seconds));
        await bot.redis.set(lastClaimKey, today, secondsUntilMidnight);
        // Обновлённые данные пользователя
        const userAfter = await bot.database.getUser(userId);
        const embed = new discord_js_1.EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('🎁 Ежедневный бонус получен!')
            .setDescription(`Вы получили **${bonusAmount}** ${settings.economy.currency_emoji}\nВаша серия: **${userAfter.streak}** дней подряд!`)
            .addFields([
            { name: 'Ваш баланс:', value: `${userAfter.coins} ${settings.economy.currency_emoji}`, inline: true },
            { name: 'Следующий бонус:', value: 'Завтра в полночь', inline: true }
        ])
            .setFooter({ text: 'Не забывайте заходить каждый день!' })
            .setTimestamp();
        await interaction.editReply({ embeds: [embed] });
    }
    catch (error) {
        console.error('Error in daily command:', error);
        const embed = new discord_js_1.EmbedBuilder()
            .setColor('#eb4034')
            .setTitle('Ошибка')
            .setDescription('❌ Произошла ошибка при получении бонуса.');
        await interaction.editReply({ embeds: [embed] });
    }
}
//# sourceMappingURL=daily.js.map