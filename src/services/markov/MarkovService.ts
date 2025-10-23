import { DatabaseService } from '../database/DatabaseService';
import { SettingsService } from '../settings/SettingsService';
import { GuildSettings } from '../settings/SettingsService';
import { logger } from '../../utils/logger';
import { Sequelize, Op} from 'sequelize';
import emojiRegex from 'emoji-regex';
import { Message, AttachmentBuilder  } from 'discord.js';
import { CanvasRenderingContext2D, createCanvas, loadImage, registerFont } from 'canvas';
import path from 'path';
import fs from 'fs';

registerFont(path.join(__dirname, '../../fonts/impact.ttf'), { family: 'Impact' });

const emotionRules: { pattern: RegExp, emoji: string }[] = [
    // Позитив и реакция на успех
    { pattern: /спасибо|thanks|спс|thx|благодар/i, emoji: '🙏' },
    { pattern: /привет|hello|hi|ку|хай|дарова|здоров/i, emoji: '👋' },
    { pattern: /смешно|ахах|лол|ха[хx]+|rжу|lmao|rofl|funny|giggle|угар|умор/i, emoji: '🤣' },
    { pattern: /круто|супер|шик|вау|wow|огонь|отлично|amazing|nice|восхит/i, emoji: '🤩' },
    { pattern: /топ|best|лучше|класс|пушка|nice|молодец|изи|ez/i, emoji: '🔥' },
    { pattern: /лайк|like|нрав|love|лупи лайк/i, emoji: '👍' },
    { pattern: /ура|ураа|yea+h|yes|победа|повезло|gj/i, emoji: '🎉' },
    { pattern: /поздрав|grats|congrats|побед/i, emoji: '🏆' },
    { pattern: /флекс|флексишь|зафлексил/i, emoji: '💪' },
    { pattern: /виба|vibe|вайб|вайбин/i, emoji: '😎' },
    { pattern: /реально|real|реал/i, emoji: '🤔' }, // юзеры часто пишут "реально?" как рефлексию
    { pattern: /бог|аллах|holy|godlike|свят/i, emoji: '🙏' },
    // Молодёжные кринжовые слова
    { pattern: /кринж|cringe|зашквар|стыд|стыдно|нулевый/i, emoji: '🫠' },
    { pattern: /чел|bro|бро|эй/i, emoji: '🧑' },
    { pattern: /капец|жесть|треш|omg|ужас|капец|fml|wtf|omg/i, emoji: '😱' },
    { pattern: /слаб|fail|лох|слабак|noob|нуб/i, emoji: '🥲' },
    // Мат/ругательства (цензурно, просто 🚫 или 😶)
    { pattern: /(?:бл[я*]+|су[ккч]+|хер|пид[аое]+|гандон|долб|мудак|еба+|fuc?k|bitch|shit|asshole|хуй|соси|идиот)/i, emoji: '🚫' },
    // Нейтральные реакции
    { pattern: /думаю|мысль|идея|suggest|предлагаю/i, emoji: '💡' },
    { pattern: /вопрос|кто|что|зачем|почему|какой|зачем|как|\?$/i, emoji: '❓' },
    { pattern: /ответ|ок|ok|ага|понял|ясно|договорились|пон/i, emoji: '👌' },
    { pattern: /ждать|жди|ожидание|позже|подожди|wait/i, emoji: '⏳' },
    { pattern: /да+|yes|угу/i, emoji: '✅' },
    { pattern: /нет+|неа|no+|never/i, emoji: '❌' },
    // Прощание
    { pattern: /пока|bye|до встречи|goodbye|увидим|до свидания|счастливо|bb|bye bye/i, emoji: '👋' },
    // Мемы/шутки
    { pattern: /мем|шутка|joke|mem|ржомба/i, emoji: '😏' },
    { pattern: /очу+мел|воу|офигеть|охренеть|серьёзно|жесть|wild/i, emoji: '🧐' },
    // Упоминания бота
    { pattern: /бот|bot|искусственный интеллект|ai|chatgpt/i, emoji: '🤖' },
];

export class MarkovService {
    private database: DatabaseService;
    private settingsService: SettingsService;
    private readonly customEmojiRe = /<a?:\w{2,}:\d{17,20}>/g;                 // для поиска в тексте
    private readonly customEmojiTokenRe = /^<a?:\w{2,}:\d{17,20}>$/;           // для проверки целого токена
    private readonly uniEmojiRe = emojiRegex();                                // глобальный поиск Unicode-эмодзи
    private readonly uniEmojiTokenRe = new RegExp(`^(?:${emojiRegex().source})$`); // проверка целого токена

    constructor(database: DatabaseService, settingsService: SettingsService) {
        this.database = database;
        this.settingsService = settingsService;
    }

    wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, font: string): string[] {
      ctx.font = font;
      const words: string[] = text.split(' ').filter(Boolean);
      let lines: string[] = [];
      let currentLine: string = words.length > 0 ? words[0]! : '';
      for (let i = 1; i < words.length; i++) {
          const word: string = words[i] || '';
          const width = ctx.measureText(currentLine + ' ' + word).width;
          if (width < maxWidth) {
              currentLine += ' ' + word;
          } else {
              lines.push(currentLine);
              currentLine = word || '';
          }
      }
      if (currentLine !== '') lines.push(currentLine);
      return lines;
    }

    fitFontSize(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, baseSize: number, fontFamily: string, minSize: number = 14): number {
      let fontSize = baseSize;
      ctx.font = `bold ${fontSize}px ${fontFamily}`;
      if (ctx.measureText(text).width <= maxWidth) return fontSize;
      while (fontSize > minSize) {
          ctx.font = `bold ${fontSize}px ${fontFamily}`;
          if (ctx.measureText(text).width <= maxWidth) break;
          fontSize -= 2;
      }
      return fontSize;
    } 

    async makeMultiImageMeme(imagePaths: string[], topText: string, bottomText: string): Promise<Buffer> {
      imagePaths = imagePaths.filter(p => p && typeof p === 'string' && fs.existsSync(p) && p.length > 0);
      if (!imagePaths.length) throw new Error('Нет валидных изображений для мема');

      const images = await Promise.all(imagePaths.map(p => loadImage(p)));
      const width = images.reduce((sum, img) => sum + img.width, 0);
      const height = Math.max(...images.map(img => img.height));
      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext('2d');
      let x = 0;
      for (const img of images) {
          ctx.drawImage(img, x, 0);
          x += img.width;
      }
  
      // -- Верхний ТЕКСТ --
      let fontFamily = 'Impact';
      let maxTextWidth = width * 0.9;
      let topFontSize = this.fitFontSize(ctx, topText.toUpperCase(), maxTextWidth, 50, fontFamily, 14);
      let topLines = this.wrapText(ctx, topText.toUpperCase(), maxTextWidth, `bold ${topFontSize}px ${fontFamily}`);
      let topY = 40;
      ctx.textAlign = 'center';
      ctx.strokeStyle = 'black';
      ctx.fillStyle = 'white';
      ctx.lineWidth = 4;
      for (const line of topLines) {
          ctx.font = `bold ${topFontSize}px ${fontFamily}`;
          ctx.strokeText(line, width / 2, topY);
          ctx.fillText(line, width / 2, topY);
          topY += topFontSize + 5;
      }
  
      // -- Нижний ТЕКСТ --
      let bottomFontSize = this.fitFontSize(ctx, bottomText.toUpperCase(), maxTextWidth, 50, fontFamily, 14);
      let bottomLines = this.wrapText(ctx, bottomText.toUpperCase(), maxTextWidth, `bold ${bottomFontSize}px ${fontFamily}`);
      let bottomY = height - bottomLines.length * bottomFontSize - 20;
      for (const line of bottomLines) {
          ctx.font = `bold ${bottomFontSize}px ${fontFamily}`;
          ctx.strokeText(line, width / 2, bottomY);
          ctx.fillText(line, width / 2, bottomY);
          bottomY += bottomFontSize + 5;
      }
  
      return canvas.toBuffer();
    }

    async makeOverlayMeme(mainPath: string, overlayPaths: string[], topText: string, bottomText: string): Promise<Buffer> {
      if (!mainPath || !fs.existsSync(mainPath)) throw new Error('Главное изображение отсутствует: ' + mainPath);
      // Грузим главное изображение
      const mainImg = await loadImage(mainPath);
    
      // Создаем холст по размеру главной картинки
      const canvas = createCanvas(mainImg.width, mainImg.height);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(mainImg, 0, 0);
    
      // Масштаб и позиция оверлеев — можно подобрать под свой стиль
      const overlaySize = Math.floor(mainImg.width * 0.45); // 45% ширины от главной
      let overlayY = Math.floor(mainImg.height * 0.15); // Чуть ниже верхнего края
      for (const path of overlayPaths) {
        const overlay = await loadImage(path);
        // Вставляем поверх, с небольшим отступом (правый верх или низ)
        const overlayX = Math.floor(mainImg.width * 0.55);
        ctx.drawImage(overlay, overlayX, overlayY, overlaySize, overlaySize);
        overlayY += Math.floor(overlaySize * 1.1); // по вертикали вторую кладем ниже (если несколько)
      }
    
      // Стиль текста: крупно, в две строки сверху и снизу
      ctx.font = `bold ${Math.floor(mainImg.height * 0.08)}px Impact`;
      ctx.fillStyle = 'white';
      ctx.strokeStyle = 'black';
      ctx.textAlign = 'center';
      ctx.lineWidth = 2;
    
      // Верхний текст
      ctx.fillText(topText.toUpperCase(), mainImg.width / 2, Math.floor(mainImg.height * 0.09));
      ctx.strokeText(topText.toUpperCase(), mainImg.width / 2, Math.floor(mainImg.height * 0.09));
    
      // Нижний текст
      ctx.fillText(bottomText.toUpperCase(), mainImg.width / 2, mainImg.height - Math.floor(mainImg.height * 0.04));
      ctx.strokeText(bottomText.toUpperCase(), mainImg.width / 2, mainImg.height - Math.floor(mainImg.height * 0.04));
    
      return canvas.toBuffer();
    }

    async sendAIReply(message: Message, aiText: string): Promise<void> {
      try {
        const canSend = message.channel && message.channel.isTextBased() && message.channel.isSendable();
        const r = Math.random();
    
        if (!message.guildId) return;
    
        // --- Сначала: шанс на отправку случайной ГИФКИ ---
        if (canSend && r < 0.07) { // например, 7% шанс на гифку отдельно
          // Берем только gif-файлы из БД
          const gifMetas = await this.database.MemeImage!.findAll({
            where: {
              guild_id: message.guildId,
              original_url: { [Op.like]: '%.gif' }
            },
            raw: true
          });
          
          if (gifMetas.length > 0) {
            const chosen = gifMetas[Math.floor(Math.random() * gifMetas.length)];
            if (chosen && chosen.original_url) {
              await message.channel.send({ content: chosen.original_url });
              return;
            }
          }
          // если в базе нет гифок, продолжаем обычную мем-логику ниже
        }
    
        // --- Мем-изображение: шанс, что будет 1, 2 или 3 картинки для мемов ---
        if (canSend && r < 0.13) {
          const count = Math.floor(Math.random() * 3) + 1;
          const imagePaths = await this.database.getRandomMemeImages(message.guildId, count)
            .then(arr => arr.filter(p => !p.toLowerCase().endsWith('.gif'))); // исключаем гифки, только картинки
    
          if (imagePaths.length === 0) {

          } else if (imagePaths.length === 1) {
              const topText = (await this.generateResponse(message.guildId, message.channelId)) || 'AI MEME!';
              const bottomText = (await this.generateResponse(message.guildId, message.channelId)) || '';
              const buffer = await this.makeMultiImageMeme(imagePaths, topText, bottomText);
              const attachment = new AttachmentBuilder(buffer, { name: 'meme.png' });
              await message.channel.send({ files: [attachment] });
              return;
          } else {
              const overlayChance = 0.3; // 30%
              if (Math.random() < overlayChance) {
                  const [mainPath, ...overlays] = imagePaths;
                  const topText = (await this.generateResponse(message.guildId, message.channelId)) || '';
                  const bottomText = (await this.generateResponse(message.guildId, message.channelId)) || '';
                  const buffer = await this.makeOverlayMeme(mainPath!, overlays, topText, bottomText);
                  const attachment = new AttachmentBuilder(buffer, { name: 'meme_overlay.png' });
                  await message.channel.send({ files: [attachment] });
                  return;
              } else {
                  const topText = (await this.generateResponse(message.guildId, message.channelId)) || 'AI MEME!';
                  const bottomText = (await this.generateResponse(message.guildId, message.channelId)) || '';
                  const buffer = await this.makeMultiImageMeme(imagePaths, topText, bottomText);
                  const attachment = new AttachmentBuilder(buffer, { name: 'meme.png' });
                  await message.channel.send({ files: [attachment] });
                  return;
              }
          }
        }
    
        // --- Обычный текстовый ответ AI ---
        if (r < 0.43 && canSend) {
          await message.reply({
            content: aiText,
            allowedMentions: { repliedUser: true }
          });
          if (r < 0.2) await this.reactToMessageSmart(message);
        } else if (r < 0.83 && canSend) {
          await message.channel.send({ content: aiText });
        } else if (canSend) {
          await this.reactToMessageSmart(message);
        }
      } catch (error) {
        logger.error('sendAIReply error:', error);
      }
    }

    async reactToMessageSmart(message: Message): Promise<void> {
        try {
          const msg = message.content.toLowerCase();
      
          // 1. По кастомным правилам
          const found = emotionRules.find(r => r.pattern.test(msg));
          if (found) {
            await message.react(found.emoji);
            // Для extra-флекса (пример для смеха)
            if (/ахах|лол|haha|rжу|funny/i.test(msg)) {
              await message.react('😂');
              await message.react('🤣');
            }
            // Для жести и кринжа — два emoji: кринж + 🤦‍♂️
            if (/кринж|cringe/i.test(msg)) {
              await message.react('🤦‍♂️');
            }
            // Для побед и успеха — комбинированный вариант
            if (/топ|лучше|класс|топчик|побед/i.test(msg)) {
              await message.react('🥇');
            }
            // Для ругательств — ещё “😶”
            if (found.emoji === '🚫') {
              await message.react('😶');
            }
            return;
          }
      
          // 2. Повторяем emoji юзера (если есть)
          const userEmojis = msg.match(/\p{Emoji}/gu) || [];
          if (userEmojis.length > 0 && userEmojis[0]) {
            await message.react(userEmojis[0]);
            return;
          }
          // 3. Позитив/негатив анализ, если ничего не совпало по паттернам
          let pos = 0, neg = 0;
          if (/(супер|молодец|отлично|удачно|мило|клево|good|nice|amazing|great|happy|изи|gj)/i.test(msg)) pos++;
          if (/(бред|дефект|ошибка|fail|фейл|печаль|грусть|trouble|bad|poor|слабо|печально|жесть|капец|wtf)/i.test(msg)) neg++;
          if (pos > neg) await message.react('😃');
          else if (neg > pos) await message.react('😢');
          else await message.react('🤔');
        } catch (error) {
          logger.error('reactToMessageSmart error:', error);
        }
    }

    private STOPWORDS = new Set(['и', 'а', 'но', ',', '.', '!', '?', '-', '']);

    async trainFromMessage(guildId: string, channelId: string, content: string): Promise<void> {
      const settings = await this.settingsService.getGuildSettings(guildId);
      if (!settings.ai.enabled) return;
      if (!this.settingsService.shouldProcessAI(settings, channelId)) return;

      try {
          const tokens = this.tokenize(content);
          if (tokens.length < 3) return;
          for (let i = 0; i < tokens.length - 2; i++) {
              const prev = tokens[i];
              const curr = tokens[i + 1];
              const next = tokens[i + 2];
              if (!prev || !curr || !next) continue;
              await this.database.addMarkovBigram(guildId, prev, curr, next); // функция по аналогии с твоими addMarkovData
          }
          logger.debug(`Trained Markov bigram chain with ${tokens.length} tokens from guild ${guildId}`);
      } catch (error) {
          logger.error('Error training Markov bigram chain:', error);
      }
    }

    private async getRandomBigramStart(guildId: string): Promise<[string, string] | null> {
      const candidates: [string, string][] = await this.database.getBigramStartCandidates(guildId);
      // фильтруем только по стоп-словам!
      const filtered = candidates.filter(([prev, curr]: [string, string]) =>
          !this.STOPWORDS.has(curr) &&
          !this.STOPWORDS.has(prev)
      );
      if (filtered.length === 0) return null;
      const idx = Math.floor(Math.random() * filtered.length);
      return filtered[idx] ?? null;
    }

    async generateResponse(guildId: string, channelId: string): Promise<string | null> {
      const settings = await this.settingsService.getGuildSettings(guildId);
      if (!settings.ai.enabled) return null;
      if (!this.settingsService.shouldProcessAI(settings, channelId)) return null;
      const minWords = settings.ai.min_words ?? 3;
      const maxWords = settings.ai.max_words ?? 20;
  
      try {
          const startPair = await this.getRandomBigramStart(guildId);
          if (!startPair) return null;
          let [prev, curr] = startPair;
          const tokens: string[] = [prev, curr];
          for (let i = 0; i < maxWords - 2; i++) {
              const options = await this.database.getMarkovBigramOptions(guildId, prev, curr);
              if (!options || Object.keys(options).length === 0) break;
              // weighted random
              const next = this.weightedRandomChoiceBigram(options) || '';
              if (this.STOPWORDS.has(next)) break;
              tokens.push(next);
              prev = curr;
              curr = next;
              if (this.isEndWord(next)) break;
          }
          if (tokens.length < minWords) return null;
          // Умная склейка без пробела перед знаками препинания
          let result = '';
          for (let i = 0; i < tokens.length; i++) {
              const t = tokens[i] || '';
              if (i > 0 && !/[.,!?-]/.test(t)) result += ' ';
              result += t;
          }
          return result;
      } catch (error) {
          logger.error('Error generating Markov bigram response:', error);
          return null;
      }
    }
  
    private tokenize(text: string): string[] {
      // 1) Мягкая очистка: убираем упоминания, ссылки, @everyone/@here
      const cleaned = text
        .replace(/<@[!&]?\d+>/g, '')           // упоминания пользователей/ролей
        .replace(/https?:\/\/\S+/gi, '')       // ссылки
        .replace(/@(everyone|here)/gi, '');    // массовые упоминания
  
      // 2) Собираем токены: кастомные эмодзи, Unicode-эмодзи, слова/числа, финальная пунктуация
      const pattern = new RegExp(
        `${this.customEmojiRe.source}|${this.uniEmojiRe.source}|[A-Za-zА-Яа-яЁё0-9]+|[.,!?-]+`,
        'g'
      );
      const tokens = cleaned.match(pattern) ?? [];
  
      // 3) Приводим к нижнему регистру только «слова», эмодзи не трогаем
      return tokens.map(t =>
        (this.customEmojiTokenRe.test(t) || this.uniEmojiTokenRe.test(t)) ? t : t.toLowerCase()
      );
    }

    private weightedRandomChoiceBigram(options: { [next: string]: number }): string {
      const total = Object.values(options).reduce((s, v) => s + v, 0);
      let rand = Math.random() * total;
      for (const next in options) {
          rand -= options[next] ?? 0;
          if (rand <= 0) return next;
      }
      return Object.keys(options)[0] || '';
    }

    private isEndWord(word: string): boolean {
        return /^[.!?]$/.test(word); 
    }
}