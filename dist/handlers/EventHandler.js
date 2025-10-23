"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventHandler = void 0;
const fs_1 = require("fs");
const path_1 = require("path");
const logger_1 = require("../utils/logger");
class EventHandler {
    bot;
    constructor(bot) {
        this.bot = bot;
    }
    async loadEvents() {
        const eventsPath = (0, path_1.join)(__dirname, '../events');
        const eventFiles = (0, fs_1.readdirSync)(eventsPath).filter(file => file.endsWith('.ts') || file.endsWith('.js'));
        for (const file of eventFiles) {
            const filePath = (0, path_1.join)(eventsPath, file);
            const match = file.match(/(^.+?)\.(js|ts)$/);
            if (!match) {
                logger_1.logger.warn(`Skipping invalid event filename: ${file}`);
                continue;
            }
            const eventName = match[1];
            try {
                const eventHandler = await Promise.resolve(`${filePath}`).then(s => __importStar(require(s)));
                if (eventName === 'ready') {
                    this.bot.client.once(eventName, (...args) => eventHandler.default(this.bot, ...args));
                }
                else if (eventName === 'modalSubmit') {
                    // Обрабатываем модальные окна через interactionCreate
                    this.bot.client.on('interactionCreate', async (interaction) => {
                        if (interaction.isModalSubmit()) {
                            try {
                                await eventHandler.default.execute(interaction, this.bot);
                            }
                            catch (error) {
                                logger_1.logger.error(`Error in modalSubmit handler:`, error);
                                if (!interaction.replied && !interaction.deferred) {
                                    await interaction.reply({
                                        content: '❌ Произошла ошибка при обработке формы.',
                                        ephemeral: true
                                    });
                                }
                            }
                        }
                    });
                }
                else {
                    this.bot.client.on(eventName, (...args) => {
                        try {
                            eventHandler.default(this.bot, ...args);
                        }
                        catch (error) {
                            logger_1.logger.error(`Error in event ${eventName}:`, error);
                        }
                    });
                }
                logger_1.logger.info(`Loaded event: ${eventName}`);
            }
            catch (error) {
                logger_1.logger.error(`Error loading event ${file}:`, error);
            }
        }
    }
}
exports.EventHandler = EventHandler;
//# sourceMappingURL=EventHandler.js.map