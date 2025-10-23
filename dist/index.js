"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiscordBot = void 0;
const discord_js_1 = require("discord.js");
const dotenv_1 = require("dotenv");
const logger_1 = require("./utils/logger");
const DatabaseService_1 = require("./services/database/DatabaseService");
const RedisService_1 = require("./services/cache/RedisService");
const MarkovService_1 = require("./services/markov/MarkovService");
const SettingsService_1 = require("./services/settings/SettingsService");
const LevelService_1 = require("./services/levels/LevelService");
const AutoModService_1 = require("./services/moderation/AutoModService");
const CommandHandler_1 = require("./handlers/CommandHandler");
const EventHandler_1 = require("./handlers/EventHandler");
(0, dotenv_1.config)();
class DiscordBot {
    client;
    commands;
    database;
    redis;
    settingsService;
    autoMod;
    levelService;
    markov;
    constructor() {
        this.client = new discord_js_1.Client({
            intents: [
                discord_js_1.GatewayIntentBits.Guilds,
                discord_js_1.GatewayIntentBits.GuildMessages,
                discord_js_1.GatewayIntentBits.GuildMembers,
                discord_js_1.GatewayIntentBits.GuildVoiceStates,
                discord_js_1.GatewayIntentBits.MessageContent
            ],
            partials: [discord_js_1.Partials.Channel]
        });
        this.commands = new discord_js_1.Collection();
        this.database = new DatabaseService_1.DatabaseService();
        this.redis = new RedisService_1.RedisService();
        this.settingsService = new SettingsService_1.SettingsService(this.database, this.redis);
        this.levelService = new LevelService_1.LevelService(this.settingsService, this.database, this.redis);
        this.markov = new MarkovService_1.MarkovService(this.database, this.settingsService);
        this.autoMod = new AutoModService_1.AutoModService(this, this.settingsService);
    }
    async start() {
        try {
            // Инициализация сервисов
            await this.database.connect();
            await this.redis.connect();
            // Загрузка обработчиков
            const commandHandler = new CommandHandler_1.CommandHandler(this);
            const eventHandler = new EventHandler_1.EventHandler(this);
            await commandHandler.loadCommands();
            await commandHandler.registerCommands();
            await eventHandler.loadEvents();
            // Запуск бота
            await this.client.login(process.env.DISCORD_TOKEN);
            logger_1.logger.info('Bot started successfully!');
        }
        catch (error) {
            logger_1.logger.error('Failed to start bot:', error);
            process.exit(1);
        }
    }
    async shutdown() {
        logger_1.logger.info('Shutting down bot...');
        try {
            await this.database.disconnect();
            await this.redis.disconnect();
            this.client.destroy();
            logger_1.logger.info('Bot shutdown complete');
        }
        catch (error) {
            logger_1.logger.error('Error during shutdown:', error);
        }
        finally {
            process.exit(0);
        }
    }
}
exports.DiscordBot = DiscordBot;
// === Graceful Shutdown ===
let bot = null;
process.on('SIGINT', async () => {
    if (bot)
        await bot.shutdown();
});
process.on('SIGTERM', async () => {
    if (bot)
        await bot.shutdown();
});
// === Запуск бота ===
bot = new DiscordBot();
bot.start();
//# sourceMappingURL=index.js.map