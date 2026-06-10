const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer'); // Библиотека для загрузки файлов

const app = express();
app.use(express.json());
app.use(cors());

// Делаем папку с картинками доступной для сайта
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const DB_FILE = path.join(__dirname, 'recipes.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

// Автоматически создаем папку для картинок, если её нет
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR);
}

// Настройка сохранения файлов картинок
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, UPLOADS_DIR);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

function readDB() {
    // База изначально чистая — рецептов нет, пока кто-то не выложит!
    if (!fs.existsSync(DB_FILE)) {
        fs.writeFileSync(DB_FILE, JSON.stringify([], null, 2));
        return [];
    }
    try {
        return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    } catch (e) {
        return [];
    }
}

function writeDB(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// 1. ПОЛУЧИТЬ ВСЕ РЕЦЕПТЫ ЛЕНТЫ
app.get('/api/recipes', (req, res) => {
    res.json(readDB());
});

// 2. ОПУБЛИКОВАТЬ ПОСТ С РЕАЛЬНОЙ КАРТИНКОЙ С ПК
app.post('/api/recipes', upload.single('recipeImage'), (req, res) => {
    const { title, desc } = req.body;
    
    if (!req.file) {
        return res.status(400).json({ message: "Пожалуйста, выберите файл фотографии!" });
    }

    const db = readDB();
    const imagePath = "/uploads/" + req.file.filename;

    const newRecipe = {
        id: 'rec_' + Math.random().toString(36).substr(2, 9),
        title,
        img: imagePath,
        desc,
        likes: 0,
        fire: 0,
        yum: 0,
        pizza: 0
    };

    db.unshift(newRecipe); // Новый пост всегда сверху ленты
    writeDB(db);
    res.status(201).json(newRecipe);
});

// 3. УМНАЯ ОБРАБОТКА ЭМОЦИЙ-РЕАКЦИЙ (Только 1 клик на пост)
app.post('/api/recipes/:id/reaction', (req, res) => {
    const { id } = req.params;
    const { type, action } = req.body; // type: 'like', 'fire', 'yum', 'pizza'. action: 'add', 'remove'
    const db = readDB();

    const recipe = db.find(r => r.id === id);
    if (!recipe) return res.status(404).json({ message: "Рецепт не найден" });

    // Если у рецепта ещё нет полей для новых эмоций — создаем их с нуля
    if (!recipe.likes) recipe.likes = 0;
    if (!recipe.fire) recipe.fire = 0;
    if (!recipe.yum) recipe.yum = 0;
    if (!recipe.pizza) recipe.pizza = 0;

    let field = 'likes';
    if (type === 'fire') field = 'fire';
    if (type === 'yum') field = 'yum';
    if (type === 'pizza') field = 'pizza';

    // Увеличиваем или уменьшаем счётчик эмоций
    if (action === 'add') {
        recipe[field] += 1;
    } else if (action === 'remove' && recipe[field] > 0) {
        recipe[field] -= 1;
    }

    writeDB(db);
    res.json(recipe);
});

// 🎯 УМНЫЙ ЗАПУСК ПОРТА (Строго в самом низу файла после всех настроек!)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Кулинарный сервер успешно запущен в интернете на порту ${PORT}`));
