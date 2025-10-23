"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateLevelFromXP = calculateLevelFromXP;
exports.calculateXPForLevel = calculateXPForLevel;
exports.getXPForNextLevel = getXPForNextLevel;
exports.getProgressToNextLevel = getProgressToNextLevel;
exports.createProgressBar = createProgressBar;
exports.formatTime = formatTime;
exports.formatNumber = formatNumber;
exports.getRandomInt = getRandomInt;
exports.getRandomElement = getRandomElement;
exports.createErrorEmbed = createErrorEmbed;
exports.createSuccessEmbed = createSuccessEmbed;
exports.createInfoEmbed = createInfoEmbed;
exports.sanitizeText = sanitizeText;
exports.isSpam = isSpam;
exports.isUserAdmin = isUserAdmin;
const discord_js_1 = require("discord.js");
function calculateLevelFromXP(xp) {
    return Math.floor(Math.sqrt(xp / 100)) + 1;
}
function calculateXPForLevel(level) {
    return Math.pow(level - 1, 2) * 100;
}
function getXPForNextLevel(currentLevel) {
    return calculateXPForLevel(currentLevel + 1);
}
function getProgressToNextLevel(user) {
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
function createProgressBar(percentage, length = 20) {
    const filled = Math.floor((percentage / 100) * length);
    const empty = length - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
}
function formatTime(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (days > 0)
        return `${days}д ${hours % 24}ч`;
    if (hours > 0)
        return `${hours}ч ${minutes % 60}м`;
    if (minutes > 0)
        return `${minutes}м`;
    return `${seconds}с`;
}
function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    }
    else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
function getRandomElement(array) {
    if (array.length === 0)
        return undefined;
    return array[Math.floor(Math.random() * array.length)];
}
function createErrorEmbed(title, description) {
    return new discord_js_1.EmbedBuilder()
        .setColor('#FF0000')
        .setTitle(`❌ ${title}`)
        .setDescription(description)
        .setTimestamp();
}
function createSuccessEmbed(title, description) {
    return new discord_js_1.EmbedBuilder()
        .setColor('#00FF00')
        .setTitle(`✅ ${title}`)
        .setDescription(description)
        .setTimestamp();
}
function createInfoEmbed(title, description) {
    return new discord_js_1.EmbedBuilder()
        .setColor('#0099FF')
        .setTitle(`ℹ️ ${title}`)
        .setDescription(description)
        .setTimestamp();
}
// Фильтр для очистки текста от нежелательных символов
function sanitizeText(text) {
    return text
        .replace(/[^\w\s\.,!?;:-]/g, '') // Оставляем только безопасные символы
        .replace(/\s+/g, ' ') // Убираем лишние пробелы
        .trim();
}
// Проверка на спам
function isSpam(text) {
    const spamPatterns = [
        /(.)\1{4,}/g, // Повторяющиеся символы (ааааа)
        /[A-Z]{5,}/g, // Много заглавных букв
        /discord\.gg\/\w+/gi, // Приглашения Discord
        /bit\.ly\/\w+/gi, // Сокращенные ссылки
    ];
    return spamPatterns.some(pattern => pattern.test(text));
}
function isUserAdmin(interaction, admin) {
    if (admin.users.includes(interaction.user.id))
        return true;
    // Проверка по ролям
    let memberRoles = [];
    // Для современных версий discord.js
    if (interaction.member && 'roles' in interaction.member && interaction.member.roles instanceof discord_js_1.GuildMemberRoleManager) {
        memberRoles = Array.from(interaction.member.roles.cache.keys());
    }
    // Для нестандартных/legacy случаев
    else if (interaction.member && Array.isArray(interaction.member.roles)) {
        memberRoles = interaction.member.roles;
    }
    if (memberRoles.some((rid) => admin.roles.includes(rid)))
        return true;
    return false;
}
//# sourceMappingURL=helpers.js.map