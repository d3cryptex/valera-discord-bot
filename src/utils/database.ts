import { Op, QueryTypes } from 'sequelize';
import { DatabaseService } from '../services/database/DatabaseService';

export class DatabaseUtils {
  private database: DatabaseService;

  constructor(database: DatabaseService) {
    this.database = database;
  }

  // Топ пользователей по уровню (ранжирование считаем в коде)
  async getTopUsersByLevel(guildId: string, limit: number = 10): Promise<any[]> {
    try {
      const User = this.database.User;
      if (!User) return [];

      // Если у вас есть поле guild_id в таблице users — раскомментируйте фильтр ниже
      const rows = await User.findAll({
        // where: { guild_id: guildId, xp: { [Op.gt]: 0 } },
        where: { xp: { [Op.gt]: 0 } },
        attributes: ['id', 'username', 'level', 'xp', 'coins'],
        order: [['level', 'DESC'], ['xp', 'DESC']],
        limit,
        raw: true,
      });

      // Добавляем rank на стороне приложения, чтобы не требовать оконные функции БД
      return rows.map((u, i) => ({ ...u, rank: i + 1 }));
    } catch {
      return [];
    }
  }

  // Ранг пользователя: сколько пользователей "выше" по (level, xp)
  async getUserRank(userId: string): Promise<{ rank: number; total: number } | null> {
    try {
      const User = this.database.User;
      if (!User) return null;

      const me = await User.findOne({
        where: { id: userId },
        attributes: ['level', 'xp'],
        raw: true,
      });
      if (!me) return null;

      // Считаем, сколько пользователей выше по (level, xp)
      const higher = await User.count({
        where: {
          [Op.or]: [
            { level: { [Op.gt]: me.level } },
            { [Op.and]: [{ level: me.level }, { xp: { [Op.gt]: me.xp } }] },
          ],
        },
      });

      const total = await User.count({
        where: { xp: { [Op.gt]: 0 } },
      });

      return { rank: higher + 1, total };
    } catch {
      return null;
    }
  }

  // Очистка старых записей Markov с frequency=1
  async cleanupOldData(daysOld: number = 90): Promise<void> {
    try {
      const Markov = this.database.MarkovBigram;
      if (!Markov) return;

      const cutoff = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

      await Markov.destroy({
        where: {
          frequency: 1,
          // Если у модели иная метка времени — замените поле на актуальное
          created_at: { [Op.lt]: cutoff },
        } as any,
      });
    } catch {
      // проглатываем — это утилита очистки
    }
  }

  // Активность по дням (MySQL/compatible) — группировка по DATE(created_at)
  async getActivityStats(guildId: string, days: number = 7): Promise<Array<{ date: string; messages: number }>> {
    const Markov = this.database.MarkovBigram;
    if (!Markov) return [];

    const sequelize = Markov.sequelize!;
    const rows = await sequelize.query(
      `
      SELECT 
        DATE(created_at) AS date,
        COUNT(*) AS messages
      FROM markov_bigrams
      WHERE guild_id = ? 
        AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY DATE(created_at)
      ORDER BY date ASC
      `,
      {
        replacements: [guildId, days],
        type: QueryTypes.SELECT,
        logging: false,
      }
    );

    return rows as Array<{ date: string; messages: number }>;
  }
}