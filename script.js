// ВСТАВЬТЕ СЮДА СВОЮ ССЫЛКУ НА СЕРВЕР RENDER (БЕЗ КОСОЙ ЧЕРТЫ В КОНЦЕ):
const SERVER_URL = 'https://onrender.com'; 

let currentUser = null; // Текущий пользователь
let activeScreen = 'feed'; // Активный экран (feed / profile / chat)

// Элементы формы профиля
const regOverlay = document.getElementById('regOverlay');
const regForm = document.getElementById('regForm');
const profileName = document.getElementById('profileName');
const profileBio = document.getElementById('profileBio');
const profileAvatar = document.getElementById('profileAvatar');

// Элементы навигации
const myNameNav = document.getElementById('myNameNav');
const myAvatarNav = document.getElementById('myAvatarNav');

// 🔒 ПРОВЕРКА: Автоматический вход при перезагрузке страницы
function checkAutoLogin() {
    const savedUser = localStorage.getItem('foodgram_user');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        
        // Показываем данные в шапке сайта
        myNameNav.textContent = currentUser.username;
        myAvatarNav.textContent = currentUser.avatar;
        
        // Скрываем окно регистрации, если пользователь уже залогинен
        regOverlay.style.display = 'none';
        
        // Загружаем ленту
        loadFeed();
    } else {
        // Если пользователя нет в памяти — принудительно открываем окно регистрации
        regOverlay.style.display = 'flex';
    }
}

// СОЗДАНИЕ И СОХРАНЕНИЕ ПРОФИЛЯ
regForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('regUsername').value.trim();
    const avatar = document.getElementById('regAvatar').value;
    const bio = document.getElementById('regBio').value.trim();

    currentUser = {
        id: 'user_' + Math.random().toString(36).substr(2, 9),
        username: username,
        avatar: avatar,
        bio: bio || 'Люблю готовить! 🍳'
    };

    // 💾 Сохраняем в память браузера навсегда
    localStorage.setItem('foodgram_user', JSON.stringify(currentUser));

    // Обновляем интерфейс
    myNameNav.textContent = currentUser.username;
    myAvatarNav.textContent = currentUser.avatar;
    regOverlay.style.display = 'none';

    loadFeed();
});

// ЗАГРУЗКА ЛЕНТЫ РЕЦЕПТОВ
async function loadFeed() {
    if (!currentUser) return;
    try {
        const res = await fetch(`${SERVER_URL}/api/recipes`);
        const recipes = await res.json();
        
        const feedContainer = document.getElementById('feedContainer');
        feedContainer.innerHTML = '';
        
        // Фильтруем посты, если мы находимся на вкладке "Профиль"
        const filteredRecipes = activeScreen === 'profile' 
            ? recipes.filter(r => r.userId === currentUser.id)
            : recipes;

        if (filteredRecipes.length === 0) {
            feedContainer.innerHTML = `<p style="text-align:center;color:#a0a5b5;padding:40px;">Здесь пока пусто...</p>`;
            return;
        }

        filteredRecipes.forEach(recipe => {
            const storageKey = `reaction_${recipe.id}`;
            const userChoice = localStorage.getItem(storageKey);

            const card = document.createElement('div');
            card.className = 'recipe-card';
            
            // Проверяем: если пост создал текущий юзер, добавляем кнопку "Удалить"
            const deleteButton = recipe.userId === currentUser.id 
                ? `<button class="delete-btn" onclick="deleteRecipe('${recipe.id}')">Удалить ✕</button>` 
                : '';

            card.innerHTML = `
                <div class="card-header">
                    <div class="author-info">
                        <span class="author-avatar">${recipe.userAvatar || '👤'}</span>
                        <span class="author-name">${recipe.author || 'Аноним'}</span>
                    </div>
                    ${deleteButton}
                </div>
                <img src="${SERVER_URL}${recipe.img}" alt="${recipe.title}">
                <div class="recipe-content">
                    <h2>${recipe.title}</h2>
                    <p>${recipe.desc}</p>
                    <div class="card-actions">
                        <button class="reaction-btn ${userChoice === 'like' ? 'active' : ''}" onclick="toggleReaction('${recipe.id}', 'like')">
                            ❤️ <span>${recipe.likes || 0}</span>
                        </button>
                        <button class="reaction-btn ${userChoice === 'fire' ? 'active' : ''}" onclick="toggleReaction('${recipe.id}', 'fire')">
                            🔥 <span>${recipe.fire || 0}</span>
                        </button>
                        <button class="reaction-btn ${userChoice === 'yum' ? 'active' : ''}" onclick="toggleReaction('${recipe.id}', 'yum')">
                            🤤 <span>${recipe.yum || 0}</span>
                        </button>
                        <button class="reaction-btn ${userChoice === 'pizza' ? 'active' : ''}" onclick="toggleReaction('${recipe.id}', 'pizza')">
                            🍕 <span>${recipe.pizza || 0}</span>
                        </button>
                    </div>
                </div>
            `;
            feedContainer.appendChild(card);
        });
    } catch (err) {
        console.error(err);
    }
}

// ОТПРАВКА НОВОГО РЕЦЕПТА НА СЕРВЕР С ПРИВЯЗКОЙ К ЮЗЕРУ
document.getElementById('recipeForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const title = document.getElementById('recipeTitle').value.trim();
    const fileInput = document.getElementById('recipeFile');
    const desc = document.getElementById('recipeDesc').value.trim();

    const formData = new FormData();
    formData.append('title', title);
    formData.append('recipeImage', fileInput.files[0]);
    formData.append('desc', desc);
    
    // Передаем данные автора, чтобы сервер сохранил их в общую базу рецептов
    formData.append('userId', currentUser.id);
    formData.append('author', currentUser.username);
    formData.append('userAvatar', currentUser.avatar);

    try {
        const res = await fetch(`${SERVER_URL}/api/recipes`, {
            method: 'POST',
            body: formData
        });

        if (res.ok) {
            document.getElementById('recipeForm').reset();
            toggleModal(false);
            loadFeed();
        }
    } catch (err) {
        alert('Не удалось опубликовать рецепт.');
    }
});

// УДАЛЕНИЕ СОБСТВЕННОГО ПОСТА
async function deleteRecipe(id) {
    if (!confirm('Вы уверены, что хотите удалить эту публикацию?')) return;

    try {
        const res = await fetch(`${SERVER_URL}/api/recipes/${id}`, {
            method: 'DELETE'
        });
        if (res.ok) {
            loadFeed(); // Перерисовываем ленту после удаления постов
        }
    } catch (err) {
        alert('Ошибка при удалении поста.');
    }
}

// УМНЫЕ РЕАКЦИИ
async function toggleReaction(recipeId, type) {
    const storageKey = `reaction_${recipeId}`;
    const previousReaction = localStorage.getItem(storageKey);
    let action = 'add';

    if (previousReaction === type) {
        action = 'remove';
        localStorage.removeItem(storageKey);
    } else {
        if (previousReaction) {
            await fetch(`${SERVER_URL}/api/recipes/${recipeId}/reaction`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: previousReaction, action: 'remove' })
            });
        }
        localStorage.setItem(storageKey, type);
    }

    try {
        await fetch(`${SERVER_URL}/api/recipes/${recipeId}/reaction`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type, action })
        });
        loadFeed();
    } catch (err) {}
}

// НАВИГАЦИЯ МЕЖДУ ЭКРАНАМИ
function showScreen(screen) {
    activeScreen = screen;
    
    // Смена активных классов у кнопок меню
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    document.getElementById(screen + 'Link').classList.add('active');

    // Переключаем отображение блоков
    const feedSection = document.getElementById('feedContainer');
    const profileSection = document.getElementById('profileContainer');
    const chatSection = document.getElementById('chatContainer');

    feedSection.style.display = (screen === 'feed' || screen === 'profile') ? 'flex' : 'none';
    profileSection.style.display = screen === 'profile' ? 'block' : 'none';
    chatSection.style.display = screen === 'chat' ? 'flex' : 'none';

    if (screen === 'profile' && currentUser) {
        // Заполняем карточку профиля
        profileName.textContent = currentUser.username;
        profileAvatar.textContent = currentUser.avatar;
        profileBio.textContent = currentUser.bio;
    }

    loadFeed(); // Обновляем ленту с учетом фильтрации
}

// Функции окон
function toggleModal(show) {
    document.getElementById('modalOverlay').style.display = show ? 'flex' : 'none';
}

// ЗАПУСК ПРОВЕРКИ ПРИ ЗАГРУЗКЕ СТРАНИЦЫ
checkAutoLogin();
