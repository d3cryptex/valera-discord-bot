import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, User } from 'discord.js';
import { DiscordBot } from '../index';
import { SettingsService } from '../services/settings/SettingsService';
import { DateTime } from 'luxon';

export const data = new SlashCommandBuilder()
  .setName('streak')
  .setDescription('Ваша серия ежедневных бонусов');

export async function execute(interaction: ChatInputCommandInteraction, bot: DiscordBot) {
    const guildId = interaction.guild!.id;
    const userId = interaction.user.id;

    // Получаем настройки и проверяем включен ли streak/daily бонус
    const settingsService = new SettingsService(bot.database, bot.redis);
    const settings = await settingsService.getGuildSettings(guildId);

    if (!settings.economy?.daily_bonus_enabled) {
      const embed = new EmbedBuilder()
        .setColor('#eb4034')
        .setTitle('Ошибка')
        .setDescription('❌ Серия бонусов отключена.')
        .setFooter({ text: 'Администратор сервера отключил механику серии ежедневных бонусов.' });
      await interaction.reply({ embeds: [embed], ephemeral: true});
      return;
    }

    const user = await bot.database.getUser(userId);
    const streak = user.streak ?? 0;
  
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(streak < 2 ? '#FFAA00' : '#00FF00')
          .setTitle('🔥 Ваша серия')
          .setDescription(
            streak > 1
              ? `Вы получаете ежедневные бонусы **${streak}** дней подряд!`
              : 'Серия ещё не началась — заходите за бонусом каждый день.'
          ),
      ],
    });
}