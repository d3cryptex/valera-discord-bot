"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = interactionCreate;
const logger_1 = require("../utils/logger");
async function interactionCreate(bot, interaction) {
    if (interaction.isChatInputCommand()) {
        const command = bot.commands.get(interaction.commandName);
        if (!command) {
            logger_1.logger.warn(`No command matching ${interaction.commandName} was found.`);
            return;
        }
        try {
            await command.execute(interaction, bot);
        }
        catch (error) {
            logger_1.logger.error(`Error executing command ${interaction.commandName}:`, error);
            const reply = {
                content: 'Произошла ошибка при выполнении команды!',
                ephemeral: true
            };
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(reply);
            }
            else {
                await interaction.reply(reply);
            }
        }
        return;
    }
}
//# sourceMappingURL=interactionCreate.js.map