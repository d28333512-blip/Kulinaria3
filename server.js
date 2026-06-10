const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
app.use(express.json());
app.use(cors());

// Делаем папки доступными для скачивания файлов сайтом
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Пути к нашей структурированной базе данных (Data Store)
const DB_DIR = path.join(__dirname, 'data_store');
const USERS_FILE = path.join(DB_DIR, 'users.json');
const RECIPES_FILE = path.join(DB_DIR, 'recipes.json');
const CHAT_FILE = path.join(DB_DIR, 'chat.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

// Автоматически создаем все папки, если их нет на сервере
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR);
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR);

// Помощники для безопасного чтения и записи файлов базы
function readData(filePath, initialValue = []) {
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify(initialValue, null, 2));
        return initialValue;
    }
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (e) {
        return initialValue;
    }
}

function writeData(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

// Настройка приема картинок с компьютера
const storage = multer.diskStorage({
    destination: function (req, file, cb) { cb(null, UPLOADS_DIR); },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// ================= РОУТЫ ДЛЯ АККАУНТОВ (ВХОД И СОХРАНЕНИЕ) =================
app.post('/api/auth/login', (req, res) => {
    const { username, avatar, bio } = req.body;
    if (!username) return res.status(400).json({ message: "Введите имя!" });

    const users = readData(USERS_FILE);
    
    // Ищем, есть ли уже такой пользователь в папке data_store
    let user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
    
    if (!user) {
        // Если аккаунт новый — регистрируем и сохраняем его в папку
        user = {
            id: 'user_' + Math.random().toString(36).substr(2, 9),
            username,
            avatar: avatar || '👤',
            bio: bio || 'Люблю готовить! 🍳'
        };
        users.push(user);
        writeData(USERS_FILE, users);
        console.log(`[БАЗА] Зарегистрирован новый повар: ${username}`);
    } else {
        console.log(`[БАЗА] Успешный вход в аккаунт: ${username}`);
    }

    res.json(user);
});

// ================= РОУТЫ ДЛЯ ЛЕНТЫ ПУБЛИКАЦИЙ =================
app.get('/api/recipes', (req, res) => {
    res.json(readData(RECIPES_FILE));
});

app.post('/api/recipes', upload.single('recipeImage'), (req, res) => {
    const { title, desc, userId, author, userAvatar } = req.body;
    if (!req.file) return res.status(400).json({ message: "Загрузите фото блюда!" });

    const recipes = readData(RECIPES_FILE);
    const imagePath = "/uploads/" + req.file.filename;

    const newRecipe = {
        id: 'rec_' + Math.random().toString(36).substr(2, 9),
        userId,
        author,
        userAvatar,
        title,
        img: imagePath,
        desc,
        likes: 0, fire: 0, yum: 0, pizza: 0
    };

    recipes.unshift(newRecipe); // Новые рецепты всегда вверху
    writeData(RECIPES_FILE, recipes);
    res.status(201).json(newRecipe);
});

app.delete('/api/recipes/:id', (req, res) => {
    const { id } = req.params;
    let recipes = readData(RECIPES_FILE);
    recipes = recipes.filter(r => r.id !== id);
    writeData(RECIPES_FILE, recipes);
    res.json({ message: "Пост удален!" });
});

// Реакции под публикациями
app.post('/api/recipes/:id/reaction', (req, res) => {
    const { id } = req.params;
    const { type, action } = req.body;
    const recipes = readData(RECIPES_FILE);

    const recipe = recipes.find(r => r.id === id);
    if (!recipe) return res.status(404).json({ message: "Не найдено" });

    let field = type === 'fire' ? 'fire' : type === 'yum' ? 'yum' : type === 'pizza' ? 'pizza' : 'likes';
    
    if (!recipe[field]) recipe[field] = 0;
    recipe[field] = action === 'add' ? recipe[field] + 1 : Math.max(0, recipe[field] - 1);

    writeData(RECIPES_FILE, recipes);
    res.json(recipe);
});

// ================= РОУТЫ ДЛЯ ОБЩЕГО ЧАТА (СКРОЛЛ) =================
app.get('/api/chat', (req, res) => {
    res.json(readData(CHAT_FILE));
});

app.post('/api/chat', (req, res) => {
    const { userId, username, avatar, text } = req.body;
    if (!text) return res.sendStatus(400);

    const messages = readData(CHAT_FILE);
    const newMessage = {
        id: Date.now(),
        userId,
        username,
        avatar,
        text,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    messages.push(newMessage);
    writeData(CHAT_FILE, messages);
    res.status(201).json(newMessage);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Мега-сервер кулинаров запущен в сети на порту ${PORT}`));
