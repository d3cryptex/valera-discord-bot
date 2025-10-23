"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseUtils = void 0;
const sequelize_1 = require("sequelize");
class DatabaseUtils {
    database;
    constructor(database) {
        this.database = database;
    }
    // Топ пользователей по уровню (ранжирование считаем в коде)
    async getTopUsersByLevel(guildId, limit = 10) {
        try {
            const User = this.database.User;
            if (!User)
                return [];
            // Если у вас есть поле guild_id в таблице users — раскомментируйте фильтр ниже
            const rows = await User.findAll({
                // where: { guild_id: guildId, xp: { [Op.gt]: 0 } },
                where: { xp: { [sequelize_1.Op.gt]: 0 } },
                attributes: ['id', 'username', 'level', 'xp', 'coins'],
                order: [['level', 'DESC'], ['xp', 'DESC']],
                limit,
                raw: true,
            });
            // Добавляем rank на стороне приложения, чтобы не требовать оконные функции БД
            return rows.map((u, i) => ({ ...u, rank: i + 1 }));
        }
        catch {
            return [];
        }
    }
    // Ранг пользователя: сколько пользователей "выше" по (level, xp)
    async getUserRank(userId) {
        try {
            const User = this.database.User;
            if (!User)
                return null;
            const me = await User.findOne({
                where: { id: userId },
                attributes: ['level', 'xp'],
                raw: true,
            });
            if (!me)
                return null;
            // Считаем, сколько пользователей выше по (level, xp)
            const higher = await User.count({
                where: {
                    [sequelize_1.Op.or]: [
                        { level: { [sequelize_1.Op.gt]: me.level } },
                        { [sequelize_1.Op.and]: [{ level: me.level }, { xp: { [sequelize_1.Op.gt]: me.xp } }] },
                    ],
                },
            });
            const total = await User.count({
                where: { xp: { [sequelize_1.Op.gt]: 0 } },
            });
            return { rank: higher + 1, total };
        }
        catch {
            return null;
        }
    }
    // Очистка старых записей Markov с frequency=1
    async cleanupOldData(daysOld = 90) {
        try {
            const Markov = this.database.MarkovBigram;
            if (!Markov)
                return;
            const cutoff = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
            await Markov.destroy({
                where: {
                    frequency: 1,
                    // Если у модели иная метка времени — замените поле на актуальное
                    created_at: { [sequelize_1.Op.lt]: cutoff },
                },
            });
        }
        catch {
            // проглатываем — это утилита очистки
        }
    }
    // Активность по дням (MySQL/compatible) — группировка по DATE(created_at)
    async getActivityStats(guildId, days = 7) {
        const Markov = this.database.MarkovBigram;
        if (!Markov)
            return [];
        const sequelize = Markov.sequelize;
        const rows = await sequelize.query(`
      SELECT 
        DATE(created_at) AS date,
        COUNT(*) AS messages
      FROM markov_bigrams
      WHERE guild_id = ? 
        AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY DATE(created_at)
      ORDER BY date ASC
      `, {
            replacements: [guildId, days],
            type: sequelize_1.QueryTypes.SELECT,
            logging: false,
        });
        return rows;
    }
}
exports.DatabaseUtils = DatabaseUtils;
//# sourceMappingURL=database.js.map