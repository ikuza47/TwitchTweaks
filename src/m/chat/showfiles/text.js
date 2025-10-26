(function () {
  if (!/^(https?:\/\/)?([\w-]+\.)?twitch\.tv$/.test(location.hostname)) return;

  const TEXT_URL_REGEX = /\.(txt|log|js|json|xml|html|htm|css|csv|md|yml|yaml|ini|toml|py|cpp|c|java|ts|tsv|sql|sh|bash|bat|ps1|cfg|conf|rtf|tex|org)(\?.*)?$/i;

  const CACHE_KEY = 'twitchtweaks_text_cache_v1';
  const MAX_CACHE_SIZE = 200;

  function loadCache() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      console.warn('[TwitchTweaks] Failed to load text cache from localStorage', e);
      return {};
    }
  }

  function saveCache(cache) {
    try {
      const keys = Object.keys(cache);
      if (keys.length > MAX_CACHE_SIZE) {
        const toRemove = keys.slice(0, keys.length - MAX_CACHE_SIZE);
        toRemove.forEach(k => delete cache[k]);
      }
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch (e) {
      console.warn('[TwitchTweaks] Failed to save text cache to localStorage', e);
    }
  }

  let textCache = loadCache();

  function isTextUrl(url) {
    try {
      const parsed = new URL(url);
      return TEXT_URL_REGEX.test(parsed.pathname);
    } catch {
      return false;
    }
  }

  async function fetchTextContent(url) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (err) {
      console.warn('[TwitchTweaks] Failed to fetch text content', err);
      return null;
    }
  }

  function createTextBlock(content, originalUrl) {
    const container = document.createElement('div');
    container.style.width = '100%';
    container.style.maxWidth = '600px';
    container.style.aspectRatio = '1'; // Квадратное соотношение 1:1
    container.style.border = '1px solid #3f3f46';
    container.style.borderRadius = '4px';
    container.style.overflow = 'hidden';
    container.style.background = '#18181b';
    container.style.color = '#efeff1';
    container.style.fontFamily = 'monospace, monospace';
    container.style.fontSize = '13px';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';

    // Внутренний контейнер для текста (занимает всё, кроме кнопок)
    const textContainer = document.createElement('div');
    textContainer.style.flex = '1';
    textContainer.style.overflow = 'auto';
    textContainer.style.padding = '12px';
    textContainer.style.whiteSpace = 'pre-wrap';
    textContainer.style.wordBreak = 'break-word';
    textContainer.textContent = content;

    // Кнопки
    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.gap = '8px';
    buttonContainer.style.padding = '8px';
    buttonContainer.style.borderTop = '1px solid #3f3f46';
    buttonContainer.style.background = '#2a2a2e';

    const copyBtn = document.createElement('button');
    copyBtn.textContent = 'Скопировать';
    copyBtn.style.flex = '1';
    copyBtn.style.padding = '6px 12px';
    copyBtn.style.border = 'none';
    copyBtn.style.borderRadius = '4px';
    copyBtn.style.background = '#9146ff';
    copyBtn.style.color = '#fff';
    copyBtn.style.cursor = 'pointer';
    copyBtn.style.fontSize = '12px';
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(content).then(() => {
        const oldText = copyBtn.textContent;
        copyBtn.textContent = 'Скопировано!';
        setTimeout(() => copyBtn.textContent = oldText, 2000);
      });
    });

    const openBtn = document.createElement('button');
    openBtn.textContent = 'Открыть';
    openBtn.style.flex = '1';
    openBtn.style.padding = '6px 12px';
    openBtn.style.border = 'none';
    openBtn.style.borderRadius = '4px';
    openBtn.style.background = '#3f3f46';
    openBtn.style.color = '#fff';
    openBtn.style.cursor = 'pointer';
    openBtn.style.fontSize = '12px';
    openBtn.addEventListener('click', () => {
      window.open(originalUrl, '_blank', 'noopener,noreferrer');
    });

    buttonContainer.appendChild(copyBtn);
    buttonContainer.appendChild(openBtn);
    container.appendChild(textContainer);
    container.appendChild(buttonContainer);

    return container;
  }

  async function replaceLinkWithText(link) {
    const url = link.href;

    // ✅ Проверяем, находится ли ссылка внутри уведомления upload.js
    if (link.closest('#twitchtweaks-notification')) {
      return;
    }

    if (link.dataset.textProcessed) return;
    link.dataset.textProcessed = 'true';

    if (!isTextUrl(url)) return;

    let content = null;

    if (textCache[url]) {
      content = textCache[url].content;
    } else {
      content = await fetchTextContent(url);
      if (content) {
        textCache[url] = { content };
        saveCache(textCache);
      }
    }

    if (!content) return;

    const parent = link.parentElement;
    if (!parent) return;

    const textBlock = createTextBlock(content, url);
    parent.replaceChild(textBlock, link);
  }

  async function processNewMessages(mutations) {
    // ✅ Получаем настройки из хранилища
    const settings = await new Promise(resolve => {
      chrome.storage.sync.get(['textLocation'], result => {
        resolve(result);
      });
    });

    // ✅ Работаем только если textLocation === 'chat'
    if (settings.textLocation !== 'chat') {
      return;
    }

    for (const mut of mutations) {
      if (mut.type !== 'childList') continue;

      for (const node of mut.addedNodes) {
        if (node.nodeType !== Node.ELEMENT_NODE) continue;

        const links = node.querySelectorAll?.('a[href]') || [];
        for (const link of links) {
          await replaceLinkWithText(link);
        }
      }
    }
  }

  const observer = new MutationObserver(processNewMessages);
  observer.observe(document.body, { childList: true, subtree: true });

  setTimeout(async () => {
    const settings = await new Promise(resolve => {
      chrome.storage.sync.get(['textLocation'], result => {
        resolve(result);
      });
    });

    if (settings.textLocation !== 'chat') return;

    const existingLinks = document.querySelectorAll('a[href]') || [];
    for (const link of existingLinks) {
      await replaceLinkWithText(link);
    }
  }, 500);
})();