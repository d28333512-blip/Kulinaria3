const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer'); // Подключаем библиотеку для приема файлов

const app = express();
app.use(express.json());
app.use(cors());

// Делаем так, чтобы папка с загруженными картинками была доступна всему интернету
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const DB_FILE = path.join(__dirname, 'recipes.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

// Автоматически создаем папку uploads для картинок, если её ещё нет
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR);
}

// Настраиваем правила сохранения картинок на компьютер
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, UPLOADS_DIR);
    },
    filename: function (req, file, cb) {
        // Даем файлу уникальное имя, чтобы они не перезаписывали друг друга
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

function readDB() {
    // База теперь изначально пустая — рецептов нет, пока кто-то не выложит!
    if (!fs.existsSync(DB_FILE)) {
        fs.writeFileSync(DB_FILE, JSON.stringify([], null, 2));
        return [];
    }
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function writeDB(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// 1. Получить все посты ленты
app.get('/api/recipes', (req, res) => {
    res.json(readDB());
});

// 2. Опубликовать пост с реальной картинкой
app.post('/api/recipes', upload.single('recipeImage'), (req, res) => {
    const { title, desc } = req.body;
    
    if (!req.file) {
        return res.status(400).json({ message: "Пожалуйста, загрузите файл фотографии!" });
    }

    const db = readDB();

    // Сохраняем путь к картинке на сервере (например, /uploads/172638.jpg)
    const imagePath = "/uploads/" + req.file.filename;

    const newRecipe = {
        id: 'rec_' + Math.random().toString(36).substr(2, 9),
        title,
        img: imagePath,
        desc,
        likes: 0
    };

    db.unshift(newRecipe); // Новое блюдо всегда встает наверх ленты
    writeDB(db);

    res.status(201).json(newRecipe);
});

// 3. Поставить лайк рецепту
app.post('/api/recipes/:id/like', (req, res) => {
    const { id } = req.params;
    const db = readDB();

    const recipe = db.find(r => r.id === id);
    if (!recipe) return res.status(404).json({ message: "Рецепт не найден" });

    recipe.likes += 1;
    writeDB(db);

    res.json({ likes: recipe.likes });
});

app.listen(3000, () => console.log('Кулинарный сервер с загрузкой файлов запущен на порту 3000!'));
