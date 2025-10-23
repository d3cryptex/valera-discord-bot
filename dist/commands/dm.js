"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.data = void 0;
exports.execute = execute;
const discord_js_1 = require("discord.js");
exports.data = new discord_js_1.SlashCommandBuilder()
    .setName('dm')
    .setDescription('Отправить личное сообщение участнику сервера через бота')
    .addUserOption(opt => opt.setName('target').setDescription('Кому отправить ЛС').setRequired(true))
    .addStringOption(opt => opt.setName('text').setDescription('Текст сообщения').setRequired(true));
async function execute(interaction, bot) {
    const target = interaction.options.getUser('target', true);
    const text = interaction.options.getString('text', true);
    try {
        await target.send(`💬 Новое личное сообщение от ${interaction.user.tag}:\n${text}`);
        await interaction.reply({ content: '✅ Сообщение отправлено в личку!', ephemeral: true });
    }
    catch (err) {
        await interaction.reply({
            content: '❌ Не удалось отправить личное сообщение (возможно, пользователь закрыл ЛС).',
            ephemeral: true
        });
    }
}
//# sourceMappingURL=dm.js.map