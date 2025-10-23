import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, User } from 'discord.js';
import { DiscordBot } from '../index';
import { SettingsService } from '../services/settings/SettingsService';
import { DateTime } from 'luxon';
import { updateBattlePassProgress } from '../services/battlepass/updateBattlePassProgress';

export const data = new SlashCommandBuilder()
  .setName('gift')
  .setDescription('Подарить дневной бонус')
  .addUserOption(o =>
    o.setName('user').setDescription('Кому подарить бонус').setRequired(true)
  )
  .addIntegerOption(o =>
    o.setName('amount')
      .setDescription('Сколько монет подарить')
      .setRequired(true)
      .setMinValue(1)
      .setMaxValue(1000000)  
  );

export async function execute(interaction: ChatInputCommandInteraction, bot: DiscordBot) {
    await interaction.deferReply();
    const senderId = interaction.user.id;
    const recipient = interaction.options.getUser('user', true);
    const guildId = interaction.guild!.id;
    const settingsService = new SettingsService(bot.database, bot.redis);
    const settings = await settingsService.getGuildSettings(guildId);
  
    if (recipient.id === senderId) {
      await interaction.editReply('❌ Нельзя подарить самому себе!');
      return;
    }
  
    if (!bot.database.User) throw new Error('Database not connected');
  
    // Проверяем баланс отправителя
    const amount = interaction.options.getInteger('amount', true);
    const sender = await bot.database.getUser(senderId);
  
    if (sender.coins < amount) {
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor('#eb4034')
            .setTitle('Недостаточно средств')
            .setDescription(`У вас только ${sender.coins} ${settings.economy.currency_emoji}.`)
        ]
      });
      return;
    }
  
    // Переводим монеты
    await bot.database.createUser(recipient.id, recipient.username);
    await bot.database.User.increment('coins', { by: amount, where: { id: recipient.id } });
    await bot.database.User.increment('coins', { by: -amount, where: { id: senderId } });
  
    await updateBattlePassProgress({
      bot,
      userId: senderId,
      guildId,
      type: 'gift',
      amount: 1,
      isDaily: true,
      channel: interaction.channel, 
      interaction 
    });

    // Показываем обновлённый баланс
    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor('#00FF00')
          .setTitle('🎉 Подарок отправлен!')
          .setDescription(`${recipient.username} получил ${amount} ${settings.economy.currency_emoji} от вас!\nВаш баланс: ${sender.coins - amount} ${settings.economy.currency_emoji}`)
      ]
    });
}