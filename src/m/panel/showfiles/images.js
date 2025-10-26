(function () {
  if (!/^(https?:\/\/)?([\w-]+\.)?twitch\.tv$/.test(location.hostname)) return;

  const IMAGE_URL_REGEX = /^https?:\/\/.+\.(?:jpg|jpeg|png|gif|webp|bmp|svg|ico|tiff|tif|avif|jxl|apng)(?:\?.*)?$/i;
  const VIDEO_EXTS = /\.(mp4|webm|mov|m4v|avi|mkv)(\?.*)?$/i;

  const CACHE_KEY = 'twitchtweaks_image_cache_v1';
  const PANEL_STATE_KEY = 'twitchtweaks_image_panel_state_temp';
  const PINNED_STATE_KEY = 'twitchtweaks_image_pinned_temp'; // ✅ Для состояния закрепления
  const MAX_CACHE_SIZE = 200;

  let currentPanel = null;
  let currentLink = null;
  let hideTimeout = null;
  let isPinned = sessionStorage.getItem(PINNED_STATE_KEY) === 'true'; // ✅ Загружаем состояние закрепления

  function savePinState(pinned) {
    try {
      sessionStorage.setItem(PINNED_STATE_KEY, pinned.toString());
    } catch (e) {
      console.warn('[TwitchTweaks] Failed to save image pin state to sessionStorage', e);
    }
  }

  function loadPanelState() {
    try {
      const raw = sessionStorage.getItem(PANEL_STATE_KEY);
      return raw ? JSON.parse(raw) : { x: 0, y: 0, width: 320, height: 240 };
    } catch (e) {
      console.warn('[TwitchTweaks] Failed to load image panel state from sessionStorage', e);
      return { x: 0, y: 0, width: 320, height: 240 };
    }
  }

  function savePanelState(state) {
    try {
      sessionStorage.setItem(PANEL_STATE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('[TwitchTweaks] Failed to save image panel state to sessionStorage', e);
    }
  }

  let panelState = loadPanelState();

  function loadCache() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      console.warn('[TwitchTweaks] Failed to load image cache from localStorage', e);
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
      console.warn('[TwitchTweaks] Failed to save image cache to localStorage', e);
    }
  }

  let imageCache = loadCache();

  function isMediaUrl(url) {
    try {
      const parsed = new URL(url);
      return IMAGE_URL_REGEX.test(parsed.href) || VIDEO_EXTS.test(parsed.pathname);
    } catch {
      return false;
    }
  }

  function checkIfMedia(url) {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = url;

      img.onload = () => resolve({ isMedia: true, type: 'image' });
      img.onerror = () => {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.src = url;

        video.onloadedmetadata = () => resolve({ isMedia: true, type: 'video' });
        video.onerror = () => resolve({ isMedia: false, type: 'other' });
      };
    });
  }

  async function createPanel(link) {
    const url = link.href;

    if (currentPanel) {
      clearTimeout(hideTimeout);
      currentPanel.remove();
      currentPanel = null;
      currentLink = null;
    }

    currentLink = link;

    let mediaType = null;

    if (imageCache[url]) {
      if (imageCache[url].type === 'other') return;
      mediaType = imageCache[url].type;
    } else {
      if (isMediaUrl(url)) {
        mediaType = VIDEO_EXTS.test(new URL(url).pathname) ? 'video' : 'image';
      } else {
        const result = await checkIfMedia(url);
        if (!result.isMedia) {
          imageCache[url] = { type: 'other' };
          saveCache(imageCache);
          return;
        }
        mediaType = result.type;
      }
      imageCache[url] = { type: mediaType };
      saveCache(imageCache);
    }

    const rect = link.getBoundingClientRect();
    const panel = document.createElement('div');
    panel.style.position = 'fixed';
    panel.style.left = `${panelState.x || rect.left + window.scrollX}px`;
    panel.style.top = `${panelState.y || rect.top + window.scrollY}px`;
    panel.style.width = `${panelState.width}px`;
    panel.style.height = `${panelState.height}px`;
    panel.style.minWidth = '200px';
    panel.style.minHeight = '150px';
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
    title.textContent = 'Media Preview';

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

    const content = document.createElement('div');
    content.style.flex = '1';
    content.style.overflow = 'auto';
    content.style.padding = '8px';
    content.style.display = 'flex';
    content.style.alignItems = 'center';
    content.style.justifyContent = 'center';

    const media = mediaType === 'video' ? document.createElement('video') : document.createElement('img');
    media.src = url;
    media.style.maxWidth = '100%';
    media.style.maxHeight = '100%';
    media.style.objectFit = 'contain';
    media.style.borderRadius = '4px';
    media.style.cursor = 'pointer';
    media.loading = 'lazy';

    if (mediaType === 'video') {
      media.controls = true;
      media.playsInline = true;
      media.muted = true;
    }

    media.addEventListener('click', e => {
      e.stopPropagation();
      window.open(url, '_blank', 'noopener,noreferrer');
    });

    content.appendChild(media);
    panel.appendChild(content);

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

        if (media) {
          media.style.maxWidth = '100%';
          media.style.maxHeight = '100%';
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
      chrome.storage.sync.get(['imageLocation'], result => {
        resolve(result);
      });
    });

    if (settings.imageLocation !== 'panel') {
      return;
    }

    for (const mut of mutations) {
      if (mut.type !== 'childList') continue;

      for (const node of mut.addedNodes) {
        if (node.nodeType !== Node.ELEMENT_NODE) continue;

        const links = node.querySelectorAll?.('a[href]') || [];
        for (const link of links) {
          if (isMediaUrl(link.href)) {
            link.addEventListener('mouseenter', () => createPanel(link));
          }
        }
      }
    }
  }

  const observer = new MutationObserver(processNewMessages);
  observer.observe(document.body, { childList: true, subtree: true });

  setTimeout(async () => {
    const settings = await new Promise(resolve => {
      chrome.storage.sync.get(['imageLocation'], result => {
        resolve(result);
      });
    });

    if (settings.imageLocation !== 'panel') return;

    const existingLinks = document.querySelectorAll('a[href]') || [];
    for (const link of existingLinks) {
      if (isMediaUrl(link.href)) {
        link.addEventListener('mouseenter', () => createPanel(link));
      }
    }
  }, 500);
})();