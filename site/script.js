// Простой скрипт для плавного скролла к якорям
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();

        const targetId = this.getAttribute('href');
        if (targetId === '#') return;

        const targetElement = document.querySelector(targetId);
        if (targetElement) {
            window.scrollTo({
                top: targetElement.offsetTop - 100, // Учитываем высоту sticky навигации
                behavior: 'smooth'
            });
        }
    });
});

// Анимация появления карточек и шагов при скролле
const observerOptions = {
    threshold: 0.1, // Срабатывает, когда 10% элемента в области видимости
    rootMargin: '0px 0px -100px 0px' // Начинаем анимацию чуть раньше
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('reveal');
            // Отключаем наблюдение за этим элементом после срабатывания
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

// Наблюдаем за карточками фич
document.querySelectorAll('.feature-card').forEach(card => {
    observer.observe(card);
});

// Наблюдаем за шагами инсталляции
document.querySelectorAll('.step').forEach(step => {
    observer.observe(step);
});

// Функционал вкладок установки
document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', () => {
        const targetTabId = button.getAttribute('data-tab');

        // Снимаем активность со всех кнопок и контента
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelectorAll('.install-tab-content').forEach(content => {
            content.classList.remove('active');
        });

        // Делаем активной выбранную кнопку и соответствующий контент
        button.classList.add('active');
        document.getElementById(targetTabId).classList.add('active');
    });
});

// Пример добавления эффекта при загрузке
document.addEventListener('DOMContentLoaded', () => {
    console.log('TwitchTweaks page loaded with new dark theme, animations, and tabs.');
    // Анимация для элементов героя уже задана через CSS
});