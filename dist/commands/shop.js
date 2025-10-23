"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.data = void 0;
exports.execute = execute;
const discord_js_1 = require("discord.js");
const SettingsService_1 = require("../services/settings/SettingsService");
exports.data = new discord_js_1.SlashCommandBuilder()
    .setName('shop')
    .setDescription('Внутриигровой магазин')
    .addSubcommand(subcommand => subcommand
    .setName('list')
    .setDescription('Показать доступные товары'))
    .addSubcommand(subcommand => subcommand
    .setName('buy')
    .setDescription('Купить товар')
    .addIntegerOption(option => option
    .setName('item_id')
    .setDescription('ID товара')
    .setRequired(true)))
    .addSubcommand(subcommand => subcommand
    .setName('balance')
    .setDescription('Показать ваш баланс'));
async function execute(interaction, bot) {
    const guildId = interaction.guild.id;
    const settingsService = new SettingsService_1.SettingsService(bot.database, bot.redis);
    const settings = await settingsService.getGuildSettings(guildId);
    if (!settings.economy?.shop_enabled) {
        const embed = new discord_js_1.EmbedBuilder()
            .setColor('#eb4034')
            .setTitle('Ошибка')
            .setDescription('🏪 Магазин отключен')
            .setFooter({ text: 'Внутриигровой магазин неактивен на этом сервере.' });
        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
    }
    const subcommand = interaction.options.getSubcommand();
    switch (subcommand) {
        case 'list':
            await showShop(interaction, bot);
            break;
        case 'buy':
            const itemId = interaction.options.getInteger('item_id', true);
            await buyItem(interaction, bot, itemId);
            break;
        case 'balance':
            await showBalance(interaction, bot);
            break;
    }
}
async function showShop(interaction, bot) {
    await interaction.deferReply();
    try {
        if (!bot.database.ShopItems)
            throw new Error('Database not connected');
        const items = await bot.database.ShopItems.findAll({
            where: {
                guild_id: interaction.guild?.id,
                is_active: true
            },
            order: [['price', 'ASC']],
            raw: true,
        });
        if (items.length === 0) {
            const embed = new discord_js_1.EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('🏪 Магазин')
                .setDescription('В магазине пока нет товаров.');
            await interaction.editReply({ embeds: [embed] });
            return;
        }
        let description = '';
        items.forEach((item) => {
            description += `**${item.id}.** ${item.name} - ${item.price} 🪙\n`;
            if (item.description) {
                description += `   ${item.description}\n`;
            }
            description += '\n';
        });
        const embed = new discord_js_1.EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('🏪 Магазин')
            .setDescription(description)
            .setFooter({ text: 'Используйте /shop buy <id> для покупки' });
        await interaction.editReply({ embeds: [embed] });
    }
    catch (error) {
        console.error('Error showing shop:', error);
        const embed = new discord_js_1.EmbedBuilder()
            .setColor('#eb4034')
            .setTitle('Ошибка')
            .setDescription('❌ Произошла ошибка при загрузке магазина.');
        await interaction.editReply({ embeds: [embed] });
    }
}
async function buyItem(interaction, bot, itemId) {
    await interaction.deferReply();
    try {
        if (!bot.database.ShopItems || !bot.database.User || !bot.database.UserPurchases) {
            throw new Error('Database not connected');
        }
        // Получаем данные товара
        const item = await bot.database.ShopItems.findOne({
            where: {
                id: itemId,
                guild_id: interaction.guild?.id,
                is_active: true
            }
        });
        if (!item) {
            const embed = new discord_js_1.EmbedBuilder()
                .setColor('#eb4034')
                .setTitle('Ошибка')
                .setDescription('❌ Товар не найден.');
            await interaction.editReply({ embeds: [embed] });
            return;
        }
        // Получаем данные пользователя
        const user = await bot.database.getUser(interaction.user.id);
        if (!user) {
            const embed = new discord_js_1.EmbedBuilder()
                .setColor('#eb4034')
                .setTitle('Ошибка')
                .setDescription('❌ Вы не зарегистрированы в системе.');
            await interaction.editReply({ embeds: [embed] });
            return;
        }
        // Проверяем баланс
        if (user.coins < item.price) {
            const embed = new discord_js_1.EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('❌ Недостаточно средств')
                .setDescription(`У вас ${user.coins} 🪙, а нужно ${item.price} 🪙`);
            await interaction.editReply({ embeds: [embed] });
            return;
        }
        // Проверяем, не покупал ли уже
        const existingPurchase = await bot.database.UserPurchases.findOne({
            where: {
                user_id: interaction.user.id,
                item_id: itemId
            }
        });
        if (existingPurchase) {
            const embed = new discord_js_1.EmbedBuilder()
                .setColor('#eb4034')
                .setTitle('Ошибка')
                .setDescription('⚠️ Вы уже покупали этот товар.');
            await interaction.editReply({ embeds: [embed] });
            return;
        }
        // Выполняем покупку - уменьшаем монеты
        await bot.database.User.decrement('coins', {
            by: item.price,
            where: { id: interaction.user.id }
        });
        // Создаем запись о покупке
        await bot.database.UserPurchases.create({
            user_id: interaction.user.id,
            guild_id: interaction.guild?.id || '',
            item_id: itemId,
        });
        // Если это роль, выдаем её
        if (item.role_id) {
            try {
                const member = await interaction.guild?.members.fetch(interaction.user.id);
                const role = await interaction.guild?.roles.fetch(item.role_id);
                if (member && role) {
                    await member.roles.add(role);
                }
            }
            catch (roleError) {
                console.error('Error adding role:', roleError);
            }
        }
        const embed = new discord_js_1.EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('✅ Покупка успешна!')
            .setDescription(`Вы купили **${item.name}** за ${item.price} 🪙`)
            .addFields({
            name: 'Остаток монет:',
            value: `${user.coins - item.price} 🪙`
        });
        await interaction.editReply({ embeds: [embed] });
    }
    catch (error) {
        console.error('Error buying item:', error);
        const embed = new discord_js_1.EmbedBuilder()
            .setColor('#eb4034')
            .setTitle('Ошибка')
            .setDescription('❌ Произошла ошибка при покупке.');
        await interaction.editReply({ embeds: [embed] });
    }
}
async function showBalance(interaction, bot) {
    await interaction.deferReply();
    try {
        const user = await bot.database.getUser(interaction.user.id);
        if (!user) {
            const embed = new discord_js_1.EmbedBuilder()
                .setColor('#eb4034')
                .setTitle('Ошибка')
                .setDescription('❌ Вы не зарегистрированы в системе.');
            await interaction.editReply({ embeds: [embed] });
            return;
        }
        const embed = new discord_js_1.EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('💰 Ваш баланс')
            .setDescription(`У вас **${user.coins}** 🪙`)
            .addFields([
            { name: '📊 Уровень:', value: `${user.level}`, inline: true },
            { name: '⭐ Опыт:', value: `${user.xp} XP`, inline: true }
        ]);
        await interaction.editReply({ embeds: [embed] });
    }
    catch (error) {
        console.error('Error showing balance:', error);
        const embed = new discord_js_1.EmbedBuilder()
            .setColor('#eb4034')
            .setTitle('Ошибка')
            .setDescription('❌ Произошла ошибка при получении баланса.');
        await interaction.editReply({ embeds: [embed] });
    }
}
//# sourceMappingURL=shop.js.map