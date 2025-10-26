(function () {
  if (!/^(https?:\/\/)?([\w-]+\.)?twitch\.tv$/.test(location.hostname)) return;

  const TEXT_URL_REGEX = /\.(txt|log|js|json|xml|html|htm|css|csv|md|yml|yaml|ini|toml|py|cpp|c|java|ts|tsv|sql|sh|bash|bat|ps1|cfg|conf|rtf|tex|org)(\?.*)?$/i;

  const CACHE_KEY = 'twitchtweaks_text_cache_v1';
  const PANEL_STATE_KEY = 'twitchtweaks_text_panel_state_temp';
  const PINNED_STATE_KEY = 'twitchtweaks_text_pinned_temp'; // ✅ Для состояния закрепления
  const MAX_CACHE_SIZE = 200;

  let currentPanel = null;
  let currentLink = null;
  let hideTimeout = null;
  let isPinned = sessionStorage.getItem(PINNED_STATE_KEY) === 'true'; // ✅ Загружаем состояние закрепления

  function savePinState(pinned) {
    try {
      sessionStorage.setItem(PINNED_STATE_KEY, pinned.toString());
    } catch (e) {
      console.warn('[TwitchTweaks] Failed to save text pin state to sessionStorage', e);
    }
  }

  function loadPanelState() {
    try {
      const raw = sessionStorage.getItem(PANEL_STATE_KEY);
      return raw ? JSON.parse(raw) : { x: 0, y: 0, width: 320, height: 320 };
    } catch (e) {
      console.warn('[TwitchTweaks] Failed to load text panel state from sessionStorage', e);
      return { x: 0, y: 0, width: 320, height: 320 };
    }
  }

  function savePanelState(state) {
    try {
      sessionStorage.setItem(PANEL_STATE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('[TwitchTweaks] Failed to save text panel state to sessionStorage', e);
    }
  }

  let panelState = loadPanelState();

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

  function createTextPanel(link) {
    const url = link.href;

    if (currentPanel) {
      clearTimeout(hideTimeout);
      currentPanel.remove();
      currentPanel = null;
      currentLink = null;
    }

    currentLink = link;

    let content = null;

    if (textCache[url]) {
      content = textCache[url].content;
    } else {
      content = 'Загрузка...';
    }

    const rect = link.getBoundingClientRect();
    const panel = document.createElement('div');
    panel.style.position = 'fixed';
    panel.style.left = `${panelState.x || rect.left + window.scrollX}px`;
    panel.style.top = `${panelState.y || rect.top + window.scrollY}px`;
    panel.style.width = `${panelState.width}px`;
    panel.style.height = `${panelState.height}px`;
    panel.style.minWidth = '200px';
    panel.style.minHeight = '200px';
    panel.style.background = '#18181b';
    panel.style.border = '1px solid #3f3f46';
    panel.style.borderRadius = '8px';
    panel.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif';
    panel.style.fontSize = '13px';
    panel.style.zIndex = '2147483646';
    panel.style.boxShadow = '0 4px 12px rgba(0,0,0,0.5)';
    panel.style.color = '#efeff1';
    panel.style.display = 'flex';
    panel.style.flexDirection = 'column';
    panel.style.resize = 'both';
    panel.style.overflow = 'hidden';
    panel.style.cursor = 'move';

    // --- HEADER WITH PIN AND CLOSE BUTTONS ---
    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.alignItems = 'center';
    header.style.padding = '6px 10px';
    header.style.background = '#2a2a2e';
    header.style.borderBottom = '1px solid #3f3f46';
    header.style.cursor = 'move';

    const title = document.createElement('div');
    title.style.flex = '1';
    title.style.fontSize = '12px';
    title.style.fontWeight = '600';
    title.style.whiteSpace = 'nowrap';
    title.style.overflow = 'hidden';
    title.style.textOverflow = 'ellipsis';
    title.textContent = 'Text Preview';

    // --- PIN BUTTON ---
    const pinBtn = document.createElement('button');
    pinBtn.innerHTML = '📌';
    pinBtn.style.background = 'none';
    pinBtn.style.border = 'none';
    pinBtn.style.color = isPinned ? '#9146ff' : '#a9a9b3';
    pinBtn.style.fontSize = '16px';
    pinBtn.style.cursor = 'pointer';
    pinBtn.style.padding = '0';
    pinBtn.style.width = '20px';
    pinBtn.style.height = '20px';
    pinBtn.style.display = 'flex';
    pinBtn.style.alignItems = 'center';
    pinBtn.style.justifyContent = 'center';
    pinBtn.style.marginRight = '8px';
    pinBtn.title = isPinned ? 'Unpin panel' : 'Pin panel';

    pinBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      isPinned = !isPinned;
      pinBtn.style.color = isPinned ? '#9146ff' : '#a9a9b3';
      pinBtn.title = isPinned ? 'Unpin panel' : 'Pin panel';
      savePinState(isPinned);
      if (!isPinned) {
        scheduleHide();
      } else {
        clearTimeout(hideTimeout);
      }
    });
    // --- END PIN BUTTON ---

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
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      clearTimeout(hideTimeout);
      panel.remove();
      currentPanel = null;
      currentLink = null;
      savePinState(false); // Сброс при закрытии
    });

    header.appendChild(pinBtn);
    header.appendChild(title);
    header.appendChild(closeBtn);
    panel.appendChild(header);
    // --- END HEADER ---

    const contentDiv = document.createElement('div');
    contentDiv.style.flex = '1';
    contentDiv.style.overflow = 'auto';
    contentDiv.style.padding = '12px';
    contentDiv.style.whiteSpace = 'pre-wrap';
    contentDiv.style.wordBreak = 'break-word';
    contentDiv.style.fontFamily = 'monospace, monospace';
    contentDiv.textContent = content;

    panel.appendChild(contentDiv);

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
      window.open(url, '_blank', 'noopener,noreferrer');
    });

    buttonContainer.appendChild(copyBtn);
    buttonContainer.appendChild(openBtn);
    panel.appendChild(buttonContainer);

    document.body.appendChild(panel);
    currentPanel = panel;

    // ✅ Перемещение панели
    let isDragging = false;
    let offsetX, offsetY;

    header.addEventListener('mousedown', e => {
      if (e.target === closeBtn || e.target === pinBtn) return;
      isDragging = true;
      offsetX = e.clientX - panel.getBoundingClientRect().left;
      offsetY = e.clientY - panel.getBoundingClientRect().top;
      panel.style.cursor = 'grabbing';
      header.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', e => {
      if (!isDragging) return;
      const x = e.clientX - offsetX;
      const y = e.clientY - offsetY;
      panel.style.left = `${x}px`;
      panel.style.top = `${y}px`;
      panelState.x = x;
      panelState.y = y;
      savePanelState(panelState);
    });

    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        panel.style.cursor = 'move';
        header.style.cursor = 'move';
      }
    });

    // ✅ Изменение размера и сохранение состояния
    const resizeObserver = new ResizeObserver(entries => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        panelState.width = width;
        panelState.height = height;
        savePanelState(panelState);

        if (contentDiv) {
          contentDiv.style.width = '100%';
          contentDiv.style.height = '100%';
        }
      }
    });
    resizeObserver.observe(panel);

    // Hover logic
    let isOverPanelOrLink = false;

    const enter = () => {
      isOverPanelOrLink = true;
      clearTimeout(hideTimeout);
    };

    const leave = () => {
      isOverPanelOrLink = false;
      if (!isPinned) {
        scheduleHide();
      }
    };

    panel.addEventListener('mouseenter', enter);
    panel.addEventListener('mouseleave', leave);
    link.addEventListener('mouseenter', enter);
    link.addEventListener('mouseleave', leave);

    if (!isPinned) {
      scheduleHide();
    }

    // Если контент не из кэша - загружаем
    if (!textCache[url]) {
      fetchTextContent(url).then(fetchedContent => {
        if (fetchedContent && currentPanel === panel) {
          contentDiv.textContent = fetchedContent;
          textCache[url] = { content: fetchedContent };
          saveCache(textCache);
        } else if (currentPanel === panel) {
          contentDiv.textContent = 'Ошибка загрузки';
        }
      });
    }

    return panel;
  }

  function scheduleHide() {
    clearTimeout(hideTimeout);
    hideTimeout = setTimeout(() => {
      if (currentPanel) {
        currentPanel.remove();
        currentPanel = null;
        currentLink = null;
      }
    }, 1000);
  }

  async function processNewMessages(mutations) {
    const settings = await new Promise(resolve => {
      chrome.storage.sync.get(['textLocation'], result => {
        resolve(result);
      });
    });

    if (settings.textLocation !== 'panel') {
      return;
    }

    for (const mut of mutations) {
      if (mut.type !== 'childList') continue;

      for (const node of mut.addedNodes) {
        if (node.nodeType !== Node.ELEMENT_NODE) continue;

        const links = node.querySelectorAll?.('a[href]') || [];
        for (const link of links) {
          if (isTextUrl(link.href)) {
            link.addEventListener('mouseenter', () => createTextPanel(link));
          }
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

    if (settings.textLocation !== 'panel') return;

    const existingLinks = document.querySelectorAll('a[href]') || [];
    for (const link of existingLinks) {
      if (isTextUrl(link.href)) {
        link.addEventListener('mouseenter', () => createTextPanel(link));
      }
    }
  }, 500);
})();