import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, User } from 'discord.js';
import { DiscordBot } from '../index';
import { SettingsService } from '../services/settings/SettingsService';
import { DateTime } from 'luxon';

export const data = new SlashCommandBuilder()
  .setName('weekly')
  .setDescription('Получить еженедельный бонус');

export async function execute(interaction: ChatInputCommandInteraction, bot: DiscordBot) {
  await interaction.deferReply();

  const userId = interaction.user.id;
  const guildId = interaction.guild!.id;
  const settingsService = new SettingsService(bot.database, bot.redis);
  const settings = await settingsService.getGuildSettings(guildId);
  if (!settings.economy?.weekly_bonus_enabled) {
    const embed = new EmbedBuilder()
      .setColor('#eb4034')
      .setTitle('Ошибка')
      .setDescription('❌ Еженедельные награды отключены')
      .setFooter({ text: 'Администратор сервера отключил механику еженедельных бонусов.' });
    await interaction.reply({ embeds: [embed], ephemeral: true});
    return;
  }

  try {
    const weekNum = DateTime.now().weekNumber;
    const key = `weekly:${userId}:${guildId}`;
    const last = await bot.redis.get(key);

    if (last == `${weekNum}`) {
      await interaction.editReply({ embeds: [
        new EmbedBuilder()
          .setTitle('⏰ Уже получено')
          .setDescription('Еженедельный бонус уже получен, возвращайтесь на следующей неделе!')
          .setColor('#FFFF00')
      ]});
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
      new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('🎀 Еженедельный бонус получен!')
        .setDescription(`+${amount} ${settings.economy.currency_emoji}`)
        .addFields({ name: 'Ваш баланс:', value: `${user.coins} ${settings.economy.currency_emoji}`, inline: true })
        .setFooter({ text: 'Бонус обновляется каждое воскресенье' })
    ]});
  } catch (err) {
    await interaction.editReply({ embeds: [
      new EmbedBuilder()
        .setColor('#eb4034')
        .setTitle('Ошибка')
        .setDescription('❌ Не удалось получить еженедельный бонус.')
    ]});
  }
}