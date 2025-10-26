// === Переводы ===
const TRANSLATIONS = {
  en: {
    settingsPageSubtitle: "Customize your Twitch experience",
    notificationsTitle: "Notifications",
    showNotificationLabel: "Show General Notifications",
    showUploadNotificationLabel: "Show Upload Notifications",
    showUpdateNotificationLabel: "Show Update Notifications",
    displayTitle: "Display Settings",
    imageLocationLabel: "Image Location",
    osuLocationLabel: "Osu! Map Location",
    textLocationLabel: "Text Window Location",
    locationChat: "In Chat",
    locationPanel: "In Panel",
    locationDisabled: "Disabled",
    updatesTitle: "Updates",
    checkUpdatesLabel: "Check for Updates",
    downloadUpdateLabel: "Download Latest Update",
    downloadUpdateBtnText: "Download Update",
    updateChecking: "Checking for updates...",
    updateAvailable: "Update available! Click to download.",
    updateNotAvailable: "No updates available.",
    updateError: "Error checking for updates."
  },
  ru: {
    settingsPageSubtitle: "Настройте свой опыт Twitch",
    notificationsTitle: "Уведомления",
    showNotificationLabel: "Показывать общие уведомления",
    showUploadNotificationLabel: "Показывать уведомления о загрузке",
    showUpdateNotificationLabel: "Показывать уведомления об обновлениях",
    displayTitle: "Настройки отображения",
    imageLocationLabel: "Расположение изображений",
    osuLocationLabel: "Расположение Osu! карт",
    textLocationLabel: "Расположение текстового окна",
    locationChat: "В чате",
    locationPanel: "В панели",
    locationDisabled: "Выключено",
    updatesTitle: "Обновления",
    checkUpdatesLabel: "Проверка обновлений",
    downloadUpdateLabel: "Скачать последнее обновление",
    downloadUpdateBtnText: "Скачать обновление",
    updateChecking: "Проверка обновлений...",
    updateAvailable: "Доступно обновление! Нажмите, чтобы скачать.",
    updateNotAvailable: "Нет доступных обновлений.",
    updateError: "Ошибка проверки обновлений."
  }
};

// === Настройки и их значения по умолчанию ===
const DEFAULT_SETTINGS = {
  showNotification: true,
  showUploadNotification: true,
  showUpdateNotification: true,
  imageLocation: 'chat',
  osuLocation: 'panel',
  textLocation: 'chat',
  checkUpdates: true,
  language: 'en'
};

// === DOM Elements ===
let elements = {};

// === URLs ===
const GITHUB_API_URL = 'https://api.github.com/repos/ikuza47/twitchtweaks/releases/latest';
const RELEASE_PAGE_URL = 'https://github.com/ikuza47/TwitchTweaks/releases/latest';
// ✅ DOWNLOAD_URL теперь будет браться из API
let DYNAMIC_DOWNLOAD_URL = ''; 

// === Utility Functions ===

/**
 * Получить текущий язык интерфейса
 * @returns {string} Код языка ('en', 'ru')
 */
function getCurrentLanguage() {
  return elements.languageSelect?.value || 'en';
}

/**
 * Обновить текст на странице в соответствии с выбранным языком
 * @param {string} langCode Код языка
 */
function updateUIText(langCode) {
  const t = TRANSLATIONS[langCode] || TRANSLATIONS.en;
  
  // Обновляем элементы с атрибутом data-i18n
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (t[key]) {
      el.textContent = t[key];
    }
  });

  // Обновляем текст внутри <option> в <select>
  document.querySelectorAll('option[data-i18n]').forEach(option => {
    const key = option.getAttribute('data-i18n');
    if (t[key]) {
      option.textContent = t[key];
    }
  });
}

/**
 * Сохранить настройку в chrome.storage.sync
 * @param {string} key Ключ настройки
 * @param {*} value Значение
 */
function saveSetting(key, value) {
  const obj = {};
  obj[key] = value;
  chrome.storage.sync.set(obj, () => {
    if (chrome.runtime.lastError) {
      console.error(`[TwitchTweaks Options] Error saving ${key}:`, chrome.runtime.lastError);
    } else {
      console.log(`[TwitchTweaks Options] Setting saved: ${key} =`, value);
    }
  });
}

/**
 * Загрузить настройки из chrome.storage.sync
 * @returns {Promise<Object>} Объект с настройками
 */
async function loadSettings() {
  return new Promise((resolve) => {
    const keys = Object.keys(DEFAULT_SETTINGS);
    chrome.storage.sync.get(keys, (result) => {
      if (chrome.runtime.lastError) {
        console.error('[TwitchTweaks Options] Error loading settings:', chrome.runtime.lastError);
        resolve({});
      } else {
        console.log('[TwitchTweaks Options] Settings loaded:', result);
        resolve(result);
      }
    });
  });
}

/**
 * Применить настройки к элементам интерфейса
 * @param {Object} settings Объект с настройками
 */
function applySettingsToUI(settings) {
  for (const [key, schema] of Object.entries(DEFAULT_SETTINGS)) {
    const element = elements[key];
    if (!element) continue;

    const value = settings[key];
    const finalValue = value !== undefined ? value : schema;

    if (element.type === 'checkbox') {
      element.checked = finalValue;
    } else if (element.tagName === 'SELECT') {
      element.value = finalValue;
    }
  }

  // После применения всех настроек, обновляем язык UI
  const currentLang = settings.language || DEFAULT_SETTINGS.language;
  updateUIText(currentLang);
  if (elements.languageSelect) {
    elements.languageSelect.value = currentLang; // Убедиться, что селект тоже обновлён
  }
}

// === Update Check Logic (for Options Page) ===

/**
 * Сравнить две версии по tag_name
 * @param {string} v1 Текущая версия
 * @param {string} v2 Версия с GitHub (tag_name)
 * @returns {boolean} true если v2 > v1
 */
function isUpdateAvailable(v1, v2) {
  try {
    // Убираем возможный префикс 'v'
    const cleanV1 = v1.startsWith('v') ? v1.substring(1) : v1;
    const cleanV2 = v2.startsWith('v') ? v2.substring(1) : v2;

    const parts1 = cleanV1.split('.').map(Number);
    const parts2 = cleanV2.split('.').map(Number);

    const maxLength = Math.max(parts1.length, parts2.length);

    for (let i = 0; i < maxLength; i++) {
      const num1 = parts1[i] || 0;
      const num2 = parts2[i] || 0;

      if (num2 > num1) return true;
      if (num2 < num1) return false;
    }

    return false; // Версии равны
  } catch (e) {
    console.warn('[TwitchTweaks] Error comparing versions:', e);
    return false;
  }
}

/**
 * Проверить наличие обновлений через GitHub API
 * @returns {Promise<{tagName: string, name: string, html_url: string, download_url: string} | null>}
 */
async function checkForUpdates() {
  try {
    const response = await fetch(GITHUB_API_URL);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();

    // ✅ Используем tag_name
    const tagName = data.tag_name || '';
    if (!tagName) {
      throw new Error('Empty tag_name in GitHub response');
    }

    // ✅ Получаем download_url из assets
    let downloadUrl = '';
    if (data.assets && data.assets[0] && data.assets[0].browser_download_url) {
      downloadUrl = data.assets[0].browser_download_url;
    } else {
      // fallback если assets пуст
      downloadUrl = `https://github.com/ikuza47/TwitchTweaks/releases/download/${tagName}/TwitchTweaks.zip`;
    }

    return {
      tagName: tagName,
      name: data.name || tagName,
      html_url: data.html_url || '',
      download_url: downloadUrl // ✅ Новое поле
    };
  } catch (error) {
    console.error('[TwitchTweaks] Failed to check for updates:', error);
    return null;
  }
}

/**
 * Обновить состояние кнопки обновления
 * @param {boolean|null} isAvailable true/false/null
 * @param {string} [message]
 */
function updateDownloadButtonState(isAvailable, message = '') {
  const btn = elements.downloadUpdateBtn;
  const status = document.getElementById('updateStatus');
  if (!btn || !status) return;

  if (isAvailable === true) {
    btn.disabled = false;
    btn.classList.add('tt-button-primary');
    btn.classList.remove('tt-button-disabled');
    status.textContent = message || 'Update available!';
    status.style.color = '#FF6B35'; // Огненный цвет
  } else if (isAvailable === false) {
    btn.disabled = true;
    btn.classList.remove('tt-button-primary');
    btn.classList.add('tt-button-disabled');
    status.textContent = message || 'No updates available.';
    status.style.color = '#a9a9b3'; // Серый
  } else {
    // Неизвестно / проверка
    btn.disabled = true;
    btn.classList.remove('tt-button-primary');
    btn.classList.add('tt-button-disabled');
    status.textContent = message;
    status.style.color = '#a9a9b3';
  }
}

/**
 * Проверить обновления при запуске (если включено)
 */
async function checkForUpdatesOnStartup() {
  const settings = await loadSettings();
  if (!settings.checkUpdates) {
    console.log('[TwitchTweaks] Update checks are disabled in settings.');
    updateDownloadButtonState(false, 'Update checks are disabled.');
    return;
  }

  updateDownloadButtonState(null, 'Checking for updates...');
  const manifest = chrome.runtime.getManifest();
  const currentVersion = manifest.version;
  console.log(`[TwitchTweaks] Current version: ${currentVersion}`);

  const updateInfo = await checkForUpdates();
  if (!updateInfo) {
    updateDownloadButtonState(false, 'Error checking for updates.');
    return;
  }

  console.log(`[TwitchTweaks] Latest version on GitHub: ${updateInfo.tagName}`);

  if (isUpdateAvailable(currentVersion, updateInfo.tagName)) {
    console.log('[TwitchTweaks] Update is available!');
    // ✅ Сохраняем динамическую ссылку для кнопки
    DYNAMIC_DOWNLOAD_URL = updateInfo.download_url;
    updateDownloadButtonState(true, `Update available: ${updateInfo.tagName}`);
  } else {
    console.log('[TwitchTweaks] No update available.');
    DYNAMIC_DOWNLOAD_URL = '';
    updateDownloadButtonState(false, 'No updates available.');
  }
}

// === Event Listeners ===

/**
 * Добавить обработчики событий для автоматического сохранения
 */
function setupEventListeners() {
  // Для чекбоксов и селектов
  for (const [key, element] of Object.entries(elements)) {
    if (!element) continue;

    if (element.type === 'checkbox') {
      element.addEventListener('change', (e) => {
        saveSetting(key, e.target.checked);
        // Если меняется язык, обновляем UI
        if (key === 'language') {
          updateUIText(e.target.value);
        }
        // Если включается checkUpdates, запускаем проверку
        if (key === 'checkUpdates' && e.target.checked) {
          checkForUpdatesOnStartup();
        }
      });
    } else if (element.tagName === 'SELECT') {
      element.addEventListener('change', (e) => {
        saveSetting(key, e.target.value);
        // Если меняется язык, обновляем UI
        if (key === 'language') {
          updateUIText(e.target.value);
        }
      });
    }
  }

  // Обработчик для кнопки Download Update
  if (elements.downloadUpdateBtn) {
    elements.downloadUpdateBtn.addEventListener('click', () => {
      // ✅ Открываем динамическую ссылку
      if (DYNAMIC_DOWNLOAD_URL) {
        window.open(DYNAMIC_DOWNLOAD_URL, '_blank', 'noopener,noreferrer');
      } else {
        // fallback
        window.open(RELEASE_PAGE_URL, '_blank', 'noopener,noreferrer');
      }
    });
  }
}

// === Init ===

/**
 * Инициализация страницы настроек
 */
async function init() {
  console.log('[TwitchTweaks Options] Initializing...');

  // 1. Получаем элементы DOM
  elements = {
    showNotification: document.getElementById('showNotification'),
    showUploadNotification: document.getElementById('showUploadNotification'),
    showUpdateNotification: document.getElementById('showUpdateNotification'),
    imageLocation: document.getElementById('imageLocation'),
    osuLocation: document.getElementById('osuLocation'),
    textLocation: document.getElementById('textLocation'),
    checkUpdates: document.getElementById('checkUpdates'),
    languageSelect: document.getElementById('languageSelect'),
    downloadUpdateBtn: document.getElementById('downloadUpdateBtn') // ✅ Новая кнопка
  };

  // 2. Загружаем настройки из хранилища
  const settings = await loadSettings();

  // 3. Применяем их к UI
  applySettingsToUI(settings);

  // 4. Настраиваем обработчики событий для автоматического сохранения
  setupEventListeners();

  // 5. ✅ Проверяем обновления при запуске (если включено)
  if (settings.checkUpdates !== false) {
    setTimeout(checkForUpdatesOnStartup, 500); // Небольшая задержка для полной загрузки UI
  } else {
    updateDownloadButtonState(false, 'Update checks are disabled.');
  }

  console.log('[TwitchTweaks Options] Initialization complete.');
}

// Запуск при загрузке DOM
document.addEventListener('DOMContentLoaded', init);