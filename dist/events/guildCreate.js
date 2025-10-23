"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = guildCreate;
const discord_js_1 = require("discord.js");
const logger_1 = require("../utils/logger");
async function guildCreate(bot, guild) {
    logger_1.logger.info(`Bot added to guild: ${guild.name} (${guild.id})`);
    try {
        // Embed сообщение
        const embed = new discord_js_1.EmbedBuilder()
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
        if (systemChannel && systemChannel.permissionsFor(guild.members.me)?.has('SendMessages')) {
            await systemChannel.send({ embeds: [embed] });
        }
    }
    catch (error) {
        logger_1.logger.error(`Error handling guild create for ${guild.id}:`, error);
    }
}
//# sourceMappingURL=guildCreate.js.map