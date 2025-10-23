import { Collection, ComponentType, ButtonInteraction, SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, User, ActionRowBuilder, ButtonBuilder, ButtonStyle, Interaction } from 'discord.js';
import { DatabaseService } from '../services/database/DatabaseService'
import { DiscordBot } from '..';
import { updateBattlePassProgress } from '../services/battlepass/updateBattlePassProgress';

// --- Команда ---
export const data = new SlashCommandBuilder()
  .setName('games')
  .setDescription('Игровые команды')
  .addSubcommand(s =>
    s.setName('slots')
     .setDescription('Сыграть в слоты')
     .addIntegerOption(o => o.setName('bet').setDescription('Ставка (необязательно)').setRequired(false))
  )
  .addSubcommand(s =>
    s.setName('dice')
     .setDescription('Бросить 2 кубика')
     .addIntegerOption(o => o.setName('bet').setDescription('Ставка (необязательно)').setRequired(false))
  )
  .addSubcommand(s =>
    s.setName('coin')
     .setDescription('Подбросить монетку')
     .addIntegerOption(o => o.setName('bet').setDescription('Ставка (необязательно)').setRequired(false))
  )
  .addSubcommand(s =>
    s.setName('duel')
     .setDescription('Бросить вызов дуэли')
     .addUserOption(o => o.setName('opponent').setDescription('Противник').setRequired(true))
     .addIntegerOption(o => o.setName('bet').setDescription('Ставка (необязательно)').setRequired(false))
  )

// --- Handler ---
export async function execute(interaction: ChatInputCommandInteraction, bot: DiscordBot) {
    const sub = interaction.options.getSubcommand();
    switch (sub) {
      case 'slots':
        await playSlots(interaction, bot); 
        break;
      case 'dice':
        await playDice(interaction, bot);
        break;
      case 'coin':
        await playCoin(interaction, bot);
        break;
      case 'duel': {
        const opponent = interaction.options.getUser('opponent', true);
        await playDuel(interaction, bot, opponent);
        break;
      }
    }
}

// --- Кнопка для игр ---
const pendingDuels = new Map<string, {p1: string, p2: string, bet: number}>(); 
const gameUserBets = new Map<string, number>();

function isUserInPendingDuel(userId: string): boolean {
    for (const duel of pendingDuels.values()) {
      if (duel.p1 === userId || duel.p2 === userId) return true;
    }
    return false;
}

async function playSlots(interaction: ChatInputCommandInteraction | ButtonInteraction, bot: DiscordBot) {
    let bet = 0;
    let userId = interaction.user.id;
    
    // Для ChatInputCommandInteraction найдём ставку через options
    if (interaction.isChatInputCommand()) {
      bet = interaction.options.getInteger('bet') ?? 0;
      gameUserBets.set(userId, bet);
    }
    if (interaction.isButton()) {
      bet = gameUserBets.get(userId) ?? 0;
    }
    
    const db = bot.database;
    if (bet > 0) {
      const dbUser = await db.User!.findByPk(userId);
      if (!dbUser || dbUser.coins < bet) {
        const embed = new EmbedBuilder()
            .setColor('#eb4034')
            .setTitle('Ошибка')
            .setDescription(`❗ У вас недостаточно монет для ставки!`);
        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
      }
      await db.updateUserCoins(userId, -bet);
    }

    await interaction.deferReply();
    const slotEmojis = ['🍒','🍋','🍇','🍉','7️⃣','🔔','⭐'];

    for (let i = 0; i < 4; i++) {
      const slots = Array.from({length: 3}, () => slotEmojis[Math.floor(Math.random()*slotEmojis.length)]);
      const embed = new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle('🎰 Слоты')
        .setDescription(`| ${slots.join(' | ')} |`);
      await interaction.editReply({ embeds: [embed]});
      await new Promise(r => setTimeout(r, 350));
    }

    const final = Array.from({length:3}, () => slotEmojis[Math.floor(Math.random()*slotEmojis.length)]);
    // --- Определяем выигрыш строго по совпадениям ---
    let outcome = '😶 Проигрыш!';
    let win = 0;
    if (final[0] === final[1] && final[1] === final[2]) {
      outcome = '🎉 Джекпот!';
      win = bet > 0 ? bet * 10 : 0;      // три одинаковых — x10
    } else if (final[0] === final[1] || final[1] === final[2] || final[0] === final[2]) {
      outcome = '✌️ Два совпадения!';
      win = bet > 0 ? bet * 2 : 0;       // два совпадения — x2
    }

    if (win > 0) await db.updateUserCoins(userId, win);

    let desc = `| ${final.join(' | ')} |\n**${outcome}**`;
    if (bet > 0) {
      desc += `\n\nСтавка: **${bet}** монет.`;
      if (win > 0) desc += `\nВы выиграли **${win}** монет!`;
      else desc += `\nВы проиграли ставку.`;
    } else {
      desc += `\n\nИграли без ставки.`;
    }

    const resultEmbed = new EmbedBuilder()
        .setColor(win > 0 ? '#00FF00' : '#FF6347')
        .setTitle('🎰 Результат')
        .setDescription(desc);

        const againButton = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('slots_again')
                .setStyle(ButtonStyle.Primary)
                .setLabel('🎰 Ещё раз')
        );

    await updateBattlePassProgress({
      bot,
      userId,
      guildId: interaction.guildId!,
      type: 'game',
      amount: 1,
      isDaily: true,
      channel: interaction.channel,
      gameType: 'slots',
      interaction 
    });

    await interaction.editReply({ 
        embeds: [resultEmbed], 
        components: [againButton] 
    });

    await setupGameButtonCollector(interaction, bot);
}
  
async function playDice(interaction: ChatInputCommandInteraction | ButtonInteraction, bot: DiscordBot) {
  let bet = 0;
  let userId = interaction.user.id;
  
  // Для ChatInputCommandInteraction найдём ставку через options
  if (interaction.isChatInputCommand()) {
    bet = interaction.options.getInteger('bet') ?? 0;
    gameUserBets.set(userId, bet);
  }
  if (interaction.isButton()) {
    bet = gameUserBets.get(userId) ?? 0;
  }
  const db = bot.database;

  if (bet > 0) {
        const dbUser = await db.User!.findByPk(userId);
        if (!dbUser || dbUser.coins < bet) {
        const embed = new EmbedBuilder()
            .setColor('#eb4034')
            .setTitle('Ошибка')
            .setDescription('❗ У вас недостаточно монет для ставки!');
        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
        }
        await db.updateUserCoins(userId, -bet);
  }

  await interaction.deferReply();

  const d1 = Math.floor(Math.random() * 6) + 1;
  const d2 = Math.floor(Math.random() * 6) + 1;
  const sum = d1 + d2;

  // Например, выигрыш если выпало 7 или 12 (удача):
  let win = 0, text = `Первый кубик: **${d1}**\nВторой кубик: **${d2}**\nСумма: **${sum}**`;

  if (bet > 0) {
    if (sum === 7) {
      win = bet * 5;
      await db.updateUserCoins(userId, win);
      text += `\n\nСУДЬБА! Выпало 7\nВы выиграли **${win}** монет!`;
    } else if (sum === 12) {
      win = bet * 10;
      await db.updateUserCoins(userId, win);
      text += `\n\nДВЕНАДЦАТЬ! Крупный выигрыш!\nВы выиграли **${win}** монет!`;
    } else {
      text += `\n\nВы проиграли ставку (**${bet}** монет)`;
    }
    text += `\nСтавка: **${bet}** монет.`;
  } else {
    text += `\n\nИгра без ставки!`;
  }

  const embed = new EmbedBuilder()
    .setColor(win > 0 ? '#00FF00' : '#FF6347')
    .setTitle('🎲 Бросок кубиков')
    .setDescription(text);

  await updateBattlePassProgress({
    bot,
    userId,
    guildId: interaction.guildId!,
    type: 'game',
    amount: 1,
    isDaily: true,
    channel: interaction.channel,
    gameType: 'dice',
    interaction 
  });

  await interaction.editReply({ embeds: [embed]});
}

async function playCoin(interaction: ChatInputCommandInteraction | ButtonInteraction, bot: DiscordBot) {
  let bet = 0;
  let userId = interaction.user.id;
  
  // Для ChatInputCommandInteraction найдём ставку через options
  if (interaction.isChatInputCommand()) {
    bet = interaction.options.getInteger('bet') ?? 0;
    gameUserBets.set(userId, bet);
  }
  if (interaction.isButton()) {
    bet = gameUserBets.get(userId) ?? 0;
  }
  const db = bot.database;
  
  if (bet > 0) {
      const dbUser = await db.User!.findByPk(userId);
      if (!dbUser || dbUser.coins < bet) {
        const embed = new EmbedBuilder()
          .setColor('#eb4034')
          .setTitle('Ошибка')
          .setDescription('❗ У вас недостаточно монет для ставки!');
        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
      }
      await db.updateUserCoins(userId, -bet);
  }

  await interaction.deferReply();

  const isHeads = Math.random() < 0.5;
  let win = 0, text = isHeads ? 'Выпало: **Орёл!**' : 'Выпало: **Решка!**';

  if (bet > 0) {
    if (isHeads) {
      win = bet * 2;
      await db.updateUserCoins(userId, win);
      text += `\n\nВы выиграли **${win}** монет!`;
    } else {
      text += `\n\nВы проиграли ставку (${bet} монет)`;
    }
    text += `\nСтавка: **${bet}** монет.`;
  } else {
    text += `\n\nИгра без ставки!`;
  }

  const embed = new EmbedBuilder()
    .setColor(win > 0 ? '#00FF00' : '#FFD700')
    .setTitle('🪙 Монетка')
    .setDescription(text);

  await updateBattlePassProgress({
    bot,
    userId,
    guildId: interaction.guildId!,
    type: 'game',
    amount: 1,
    isDaily: true,
    channel: interaction.channel,
    gameType: 'coin',
    interaction 
  });

  await interaction.editReply({ embeds: [embed] });
}

async function playDuel(interaction: ChatInputCommandInteraction, bot: DiscordBot, opponent: User) {
    const bet = interaction.options.getInteger('bet', true);
    const p1 = interaction.user;

    if (opponent.bot) {
        const embed = new EmbedBuilder()
          .setColor('#eb4034')
          .setTitle('Ошибка')
          .setDescription('❌ Нельзя бросить вызов боту!');
        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
    }

    if (!bot.database.User) {
        const embed = new EmbedBuilder()
            .setColor('#eb4034')
            .setTitle('Ошибка')
            .setDescription(`❌ Ошибка базы данных!`);
        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
    }

    if (isUserInPendingDuel(p1.id)) {
        const embed = new EmbedBuilder()
            .setColor('#eb4034')
            .setTitle('Ошибка')
            .setDescription(`❗ У вас уже есть активная дуэль! Закончите или отмените её.`);
        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
    }
    if (isUserInPendingDuel(opponent.id)) {
        const embed = new EmbedBuilder()
            .setColor('#eb4034')
            .setTitle('Ошибка')
            .setDescription(`❗ У соперника уже есть активная дуэль! Подождите завершения.`);
        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
    }

    const p1user = await bot.database.User.findByPk(p1.id);
    const p2user = await bot.database.User.findByPk(opponent.id);
    
    if (!p1user || p1user.coins < bet) {
      const embed = new EmbedBuilder()
        .setColor('#eb4034')
        .setTitle('Ошибка')
        .setDescription(`❗ У вас недостаточно монет!`);
      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }
    if (!p2user || p2user.coins < bet) {
      const embed = new EmbedBuilder()
        .setColor('#eb4034')
        .setTitle('Ошибка')
        .setDescription(`❗ У соперника недостаточно монет!`);
      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }
  
    const duelId = `${p1.id}-${opponent.id}-${Date.now()}`;
    pendingDuels.set(duelId, { p1: p1.id, p2: opponent.id, bet });
  
    const embed = new EmbedBuilder()
      .setTitle('⚔️ Дуэль')
      .setDescription(`${p1} вызывает на дуэль ${opponent}!\nСтавка: **${bet}** монет\n\n<@${opponent.id}> — принять вызов?`);
  
    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents([
        new ButtonBuilder().setCustomId(`duel_accept:${duelId}`).setStyle(ButtonStyle.Success).setLabel('Принять'),
        new ButtonBuilder().setCustomId(`duel_decline:${duelId}`).setStyle(ButtonStyle.Danger).setLabel('Отклонить')
      ]);
    await interaction.reply({ embeds: [embed], components: [row] });
}

async function startDuelBattle(
    interaction: ButtonInteraction, duelId: string, p1id: string, p2id: string, bet: number, bot: DiscordBot
  ) {
    const hp = { [p1id]: 3, [p2id]: 3 };
    let active = p1id;
    let turn = 1;
  
    await interaction.message.edit({ components: [] });
  
    let msg = interaction.message;
    await msg.edit({ embeds: [new EmbedBuilder()
      .setTitle('⚔️ Дуэль начинается!')
      .setDescription(`<@${p1id}> и <@${p2id}> начинают бой!\nОба с **3 жизнями**, ставка: **${bet}**`)
    ] });
  
    while ((hp[p1id] ?? 0) > 0 && (hp[p2id] ?? 0) > 0) {
      turn++;
      const target = active === p1id ? p2id : p1id;
      const attackType = Math.random() < 0.5 ? 'удар' : 'критический удар';
      const dmg = attackType === 'удар' ? 1 : 2;
      const blocked = Math.random() < 0.25;
      let text: string;
  
      if (blocked) {
        text = `<@${target}> парирует атаку!`;
      } else {
        hp[target] = (hp[target] ?? 0) - dmg;
        text = `<@${active}> наносит **${attackType}** (<@${target}> -${dmg} HP)!`;
      }
  
      hp[p1id] = Math.max(hp[p1id] ?? 0, 0);
      hp[p2id] = Math.max(hp[p2id] ?? 0, 0);
  
      await msg.edit({
        embeds: [new EmbedBuilder()
          .setTitle(`⚔️ Дуэль — раунд ${turn}`)
          .setDescription(`${text}\n\nЗдоровье:\n<@${p1id}>: **${hp[p1id]}** / <@${p2id}>: **${hp[p2id]}**\n\nСтавка: **${bet}** монет`)
        ],
        components: []
      });
  
      await new Promise(r => setTimeout(r, 1200));
      active = target;
    }
  
    // --- Определение победителя ---
    const winnerId = (hp[p1id] ?? 0) > 0 ? p1id : p2id;
    const loserId = (hp[p1id] ?? 0) > 0 ? p2id : p1id;
  
    // --- Обновление баланса ---
    if (bot.database.User) {
      await bot.database.User.increment('coins', { by: bet, where: { id: winnerId } });
      await bot.database.User.decrement('coins', { by: bet, where: { id: loserId } });
      // Показываем итоговые балансы
      const winner = await bot.database.User.findByPk(winnerId);
      const loser = await bot.database.User.findByPk(loserId);
  
      await msg.edit({
        embeds: [new EmbedBuilder()
          .setTitle('🏆 Дуэль завершена!')
          .setDescription(`Победил: <@${winnerId}> \nПроигрывает: <@${loserId}>\n\nПобедитель получает **${bet}** монет!`)
          .addFields({
            name: 'Баланс победителя',
            value: `${winner?.coins ?? '—'}`
          }, {
            name: 'Баланс проигравшего',
            value: `${loser?.coins ?? '—'}`
          })
        ],
        components: [
          new ActionRowBuilder<ButtonBuilder>()
            .addComponents(new ButtonBuilder()
              .setCustomId(`duel_again:${winnerId}`)
              .setStyle(ButtonStyle.Primary)
              .setLabel("Ещё раз"))
        ]
      });

      await updateBattlePassProgress({
        bot,
        userId: p1id,
        guildId: interaction.guildId!,
        type: 'game',
        amount: 1,
        isDaily: true,
        channel: interaction.channel,
        gameType: 'duel',
        interaction 
      });

      await updateBattlePassProgress({
          bot,
          userId: p2id,
          guildId: interaction.guildId!,
          type: 'game',
          amount: 1,
          isDaily: true,
          channel: interaction.channel,
          gameType: 'duel',
          interaction 
      });
    } else {
      await msg.edit({
        embeds: [new EmbedBuilder()
          .setTitle('🏆 Дуэль завершена!')
          .setDescription(`Победил: <@${winnerId}> \nПроигрывает: <@${loserId}>\n\nПобедитель получает **${bet}** монет!`)
        ],
        components: [
          new ActionRowBuilder<ButtonBuilder>()
            .addComponents(new ButtonBuilder()
              .setCustomId(`duel_again:${winnerId}`)
              .setStyle(ButtonStyle.Primary)
              .setLabel("Ещё раз"))
        ]
      });

      await updateBattlePassProgress({
        bot,
        userId: p1id,
        guildId: interaction.guildId!,
        type: 'game',
        amount: 1,
        isDaily: true,
        channel: interaction.channel,
        gameType: 'duel',
        interaction 
      });

      await updateBattlePassProgress({
          bot,
          userId: p2id,
          guildId: interaction.guildId!,
          type: 'game',
          amount: 1,
          isDaily: true,
          channel: interaction.channel,
          gameType: 'duel',
          interaction 
      });
    }
}

const activeGameCollectors = new Map<string, any>();

// Функция для создания коллектора кнопок для игр
async function setupGameButtonCollector(interaction: any, bot: DiscordBot) {
    const userId = interaction.user.id;
    
    // Останавливаем предыдущий коллектор, если есть
    if (activeGameCollectors.has(userId)) {
        activeGameCollectors.get(userId).stop('new_interaction');
        activeGameCollectors.delete(userId);
    }
    
    let targetMessage;
    if (interaction.isButton()) {
        targetMessage = interaction.message;
    } else if (interaction.isChatInputCommand() && (interaction.replied || interaction.deferred)) {
        targetMessage = await interaction.fetchReply();
    } else {
        return;
    }

    const collector = targetMessage.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 600000 // 10 минут (для игр можно больше)
    });

    activeGameCollectors.set(userId, collector);

    collector.on('collect', async (buttonInteraction: ButtonInteraction) => {
        if (buttonInteraction.user.id !== interaction.user.id) {
            await buttonInteraction.reply({ 
                content: '❌ Только автор игры может использовать эти кнопки.',
                ephemeral: true
            });
            return;
        }

        try {
            await handleGameButtonInteraction(buttonInteraction, bot);
        } catch (error) {
            console.error('Error handling game button:', error);
            try {
                if (!buttonInteraction.replied && !buttonInteraction.deferred) {
                    await buttonInteraction.reply({
                        content: '❌ Произошла ошибка в игре.',
                        ephemeral: true
                    });
                }
            } catch (err) {
                // Игнорируем
            }
        }
    });

    collector.on('end', (collected: Collection<string, ButtonInteraction>, reason: string) => {
        if (activeGameCollectors.has(userId)) {
            activeGameCollectors.delete(userId);
        }
        if (reason === 'time') {
            try {
                interaction.editReply({ components: [] }).catch(() => {});
            } catch (error) {
                // Игнорируем
            }
        }
    });
}

async function handleGameButtonInteraction(interaction: ButtonInteraction, bot: DiscordBot) {
  const { customId } = interaction;

  // Дуэли
  if (customId.startsWith('duel_accept:')) {
      await interaction.deferUpdate();
      const duelId = customId.split(':')[1];
      const duel = pendingDuels.get(duelId!);
      if (!duel || interaction.user.id !== duel.p2) return;
      pendingDuels.delete(duelId!);
      await startDuelBattle(interaction, duelId!, duel.p1, duel.p2, duel.bet, bot);
      return;
  }

  if (customId.startsWith('duel_decline:')) {
      await interaction.deferUpdate();
      const duelId = customId.split(':')[1];
      const duel = pendingDuels.get(duelId!);
      if (!duel || interaction.user.id !== duel.p2) return;
      pendingDuels.delete(duelId!);
      
      await interaction.message.edit({
          embeds: [new EmbedBuilder().setTitle('Дуэль отклонена').setDescription(`<@${duel.p2}> отказался!`)],
          components: []
      });
      return;
  }

  // Повторная игра в слоты
  if (customId === 'slots_again') {
      await playSlots(interaction, bot);  // Переиспользуем функцию
      return;
  }

  // Повторный бросок кубика
  if (customId === 'dice_again') {
      await playDice(interaction, bot);
      return;
  }

  // Повторное подбрасывание монетки
  if (customId === 'coin_again') {
      await playCoin(interaction, bot);
      return;
  }
}