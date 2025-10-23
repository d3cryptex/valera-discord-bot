import { User } from '../types/types';
import { EmbedBuilder, ChatInputCommandInteraction, GuildMemberRoleManager } from 'discord.js';

export function calculateLevelFromXP(xp: number): number {
    return Math.floor(Math.sqrt(xp / 100)) + 1;
}

export function calculateXPForLevel(level: number): number {
    return Math.pow(level - 1, 2) * 100;
}

export function getXPForNextLevel(currentLevel: number): number {
    return calculateXPForLevel(currentLevel + 1);
}

export function getProgressToNextLevel(user: User): {
    current: number;
    needed: number;
    percentage: number;
} {
    const currentLevelXP = calculateXPForLevel(user.level);
    const nextLevelXP = calculateXPForLevel(user.level + 1);
    const progressXP = user.xp - currentLevelXP;
    const neededXP = nextLevelXP - currentLevelXP;
    const percentage = Math.floor((progressXP / neededXP) * 100);

    return {
        current: progressXP,
        needed: neededXP,
        percentage: Math.max(0, Math.min(100, percentage))
    };
}

export function createProgressBar(percentage: number, length: number = 20): string {
    const filled = Math.floor((percentage / 100) * length);
    const empty = length - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
}

export function formatTime(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}д ${hours % 24}ч`;
    if (hours > 0) return `${hours}ч ${minutes % 60}м`;
    if (minutes > 0) return `${minutes}м`;
    return `${seconds}с`;
}

export function formatNumber(num: number): string {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}

export function getRandomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function getRandomElement<T>(array: T[]): T | undefined {
    if (array.length === 0) return undefined;
    return array[Math.floor(Math.random() * array.length)];
}

export function createErrorEmbed(title: string, description: string): EmbedBuilder {
    return new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle(`❌ ${title}`)
        .setDescription(description)
        .setTimestamp();
}

export function createSuccessEmbed(title: string, description: string): EmbedBuilder {
    return new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle(`✅ ${title}`)
        .setDescription(description)
        .setTimestamp();
}

export function createInfoEmbed(title: string, description: string): EmbedBuilder {
    return new EmbedBuilder()
        .setColor('#0099FF')
        .setTitle(`ℹ️ ${title}`)
        .setDescription(description)
        .setTimestamp();
}

// Фильтр для очистки текста от нежелательных символов
export function sanitizeText(text: string): string {
    return text
        .replace(/[^\w\s\.,!?;:-]/g, '') // Оставляем только безопасные символы
        .replace(/\s+/g, ' ') // Убираем лишние пробелы
        .trim();
}

// Проверка на спам
export function isSpam(text: string): boolean {
    const spamPatterns = [
        /(.)\1{4,}/g, // Повторяющиеся символы (ааааа)
        /[A-Z]{5,}/g, // Много заглавных букв
        /discord\.gg\/\w+/gi, // Приглашения Discord
        /bit\.ly\/\w+/gi, // Сокращенные ссылки
    ];

    return spamPatterns.some(pattern => pattern.test(text));
}

export interface AdminConfig {
    users: string[];
    roles: string[];
}

export function isUserAdmin(interaction: ChatInputCommandInteraction, admin: AdminConfig): boolean {
    if (admin.users.includes(interaction.user.id)) return true;
  
    // Проверка по ролям
    let memberRoles: string[] = [];
    // Для современных версий discord.js
    if (interaction.member && 'roles' in interaction.member && interaction.member.roles instanceof GuildMemberRoleManager) {
      memberRoles = Array.from(interaction.member.roles.cache.keys());
    }
    // Для нестандартных/legacy случаев
    else if (interaction.member && Array.isArray(interaction.member.roles)) {
      memberRoles = interaction.member.roles as string[];
    }
  
    if (memberRoles.some((rid: string) => admin.roles.includes(rid))) return true;
    return false;
}