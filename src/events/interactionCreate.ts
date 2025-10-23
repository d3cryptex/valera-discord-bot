import { Interaction } from 'discord.js';
import { DiscordBot } from '../index';
import { logger } from '../utils/logger';
import { DatabaseService } from '../services/database/DatabaseService';

export default async function interactionCreate(bot: DiscordBot, interaction: Interaction): Promise<void> {
    if (interaction.isChatInputCommand()) {
        const command = bot.commands.get(interaction.commandName);

        if (!command) {
            logger.warn(`No command matching ${interaction.commandName} was found.`);
            return;
        }

        try {
            await command.execute(interaction, bot);
        } catch (error) {
            logger.error(`Error executing command ${interaction.commandName}:`, error);
            const reply = {
                content: 'Произошла ошибка при выполнении команды!',
                ephemeral: true
            };

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(reply);
            } else {
                await interaction.reply(reply);
            }
        }
        return;
    }
}