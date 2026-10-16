(() => {
  const { el, ui, fmt, icon } = Rk;

  const isMac = /mac|iphone|ipad/i.test(navigator.platform || navigator.userAgent || '');
  const altLabel = isMac ? 'Option' : 'Alt';
  const modLabel = isMac ? 'Cmd' : 'Ctrl';
  const usernamePattern = /^(?=.{3,20}$)[a-z0-9]+(?:_[a-z0-9]+)?$/i;
  const digitsPattern = /^\d{1,19}$/;

  const isObject = value => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  const clip = (value, max = 120) => (typeof value === 'string' ? value.trim().slice(0, max) : '');
  const dayKey = (date = new Date()) => date.toISOString().slice(0, 10);
  const robloxHost = host => /(^|\.)roblox\.com$/i.test(host);
  const cdnHost = host => /(^|\.)rbxcdn\.com$/i.test(host);
  const isTyping = target => Boolean(target && target.nodeType === 1 && (target.isContentEditable || /^(input|textarea|select)$/i.test(target.tagName)));
  const kbd = label => el('kbd', { class: 'rk-tools-kbd' }, label);

  const list = key => {
    const value = Rk.store.get(key, []);
    return Array.isArray(value) ? value : [];
  };

  const record = key => {
    const value = Rk.store.get(key, {});
    return isObject(value) ? value : {};
  };

  const go = (href, newTab = false) => {
    if (newTab) window.open(href, '_blank', 'noopener');
    else location.assign(href);
  };

  const bind = (ctx, combo, handler, options) => Rk.hotkey(combo, event => {
    if (Rk.isEnabled(ctx.id)) handler(event);
  }, options);

  const session = {
    get: key => {
      try {
        return sessionStorage.getItem(key);
      } catch {
        return null;
      }
    },
    set: (key, value) => {
      try {
        sessionStorage.setItem(key, value);
        return true;
      } catch {
        return false;
      }
    }
  };

  const pollNow = () => {
    const last = Number(sessionStorage.getItem('rk-poll') || 0);
    if (Date.now() - last < 60000) return;
    sessionStorage.setItem('rk-poll', String(Date.now()));
    Rk.bg('poll-now').catch(() => {});
  };

  const findUserId = async name => {
    const json = await Rk.api.post('https://users.roblox.com/v1/usernames/users', { usernames: [name], excludeBannedUsers: false });
    const match = json && Array.isArray(json.data) ? json.data.find(user => user && Rk.isId(user.id)) : null;
    return match ? Number(match.id) : null;
  };

  const openUser = async (name, newTab = false) => {
    let id = null;
    try {
      id = await findUserId(name);
    } catch {
      ui.toast('Could not look up that user', { tone: 'danger' });
      return false;
    }
    if (!id) {
      ui.toast(`No user named ${name}`, { tone: 'warning' });
      return false;
    }
    go(`/users/${id}/profile`, newTab);
    return true;
  };

  const trackingParams = new Set([
    'gameSearchSessionInfo', 'isAd', 'nativeAdData', 'adId', 'homePageSessionInfo', 'refPageId',
    'sortPos', 'page', 'position', 'gameSetTypeId', 'gameSetTargetId', 'playContext'
  ]);

  const paramName = part => {
    const raw = part.split('=')[0].replace(/\+/g, ' ');
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  };

  const cleanUrl = href => {
    const url = new URL(href);
    if (!url.search) return url.href;
    const onGame = /^(?:\/[a-z]{2}(?:-[a-z]{2,4})?)?\/games\//i.test(url.pathname);
    const kept = url.search.slice(1).split('&').filter(part => {
      if (!part) return false;
      const name = paramName(part);
      if (name === 'universeId') return !onGame;
      if (name === 'page') return /^page=\d+$/.test(part);
      return !trackingParams.has(name);
    });
    url.search = kept.length ? `?${kept.join('&')}` : '';
    return url.href;
  };

  const minuteListeners = [];
  let minuteTimer = 0;
  let visibleSince = 0;
  let visibleCarry = 0;

  const trackVisible = () => {
    const now = Date.now();
    if (visibleSince) visibleCarry += Math.min(Math.max(now - visibleSince, 0), 120000);
    visibleSince = document.visibilityState === 'visible' ? now : 0;
    const minutes = Math.floor(visibleCarry / 60000);
    visibleCarry -= minutes * 60000;
    session.set('rk-tools-visible', String(visibleCarry));
    if (visibleSince && !minuteTimer) minuteTimer = setInterval(trackVisible, 60000);
    if (!visibleSince && minuteTimer) {
      clearInterval(minuteTimer);
      minuteTimer = 0;
    }
    if (minutes) for (const listener of minuteListeners) listener(minutes);
  };

  const onVisibleMinutes = listener => {
    minuteListeners.push(listener);
    if (minuteListeners.length > 1) return;
    visibleCarry = Math.min(Math.max(Number(session.get('rk-tools-visible')) || 0, 0), 59999);
    document.addEventListener('visibilitychange', trackVisible);
    window.addEventListener('pagehide', trackVisible);
    trackVisible();
  };

  const openModals = new Map();
  const toggleModal = (name, build) => {
    const current = openModals.get(name);
    if (current) {
      current.close();
      return null;
    }
    const handle = ui.modal({ ...build(), onClose: () => openModals.delete(name) });
    openModals.set(name, handle);
    return handle;
  };

  const navRoutes = [
    ['H', 'Go to home', () => '/home', false],
    ['A', 'Go to your avatar', () => '/my/avatar', false],
    ['F', 'Go to friends', () => '/users/friends', false],
    ['T', 'Go to trades', () => '/trades', false],
    ['I', 'Go to your inventory', user => `/users/${user.id}/inventory`, true],
    ['M', 'Go to messages', () => '/my/messages', false],
    ['P', 'Go to your profile', user => `/users/${user.id}/profile`, true],
    ['S', 'Go to account settings', () => '/my/account', false]
  ];

  const shortcutKeys = chords => el('span', { class: 'rk-tools-keys' }, chords.map((chord, index) => [
    index ? el('span', { class: 'rk-tools-keys-then' }, 'then') : null,
    chord.map(label => kbd(label))
  ]));

  const openShortcuts = () => toggleModal('shortcuts', () => {
    const rows = [
      [null, [[altLabel, 'K']], 'Open Rola settings'],
      ['tools.quickSearch', [[modLabel, 'K']], 'Open quick search'],
      ['tools.searchHotkey', [['/']], 'Focus the site search'],
      ['tools.shortcutHelp', [['Shift', '?']], 'Show keyboard shortcuts'],
      ...navRoutes.map(route => ['tools.navHotkeys', [['G'], [route[0]]], route[1]]),
      ['games.playHotkey', [['P']], 'Play the experience you are viewing'],
      ['profiles.hotkeys', [['I']], 'Open inventory from a profile'],
      ['profiles.hotkeys', [['T']], 'Start a trade from a profile'],
      ['profiles.hotkeys', [['F']], 'Open friends from a profile'],
      ['tools.copyLink', [[altLabel, 'C']], 'Copy a clean link to this page'],
      ['tools.copyId', [[altLabel, 'I']], 'Copy the id of this page'],
      ['tools.robuxConverter', [[altLabel, 'R']], 'Open the Robux converter'],
      ['tools.quickNotes', [[altLabel, 'N']], 'Open quick notes'],
      ['tools.screenshotMode', [[altLabel, 'H']], 'Hide Rola for a screenshot'],
      ['tools.focusMode', [[altLabel, 'F']], 'Turn focus mode on or off'],
      [null, [[altLabel, 'S']], 'Turn streamer mode on or off'],
      ['tools.dataManager', [[altLabel, 'D']], 'Manage your Rola data'],
      ['tools.notesManager', [[altLabel, 'O']], 'Open your notes'],
      ['tools.thumbnailZoom', [[altLabel, 'Click']], 'Zoom into an image']
    ].filter(row => !row[0] || Rk.isEnabled(row[0]));
    return {
      title: 'Keyboard shortcuts',
      width: 560,
      content: ui.table([{ label: 'Shortcut' }, { label: 'Action' }], rows.map(row => [shortcutKeys(row[1]), row[2]]), { className: 'rk-tools-shortcuts' })
    };
  });

  const sizeLabel = bytes => `${fmt.num(Math.max(0.1, Math.round(bytes / 102.4) / 10))} KB`;

  const countOf = value => {
    if (Array.isArray(value)) return value.length;
    if (isObject(value)) return Object.keys(value).length;
    return value == null || value === '' ? 0 : 1;
  };

  const downloadJson = (value, filename) => {
    const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = el('a', { download: filename });
    anchor.href = url;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const openDataManager = () => {
    const body = el('div', { class: 'rk-tools-data' });
    const render = () => {
      const dump = Rk.store.dump();
      const rows = Object.keys(dump)
        .map(key => ({ key, size: new Blob([JSON.stringify(dump[key]) || '']).size, count: countOf(dump[key]) }))
        .sort((a, b) => b.size - a.size);
      const total = rows.reduce((sum, row) => sum + row.size, 0);
      body.replaceChildren(
        el('p', { class: 'rk-modal-text rk-muted' }, rows.length ? `${fmt.plural(rows.length, 'key')} using ${sizeLabel(total)} on this browser` : 'Rola has not saved anything on this browser yet.'),
        rows.length ? ui.table(
          [{ label: 'Key' }, { label: 'Items', align: 'right' }, { label: 'Size', align: 'right' }, { label: '', align: 'right' }],
          rows.map(row => [row.key, fmt.num(row.count), sizeLabel(row.size), ui.button('', {
            variant: 'ghost',
            icon: 'trash',
            title: `Delete ${row.key}`,
            onClick: () => {
              Rk.store.remove(row.key);
              ui.toast(`Deleted ${row.key}`);
              render();
            }
          })])
        ) : null
      );
    };
    const exportData = () => {
      downloadJson(Rk.store.dump(), `rola-data-${dayKey()}.json`);
      ui.toast('Data exported', { tone: 'success' });
    };
    const importData = () => {
      const picker = el('input', { type: 'file', accept: 'application/json,.json' });
      picker.addEventListener('change', async () => {
        const file = picker.files && picker.files[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) {
          ui.toast('That file is larger than 2 MB', { tone: 'danger' });
          return;
        }
        let parsed = null;
        try {
          parsed = JSON.parse(await file.text());
        } catch {
          parsed = null;
        }
        if (!isObject(parsed)) {
          ui.toast('That file is not a Rola data export', { tone: 'danger' });
          return;
        }
        const confirmed = await ui.confirm('Importing replaces all Rola data saved on this browser.', { title: 'Import data', confirmLabel: 'Import', danger: true });
        if (!confirmed) return;
        Rk.store.load(parsed);
        ui.toast('Data imported', { tone: 'success' });
        if (body.isConnected) render();
      }, { once: true });
      picker.click();
    };
    const clearAll = async () => {
      const confirmed = await ui.confirm('Your history, pins, notes and every other piece of Rola data on this browser will be deleted.', { title: 'Clear all data', confirmLabel: 'Clear all', danger: true });
      if (!confirmed) return;
      Rk.store.load({});
      ui.toast('All data cleared', { tone: 'success' });
      if (body.isConnected) render();
    };
    const handle = toggleModal('data', () => ({
      title: 'Your Rola data',
      width: 600,
      className: 'rk-tools-data-modal',
      content: body,
      actions: [
        ui.button('Clear all', { variant: 'danger', size: 'md', onClick: clearAll }),
        ui.button('Import', { variant: 'secondary', size: 'md', icon: 'plus', onClick: importData }),
        ui.button('Export', { variant: 'primary', size: 'md', icon: 'download', onClick: exportData })
      ]
    }));
    if (handle) render();
  };

  const robuxRates = { buy: 0.0125, devex: 0.0038 };
  const usdFormat = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' });

  const openConverter = () => {
    let rate = 'buy';
    let source = 'robux';
    const note = el('p', { class: 'rk-tools-convert-note rk-muted' });
    const update = () => {
      const each = robuxRates[rate];
      const from = source === 'robux' ? robuxField : usdField;
      const value = Number(from.value);
      const valid = from.value.trim() !== '' && Number.isFinite(value) && value >= 0;
      if (source === 'robux') usdField.value = valid ? (value * each).toFixed(2) : '';
      else robuxField.value = valid ? String(Math.round(value / each)) : '';
      note.textContent = `${fmt.num(1000)} Robux is about ${usdFormat.format(1000 * each)} at this rate.`;
    };
    const robuxField = ui.input({ type: 'number', placeholder: '0', onInput: () => {
      source = 'robux';
      update();
    } });
    const usdField = ui.input({ type: 'number', placeholder: '0.00', onInput: () => {
      source = 'usd';
      update();
    } });
    robuxField.min = '0';
    robuxField.step = '1';
    robuxField.inputMode = 'numeric';
    usdField.min = '0';
    usdField.step = '0.01';
    usdField.inputMode = 'decimal';
    const rateSelect = ui.select([['buy', 'Buying Robux, $0.0125 each'], ['devex', 'DevEx, $0.0038 each']], rate, value => {
      rate = robuxRates[value] ? value : 'buy';
      update();
    });
    update();
    const handle = toggleModal('converter', () => ({
      title: 'Robux converter',
      width: 400,
      content: el('div', { class: 'rk-tools-convert' },
        el('label', { class: 'rk-tools-field' }, el('span', null, 'Rate'), rateSelect),
        el('label', { class: 'rk-tools-field' }, el('span', null, 'Robux'), robuxField),
        el('label', { class: 'rk-tools-field' }, el('span', null, 'US dollars'), usdField),
        note
      )
    }));
    if (handle) requestAnimationFrame(() => robuxField.focus());
  };

  const openNotesManager = () => {
    const names = new Map();
    for (const entry of [...list('pins.games'), ...list('history.games')]) {
      if (entry && Rk.isId(entry.placeId) && clip(entry.name)) names.set(`game:${Number(entry.placeId)}`, clip(entry.name));
    }
    for (const entry of list('history.profiles')) {
      const name = entry && Rk.isId(entry.userId) ? clip(entry.displayName, 60) || clip(entry.name, 40) : '';
      if (name) names.set(`user:${Number(entry.userId)}`, name);
    }
    const kinds = [
      { key: 'notes.games', type: 'game', label: 'Experiences', href: id => `/games/${id}`, fallback: id => `Experience ${id}` },
      { key: 'notes.users', type: 'user', label: 'People', href: id => `/users/${id}/profile`, fallback: id => `User ${id}` }
    ];
    const body = el('div', { class: 'rk-tools-notes' });
    const remove = (key, id) => {
      const notes = { ...record(key) };
      delete notes[id];
      Rk.store.set(key, notes);
      ui.toast('Note deleted');
      render();
    };
    const render = () => {
      let total = 0;
      const groups = [];
      for (const kind of kinds) {
        const notes = Object.entries(record(kind.key)).filter(([id, value]) => Rk.isId(id) && clip(value, 2000));
        if (!notes.length) continue;
        total += notes.length;
        groups.push(el('div', { class: 'rk-tools-notes-group' },
          el('div', { class: 'rk-tools-notes-heading' }, kind.label),
          notes.map(([id, value]) => ui.row(
            [
              ui.link(kind.href(Number(id)), names.get(`${kind.type}:${Number(id)}`) || kind.fallback(Number(id))),
              el('div', { class: 'rk-tools-note-text' }, clip(value, 2000))
            ],
            ui.button('', { variant: 'ghost', icon: 'trash', title: 'Delete note', onClick: () => remove(kind.key, id) }),
            { className: 'rk-tools-note' }
          ))
        ));
      }
      body.replaceChildren(...(total ? [el('p', { class: 'rk-modal-text rk-muted' }, fmt.plural(total, 'saved note')), ...groups] : [ui.empty('You have no saved notes yet')]));
    };
    const handle = toggleModal('notes', () => ({ title: 'Notes', width: 560, content: body }));
    if (!handle) return;
    render();
    const missing = Object.keys(record('notes.users')).filter(id => Rk.isId(id) && !names.has(`user:${Number(id)}`)).slice(0, 200);
    if (!missing.length) return;
    Rk.api.users(missing).then(users => {
      for (const [id, user] of users) {
        const name = user ? clip(user.displayName, 60) || clip(user.name, 40) : '';
        if (name) names.set(`user:${Number(id)}`, name);
      }
      if (body.isConnected) render();
    }).catch(() => {});
  };

  const minutesLabel = minutes => (minutes < 60 ? `${minutes}m` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`);
  const weekdayFormat = new Intl.DateTimeFormat(undefined, { weekday: 'short', timeZone: 'UTC' });
  const longDayFormat = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'short', day: 'numeric', timeZone: 'UTC' });

  const openTimeChart = () => {
    const days = record('tools.timeOnSite');
    const now = Date.now();
    const span = [];
    for (let back = 13; back >= 0; back--) {
      const date = new Date(now - back * 86400000);
      const value = Number(days[dayKey(date)]);
      span.push([date, Number.isFinite(value) && value > 0 ? Math.round(value) : 0]);
    }
    const max = Math.max(1, ...span.map(entry => entry[1]));
    const sum = entries => entries.reduce((total, entry) => total + entry[1], 0);
    const chart = el('div', { class: 'rk-tools-time-chart' }, span.map(([date, minutes], index) => ui.tip(
      el('div', { class: 'rk-tools-time-col' },
        el('div', { class: 'rk-tools-time-track' },
          el('div', {
            class: `rk-tools-time-bar${index === span.length - 1 ? ' rk-tools-time-today' : ''}`,
            style: { height: `${minutes ? Math.max(3, (minutes / max) * 100).toFixed(1) : 0}%` }
          })
        ),
        el('div', { class: 'rk-tools-time-label' }, weekdayFormat.format(date))
      ),
      `${longDayFormat.format(date)}: ${minutesLabel(minutes)}`
    )));
    const handle = toggleModal('time', () => ({
      title: 'Time on Roblox',
      width: 560,
      content: [
        ui.stats([
          ['Today', minutesLabel(span[span.length - 1][1])],
          ['Last 7 days', minutesLabel(sum(span.slice(-7)))],
          ['Daily average', minutesLabel(Math.round(sum(span) / span.length))]
        ]),
        chart,
        el('p', { class: 'rk-tools-time-note rk-muted' }, 'Only time with a Roblox tab in view is counted.')
      ]
    }));
    if (handle) requestAnimationFrame(() => requestAnimationFrame(() => chart.classList.add('rk-tools-time-in')));
  };

  const confetti = () => {
    if (!Rk.isEnabled('tools.confetti') || !document.body || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const width = window.innerWidth;
    const height = window.innerHeight;
    const scale = window.devicePixelRatio || 1;
    const canvas = el('canvas', { class: 'rk-tools-confetti', 'aria-hidden': 'true' });
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    document.body.append(canvas);
    const context = canvas.getContext('2d');
    context.scale(scale, scale);
    const colors = ['#335fff', '#00b06f', '#f7c948', '#ff5c8a', '#a970ff', '#ffffff'];
    const pieces = Array.from({ length: 140 }, () => {
      const angle = Math.random() * Math.PI * 2;
      const speed = 4 + Math.random() * 9;
      return {
        x: width / 2,
        y: height * 0.4,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 4,
        size: 5 + Math.random() * 5,
        spin: Math.random() * Math.PI,
        turn: (Math.random() - 0.5) * 0.3,
        color: colors[Math.floor(Math.random() * colors.length)]
      };
    });
    const start = performance.now();
    let last = start;
    const frame = now => {
      const step = Math.min((now - last) / 16.7, 3);
      last = now;
      const elapsed = now - start;
      context.clearRect(0, 0, width, height);
      context.globalAlpha = Math.min(1, Math.max(0, (1800 - elapsed) / 500));
      for (const piece of pieces) {
        piece.vx *= 0.985 ** step;
        piece.vy = piece.vy * 0.985 ** step + 0.25 * step;
        piece.x += piece.vx * step;
        piece.y += piece.vy * step;
        piece.spin += piece.turn * step;
        context.save();
        context.translate(piece.x, piece.y);
        context.rotate(piece.spin);
        context.fillStyle = piece.color;
        context.fillRect(-piece.size / 2, -piece.size / 4, piece.size, piece.size / 2);
        context.restore();
      }
      if (elapsed < 1800) requestAnimationFrame(frame);
      else canvas.remove();
    };
    requestAnimationFrame(frame);
  };

  const openUnfriends = async () => {
    const body = el('div', { class: 'rk-tools-unfriends' }, ui.spinner());
    const handle = toggleModal('unfriends', () => ({ title: 'Unfriends', width: 480, content: body }));
    if (!handle) return;
    const log = await Rk.bg('unfriends').catch(() => []);
    const entries = (Array.isArray(log) ? log : []).filter(entry => entry && Rk.isId(entry.userId));
    if (!entries.length) {
      body.replaceChildren(ui.empty('Nobody has unfriended you since this was turned on'));
      return;
    }
    body.replaceChildren(...entries.map(entry => ui.row(
      [
        ui.thumb(Rk.thumb('AvatarHeadShot', entry.userId, '48x48', { circular: true }), { size: 36, round: true }),
        el('div', { class: 'rk-tools-person' },
          ui.link(`/users/${entry.userId}/profile`, clip(entry.displayName, 60) || `User ${entry.userId}`),
          el('span', { class: 'rk-muted' }, [clip(entry.name, 40) ? `@${clip(entry.name, 40)}` : '', entry.banned ? 'Banned or deleted' : ''].filter(Boolean).join(' · '))
        )
      ],
      el('span', { class: 'rk-muted' }, fmt.ago(entry.time))
    )));
  };

  const playtimeGames = async () => {
    const games = await Rk.bg('playtime').catch(() => ({}));
    return Object.entries(isObject(games) ? games : {})
      .filter(([id, game]) => Rk.isId(id) && isObject(game) && Number(game.minutes) >= 1)
      .map(([id, game]) => ({
        universeId: Number(id),
        minutes: Math.round(game.minutes),
        placeId: Rk.isId(game.placeId) ? Number(game.placeId) : null,
        name: clip(game.name, 120) || `Experience ${id}`
      }))
      .sort((a, b) => b.minutes - a.minutes);
  };

  const openPlaytime = async () => {
    const body = el('div', null, ui.spinner());
    const handle = toggleModal('playtime', () => ({ title: 'Playtime', width: 520, content: body }));
    if (!handle) return;
    const games = await playtimeGames();
    if (!games.length) {
      body.replaceChildren(ui.empty('No playtime yet, it counts while you play with this turned on'));
      return;
    }
    const total = games.reduce((sum, game) => sum + game.minutes, 0);
    body.replaceChildren(
      ui.stats([['Total', minutesLabel(total)], ['Experiences', fmt.num(games.length)], ['Most played', games[0].name]]),
      el('div', { class: 'rk-tools-playtime' }, games.slice(0, 50).map(game => ui.row(
        [
          ui.thumb(Rk.thumb('GameIcon', game.universeId, '50x50'), { size: 36 }),
          game.placeId ? ui.link(`/games/${game.placeId}`, game.name) : el('span', null, game.name)
        ],
        el('span', { class: 'rk-muted' }, minutesLabel(game.minutes))
      ))),
      el('p', { class: 'rk-tools-time-note rk-muted' }, 'Counted from your online status about once a minute, so short sessions can be missed.')
    );
  };

  const valueTiers = [100000, 500000, 1000000, 5000000, 10000000, 20000000, 50000000, 100000000];
  const tierLabel = amount => (amount >= 1000000 ? `${amount / 1000000}M+` : `${amount / 1000}K+`);

  const achievementList = [
    ['site-1h', 'Getting comfy', 'Spend an hour on the site', 'siteMinutes', 60],
    ['site-10h', 'Regular', 'Spend 10 hours on the site', 'siteMinutes', 600],
    ['site-50h', 'Always online', 'Spend 50 hours on the site', 'siteMinutes', 3000],
    ['streak-3', 'Back again', 'Visit 3 days in a row', 'streak', 3],
    ['streak-7', 'Weekly habit', 'Visit 7 days in a row', 'streak', 7],
    ['streak-30', 'Dedicated', 'Visit 30 days in a row', 'streak', 30],
    ['launch-1', 'Liftoff', 'Launch an experience', 'launches', 1],
    ['launch-50', 'Frequent flyer', 'Launch experiences 50 times', 'launches', 50],
    ['launch-250', 'Main character', 'Launch experiences 250 times', 'launches', 250],
    ['play-10h', 'Grinder', 'Play for 10 hours', 'playMinutes', 600],
    ['play-100h', 'Veteran', 'Play for 100 hours', 'playMinutes', 6000],
    ['play-games', 'Explorer', 'Play 10 different experiences', 'playGames', 10],
    ['profiles-25', 'People watcher', 'Visit 25 profiles', 'profiles', 25],
    ['pins-5', 'Curator', 'Pin 5 experiences', 'pins', 5],
    ['wishlist-10', 'Window shopper', 'Put 10 items on your wishlist', 'wishlist', 10],
    ['servers-10', 'Server hopper', 'Join servers in 10 experiences', 'servers', 10],
    ['notes-5', 'Note taker', 'Write 5 notes', 'notes', 5],
    ['unfriended', 'Survivor', 'Get unfriended and keep going', 'unfriends', 1],
    ['night-owl', 'Night owl', 'Browse between 2 and 5 at night', 'nightOwl', 1],
    ...valueTiers.map(amount => [`value-${amount}`, `${tierLabel(amount)} value`, `Reach ${tierLabel(amount)} inventory value`, 'value', amount])
  ].map(([id, name, description, metric, goal]) => ({ id, name, description, metric, goal }));

  const streakOf = days => {
    const seen = new Set(days);
    let streak = 0;
    for (let date = new Date(); seen.has(dayKey(date)); date = new Date(date.getTime() - 86400000)) streak++;
    return streak;
  };

  const achievementStats = async saved => {
    const [games, unfriends] = await Promise.all([
      Rk.isEnabled('tools.playtime') ? playtimeGames() : [],
      Rk.isEnabled('tools.unfriendAlerts') ? Rk.bg('unfriends').catch(() => []) : []
    ]);
    const total = values => values.reduce((sum, value) => sum + (Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : 0), 0);
    return {
      siteMinutes: total(Object.values(record('tools.timeOnSite'))),
      streak: streakOf(Array.isArray(saved.days) ? saved.days : []),
      launches: total(Object.values(record('games.launches')).map(entry => isObject(entry) ? entry.count : 0)),
      playMinutes: total(games.map(game => game.minutes)),
      playGames: games.length,
      profiles: list('history.profiles').length,
      pins: list('pins.games').length,
      wishlist: list('wishlist').length,
      servers: Object.keys(record('servers.last')).length,
      notes: Object.keys(record('notes.users')).length + Object.keys(record('notes.games')).length,
      unfriends: Array.isArray(unfriends) ? unfriends.length : 0,
      nightOwl: saved.nightOwl ? 1 : 0,
      value: Number.isFinite(saved.value) ? saved.value : 0
    };
  };

  const inventoryValue = async userId => {
    const [items, values] = await Promise.all([
      Rk.api.paged(`https://inventory.roblox.com/v1/users/${userId}/assets/collectibles?sortOrder=Asc`, { max: 2000, limit: 100 }),
      Rk.values()
    ]);
    return items.reduce((sum, item) => {
      const entry = item ? values.get(Number(item.assetId)) : null;
      const rap = item && Number(item.recentAveragePrice) > 0 ? Number(item.recentAveragePrice) : 0;
      return sum + (entry && entry.value > 0 ? entry.value : rap);
    }, 0);
  };

  const openAchievements = async () => {
    const body = el('div', null, ui.spinner());
    const handle = toggleModal('achievements', () => ({ title: 'Achievements', width: 640, content: body }));
    if (!handle) return;
    const saved = record('tools.achievements');
    const unlocked = isObject(saved.unlocked) ? saved.unlocked : {};
    const stats = await achievementStats(saved);
    const tile = entry => {
      const done = Number.isFinite(unlocked[entry.id]);
      const current = Math.min(stats[entry.metric], entry.goal);
      return el('div', { class: `rk-tools-ach${done ? ' rk-tools-ach-done' : ''}` },
        el('div', { class: 'rk-tools-ach-name' }, done ? icon('check', 14) : null, entry.name),
        el('div', { class: 'rk-tools-ach-desc' }, entry.description),
        done ? el('div', { class: 'rk-tools-ach-desc' }, `Unlocked ${fmt.date(unlocked[entry.id])}`) : [ui.progress(current / entry.goal), el('div', { class: 'rk-tools-ach-desc' }, `${fmt.num(Math.floor(current))} of ${fmt.num(entry.goal)}`)]
      );
    };
    const regular = achievementList.filter(entry => entry.metric !== 'value');
    const tiers = achievementList.filter(entry => entry.metric === 'value');
    const count = achievementList.filter(entry => Number.isFinite(unlocked[entry.id])).length;
    body.replaceChildren(
      el('p', { class: 'rk-modal-text rk-muted' }, `${fmt.num(count)} of ${fmt.num(achievementList.length)} unlocked`),
      el('div', { class: 'rk-tools-ach-heading' }, 'Inventory value'),
      el('div', { class: 'rk-tools-tiers' }, tiers.map(entry => ui.tip(
        el('span', { class: `rk-tools-tier${Number.isFinite(unlocked[entry.id]) ? ' rk-tools-tier-done' : ''}` }, tierLabel(entry.goal)),
        Number.isFinite(unlocked[entry.id]) ? `Unlocked ${fmt.date(unlocked[entry.id])}` : `${fmt.num(stats.value)} of ${fmt.num(entry.goal)}`
      ))),
      el('div', { class: 'rk-tools-ach-heading' }, 'Milestones'),
      el('div', { class: 'rk-tools-ach-grid' }, regular.map(tile))
    );
  };

  let quickNotes = null;

  const toggleQuickNotes = () => {
    if (quickNotes) {
      quickNotes.close();
      return;
    }
    const previousFocus = document.activeElement;
    const saved = Rk.store.get('notes.quick', '');
    let timer = 0;
    const area = el('textarea', { class: 'rk-tools-quick-area', maxlength: 5000, placeholder: 'Write anything, it saves as you type', 'aria-label': 'Quick notes' });
    area.value = typeof saved === 'string' ? saved.slice(0, 5000) : '';
    const count = el('span');
    const syncCount = () => {
      count.textContent = `${fmt.num(area.value.length)} of ${fmt.num(5000)}`;
    };
    const save = () => {
      clearTimeout(timer);
      timer = 0;
      Rk.store.set('notes.quick', area.value.slice(0, 5000));
    };
    const root = el('div', { class: 'rk-tools-quick', role: 'dialog', 'aria-label': 'Quick notes' },
      el('div', { class: 'rk-tools-quick-head' },
        el('span', { class: 'rk-tools-quick-title' }, 'Quick notes'),
        ui.button('', { variant: 'ghost', icon: 'close', title: 'Close', onClick: () => close() })
      ),
      area,
      el('div', { class: 'rk-tools-quick-foot rk-muted' }, count)
    );
    const close = () => {
      if (quickNotes !== handle) return;
      quickNotes = null;
      if (timer) save();
      const hadFocus = root.contains(document.activeElement);
      root.classList.remove('rk-tools-quick-open');
      root.addEventListener('transitionend', () => root.remove(), { once: true });
      setTimeout(() => root.remove(), 300);
      if (hadFocus && previousFocus && previousFocus !== document.body && previousFocus.isConnected && typeof previousFocus.focus === 'function') previousFocus.focus({ preventScroll: true });
    };
    const handle = { close };
    area.addEventListener('input', () => {
      syncCount();
      clearTimeout(timer);
      timer = setTimeout(save, 400);
    });
    area.addEventListener('blur', () => {
      if (timer) save();
    });
    area.addEventListener('keydown', event => {
      if (event.key !== 'Escape' && !(event.altKey && event.code === 'KeyN')) return;
      event.preventDefault();
      event.stopPropagation();
      close();
    });
    syncCount();
    quickNotes = handle;
    (document.body || document.documentElement).append(root);
    area.focus({ preventScroll: true });
    requestAnimationFrame(() => {
      if (quickNotes === handle) root.classList.add('rk-tools-quick-open');
    });
  };

  const searchGroups = [
    ['go', 'Go to'],
    ['pinned', 'Pinned'],
    ['games', 'Recent experiences'],
    ['friends', 'Friends'],
    ['profiles', 'Recent profiles'],
    ['items', 'Recent items'],
    ['pages', 'Pages'],
    ['tools', 'Tools'],
    ['search', 'Search']
  ];

  const searchPages = [
    ['Home', () => '/home', 'grid', 'feed start'],
    ['Avatar', () => '/my/avatar', 'user', 'editor outfits customize'],
    ['Inventory', user => (user ? `/users/${user.id}/inventory` : '/users/inventory'), 'list', 'items owned'],
    ['Trades', () => '/trades', 'swap', 'trading'],
    ['Transactions', () => '/transactions', 'robux', 'purchases sales spending'],
    ['Friends', () => '/users/friends', 'users', 'connections followers following'],
    ['Messages', () => '/my/messages', 'bell', 'inbox'],
    ['Settings', () => '/my/account', 'sliders', 'account privacy security'],
    ['Create', () => 'https://create.roblox.com/', 'edit', 'studio develop creations dashboard']
  ];

  const searchTargets = [
    ['experience', 'Experience', id => `/games/${id}`, 'play'],
    ['user', 'User', id => `/users/${id}/profile`, 'user'],
    ['item', 'Item', id => `/catalog/${id}`, 'tag'],
    ['bundle', 'Bundle', id => `/bundles/${id}`, 'tag'],
    ['community', 'Community', id => `/communities/${id}`, 'users'],
    ['badge', 'Badge', id => `/badges/${id}`, 'shield'],
    ['game pass', 'Game pass', id => `/game-pass/${id}`, 'star']
  ];

  const searchTools = [
    ['tools.dataManager', 'Manage local data', 'server', openDataManager, 'export import backup storage'],
    ['tools.notesManager', 'Open notes', 'note', openNotesManager, 'notes saved'],
    ['tools.timeOnSite', 'Time on Roblox', 'clock', openTimeChart, 'usage screen time chart'],
    ['tools.robuxConverter', 'Robux converter', 'robux', openConverter, 'usd dollars devex money'],
    ['tools.playtime', 'Playtime', 'play', openPlaytime, 'hours played games stats'],
    ['tools.achievements', 'Achievements', 'star', openAchievements, 'badges goals milestones value'],
    ['tools.unfriendAlerts', 'Unfriends', 'users', openUnfriends, 'removed friends unfriended'],
    ['tools.quickNotes', 'Quick notes', 'edit', toggleQuickNotes, 'notepad scratch'],
    ['tools.shortcutHelp', 'Keyboard shortcuts', 'keyboard', openShortcuts, 'hotkeys keys help']
  ];

  const searchRows = new Map();
  let searchState = null;
  let searchFriends = null;
  let searchFriendsRequest = null;
  let searchMe = null;
  const searchVerified = new Set();

  const isVerified = id => searchVerified.has(id) || (Boolean(searchMe) && id === searchMe.id && Rk.isEnabled('profiles.fakeVerified'));

  const searchItem = (group, uid, props) => ({
    group,
    uid,
    key: `${group}:${uid}`,
    lower: props.title.toLowerCase(),
    haystack: [props.title, props.detail, props.keywords].filter(Boolean).join(' ').toLowerCase(),
    ...props
  });

  const personItem = (group, kind, user) => searchItem(group, `user:${user.id}`, {
    title: user.displayName || user.name || `User ${user.id}`,
    detail: user.name ? `@${user.name}` : '',
    kind,
    href: `/users/${user.id}/profile`,
    round: true,
    verified: isVerified(user.id),
    thumb: () => Rk.thumb('AvatarHeadShot', user.id, '48x48')
  });

  const searchBase = () => {
    const items = [];
    for (const [group, key] of [['pinned', 'pins.games'], ['games', 'history.games']]) {
      for (const entry of list(key)) {
        if (!entry || !Rk.isId(entry.placeId)) continue;
        const placeId = Number(entry.placeId);
        const universe = Rk.isId(entry.universeId) ? Number(entry.universeId) : null;
        items.push(searchItem(group, `game:${placeId}`, {
          title: clip(entry.name) || `Experience ${placeId}`,
          kind: 'Experience',
          href: `/games/${placeId}`,
          thumb: () => (universe ? Rk.thumb('GameIcon', universe, '50x50') : Rk.api.universeId(placeId).then(id => (id ? Rk.thumb('GameIcon', id, '50x50') : null)))
        }));
      }
    }
    for (const friend of searchFriends || []) items.push(personItem('friends', 'Friend', friend));
    for (const entry of list('history.profiles')) {
      if (!entry || !Rk.isId(entry.userId)) continue;
      items.push(personItem('profiles', 'Profile', { id: Number(entry.userId), name: clip(entry.name, 40), displayName: clip(entry.displayName, 60) }));
    }
    for (const entry of list('history.items')) {
      if (!entry || !Rk.isId(entry.id) || (entry.kind !== 'asset' && entry.kind !== 'bundle')) continue;
      const id = Number(entry.id);
      const bundle = entry.kind === 'bundle';
      items.push(searchItem('items', `${entry.kind}:${id}`, {
        title: clip(entry.name) || `Item ${id}`,
        kind: bundle ? 'Bundle' : 'Item',
        href: bundle ? `/bundles/${id}` : `/catalog/${id}`,
        thumb: () => Rk.thumb(bundle ? 'BundleThumbnail' : 'Asset', id, '150x150')
      }));
    }
    for (const [title, href, iconName, keywords] of searchPages) {
      items.push(searchItem('pages', `page:${title}`, { title, kind: 'Page', href: href(searchMe), icon: iconName, keywords }));
    }
    for (const [id, title, iconName, run, keywords] of searchTools) {
      if (Rk.isEnabled(id)) items.push(searchItem('tools', `tool:${id}`, { title, kind: 'Tool', icon: iconName, run, keywords }));
    }
    return items;
  };

  const loadSearchFriends = () => {
    if (!searchFriendsRequest) {
      searchFriendsRequest = Rk.me().then(async user => {
        if (!user) return [];
        const json = await Rk.api.get(`https://friends.roblox.com/v1/users/${user.id}/friends`, { cache: 300000 });
        const ids = (json && Array.isArray(json.data) ? json.data : []).map(friend => friend && friend.id).filter(id => Rk.isId(id)).slice(0, 1000);
        const visited = list('history.profiles').map(entry => entry && entry.userId).filter(id => Rk.isId(id)).slice(0, 40);
        const users = await Rk.api.users([...ids, ...visited]);
        for (const [id, info] of users) {
          if (info && info.hasVerifiedBadge === true) searchVerified.add(Number(id));
        }
        return ids
          .map(id => users.get(Number(id)))
          .filter(friend => friend && Rk.isId(friend.id))
          .map(friend => ({ id: Number(friend.id), name: clip(friend.name, 40), displayName: clip(friend.displayName, 60) }));
      }).then(result => {
        searchFriends = result;
        return result;
      }, () => {
        searchFriendsRequest = null;
        return [];
      });
    }
    return searchFriendsRequest;
  };

  const robloxLink = value => {
    if (!/^(https?:\/\/)?([a-z0-9-]+\.)*roblox\.com([/?#]|$)/i.test(value)) return null;
    let url = null;
    try {
      url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    } catch {
      return null;
    }
    if (!robloxHost(url.hostname)) return null;
    url.protocol = 'https:';
    if (/^(web\.)?roblox\.com$/i.test(url.hostname)) url.hostname = 'www.roblox.com';
    return url.href;
  };

  const searchActions = raw => {
    const items = [];
    if (!raw) return items;
    const link = robloxLink(raw);
    if (link) {
      items.push(searchItem('go', 'link', { title: 'Open link', detail: link.replace(/^https:\/\//, ''), kind: 'Link', icon: 'link', href: link }));
      return items;
    }
    if (digitsPattern.test(raw) && Rk.isId(raw)) {
      const id = Number(raw);
      for (const [type, kind, href, iconName] of searchTargets) {
        items.push(searchItem('go', `id:${type}`, { title: `Open ${type} #${id}`, kind, icon: iconName, href: href(id) }));
      }
    }
    if (usernamePattern.test(raw) && !/^\d+$/.test(raw)) {
      items.push(searchItem('search', 'user', { title: `Open user ${raw}`, kind: 'User', icon: 'user', username: raw }));
    }
    items.push(searchItem('search', 'people', { title: `Search people for ${raw}`, kind: 'Search', icon: 'search', href: `/search/users?keyword=${encodeURIComponent(raw)}` }));
    items.push(searchItem('search', 'experiences', { title: `Search experiences for ${raw}`, kind: 'Search', icon: 'search', href: `/search/experiences?keyword=${encodeURIComponent(raw)}` }));
    return items;
  };

  const searchRank = (item, query, words) => {
    if (!query) return 1;
    if (!words.every(word => item.haystack.includes(word))) return 0;
    if (item.lower === query) return 4;
    if (item.lower.startsWith(query)) return 3;
    return item.lower.split(/[\s_-]+/).some(part => part.startsWith(words[0])) ? 2 : 1;
  };

  const searchRow = item => {
    const cacheKey = item.thumb ? `${item.key}|${item.title}|${item.verified ? 1 : 0}` : null;
    if (cacheKey && searchRows.has(cacheKey)) return searchRows.get(cacheKey);
    const node = el('div', { class: 'rk-tools-qs-item', role: 'option', 'aria-selected': 'false' },
      el('span', { class: 'rk-tools-qs-media' }, item.thumb
        ? ui.thumb(item.thumb(), { size: 32, round: item.round })
        : el('span', { class: 'rk-tools-qs-icon' }, icon(item.icon || 'chevronRight', 16))),
      el('span', { class: 'rk-tools-qs-text' },
        el('span', { class: 'rk-tools-qs-title' }, item.title),
        item.verified ? ui.verified({ size: 14 }) : null,
        item.detail ? el('span', { class: 'rk-tools-qs-detail' }, item.detail) : null
      ),
      el('span', { class: 'rk-tools-qs-kind' }, item.kind)
    );
    if (cacheKey) searchRows.set(cacheKey, node);
    return node;
  };

  const setSearchActive = (index, scroll) => {
    const state = searchState;
    if (!state) return;
    const previous = state.nodes[state.active];
    if (previous) previous.setAttribute('aria-selected', 'false');
    state.active = index;
    const node = state.nodes[index];
    if (!node) {
      state.input.removeAttribute('aria-activedescendant');
      return;
    }
    node.setAttribute('aria-selected', 'true');
    state.input.setAttribute('aria-activedescendant', node.id);
    if (!scroll) return;
    node.scrollIntoView({ block: 'nearest' });
    const title = node.previousElementSibling;
    if (title && title.classList.contains('rk-tools-qs-group-title')) title.scrollIntoView({ block: 'nearest' });
  };

  const renderSearch = keep => {
    const state = searchState;
    if (!state) return;
    const raw = state.input.value.trim();
    const query = raw.toLowerCase();
    const words = query.split(/\s+/).filter(Boolean);
    const previous = keep && state.results[state.active] ? state.results[state.active].key : null;
    const extra = searchActions(raw);
    const seen = new Set();
    const results = [];
    const nodes = [];
    const groups = [];
    for (const [group, label] of searchGroups) {
      if (!query && group === 'friends') continue;
      let matches = [];
      if (group === 'go' || group === 'search') {
        matches = extra.filter(item => item.group === group);
      } else {
        const ranked = [];
        for (const item of state.base) {
          if (item.group !== group || seen.has(item.uid)) continue;
          const score = searchRank(item, query, words);
          if (score) ranked.push([item, score]);
        }
        ranked.sort((a, b) => b[1] - a[1]);
        for (const [item] of ranked) {
          if (matches.length === 8) break;
          if (seen.has(item.uid)) continue;
          seen.add(item.uid);
          matches.push(item);
        }
      }
      if (!matches.length) continue;
      groups.push(el('div', { class: 'rk-tools-qs-group', role: 'group', 'aria-label': label },
        el('div', { class: 'rk-tools-qs-group-title', 'aria-hidden': 'true' }, label),
        matches.map(item => {
          const node = searchRow(item);
          node.dataset.index = String(results.length);
          node.id = `rk-tools-qs-option-${results.length}`;
          node.setAttribute('aria-selected', 'false');
          results.push(item);
          nodes.push(node);
          return node;
        })
      ));
    }
    state.results = results;
    state.nodes = nodes;
    state.list.replaceChildren(...(groups.length ? groups : [ui.empty('Nothing matches that search')]));
    const index = previous ? results.findIndex(item => item.key === previous) : -1;
    setSearchActive(index === -1 ? 0 : index, false);
    if (!keep) state.list.scrollTop = 0;
  };

  const activateSearch = async (item, newTab) => {
    const state = searchState;
    if (!state || !item || state.busy) return;
    if (item.username) {
      state.busy = true;
      const node = state.nodes[state.results.indexOf(item)];
      const kind = node ? node.querySelector('.rk-tools-qs-kind') : null;
      if (kind) kind.replaceChildren(ui.spinner(14));
      const opened = await openUser(item.username, newTab);
      state.busy = false;
      if (kind) kind.textContent = item.kind;
      if (opened && searchState === state) closeSearch();
      return;
    }
    closeSearch();
    if (item.run) item.run();
    else if (item.href) go(item.href, newTab);
  };

  const itemFromEvent = event => {
    const node = searchState && event.target && event.target.closest ? event.target.closest('.rk-tools-qs-item') : null;
    return node ? searchState.results[Number(node.dataset.index)] || null : null;
  };

  const onSearchKey = event => {
    const state = searchState;
    if (!state || event.isComposing || event.keyCode === 229) return;
    const count = state.results.length;
    if (event.key === 'Escape') {
      closeSearch();
    } else if (event.key === 'ArrowDown' || (event.key === 'Tab' && !event.shiftKey)) {
      if (count) setSearchActive((state.active + 1) % count, true);
    } else if (event.key === 'ArrowUp' || (event.key === 'Tab' && event.shiftKey)) {
      if (count) setSearchActive((state.active - 1 + count) % count, true);
    } else if (event.key === 'Enter') {
      activateSearch(state.results[state.active], event.ctrlKey || event.metaKey);
    } else {
      return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
  };

  const closeSearch = () => {
    const state = searchState;
    if (!state) return;
    searchState = null;
    window.removeEventListener('keydown', onSearchKey, true);
    state.root.classList.remove('rk-modal-open');
    state.root.addEventListener('transitionend', () => state.root.remove(), { once: true });
    setTimeout(() => state.root.remove(), 260);
    const previous = state.previousFocus;
    if (previous && previous !== document.body && previous.isConnected && typeof previous.focus === 'function') previous.focus({ preventScroll: true });
    else state.input.blur();
  };

  const openSearch = () => {
    if (searchState) return;
    let pointer = '';
    const input = el('input', {
      class: 'rk-tools-qs-input',
      type: 'text',
      placeholder: 'Search experiences, people, pages and tools',
      maxlength: 200,
      spellcheck: 'false',
      autocomplete: 'off',
      role: 'combobox',
      'aria-label': 'Quick search',
      'aria-expanded': 'true',
      'aria-controls': 'rk-tools-qs-list',
      'aria-autocomplete': 'list',
      oninput: () => renderSearch(false)
    });
    const listNode = el('div', {
      class: 'rk-tools-qs-list',
      id: 'rk-tools-qs-list',
      role: 'listbox',
      'aria-label': 'Results',
      onmousemove: event => {
        const position = `${event.clientX},${event.clientY}`;
        if (position === pointer) return;
        pointer = position;
        const node = event.target.closest ? event.target.closest('.rk-tools-qs-item') : null;
        const index = node ? Number(node.dataset.index) : -1;
        if (searchState && index !== -1 && index !== searchState.active) setSearchActive(index, false);
      },
      onclick: event => activateSearch(itemFromEvent(event), event.ctrlKey || event.metaKey || event.shiftKey),
      onauxclick: event => {
        if (event.button !== 1) return;
        const item = itemFromEvent(event);
        if (!item) return;
        event.preventDefault();
        activateSearch(item, true);
      }
    });
    const head = el('div', { class: 'rk-tools-qs-head' }, icon('search', 18), input);
    const hint = (keys, label) => el('span', { class: 'rk-tools-qs-hint' }, keys.map(key => kbd(key)), label);
    const foot = el('div', { class: 'rk-tools-qs-foot' },
      hint(['\u2191', '\u2193'], 'to move'),
      hint(['Enter'], 'to open'),
      hint([modLabel, 'Enter'], 'for a new tab'),
      hint(['Esc'], 'to close')
    );
    const panel = el('div', {
      class: 'rk-tools-qs',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-label': 'Quick search',
      onmousedown: event => {
        if (event.target !== input) event.preventDefault();
      }
    }, head, listNode, foot);
    const root = el('div', {
      class: 'rk-modal-backdrop rk-tools-qs-backdrop',
      onmousedown: event => {
        if (event.target === root) closeSearch();
      }
    }, panel);
    const state = { root, input, list: listNode, base: searchBase(), results: [], nodes: [], active: 0, busy: false, previousFocus: document.activeElement };
    searchState = state;
    renderSearch(false);
    (document.body || document.documentElement).append(root);
    input.focus({ preventScroll: true });
    window.addEventListener('keydown', onSearchKey, true);
    requestAnimationFrame(() => {
      if (searchState === state) root.classList.add('rk-modal-open');
    });
    if (searchFriends) return;
    const loading = ui.spinner(14);
    head.append(loading);
    loadSearchFriends().then(() => {
      loading.remove();
      if (searchState !== state) return;
      state.base = searchBase();
      renderSearch(true);
    });
  };

  const toggleSearch = () => {
    if (searchState) closeSearch();
    else openSearch();
  };

  const kbdCss = `
      .rk-tools-kbd {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 22px;
        height: 22px;
        padding: 0 6px !important;
        border: 1px solid var(--rk-border);
        border-bottom-width: 2px;
        border-radius: 6px !important;
        background: var(--rk-surface) !important;
        box-shadow: none !important;
        color: var(--rk-text-strong) !important;
        font-family: var(--rk-font);
        font-size: 12px !important;
        font-weight: 600;
        line-height: 1;
        white-space: nowrap;
      }
  `;

  Rk.feature({
    id: 'tools.quickSearch',
    category: 'tools',
    name: 'Quick search',
    description: 'Press Ctrl+K or Cmd+K to jump to experiences, people, friends, pages and tools from anywhere.',
    css: `${kbdCss}
      .rk-modal-backdrop.rk-tools-qs-backdrop {
        align-items: flex-start;
        padding-top: 18vh;
        transition-duration: 160ms;
      }
      .rk-modal-backdrop.rk-tools-qs-backdrop:not(.rk-modal-open) {
        pointer-events: none;
      }
      .rk-tools-qs {
        display: flex;
        flex-direction: column;
        width: min(640px, calc(100vw - 32px));
        max-height: calc(82vh - 16px);
        overflow: hidden;
        border: 1px solid var(--rk-border);
        border-radius: 12px;
        background: var(--rk-bg);
        box-shadow: var(--rk-shadow);
        color: var(--rk-text);
        font-family: var(--rk-font);
        opacity: 0;
        transform: translateY(-6px) scale(0.98);
        transition: opacity 160ms ease, transform 160ms var(--rk-ease);
      }
      .rk-modal-open .rk-tools-qs {
        opacity: 1;
        transform: none;
      }
      .rk-tools-qs-head {
        display: flex;
        align-items: center;
        gap: 10px;
        flex: none;
        height: 52px;
        padding: 0 16px;
        border-bottom: 1px solid var(--rk-border);
        color: var(--rk-muted);
      }
      .rk-tools-qs-head .rk-tools-qs-input {
        flex: 1;
        min-width: 0;
        height: 100%;
        margin: 0;
        padding: 0;
        border: 0 !important;
        border-radius: 0;
        outline: none !important;
        background: transparent !important;
        box-shadow: none !important;
        color: var(--rk-text-strong);
        font-family: var(--rk-font);
        font-size: 16px;
        font-weight: 500;
      }
      .rk-tools-qs-head .rk-tools-qs-input::placeholder {
        color: var(--rk-muted);
      }
      .rk-tools-qs-list {
        flex: 1;
        min-height: 0;
        max-height: min(440px, 56vh);
        padding: 6px;
        overflow-y: auto;
        overscroll-behavior: contain;
        scroll-padding: 6px 0;
      }
      .rk-tools-qs-group + .rk-tools-qs-group {
        margin-top: 4px;
      }
      .rk-tools-qs-group-title {
        padding: 8px 10px 4px;
        font-size: 12px;
        font-weight: 600;
        color: var(--rk-muted);
      }
      .rk-tools-qs-item {
        display: flex;
        align-items: center;
        gap: 12px;
        min-height: 44px;
        padding: 6px 10px;
        border-radius: var(--rk-radius);
        cursor: pointer;
        transition: background-color 120ms ease;
      }
      .rk-tools-qs-item[aria-selected="true"] {
        background: var(--rk-shift);
      }
      .rk-tools-qs-media {
        display: flex;
        flex: none;
        width: 32px;
        height: 32px;
      }
      .rk-tools-qs-media .rk-thumb:not(.rk-thumb-round) {
        border-radius: 6px;
      }
      .rk-tools-qs-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        border-radius: var(--rk-radius);
        background: var(--rk-shift);
        color: var(--rk-text-strong);
      }
      .rk-tools-qs-text {
        display: flex;
        align-items: baseline;
        gap: 8px;
        flex: 1;
        min-width: 0;
      }
      .rk-tools-qs-title {
        flex: 0 1 auto;
        min-width: 0;
        overflow: hidden;
        font-size: 14px;
        font-weight: 600;
        color: var(--rk-text-strong);
        white-space: nowrap;
        text-overflow: ellipsis;
      }
      .rk-tools-qs-text > .rk-verified {
        align-self: center;
        margin-left: -4px;
      }
      .rk-tools-qs-detail {
        flex: 0 100 auto;
        min-width: 0;
        overflow: hidden;
        font-size: 13px;
        color: var(--rk-muted);
        white-space: nowrap;
        text-overflow: ellipsis;
      }
      .rk-tools-qs-kind {
        display: flex;
        align-items: center;
        flex: none;
        font-size: 12px;
        color: var(--rk-muted);
      }
      .rk-tools-qs-foot {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 6px 16px;
        flex: none;
        padding: 8px 16px;
        border-top: 1px solid var(--rk-border);
        font-size: 12px;
        color: var(--rk-muted);
      }
      .rk-tools-qs-hint {
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }
      @media (max-width: 560px) {
        .rk-tools-qs-foot {
          display: none;
        }
      }
      @media (prefers-reduced-motion: reduce) {
        .rk-modal-backdrop.rk-tools-qs-backdrop,
        .rk-tools-qs {
          transition: none !important;
        }
      }
    `,
    run(ctx) {
      Rk.me().then(user => {
        searchMe = user;
      });
      bind(ctx, 'ctrl+k', toggleSearch, { inInputs: true });
      bind(ctx, 'meta+k', toggleSearch, { inInputs: true });
    }
  });

  Rk.feature({
    id: 'tools.searchHotkey',
    category: 'tools',
    name: 'Search hotkey',
    description: 'Press / to jump to the site search box.',
    run(ctx) {
      bind(ctx, '/', () => {
        const field = document.querySelector('#navbar-universal-search input, .navbar-search input');
        if (!field) return;
        field.focus();
        if (typeof field.select === 'function') field.select();
      });
    }
  });

  Rk.feature({
    id: 'tools.navHotkeys',
    category: 'tools',
    name: 'Go to shortcuts',
    description: 'Press G then a letter to jump to home, avatar, friends, trades, inventory, messages, your profile or settings.',
    default: false,
    run(ctx) {
      let pending = 0;
      window.addEventListener('keydown', event => {
        if (event.repeat || event.isComposing || !Rk.isEnabled(ctx.id)) return;
        if (event.ctrlKey || event.altKey || event.metaKey || event.shiftKey || isTyping(event.target)) {
          pending = 0;
          return;
        }
        const route = pending && Date.now() - pending <= 1200 ? navRoutes.find(entry => event.code === `Key${entry[0]}`) : null;
        pending = 0;
        if (route) {
          event.preventDefault();
          event.stopImmediatePropagation();
          Rk.me().then(user => {
            if (route[3] && !user) ui.toast('Sign in to use this shortcut', { tone: 'warning' });
            else go(route[2](user));
          });
          return;
        }
        if (event.code !== 'KeyG') return;
        pending = Date.now();
        ui.toast('g', { duration: 1200 });
      }, true);
    }
  });

  Rk.feature({
    id: 'tools.shortcutHelp',
    category: 'tools',
    name: 'Shortcut help',
    description: 'Press Shift+? to see every keyboard shortcut that is turned on.',
    css: `${kbdCss}
      .rk-tools-keys {
        display: inline-flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 4px;
      }
      .rk-tools-keys-then {
        margin: 0 2px;
        font-size: 12px;
        color: var(--rk-muted);
      }
      .rk-tools-shortcuts td:first-child {
        width: 40%;
        white-space: nowrap;
      }
    `,
    run(ctx) {
      bind(ctx, 'shift+?', openShortcuts);
    }
  });

  Rk.feature({
    id: 'tools.copyLink',
    category: 'tools',
    name: 'Copy clean link',
    description: 'Press Alt+C to copy the page link without tracking parameters.',
    default: false,
    run(ctx) {
      bind(ctx, 'alt+c', () => ui.copy(cleanUrl(location.href), 'Link copied'));
    }
  });

  Rk.feature({
    id: 'tools.copyId',
    category: 'tools',
    name: 'Copy page id',
    description: 'Press Alt+I to copy the id of the experience, user, item or community you are viewing.',
    default: false,
    run(ctx) {
      const pageLabels = { game: 'place id', profile: 'user id', friends: 'user id', inventory: 'user id', favorites: 'user id', group: 'community id' };
      const itemLabels = { asset: 'item id', bundle: 'bundle id', gamepass: 'game pass id', badge: 'badge id' };
      const ownPages = new Set(['home', 'friends', 'avatar', 'account', 'messages', 'trades', 'transactions']);
      bind(ctx, 'alt+i', async () => {
        const page = Rk.page();
        if (Rk.isId(page.id)) {
          const label = page.type === 'item' ? itemLabels[page.kind] || 'item id' : pageLabels[page.type] || 'id';
          ui.copy(String(page.id), `Copied ${label} ${page.id}`);
          return;
        }
        const user = ownPages.has(page.type) ? await Rk.me() : null;
        if (user) ui.copy(String(user.id), `Copied your user id ${user.id}`);
        else ui.toast('This page has no id to copy', { tone: 'warning' });
      });
    }
  });

  Rk.feature({
    id: 'tools.friendOnlineAlerts',
    category: 'tools',
    name: 'Friend online alerts',
    description: 'Get a desktop notification when a friend comes online.',
    default: false,
    run: pollNow
  });

  Rk.feature({
    id: 'tools.robuxAlerts',
    category: 'tools',
    name: 'Robux alerts',
    description: 'Get a desktop notification when your Robux balance changes.',
    default: false,
    run: pollNow
  });

  Rk.feature({
    id: 'tools.streamerMode',
    category: 'tools',
    name: 'Streamer mode',
    description: 'Blurs your Robux balance, age label and username until you hover them. Alt+S turns it on or off.',
    default: false,
    css: `
      #nav-robux-amount,
      #nav-robux-balance,
      .age-bracket-label,
      .rk-tools-streamer {
        filter: blur(6px) !important;
        transition: filter var(--rk-fast) ease;
      }
      #navbar-robux:hover #nav-robux-amount,
      #nav-robux-amount:hover,
      #nav-robux-balance:hover,
      .age-bracket-label:hover,
      .rk-tools-streamer:hover {
        filter: none !important;
      }
    `,
    run() {
      Rk.me().then(user => {
        if (!user) return;
        const names = new Set([user.name, user.displayName, user.name ? `@${user.name}` : ''].filter(Boolean).map(name => name.toLowerCase()));
        Rk.observe('#header, #navigation', container => Rk.observe('*', node => {
          if (node.closest('[class^="rk-"]') || node.classList.contains('rk-tools-streamer')) return;
          for (const child of node.childNodes) {
            if (child.nodeType !== 3 || !names.has(child.textContent.trim().toLowerCase())) continue;
            node.classList.add('rk-tools-streamer');
            return;
          }
        }, { root: container }));
      });
    }
  });

  Rk.hotkey('alt+s', () => {
    const next = !Rk.isEnabled('tools.streamerMode');
    Rk.setEnabled('tools.streamerMode', next);
    ui.toast(next ? 'Streamer mode on' : 'Streamer mode off', { tone: next ? 'success' : 'neutral' });
  });

  Rk.feature({
    id: 'tools.hideRobux',
    category: 'tools',
    name: 'Hide Robux balance',
    description: 'Hides your Robux balance in the header.',
    default: false,
    css: `
      #nav-robux-amount,
      #nav-robux-balance {
        display: none !important;
      }
    `
  });

  Rk.feature({
    id: 'tools.fakeRobux',
    category: 'tools',
    name: 'Custom Robux balance',
    description: 'Shows your own number as your Robux balance in the header. Only you can see it, your real balance does not change.',
    default: false,
    options: [
      { key: 'amount', label: 'Robux', type: 'number', min: 0, max: 999999999999, step: 1, default: 1000 }
    ],
    async run(ctx) {
      const me = await Rk.me();
      const json = me ? await Rk.api.get(`https://economy.roblox.com/v1/users/${me.id}/currency`).catch(() => null) : null;
      const real = json && Number.isSafeInteger(json.robux) ? json.robux : null;
      if (real === null) return;
      const full = new Intl.NumberFormat();
      const short = value => {
        if (value < 10000) return full.format(value);
        const text = String(value);
        const suffix = ['', 'K+', 'M+', 'B+', 'T+'][Math.min(Math.floor(Math.log(value) / Math.log(1000)), 4)];
        const cut = value < 1e6 ? 3 : value < 1e9 ? 6 : value < 1e12 ? 9 : 12;
        return text.slice(0, text.length - cut) + suffix;
      };
      const swaps = () => {
        const fake = Math.floor(ctx.option('amount'));
        return new Map([[full.format(real), full.format(fake)], [short(real), short(fake)], [String(real), String(fake)]]);
      };
      let applied = swaps();
      let current = applied;
      const swapText = text => {
        if (!text.parentElement || !text.parentElement.closest('#navbar-robux, .nav-foundation-menu')) return;
        const raw = text.nodeValue;
        const next = current.get(raw.trim());
        if (next !== undefined && next !== raw.trim()) text.nodeValue = raw.replace(raw.trim(), next);
      };
      const swapIn = root => {
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        for (let text = walker.nextNode(); text; text = walker.nextNode()) swapText(text);
      };
      new MutationObserver(records => {
        for (const record of records) {
          if (record.type === 'characterData') swapText(record.target);
          else for (const node of record.addedNodes) {
            if (node.nodeType === 3) swapText(node);
            else if (node.nodeType === 1) swapIn(node);
          }
        }
      }).observe(document.documentElement, { childList: true, characterData: true, subtree: true });
      swapIn(document.body);
      Rk.onSettings(() => {
        const next = Rk.isEnabled(ctx.id) ? swaps() : new Map();
        current = new Map(next);
        for (const [key, value] of applied) current.set(value, next.has(key) ? next.get(key) : key);
        applied = next;
        swapIn(document.body);
      });
    }
  });

  Rk.feature({
    id: 'tools.breakReminder',
    category: 'tools',
    name: 'Break reminder',
    description: 'Reminds you to take a break after a set amount of time on the site.',
    default: false,
    options: [
      { key: 'minutes', label: 'Remind me after (minutes)', type: 'number', min: 1, step: 1, default: 60 }
    ],
    run(ctx) {
      onVisibleMinutes(count => {
        if (!Rk.isEnabled(ctx.id)) return;
        const saved = record('tools.breakReminder');
        const now = Date.now();
        const fresh = !Number.isFinite(saved.last) || now - saved.last > 1800000;
        const minutes = (fresh ? 0 : Math.max(0, Number(saved.minutes) || 0)) + count;
        const notified = fresh ? 0 : Math.max(0, Number(saved.notified) || 0);
        const step = Math.floor(minutes / ctx.option('minutes'));
        Rk.store.set('tools.breakReminder', { minutes, last: now, notified: Math.max(step, notified) });
        if (step > notified) {
          ui.toast(`You have been on Roblox for ${minutes} minutes`, { tone: 'warning', duration: 8000 });
          Rk.bg('sound').catch(() => {});
        }
      });
    }
  });

  Rk.feature({
    id: 'tools.alertSound',
    category: 'tools',
    name: 'Notification sound',
    description: 'Plays a sound with alerts and reminders. Put a Roblox audio id to use it instead of the default chime.',
    options: [
      { key: 'assetId', label: 'Audio asset id', type: 'text', maxLength: 20, placeholder: 'Default chime', default: '' }
    ]
  });

  Rk.feature({
    id: 'tools.backgroundMusic',
    category: 'tools',
    name: 'Background music',
    description: 'Loops a Roblox audio while you have the site open. It keeps playing between pages and stops when you close the last Roblox tab.',
    default: false,
    options: [
      { key: 'assetId', label: 'Audio asset id', type: 'text', maxLength: 20, placeholder: 'Roblox audio id', default: '' },
      { key: 'volume', label: 'Volume', type: 'number', min: 0, max: 100, step: 5, default: 40 }
    ],
    run() {
      Rk.bg('music').catch(() => {});
    }
  });

  Rk.feature({
    id: 'tools.unfriendAlerts',
    category: 'tools',
    name: 'Unfriend alerts',
    description: 'Get a desktop notification when someone unfriends you, and see who in quick search.',
    default: false,
    css: `
      .rk-tools-person {
        display: flex;
        flex-direction: column;
        min-width: 0;
      }
    `,
    run: pollNow
  });

  Rk.feature({
    id: 'tools.watchFriend',
    category: 'tools',
    name: 'Watch friends',
    description: 'Get a desktop notification when the people you list join a game, switch games or go offline.',
    default: false,
    options: [
      { key: 'users', label: 'Usernames or ids, separated by commas', type: 'text', maxLength: 240, placeholder: 'builderman, 156', default: '' }
    ],
    run: pollNow
  });

  Rk.feature({
    id: 'tools.wishlistAlerts',
    category: 'tools',
    name: 'Wishlist price alerts',
    description: 'Get a desktop notification when an item on your wishlist gets cheaper or goes on sale.',
    default: false,
    options: [
      { key: 'percent', label: 'Only when it drops by at least (percent)', type: 'number', min: 0, max: 95, step: 5, default: 0 }
    ],
    run: pollNow
  });

  Rk.feature({
    id: 'tools.gameUpdateAlerts',
    category: 'tools',
    name: 'Pinned experience updates',
    description: 'Get a desktop notification when an experience you pinned gets updated.',
    default: false,
    run: pollNow
  });

  Rk.feature({
    id: 'tools.playtime',
    category: 'tools',
    name: 'Playtime tracker',
    description: 'Counts how long you play each experience. Open it from quick search.',
    default: false,
    run: pollNow
  });

  Rk.feature({
    id: 'tools.confetti',
    category: 'tools',
    name: 'Confetti',
    description: 'Shows a short confetti burst when you unlock an achievement or send or accept a trade.',
    default: false,
    css: `
      .rk-tools-confetti {
        position: fixed;
        inset: 0;
        width: 100vw;
        height: 100vh;
        z-index: 2147483646;
        pointer-events: none;
      }
    `,
    run() {
      document.addEventListener('click', event => {
        if (!Rk.isEnabled('tools.confetti') || Rk.page().type !== 'trades') return;
        const button = event.target instanceof Element ? event.target.closest('button, a.btn-cta-md, a.btn-primary-md') : null;
        if (!button || button.closest('.rk-section, .rk-modal-backdrop') || !button.closest('.modal, .modal-dialog, [role="dialog"]')) return;
        if (/^(accept|send|send trade|confirm)$/i.test(button.textContent.trim())) confetti();
      }, true);
    }
  });

  Rk.feature({
    id: 'tools.achievements',
    category: 'tools',
    name: 'Achievements',
    description: 'Unlock Rola achievements for your playtime, streaks and inventory value, like 1M+ and 10M+. Open them from quick search.',
    default: false,
    css: `
      .rk-tools-ach-heading {
        margin: 16px 0 8px;
        font-size: 13px;
        font-weight: 600;
        color: var(--rk-text-strong);
      }
      .rk-tools-ach-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
        gap: 10px;
      }
      .rk-tools-ach {
        display: flex;
        flex-direction: column;
        gap: 6px;
        padding: 12px;
        border-radius: var(--rk-radius);
        background: var(--rk-shift);
        opacity: 0.6;
      }
      .rk-tools-ach-done {
        opacity: 1;
        box-shadow: inset 0 0 0 1px var(--rk-accent);
      }
      .rk-tools-ach-name {
        display: flex;
        align-items: center;
        gap: 6px;
        font-weight: 600;
        color: var(--rk-text-strong);
      }
      .rk-tools-ach-desc {
        font-size: 12px;
        color: var(--rk-muted);
      }
      .rk-tools-tiers {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      .rk-tools-tier {
        padding: 6px 12px;
        border-radius: var(--rk-radius-s);
        border: 1px solid var(--rk-border);
        font-weight: 700;
        color: var(--rk-muted);
      }
      .rk-tools-tier-done {
        border-color: transparent;
        background: linear-gradient(135deg, #f7c948, #e08e0b);
        color: #1a1200;
      }
    `,
    async run(ctx) {
      const user = await Rk.me();
      if (!user || !Rk.isEnabled(ctx.id)) return;
      const saved = record('tools.achievements');
      const day = dayKey();
      const days = (Array.isArray(saved.days) ? saved.days : []).filter(entry => typeof entry === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(entry) && entry !== day).slice(-364);
      days.push(day);
      const hour = new Date().getHours();
      const next = { ...saved, days, nightOwl: Boolean(saved.nightOwl) || (hour >= 2 && hour < 5) };
      if (next.valueDay !== day) {
        next.valueDay = day;
        const value = await inventoryValue(user.id).catch(() => null);
        if (Number.isFinite(value)) next.value = value;
      }
      const unlocked = isObject(saved.unlocked) ? { ...saved.unlocked } : {};
      const stats = await achievementStats(next);
      const fresh = achievementList.filter(entry => !Number.isFinite(unlocked[entry.id]) && stats[entry.metric] >= entry.goal);
      for (const entry of fresh) unlocked[entry.id] = Date.now();
      Rk.store.set('tools.achievements', { ...record('tools.achievements'), ...next, unlocked });
      if (!fresh.length) return;
      ui.toast(fresh.length === 1 ? `Achievement unlocked: ${fresh[0].name}` : `${fmt.num(fresh.length)} achievements unlocked`, { tone: 'success', duration: 5000 });
      confetti();
    }
  });

  Rk.feature({
    id: 'tools.titleCounts',
    category: 'tools',
    name: 'Unread counts in tab title',
    description: 'Shows your unread messages and friend requests in the tab title.',
    default: false,
    async run() {
      const user = await Rk.me();
      if (!user) return;
      const results = await Promise.allSettled([
        Rk.api.get('https://privatemessages.roblox.com/v1/messages/unread/count'),
        Rk.api.get('https://friends.roblox.com/v1/user/friend-requests/count')
      ]);
      const total = results.reduce((sum, result) => {
        const count = result.status === 'fulfilled' && result.value ? result.value.count : 0;
        return sum + (Number.isSafeInteger(count) && count > 0 ? count : 0);
      }, 0);
      if (!total) return;
      const prefix = `(${total > 99 ? '99+' : total}) `;
      const apply = () => {
        const current = document.title;
        const next = prefix + current.replace(/^\(\d+\+?\) /, '');
        if (current !== next) document.title = next;
      };
      Rk.observe('head > title', title => {
        apply();
        new MutationObserver(apply).observe(title, { childList: true, characterData: true, subtree: true });
      });
    }
  });

  Rk.feature({
    id: 'tools.dataManager',
    category: 'tools',
    name: 'Data manager',
    description: 'Press Alt+D to see, export, import or delete the data Rola saves on this browser.',
    css: `
      .rk-tools-data .rk-table td:first-child {
        font-weight: 600;
        color: var(--rk-text-strong);
        overflow-wrap: anywhere;
      }
      .rk-tools-data-modal .rk-modal-footer > .rk-btn-danger {
        margin-right: auto;
      }
    `,
    run(ctx) {
      bind(ctx, 'alt+d', openDataManager);
    }
  });

  Rk.feature({
    id: 'tools.robuxConverter',
    category: 'tools',
    name: 'Robux converter',
    description: 'Press Alt+R to convert between Robux and US dollars.',
    css: `
      .rk-tools-convert {
        display: grid;
        gap: 12px;
      }
      .rk-tools-field {
        display: grid;
        gap: 4px;
        margin: 0;
        font-size: 13px;
        font-weight: 600;
        color: var(--rk-text-strong);
      }
      .rk-tools-field .rk-select {
        width: 100%;
      }
      .rk-tools-convert-note {
        margin: 0;
        font-size: 13px;
      }
    `,
    run(ctx) {
      bind(ctx, 'alt+r', openConverter);
    }
  });

  Rk.feature({
    id: 'tools.notesManager',
    category: 'tools',
    name: 'Notes manager',
    description: 'Press Alt+O to see and delete all your experience and profile notes in one place.',
    default: false,
    css: `
      .rk-tools-notes-group + .rk-tools-notes-group {
        margin-top: 12px;
      }
      .rk-tools-notes-heading {
        margin: 0 0 4px;
        padding: 0 8px;
        font-size: 13px;
        font-weight: 600;
        color: var(--rk-muted);
      }
      .rk-tools-note {
        align-items: flex-start;
      }
      .rk-tools-note .rk-row-main {
        flex-direction: column;
        align-items: flex-start;
        gap: 2px;
      }
      .rk-tools-note-text {
        display: -webkit-box;
        max-width: 100%;
        overflow: hidden;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        font-size: 13px;
        color: var(--rk-muted);
        white-space: pre-wrap;
        overflow-wrap: anywhere;
      }
    `,
    run(ctx) {
      bind(ctx, 'alt+o', openNotesManager);
    }
  });

  Rk.feature({
    id: 'tools.performanceMode',
    category: 'tools',
    name: 'Performance mode',
    description: 'Turns off loading shimmers, blur effects, video previews and heavy shadows for lighter pages.',
    default: false,
    css: `
      .rk-skeleton,
      .shimmer,
      [class*="shimmer"],
      [class*="skeleton"],
      [class*="Skeleton"] {
        animation: none !important;
      }
      *,
      *::before,
      *::after {
        backdrop-filter: none !important;
        -webkit-backdrop-filter: none !important;
      }
      .game-card-container video,
      .game-card-thumb-container video,
      .hover-game-tile video,
      [class*="game-tile"] video {
        display: none !important;
      }
      #header *,
      #navigation *,
      #container-main *:not(.rk-input):not(.rk-select):not(.rk-toggle-knob) {
        box-shadow: none !important;
      }
    `
  });

  Rk.feature({
    id: 'tools.screenshotMode',
    category: 'tools',
    name: 'Screenshot mode',
    description: 'Press Alt+H to hide everything Rola adds while you take a screenshot.',
    default: false,
    css: `
      html.rk-tools-shot body [class^="rk-"]:not(.rk-toasts):not(.rk-toast),
      html.rk-tools-shot body .rk-nav-item {
        display: none !important;
      }
    `,
    run(ctx) {
      bind(ctx, 'alt+h', () => {
        const hidden = document.documentElement.classList.toggle('rk-tools-shot');
        ui.toast(hidden ? `Rola is hidden, press ${altLabel}+H to bring it back` : 'Rola is visible again');
      });
    }
  });

  Rk.feature({
    id: 'tools.linkCleaner',
    category: 'tools',
    name: 'Link cleaner',
    description: 'Removes ad and tracking parameters from the address bar.',
    run() {
      Rk.domReady.then(() => {
        const clean = cleanUrl(location.href);
        if (clean !== location.href) history.replaceState(history.state, '', clean);
      });
    }
  });

  Rk.feature({
    id: 'tools.focusMode',
    category: 'tools',
    name: 'Focus mode',
    description: 'Press Alt+F to hide the sidebar, footer, chat and ads while you browse.',
    default: false,
    css: `
      html.rk-tools-focus {
        --left-nav-reserved-width: 0px !important;
      }
      html.rk-tools-focus #navigation,
      html.rk-tools-focus #footer-container,
      html.rk-tools-focus #chat-container,
      html.rk-tools-focus .ads-container,
      html.rk-tools-focus .abp,
      html.rk-tools-focus .abp-spacer,
      html.rk-tools-focus .abp-container,
      html.rk-tools-focus .top-abp-container,
      html.rk-tools-focus #AdvertisingLeaderboard,
      html.rk-tools-focus #AdvertisementRight,
      html.rk-tools-focus #MessagesAdSkyscraper,
      html.rk-tools-focus .Ads_WideSkyscraper,
      html.rk-tools-focus .profile-ads-container,
      html.rk-tools-focus iframe[src*="user-sponsorship"],
      html.rk-tools-focus iframe[src*="/userads/"] {
        display: none !important;
      }
      html.rk-tools-focus #container-main,
      html.rk-tools-focus .container-main {
        margin-left: 0 !important;
      }
    `,
    run(ctx) {
      const root = document.documentElement;
      root.classList.toggle('rk-tools-focus', Rk.store.get('tools.focusMode', false) === true);
      bind(ctx, 'alt+f', () => {
        const on = root.classList.toggle('rk-tools-focus');
        Rk.store.set('tools.focusMode', on);
        ui.toast(on ? `Focus mode on, press ${altLabel}+F to leave it` : 'Focus mode off');
      });
    }
  });

  Rk.feature({
    id: 'tools.thumbnailZoom',
    category: 'tools',
    name: 'Image zoom',
    description: 'Alt+click any Roblox image to see it larger.',
    default: false,
    css: `
      .rk-modal.rk-tools-zoom {
        width: auto !important;
        max-width: 90vw;
      }
      .rk-tools-zoom .rk-modal-body {
        display: flex;
        justify-content: center;
        padding: 0 16px 16px;
      }
      .rk-tools-zoom-img {
        display: block;
        min-width: min(420px, calc(90vw - 32px));
        max-width: calc(90vw - 32px);
        max-height: 80vh;
        border-radius: var(--rk-radius);
        background: var(--rk-shift);
        object-fit: contain;
      }
    `,
    run(ctx) {
      document.addEventListener('click', event => {
        if (!event.altKey || event.button !== 0 || !Rk.isEnabled(ctx.id)) return;
        const image = event.target && event.target.closest ? event.target.closest('img') : null;
        if (!image || image.closest('.rk-tools-zoom')) return;
        let url = null;
        try {
          url = new URL(image.currentSrc || image.src);
        } catch {
          return;
        }
        if (url.protocol !== 'https:' || !cdnHost(url.hostname)) return;
        event.preventDefault();
        event.stopPropagation();
        const alt = clip(image.alt, 80);
        const full = el('img', { class: 'rk-tools-zoom-img', src: url.href, alt });
        full.addEventListener('error', () => full.replaceWith(ui.empty('This image could not be loaded')), { once: true });
        ui.modal({ title: alt || 'Image', width: 1600, className: 'rk-tools-zoom', content: full });
      }, true);
    }
  });

  Rk.feature({
    id: 'tools.siteStatus',
    category: 'tools',
    name: 'Roblox status',
    description: 'Shows a notice when Roblox reports an outage or slow service.',
    default: false,
    css: `
      .rk-tools-status {
        display: flex;
        align-items: center;
        gap: 10px;
        margin: 0 0 16px;
        padding: 8px 8px 8px 14px;
        border-radius: var(--rk-radius);
        background: var(--rk-warning-soft);
        color: var(--rk-text-strong);
        font-family: var(--rk-font);
        font-size: 14px;
        font-weight: 500;
        animation: rk-rise var(--rk-med) var(--rk-ease) both;
        transition: opacity var(--rk-fast) ease;
      }
      .rk-tools-status > .rk-icon {
        color: var(--rk-warning);
      }
      .rk-tools-status-text {
        flex: 1;
        min-width: 0;
      }
      .rk-tools-status-out {
        opacity: 0;
      }
    `,
    async run() {
      let status = null;
      try {
        status = JSON.parse(session.get('rk-tools-status') || 'null');
      } catch {
        status = null;
      }
      if (!isObject(status) || !Number.isFinite(status.time) || Date.now() - status.time > 300000) {
        let json = null;
        try {
          json = await Rk.api.request('https://status.roblox.com/api/v2/status.json', { credentials: 'omit' });
        } catch {
          return;
        }
        const info = isObject(json) && isObject(json.status) ? json.status : {};
        status = { time: Date.now(), indicator: clip(info.indicator, 20) || 'none', description: clip(info.description, 200) };
        session.set('rk-tools-status', JSON.stringify(status));
      }
      const indicator = clip(status.indicator, 20);
      const description = clip(status.description, 200);
      if (!indicator || indicator === 'none' || !description || session.get('rk-tools-status-hidden') === description) return;
      const bar = el('div', { class: 'rk-tools-status', role: 'status' },
        icon('info', 18),
        el('span', { class: 'rk-tools-status-text' }, `Roblox status: ${description}`),
        ui.link('https://status.roblox.com/', 'Details', { external: true }),
        ui.button('', {
          variant: 'ghost',
          icon: 'close',
          title: 'Dismiss',
          onClick: () => {
            stop();
            session.set('rk-tools-status-hidden', description);
            bar.classList.add('rk-tools-status-out');
            setTimeout(() => bar.remove(), 160);
          }
        })
      );
      const stop = Rk.mount('#content', bar, { position: 'prepend' });
    }
  });

  const suspiciousHost = host => {
    const name = String(host || '').toLowerCase().replace(/\.$/, '');
    if (!name || robloxHost(name) || cdnHost(name)) return false;
    if (name.split('.').some(label => label.startsWith('xn--'))) return true;
    const plain = name.replace(/0/g, 'o').replace(/[1i|]/g, 'l');
    return plain.includes('roblox') || plain.includes('rbx');
  };

  Rk.feature({
    id: 'tools.lookalikeLinks',
    category: 'tools',
    name: 'Suspicious link warning',
    description: 'Flags links in pages and messages that imitate Roblox web addresses.',
    css: `
      .rk-tools-lookalike {
        margin-left: 6px;
      }
    `,
    run() {
      Rk.observe('#content a[href]', anchor => {
        if (anchor.closest('[class^="rk-"]') || (anchor.protocol !== 'http:' && anchor.protocol !== 'https:')) return;
        const host = anchor.hostname;
        if (!suspiciousHost(host)) return;
        const next = anchor.nextElementSibling;
        if (next && next.classList.contains('rk-tools-lookalike')) return;
        const warning = `This link goes to ${host}, which is not a Roblox site`;
        anchor.title = warning;
        const pill = ui.pill('Suspicious link', 'danger', { title: warning });
        pill.classList.add('rk-tools-lookalike');
        anchor.after(pill);
      });
    }
  });

  Rk.feature({
    id: 'tools.externalConfirm',
    category: 'tools',
    name: 'External link check',
    description: 'Asks before opening a link that leaves Roblox.',
    default: false,
    css: `
      .rk-modal[aria-label="Open external link"] .rk-modal-text {
        overflow-wrap: anywhere;
      }
    `,
    run(ctx) {
      const onClick = event => {
        if (event.defaultPrevented || !Rk.isEnabled(ctx.id)) return;
        if (event.type === 'click' ? event.button !== 0 : event.button !== 1) return;
        const anchor = event.target && event.target.closest ? event.target.closest('#content a[href]') : null;
        if (!anchor || anchor.hasAttribute('download') || (anchor.protocol !== 'http:' && anchor.protocol !== 'https:')) return;
        if (robloxHost(anchor.hostname) || cdnHost(anchor.hostname)) return;
        event.preventDefault();
        event.stopPropagation();
        const url = anchor.href;
        const newTab = event.button === 1 || event.ctrlKey || event.metaKey || event.shiftKey || anchor.target === '_blank';
        ui.confirm(`This link leaves Roblox and goes to ${url}`, { title: 'Open external link', confirmLabel: 'Open link' }).then(confirmed => {
          if (confirmed) go(url, newTab);
        });
      };
      document.addEventListener('click', onClick, true);
      document.addEventListener('auxclick', onClick, true);
    }
  });

  Rk.feature({
    id: 'tools.selectionLookup',
    category: 'tools',
    name: 'Selection lookup',
    description: 'Select a username or id on a page to open it as a user, experience or item.',
    default: false,
    css: `
      .rk-tools-select {
        position: fixed;
        z-index: 2147481500;
        opacity: 0;
        pointer-events: none;
        transform: translate(-50%, 4px);
        transition: opacity var(--rk-fast) ease, transform var(--rk-fast) var(--rk-ease);
      }
      .rk-tools-select-on {
        opacity: 1;
        pointer-events: auto;
        transform: translate(-50%, 0);
      }
      .rk-tools-select .rk-btn {
        box-shadow: var(--rk-shadow);
      }
      @media (prefers-reduced-motion: reduce) {
        .rk-tools-select {
          transition: none !important;
        }
      }
    `,
    run(ctx) {
      let shown = '';
      let target = null;
      const trigger = ui.button('Open', {
        variant: 'primary',
        icon: 'search',
        onClick: () => {
          if (!target) return;
          const { text, id } = target;
          ui.menu(trigger, id ? [
            { label: 'Open as user', icon: 'user', onClick: () => go(`/users/${id}/profile`) },
            { label: 'Open as experience', icon: 'play', onClick: () => go(`/games/${id}`) },
            { label: 'Open as item', icon: 'tag', onClick: () => go(`/catalog/${id}`) }
          ] : [
            { label: 'Open as user', icon: 'user', onClick: () => openUser(text) }
          ]);
        }
      });
      const holder = el('div', { class: 'rk-tools-select', onmousedown: event => event.preventDefault() }, trigger);
      const hide = () => {
        if (!shown) return;
        shown = '';
        holder.classList.remove('rk-tools-select-on');
      };
      const selectedText = () => {
        const selection = window.getSelection();
        return selection && selection.rangeCount ? selection.toString().trim() : '';
      };
      const check = () => {
        const selection = window.getSelection();
        const value = selectedText();
        const content = document.getElementById('content');
        const inside = Boolean(content && selection && content.contains(selection.anchorNode) && content.contains(selection.focusNode));
        const digits = digitsPattern.test(value);
        const valid = digits ? Rk.isId(value) : usernamePattern.test(value);
        if (!Rk.isEnabled(ctx.id) || !inside || !valid || isTyping(document.activeElement)) {
          hide();
          return;
        }
        const rect = selection.getRangeAt(0).getBoundingClientRect();
        if (!rect.width && !rect.height) {
          hide();
          return;
        }
        target = { text: value, id: digits ? Number(value) : null };
        shown = value;
        holder.style.top = `${Math.round(rect.top > 52 ? rect.top - 40 : rect.bottom + 8)}px`;
        holder.style.left = `${Math.round(Math.min(Math.max(rect.left + rect.width / 2, 48), window.innerWidth - 48))}px`;
        if (!holder.isConnected) document.body.append(holder);
        requestAnimationFrame(() => {
          if (shown) holder.classList.add('rk-tools-select-on');
        });
      };
      document.addEventListener('mouseup', event => {
        if (!holder.contains(event.target)) requestAnimationFrame(check);
      });
      document.addEventListener('keyup', event => {
        if (event.shiftKey || event.key === 'Shift') check();
      });
      document.addEventListener('selectionchange', () => {
        if (shown && selectedText() !== shown) hide();
      });
      window.addEventListener('scroll', hide, { capture: true, passive: true });
    }
  });

  Rk.feature({
    id: 'tools.offlineNotice',
    category: 'tools',
    name: 'Offline notice',
    description: 'Lets you know when your connection drops and when it comes back.',
    run() {
      window.addEventListener('offline', () => ui.toast('You are offline', { tone: 'danger', duration: 4000 }));
      window.addEventListener('online', () => ui.toast('You are back online', { tone: 'success' }));
    }
  });

  Rk.feature({
    id: 'tools.timeOnSite',
    category: 'tools',
    name: 'Time on Roblox',
    description: 'Tracks how long you browse the site each day, with a two week chart in quick search.',
    default: false,
    css: `
      .rk-tools-time-chart {
        display: grid;
        grid-template-columns: repeat(14, minmax(0, 1fr));
        gap: 6px;
        height: 170px;
        margin-top: 16px;
      }
      .rk-tools-time-col {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
        min-width: 0;
      }
      .rk-tools-time-track {
        display: flex;
        align-items: flex-end;
        flex: 1;
        width: 100%;
        overflow: hidden;
        border-radius: 6px;
        background: var(--rk-shift);
      }
      .rk-tools-time-bar {
        width: 100%;
        border-radius: 6px;
        background: var(--rk-accent);
        opacity: 0.6;
        transform: scaleY(0);
        transform-origin: bottom;
        transition: transform var(--rk-med) var(--rk-ease);
      }
      .rk-tools-time-today {
        opacity: 1;
      }
      .rk-tools-time-in .rk-tools-time-bar {
        transform: scaleY(1);
      }
      .rk-tools-time-label {
        font-size: 11px;
        color: var(--rk-muted);
        white-space: nowrap;
      }
      .rk-tools-time-note {
        margin: 12px 0 0;
        font-size: 12px;
      }
      @media (prefers-reduced-motion: reduce) {
        .rk-tools-time-bar {
          transition: none !important;
        }
      }
    `,
    run(ctx) {
      onVisibleMinutes(count => {
        if (!Rk.isEnabled(ctx.id)) return;
        const days = record('tools.timeOnSite');
        const key = dayKey();
        const kept = Object.keys(days)
          .filter(day => day !== key && /^\d{4}-\d{2}-\d{2}$/.test(day) && Number.isFinite(days[day]) && days[day] >= 0)
          .sort()
          .slice(-59);
        const next = Object.fromEntries(kept.map(day => [day, days[day]]));
        next[key] = (Number.isFinite(days[key]) && days[key] >= 0 ? days[key] : 0) + count;
        Rk.store.set('tools.timeOnSite', next);
      });
    }
  });

  Rk.feature({
    id: 'tools.quickNotes',
    category: 'tools',
    name: 'Quick notes',
    description: 'Press Alt+N for a small notepad that saves as you type.',
    default: false,
    css: `
      .rk-tools-quick {
        position: fixed;
        right: 24px;
        bottom: 24px;
        z-index: 2147481000;
        display: flex;
        flex-direction: column;
        width: 320px;
        height: 240px;
        max-width: calc(100vw - 32px);
        box-sizing: border-box;
        border: 1px solid var(--rk-border);
        border-radius: 12px;
        background: var(--rk-bg);
        box-shadow: var(--rk-shadow);
        color: var(--rk-text);
        font-family: var(--rk-font);
        opacity: 0;
        transform: translateY(16px);
        transition: opacity 180ms ease, transform 180ms var(--rk-ease);
      }
      .rk-tools-quick:not(.rk-tools-quick-open) {
        pointer-events: none;
      }
      .rk-tools-quick-open {
        opacity: 1;
        transform: none;
      }
      .rk-tools-quick-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 6px 6px 4px 14px;
      }
      .rk-tools-quick-title {
        font-size: 14px;
        font-weight: 700;
        color: var(--rk-text-strong);
      }
      .rk-tools-quick .rk-tools-quick-area {
        flex: 1;
        min-height: 0;
        margin: 0 10px;
        padding: 8px 10px;
        box-sizing: border-box;
        resize: none;
        border: 1px solid var(--rk-border);
        border-radius: var(--rk-radius);
        outline: none;
        background: var(--rk-surface);
        box-shadow: none;
        color: var(--rk-text-strong);
        font-family: var(--rk-font);
        font-size: 14px;
        line-height: 1.45;
        transition: border-color var(--rk-fast) ease, box-shadow var(--rk-fast) ease;
      }
      .rk-tools-quick .rk-tools-quick-area:focus {
        border-color: var(--rk-accent);
        box-shadow: 0 0 0 3px var(--rk-accent-soft);
      }
      .rk-tools-quick-foot {
        padding: 6px 14px 8px;
        font-size: 12px;
        text-align: right;
      }
      @media (prefers-reduced-motion: reduce) {
        .rk-tools-quick {
          transition: none !important;
        }
      }
    `,
    run(ctx) {
      bind(ctx, 'alt+n', toggleQuickNotes);
    }
  });
})();
