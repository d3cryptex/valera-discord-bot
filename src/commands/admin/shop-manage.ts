import { 
    SlashCommandBuilder, 
    ChatInputCommandInteraction, 
    EmbedBuilder, 
    PermissionFlagsBits 
} from 'discord.js';
import { DiscordBot } from '../../index';
import { SettingsService } from '../../services/settings/SettingsService';

export const data = new SlashCommandBuilder()
    .setName('shop-manage')
    .setDescription('Управление магазином (только для администраторов)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(subcommand =>
        subcommand
            .setName('add')
            .setDescription('Добавить товар в магазин')
            .addStringOption(option =>
                option
                    .setName('name')
                    .setDescription('Название товара')
                    .setRequired(true)
            )
            .addIntegerOption(option =>
                option
                    .setName('price')
                    .setDescription('Цена товара в монетах')
                    .setRequired(true)
                    .setMinValue(1)
                    .setMaxValue(1000000)
            )
            .addStringOption(option =>
                option
                    .setName('description')
                    .setDescription('Описание товара')
                    .setRequired(false)
            )
            .addRoleOption(option =>
                option
                    .setName('role')
                    .setDescription('Роль, которая будет выдана при покупке')
                    .setRequired(false)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('remove')
            .setDescription('Удалить товар из магазина')
            .addIntegerOption(option =>
                option
                    .setName('item_id')
                    .setDescription('ID товара для удаления')
                    .setRequired(true)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('list')
            .setDescription('Список всех товаров (включая неактивные)')
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('toggle')
            .setDescription('Включить/выключить товар')
            .addIntegerOption(option =>
                option
                    .setName('item_id')
                    .setDescription('ID товара')
                    .setRequired(true)
            )
    );

export async function execute(interaction: ChatInputCommandInteraction, bot: DiscordBot) {
    const settingsService = new SettingsService(bot.database, bot.redis);
    const settings = await settingsService.getGuildSettings(interaction.guild!.id);
    
    const hasPermission = await settingsService.hasPermission(interaction.member as any, settings);
    if (!hasPermission) {
        await interaction.reply({ 
            content: '❌ У вас нет прав для управления магазином.', 
            ephemeral: true 
        });
        return;
    }

    if (!settings.economy.shop_enabled) {
        const embed = new EmbedBuilder()
            .setColor('#eb4034')
            .setTitle('Ошибка')
            .setDescription('❌ Магазин выключен на этом сервере.')
        await interaction.editReply({ embeds: [embed]});
        return;
    }

    const subcommand = interaction.options.getSubcommand();
    
    switch (subcommand) {
        case 'add':
            await addShopItem(interaction, bot);
            break;
        case 'remove':
            await removeShopItem(interaction, bot);
            break;
        case 'list':
            await listAllShopItems(interaction, bot);
            break;
        case 'toggle':
            await toggleShopItem(interaction, bot);
            break;
    }
}

async function addShopItem(interaction: ChatInputCommandInteraction, bot: DiscordBot) {
    await interaction.deferReply({ ephemeral: true });
    
    const name = interaction.options.getString('name', true);
    const price = interaction.options.getInteger('price', true);
    const description = interaction.options.getString('description') || null;
    const role = interaction.options.getRole('role');
    
    try {
        if (!bot.database.ShopItems) throw new Error('Database not connected');

        const item = await bot.database.ShopItems.create({
            guild_id: interaction.guild!.id,
            name,
            description,
            price,
            role_id: role?.id || null,
            is_active: true,
        });
        
        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('✅ Товар добавлен')
            .setDescription(`Товар **${name}** успешно добавлен в магазин!`)
            .addFields([
                { name: 'ID:', value: item.id.toString(), inline: true },
                { name: 'Цена:', value: `${price} 🪙`, inline: true },
                { name: 'Роль:', value: role ? `${role}` : 'Нет', inline: true }
            ]);
        
        if (description) {
            embed.addFields({ name: 'Описание:', value: description });
        }
        
        await interaction.editReply({ embeds: [embed] });
        
    } catch (error) {
        console.error('Error adding shop item:', error);
        await interaction.editReply({ content: 'Произошла ошибка при добавлении товара.' });
    }
}

async function removeShopItem(interaction: ChatInputCommandInteraction, bot: DiscordBot) {
    await interaction.deferReply({ ephemeral: true });
    
    const itemId = interaction.options.getInteger('item_id', true);
    
    try {
        if (!bot.database.ShopItems) throw new Error('Database not connected');

        const item = await bot.database.ShopItems.findOne({
            where: { 
                id: itemId, 
                guild_id: interaction.guild!.id 
            }
        });
        
        if (!item) {
            await interaction.editReply({ content: '❌ Товар с таким ID не найден.' });
            return;
        }
        
        const itemName = item.name;
        await item.destroy();
        
        const embed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('🗑️ Товар удален')
            .setDescription(`Товар **${itemName}** был удален из магазина.`);
        
        await interaction.editReply({ embeds: [embed] });
        
    } catch (error) {
        console.error('Error removing shop item:', error);
        await interaction.editReply({ content: 'Произошла ошибка при удалении товара.' });
    }
}

async function listAllShopItems(interaction: ChatInputCommandInteraction, bot: DiscordBot) {
    await interaction.deferReply({ ephemeral: true });
    
    try {
        if (!bot.database.ShopItems) throw new Error('Database not connected');

        const items = await bot.database.ShopItems.findAll({
            where: { guild_id: interaction.guild!.id },
            order: [
                ['is_active', 'DESC'],
                ['price', 'ASC']
            ],
            raw: true,
        });
        
        if (items.length === 0) {
            await interaction.editReply({ content: 'Магазин пуст.' });
            return;
        }
        
        let description = '';
        items.forEach((item: any) => {
            const status = item.is_active ? '✅' : '❌';
            description += `${status} **${item.id}.** ${item.name} - ${item.price} 🪙\n`;
            if (item.description) {
                description += `   ${item.description}\n`;
            }
            if (item.role_id) {
                description += `   Роль: <@&${item.role_id}>\n`;
            }
            description += '\n';
        });
        
        const embed = new EmbedBuilder()
            .setColor('#0099FF')
            .setTitle('🏪 Все товары магазина')
            .setDescription(description)
            .setFooter({ text: '✅ = активен, ❌ = отключен' });
        
        await interaction.editReply({ embeds: [embed] });
        
    } catch (error) {
        console.error('Error listing shop items:', error);
        await interaction.editReply({ content: 'Произошла ошибка при получении списка товаров.' });
    }
}

async function toggleShopItem(interaction: ChatInputCommandInteraction, bot: DiscordBot) {
    await interaction.deferReply({ ephemeral: true });
    
    const itemId = interaction.options.getInteger('item_id', true);
    
    try {
        if (!bot.database.ShopItems) throw new Error('Database not connected');

        const item = await bot.database.ShopItems.findOne({
            where: { 
                id: itemId, 
                guild_id: interaction.guild!.id 
            }
        });
        
        if (!item) {
            await interaction.editReply({ content: '❌ Товар с таким ID не найден.' });
            return;
        }
        
        const newStatus = !item.is_active;
        await item.update({ is_active: newStatus });
        
        const embed = new EmbedBuilder()
            .setColor(newStatus ? '#00FF00' : '#FF0000')
            .setTitle(`${newStatus ? '✅' : '❌'} Статус товара изменен`)
            .setDescription(`Товар **${item.name}** теперь ${newStatus ? 'активен' : 'отключен'}.`);
        
        await interaction.editReply({ embeds: [embed] });
        
    } catch (error) {
        console.error('Error toggling shop item:', error);
        await interaction.editReply({ content: 'Произошла ошибка при изменении статуса товара.' });
    }
}