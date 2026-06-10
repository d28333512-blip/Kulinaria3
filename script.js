// ВСТАВЬТЕ СЮДА СВОЮ ССЫЛКУ НА СЕРВЕР RENDER (БЕЗ КОСОЙ ЧЕРТЫ В КОНЦЕ):
const SERVER_URL = 'https://kulinaria3.onrender.com'; 

const feedContainer = document.getElementById('feedContainer');
const recipeForm = document.getElementById('recipeForm');
const modalOverlay = document.getElementById('modalOverlay');

// Загрузка ленты рецептов
async function loadFeed() {
    try {
        const res = await fetch(`${SERVER_URL}/api/recipes`);
        const recipes = await res.json();
        
        feedContainer.innerHTML = '';
        
        if (recipes.length === 0) {
            feedContainer.innerHTML = `
                <div style="text-align:center; padding: 40px; color:#a0a5b5;">
                    <p style="font-size: 1.2rem; margin-bottom: 10px;">🍊 Тут пока ничего нет</p>
                    <p style="font-size: 0.9rem;">Станьте самым первым кулинаром! Нажмите кнопку выше и выложите фото.</p>
                </div>`;
            return;
        }

        recipes.forEach(recipe => {
            // Подгружаем историю кликов пользователя из памяти браузера
            const userChoice = localStorage.getItem(`reaction_${recipe.id}`);

            const card = document.createElement('div');
            card.className = 'recipe-card';
            card.innerHTML = `
                <img src="${SERVER_URL}${recipe.img}" alt="${recipe.title}">
                <div class="recipe-content">
                    <h2>${recipe.title}</h2>
                    <p>${recipe.desc}</p>
                    
                    <!-- Панель с разными эмоциями -->
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
        feedContainer.innerHTML = '<p style="text-align:center;color:#e53935;">Ошибка подключения к серверу.</p>';
    }
}

// Умная функция: ставит только 1 лайк/реакцию или убирает её при повторном клике
async function toggleReaction(recipeId, type) {
    const storageKey = `reaction_${recipeId}`;
    const previousReaction = localStorage.getItem(storageKey);

    let action = 'add';

    // Если кликнули на то же самое — убираем лайк
    if (previousReaction === type) {
        action = 'remove';
        localStorage.removeItem(storageKey);
    } else {
        // Если уже стояла другая реакция — сначала убираем её (запрещаем ставить много реакций на один пост)
        if (previousReaction) {
            await fetch(`${SERVER_URL}/api/recipes/${recipeId}/reaction`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: previousReaction, action: 'remove' })
            });
        }
        localStorage.setItem(storageKey, type);
    }

    // Отправляем текущее действие на сервер Render
    try {
        const res = await fetch(`${SERVER_URL}/api/recipes/${recipeId}/reaction`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type, action })
        });

        if (res.ok) {
            loadFeed(); // Мгновенно перерисовываем ленту со свежими цифрами
        }
    } catch (err) {
        console.error("Не удалось отправить реакцию на сервер:", err);
    }
}

// Отправка формы рецепта
recipeForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const title = document.getElementById('recipeTitle').value.trim();
    const fileInput = document.getElementById('recipeFile');
    const desc = document.getElementById('recipeDesc').value.trim();

    const formData = new FormData();
    formData.append('title', title);
    formData.append('recipeImage', fileInput.files[0]);
    formData.append('desc', desc);

    try {
        const res = await fetch(`${SERVER_URL}/api/recipes`, {
            method: 'POST',
            body: formData
        });

        if (res.ok) {
            recipeForm.reset();
            toggleModal(false);
            loadFeed();
        }
    } catch (err) {
        alert('Не удалось опубликовать рецепт.');
    }
});

function toggleModal(show) {
    modalOverlay.style.display = show ? 'flex' : 'none';
}

loadFeed();
