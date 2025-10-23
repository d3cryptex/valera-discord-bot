import { Client, GatewayIntentBits, ChannelType, Collection, Partials, ModalSubmitInteraction } from 'discord.js';
import { config } from 'dotenv';
import { logger } from './utils/logger';

import { DatabaseService } from './services/database/DatabaseService';
import { RedisService } from './services/cache/RedisService';
import { MarkovService } from './services/markov/MarkovService';
import { SettingsService } from './services/settings/SettingsService';
import { LevelService } from './services/levels/LevelService';
import { AutoModService } from './services/moderation/AutoModService';

import { CommandHandler } from './handlers/CommandHandler';
import { EventHandler } from './handlers/EventHandler';

config();

export class DiscordBot {
    public client: Client;
    public commands: Collection<string, any>;
    public database: DatabaseService;
    public redis: RedisService;
    public settingsService: SettingsService;
    public autoMod: AutoModService;
    public levelService: LevelService;
    public markov: MarkovService;

    constructor() {
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.GuildMembers,
                GatewayIntentBits.GuildVoiceStates,
                GatewayIntentBits.MessageContent
            ],
            partials: [Partials.Channel]
        });

        this.commands = new Collection();

        this.database = new DatabaseService();
        this.redis = new RedisService();

        this.settingsService = new SettingsService(this.database, this.redis);

        this.levelService = new LevelService(this.settingsService, this.database, this.redis);
        this.markov = new MarkovService(this.database, this.settingsService);

        this.autoMod = new AutoModService(this, this.settingsService);
    }

    async start(): Promise<void> {
        try {
            // Инициализация сервисов
            await this.database.connect();
            await this.redis.connect();
            
            // Загрузка обработчиков
            const commandHandler = new CommandHandler(this);
            const eventHandler = new EventHandler(this);

            await commandHandler.loadCommands();
            await commandHandler.registerCommands();
            await eventHandler.loadEvents();

            // Запуск бота
            await this.client.login(process.env.DISCORD_TOKEN);
            logger.info('Bot started successfully!');
        } catch (error) {
            logger.error('Failed to start bot:', error);
            process.exit(1);
        }
    }

    async shutdown(): Promise<void> {
        logger.info('Shutting down bot...');

        try {
            await this.database.disconnect();
            await this.redis.disconnect();
            this.client.destroy();
            logger.info('Bot shutdown complete');
        } catch (error) {
            logger.error('Error during shutdown:', error);
        } finally {
            process.exit(0);
        }
    }
}

// === Graceful Shutdown ===
let bot: DiscordBot | null = null;

process.on('SIGINT', async () => {
    if (bot) await bot.shutdown();
});

process.on('SIGTERM', async () => {
    if (bot) await bot.shutdown();
});

// === Запуск бота ===
bot = new DiscordBot();
bot.start();