export interface User {
    id: string;
    username: string;
    discriminator?: string;
    level: number;
    xp: number;
    coins: number;
    voice_time: number;
    last_message: Date;
    created_at: Date;
    updated_at: Date;
}

export interface Guild {
    id: string;
    name: string;
    level_multiplier: number;
    voice_multiplier: number;
    markov_enabled: boolean;
    created_at: Date;
    updated_at: Date;
}

export interface MarkovChain {
    id: number;
    guild_id: string;
    word: string;
    next_word: string;
    frequency: number;
    created_at: Date;
}

export interface ShopItem {
    id: number;
    guild_id: string;
    name: string;
    description?: string;
    price: number;
    role_id?: string;
    is_active: boolean;
    created_at: Date;
}

export interface UserPurchase {
    id: number;
    user_id: string;
    guild_id: string;
    item_id: number;
    purchased_at: Date;
}

export interface LevelUpResult {
    levelUp: boolean;
    newLevel?: number;
    coinsEarned?: number;
}

export interface MarkovWord {
    next_word: string;
    frequency: number;
}

export interface BotConfig {
    markovResponseChance: number;
    markovMinWords: number;
    markovMaxWords: number;
    xpPerMessageMin: number;
    xpPerMessageMax: number;
    xpCooldownSeconds: number;
    coinsPerLevel: number;
}
