(function () {
  // ✅ Работаем только на Twitch
  if (!/^(https?:\/\/)?([\w-]+\.)?twitch\.tv$/.test(location.hostname)) return;

  const GITHUB_API_URL = 'https://api.github.com/repos/ikuza47/twitchtweaks/releases/latest';
  const RELEASE_PAGE_URL = 'https://github.com/ikuza47/TwitchTweaks/releases/latest';
  const CHECK_INTERVAL_KEY = 'twitchtweaks_last_update_check';
  const UPDATE_AVAILABLE_KEY = 'twitchtweaks_update_available';
  const UPDATE_DATA_KEY = 'twitchtweaks_update_data';

  // ✅ Проверяем, находимся ли мы на странице настроек
  const isOptionsPage = location.pathname === '/options.html' || location.pathname.endsWith('/options.html');

  /**
   * Получить текущую версию расширения из manifest.json
   * @returns {Promise<string>}
   */
  async function getCurrentVersion() {
    return new Promise((resolve) => {
      const manifestData = chrome.runtime.getManifest();
      resolve(manifestData.version);
    });
  }

  /**
   * Сравнить две версии
   * @param {string} v1 Текущая версия
   * @param {string} v2 Версия с GitHub (теперь из tag_name)
   * @returns {boolean} true если v2 > v1
   */
  function isUpdateAvailable(v1, v2) {
    try {
      // ✅ Убираем возможный префикс 'v' у обеих версий
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

      // ✅ Теперь берём tagName из tag_name
      const tagName = data.tag_name || '';
      if (!tagName) {
        throw new Error('Empty tag_name in GitHub response');
      }

      // ✅ Берём ссылку на скачивание из assets[0].browser_download_url
      let downloadUrl = '';
      if (data.assets && data.assets[0] && data.assets[0].browser_download_url) {
        downloadUrl = data.assets[0].browser_download_url;
      } else {
        // fallback
        downloadUrl = `https://github.com/ikuza47/TwitchTweaks/releases/download/${tagName}/TwitchTweaks.zip`;
      }

      return {
        tagName: tagName,
        name: data.name || tagName,
        html_url: data.html_url || '',
        download_url: downloadUrl
      };
    } catch (error) {
      console.error('[TwitchTweaks] Failed to check for updates:', error);
      return null;
    }
  }

  /**
   * Показать уведомление об обновлении
   * @param {Object} updateData
   */
  function showUpdateNotification(updateData) {
    // Удаляем старое уведомление, если есть
    const oldNotification = document.getElementById('twitchtweaks-update-notification');
    if (oldNotification) {
      oldNotification.remove();
    }

    const notification = document.createElement('div');
    notification.id = 'twitchtweaks-update-notification';
    notification.style.position = 'fixed';
    notification.style.bottom = '20px';
    notification.style.right = '20px';
    notification.style.width = '320px';
    notification.style.background = '#18181b';
    notification.style.color = '#efeff1';
    notification.style.border = '1px solid #3f3f46';
    notification.style.borderRadius = '8px';
    notification.style.padding = '12px';
    notification.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif';
    notification.style.fontSize = '13px';
    notification.style.zIndex = '2147483647';
    notification.style.boxShadow = '0 4px 12px rgba(0,0,0,0.5)';
    notification.style.overflow = 'hidden';
    notification.style.display = 'flex';
    notification.style.flexDirection = 'column';

    // --- HEADER WITH CLOSE BUTTON ---
    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    header.style.marginBottom = '8px';

    const title = document.createElement('div');
    title.style.fontWeight = 'bold';
    title.style.color = '#FF6B35'; // Огненный цвет
    title.textContent = 'Доступно обновление TwitchTweaks';

    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '×';
    closeBtn.style.background = 'none';
    closeBtn.style.border = 'none';
    closeBtn.style.color = '#a9a9b3';
    closeBtn.style.fontSize = '18px';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.padding = '0';
    closeBtn.style.width = '20px';
    closeBtn.style.height = '20px';
    closeBtn.style.display = 'flex';
    closeBtn.style.alignItems = 'center';
    closeBtn.style.justifyContent = 'center';
    closeBtn.addEventListener('click', () => {
      notification.remove();
      // Сбрасываем флаг обновления
      localStorage.removeItem(UPDATE_AVAILABLE_KEY);
      localStorage.removeItem(UPDATE_DATA_KEY);
    });

    header.appendChild(title);
    header.appendChild(closeBtn);
    notification.appendChild(header);
    // --- END HEADER ---

    const message = document.createElement('div');
    message.style.fontSize = '12px';
    message.style.color = '#a9a9b3';
    message.style.marginBottom = '12px';
    message.textContent = `Новая версия: ${updateData.name}`;

    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.gap = '8px';
    buttonContainer.style.flexDirection = 'column';

    // ✅ Кнопка "Скачать" с динамической ссылкой
    const downloadBtn = document.createElement('button');
    downloadBtn.textContent = 'Скачать (.zip)';
    downloadBtn.style.padding = '6px 12px';
    downloadBtn.style.border = 'none';
    downloadBtn.style.borderRadius = '4px';
    downloadBtn.style.background = '#FF6B35';
    downloadBtn.style.color = '#fff';
    downloadBtn.style.cursor = 'pointer';
    downloadBtn.style.fontSize = '12px';
    downloadBtn.style.fontWeight = '600';
    downloadBtn.addEventListener('click', () => {
      window.open(updateData.download_url, '_blank', 'noopener,noreferrer'); // ✅ Используем download_url
      notification.remove();
      // Сбрасываем флаг обновления
      localStorage.removeItem(UPDATE_AVAILABLE_KEY);
      localStorage.removeItem(UPDATE_DATA_KEY);
    });

    const releasePageBtn = document.createElement('button');
    releasePageBtn.textContent = 'Об обновлении (GitHub)';
    releasePageBtn.style.padding = '6px 12px';
    releasePageBtn.style.border = '1px solid #3f3f46';
    releasePageBtn.style.borderRadius = '4px';
    releasePageBtn.style.background = 'transparent';
    releasePageBtn.style.color = '#a9a9b3';
    releasePageBtn.style.cursor = 'pointer';
    releasePageBtn.style.fontSize = '12px';
    releasePageBtn.addEventListener('click', () => {
      window.open(updateData.html_url, '_blank', 'noopener,noreferrer');
    });

    buttonContainer.appendChild(downloadBtn);
    buttonContainer.appendChild(releasePageBtn);

    notification.appendChild(message);
    notification.appendChild(buttonContainer);

    document.body.appendChild(notification);
  }

  /**
   * Добавить кнопку обновления на страницу настроек
   * @param {Object} updateData
   */
  function addUpdateButtonToOptions(updateData) {
    // Ищем форму настроек
    const settingsForm = document.querySelector('.tt-settings-form') || document.body;
    
    // Создаем секцию с кнопкой обновления
    const updateSection = document.createElement('section');
    updateSection.className = 'tt-setting-section';
    updateSection.style.order = '100'; // Ставим в конец

    const sectionTitle = document.createElement('h2');
    sectionTitle.className = 'tt-section-title';
    sectionTitle.textContent = 'Доступно обновление';
    sectionTitle.style.color = '#FF6B35';

    const itemDiv = document.createElement('div');
    itemDiv.className = 'tt-setting-item';

    const label = document.createElement('div');
    label.className = 'tt-label';
    label.textContent = `Найдена новая версия: ${updateData.name}`;
    label.style.color = '#a9a9b3';
    label.style.marginBottom = '10px';

    // ✅ Кнопка "Скачать" с динамической ссылкой
    const downloadBtn = document.createElement('button');
    downloadBtn.type = 'button';
    downloadBtn.className = 'tt-select'; // Используем стиль селекта для кнопки
    downloadBtn.style.backgroundColor = '#FF6B35';
    downloadBtn.style.borderColor = '#FF6B35';
    downloadBtn.style.color = '#fff';
    downloadBtn.style.cursor = 'pointer';
    downloadBtn.style.textAlign = 'center';
    downloadBtn.textContent = 'Скачать обновление (.zip)';
    downloadBtn.addEventListener('click', () => {
      window.open(updateData.download_url, '_blank', 'noopener,noreferrer'); // ✅ Используем download_url
    });

    const releasePageBtn = document.createElement('button');
    releasePageBtn.type = 'button';
    releasePageBtn.className = 'tt-select';
    releasePageBtn.style.backgroundColor = 'transparent';
    releasePageBtn.style.borderColor = '#3f3f46';
    releasePageBtn.style.color = '#a9a9b3';
    releasePageBtn.style.cursor = 'pointer';
    releasePageBtn.style.textAlign = 'center';
    releasePageBtn.style.marginTop = '8px';
    releasePageBtn.textContent = 'Посмотреть на GitHub';
    releasePageBtn.addEventListener('click', () => {
      window.open(updateData.html_url, '_blank', 'noopener,noreferrer');
    });

    itemDiv.appendChild(label);
    itemDiv.appendChild(downloadBtn);
    itemDiv.appendChild(releasePageBtn);
    updateSection.appendChild(sectionTitle);
    updateSection.appendChild(itemDiv);

    // Добавляем в начало формы или в конец body
    settingsForm.insertBefore(updateSection, settingsForm.firstChild);
  }

  /**
   * Основная логика проверки обновлений
   */
  async function runUpdateCheck() {
    try {
      // Получаем настройки
      const settings = await new Promise(resolve => {
        chrome.storage.sync.get(['checkUpdates', 'showUpdateNotification'], (result) => {
          resolve({
            checkUpdates: result.checkUpdates !== false, // по умолчанию true
            showUpdateNotification: result.showUpdateNotification !== false // по умолчанию true
          });
        });
      });

      // Если проверка обновлений отключена - выходим
      if (!settings.checkUpdates) {
        console.log('[TwitchTweaks] Update checks are disabled.');
        return;
      }

      const now = Date.now();
      const lastCheck = parseInt(localStorage.getItem(CHECK_INTERVAL_KEY), 10) || 0;
      const oneDay = 60 * 1000;

      // Проверяем, прошел ли день с последней проверки
      if (now - lastCheck < oneDay) {
        // Смотрим, не было ли сохранено обновление ранее
        const wasUpdateAvailable = localStorage.getItem(UPDATE_AVAILABLE_KEY) === 'true';
        if (wasUpdateAvailable) {
          const updateDataRaw = localStorage.getItem(UPDATE_DATA_KEY);
          if (updateDataRaw) {
            try {
              const updateData = JSON.parse(updateDataRaw);
              handleUpdateAvailable(updateData, settings);
              return;
            } catch (e) {
              console.warn('[TwitchTweaks] Failed to parse cached update ', e);
            }
          }
        }
        console.log('[TwitchTweaks] Update check skipped (less than a day since last check).');
        return;
      }

      // Получаем текущую версию
      const currentVersion = await getCurrentVersion();
      console.log(`[TwitchTweaks] Current version: ${currentVersion}`);

      // Проверяем GitHub
      const updateInfo = await checkForUpdates();
      if (!updateInfo) {
        console.log('[TwitchTweaks] Could not fetch update info from GitHub.');
        return;
      }

      console.log(`[TwitchTweaks] Latest version on GitHub: ${updateInfo.tagName}`);

      // Сохраняем время последней проверки
      localStorage.setItem(CHECK_INTERVAL_KEY, now.toString());

      // Сравниваем версии (теперь по tag_name)
      if (isUpdateAvailable(currentVersion, updateInfo.tagName)) {
        console.log('[TwitchTweaks] Update is available!');
        // Сохраняем информацию об обновлении
        localStorage.setItem(UPDATE_AVAILABLE_KEY, 'true');
        localStorage.setItem(UPDATE_DATA_KEY, JSON.stringify(updateInfo));
        handleUpdateAvailable(updateInfo, settings);
      } else {
        console.log('[TwitchTweaks] No update available.');
        // Сбрасываем флаг, если обновление больше не нужно
        localStorage.removeItem(UPDATE_AVAILABLE_KEY);
        localStorage.removeItem(UPDATE_DATA_KEY);
      }
    } catch (error) {
      console.error('[TwitchTweaks] Error during update check:', error);
    }
  }

  /**
   * Обработчик наличия обновления
   * @param {Object} updateData
   * @param {Object} settings
   */
  function handleUpdateAvailable(updateData, settings) {
    if (isOptionsPage) {
      // На странице настроек показываем кнопку
      addUpdateButtonToOptions(updateData);
    } else {
      // На других страницах Twitch показываем уведомление (если включено)
      if (settings.showUpdateNotification) {
        showUpdateNotification(updateData);
      }
    }
  }

  // Запускаем проверку
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runUpdateCheck);
  } else {
    runUpdateCheck();
  }
})();