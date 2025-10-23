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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const fs_1 = require("fs");
const path_1 = require("path");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
async function deployCommands() {
    const commands = [];
    const commandsPath = (0, path_1.join)(__dirname, '../commands');
    // Загружаем команды
    const commandsEntries = (0, fs_1.readdirSync)(commandsPath, { withFileTypes: true });
    for (const entry of commandsEntries) {
        if (entry.isDirectory()) {
            const folderPath = (0, path_1.join)(commandsPath, entry.name);
            const commandFiles = (0, fs_1.readdirSync)(folderPath).filter(file => file.endsWith('.ts') || file.endsWith('.js'));
            for (const file of commandFiles) {
                const filePath = (0, path_1.join)(folderPath, file);
                const command = await Promise.resolve(`${filePath}`).then(s => __importStar(require(s)));
                if ('data' in command) {
                    commands.push(command.data.toJSON());
                }
            }
        }
        else if (entry.name.endsWith('.ts') || entry.name.endsWith('.js')) {
            const filePath = (0, path_1.join)(commandsPath, entry.name);
            const command = await Promise.resolve(`${filePath}`).then(s => __importStar(require(s)));
            if ('data' in command) {
                commands.push(command.data.toJSON());
            }
        }
    }
    const rest = new discord_js_1.REST().setToken(process.env.DISCORD_TOKEN);
    console.log(`🔄 Registering ${commands.length} commands...`);
    try {
        if (process.env.DISCORD_GUILD_ID) {
            // Для тестового сервера (быстрая регистрация)
            await rest.put(discord_js_1.Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, process.env.DISCORD_GUILD_ID), { body: commands });
            console.log(`✅ Successfully registered ${commands.length} guild commands!`);
        }
        else {
            // Для всех серверов (медленная регистрация, до 1 часа)
            await rest.put(discord_js_1.Routes.applicationCommands(process.env.DISCORD_CLIENT_ID), { body: commands });
            console.log(`✅ Successfully registered ${commands.length} global commands!`);
        }
    }
    catch (error) {
        console.error('❌ Error:', error);
    }
}
deployCommands();
//# sourceMappingURL=deployCommands.js.map