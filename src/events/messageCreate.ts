import { Message } from 'discord.js';
import { DiscordBot } from '../index';
import { LevelService } from '../services/levels/LevelService';
import { logger } from '../utils/logger';
import { AutoModService } from '../services/moderation/AutoModService';
import fs from 'fs';
import path from 'path';
import { DateTime } from 'luxon';
import { updateBattlePassProgress } from '../services/battlepass/updateBattlePassProgress';

function rotateTasks(tasks: any[], max: number, dayOffset: number): any[] {
    if (tasks.length === 0) return [];
    const offset = (dayOffset * max) % tasks.length;
    let rotated = [];
    for (let i = 0; i < max && tasks.length > 0; i++) {
      rotated.push(tasks[(offset + i) % tasks.length]);
    }
    return rotated;
}

export default async function messageCreate(bot: DiscordBot, message: Message): Promise<void> {
    if (message.author.bot || !message.guild || !message.channel.isTextBased()) return;

    try {
        const settings = await bot.settingsService.getGuildSettings(message.guild.id);

        await updateBattlePassProgress({
            bot,
            userId: message.author.id,
            guildId: message.guild.id,
            type: 'messages',
            amount: 1,
            isDaily: true,
            channel: message.channel,
            messageContent: message.content
        });

        const blocked = await bot.autoMod.enforce(message);
        if (blocked) return;

        if (message.attachments.size > 0) {
            await saveImagesFromMessage(message, bot);
        }
        await saveGifsFromEmbedsAndContent(message, bot);

        const contentLength = message.content?.length ?? 0;
        const memberRoleIds = message.member?.roles.cache.map(r => r.id) ?? [];
        await bot.database.createUser(message.author.id, message.author.username);

        const levelResult = await bot.levelService.addMessageXP(
            message.author.id,
            message.guild.id,
            message.channel.id,
            contentLength,
            memberRoleIds
        );
        
        if (levelResult.levelUp && settings.levels.levelup_messages) {
            const congrats = [
              `🎉 Поздравляю, ${message.author}! Вы достигли ${levelResult.newLevel} уровня!`,
              `⭐ Невероятно! ${message.author} теперь ${levelResult.newLevel} уровня!`,
              `🏆 ${message.author} повысился до ${levelResult.newLevel} уровня! Так держать!`,
              `🎊 Ура! ${message.author} достиг ${levelResult.newLevel} уровня!`
            ];
            const text = `${congrats[Math.floor(Math.random() * congrats.length)]}\n💰 Получено: ${levelResult.coinsEarned} монет!`;
          
            const targetChannelId = settings.levels.levelup_channel || message.channel.id; // levels.levelup_channel приоритетен
            const target = await message.client.channels.fetch(targetChannelId).catch(() => null);
          
            if (target && 'isSendable' in target && target.isSendable()) {
              await target.send({ content: text });
            } else {
              await message.reply({ content: text });
            }
        }

        const prefix = '/';

        if (message.content.length > 2 && !message.content.startsWith(prefix)) {
            if (!containsInappropriateContent(message.content)) {
                await bot.markov.trainFromMessage(
                    message.guild.id,
                    message.channel.id,
                    message.content
                );
            }
        }

        const responseChance = settings.ai.response_chance || 0.45;

        if (Math.random() < responseChance && message.content.length > 5) {            
            logger.debug('Attempting to generate AI response...');

            const response = await bot.markov.generateResponse(
                message.guild.id,
                message.channel.id
            );

            logger.debug(`Generated response: ${response}`);

            if (response && response.length > 3) {
                try {
                    // Проверяем что канал поддерживает sendTyping
                    if ('sendTyping' in message.channel) {
                        await message.channel.sendTyping();
                    }
                    
                    const delay = Math.min(response.length * 50, 3000);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    
                    if (message.channel.isSendable()) {
                        await bot.markov.sendAIReply(message, response);
                    }
                } catch (error) {
                    logger.error('Error sending Markov response:', error);
                }
            }
        }

    } catch (error) {
        logger.error('Error in messageCreate event:', error);
    }
}

async function saveImagesFromMessage(message: Message, bot: DiscordBot) {
    try {
        // Создаем папку, если её нет
        const imagesDir = './mem_images';
        if (!fs.existsSync(imagesDir)) {
            fs.mkdirSync(imagesDir, { recursive: true });
        }

        for (const [, attachment] of message.attachments) {
            const name = attachment.name?.toLowerCase() || '';
            const isImage = (attachment.contentType?.startsWith('image/') ?? false)
              || name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.png') || name.endsWith('.webp');
            const isGif = (attachment.contentType === 'image/gif')
              || name.endsWith('.gif');
              
            if (!isImage && !isGif) continue;

            // Присваиваем правильное расширение (gif/jpeg/png/...)
            const ext =
                path.extname(attachment.name ?? (isGif ? '.gif' : '.png'));
            const fileName = `${message.id}_${attachment.id}${ext}`;
            const filePath = path.join(imagesDir, fileName);

            try {
                // Скачиваем файл (и гифки, и картинки)
                const response = await fetch(attachment.url);
                const buffer = Buffer.from(await response.arrayBuffer());
                fs.writeFileSync(filePath, buffer);

                // Сохраняем метаданные в БД (можешь добавить тип если нужно)
                await bot.database.saveMemeImage({
                    guildId: message.guild!.id,
                    channelId: message.channel.id,
                    messageId: message.id,
                    userId: message.author.id,
                    filePath: filePath,
                    originalUrl: attachment.url,
                    // isGif: isGif // если нужно
                });

                logger.debug(`Saved meme file: ${fileName}`);
            } catch (error) {
                logger.error(`Failed to save file ${attachment.name}:`, error);
            }
        }
    } catch (error) {
        logger.error('Error in saveImagesFromMessage:', error);
    }
}

async function saveGifsFromEmbedsAndContent(message: Message, bot: DiscordBot) {
    try {
        // 1. From embeds (GIPHY, TENOR, etc.)
        for (const embed of message.embeds) {
            let gifUrl: string | undefined = undefined;
            if (embed.url && embed.url.endsWith('.gif')) gifUrl = embed.url;
            else if (embed.image?.url && embed.image.url.endsWith('.gif')) gifUrl = embed.image.url;
            else if (embed.thumbnail?.url && embed.thumbnail.url.endsWith('.gif')) gifUrl = embed.thumbnail.url;

            // Сохраняем ТОЛЬКО прямую .gif ссылку!
            if (gifUrl) {
                await bot.database.saveMemeImage({
                    guildId: message.guild!.id,
                    channelId: message.channel.id,
                    messageId: message.id,
                    userId: message.author.id,
                    filePath: '', // либо не пиши, либо special-type
                    originalUrl: gifUrl
                });
                logger.debug(`[GIF EMBED] Saved original url: ${gifUrl}`);
            }
        }
        // 2. From текстовых ссылок .gif в сообщении
        const possibleGifUrls = message.content.match(/https?:\/\/\S+\.gif/g);
        if (possibleGifUrls) {
            for (const url of possibleGifUrls) {
                await bot.database.saveMemeImage({
                    guildId: message.guild!.id,
                    channelId: message.channel.id,
                    messageId: message.id,
                    userId: message.author.id,
                    filePath: '', // либо не пиши, либо special-type
                    originalUrl: url
                });
                logger.debug(`[GIF TEXT] Saved original url: ${url}`);
            }
        }
    } catch (error) {
        logger.error('Error in saveGifsFromEmbedsAndContent:', error);
    }
}

function containsInappropriateContent(content: string): boolean {
    const inappropriatePatterns = [
        /@(everyone|here)/i,
        /https?:\/\//i, // URL
        /<@[!&]?\d+>/i, // Упоминания
        /```/, // Код-блоки
        /^\s*$/, // Пустые или пробельные
    ];

    return inappropriatePatterns.some(pattern => pattern.test(content));
}