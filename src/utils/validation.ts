import Joi from 'joi';

export const userSchema = Joi.object({
    id: Joi.string().pattern(/^\d{17,19}$/).required(),
    username: Joi.string().min(1).max(32).required(),
    discriminator: Joi.string().pattern(/^\d{4}$/).optional()
});

export const guildSchema = Joi.object({
    id: Joi.string().pattern(/^\d{17,19}$/).required(),
    name: Joi.string().min(1).max(100).required()
});

export const shopItemSchema = Joi.object({
    name: Joi.string().min(1).max(100).required(),
    description: Joi.string().max(500).optional(),
    price: Joi.number().integer().min(1).max(1000000).required(),
    role_id: Joi.string().pattern(/^\d{17,19}$/).optional()
});

export const markovContentSchema = Joi.object({
    content: Joi.string().min(10).max(2000).required(),
    guild_id: Joi.string().pattern(/^\d{17,19}$/).required()
});

export function validateUser(data: any) {
    return userSchema.validate(data);
}

export function validateGuild(data: any) {
    return guildSchema.validate(data);
}

export function validateShopItem(data: any) {
    return shopItemSchema.validate(data);
}

export function validateMarkovContent(data: any) {
    return markovContentSchema.validate(data);
}