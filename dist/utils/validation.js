"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.markovContentSchema = exports.shopItemSchema = exports.guildSchema = exports.userSchema = void 0;
exports.validateUser = validateUser;
exports.validateGuild = validateGuild;
exports.validateShopItem = validateShopItem;
exports.validateMarkovContent = validateMarkovContent;
const joi_1 = __importDefault(require("joi"));
exports.userSchema = joi_1.default.object({
    id: joi_1.default.string().pattern(/^\d{17,19}$/).required(),
    username: joi_1.default.string().min(1).max(32).required(),
    discriminator: joi_1.default.string().pattern(/^\d{4}$/).optional()
});
exports.guildSchema = joi_1.default.object({
    id: joi_1.default.string().pattern(/^\d{17,19}$/).required(),
    name: joi_1.default.string().min(1).max(100).required()
});
exports.shopItemSchema = joi_1.default.object({
    name: joi_1.default.string().min(1).max(100).required(),
    description: joi_1.default.string().max(500).optional(),
    price: joi_1.default.number().integer().min(1).max(1000000).required(),
    role_id: joi_1.default.string().pattern(/^\d{17,19}$/).optional()
});
exports.markovContentSchema = joi_1.default.object({
    content: joi_1.default.string().min(10).max(2000).required(),
    guild_id: joi_1.default.string().pattern(/^\d{17,19}$/).required()
});
function validateUser(data) {
    return exports.userSchema.validate(data);
}
function validateGuild(data) {
    return exports.guildSchema.validate(data);
}
function validateShopItem(data) {
    return exports.shopItemSchema.validate(data);
}
function validateMarkovContent(data) {
    return exports.markovContentSchema.validate(data);
}
//# sourceMappingURL=validation.js.map