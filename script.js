// ВСТАВЬТЕ СЮДА ВАШУ ССЫЛКУ НА СЕРВЕР RENDER (БЕЗ КОСОЙ ЧЕРТЫ В КОНЦЕ):
const SERVER_URL = 'https://kulinaria3.onrender.com'; 

let myUser = null; 
let selectedAvatar = '🍊';
let activeChatPartner = null;

// Выбор аватарки при регистрации
function selectAuthAvatar(emoji) {
    document.querySelectorAll('.av-item').forEach(item => {
        if(item.textContent === emoji) item.classList.add('active');
        else item.classList.remove('active');
    });
    selectedAvatar = emoji;
}

// 1. РЕГИСТРАЦИЯ И СОЗДАНИЕ ПРОФИЛЯ
document.getElementById('saveProfileBtn').addEventListener('click', async () => {
    const username = document.getElementById('authUsername').value.trim();
    if(!username) return alert('Введите ваш никнейм!');

    try {
        const res = await fetch(`${SERVER_URL}/api/users/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, avatar: selectedAvatar })
        });
        const data = await res.json();
        
        if(res.ok) {
            myUser = data.user;
            document.getElementById('authOverlay').style.display = 'none'; // Скрываем вход
            
            // Заполняем вкладку профиля
            document.getElementById('userProfileAvatar').textContent = myUser.avatar;
            document.getElementById('userProfileName').textContent = myUser.username;
            
            switchTab('feed'); // Открываем главную ленту
            startChatPolling(); // Включаем обновление чата
        } else {
            alert(data.message);
        }
    } catch(err) { alert('Ошибка подключения к серверу.'); }
});

// Переключение вкладок меню
function switchTab(tabName) {
    document.querySelectorAll('.nav-tab').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.page-section').forEach(page => page.style.display = 'none');

    if(tabName === 'feed') {
        document.getElementById('feedPage').style.display = 'block';
        loadFeed();
    } else if(tabName === 'chat') {
        document.getElementById('chatPage').style.display = 'block';
        loadUsersForChat();
    } else if(tabName === 'profile') {
        document.getElementById('profilePage').style.display = 'block';
        loadMyRecipes();
    }
    
    // Подсвечиваем активную кнопку
    event.currentTarget.classList.add('active');
}

// 2. ЗАГРУЗКА ОБЩЕЙ ЛЕНТЫ РЕЦЕПТОВ
async function loadFeed() {
    const feedContainer = document.getElementById('feedContainer');
    try {
        const res = await fetch(`${SERVER_URL}/api/recipes`);
        const recipes = await res.json();
        feedContainer.innerHTML = '';

        if(recipes.length === 0) {
            feedContainer.innerHTML = '<p class="empty-hint">Лента пуста. Станьте первым кулинаром!</p>';
            return;
        }

        recipes.forEach(recipe => {
            const userChoice = localStorage.getItem(`react_${recipe.id}`);
            const card = document.createElement('div');
            card.className = 'recipe-card';
            
            // Если пост ваш — показываем кнопку удаления 🗑️
            const deleteBtn = recipe.authorId === myUser.id 
                ? `<button class="delete-post-btn" onclick="deleteRecipe('${recipe.id}')">Удалить ✕</button>` 
                : '';

            card.innerHTML = `
                ${deleteBtn}
                <img src="${SERVER_URL}${recipe.img}" alt="${recipe.title}">
                <div class="recipe-content">
                    <div class="recipe-author">${recipe.authorAvatar} @${recipe.authorName}</div>
                    <h2>${recipe.title}</h2>
                    <p>${recipe.desc}</p>
                    <div class="card-actions">
                        <button class="reaction-btn ${userChoice === 'like' ? 'active' : ''}" onclick="toggleReaction('${recipe.id}', 'like')">❤️ <span>${recipe.likes || 0}</span></button>
                        <button class="reaction-btn ${userChoice === 'fire' ? 'active' : ''}" onclick="toggleReaction('${recipe.id}', 'fire')">🔥 <span>${recipe.fire || 0}</span></button>
                        <button class="reaction-btn ${userChoice === 'yum' ? 'active' : ''}" onclick="toggleReaction('${recipe.id}', 'yum')">🤤 <span>${recipe.yum || 0}</span></button>
                    </div>
                </div>
            `;
            feedContainer.appendChild(card);
        });
    } catch (err) {}
}

// 3. ЗАГРУЗКА ЛИЧНЫХ РЕЦЕПТОВ В ПРОФИЛЕ
async function loadMyRecipes() {
    const container = document.getElementById('myRecipesContainer');
    try {
        const res = await fetch(`${SERVER_URL}/api/recipes`);
        const recipes = await res.json();
        container.innerHTML = '';

        const myRecipes = recipes.filter(r => r.authorId === myUser.id);
        if(myRecipes.length === 0) {
            container.innerHTML = '<p class="empty-hint">У вас пока нет публикаций.</p>';
            return;
        }

        myRecipes.forEach(recipe => {
            const card = document.createElement('div');
            card.className = 'recipe-card';
            card.innerHTML = `
                <button class="delete-post-btn" onclick="deleteRecipe('${recipe.id}')">Удалить ✕</button>
                <img src="${SERVER_URL}${recipe.img}">
                <div class="recipe-content">
                    <h2>${recipe.title}</h2>
                    <p>${recipe.desc}</p>
                </div>
            `;
            container.appendChild(card);
        });
    } catch(err) {}
}

// 4. УДАЛЕНИЕ СВОЕГО ПОСТА
async function deleteRecipe(id) {
    if(!confirm('Вы уверены, что хотите удалить этот рецепт?')) return;
    try {
        const res = await fetch(`${SERVER_URL}/api/recipes/${id}?userId=${myUser.id}`, { method: 'DELETE' });
        if(res.ok) {
            loadFeed();
            loadMyRecipes();
        }
    } catch(err) {}
}

// 5. ЛОГИКА РЕАКЦИЙ
async function toggleReaction(recipeId, type) {
    const key = `react_${recipeId}`;
    const prev = localStorage.getItem(key);
    let action = prev === type ? 'remove' : 'add';

    if(prev && prev !== type) {
        await fetch(`${SERVER_URL}/api/recipes/${recipeId}/reaction`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: prev, action: 'remove' })
        });
    }

    if(action === 'add') localStorage.setItem(key, type);
    else localStorage.removeItem(key);

    const res = await fetch(`${SERVER_URL}/api/recipes/${recipeId}/reaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, action })
    });
    if(res.ok) loadFeed();
}

// ПОИСК И СПИСОК ПОЛЬЗОВАТЕЛЕЙ ДЛЯ ЧАТА
async function loadUsersForChat() {
    const list = document.getElementById('usersList');
    try {
        const res = await fetch(`${SERVER_URL}/api/users`);
        const users = await res.json();
        list.innerHTML = '';

        users.forEach(user => {
            if(user.id === myUser.id) return; // Пропускаем себя
            const div = document.createElement('div');
            div.className = 'user-item';
            div.innerHTML = `<span>${user.avatar}</span> <b style="margin-left:8px;">${user.username}</b>`;
            div.onclick = () => openChatWith(user, div);
            list.appendChild(div);
        });
    } catch(err) {}
}

function openChatWith(user, element) {
    activeChatPartner = user;
    document.querySelectorAll('.user-item').forEach(i => i.classList.remove('active'));
    element.classList.add('active');

    document.getElementById('chatHeader').style.display = 'block';
    document.getElementById('chatInputArea').style.display = 'flex';
    document.getElementById('chatActiveUser').textContent = `${user.avatar} @${user.username}`;
    loadChatMessages();
}

// ЗАГРУЗКА И ОТПРАВКА СООБЩЕНИЙ ЧАТА
async function loadChatMessages() {
    if(!activeChatPartner || !myUser) return;
    const container = document.getElementById('chatMessages');
    try {
        const res = await fetch(`${SERVER_URL}/api/chat?from=${myUser.id}&to=${activeChatPartner.id}`);
        const messages = await res.json();
        container.innerHTML = '';

        messages.forEach(m => {
            const div = document.createElement('div');
            div.className = `chat-msg ${m.from === myUser.id ? 'my' : 'their'}`;
            div.textContent = m.text;
            container.appendChild(div);
        });
        container.scrollTop = container.scrollHeight;
    } catch(err) {}
}

document.getElementById('sendMsgBtn').addEventListener('click', () => {
    const input = document.getElementById('chatMessageInput');
    const text = input.value.trim();
    if(!text || !activeChatPartner) return;

    fetch(`${SERVER_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: myUser.id, to: activeChatPartner.id, text })
    }).then(() => {
        input.value = '';
        loadChatMessages();
    });
});

// ДОБАВЛЕНИЕ НОВОГО РЕЦЕПТА
document.getElementById('recipeForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('title', document.getElementById('recipeTitle').value.trim());
    formData.append('recipeImage', document.getElementById('recipeFile').files);
    formData.append('desc', document.getElementById('recipeDesc').value.trim());
    formData.append('authorId', myUser.id);
    formData.append('authorName', myUser.username);
    formData.append('authorAvatar', myUser.avatar);

    const res = await fetch(`${SERVER_URL}/api/recipes`, { method: 'POST', body: formData });
    if(res.ok) {
        document.getElementById('recipeForm').reset();
        toggleModal(false);
        loadFeed();
    }
});

