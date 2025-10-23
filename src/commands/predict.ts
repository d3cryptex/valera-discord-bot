import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, ColorResolvable } from 'discord.js';

export const data = new SlashCommandBuilder()
    .setName('predict')
    .setDescription('Гадание и предсказания')
    .addSubcommand(subcommand =>
        subcommand
            .setName('yesno')
            .setDescription('Ответ да или нет на вопрос')
            .addStringOption(option => 
                option
                    .setName('question')
                    .setDescription('Ваш вопрос')
                    .setRequired(true)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('percentage')
            .setDescription('Процентная совместимость или вероятность')
            .addStringOption(option => 
                option
                    .setName('query')
                    .setDescription('Что измерить в процентах?')
                    .setRequired(true)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('fortune')
            .setDescription('Случайное предсказание')
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();
    
    switch (subcommand) {
        case 'yesno':
            await handleYesNo(interaction);
            break;
        case 'percentage':
            await handlePercentage(interaction);
            break;
        case 'fortune':
            await handleFortune(interaction);
            break;
    }
}

async function handleYesNo(interaction: ChatInputCommandInteraction) {
    const question = interaction.options.getString('question', true);
    
    await interaction.deferReply();
    
    // Эмуляция "думающего" бота
    const thinkingEmbed = new EmbedBuilder()
        .setColor('#FFFF00')
        .setTitle('🔮 Гадание')
        .setDescription('Смотрю в хрустальный шар...')
        .addFields({ name: 'Вопрос:', value: question });
    
    await interaction.editReply({ embeds: [thinkingEmbed] });
    
    // Задержка для драматического эффекта
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const answers = [
        { text: 'Да', emoji: '✅', color: '#00FF00' },
        { text: 'Нет', emoji: '❌', color: '#FF0000' },
        { text: 'Возможно', emoji: '🤔', color: '#FFFF00' },
        { text: 'Определенно да', emoji: '💯', color: '#00FF00' },
        { text: 'Определенно нет', emoji: '🚫', color: '#FF0000' },
        { text: 'Спроси позже', emoji: '⏰', color: '#808080' },
        { text: 'Скорее всего', emoji: '👍', color: '#90EE90' },
        { text: 'Вряд ли', emoji: '👎', color: '#FFB6C1' }
    ];

    if (answers.length === 0) {
        const embed = new EmbedBuilder()
            .setColor('#eb4034')
            .setTitle('Ошибка')
            .setDescription('❌ Нет доступных ответов');
        await interaction.editReply({ embeds: [embed] });
    }
    
    const answer = answers[Math.floor(Math.random() * answers.length)]!;
    
    const resultEmbed = new EmbedBuilder()
        .setColor(answer.color as ColorResolvable)
        .setTitle('🔮 Предсказание')
        .setDescription(`${answer.emoji} **${answer.text}**`)
        .addFields({ name: 'Ваш вопрос:', value: question });
    
    await interaction.editReply({ embeds: [resultEmbed] });
}

async function handlePercentage(interaction: ChatInputCommandInteraction) {
    const query = interaction.options.getString('query', true);
    
    await interaction.deferReply();
    
    // Генерируем "случайный" но стабильный процент на основе хеша строки
    const hash = query.split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
    }, 0);
    
    const percentage = Math.abs(hash) % 101; // 0-100%
    
    let color = '#FF0000';
    let emoji = '💔';
    
    if (percentage >= 80) {
        color = '#FF69B4';
        emoji = '💖';
    } else if (percentage >= 60) {
        color = '#FFA500';
        emoji = '🧡';
    } else if (percentage >= 40) {
        color = '#FFFF00';
        emoji = '💛';
    } else if (percentage >= 20) {
        color = '#87CEEB';
        emoji = '💙';
    }
    
    const embed = new EmbedBuilder()
        .setColor(color as any)
        .setTitle('📊 Процентометр')
        .setDescription(`${emoji} **${percentage}%**`)
        .addFields({ name: 'Запрос:', value: query })
        .setFooter({ text: 'Основано на сложных вычислениях!' });
    
    await interaction.editReply({ embeds: [embed] });
}

async function handleFortune(interaction: ChatInputCommandInteraction) {
    const fortunes: string[] = [
        'Сегодня удача будет на вашей стороне!',
        'Остерегайтесь человека в синем.',
        'Неожиданные новости придут с севера.',
        'Ваши старания скоро будут вознаграждены.',
        'Будьте внимательны к знакам вокруг вас.',
        'Старый друг вспомнит о вас.',
        'Перемены не за горами.',
        'Доверьтесь своей интуиции.',
        'Хорошие вести в пути.',
        'Звезды благосклонны к новым начинаниям.',
        'Ваша доброта вернется к вам втройне.',
        'Скоро предстоит важное решение.',
        'Путешествие принесет новые возможности.',
        'Творческий проект увенчается успехом.',
        'Любовь найдет вас, когда вы меньше всего этого ждете.',
        // Новые варианты:
        'Завтра начинается новая глава вашей истории.',
        'Случайная встреча изменит ваши планы.',
        'Маленькая радость украсит сегодняшний день.',
        'Найдите минуту для себя — Вселенная это оценит.',
        'Время помогает понять многое. Не торопитесь.',
        'Улыбка притянет к вам хороших людей.',
        'Получите долгожданный ответ в ближайшие дни.',
        'Кто-то мысленно благодарен вам сегодня.',
        'День будет идеален для новых знакомств.',
        'Некоторые мечты сбываются внезапно.',
        'Финансовый вопрос решится проще, чем вы думаете.',
        'Один разговор принесет вдохновение.',
        'Вам откроется спрятанная ранее возможность.',
        'Поддержите того, кто молчит — это важно.',
        'Ваше слово сегодня весит особенно много.',
        'К тому, кто смеется первым, удача приходит чаще.',
        'Случай поможет вам избежать неприятностей.',
        'Молчание иногда бывает лучшим ответом.',
        'Шанс возникнет там, где вы не ждёте.',
        'Верьте знакам — Вселенная разговаривает.',
        'Вдохновение настигнет в неожиданном месте.',
        'Скоро будет повод для весёлого праздника.',
        'Ваши слова могут изменить чей-то день.',
        'Ожидайте неожиданного. Сегодня это девиз.',
        'Решайтесь — всё получится!',
        'Тайное вскоре станет явным.',
        'Близкий человек нуждается в вашей поддержке.',
        'Порадуйте себя маленьким подарком.',
        'Ваша смелость удивит даже вас.'
    ];
    
    if (fortunes.length === 0) {
        const embed = new EmbedBuilder()
            .setColor('#eb4034')
            .setTitle('Ошибка')
            .setDescription('❌ Нет предсказаний.');
        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
    }
    
    const fortune = fortunes[Math.floor(Math.random() * fortunes.length)]!;
    
    const embed = new EmbedBuilder()
        .setColor('#9932CC')
        .setTitle('🌟 Ваше предсказание')
        .setDescription(fortune)

    await interaction.reply({ embeds: [embed] });
}