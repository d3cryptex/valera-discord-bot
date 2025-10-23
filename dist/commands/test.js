"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.data = void 0;
exports.execute = execute;
const discord_js_1 = require("discord.js");
const logger_1 = require("../utils/logger");
exports.data = new discord_js_1.SlashCommandBuilder()
    .setName('test')
    .setDescription('Test avatar URL');
async function execute(interaction, bot) {
    try {
        const url = interaction.client.user.displayAvatarURL({
            extension: 'png',
            size: 128,
            forceStatic: true
        });
        await interaction.reply(`Avatar URL: ${url}`);
    }
    catch (error) {
        logger_1.logger.error('Error in /test command:', error);
        await interaction.reply({
            content: '❌ Произошла ошибка при выполнении команды.',
            ephemeral: true
        });
    }
}
//# sourceMappingURL=test.js.map