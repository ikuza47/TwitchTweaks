(function () {
  if (!/^(https?:\/\/)?([\w-]+\.)?twitch\.tv$/.test(location.hostname)) return;

  const TWITCH_COLORS = {
    bg: '#18181b',
    text: '#efeff1',
    accent: '#9146ff',
    success: '#00d64e',
    warning: '#FFD700',
    secondary: '#a9a9b3'
  };

  let currentPanel = null;
  let currentLink = null;
  let hideTimeout = null;

  // ✅ Храним позицию панели
  let lastPanelPosition = null;

  function closePanel() {
    console.log('[TwitchTweaks] Closing panel');
    if (currentPanel) {
      clearTimeout(hideTimeout);
      currentPanel.remove();
      currentPanel = null;
      currentLink = null;
    }
  }

  function scheduleHide() {
    clearTimeout(hideTimeout);
    hideTimeout = setTimeout(closePanel, 500);
  }

  // ✅ Новая функция интерполяции цвета по звёздам
  function getStarColor(stars) {
    if (isNaN(stars)) return '#a9a9b3'; // серый, если не число

    // Таблица точек для интерполяции
    const points = [
      { s: 0.0, c: [0x4e, 0xff, 0x00] }, // #4eff00 (ярко-зелёный)
      { s: 2.0, c: [0xa3, 0xff, 0x00] }, // #a3ff00 (салатовый)
      { s: 3.0, c: [0xff, 0xff, 0x00] }, // #ffff00 (жёлтый)
      { s: 4.0, c: [0xff, 0xa3, 0x00] }, // #ffa300 (оранжевый)
      { s: 5.0, c: [0xff, 0x4e, 0x00] }, // #ff4e00 (красно-оранжевый)
      { s: 6.0, c: [0xd9, 0x00, 0x6c] }, // #d9006c (пурпурный)
      { s: 6.5, c: [0x8a, 0x00, 0xb0] }, // #8a00b0 (фиолетовый)
      { s: 7.0, c: [0x2f, 0x00, 0xff] }, // #2f00ff (синий)
      { s: 8.0, c: [0x00, 0x00, 0x00] }  // #000000 (чёрный)
    ];

    if (stars < 0) {
      const first = points[0];
      return `rgb(${first.c[0]}, ${first.c[1]}, ${first.c[2]})`;
    }

    // Если больше 8.0 — возвращаем чёрный
    if (stars >= 8.0) {
      return 'rgb(0, 0, 0)';
    }

    // Находим нужный диапазон
    for (let i = 0; i < points.length - 1; i++) {
      if (stars >= points[i].s && stars < points[i + 1].s) {
        const p1 = points[i];
        const p2 = points[i + 1];
        const t = (stars - p1.s) / (p2.s - p1.s);
        const r = Math.round(p1.c[0] + (p2.c[0] - p1.c[0]) * t);
        const g = Math.round(p1.c[1] + (p2.c[1] - p1.c[1]) * t);
        const b = Math.round(p1.c[2] + (p2.c[2] - p1.c[2]) * t);
        return `rgb(${r}, ${g}, ${b})`;
      }
    }

    // На случай, если числа между точками не попали (не должно сработать)
    const last = points[points.length - 1];
    return `rgb(${last.c[0]}, ${last.c[1]}, ${last.c[2]})`;
  }

  function createPanel(v2Data, metaData, linkRect, beatmapId) {
    console.log('[TwitchTweaks] Creating panel for beatmapId:', beatmapId);
    closePanel();

    const panel = document.createElement('div');
    panel.style.position = 'fixed';
    if (lastPanelPosition) {
      console.log('[TwitchTweaks] Using saved panel position:', lastPanelPosition);
      panel.style.top = `${lastPanelPosition.top}px`;
      panel.style.left = `${lastPanelPosition.left}px`;
    } else {
      console.log('[TwitchTweaks] Using default position based on link');
      panel.style.top = `${linkRect.top + window.pageYOffset}px`;
      panel.style.left = `${linkRect.left + window.pageXOffset}px`;
    }
    panel.style.width = '300px';
    panel.style.background = TWITCH_COLORS.bg;
    panel.style.border = '1px solid #3f3f46';
    panel.style.borderRadius = '8px';
    panel.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif';
    panel.style.fontSize = '12px';
    panel.style.zIndex = '2147483646';
    panel.style.boxShadow = '0 4px 12px rgba(0,0,0,0.5)';
    panel.style.color = TWITCH_COLORS.text;

    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '×';
    closeBtn.style.position = 'absolute';
    closeBtn.style.top = '8px';
    closeBtn.style.right = '10px';
    closeBtn.style.background = 'none';
    closeBtn.style.border = 'none';
    closeBtn.style.color = '#a9a9b3';
    closeBtn.style.fontSize = '16px';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.zIndex = '2147483647';
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      console.log('[TwitchTweaks] Close button clicked');
      closePanel();
    });
    panel.appendChild(closeBtn);

    // ✅ Перемещение панели
    let isDragging = false;
    let offsetX, offsetY;

    panel.addEventListener('mousedown', (e) => {
      if (e.target === closeBtn) return;
      console.log('[TwitchTweaks] Panel drag started');
      isDragging = true;
      offsetX = e.clientX - panel.getBoundingClientRect().left;
      offsetY = e.clientY - panel.getBoundingClientRect().top;
      panel.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const x = e.clientX - offsetX;
      const y = e.clientY - offsetY;
      panel.style.left = `${x}px`;
      panel.style.top = `${y}px`;
      lastPanelPosition = { top: y, left: x };
      console.log('[TwitchTweaks] Panel dragged to:', lastPanelPosition);
    });

    document.addEventListener('mouseup', () => {
      if (isDragging) {
        console.log('[TwitchTweaks] Panel drag ended');
        isDragging = false;
        panel.style.cursor = 'default';
      }
    });

    // Cover image (top, full width, no padding)
    const coverUrl = v2Data.set?.covers?.['cover@2x'];
    if (coverUrl) {
      console.log('[TwitchTweaks] Adding cover image:', coverUrl);
      const coverEl = document.createElement('img');
      coverEl.src = coverUrl;
      coverEl.style.width = '100%';
      coverEl.style.height = '100px';
      coverEl.style.objectFit = 'cover';
      coverEl.style.display = 'block';
      panel.appendChild(coverEl);

      // Title, artist, mapper (on top of cover)
      const overlay = document.createElement('div');
      overlay.style.position = 'absolute';
      overlay.style.top = '0';
      overlay.style.left = '0';
      overlay.style.width = '100%';
      overlay.style.height = '100px';
      overlay.style.background = 'linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)';
      overlay.style.color = '#fff';
      overlay.style.padding = '6px';
      overlay.style.fontWeight = 'bold';
      overlay.style.fontSize = '13px';

      const title = document.createElement('div');
      title.textContent = v2Data.set?.title || '—';

      const artist = document.createElement('div');
      artist.style.fontSize = '11px';
      artist.style.opacity = '0.85';
      artist.textContent = `by ${v2Data.set?.artist || '—'}`;

      const mapper = document.createElement('div');
      mapper.style.fontSize = '11px';
      mapper.style.color = TWITCH_COLORS.accent;
      mapper.textContent = `Mapper: ${v2Data.set?.creator || '—'}`;

      overlay.appendChild(title);
      overlay.appendChild(artist);
      overlay.appendChild(mapper);

      panel.appendChild(overlay);
    }

    // Content below cover
    const content = document.createElement('div');
    content.style.padding = '8px';

    // ✅ Difficulty name (with stars) + status + pp
    const meta = metaData.difficulty || {};
    const stars = typeof meta.stars === 'number' ? meta.stars.toFixed(2) : '?';
    const pp95 = metaData.pp?.['95']?.pp ? Math.floor(metaData.pp['95'].pp) : '?';

    const diffName = document.createElement('div');
    diffName.style.fontWeight = 'bold';
    diffName.style.margin = '4px 0';
    // ✅ Цвет сложности и звёзд — интерполируется по новой таблице
    const starColor = getStarColor(meta.stars);
    diffName.style.color = starColor;
    diffName.style.display = 'flex';
    diffName.style.alignItems = 'center';
    diffName.style.flexWrap = 'wrap';

    const diffText = document.createElement('span');
    diffText.textContent = `${v2Data.version || '—'} [${stars}★]`;
    diffName.appendChild(diffText);

    // Status
    const statusMap = {
      ranked: 'Ranked',
      approved: 'Approved',
      qualified: 'Qualified',
      loved: 'Loved',
      pending: 'Pending',
      wip: 'WIP',
      graveyard: 'Graveyard'
    };
    const statusText = statusMap[v2Data.status] || v2Data.status || 'Unknown';
    const statusEl = document.createElement('span');
    statusEl.style.color = ['ranked', 'loved'].includes(v2Data.status) ? TWITCH_COLORS.success : TWITCH_COLORS.secondary;
    statusEl.textContent = ` | ${statusText}`;
    statusEl.style.marginLeft = '4px';

    // PP
    const ppEl = document.createElement('span');
    ppEl.textContent = ` | PP: ${pp95}`;
    ppEl.style.marginLeft = '4px';
    ppEl.style.color = TWITCH_COLORS.success;

    diffName.appendChild(statusEl);
    diffName.appendChild(ppEl);

    content.appendChild(diffName);

    // Stats table (2 columns, compact)
    const statsTable = document.createElement('table');
    statsTable.style.width = '100%';
    statsTable.style.borderCollapse = 'collapse';
    statsTable.style.fontSize = '11px';
    statsTable.style.marginTop = '6px';

    const map = metaData.map || {};

    const addRow = (label1, value1, color1, label2, value2, color2) => {
      const row = statsTable.insertRow();
      const cell1 = row.insertCell(0);
      const cell2 = row.insertCell(1);
      // ✅ Округление до 1 знака
      const val1 = typeof value1 === 'number' ? value1.toFixed(1) : value1;
      const val2 = typeof value2 === 'number' ? value2.toFixed(1) : value2;
      cell1.innerHTML = `<span style="color:${color1}">${label1}: ${val1}</span>`;
      cell2.innerHTML = `<span style="color:${color2}">${label2}: ${val2}</span>`;
      cell1.style.padding = '2px 0';
      cell2.style.padding = '2px 0';
    };

    // AR + CS
    addRow(
      'AR', map.ar, '#fb923c',
      'CS', map.cs, '#f87171'
    );
    // OD + HP
    addRow(
      'OD', map.od, '#34d399',
      'HP', map.hp, '#a78bfa'
    );
    // BPM + Empty
    const bpm = v2Data.bpm || 0;
    addRow(
      'BPM', bpm, '#60a5fa',
      '', '', 'transparent'
    );

    content.appendChild(statsTable);

    // ✅ Download button (moved under table)
    const beatmapsetId = v2Data.beatmapset_id;
    if (beatmapsetId) {
      const downloadBtn = document.createElement('a');
      downloadBtn.href = `https://catboy.best/d/${beatmapsetId}`;
      downloadBtn.target = '_blank';
      downloadBtn.rel = 'noopener';
      downloadBtn.style.display = 'block';
      downloadBtn.style.marginTop = '8px';
      downloadBtn.style.textAlign = 'center';
      downloadBtn.style.textDecoration = 'none';
      downloadBtn.style.color = '#fff';
      downloadBtn.style.background = TWITCH_COLORS.accent;
      downloadBtn.style.padding = '3px 6px';
      downloadBtn.style.borderRadius = '4px';
      downloadBtn.style.fontSize = '11px';
      downloadBtn.style.fontWeight = '600';
      downloadBtn.textContent = 'Скачать';
      content.appendChild(downloadBtn);
    }

    panel.appendChild(content);

    // ✅ Позиционируем и корректируем, если выходит за границы
    document.body.appendChild(panel);
    currentPanel = panel;

    const panelRect = panel.getBoundingClientRect();
    let top = panelRect.top + window.pageYOffset;
    let left = panelRect.left + window.pageXOffset;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    if (left + panelRect.width > viewportWidth) {
      left = viewportWidth - panelRect.width - 10;
      console.log('[TwitchTweaks] Panel adjusted left to fit viewport');
    }
    if (left < 0) {
      left = 10;
      console.log('[TwitchTweaks] Panel adjusted to left edge');
    }
    if (top + panelRect.height > viewportHeight) {
      top = viewportHeight - panelRect.height - 10;
      console.log('[TwitchTweaks] Panel adjusted top to fit viewport');
    }
    if (top < 0) {
      top = 10;
      console.log('[TwitchTweaks] Panel adjusted to top edge');
    }

    panel.style.top = `${top}px`;
    panel.style.left = `${left}px`;

    if (!lastPanelPosition) {
      lastPanelPosition = { top, left };
      console.log('[TwitchTweaks] Saved initial panel position:', lastPanelPosition);
    }

    // Hover logic
    let isOverPanelOrLink = false;

    const updateVisibility = () => {
      if (isOverPanelOrLink) {
        clearTimeout(hideTimeout);
      } else {
        scheduleHide();
      }
    };

    const enter = () => {
      console.log('[TwitchTweaks] Panel hovered');
      isOverPanelOrLink = true;
      clearTimeout(hideTimeout);
    };

    const leave = () => {
      console.log('[TwitchTweaks] Panel unhovered');
      isOverPanelOrLink = false;
      scheduleHide();
    };

    panel.addEventListener('mouseenter', enter);
    panel.addEventListener('mouseleave', leave);
    if (currentLink) {
      currentLink.addEventListener('mouseenter', enter);
      currentLink.addEventListener('mouseleave', leave);
    }
  }

  function extractBeatmapInfoFromUrl(href) {
    console.log('[TwitchTweaks] Extracting beatmap info from URL:', href);
    const beatmapsMatch = href.match(/^https:\/\/osu\.ppy\.sh\/beatmaps\/(\d+)/);
    if (beatmapsMatch) {
      console.log('[TwitchTweaks] Detected /beatmaps/ URL, ID:', beatmapsMatch[1]);
      return { type: 'beatmap', id: beatmapsMatch[1] };
    }

    const fullHashMatch = href.match(/^https:\/\/osu\.ppy\.sh\/beatmapsets\/\d+#osu\/(\d+)/);
    if (fullHashMatch) {
      console.log('[TwitchTweaks] Detected /beatmapsets/#osu/ URL, beatmap ID:', fullHashMatch[1]);
      return { type: 'beatmap', id: fullHashMatch[1] };
    }

    const setOnlyMatch = href.match(/^https:\/\/osu\.ppy\.sh\/beatmapsets\/(\d+)#osu\/?$/);
    if (setOnlyMatch) {
      console.log('[TwitchTweaks] Detected /beatmapsets/#osu/ (no beatmap ID), set ID:', setOnlyMatch[1]);
      return { type: 'set', id: setOnlyMatch[1] };
    }

    console.log('[TwitchTweaks] URL does not match known patterns');
    return null;
  }

  async function fetchBeatmapData(parsed) {
    try {
      let beatmapId;

      if (parsed.type === 'beatmap') {
        console.log('[TwitchTweaks] Fetching data for beatmap ID:', parsed.id);
        beatmapId = parsed.id;
      } else if (parsed.type === 'set') {
        console.log('[TwitchTweaks] Fetching set data to get first beatmap ID from set:', parsed.id);
        const setRes = await fetch(`https://catboy.best/api/v2/s/${parsed.id}`);
        if (!setRes.ok) throw new Error(`Set HTTP ${setRes.status}`);
        const setData = await setRes.json();
        if (!setData?.beatmaps?.length) throw new Error('No beatmaps in set');
        beatmapId = setData.beatmaps[0].id;
        console.log('[TwitchTweaks] Using first beatmap from set:', beatmapId);
      }

      console.log('[TwitchTweaks] Fetching v2/b/', beatmapId);
      const [v2Res, metaRes] = await Promise.all([
        fetch(`https://catboy.best/api/v2/b/${beatmapId}`),
        fetch(`https://catboy.best/api/meta/${beatmapId}`)
      ]);

      if (!v2Res.ok || !metaRes.ok) {
        throw new Error(`v2 HTTP ${v2Res.status}, meta HTTP ${metaRes.status}`);
      }

      const v2Data = await v2Res.json();
      const metaData = await metaRes.json();

      if (!v2Data || !metaData) throw new Error('Missing data from API');

      console.log('[TwitchTweaks] Successfully fetched v2 and meta data for beatmapId:', beatmapId);
      return { v2Data, metaData, beatmapId };
    } catch (err) {
      console.error('[TwitchTweaks] Failed to fetch osu! map data:', err);
      return null;
    }
  }

  function handleMouseEnter(e) {
    const link = e.target.closest?.('a[href]');
    if (!link) {
      return;
    }

    const chatContainer = link.closest?.('.stream-chat');
    if (!chatContainer) {
      console.log('[TwitchTweaks] Link is not inside .stream-chat');
      return;
    }

    const parsed = extractBeatmapInfoFromUrl(link.href);
    if (!parsed) {
      console.log('[TwitchTweaks] Link is not a known osu! beatmap URL');
      return;
    }

    const rect = link.getBoundingClientRect();
    currentLink = link;

    fetchBeatmapData(parsed).then(result => {
      if (result && currentLink === link) {
        console.log('[TwitchTweaks] Creating panel after data fetch');
        createPanel(result.v2Data, result.metaData, rect, result.beatmapId);
      } else {
        console.log('[TwitchTweaks] Data fetch failed or link changed, not creating panel');
      }
    });
  }

  document.addEventListener('mouseover', handleMouseEnter, true);

  // ✅ Сброс позиции при перезагрузке
  window.addEventListener('beforeunload', () => {
    console.log('[TwitchTweaks] Page unloading, resetting panel position');
    lastPanelPosition = null;
  });
})();