// ВСТАВЬТЕ СЮДА ВАШУ ССЫЛКУ НА СЕРВЕР RENDER (БЕЗ КОСОЙ ЧЕРТЫ В КОНЦЕ):
const SERVER_URL = 'https://onrender.com'; 

let currentUser = null; 
let activeScreen = 'feed'; 

const regOverlay = document.getElementById('regOverlay');
const regForm = document.getElementById('regForm');
const feedContainer = document.getElementById('feedContainer');
const chatMessages = document.getElementById('chatMessages');

async function checkLogin() {
    const savedUser = localStorage.getItem('foodgram_user');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        regOverlay.style.display = 'none';
        loadFeed();
        startPolling(); 
    } else {
        regOverlay.style.display = 'flex';
    }
}

regForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('regUsername').value.trim();
    const avatar = document.getElementById('regAvatar').value;
    const bio = document.getElementById('regBio').value.trim();

    const res = await fetch(`${SERVER_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, avatar, bio })
    });
    
    if (res.ok) {
        currentUser = await res.json();
        localStorage.setItem('foodgram_user', JSON.stringify(currentUser)); 
        regOverlay.style.display = 'none';
        loadFeed();
        startPolling();
    } else {
        alert('Ошибка при входе');
    }
});

// ЛЕНТА РЕЦЕПТОВ
async function loadFeed() {
    if (!currentUser || activeScreen === 'chat') return;
    try {
        const res = await fetch(`${SERVER_URL}/api/recipes`);
        const recipes = await res.json();
        
        if (activeScreen === 'feed') {
            document.getElementById('profileContainer').style.display = 'none';
            feedContainer.style.display = 'flex';
        }

        feedContainer.innerHTML = '';
        const filtered = activeScreen === 'profile' ? recipes.filter(r => r.userId === currentUser.id) : recipes;

        if (filtered.length === 0) {
            feedContainer.innerHTML = '<p style="text-align:center;color:#a0a5b5;padding:40px;font-size:0.95rem;">Тут пока ничего нет...</p>';
            return;
        }

        filtered.forEach(recipe => {
            const userChoice = localStorage.getItem(`reaction_${recipe.id}`);
            const delBtn = recipe.userId === currentUser.id ? `<button class="delete-btn" onclick="deleteRecipe('${recipe.id}')">Удалить ✕</button>` : '';

            const card = document.createElement('div');
            card.className = 'recipe-card';
            card.innerHTML = `
                <div class="card-header">
                    <div class="author-info">
                        <span class="author-avatar">${recipe.userAvatar || '👨‍🍳'}</span>
                        <span class="author-name">${recipe.author}</span>
                    </div>
                    ${delBtn}
                </div>
                <img src="${SERVER_URL}${recipe.img}">
                <div class="recipe-content">
                    <h2>${recipe.title}</h2>
                    <p>${recipe.desc}</p>
                    <div class="card-actions">
                        <button class="reaction-btn ${userChoice==='like'?'active':''}" onclick="toggleReaction('${recipe.id}','like')">❤️ <span>${recipe.likes||0}</span></button>
                        <button class="reaction-btn ${userChoice==='fire'?'active':''}" onclick="toggleReaction('${recipe.id}','fire')">🔥 <span>${recipe.fire||0}</span></button>
                        <button class="reaction-btn ${userChoice==='yum'?'active':''}" onclick="toggleReaction('${recipe.id}','yum')">🤤 <span>${recipe.yum||0}</span></button>
                        <button class="reaction-btn ${userChoice==='pizza'?'active':''}" onclick="toggleReaction('${recipe.id}','pizza')">🍕 <span>${recipe.pizza||0}</span></button>
                    </div>
                </div>
            `;
            feedContainer.appendChild(card);
        });
    } catch (err) {}
}

// ПУБЛИКАЦИЯ РЕЦЕПТА
document.getElementById('recipeForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('title', document.getElementById('recipeTitle').value.trim());
    formData.append('recipeImage', document.getElementById('recipeFile').files[0]);
    formData.append('desc', document.getElementById('recipeDesc').value.trim());
    formData.append('userId', currentUser.id);
    formData.append('author', currentUser.username);
    formData.append('userAvatar', currentUser.avatar);

    const res = await fetch(`${SERVER_URL}/api/recipes`, { method: 'POST', body: formData });
    if (res.ok) {
        document.getElementById('recipeForm').reset();
        toggleModal(false);
        loadFeed();
    }
});

async function deleteRecipe(id) {
    if (confirm('Удалить этот пост?')) {
        await fetch(`${SERVER_URL}/api/recipes/${id}`, { method: 'DELETE' });
        loadFeed();
    }
}

// ЖИВОЙ ЧАТ (ТОЧНОЕ РУССКОЕ ВРЕМЯ)
async function loadChat() {
    if (activeScreen !== 'chat') return;
    try {
        const res = await fetch(`${SERVER_URL}/api/chat`);
        const messages = await res.json();
        
        const shouldScroll = chatMessages.scrollTop + chatMessages.clientHeight >= chatMessages.scrollHeight - 60;

        chatMessages.innerHTML = '';
        messages.forEach(m => {
            const isMe = m.userId === currentUser.id;
            const row = document.createElement('div');
            row.className = `chat-msg-row ${isMe ? 'my-msg' : ''}`;
            row.innerHTML = `
                <div class="avatar">${m.avatar}</div>
                <div class="chat-text-box">
                    <div class="chat-sender-name">${m.username}</div>
                    <div class="chat-text">${m.text}</div>
                    <span class="chat-msg-time">${m.time}</span>
                </div>
            `;
            chatMessages.appendChild(row);
        });

        if (shouldScroll || chatMessages.innerHTML === '') {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    } catch (e) {}
}

// ОТПРАВКА СООБЩЕНИЙ С КОРРЕКТНЫМ РУССКИМ ВРЕМЕНЕМ
function sendChatMessage() {
    const input = document.getElementById('chatInput');
    const text = input.value.trim();
    if (!text) return;

    // 🎯 ИСПРАВЛЕНО: Выводим системное время в строгом русском формате (ЧЧ:ММ), например 14:03
    const russianTime = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

    fetch(`${SERVER_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            userId: currentUser.id, 
            username: currentUser.username, 
            avatar: currentUser.avatar, 
            text: text,
            time: russianTime 
        })
    }).then(() => {
        input.value = '';
        loadChat();
    });
}

document.getElementById('chatSendBtn').addEventListener('click', sendChatMessage);
document.getElementById('chatInput').addEventListener('keypress', (e) => { if(e.key === 'Enter') sendChatMessage(); });

// УМНЫЕ РЕАКЦИИ
async function toggleReaction(recipeId, type) {
    const key = `reaction_${recipeId}`;
    const prev = localStorage.getItem(key);
    let action = 'add';
    if (prev === type) { action = 'remove'; localStorage.removeItem(key); }
    else {
        if (prev) await fetch(`${SERVER_URL}/api/recipes/${recipeId}/reaction`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: prev, action: 'remove' }) });
        localStorage.setItem(key, type);
    }
    await fetch(`${SERVER_URL}/api/recipes/${recipeId}/reaction`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: type, action: action }) });
    loadFeed();
}

// НАВИГАЦИЯ НИЖНЕЙ ПАНЕЛИ
function showScreen(screen) {
    activeScreen = screen;
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    document.getElementById(screen + 'Link').classList.add('active');

    document.getElementById('feedContainer').style.display = (screen === 'feed' || screen === 'profile') ? 'flex' : 'none';
    document.getElementById('profileContainer').style.display = screen === 'profile' ? 'block' : 'none';
    document.getElementById('chatContainer').style.display = screen === 'chat' ? 'flex' : 'none';

    if (screen === 'profile') {
        document.getElementById('profileName').textContent = currentUser.username;
        document.getElementById('profileAvatar').textContent = currentUser.avatar;
        document.getElementById('profileBio').textContent = currentUser.bio;
    }
    
    if (screen === 'chat') {
        loadChat();
    } else {
        loadFeed();
    }
}

function toggleModal(show) { document.getElementById('modalOverlay').style.display = show ? 'flex' : 'none'; }

function startPolling() {
    setInterval(() => {
        if (activeScreen === 'chat') loadChat();
        else loadFeed();
    }, 2000);
}

checkLogin();
