(function () {
  if (!/^(https?:\/\/)?([\w-]+\.)?twitch\.tv$/.test(location.hostname)) return;

  const IMAGE_URL_REGEX = /^https?:\/\/.+\.(?:jpg|jpeg|png|gif|webp|bmp|svg|ico|tiff|tif|avif|jxl|apng)(?:\?.*)?$/i;
  const VIDEO_EXTS = /\.(mp4|webm|mov|m4v|avi|mkv)(\?.*)?$/i;

  const CACHE_KEY = 'twitchtweaks_image_cache_v1';
  const MAX_CACHE_SIZE = 200;

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

  async function replaceLinkWithMedia(link) {
    const url = link.href;

    // ✅ Проверяем, находится ли ссылка внутри уведомления upload.js
    if (link.closest('#twitchtweaks-notification')) {
      return;
    }

    if (link.dataset.mediaProcessed) return;
    link.dataset.mediaProcessed = 'true';

    if (!isMediaUrl(url)) return;

    const mediaType = VIDEO_EXTS.test(new URL(url).pathname) ? 'video' : 'image';

    const parent = link.parentElement;
    if (!parent) return;

    const media = mediaType === 'video' ? document.createElement('video') : document.createElement('img');

    media.src = url;
    media.style.width = '100%';
    media.style.maxHeight = '600px';
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

    parent.replaceChild(media, link);
  }

  async function processNewMessages(mutations) {
    for (const mut of mutations) {
      if (mut.type !== 'childList') continue;

      for (const node of mut.addedNodes) {
        if (node.nodeType !== Node.ELEMENT_NODE) continue;

        const links = node.querySelectorAll?.('a[href]') || [];
        for (const link of links) {
          await replaceLinkWithMedia(link);
        }
      }
    }
  }

  const observer = new MutationObserver(processNewMessages);
  observer.observe(document.body, { childList: true, subtree: true });

  setTimeout(async () => {
    const existingLinks = document.querySelectorAll('a[href]') || [];
    for (const link of existingLinks) {
      await replaceLinkWithMedia(link);
    }
  }, 500);
})();