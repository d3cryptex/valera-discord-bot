import { GuildMember, SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { DiscordBot } from '../index';
import { SettingsService } from '../services/settings/SettingsService';

type HelpCommand = {
    usage: string;
    description: string;
};

type HelpSection = {
    title: string;
    desc: string;
    commands: HelpCommand[];
};

type HelpStructureType = {
    [key: string]: HelpSection;
};

const HELP_STRUCTURE: HelpStructureType = {
    level: {
      title: '📊 Level — Уровни',
      desc: 'Система уровней и лидерборда',
      commands: [
        { usage: '```/level me```', description: 'Ваш уровень.' },
        { usage: '```/level user <user>```', description: 'Уровень пользователя.' },
        { usage: '```/level leaderboard <type>```', description: 'Таблица лидеров.' },
        { usage: '```/level addxp <user> <значение>```', description: 'Добавить XP пользователю. (админ)' },
        { usage: '```/level setxp <user> <значение>```', description: 'Установить XP.' },
        { usage: '```/level removexp <user> <значение>```', description: 'Вычесть XP.' },
        { usage: '```/level addcoins <user> <значение>```', description: 'Дать монеты.' },
        { usage: '```/level setcoins <user> <значение>```', description: 'Установить монеты.' },
        { usage: '```/level removecoins <user> <значение>```', description: 'Вычесть монеты.' },
      ]
    },
    economy: {
      title: '🪙 Economy — экономика бота',
      desc: 'Магазин и бонусы',
      commands: [
          { usage: '```/daily```', description: 'Получить ежедневный бонус.' },
          { usage: '```/weekly```', description: 'Получить еженедельный бонус.' },
          { usage: '```/streak```', description: 'Посмотреть свою серию ежедневных бонусов.' },
          { usage: '```/gift <user> [amount]```', description: 'Отправить пользователю подарок в качестве монет.' },
          { usage: '```/shop list```', description: 'Список товаров.' },
          { usage: '```/shop buy <id>```', description: 'Купить товар.' },
          { usage: '```/shop balance```', description: 'Ваш баланс.' },
      ]
    },
    battlepass: {
      title: '🎫 Battle Pass',
      desc: 'Система заданий, уровней и наград, прокачиваемой каждый сезон!',
      commands: [
        { usage: '```/battlepass progress```', description: 'Ваш уровень Battle Pass и список активных заданий.' },
        { usage: '```/battlepass roadmap```', description: 'Посмотреть дорожную карту всех наград Battle Pass.' }
      ]
    },
    games: {
      title: '🎮 Games — Игровые команды',
      desc: 'Мини-игры и ставки.',
      commands: [
        { usage: '```/games slots [bet]```', description: 'Сыграть в слоты.' },
        { usage: '```/games dice [bet]```', description: 'Бросить 2 кубика.' },
        { usage: '```/games coin [bet]```', description: 'Подбросить монетку.' },
        { usage: '```/games duel <user> [bet]```', description: 'Бросить вызов дуэли.' },
      ]
    },
    predict: {
      title: '🔮 Предугадание & Факты',
      desc: 'Развлекательные и предсказательные команды.',
      commands: [
        { usage: '```/predict yesno <вопрос>```', description: 'Ответ да или нет.' },
        { usage: '```/predict percentage <текст>```', description: 'Процент совместимости/шанс.' },
        { usage: '```/predict fortune```', description: 'Случайное предсказание.' },
        { usage: '```/fact [category]```', description: 'Интересный факт.' }
      ]
    },
    utilities: {
      title: '🛠️ Утилиты',
      desc: 'Основные комманды бота',
      commands: [
        { usage: '```/server-info```', description: 'Инфо о сервере.' },
        { usage: '```/stats```', description: 'Статистика бота.' },
        { usage: '```/dm <@user> <text>```', description: 'ЛС от имени бота.' },
        { usage: '```/help```', description: 'Основная справка.' },
      ]
    },
    admin: {
      title: '⚙️ Администрирование',
      desc: 'Команды только для администраторов.',
      commands: [
        { usage: '```/settings```', description: 'Меню настроек.' },
        { usage: '```/markov generate [слово]```', description: 'AI-ответ вручную.' },
        { usage: '```/markov stats```', description: 'Статистика AI.' },
        { usage: '```/markov clear```', description: 'Очистить обучение.' },
        { usage: '```/markov meme```', description: 'Мем с AI.' },
      ]
    },
    shopmanage: {
      title: '🛒 Управление магазином',
      desc: 'Только для админов.',
      commands: [
        { usage: '```/shop-manage add <name> <price>...```', description: 'Добавить товар.' },
        { usage: '```/shop-manage remove <item_id>```', description: 'Удалить товар.' },
        { usage: '```/shop-manage list```', description: 'Все товары (вкл. неактивные).' },
        { usage: '```/shop-manage toggle <item_id>```', description: 'Вкл/выкл товар.' },
      ]
    },
};
  
const SECTIONS = [
    { name: 'Уровни', value: 'level' },
    { name: 'Экономика', value: 'economy' },
    { name: 'Battle Pass', value: 'battlepass' },
    { name: 'Игры', value: 'games' },
    { name: 'Развлечения', value: 'predict' },
    { name: 'Утилиты', value: 'utilities' },
    { name: 'Администрирование', value: 'admin' },
    { name: 'Магазин', value: 'shopmanage' },
];
  
export const data = new SlashCommandBuilder()
.setName('help')
.setDescription('Справка по командам')
.addStringOption(opt =>
    opt.setName('section')
    .setDescription('Название раздела или команды')
    .setRequired(false)
    .addChoices(
        ...SECTIONS.map(section => ({ name: section.name, value: section.value }))
    )
);

function twoCol(fields: { name: string, value: string }[]): { name: string, value: string, inline: boolean }[] {
    const result: { name: string; value: string; inline: boolean }[] = [];
    for (let i = 0; i < fields.length; i += 2) {
      // Явно прокидываем name/value,
      // если чего-то не хватает — делаем заглушку!
      const a = fields[i];
      const b = fields[i + 1];
  
      result.push({
        name: a?.name ?? '\u200B',
        value: a?.value ?? '\u200B',
        inline: true,
      });
  
      if (b) {
        result.push({
          name: b?.name ?? '\u200B',
          value: b?.value ?? '\u200B',
          inline: true,
        });
      }
  
      // Третий столбец — чистый заполнитель для нового ряда
      result.push({
        name: '\u200B',
        value: '\u200B',
        inline: true,
      });
    }
    return result;
}

export async function execute(interaction: ChatInputCommandInteraction, bot: DiscordBot) {
    const section = interaction.options.getString('section');
    const settingsService = new SettingsService(bot.database, bot.redis);
  
    const member = interaction.member as GuildMember;
    const settings = await settingsService.getGuildSettings(interaction.guildId!);
    const isAdmin = await settingsService.hasPermission(member, settings);
  
    // Если указана подкоманда
    if (section) {
      if (!HELP_STRUCTURE[section]) {
        await interaction.reply({
          content: 'Раздел не найден.',
          ephemeral: true,
        });
        return;
      }
      
      // Админ-разделы доступны только админу
      if ((section === 'admin' || section === 'shopmanage') && !isAdmin) {
        await interaction.reply({ content: 'Недостаточно прав.', ephemeral: true });
        return;
      }
  
      const sectionData = HELP_STRUCTURE[section];
      const embed = new EmbedBuilder()
        .setColor('#0099FF')
        .setTitle(sectionData.title)
        .setDescription(sectionData.desc)
        .addFields(sectionData.commands.map((c: HelpCommand) => ({
          name: c.description, 
          value: c.usage, 
          inline: false,
        })))
        .setFooter({ text: '/help — чтобы вернуться к списку всех разделов.' })
        .setTimestamp();
        
      await interaction.reply({ embeds: [embed], ephemeral: false });
      return;
    }
  
    // Главная справка: выводим список категорий в 2 колонки
    const baseKeys: string[] = isAdmin
      ? ['level', 'economy', 'battlepass', 'games', 'predict', 'utilities', 'admin', 'shopmanage']
      : ['level', 'economy', 'battlepass', 'games', 'predict', 'utilities'];
  
    const fieldArr = baseKeys.map(k => {
        const sectionData = HELP_STRUCTURE[k];
        // Защита: если вдруг секция не найдена, используем заглушку
        if (!sectionData) {
            return { name: k, value: 'Нет описания', inline: true };
        }
        return {
            name: sectionData.title,
            value: sectionData.desc.length > 0 
            ? sectionData.desc 
            : sectionData.commands.map((c: HelpCommand) => c.usage).slice(0, 2).join('\n'),
        };
    });
  
    const embed = new EmbedBuilder()
      .setColor('#0099FF')
      .setTitle('🤖 Помощь по командам')
      .setDescription('Выберите раздел для подробной справки:\n`/help <раздел>`')
      .addFields(twoCol(fieldArr))
      .setFooter({ text: 'Укажите "/help <раздел>" например: /help level' })
      .setTimestamp();
  
    await interaction.reply({ embeds: [embed], ephemeral: false });
}