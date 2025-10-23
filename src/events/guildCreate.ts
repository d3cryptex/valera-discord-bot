import { Guild, EmbedBuilder } from 'discord.js';
import { DiscordBot } from '../index';
import { logger } from '../utils/logger';

export default async function guildCreate(bot: DiscordBot, guild: Guild): Promise<void> {
    logger.info(`Bot added to guild: ${guild.name} (${guild.id})`);
    
    try {
        // Embed сообщение
        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle(`👋 Добро пожаловать, ${guild.name}!`)
            .setDescription([
                '**Спасибо за добавление бота!**',
                '',
                '🎯 **Основные функции:**',
                '• 📊 Система уровней и опыта',
                '• 🤖 AI-чат на основе Markov Chain',
                '• 🔮 Гадания и предсказания',
                '• 🏪 Внутриигровой магазин',
                '• 🧠 Случайные факты',
                '',
                'Используйте `/help` для получения списка всех команд!'
            ].join('\n'))
            .setFooter({ text: 'С любовью, твой бот ❤️' });

        // Отправка в системный канал (если есть права)
        const systemChannel = guild.systemChannel;
        if (systemChannel && systemChannel.permissionsFor(guild.members.me!)?.has('SendMessages')) {
            await systemChannel.send({ embeds: [embed] });
        }
    } catch (error) {
        logger.error(`Error handling guild create for ${guild.id}:`, error);
    }
}