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
    { pattern: /реально|real|реал/i, emoji: '🤔' }, 
    { pattern: /бог|аллах|holy|godlike|свят/i, emoji: '🙏' },
    { pattern: /кринж|cringe|зашквар|стыд|стыдно|нулевый/i, emoji: '🫠' },
    { pattern: /чел|bro|бро|эй/i, emoji: '🧑' },
    { pattern: /капец|жесть|треш|omg|ужас|капец|fml|wtf|omg/i, emoji: '😱' },
    { pattern: /слаб|fail|лох|слабак|noob|нуб/i, emoji: '🥲' },
    { pattern: /(?:бл[я*]+|су[ккч]+|хер|пид[аое]+|гандон|долб|мудак|еба+|fuc?k|bitch|shit|asshole|хуй|соси|идиот)/i, emoji: '🚫' },
    { pattern: /думаю|мысль|идея|suggest|предлагаю/i, emoji: '💡' },
    { pattern: /вопрос|кто|что|зачем|почему|какой|зачем|как|\?$/i, emoji: '❓' },
    { pattern: /ответ|ок|ok|ага|понял|ясно|договорились|пон/i, emoji: '👌' },
    { pattern: /ждать|жди|ожидание|позже|подожди|wait/i, emoji: '⏳' },
    { pattern: /да+|yes|угу/i, emoji: '✅' },
    { pattern: /нет+|неа|no+|never/i, emoji: '❌' },
    { pattern: /пока|bye|до встречи|goodbye|увидим|до свидания|счастливо|bb|bye bye/i, emoji: '👋' },
    { pattern: /мем|шутка|joke|mem|ржомба/i, emoji: '😏' },
    { pattern: /очу+мел|воу|офигеть|охренеть|серьёзно|жесть|wild/i, emoji: '🧐' },
    { pattern: /бот|bot|искусственный интеллект|ai|chatgpt/i, emoji: '🤖' },
];

export class MarkovService {
    private database: DatabaseService;
    private settingsService: SettingsService;
    private readonly customEmojiRe = /<a?:\w{2,}:\d{17,20}>/g;                 
    private readonly customEmojiTokenRe = /^<a?:\w{2,}:\d{17,20}>$/;           
    private readonly uniEmojiRe = emojiRegex();                                
    private readonly uniEmojiTokenRe = new RegExp(`^(?:${emojiRegex().source})$`); 

    private readonly MAX_MARKOV_RECORDS = 10000; 
    private readonly CLEANUP_BATCH_SIZE = 1000;  

    constructor(database: DatabaseService, settingsService: SettingsService) {
        this.database = database;
        this.settingsService = settingsService;
    }

    private async cleanupOldMarkovData(guildId: string): Promise<void> {
      try {
          const count = await this.database.countMarkovBigrams(guildId);
          
          if (count > this.MAX_MARKOV_RECORDS) {
              const toDelete = count - this.MAX_MARKOV_RECORDS + this.CLEANUP_BATCH_SIZE;
              await this.database.deleteOldestMarkovBigrams(guildId, toDelete);
              logger.info(`Очищено ${toDelete} старых Markov записей для guild ${guildId}`);
          }
      } catch (error) {
          logger.error('Ошибка очистки старых Markov данных:', error);
      }
    }

    private wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, font: string): string[] {
      ctx.font = font;

      const cleanText = this.cleanTextForCanvas(text);
      const words: string[] = cleanText.split(' ').filter(Boolean);
      let lines: string[] = [];
      let currentLine: string = words.length > 0 ? words[0]! : '';
      
      for (let i = 1; i < words.length; i++) {
          const word: string = words[i] || '';
          const testLine = currentLine + ' ' + word;
          const width = ctx.measureText(testLine).width;
          
          if (width < maxWidth) {
              currentLine = testLine;
          } else {
              lines.push(currentLine);
              currentLine = word;
          }
      }
      
      if (currentLine !== '') lines.push(currentLine);
      return lines;
    }

    private cleanTextForCanvas(text: string): string {
      return text
          .replace(this.customEmojiRe, '') 
          .replace(this.uniEmojiRe, '')    
          .replace(/\s+/g, ' ')          
          .trim();
    }

    private fitFontSize(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, baseSize: number, fontFamily: string, minSize: number = 14): number {
      let fontSize = baseSize;
      const cleanText = this.cleanTextForCanvas(text);
      
      ctx.font = `bold ${fontSize}px ${fontFamily}`;
      if (ctx.measureText(cleanText).width <= maxWidth) return fontSize;
      
      while (fontSize > minSize) {
          ctx.font = `bold ${fontSize}px ${fontFamily}`;
          if (ctx.measureText(cleanText).width <= maxWidth) break;
          fontSize -= 2;
      }
      return Math.max(fontSize, minSize);
    }

    private async safeLoadImage(imagePath: string): Promise<any | null> {
      try {
          if (!fs.existsSync(imagePath)) {
              logger.warn(`Файл изображения не найден: ${imagePath}`);
              return null;
          }

          const ext = path.extname(imagePath).toLowerCase();
          const supportedFormats = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
          
          if (!supportedFormats.includes(ext)) {
              logger.warn(`Неподдерживаемый формат изображения: ${imagePath}`);
              return null;
          }

          return await loadImage(imagePath);
      } catch (error) {
          logger.error(`Ошибка загрузки изображения ${imagePath}:`, error);
          return null;
      }
    }

    async makeMultiImageMeme(imagePaths: string[], topText: string, bottomText: string): Promise<Buffer> {
      const validPaths = imagePaths.filter(p => p && typeof p === 'string' && fs.existsSync(p));
      if (!validPaths.length) throw new Error('Нет валидных изображений для мема');

      const imagePromises = validPaths.map(p => this.safeLoadImage(p));
      const loadedImages = await Promise.all(imagePromises);
      const images = loadedImages.filter(img => img !== null);

      if (!images.length) throw new Error('Не удалось загрузить ни одного изображения');

      const width = images.reduce((sum: number, img: any) => sum + img.width, 0);
      const height = Math.max(...images.map((img: any) => img.height));
      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext('2d');

      let x = 0;
      for (const img of images) {
          ctx.drawImage(img, x, 0);
          x += img.width;
      }

      const cleanTopText = this.cleanTextForCanvas(topText);
      const cleanBottomText = this.cleanTextForCanvas(bottomText);
  
      // -- Top Text --
      const fontFamily = 'Impact';
      const maxTextWidth = width * 0.85; // Немного уменьшаем для отступов
      const topFontSize = this.fitFontSize(ctx, cleanTopText, maxTextWidth, Math.min(50, width * 0.1), fontFamily, 14);
      const topLines = this.wrapText(ctx, cleanTopText, maxTextWidth, `bold ${topFontSize}px ${fontFamily}`);
      
      let topY = topFontSize + 20;
      ctx.textAlign = 'center';
      ctx.strokeStyle = 'black';
      ctx.fillStyle = 'white';
      ctx.lineWidth = Math.max(2, topFontSize / 12);

      for (const line of topLines) {
          ctx.font = `bold ${topFontSize}px ${fontFamily}`;
          ctx.strokeText(line, width / 2, topY);
          ctx.fillText(line, width / 2, topY);
          topY += topFontSize + 5;
      }
  
      // -- Bottom Text --
      const bottomFontSize = this.fitFontSize(ctx, cleanBottomText, maxTextWidth, Math.min(50, width * 0.1), fontFamily, 14);
      const bottomLines = this.wrapText(ctx, cleanBottomText, maxTextWidth, `bold ${bottomFontSize}px ${fontFamily}`);
      
      let bottomY = height - (bottomLines.length * (bottomFontSize + 5)) - 20;
      ctx.lineWidth = Math.max(2, bottomFontSize / 12);

      for (const line of bottomLines) {
        ctx.font = `bold ${bottomFontSize}px ${fontFamily}`;
        ctx.strokeText(line, width / 2, bottomY);
        ctx.fillText(line, width / 2, bottomY);
        bottomY += bottomFontSize + 5;
      }
  
      return canvas.toBuffer();
    }

    async makeOverlayMeme(mainPath: string, overlayPaths: string[], topText: string, bottomText: string): Promise<Buffer> {
      const mainImg = await this.safeLoadImage(mainPath);
      if (!mainImg) throw new Error('Главное изображение не загружено: ' + mainPath);

      const canvas = createCanvas(mainImg.width, mainImg.height);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(mainImg, 0, 0);

      const overlaySize = Math.floor(mainImg.width * 0.3); 
      let overlayY = Math.floor(mainImg.height * 0.1);
        
      for (const path of overlayPaths) {
          const overlay = await this.safeLoadImage(path);
          if (overlay) {
              const overlayX = Math.floor(mainImg.width * 0.65);
              ctx.drawImage(overlay, overlayX, overlayY, overlaySize, overlaySize);
              overlayY += Math.floor(overlaySize * 1.1);
          }
      }

      const cleanTopText = this.cleanTextForCanvas(topText);
      const cleanBottomText = this.cleanTextForCanvas(bottomText);

      const fontSize = Math.floor(mainImg.height * 0.08);
      ctx.font = `bold ${fontSize}px Impact`;
      ctx.fillStyle = 'white';
      ctx.strokeStyle = 'black';
      ctx.textAlign = 'center';
      ctx.lineWidth = Math.max(2, fontSize / 10);

      // Top Text
      const topY = Math.floor(mainImg.height * 0.12);
      ctx.strokeText(cleanTopText.toUpperCase(), mainImg.width / 2, topY);
      ctx.fillText(cleanTopText.toUpperCase(), mainImg.width / 2, topY);

      // Bottom Text
      const bottomY = mainImg.height - Math.floor(mainImg.height * 0.08);
      ctx.strokeText(cleanBottomText.toUpperCase(), mainImg.width / 2, bottomY);
      ctx.fillText(cleanBottomText.toUpperCase(), mainImg.width / 2, bottomY);

      return canvas.toBuffer();
    }

    async sendAIReply(message: Message, aiText: string): Promise<void> {
      try {
        const canSend = message.channel && message.channel.isTextBased() && message.channel.isSendable();
        const r = Math.random();
    
        if (!message.guildId) return;
    
        if (canSend && r < 0.05) { // 5%
          const gifUrl = await this.database.getRandomGif(message.guildId);
          if (gifUrl) {
              await message.channel.send({ content: gifUrl });
              return;
          }
        }
    
        if (canSend && r < 0.08) { // 8%
          const imagePaths = await this.database.getRandomImage(message.guildId, 1)
              .then(arr => arr.filter(p => !p.toLowerCase().endsWith('.gif')));

          if (imagePaths.length > 0) {
              try {
                  const topText = (await this.generateResponse(message.guildId, message.channelId)) || 'AI MEME!';
                  const bottomText = (await this.generateResponse(message.guildId, message.channelId)) || '';
                  const buffer = await this.makeMultiImageMeme(imagePaths, topText, bottomText);
                  const attachment = new AttachmentBuilder(buffer, { name: 'meme.png' });
                  await message.channel.send({ files: [attachment] });
                  return;
              } catch (error) {
                  logger.error('Ошибка создания мема:', error);
              }
          }
        }

        if (canSend && r < 0.02) { // 2% 
          const count = Math.floor(Math.random() * 2) + 2; 
          const imagePaths = await this.database.getRandomImage(message.guildId, count)
              .then(arr => arr.filter(p => !p.toLowerCase().endsWith('.gif')));

          if (imagePaths.length >= 2) {
              try {
                  const overlayChance = 0.15; // 15%
                  if (Math.random() < overlayChance) {
                      const [mainPath, ...overlays] = imagePaths;
                      const topText = (await this.generateResponse(message.guildId, message.channelId)) || '';
                      const bottomText = (await this.generateResponse(message.guildId, message.channelId)) || '';
                      const buffer = await this.makeOverlayMeme(mainPath!, overlays, topText, bottomText);
                      const attachment = new AttachmentBuilder(buffer, { name: 'meme_overlay.png' });
                      await message.channel.send({ files: [attachment] });
                      return;
                  } else {
                      const topText = (await this.generateResponse(message.guildId, message.channelId)) || '';
                      const bottomText = (await this.generateResponse(message.guildId, message.channelId)) || '';
                      const buffer = await this.makeMultiImageMeme(imagePaths, topText, bottomText);
                      const attachment = new AttachmentBuilder(buffer, { name: 'meme.png' });
                      await message.channel.send({ files: [attachment] });
                      return;
                  }
              } catch (error) {
                  logger.error('Ошибка создания мультимема:', error);
              }
          }
        }
    
        // --- Обычный текстовый ответ AI ---
        if (r < 0.35 && canSend) { // 35%
            await message.reply({
              content: aiText,
              allowedMentions: { repliedUser: true }
            });
            if (r < 0.15) await this.reactToMessageSmart(message); // 15%
        } else if (r < 0.65 && canSend) { // 65%
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
      
          const found = emotionRules.find(r => r.pattern.test(msg));
          if (found) {
            await this.safeReact(message, found.emoji);
            
            // Дополнительные реакции
            if (/ахах|лол|haha|rжу|funny/i.test(msg)) {
                await this.safeReact(message, '😂');
            }
            if (/кринж|cringe/i.test(msg)) {
                await this.safeReact(message, '🤦‍♂️');
            }
            if (/топ|лучше|класс|топчик|побед/i.test(msg)) {
                await this.safeReact(message, '🥇');
            }
            if (found.emoji === '🚫') {
                await this.safeReact(message, '😶');
            }
            return;
          }
      
          const userEmojis = msg.match(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu) || [];
          if (userEmojis.length > 0 && userEmojis[0]) {
              await this.safeReact(message, userEmojis[0]);
              return;
          }

          let pos = 0, neg = 0;
          if (/(супер|молодец|отлично|удачно|мило|клево|good|nice|amazing|great|happy|изи|gj)/i.test(msg)) pos++;
          if (/(бред|дефект|ошибка|fail|фейл|печаль|грусть|trouble|bad|poor|слабо|печально|жесть|капец|wtf)/i.test(msg)) neg++;
          
          if (pos > neg) await this.safeReact(message, '😃');
          else if (neg > pos) await this.safeReact(message, '😢');
          else await this.safeReact(message, '🤔');
        } catch (error) {
          logger.error('reactToMessageSmart error:', error);
        }
    }

    private async safeReact(message: Message, emoji: string): Promise<void> {
      try {
          await message.react(emoji);
      } catch (error: any) {
          if (error.code === 10014) { 
              logger.warn(`Неизвестный emoji: ${emoji}`);
          } else {
              logger.error('Ошибка реакции:', error);
          }
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
              await this.database.addMarkovBigram(guildId, prev, curr, next); 
          }
          
          await this.cleanupOldMarkovData(guildId);

          logger.debug(`Trained Markov bigram chain with ${tokens.length} tokens from guild ${guildId}`);
      } catch (error) {
          logger.error('Error training Markov bigram chain:', error);
      }
    }

    private async getRandomBigramStart(guildId: string): Promise<[string, string] | null> {
      const candidates: [string, string][] = await this.database.getBigramStartCandidates(guildId);
      const filtered = candidates.filter(([prev, curr]: [string, string]) =>
          !this.STOPWORDS.has(curr) && !this.STOPWORDS.has(prev)
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

              const next = this.weightedRandomChoiceBigram(options) || '';
              if (this.STOPWORDS.has(next)) break;
              tokens.push(next);
              prev = curr;
              curr = next;
              if (this.isEndWord(next)) break;
          }

          if (tokens.length < minWords) return null;

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
      const cleaned = text
        .replace(/<@[!&]?\d+>/g, '')           
        .replace(/https?:\/\/\S+/gi, '')       
        .replace(/@(everyone|here)/gi, '');    
  
      const pattern = new RegExp(
        `${this.customEmojiRe.source}|${this.uniEmojiRe.source}|[A-Za-zА-Яа-яЁё0-9]+|[.,!?-]+`,
        'g'
      );
      const tokens = cleaned.match(pattern) ?? [];
  
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