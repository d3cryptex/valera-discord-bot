import { REST, Routes } from 'discord.js';
import { readdirSync, Dirent } from 'fs';
import { join } from 'path';
import { DiscordBot } from '../index';
import { logger } from '../utils/logger';

export class CommandHandler {
    private bot: DiscordBot;

    constructor(bot: DiscordBot) {
        this.bot = bot;
    }

    async loadCommands(): Promise<void> {
        const commandsPath = join(__dirname, '../commands');
        const commandsEntries: Dirent[] = readdirSync(commandsPath, { withFileTypes: true });

        for (const entry of commandsEntries) {
            if (entry.isDirectory()) {
                const folderPath = join(commandsPath, entry.name);
                const commandFiles = readdirSync(folderPath).filter(file =>
                    file.endsWith('.ts') || file.endsWith('.js')
                );
                for (const file of commandFiles) {
                    const filePath = join(folderPath, file);
                    await this.loadCommand(filePath);
                }
            } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.js'))) {
                const filePath = join(commandsPath, entry.name);
                await this.loadCommand(filePath);
            }
        }

        logger.info(`✅ Loaded ${this.bot.commands.size} commands`);
        logger.info('💡 Use "registerCommands()" to sync commands in Discord');
    }

    private async loadCommand(filePath: string) {
        try {
            const imported = await import(filePath);
            const command = imported.default || imported;
            if ('data' in command && 'execute' in command) {
                this.bot.commands.set(command.data.name, command);
                logger.info(`Loaded command: ${command.data.name}`);
            } else {
                logger.warn(`Invalid command structure in ${filePath}`);
            }
        } catch (error) {
            logger.error(`Error loading command ${filePath}:`, error);
        }
    }

    // ---- Регистрация всех команд в Discord ----
    async registerCommands() {
        if (process.env.SKIP_COMMAND_REGISTRATION === 'true') {
            logger.info('⏭️ SKIP_COMMAND_REGISTRATION включен, регистрация пропущена!');
            return;
        }

        // Собираем список всех актуальных команд
        const commandData = [];
        for (const [, command] of this.bot.commands) {
            if ('data' in command) {
                commandData.push(command.data.toJSON());
            }
        }

        const rest = new REST().setToken(process.env.DISCORD_TOKEN!);

        try {
            if (process.env.DISCORD_GUILD_ID) {
                await rest.put(
                    Routes.applicationGuildCommands(
                        process.env.DISCORD_CLIENT_ID!,
                        process.env.DISCORD_GUILD_ID
                    ),
                    { body: commandData }
                );
                logger.info(`✅ Guild commands synced! (${commandData.length} актуальных)`);
            } else {
                await rest.put(
                    Routes.applicationCommands(process.env.DISCORD_CLIENT_ID!),
                    { body: commandData }
                );
                logger.info(`✅ Global commands synced! (${commandData.length} актуальных)`);
            }
        } catch (error) {
            logger.error('❌ Discord command registration failed:', error);
        }
    }
}
