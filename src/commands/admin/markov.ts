import { AttachmentBuilder, SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { DiscordBot } from '../../index';
import { logger } from '../../utils/logger';
import { SettingsService } from '../../services/settings/SettingsService';

export const data = new SlashCommandBuilder()
    .setName('markov')
    .setDescription('Управление AI-чатом (только для администраторов)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(subcommand =>
        subcommand
            .setName('generate')
            .setDescription('Принудительно сгенерировать ответ')
            .addStringOption(option => 
                option
                    .setName('start_word')
                    .setDescription('Стартовое слово (опционально)')
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('stats')
            .setDescription('Статистика обученной модели')
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('clear')
            .setDescription('Очистить данные обучения (ОСТОРОЖНО!)')
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('meme')
            .setDescription('Создать мем из последних изображений и AI-текста')
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('gif')
            .setDescription('Отправить GIF из базы бота')
    )

export async function execute(interaction: ChatInputCommandInteraction, bot: DiscordBot) {
    const settingsService = new SettingsService(bot.database, bot.redis);
    const settings = await settingsService.getGuildSettings(interaction.guild!.id);
    
    if (!settings.economy.shop_enabled) {
        const embed = new EmbedBuilder()
            .setColor('#eb4034')
            .setTitle('Ошибка')
            .setDescription('❌ ИИ выключен на этом сервере.')
        await interaction.editReply({ embeds: [embed]});
        return;
    }

    const subcommand = interaction.options.getSubcommand();
    
    switch (subcommand) {
        case 'generate':
            await handleGenerate(interaction, bot);
            break;
        case 'stats':
            await handleStats(interaction, bot);
            break;
        case 'clear':
            await handleClear(interaction, bot);
            break;
        case 'meme':
            await handleMeme(interaction, bot);
            break;
        case 'gif':
            await handleGIF(interaction, bot);
            break;
    }
}

async function handleMeme(interaction: ChatInputCommandInteraction, bot: DiscordBot) {
    await interaction.deferReply();
  
    try {
      if (!interaction.guildId) {
        await interaction.editReply({ content: 'Мемы работают только на серверах!' });
        return;
      }
  
      // 1-3 картинки случайно, можно option заменить на строгое значение
      const count = Math.floor(Math.random() * 3) + 1;
      const imagePaths = await bot.database.getRandomImage(interaction.guildId, count);
  
      if (!imagePaths.length) {
        const embed = new EmbedBuilder()
          .setColor('#eb4034')
          .setTitle('Ошибка')
          .setDescription('❌ Нет сохранённых картинок!');
        await interaction.editReply({ embeds: [embed] });
        return;
      }
  
      const topText = (await bot.markov.generateResponse(interaction.guildId, interaction.channelId!)) || '';
      const bottomText = (await bot.markov.generateResponse(interaction.guildId, interaction.channelId!)) || '';
  
      let buffer: Buffer;
  
      if (imagePaths.length === 1) {
        // Обычный мем: одна картинка — текст сверху/снизу
        buffer = await bot.markov.makeMultiImageMeme(imagePaths, topText, bottomText);
      } else {
        // Оверлей: main — первая, overlays — остальные
        const [mainPath, ...overlays] = imagePaths;
        buffer = await bot.markov.makeOverlayMeme(mainPath!, overlays, topText, bottomText);
      }
  
      const attachment = new AttachmentBuilder(buffer, { name: 'ai_meme.png' });
  
      await interaction.editReply({
        files: [attachment]
      });
    } catch (error) {
      logger.error('Error generating AI meme:', error);
      const embed = new EmbedBuilder()
        .setColor('#eb4034')
        .setTitle('Ошибка')
        .setDescription('❌ Произошла ошибка при создании мема.');
  
      await interaction.editReply({ embeds: [embed] });
    }
}

async function handleGIF(interaction: ChatInputCommandInteraction, bot: DiscordBot) {
    await interaction.deferReply();
  
    try {
      if (!interaction.guildId) {
        await interaction.editReply({ content: 'Мемы работают только на серверах!' });
        return;
      }
  
      const gifUrl = await bot.database.getRandomGif(interaction.guildId);

      if (!gifUrl) {
        const embed = new EmbedBuilder()
          .setColor('#eb4034')
          .setTitle('Ошибка')
          .setDescription('❌ Нет сохранённых гифок!');
        await interaction.editReply({ embeds: [embed] });
        return;
      }
  
      await interaction.editReply({ content: gifUrl });
    } catch (error) {
      logger.error('Error sending GIF:', error);
      const embed = new EmbedBuilder()
        .setColor('#eb4034')
        .setTitle('Ошибка')
        .setDescription('❌ Произошла ошибка при отправки gif.');
  
      await interaction.editReply({ embeds: [embed] });
    }
}

async function handleGenerate(interaction: ChatInputCommandInteraction, bot: DiscordBot) {
    await interaction.deferReply();
    
    try {
        const response = await bot.markov.generateResponse(interaction.guild!.id, interaction.channel!.id);

        if (response) {
            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('🤖 AI Ответ')
                .setDescription(response)
                .setFooter({ text: 'Случайное стартовое слово (bigram)' });
            
            await interaction.editReply({ embeds: [embed] });
        } else {
            const embed = new EmbedBuilder()
            .setColor('#eb4034')
            .setTitle('Ошибка')
            .setDescription('❌ Не удалось сгенерировать ответ. Возможно, недостаточно данных для обучения.')
      
            await interaction.editReply({ embeds: [embed]});
            return;
        }
    } catch (error) {
        logger.error('Error generating Markov response:', error);
        const embed = new EmbedBuilder()
        .setColor('#eb4034')
        .setTitle('Ошибка')
        .setDescription('❌ Произошла ошибка при генерации ответа.')
  
        await interaction.editReply({ embeds: [embed]});
        return;
    }
}

async function handleStats(interaction: ChatInputCommandInteraction, bot: DiscordBot) {
    await interaction.deferReply();
    
    try {
        if (!bot.database.MarkovBigram) throw new Error('Database not connected');

        // Общее количество пар
        const totalPairs = await bot.database.MarkovBigram.count({
            where: { guild_id: interaction.guild!.id }
        });

        // Количество уникальных слов
        const uniqueTokens = await bot.database.MarkovBigram.count({
            where: { guild_id: interaction.guild!.id },
            distinct: true,
            col: 'curr_token'
        });
        
        const settings = await bot.settingsService.getGuildSettings(interaction.guild!.id);
        
        const embed = new EmbedBuilder()
            .setColor('#0099FF')
            .setTitle('📊 Статистика AI-модели (Bigram)')
            .addFields([
                { name: 'Всего пар биграмм:', value: totalPairs.toString(), inline: true },
                { name: 'Уникальных токенов:', value: uniqueTokens.toString(), inline: true },
                { name: 'Вероятность ответа:', value: `${(settings.ai.response_chance * 100)}%`, inline: true }
            ])
            .setFooter({ text: 'Модель обучается на сообщениях пользователей (Bigram chain)' });
        
        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        logger.error('Error getting Markov stats:', error);
        const embed = new EmbedBuilder()
            .setColor('#eb4034')
            .setTitle('Ошибка')
            .setDescription('❌ Произошла ошибка при получении статистики.')
  
        await interaction.editReply({ embeds: [embed]});
        return;
    }
}

async function handleClear(interaction: ChatInputCommandInteraction, bot: DiscordBot) {
    await interaction.deferReply();
    
    try {
        if (!bot.database.MarkovBigram) {
            throw new Error('Database not connected');
        }

        // Удаляем все записи для данного сервера
        await bot.database.MarkovBigram.destroy({
            where: { guild_id: interaction.guild!.id }
        });
        
        const embed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('🗑️ Данные очищены')
            .setDescription('Все данные обучения AI-модели для этого сервера были удалены.')
            .setFooter({ text: 'Модель начнет обучение заново с новых сообщений' });
        
        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        logger.error('Error clearing Markov data:', error);
        const embed = new EmbedBuilder()
            .setColor('#eb4034')
            .setTitle('Ошибка')
            .setDescription('❌ Произошла ошибка при очистке данных.')
  
        await interaction.editReply({ embeds: [embed]});
        return;
    }
}
