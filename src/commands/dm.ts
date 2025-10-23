import { SlashCommandBuilder, ChatInputCommandInteraction, User } from "discord.js";

  export const data = new SlashCommandBuilder()
    .setName('dm')
    .setDescription('Отправить личное сообщение участнику сервера через бота')
    .addUserOption(opt =>
      opt.setName('target').setDescription('Кому отправить ЛС').setRequired(true))
    .addStringOption(opt =>
      opt.setName('text').setDescription('Текст сообщения').setRequired(true));

export async function execute(interaction: ChatInputCommandInteraction, bot: any) {
  const target: User = interaction.options.getUser('target', true);
  const text = interaction.options.getString('text', true);

  try {
    await target.send(`💬 Новое личное сообщение от ${interaction.user.tag}:\n${text}`);
    await interaction.reply({ content: '✅ Сообщение отправлено в личку!', ephemeral: true });
  } catch (err) {
    await interaction.reply({
      content: '❌ Не удалось отправить личное сообщение (возможно, пользователь закрыл ЛС).',
      ephemeral: true
    });
  }
}