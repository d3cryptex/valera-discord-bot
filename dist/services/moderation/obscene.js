"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.slursOptionalRu = exports.obsceneTranslit = exports.obsceneEn = exports.obsceneCoreRu = void 0;
exports.unifyHomoglyphs = unifyHomoglyphs;
exports.containsObsceneWord = containsObsceneWord;
exports.obsceneCoreRu = [
    'бля', 'бляд', 'блять', 'блядь', 'бляду', 'блядун', 'блядов', 'блядина',
    'еб', 'ёб', 'ебал', 'ебать', 'ебан', 'ебану', 'ебен', 'ебеня', 'еблан',
    'ебли', 'ебло', 'ебарь', 'ебуч', 'заеб', 'заёб', 'наеб', 'наёб', 'проеб', 'проёб',
    'съеб', 'съёб', 'уебок', 'уёбок', 'перееб', 'доеб', 'доёб', 'въеб', 'въёб', 'выеб',
    'пизд', 'пизда', 'пиздец', 'пиздюк', 'пиздёныш', 'пиздёж', 'пиздеж', 'распизд', 'запизд',
    'опизден', 'припизд', 'впизд', 'отпизд', 'допизд', 'перепизд',
    'хуй', 'хуи', 'хуя', 'хуе', 'хуё', 'хую', 'хуём', 'хуйло', 'хуйня', 'хуйн', 'хуев', 'хуёв',
    'хуесос', 'хуеплет', 'хуеплёт',
    'сука', 'сучк', 'сучара', 'сукин', 'шалава', 'шлюх', 'проститут',
    'говно', 'дерьмо', 'засранец', 'ссанина', 'срать', 'срака', 'обосран', 'обоссан',
    'мразь', 'скотина', 'мудак', 'ублюдок', 'гнида', 'сволочь'
];
exports.obsceneEn = [
    'fuck', 'fucking', 'fucker', 'motherfucker', 'shit', 'bullshit',
    'bitch', 'cunt', 'asshole', 'dick', 'prick'
];
exports.obsceneTranslit = [
    'blya', 'blyad', 'ebat', 'eban', 'eblan', 'pizda', 'pizdecz', 'pizdec',
    'huy', 'hui', 'xuy', 'xyu', 'suka', 'shluha', 'shalava', 'govno', 'dermo'
];
exports.slursOptionalRu = [
    'пидор', 'пидорас', 'гомик'
];
function unifyHomoglyphs(input) {
    return input
        .replace(/[@aA]/g, 'а')
        .replace(/[eE3]/g, 'е')
        .replace(/[oO0]/g, 'о')
        .replace(/[pP]/g, 'р')
        .replace(/[cC]/g, 'с')
        .replace(/[yY]/g, 'у')
        .replace(/[xX]/g, 'х')
        .replace(/[kK]/g, 'к')
        .replace(/[bB]/g, 'в')
        .replace(/[mM]/g, 'м')
        .replace(/[hH]/g, 'н')
        .replace(/[tT]/g, 'т')
        .replace(/ё/g, 'е')
        .replace(/́/g, '')
        .toLowerCase();
}
function escapeRe(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function buildFuzzyWordRe(word) {
    const letters = [...word].map(escapeRe);
    const sep = '[^\\p{L}\\p{N}]{0,2}';
    return new RegExp(letters.join(sep), 'iu');
}
function buildFuzzyWordReFallback(word) {
    const letters = [...word].map(escapeRe);
    const sep = '[^A-Za-zА-Яа-яЁё0-9]{0,2}';
    return new RegExp(letters.join(sep), 'iu');
}
let useFallback = false;
try {
    void new RegExp('\\p{L}', 'u');
}
catch {
    useFallback = true;
}
const compile = (w) => (useFallback ? buildFuzzyWordReFallback(w) : buildFuzzyWordRe(w));
const corePatterns = [...exports.obsceneCoreRu, ...exports.obsceneEn, ...exports.obsceneTranslit].map(compile);
const slurPatterns = exports.slursOptionalRu.map(compile);
function containsObsceneWord(text, includeSlurs = false) {
    const norm = unifyHomoglyphs(text);
    for (const w of corePatterns)
        if (w.test(norm))
            return '(core)';
    if (includeSlurs)
        for (const w of slurPatterns)
            if (w.test(norm))
                return '(slur)';
    return null;
}
//# sourceMappingURL=obscene.js.map