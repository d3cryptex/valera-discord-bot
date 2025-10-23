import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { DiscordBot } from '../index';
import { logger } from '../utils/logger';

export const data = new SlashCommandBuilder()
    .setName('test')
    .setDescription('Test avatar URL');

export async function execute(interaction: ChatInputCommandInteraction, bot: DiscordBot) {
    try {
        const url = interaction.client.user.displayAvatarURL({ 
            extension: 'png', 
            size: 128, 
            forceStatic: true 
        });
        
        await interaction.reply(`Avatar URL: ${url}`);
    } catch (error) {
        logger.error('Error in /test command:', error);
        await interaction.reply({
            content: '❌ Произошла ошибка при выполнении команды.',
            ephemeral: true
        });
    }
}