(function () {
  const TWITCH_COLORS = {
    bg: '#18181b',
    text: '#efeff1',
    accent: '#9146ff',
    success: '#00d64e',
    error: '#f34545'
  };

  const style = document.createElement('style');
  style.textContent = `
    #twitchtweaks-notification {
      position: fixed;
      bottom: 90px;
      left: 50%;
      transform: translateX(-50%);
      width: 320px;
      max-height: 400px;
      background: ${TWITCH_COLORS.bg};
      color: ${TWITCH_COLORS.text};
      border: 1px solid #3f3f46;
      border-radius: 8px;
      padding: 12px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
      font-size: 13px;
      z-index: 2147483647;
      box-shadow: 0 4px 12px rgba(0,0,0,0.5);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      opacity: 1;
      transition: opacity 0.5s ease;
      text-align: center;
    }
    #twitchtweaks-notification.fade-out {
      opacity: 0;
    }
    #twitchtweaks-notification .close-btn {
      position: absolute;
      top: 8px;
      right: 10px;
      background: none;
      border: none;
      color: #a9a9b3;
      font-size: 18px;
      cursor: pointer;
      padding: 0;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    #twitchtweaks-notification .close-btn:hover {
      color: white;
    }
    #twitchtweaks-notification img, #twitchtweaks-notification video {
      max-width: 100%;
      max-height: 200px;
      object-fit: contain;
      margin: 8px auto;
      border-radius: 4px;
      display: block;
    }
    #twitchtweaks-notification pre {
      background: #2a2a2e;
      padding: 8px;
      border-radius: 4px;
      max-height: 150px;
      overflow: auto;
      margin: 8px auto;
      white-space: pre-wrap;
      word-break: break-word;
      font-size: 12px;
      text-align: left;
    }
    #twitchtweaks-notification .filename {
      font-weight: bold;
      margin: 6px 0;
    }
    #twitchtweaks-notification a {
      color: ${TWITCH_COLORS.accent};
      text-decoration: none;
      display: inline-block;
      margin-top: 6px;
    }
    #twitchtweaks-notification a:hover {
      text-decoration: underline;
    }
    #twitchtweaks-notification .status.error {
      color: ${TWITCH_COLORS.error};
      font-weight: bold;
    }
  `;
  document.head.appendChild(style);

  function positionNotification(el) {
    const chatContainer = document.querySelector('.stream-chat');
    if (!chatContainer) {
      el.style.left = '50%';
      el.style.transform = 'translateX(-50%)';
      return;
    }

    const rect = chatContainer.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    el.style.left = `${centerX}px`;
    el.style.transform = 'translateX(-50%)';
  }

  function showNotification(content) {
    const el = document.createElement('div');
    el.id = 'twitchtweaks-notification';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'close-btn';
    closeBtn.innerHTML = '×';
    closeBtn.setAttribute('aria-label', 'Закрыть');
    el.appendChild(closeBtn);

    const contentDiv = document.createElement('div');
    contentDiv.innerHTML = content;
    el.appendChild(contentDiv);

    document.body.appendChild(el);

    positionNotification(el);
    const resizeObserver = new ResizeObserver(() => positionNotification(el));
    const chatContainer = document.querySelector('.stream-chat');
    if (chatContainer) resizeObserver.observe(chatContainer);

    let showStartTime = Date.now();
    let isHovered = false;
    let fadeTimer = null;
    let removeTimer = null;

    function scheduleFade() {
      const elapsed = Date.now() - showStartTime;
      const remaining = Math.max(0, 1500 - elapsed);

      clearTimeout(fadeTimer);
      fadeTimer = setTimeout(() => {
        el.classList.add('fade-out');
        removeTimer = setTimeout(() => {
          if (el.parentNode) el.remove();
          resizeObserver.disconnect();
        }, 500);
      }, remaining);
    }

    function pauseTimer() {
      clearTimeout(fadeTimer);
    }

    function resumeTimer() {
      scheduleFade();
    }

    closeBtn.addEventListener('click', () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
      el.classList.add('fade-out');
      setTimeout(() => {
        if (el.parentNode) el.remove();
        resizeObserver.disconnect();
      }, 500);
    });

    el.addEventListener('mouseenter', pauseTimer);
    el.addEventListener('mouseleave', resumeTimer);

    scheduleFade();
  }

  function isTextFile(type, name) {
    const textTypes = ['text/', 'application/json', 'application/xml', 'application/javascript'];
    const textExts = ['.txt', '.log', '.js', '.json', '.xml', '.html', '.css', '.csv', '.md', '.yml', '.yaml', '.ini', '.toml'];
    return textTypes.some(t => type.startsWith(t)) ||
           textExts.some(ext => name.toLowerCase().endsWith(ext));
  }

  function isImage(type) {
    return type.startsWith('image/');
  }

  function isVideo(type) {
    return type.startsWith('video/');
  }

  function escapeHtml(str) {
    return str.replace(/[&<>"']/g, m => ({
      '&': '&amp;',
      '<': '<',
      '>': '>',
      '"': '&quot;',
      "'": '&#039;'
    }[m]));
  }

  async function readTextFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  async function uploadWithRetry(file, maxRetries = 10) {
    let lastError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const formData = new FormData();
      formData.append('reqtype', 'fileupload');
      formData.append('time', '24h');
      formData.append('fileToUpload', file);

      try {
        const res = await fetch('https://litterbox.catbox.moe/resources/internals/api.php', {
          method: 'POST',
          body: formData
        });

        if (res.status === 500 && attempt < maxRetries) {
          lastError = new Error(`HTTP 500 (попытка ${attempt + 1}/${maxRetries + 1})`);
          const delay = 100 * Math.pow(2, attempt);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const url = (await res.text()).trim();
        // ✅ Копируем в буфер
        await navigator.clipboard.writeText(url);
        return url;
      } catch (err) {
        if (err.message.includes('HTTP 500')) {
          lastError = err;
          if (attempt < maxRetries) {
            const delay = 100 * Math.pow(2, attempt);
            await new Promise(r => setTimeout(r, delay));
            continue;
          }
        }
        throw err;
      }
    }

    throw lastError || new Error('Неизвестная ошибка');
  }

  async function uploadFile(file) {
    try {
      const url = await uploadWithRetry(file, 10);

      let previewHtml = '';

      if (isImage(file.type)) {
        previewHtml = `<img src="${URL.createObjectURL(file)}" alt="Preview">`;
      } else if (isVideo(file.type)) {
        const videoUrl = URL.createObjectURL(file);
        previewHtml = `<video controls><source src="${videoUrl}" type="${file.type}">Video not supported</video>`;
      } else if (isTextFile(file.type, file.name)) {
        try {
          const text = await readTextFile(file);
          const snippet = text.length > 500 ? text.substring(0, 500) + '…' : text;
          previewHtml = `<pre>${escapeHtml(snippet)}</pre>`;
        } catch (e) {
          previewHtml = '<em>Не удалось прочитать текст</em>';
        }
      }

      const sizeKB = (file.size / 1024).toFixed(1);
      const content = `
        <div class="filename">${escapeHtml(file.name)}</div>
        <div>Размер: ${sizeKB} KB</div>
        ${previewHtml}
        <a href="${url}" target="_blank">${url}</a>
      `;
      showNotification(content);
    } catch (err) {
      showNotification(`
        <div class="status error">❌ Ошибка загрузки</div>
        <div>${escapeHtml(err.message)}</div>
      `);
    }
  }

  // Работает только на Twitch
  if (!/^(https?:\/\/)?([\w-]+\.)?twitch\.tv$/.test(location.hostname)) return;

  // Drag & drop
  document.addEventListener('drop', e => {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0];
    if (file) uploadFile(file);
  });

  document.addEventListener('dragover', e => {
    e.preventDefault();
  });

  // Paste
  document.addEventListener('paste', e => {
    const file = e.clipboardData?.files?.[0];
    if (file) uploadFile(file);
  });
})();