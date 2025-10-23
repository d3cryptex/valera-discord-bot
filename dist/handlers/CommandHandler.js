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
exports.CommandHandler = void 0;
const discord_js_1 = require("discord.js");
const fs_1 = require("fs");
const path_1 = require("path");
const logger_1 = require("../utils/logger");
class CommandHandler {
    bot;
    constructor(bot) {
        this.bot = bot;
    }
    async loadCommands() {
        const commandsPath = (0, path_1.join)(__dirname, '../commands');
        const commandsEntries = (0, fs_1.readdirSync)(commandsPath, { withFileTypes: true });
        for (const entry of commandsEntries) {
            if (entry.isDirectory()) {
                const folderPath = (0, path_1.join)(commandsPath, entry.name);
                const commandFiles = (0, fs_1.readdirSync)(folderPath).filter(file => file.endsWith('.ts') || file.endsWith('.js'));
                for (const file of commandFiles) {
                    const filePath = (0, path_1.join)(folderPath, file);
                    await this.loadCommand(filePath);
                }
            }
            else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.js'))) {
                const filePath = (0, path_1.join)(commandsPath, entry.name);
                await this.loadCommand(filePath);
            }
        }
        logger_1.logger.info(`✅ Loaded ${this.bot.commands.size} commands`);
        logger_1.logger.info('💡 Use "registerCommands()" to sync commands in Discord');
    }
    async loadCommand(filePath) {
        try {
            const imported = await Promise.resolve(`${filePath}`).then(s => __importStar(require(s)));
            const command = imported.default || imported;
            if ('data' in command && 'execute' in command) {
                this.bot.commands.set(command.data.name, command);
                logger_1.logger.info(`Loaded command: ${command.data.name}`);
            }
            else {
                logger_1.logger.warn(`Invalid command structure in ${filePath}`);
            }
        }
        catch (error) {
            logger_1.logger.error(`Error loading command ${filePath}:`, error);
        }
    }
    // ---- Регистрация всех команд в Discord ----
    async registerCommands() {
        if (process.env.SKIP_COMMAND_REGISTRATION === 'true') {
            logger_1.logger.info('⏭️ SKIP_COMMAND_REGISTRATION включен, регистрация пропущена!');
            return;
        }
        // Собираем список всех актуальных команд
        const commandData = [];
        for (const [, command] of this.bot.commands) {
            if ('data' in command) {
                commandData.push(command.data.toJSON());
            }
        }
        const rest = new discord_js_1.REST().setToken(process.env.DISCORD_TOKEN);
        try {
            if (process.env.DISCORD_GUILD_ID) {
                await rest.put(discord_js_1.Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, process.env.DISCORD_GUILD_ID), { body: commandData });
                logger_1.logger.info(`✅ Guild commands synced! (${commandData.length} актуальных)`);
            }
            else {
                await rest.put(discord_js_1.Routes.applicationCommands(process.env.DISCORD_CLIENT_ID), { body: commandData });
                logger_1.logger.info(`✅ Global commands synced! (${commandData.length} актуальных)`);
            }
        }
        catch (error) {
            logger_1.logger.error('❌ Discord command registration failed:', error);
        }
    }
}
exports.CommandHandler = CommandHandler;
//# sourceMappingURL=CommandHandler.js.map