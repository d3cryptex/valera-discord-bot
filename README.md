# Valera DiscordBot
**Многофункциональный Discord-бот для управления сервером, прокачки участников, экономики, battlepass и автоматизации!**

## 🚀 Возможности

- 👮 Админ-панель и гибкие права доступа ролям/пользователям
- 💬 Управление AI-чатом (Markov Chain, auto-reply, каналы AI, игнор-листы)
- 💰 Экономика: магазин, ежедневные/еженедельные бонусы, статистика, история покупок
- 🏆 Уровни: XP за сообщения и голос, уникальные роли и канал для LevelUp, XP-бусты
- 🎫 Battlepass: квесты, награды, прогресс, уровни боевого пропуска
- ⚡ Модерация: анти-спам, анти-мат, mute/kick, логирование нарушений
- 🛠️ Гибкая настройка через slash-команды (`/settings`, `/settings admin`, `/settings levels`, `/settings ai` и др.)
- 📊 Отчеты, статистика, база данных и кэш

## 🛠️ Технологии

| Технология      | Описание                            |
|-----------------|-------------------------------------|
| Node.js         | Основная серверная платформа        |
| TypeScript      | Безопасная типизация и масштабируемость |
| Discord.js      | Работа с Discord API (v14+)         |
| Redis           | Промежуточный кэш и Pub/Sub         |
| PostgreSQL/MySQL| Хранение данных (выбери под проект) |
| dotenv          | Управление секретами и конфигами    |
| ESLint/Prettier | Линтинг и автоформатирование кода   |
| Nodemon     | Запуск и hot-reload бота                |

## ⚡ Быстрый старт

```text
git clone <repo-url>
cd <repo-folder>
npm install
npm run start
```

## 🔐 Пример .env

```env
# Discord
DISCORD_TOKEN=ваш_бот_токен
DISCORD_CLIENT_ID=client_id_бота
DISCORD_GUILD_ID=основной_guild_id (не обезательно) 

# Database
DB_HOST=название_хоста
DB_PORT=порт_хоста
DB_USER=имя_пользователя
DB_PASSWORD=пароль
DB_NAME=название_бд

# Redis
REDIS_HOST=название_хоста_редиса
REDIS_PORT=порт
REDIS_PASSWORD=пароль

# Bot Settings
LOG_LEVEL=тип_логов (debug, info)
NODE_ENV=тип_енвиромента (development, production)

SKIP_COMMAND_REGISTRATION=регистрация_команд (true/false)
```

## 🕹️ Основные slash-команды

Все команды поддерживают автозаполнение и справку через /help.

### 📊 Level — Уровни
Система уровней и лидерборда:

    /level me — Ваш уровень.``

    /level user <user> — Уровень пользователя.``

    /level leaderboard <type> — Таблица лидеров.
 
    /level addxp <user> <значение> — Добавить XP пользователю. (админ)

    /level setxp <user> <значение> — Установить XP.

    /level removexp <user> <значение> — Вычесть XP.

    /level addcoins <user> <значение> — Дать монеты.
 
    /level setcoins <user> <значение> — Установить монеты.

    /level removecoins <user> <значение> — Вычесть монеты.

### 🪙 Economy — экономика
Магазин и бонусы:

    /daily — Получить ежедневный бонус.

    /weekly — Получить еженедельный бонус.

    /streak — Посмотреть свою серию ежедневных бонусов.

    /gift <user> [amount] — Отправить подарок.
 
    /shop list — Список товаров.

    /shop buy <id> — Купить товар.

    /shop balance — Ваш баланс.

### 🎫 Battle Pass
Система заданий, уровней и наград:

    /battlepass progress — Ваш уровень и задачи Battle Pass.

    /battlepass roadmap — Дорожная карта всех наград BP.

🎮 Games — Игры
Мини-игры и ставки:

    /games slots [bet] — Сыграть в слоты.

    /games dice [bet] — Бросить 2 кубика.

    /games coin [bet] — Подбросить монетку.

    /games duel <user> [bet] — Дуэль с пользователем.

### 🔮 Предсказания и факты
Развлекательные команды:

    /predict yesno <вопрос> — Ответ да/нет.

    /predict percentage <текст> — Процент совместимости/шанс.

    /predict fortune — Случайное предсказание.

    /fact [category] — Интересный факт.

### 🛠️ Утилиты
Основные функции бота:

    /server-info — Информация о сервере.

    /stats — Статистика бота.

    /dm <@user> <text> — ЛС от имени бота.

    /help — Основная справка.

### ⚙️ Администрирование
Только для админов:

    /settings — Меню настроек.

    /markov generate [слово] — AI-ответ вручную.

    /markov stats — Статистика AI.

    /markov clear — Очистить обучение AI.

    /markov meme — Мем с AI.

### 🛒 Управление магазином
Только для админов:

    /shop-manage add <name> <price>... — Добавить товар.

    /shop-manage remove <item_id> — Удалить товар.

    /shop-manage list — Все товары (вкл. неактивные).

    /shop-manage toggle <item_id> — Вкл/выкл товар.

## 🏗️ Для разработчиков

- Расширяемые команды: добавляй новые в папку `commands/` с экспортом `data` и `execute`.
- Каждый сервис (AI, экономика, левелы, BP) — отдельный модуль, легко расширять и интегрировать с внешними API.
- TypeScript ESM-архитектура и поддержка unit-тестирования.

## 📄 Лицензия

MIT

---

## 📬 Contact

[![Discord](https://img.shields.io/badge/Discord-%235865F2.svg?style=flat-square&logo=discord&logoColor=white)](https://discord.com/users/6275)
[![Telegram](https://img.shields.io/badge/Telegram-2CA5E0?style=flat-square&logo=telegram&logoColor=white)](https://t.me/d3cryptex)
[![Gmail](https://img.shields.io/badge/Gmail-D14836?style=flat-square&logo=gmail&logoColor=white)](mailto:danilobocuk@gmail.com)

---

**Made with ❤️ to help you _learn by building_.**

By **d3cryptex**


