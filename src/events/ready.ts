import { DiscordBot } from '../index';
import { logger } from '../utils/logger';

export default async function ready(bot: DiscordBot): Promise<void> {
    logger.info(`Bot is ready! Logged in as ${bot.client.user?.tag}`);
    logger.info(`Serving ${bot.client.guilds.cache.size} guilds`);
    
    bot.client.user?.setActivity('как ест яйца', { type: 1 }); 
    
    logger.info('Bot initialization complete!');
}
