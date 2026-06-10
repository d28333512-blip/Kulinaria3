const SERVER_URL = 'http://localhost:3000';

const feedContainer = document.getElementById('feedContainer');
const recipeForm = document.getElementById('recipeForm');
const modalOverlay = document.getElementById('modalOverlay');

// Загрузка всей ленты рецептов
async function loadFeed() {
    try {
        const res = await fetch(`${SERVER_URL}/api/recipes`);
        const recipes = await res.json();
        
        feedContainer.innerHTML = '';
        
        if (recipes.length === 0) {
            // Лента теперь будет абсолютно чистой на старте, как вы и просили!
            feedContainer.innerHTML = `
                <div style="text-align:center; padding: 40px; color:#a0a5b5;">
                    <p style="font-size: 1.2rem; margin-bottom: 10px;">🍊 Тут пока ничего нет</p>
                    <p style="font-size: 0.9rem;">Станьте самым первым кулинаром! Нажмите кнопку выше и выложите фото.</p>
                </div>`;
            return;
        }

        recipes.forEach(recipe => {
            const card = document.createElement('div');
            card.className = 'recipe-card';
            card.innerHTML = `
                <!-- Подставляем прямую ссылку на скачанный файл с нашего сервера -->
                <img src="${SERVER_URL}${recipe.img}" alt="${recipe.title}">
                <div class="recipe-content">
                    <h2>${recipe.title}</h2>
                    <p>${recipe.desc}</p>
                    <div class="card-actions">
                        <button class="like-btn" onclick="likeRecipe('${recipe.id}')" id="like-${recipe.id}">
                            ❤️ <span>${recipe.likes}</span>
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

// Отправка рецепта с реальным файлом картинки
recipeForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const title = document.getElementById('recipeTitle').value.trim();
    const fileInput = document.getElementById('recipeFile');
    const desc = document.getElementById('recipeDesc').value.trim();

    // Создаем специальный контейнер для отправки файлов на сервер
    const formData = new FormData();
    formData.append('title', title);
    formData.append('recipeImage', fileInput.files[0]); // Передаем сам файл
    formData.append('desc', desc);

    try {
        const res = await fetch(`${SERVER_URL}/api/recipes`, {
            method: 'POST',
            body: formData // Передаем formData (заголовки Content-Type ставить не нужно, браузер сделает всё сам)
        });

        if (res.ok) {
            recipeForm.reset();
            toggleModal(false);
            loadFeed(); // Обновляем скролл-ленту
        }
    } catch (err) {
        alert('Не удалось опубликовать рецепт.');
    }
});

async function likeRecipe(id) {
    try {
        const res = await fetch(`${SERVER_URL}/api/recipes/${id}/like`, { method: 'POST' });
        if (res.ok) {
            const data = await res.json();
            const btn = document.getElementById(`like-${id}`);
            btn.querySelector('span').textContent = data.likes;
            btn.classList.toggle('liked');
        }
    } catch (err) {}
}

function toggleModal(show) {
    modalOverlay.style.display = show ? 'flex' : 'none';
}

loadFeed();
