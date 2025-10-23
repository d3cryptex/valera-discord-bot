import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { DiscordBot } from '../index';
import { Op } from 'sequelize';
import { SettingsService } from '../services/settings/SettingsService';
import { isUserAdmin } from '../utils/helpers';

export const data = new SlashCommandBuilder()
    .setName('level')
    .setDescription('Информация об уровне')
    .addSubcommand(subcommand =>
        subcommand
            .setName('me')
            .setDescription('Ваш уровень')
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('user')
            .setDescription('Уровень пользователя')
            .addUserOption(option =>
                option
                    .setName('target')
                    .setDescription('Пользователь для проверки')
                    .setRequired(true)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('leaderboard')
            .setDescription('Таблица лидеров')
            .addStringOption(option =>
                option
                  .setName('type')
                  .setDescription('Тип топа')
                  .setRequired(true)
                  .addChoices(
                    { name: 'XP за неделю', value: 'week' },
                    { name: 'XP за месяц', value: 'month' },
                    { name: 'XP за всё время', value: 'all' },
                    { name: 'Монеты (за всё время)', value: 'coins' },
                    { name: 'Голосовой чат (общее время)', value: 'voice' }
                  )
            )
    )
    .addSubcommand(subcommand =>
        subcommand
          .setName('addxp')
          .setDescription('Добавить HP пользователю')
          .addUserOption(opt => opt.setName('user').setDescription('Пользователь').setRequired(true))
          .addIntegerOption(opt => opt.setName('value').setDescription('Сколько добавить').setRequired(true))
    )
    .addSubcommand(subcommand =>
        subcommand
          .setName('setxp')
          .setDescription('Установить HP пользователю')
          .addUserOption(opt => opt.setName('user').setDescription('Пользователь').setRequired(true))
          .addIntegerOption(opt => opt.setName('value').setDescription('Новое значение').setRequired(true))
    )
    .addSubcommand(subcommand =>
        subcommand
          .setName('removexp')
          .setDescription('Вычесть HP у пользователя')
          .addUserOption(opt => opt.setName('user').setDescription('Пользователь').setRequired(true))
          .addIntegerOption(opt => opt.setName('value').setDescription('Сколько вычесть').setRequired(true))
    )
    .addSubcommand(subcommand =>
        subcommand
          .setName('addcoins')
          .setDescription('Добавить монеты пользователю')
          .addUserOption(opt => opt.setName('user').setDescription('Пользователь').setRequired(true))
          .addIntegerOption(opt => opt.setName('value').setDescription('Сколько добавить').setRequired(true))
    )
    .addSubcommand(subcommand =>
        subcommand
          .setName('setcoins')
          .setDescription('Установить монеты пользователю')
          .addUserOption(opt => opt.setName('user').setDescription('Пользователь').setRequired(true))
          .addIntegerOption(opt => opt.setName('value').setDescription('Новое значение').setRequired(true))
    )
    .addSubcommand(subcommand =>
        subcommand
          .setName('removecoins')
          .setDescription('Вычесть монеты у пользователя')
          .addUserOption(opt => opt.setName('user').setDescription('Пользователь').setRequired(true))
          .addIntegerOption(opt => opt.setName('value').setDescription('Сколько вычесть').setRequired(true))
    );

export async function execute(interaction: ChatInputCommandInteraction, bot: DiscordBot) {
    const subcommand = interaction.options.getSubcommand();
    const settingsService = new SettingsService(bot.database, bot.redis);
    const settings = await settingsService.getGuildSettings(interaction.guild!.id);

    if (['addxp', 'setxp', 'removexp', 'addcoins', 'setcoins', 'removecoins'].includes(subcommand)) {
      const admin = settings.admin ?? { roles: [], users: [] };
      if (!isUserAdmin(interaction, admin)) {
        const embed = new EmbedBuilder()
          .setColor('#eb4034')
          .setTitle('Ошибка')
          .setDescription('⛔ У вас нет прав использовать эту команду!')
          .setFooter({ text: 'Обратитесь к администратору для получения доступа.' });
        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
      }
    }

    if (!settings.levels.enabled) {
      const embed = new EmbedBuilder()
          .setColor('#eb4034')
          .setTitle('Ошибка')
          .setDescription('❌ Уровни выключены на этом сервере.')
          .setFooter({ text: 'Администратор сервера отключил механику уровней.' });
      await interaction.reply({ embeds: [embed], ephemeral: true});
      return;
    }

    switch (subcommand) {
        case 'me':
            await showUserLevel(interaction, bot, interaction.user.id);
            break;
        case 'user':
            const target = interaction.options.getUser('target', true);
            await showUserLevel(interaction, bot, target.id);
            break;
        case 'leaderboard': 
            const type = interaction.options.getString('type', true);
            if (type === 'week')      await showXPLeaderboard(interaction, bot, 'week');
            else if (type === 'month')await showXPLeaderboard(interaction, bot, 'month');
            else if (type === 'all')  await showXPLeaderboard(interaction, bot, 'all');
            else if (type === 'coins')await showCoinLeaderboard(interaction, bot);
            else if (type === 'voice')await showVoiceLeaderboard(interaction, bot);
            break;
        case 'addhp':
            await changeUserXp(interaction, bot, 'add');
            break;
        case 'sethp':
            await changeUserXp(interaction, bot, 'set');
            break;
        case 'removehp':
            await changeUserXp(interaction, bot, 'remove');
            break;
        case 'addcoins':
            await changeUserCoins(interaction, bot, 'add');
            break;
        case 'setcoins':
            await changeUserCoins(interaction, bot, 'set');
            break;
        case 'removecoins':
            await changeUserCoins(interaction, bot, 'remove');
            break;
    }
}

async function changeUserXp(interaction: ChatInputCommandInteraction, bot: DiscordBot, mode: 'add' | 'set' | 'remove') {
    const db = bot.database;
    if (!db.User) {
      const embed = new EmbedBuilder()
        .setColor('#eb4034')
        .setTitle('Ошибка')
        .setDescription('❌ База данных недоступна')

      await interaction.reply({ embeds: [embed], ephemeral: true});
      return;
    }
    const user = interaction.options.getUser('user', true);
    const value = interaction.options.getInteger('value', true);
  
    const dbUser = await db.User.findByPk(user.id);
    if (!dbUser) {
        const embed = new EmbedBuilder()
        .setColor('#eb4034')
        .setTitle('Ошибка')
        .setDescription('❌ Пользователь не найден в базе')

        await interaction.reply({ embeds: [embed], ephemeral: true});
        return;
    }

    let description = '';
    let newXp = dbUser.xp ?? 0;
    let color = 0x00b894; // default green
  
    if (mode === 'add') {
      await db.updateUserXP(user.id, value); // Прибавить value
      const updated = await db.getUser(user.id);
      newXp = updated?.xp ?? (newXp + value);
      description = `✨ Пользователю <@${user.id}> **добавлено** **${value}** XP!\n\nНовый баланс: **${newXp}**`;
      color = 0x00b894;
    } else if (mode === 'remove') {
      await db.updateUserXP(user.id, -value); // Вычесть value
      const updated = await db.getUser(user.id);
      newXp = updated?.xp ?? Math.max(newXp - value, 0);
      description = `✨ У пользователя <@${user.id}> **вычтено** **${value}** XP!\n\nНовый баланс: **${newXp}**`;
      color = 0x00b894;
    } else if (mode === 'set') {
      await db.setUserXP(user.id, value);
      newXp = value;
      description = `✨ XP пользователя <@${user.id}> **установлен** **${newXp}** монет!`;
      color = 0x00b894;
    }

    const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle('💾 XP пользователя изменены')
    .setThumbnail(user.displayAvatarURL())
    .setDescription(description)

    await interaction.reply({ embeds: [embed], allowedMentions: { users: [] } });
}
  
async function changeUserCoins(interaction: ChatInputCommandInteraction,bot: DiscordBot,mode: 'add' | 'set' | 'remove') {
    const db = bot.database;
    
    if (!db.User) {
      const embed = new EmbedBuilder()
      .setColor('#eb4034')
      .setTitle('Ошибка')
      .setDescription('❌ База данных недоступна')

      await interaction.reply({ embeds: [embed], ephemeral: true});
      return;
    }

    const user = interaction.options.getUser('user', true);
    const value = interaction.options.getInteger('value', true);
  
    const dbUser = await db.User.findByPk(user.id);
    if (!dbUser) {
      const embed = new EmbedBuilder()
      .setColor('#eb4034')
      .setTitle('Ошибка')
      .setDescription('❌ Пользователь не найден в базе')

      await interaction.reply({ embeds: [embed], ephemeral: true});
      return;
    }

    let description = '';
    let newCoins = dbUser.coins ?? 0;
    let color = 0x00b894; // default green
  
    if (mode === 'add') {
      await db.updateUserCoins(user.id, value);
      const newUser = await db.getUser(user.id);
      newCoins = newUser?.coins ?? newCoins;
      description = `💰 Пользователю <@${user.id}> **добавлено** **${value}** монет!\n\nНовый баланс: **${newCoins}**`;
      color = 0x00b894;
    } else if (mode === 'remove') {
      await db.updateUserCoins(user.id, -value);
      const newUser = await db.getUser(user.id);
      newCoins = newUser?.coins ?? newCoins;
      description = `🪙 У пользователя <@${user.id}> **вычтено** **${value}** монет.\n\nНовый баланс: **${newCoins}**`;
      color = 0xfdcb6e;
    } else if (mode === 'set') {
      await db.setUserCoins(user.id, value);
      newCoins = value;
      description = `💳 Баланс пользователя <@${user.id}> **установлен** на **${newCoins}** монет.`;
      color = 0x0984e3;
    }
  
    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle('💾 Монеты пользователя изменены')
      .setThumbnail(user.displayAvatarURL())
      .setDescription(description)

    await interaction.reply({ embeds: [embed], allowedMentions: { users: [] } });
}

async function showUserLevel(interaction: ChatInputCommandInteraction, bot: DiscordBot, userId: string) {
    await interaction.deferReply();
    
    try {
        // Получаем пользователя
        let user = await bot.database.getUser(userId);

        // Если пользователя нет в базе — создаём
        if (!user) {
            const discordUser = await bot.client.users.fetch(userId);
            await bot.database.createUser(userId, discordUser.username);
            user = await bot.database.getUser(userId);
        }

        const guildId = interaction.guild!.id;
        const settingsService = new SettingsService(bot.database, bot.redis);
        const settings = await settingsService.getGuildSettings(guildId);

        const discordUser = await bot.client.users.fetch(userId);
        const currentXP = user.xp;
        const currentLevel = user.level;
        const coinsAmount = user.coins;
        const streak = user.streak ?? 0;
        const battlepass = user.battle_pass_level ?? 1;
        
        // Вычисляем прогресс до следующего уровня
        const xpForCurrentLevel = Math.pow(currentLevel - 1, 2) * 100;
        const xpForNextLevel = Math.pow(currentLevel, 2) * 100;
        const progressXP = currentXP - xpForCurrentLevel;
        const neededXP = xpForNextLevel - xpForCurrentLevel;
        const progressPercent = Math.floor((progressXP / neededXP) * 100);
        
        // Создаем прогресс-бар
        const progressBar = createProgressBar(progressPercent);
        
        const embed = new EmbedBuilder()
            .setColor('#00BFFF')
            .setTitle(`📊 Статистика ${discordUser.username}`)
            .setThumbnail(discordUser.displayAvatarURL())
            .addFields([
                { name: '🏆 Уровень', value: `${currentLevel}`, inline: true },
                { name: '⭐ Опыт', value: `${currentXP} XP`, inline: true },
                { name: `${settings.economy.currency_emoji} ${settings.economy.currency_name}`, value: `${coinsAmount}`, inline: true },
                { name: '🔥 Серия ежедневных', value: `${streak} дней подряд`, inline: true },
                { name: '🔰 Уровень BattlePass', value: `${battlepass}`, inline: true },
                { name: '📈 Прогресс', value: `${progressBar} ${progressPercent}%\n${progressXP}/${neededXP} XP до ${currentLevel + 1} уровня` }
            ])
            .setFooter({ text: `ID пользователя: ${userId}` });
        
        await interaction.editReply({ embeds: [embed] });
        
    } catch (error) {
        console.error('Error showing user level:', error);
        await interaction.editReply({ content: 'Произошла ошибка при получении данных.' });
    }
}

async function showXPLeaderboard(interaction: ChatInputCommandInteraction, bot: DiscordBot, period: 'week' | 'month' | 'all') {
    await interaction.deferReply();
    if (!bot.database.User) {
        const embed = new EmbedBuilder()
        .setColor('#eb4034')
        .setTitle('Ошибка')
        .setDescription('❌ База данных недоступна')
  
        await interaction.reply({ embeds: [embed], ephemeral: true});
        return;
    }
  
    let topUsers;
    let periodName;
    if (period === 'week') {
      const now = new Date();
      const from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
      periodName = 'за неделю';
      topUsers = await bot.database.User.findAll({
        where: { updatedAt: { [Op.gte]: from } },
        order: [['level', 'DESC'], ['xp', 'DESC']],
        limit: 10,
        raw: true,
      });
    } else if (period === 'month') {
      const now = new Date();
      const from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
      periodName = 'за месяц';
      topUsers = await bot.database.User.findAll({
        where: { updatedAt: { [Op.gte]: from } },
        order: [['level', 'DESC'], ['xp', 'DESC']],
        limit: 10,
        raw: true,
      });
    } else { // 'all'
      periodName = 'за всё время';
      topUsers = await bot.database.User.findAll({
        order: [['level', 'DESC'], ['xp', 'DESC']],
        limit: 10,
        raw: true,
      });
    }
  
    let description = '';
    const medals = ['🥇', '🥈', '🥉'];
    for (let i = 0; i < topUsers.length; i++) {
      const user = topUsers[i];
      const medal = medals[i] || `${i + 1}.`;
      try {
        const discordUser = await bot.client.users.fetch(user!.id);
        description += `${medal} **${discordUser.username}** — Уровень ${user!.level} (${user!.xp} XP)\n`;
      } catch {
        description += `${medal} **Неизвестный пользователь** — Уровень ${user!.level} (${user!.xp} XP)\n`;
      }
    }
  
    const embed = new EmbedBuilder()
      .setColor('#f1c40f')
      .setTitle(`🏆 ТОП по уровню ${periodName}`)
      .setDescription(description || '*Таблица пуста*')
      .setFooter({ text: `Всего: ${topUsers.length}` });
  
    await interaction.editReply({ embeds: [embed] });
}

async function showCoinLeaderboard(interaction: ChatInputCommandInteraction, bot: DiscordBot) {
    await interaction.deferReply();
    if (!bot.database.User) {
        const embed = new EmbedBuilder()
        .setColor('#eb4034')
        .setTitle('Ошибка')
        .setDescription('❌ База данных недоступна')
  
        await interaction.reply({ embeds: [embed], ephemeral: true});
        return;
    }
  
    const topUsers = await bot.database.User.findAll({
      order: [['coins', 'DESC']],
      limit: 10,
      raw: true,
    });

    const guildId = interaction.guild!.id;
    const settingsService = new SettingsService(bot.database, bot.redis);
    const settings = await settingsService.getGuildSettings(guildId);
  
    let description = '';
    const medals = ['🥇', '🥈', '🥉'];
    for (let i = 0; i < topUsers.length; i++) {
      const user = topUsers[i];
      const medal = medals[i] || `${i+1}.`;
      try {
        const discordUser = await bot.client.users.fetch(user!.id);
        description += `${medal} **${discordUser.username}** — ${user!.coins} ${settings.economy.currency_name}\n`;
      } catch {
        description += `${medal} **Неизвестный пользователь** — ${user!.coins} ${settings.economy.currency_name}\n`;
      }
    }
  
    const embed = new EmbedBuilder()
      .setColor('#e67e22')
      .setTitle(`💰 ТОП по ${settings.economy.currency_name} (всего)`)
      .setDescription(description || '*Нет данных*')
      .setFooter({ text: `Всего: ${topUsers.length}` });
  
    await interaction.editReply({ embeds: [embed] });
}

async function showVoiceLeaderboard(interaction: ChatInputCommandInteraction, bot: DiscordBot) {
  await interaction.deferReply();
  if (!bot.database.User) {
    const embed = new EmbedBuilder()
      .setColor('#eb4034')
      .setTitle('Ошибка')
      .setDescription('❌ База данных недоступна');
    await interaction.reply({ embeds: [embed], ephemeral: true});
    return;
  }

  const topUsers = await bot.database.User.findAll({
    order: [['voice_time', 'DESC']],
    limit: 10,
    raw: true,
  });

  let description = '';
  const medals = ['🥇', '🥈', '🥉'];
  for (let i = 0; i < topUsers.length; i++) {
    const user = topUsers[i];
    const medal = medals[i] || `${i+1}.`;
    try {
      const discordUser = await bot.client.users.fetch(user!.id);
      description += `${medal} **${discordUser.username}** — ${(user!.voice_time / 60).toFixed(1)} мин.\n`;
    } catch {
      description += `${medal} **Неизвестный пользователь** — ${(user!.voice_time / 60).toFixed(1)} мин.\n`;
    }
  }

  const embed = new EmbedBuilder()
    .setColor('#0984e3')
    .setTitle('🎤 ТОП по активности в голосовом чате')
    .setDescription(description || '*Нет данных*')
    .setFooter({ text: `Всего: ${topUsers.length}` });

  await interaction.editReply({ embeds: [embed] });
}

function createProgressBar(percent: number, length: number = 20): string {
    const filled = Math.floor((percent / 100) * length);
    const empty = length - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
}
