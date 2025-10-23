// src/services/moderation/AutoModService.ts
import { EmbedBuilder, PermissionsBitField, TextChannel } from 'discord.js';
import { DiscordBot } from '../../index';
import { SettingsService } from '../settings/SettingsService';
import { containsObsceneWord } from './obscene';

type RateCache = { times: number[]; lastTexts: string[]; warns: number };
const rateMap = new Map<string, RateCache>();

export class AutoModService {
  constructor(
    private bot: DiscordBot,
    private settingsService: SettingsService
  ) {}

  async enforce(message: any): Promise<boolean> {
    if (!message.guild || message.author?.bot) return false;
  
    const settings = await this.settingsService.getGuildSettings(message.guild.id);
    if (!settings.moderation.enabled) return false;
  
    const member = message.member;
    if (member?.permissions?.has?.(PermissionsBitField.Flags.ManageMessages)) return false;
  
    if (settings.moderation.spam_protection) {
      const violated = await this.runSpamGuards(message);
      if (violated) {
        await this.logAutomod(message, 'SpamProtection', violated.reason, violated.penalty);
        return true;
      }
    }
  
    if (settings.moderation.profanity_filter) {
      const bad = this.detectProfanity(message.content ?? '');
      if (bad) {
        await this.safeDelete(message);
        const penalty = await this.warnAndMaybeTimeout(message, 'Profanity');
        await this.logAutomod(message, 'ProfanityFilter', `Слово: ${bad}`, penalty);
        return true;
      }
    }
  
    return false;
  }

  private isInvite(content: string): boolean {
    return /(discord\.gg|discord\.com\/invite)\/[A-Za-z0-9-]+/i.test(content);
  }

  private capsRatio(s: string): number {
    const letters = s.replace(/[^A-Za-zА-ЯЁ]/g, '');
    if (letters.length < 10) return 0;
    const upp = letters.replace(/[^A-ZА-ЯЁ]/g, '').length;
    return upp / letters.length;
  }

  private tooManyMentions(msg: any): boolean {
    const count = (msg.mentions?.users?.size ?? 0) + (msg.mentions?.roles?.size ?? 0);
    return count >= 6;
  }

  private duplicateSpam(cache: RateCache, text: string): boolean {
    cache.lastTexts.push(text);
    if (cache.lastTexts.length > 5) cache.lastTexts.shift();
    return cache.lastTexts.filter(t => t === text).length >= 3;
  }

  private async runSpamGuards(message: any): Promise<{ reason: string; penalty: { action: 'warn'|'timeout'; warns: number; timeoutMs?: number } } | null> {
    const now = Date.now();
    const key = `${message.guild.id}:${message.author.id}`;
    const cache = (rateMap.get(key) ?? { times: [], lastTexts: [], warns: 0 });
    cache.times = cache.times.filter(t => now - t < 7000);
    cache.times.push(now);
    const content = message.content ?? '';
  
    if (this.isInvite(content)) {
      await this.safeDelete(message);
      const penalty = await this.warnAndMaybeTimeout(message, 'InviteLink');
      rateMap.set(key, cache);
      return { reason: 'Инвайт‑ссылка', penalty };
    }
  
    if (this.tooManyMentions(message)) {
      await this.safeDelete(message);
      const penalty = await this.warnAndMaybeTimeout(message, 'MassMentions');
      rateMap.set(key, cache);
      return { reason: 'Массовые упоминания', penalty };
    }
  
    if (this.capsRatio(content) >= 0.7) {
      await this.safeDelete(message);
      const penalty = await this.warnAndMaybeTimeout(message, 'ExcessiveCaps');
      rateMap.set(key, cache);
      return { reason: 'Чрезмерный капс', penalty };
    }
  
    if (cache.times.length >= 6) {
      await this.safeDelete(message);
      const penalty = await this.warnAndMaybeTimeout(message, 'RateFlood');
      rateMap.set(key, cache);
      return { reason: 'Слишком частые сообщения', penalty };
    }
  
    if (this.duplicateSpam(cache, content)) {
      await this.safeDelete(message);
      const penalty = await this.warnAndMaybeTimeout(message, 'DuplicateMessages');
      rateMap.set(key, cache);
      return { reason: 'Повторяющийся текст', penalty };
    }
  
    rateMap.set(key, cache);
    return null;
  }

  private detectProfanity(s: string): string | null {
    const hit = containsObsceneWord(s, true);
    return hit; // '(core)' | '(slur)' или null
  }

  private async warnAndMaybeTimeout(message: any, kind: string): Promise<{ action: 'warn' | 'timeout'; warns: number; timeoutMs?: number }> {
    const key = `${message.guild.id}:${message.author.id}`;
    const cache = (rateMap.get(key) ?? { times: [], lastTexts: [], warns: 0 });
    cache.warns += 1;
    rateMap.set(key, cache);
  
    try {
      await message.channel.send({ content: `<@${message.author.id}> предупреждение (${kind}). (${cache.warns}/3)` });
    } catch {}
  
    if (cache.warns >= 3) {
      const tenMinutes = 10 * 60 * 1000;
      try {
        await message.member?.timeout?.(tenMinutes, `AutoMod: ${kind}`);
      } catch {}
      cache.warns = 0;
      rateMap.set(key, cache);
      return { action: 'timeout', warns: 3, timeoutMs: tenMinutes };
    }
  
    return { action: 'warn', warns: cache.warns };
  }

  private async safeDelete(message: any) {
    try { await message.delete(); } catch {}
  }

  private async logAutomod(
    message: any,
    rule: string,
    details: string,
    penalty?: { action: 'warn'|'timeout'; warns: number; timeoutMs?: number }
  ) {
    try {
      const settings = await this.settingsService.getGuildSettings(message.guild.id);
      const chId = (settings as any).moderation_logs_channel ?? null;
  
      let target: TextChannel | null = message.channel;
      if (chId) {
        const fetched = await message.guild.channels.fetch(chId).catch(() => null);
        if (fetched && fetched.isTextBased()) target = fetched as TextChannel;
      }
  
      const punishment =
        penalty?.action === 'timeout'
          ? `Тайм-аут ${Math.round((penalty.timeoutMs ?? 0) / 60000)} мин`
          : `Предупреждение (${penalty?.warns ?? 1}/3)`;
  
      const embed = new EmbedBuilder()
        .setColor('#FF4444')
        .setTitle('AutoMod')
        .addFields(
          { name: 'Правило', value: rule, inline: true },
          { name: 'Пользователь', value: `<@${message.author.id}>`, inline: true },
          { name: 'Канал', value: `<#${message.channel.id}>`, inline: true },
          { name: 'Наказание', value: punishment, inline: true },
          { name: 'Причина', value: details || '—', inline: true }
        )
        .setTimestamp();
  
      await target?.send({ embeds: [embed] });
    } catch {}
  }
}
