import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, User } from 'discord.js';
import { DiscordBot } from '../index';
import { GuildSettings, SettingsService } from '../services/settings/SettingsService';
import { DateTime } from 'luxon';

function renderRewardText(rewardObj: any, settings: any): string {
  const coinName = settings.economy.currency_name;
  const coinSign = settings.economy.currency_emoji;
  if (!rewardObj || !rewardObj.type) return '';
  switch (rewardObj.type) {
    case 'role':
      return `<@&${rewardObj.reward}>`; // reward = id роли
    case 'coins':
      return `${coinSign} ${rewardObj.reward} ${coinName}`; // reward = число монет
    case 'custom':
      return `🎁 ${rewardObj.reward}`;
    default:
      return String(rewardObj.reward ?? '');
  }
}

function renderBPQuests(quests: any[], doneArr?: boolean[]) {
  if (!quests?.length) return 'Нет задач';
  return quests.map((q, i) => {
    const done = doneArr?.[i] ?? false;
    const emoji = done ? '✅' : '❌';
    return `${emoji} ${q.text} \`${q.reward}xp\``;
  }).join('\n');
}

function rotateTasks(tasks: any[], max: number, dayOffset: number): any[] {
  if (tasks.length === 0) return [];
  const offset = (dayOffset * max) % tasks.length;
  let rotated = [];
  for (let i = 0; i < max && tasks.length > 0; i++) {
      rotated.push(tasks[(offset + i) % tasks.length]);
  }
  return rotated;
}

export const data = new SlashCommandBuilder()
  .setName('battlepass')
  .setDescription('Ваш Battle Pass и прогресс')
  .addSubcommand(s =>
    s.setName('progress')
      .setDescription('Показать свой Battle Pass')
  )
  .addSubcommand(s =>
    s.setName('roadmap')
      .setDescription('Показать дорожную карту наград')
  );

export async function execute(interaction: ChatInputCommandInteraction, bot: DiscordBot) {
    const settings = await bot.settingsService.getGuildSettings(interaction.guildId!);

    if (!settings.battlepass?.enabled) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#eb4034')
            .setTitle('Ошибка')
            .setDescription('❌ Battle Pass отключён.')
            .setDescription('Механика Battle Pass отключена на этом сервере.')
        ]
      });
      return;
    }

    const subcommand = interaction.options.getSubcommand();
    const userId = interaction.user.id;
    const user = await bot.database.getUser(userId);
  
    // Получаем настройки Battle Pass
    const bp = settings.battlepass ?? {};
    const dailyQuests = bp.daily_quests ?? [];
    const weeklyQuests = bp.weekly_quests ?? [];
    const bpLevels = bp.levels ?? 50;
    const bpXP = typeof bp.xp_for_level === 'number' ? bp.xp_for_level : 100;
  
    // Для ротации задач
    const now = DateTime.now().setZone(settings.system?.timezone || 'Europe/Moscow');
    const seasonStart = DateTime.now().startOf('month');
    const dayOffset = Math.floor(now.diff(seasonStart, 'days').days);
    const weekOffset = Math.floor(now.diff(seasonStart, 'weeks').weeks);
  
    const todayDailies = rotateTasks(dailyQuests, 3, dayOffset);
    const todayWeeklies = rotateTasks(weeklyQuests, 2, weekOffset);
  
    let dailyStatus: boolean[];
    let weeklyStatus: boolean[];
    
    try {
      dailyStatus = JSON.parse(user.battlepass_daily_status ?? '[]');
    } catch {
      dailyStatus = [];
    }
    try {
      weeklyStatus = JSON.parse(user.battlepass_weekly_status ?? '[]');
    } catch {
      weeklyStatus = [];
    }
    
    const userBPQuestStatus = {
      daily: dailyStatus,
      weekly: weeklyStatus
    };

    if (subcommand === 'progress') {
      const curLevel = Math.max(1, Math.min(user.battle_pass_level || 1, bpLevels));
      const curExp = user.battle_pass_exp || 0;
      const xpNeeded = bpXP;
      const percent = Math.floor((curExp / xpNeeded) * 100);
  
      // Прогресс-бар
      const progressBar = createProgressBar(percent);
  
      // Вывести видимые задания:
      let dailyText = renderBPQuests(todayDailies, userBPQuestStatus.daily);
      let weeklyText = renderBPQuests(todayWeeklies, userBPQuestStatus.weekly);
  
      const embed = new EmbedBuilder()
        .setColor('#0099FF')
        .setTitle(`Battle Pass — уровень ${curLevel} / ${bpLevels}`)
        .setDescription(`**Опыт:** ${curExp} / ${xpNeeded}\n**Прогресс:** ${progressBar} ${percent}%`)
        .addFields([
          { name: '📆 Ежедневные квесты', value: dailyText, inline: false },
          { name: '🗓️ Еженедельные квесты', value: weeklyText, inline: false }
        ])
        .setFooter({ text: 'Выполняйте задания для повышения уровня!' });
  
      await interaction.reply({ embeds: [embed] });
  
    } else if (subcommand === 'roadmap') {
      // Визуализация roadmap (emoji-матрица, для canvas сделаю отдельно)
      const curLevel = Math.max(1, Math.min(user.battle_pass_level || 1, bpLevels));
      const LEVELS_PER_ROW = 6;
      const ROWS = Math.ceil(bpLevels / LEVELS_PER_ROW);
      // Генерируем snake-path как индексы
      let matrix: string[][] = Array.from({length: ROWS}, () => Array(LEVELS_PER_ROW).fill('▫️'));
      let flatIndex = 0;
      let forward = true;
      for (let row = 0; row < ROWS; row++) {
        for (let i = 0; i < LEVELS_PER_ROW; i++) {
          const lvl = flatIndex + 1;
          if (lvl > bpLevels) continue;
          let col = forward ? i : LEVELS_PER_ROW - 1 - i;
          let block = '⬜';
          if (lvl < curLevel) block = '🟦';
          if (lvl === curLevel) block = '🟢';
          if (lvl === bpLevels) block = '🏁';
          const rowArr = matrix[row];
          if (rowArr) rowArr[col] = block;
          flatIndex++;
        }
        forward = !forward;
      }
      const roadmapVisual = matrix.map(row => row.join(' ')).join('\n');
  
      // Награды (используй settings.battlepass.rewards для вариативности)
      let rewardsList = (bp.rewards || []);
      let rewardsDesc = '';
      for (let lvl = 1; lvl <= bpLevels; lvl++) {
        let rewardObj = rewardsList.find((r: any) => r.level === lvl) ?? {};
        let rewardPretty = renderRewardText(rewardObj, settings);
        rewardsDesc += `${lvl === curLevel ? '➡️' : ' '} **${lvl}** — ${rewardPretty}\n`;
      }    
  
      const emb = new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle('🎯 Battle Pass — Roadmap')
        .setDescription(`\`\`\`\n${roadmapVisual}\n\`\`\`\n${rewardsDesc}`)
        .setFooter({ text: '🟢 — ваш уровень; 🟦 — пройденные; ⬜ — будущие; 🏁 — финал' });

      await interaction.reply({ embeds: [emb] });
    }
}
  
function createProgressBar(percent: number, length: number = 18): string {
  const filled = Math.floor((percent / 100) * length);
  const empty = length - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

function processBattlePassLevelUp(user: any, settings: GuildSettings, bot: DiscordBot, interaction: ChatInputCommandInteraction<import("discord.js").CacheType>) {
  throw new Error('Function not implemented.');
}
