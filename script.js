// ВСТАВЬТЕ СЮДА ВАШУ ССЫЛКУ НА СЕРВЕР RENDER (БЕЗ КОСОЙ ЧЕРТЫ В КОНЦЕ):
const SERVER_URL = 'https://kulinaria3.onrender.com'; 

let myUser = null; // Хранит данные вашего профиля
let selectedAvatarIcon = '👨‍🍳';

const authOverlay = document.getElementById('authOverlay');
const authForm = document.getElementById('authForm');
const feedContainer = document.getElementById('feedContainer');
const myRecipesContainer = document.getElementById('myRecipesContainer');
const chatMessages = document.getElementById('chatMessages');
const chatMessageInput = document.getElementById('chatMessageInput');
const sendMsgBtn = document.getElementById('sendMsgBtn');
const recipeForm = document.getElementById('recipeForm');

// АВТОРИЗАЦИЯ И СОЗДАНИЕ ПРОФИЛЯ
function selectAvatar(element, icon) {
    document.querySelectorAll('.avatar-option').forEach(opt => opt.classList.remove('active'));
    element.classList.add('active');
    selectedAvatarIcon = icon;
}

authForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('authUsername').value.trim();
    if (!username) return;

    // Генерируем уникальный ID для владельца профиля
    const userId = 'usr_' + Math.random().toString(36).substr(2, 9);
    
    myUser = { id: userId, name: username, avatar: selectedAvatarIcon };
    localStorage.setItem('foodgram_user', JSON.stringify(myUser)); // Сохраняем профиль навсегда

    authOverlay.style.display = 'none';
    initProfileUI();
    loadAllData();
});

// Проверяем, создавался ли профиль ранее
function checkUserAuth() {
    const savedUser = localStorage.getItem('foodgram_user');
    if (savedUser) {
        myUser = JSON.parse(savedUser);
        authOverlay.style.display = 'none';
        initProfileUI();
        loadAllData();
    } else {
        authOverlay.style.display = 'flex';
    }
}

function initProfileUI() {
    document.getElementById('profileAvatarDisplay').textContent = myUser.avatar;
    document.getElementById('profileNameDisplay').textContent = myUser.name;
    document.getElementById('profileNameDisplay').insertAdjacentHTML('beforebegin', `<span style="font-size:0.8rem;color:#ff6b35;font-weight:700;">@ВАШ ПРОФИЛЬ</span><br>`);
}

// ПЕРЕКЛЮЧЕНИЕ ВКЛАДОК (ЛЕНТА, ЧАТ, ПРОФИЛЬ)
function switchTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active-content'));

    const activeBtn = Array.from(document.querySelectorAll('.tab-btn')).find(b => b.outerHTML.includes(tabId.replace('Tab','')));
    if (activeBtn) activeBtn.classList.add('active');
    
    document.getElementById(tabId).classList.add('active-content');
    loadAllData();
}

// ЗАГРУЗКА ВСЕХ ДАННЫХ С СЕРВЕРА RENDER
function loadAllData() {
    loadFeed();
    loadChat();
}

// Загрузка главной ленты и личной ленты профиля
async function loadFeed() {
    if (!myUser) return;
    try {
        const res = await fetch(`${SERVER_URL}/api/recipes`);
        const recipes = await res.json();
        
        feedContainer.innerHTML = '';
        myRecipesContainer.innerHTML = '';

        let myPostsCount = 0;

        if (recipes.length === 0) {
            const emptyHTML = `<div class="empty-hint">🍊 Тут пока ничего нет. Будьте первыми!</div>`;
            feedContainer.innerHTML = emptyHTML;
            myRecipesContainer.innerHTML = emptyHTML;
            return;
        }

        recipes.forEach(recipe => {
            const userChoice = localStorage.getItem(`reaction_${recipe.id}`);
            const isMyPost = recipe.authorId === myUser.id; // Проверяем, принадлежит ли пост вам

            const cardHTML = `
                <div class="recipe-card">
                    <img src="${SERVER_URL}${recipe.img}" alt="${recipe.title}">
                    <div class="recipe-content">
                        <div style="font-size:0.85rem;color:#8da2bb;margin-bottom:5px;">Выложил: ${recipe.authorAvatar || '👤'} ${recipe.authorName || 'Аноним'}</div>
                        <h2>${recipe.title}</h2>
                        <p>${recipe.desc}</p>
                        
                        <div class="card-actions">
                            <div class="reactions-box">
                                <button class="reaction-btn ${userChoice === 'like' ? 'active' : ''}" onclick="toggleReaction('${recipe.id}', 'like')">❤️ <span>${recipe.likes || 0}</span></button>
                                <button class="reaction-btn ${userChoice === 'fire' ? 'active' : ''}" onclick="toggleReaction('${recipe.id}', 'fire')">🔥 <span>${recipe.fire || 0}</span></button>
                                <button class="reaction-btn ${userChoice === 'yum' ? 'active' : ''}" onclick="toggleReaction('${recipe.id}', 'yum')">🤤 <span>${recipe.yum || 0}</span></button>
                                <button class="reaction-btn ${userChoice === 'pizza' ? 'active' : ''}" onclick="toggleReaction('${recipe.id}', 'pizza')">🍕 <span>${recipe.pizza || 0}</span></button>
                            </div>
                            
                            <!-- 🗑️ КНОПКА УДАЛЕНИЯ: Видна только владельцу поста -->
                            ${isMyPost ? `<button class="delete-btn" onclick="deleteRecipe('${recipe.id}')">Удалить</button>` : ''}
                        </div>
                    </div>
                </div>
            `;

            // Добавляем в общую ленту
            feedContainer.insertAdjacentHTML('beforeend', cardHTML);

            // Если пост ваш — добавляем его копию во вкладку Профиля
            if (isMyPost) {
                myPostsCount++;
                myRecipesContainer.insertAdjacentHTML('beforeend', cardHTML);
            }
        });

        document.querySelector('.profile-stats').textContent = `Ваши публикации (${myPostsCount}):`;

    } catch (err) {
        console.error("Ошибка загрузки ленты:", err);
    }
}

// Публикация поста
recipeForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!myUser) return;

    const title = document.getElementById('recipeTitle').value.trim();
    const fileInput = document.getElementById('recipeFile');
    const desc = document.getElementById('recipeDesc').value.trim();

    const formData = new FormData();
    formData.append('title', title);
    formData.append('recipeImage', fileInput.files[0]);
    formData.append('desc', desc);
    formData.append('authorId', myUser.id);
    formData.append('authorName', myUser.name);
    formData.append('authorAvatar', myUser.avatar);

    try {
        const res = await fetch(`${SERVER_URL}/api/recipes`, { method: 'POST', body: formData });
        if (res.ok) {
            recipeForm.reset();
            toggleModal('recipeModal', false);
            loadFeed();
        }
    } catch (err) {
        alert('Не удалось выложить рецепт.');
    }
});

// Удаление своего поста
async function deleteRecipe(id) {
    if (!confirm('Вы точно хотите удалить этот рецепт?')) return;
    try {
        const res = await fetch(`${SERVER_URL}/api/recipes/${id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: myUser.id }) // Отправляем ID для проверки безопасности
        });
        if (res.ok) {
            loadFeed();
        }
    } catch (err) {
        alert('Ошибка при удалении поста.');
    }
}

// Умные эмодзи-реакции
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
        const res = await fetch(`${SERVER_URL}/api/recipes/${recipeId}/reaction`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type, action })
        });
        if (res.ok) loadFeed();
    } catch (err) {}
}

// ОБЩИЙ ЧАТ КУЛИНАРОВ
async function loadChat() {
    try {
        const res = await fetch(`${SERVER_URL}/api/chat`);
        const messages = await res.json();
        
        chatMessages.innerHTML = '';
        messages.forEach(m => {
            const isMyMsg = m.authorId === myUser.id;
            const msgHTML = `
                <div class="chat-msg ${isMyMsg ? 'my-msg' : 'other-msg'}">
                    <span class="msg-author">${m.avatar} ${m.author}</span>
                    <span class="msg-text">${m.text}</span>
                    <span class="msg-time">${m.time}</span>
                </div>
            `;
            chatMessages.insertAdjacentHTML('beforeend', msgHTML);
        });
        chatMessages.scrollTop = chatMessages.scrollHeight; // Плавный автоскролл вниз к новым сообщениям
    } catch (err) {}
}

// Отправка сообщений в чат
function sendChatMessage() {
    const text = chatMessageInput.value.trim();
    if (!text || !myUser) return;

    fetch(`${SERVER_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authorId: myUser.id, author: myUser.name, avatar: myUser.avatar, text })
    })
    .then(() => {
        chatMessageInput.value = '';
        loadChat();
    });
}

sendMsgBtn.addEventListener('click', sendChatMessage);
chatMessageInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendChatMessage(); });

function toggleModal(id, show) {document.getElementById(id).style.display = show ? 'flex' : 'none';}// Живое автоматическое обновление сообщений чата каждые 3 секундыsetInterval(() => {if (document.getElementById('chatTab').classList.contains('active-content')) {loadChat();}}, 3000);// Запуск приложенияcheckUserAuth();

