"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ready;
const logger_1 = require("../utils/logger");
async function ready(bot) {
    logger_1.logger.info(`Bot is ready! Logged in as ${bot.client.user?.tag}`);
    logger_1.logger.info(`Serving ${bot.client.guilds.cache.size} guilds`);
    bot.client.user?.setActivity('как ест яйца', { type: 1 });
    logger_1.logger.info('Bot initialization complete!');
}
//# sourceMappingURL=ready.js.map