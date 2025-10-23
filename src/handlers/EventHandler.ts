import { readdirSync } from 'fs';
import { join } from 'path';
import { DiscordBot } from '../index';
import { logger } from '../utils/logger';

export class EventHandler {
    private bot: DiscordBot;

    constructor(bot: DiscordBot) {
        this.bot = bot;
    }

    async loadEvents(): Promise<void> {
        const eventsPath = join(__dirname, '../events');
        const eventFiles = readdirSync(eventsPath).filter(file => 
            file.endsWith('.ts') || file.endsWith('.js')
        );
    
        for (const file of eventFiles) {
            const filePath = join(eventsPath, file);
            
            const match = file.match(/(^.+?)\.(js|ts)$/);
            if (!match) {
                logger.warn(`Skipping invalid event filename: ${file}`);
                continue;
            }
            const eventName = match[1]; 
    
            try {
                const eventHandler = await import(filePath);
                
                if (eventName === 'ready') {
                    this.bot.client.once(eventName, (...args) => eventHandler.default(this.bot, ...args));
                } else if (eventName === 'modalSubmit') {
                    // Обрабатываем модальные окна через interactionCreate
                    this.bot.client.on('interactionCreate', async (interaction) => {
                        if (interaction.isModalSubmit()) {
                            try {
                                await eventHandler.default.execute(interaction, this.bot);
                            } catch (error) {
                                logger.error(`Error in modalSubmit handler:`, error);
                                if (!interaction.replied && !interaction.deferred) {
                                    await interaction.reply({
                                        content: '❌ Произошла ошибка при обработке формы.',
                                        ephemeral: true
                                    });
                                }
                            }
                        }
                    });
                } else {
                    this.bot.client.on(eventName as string, (...args) => {
                        try {
                            eventHandler.default(this.bot, ...args);
                        } catch (error) {
                            logger.error(`Error in event ${eventName}:`, error);
                        }
                    });
                }
                
                logger.info(`Loaded event: ${eventName}`);
            } catch (error) {
                logger.error(`Error loading event ${file}:`, error);
            }
        }
    }
}