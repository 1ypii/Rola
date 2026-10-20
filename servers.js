(() => {
  const { el, ui, fmt, icon } = Rk;

  const MAX_SAVED = 10;
  const MAX_PLACES = 50;
  const WATCH_MS = 20000;
  const HEADS = 6;
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const ANCHORS = ['#running-game-instances-container', '#game-instances'];
  const SORTS = [['players_desc', 'Most players'], ['players_asc', 'Fewest players'], ['ping', 'Best ping'], ['fps', 'Best fps'], ['free', 'Most free slots']];
  const BUCKETS = ['0 to 25% full', '25 to 50% full', '50 to 75% full', '75 to 99% full', 'Full'];
  const PICKS = [
    { key: 'smallest', label: 'Smallest', title: 'Join the emptiest server that has players', icon: 'user' },
    { key: 'ping', label: 'Best ping', title: 'Join the open server whose players have the lowest average ping', icon: 'globe' },
    { key: 'random', label: 'Random', title: 'Join a random server with a free slot', icon: 'swap' },
    { key: 'busiest', label: 'Busiest', title: 'Join the fullest server that still has a free slot', icon: 'users' }
  ];

  const on = id => Rk.isEnabled(`servers.${id}`);
  const isJobId = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
  const isToken = value => typeof value === 'string' && /^[A-Za-z0-9+/=_-]{8,200}$/.test(value);
  const isFull = server => server.playing >= server.maxPlayers;
  const freeSlots = server => Math.max(0, server.maxPlayers - server.playing);
  const slowPing = server => server.ping !== null && server.ping > 250;
  const lowFps = server => server.fps !== null && server.fps < 40;
  const isLaggy = server => slowPing(server) || lowFps(server);
  const playersText = server => `${fmt.num(server.playing)} / ${fmt.num(server.maxPlayers)}`;
  const inviteLink = (placeId, jobId) => `https://www.roblox.com/games/start?placeId=${placeId}&gameInstanceId=${jobId}`;
  const failText = (err, base) => (err && err.status === 429 ? `${base}, Roblox is limiting requests right now` : base);
  const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const clampInt = (value, min, max) => {
    const number = Math.round(Number(value));
    return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : min;
  };

  const setText = (node, text) => {
    if (node.textContent !== text) node.textContent = text;
  };

  const setLabel = (node, text, warn = false) => {
    node.classList.toggle('rk-hidden', !text);
    node.classList.toggle('rk-servers-warn', warn);
    setText(node, text);
  };

  const reveal = (display, ...names) => `
${names.map(name => `:is(.rk-servers-browser, .rk-servers-friends) .rk-servers-opt.rk-servers-${name}`).join(',\n')} {
  display: ${display};
}`;

  const ROW_CSS = `
.rk-servers-row {
  box-sizing: border-box;
  min-height: 44px;
  padding: 4px 8px;
  border-radius: 0;
}
.rk-servers-row + .rk-servers-row {
  border-top: 1px solid var(--rk-border);
}
.rk-servers-row > .rk-row-main {
  gap: 12px;
}
.rk-servers-count {
  flex: none;
  min-width: 56px;
  font-weight: 700;
  color: var(--rk-text-strong);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.rk-servers-fill {
  flex: none;
  width: 72px;
  height: 4px;
}
.rk-servers-fill .rk-progress-fill {
  background: var(--rk-text);
  opacity: 0.45;
}
.rk-servers-row-full .rk-servers-fill .rk-progress-fill {
  background: var(--rk-muted);
}
.rk-servers-join {
  min-width: 56px;
}
:is(.rk-servers-browser, .rk-servers-friends) > .rk-section-body {
  container-type: inline-size;
}
@container (max-width: 720px) {
  .rk-servers-row .rk-servers-fill {
    display: none !important;
  }
}
@container (max-width: 560px) {
  .rk-servers-row .rk-servers-net,
  .rk-servers-row .rk-servers-tags {
    display: none !important;
  }
}`;

  const svg = (tag, attrs) => {
    const node = document.createElementNS(SVG_NS, tag);
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
    return node;
  };

  const placeIdFor = () => {
    const meta = document.querySelector('#game-detail-meta-data');
    const id = meta ? Number(meta.getAttribute('data-place-id')) : NaN;
    if (Rk.isId(id)) return id;
    const page = Rk.page();
    return page.type === 'game' && Rk.isId(page.id) ? page.id : null;
  };

  const placeName = () => {
    const meta = document.querySelector('#game-detail-meta-data');
    const title = document.querySelector('h1.game-name');
    const name = (meta && meta.getAttribute('data-place-name')) || (title && title.textContent) || '';
    return name.replace(/\s+/g, ' ').trim().slice(0, 80) || 'this experience';
  };

  const count = value => (typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.round(value) : null);

  const normalize = raw => {
    if (!raw || typeof raw !== 'object' || !isJobId(raw.id)) return null;
    const maxPlayers = count(raw.maxPlayers);
    if (!maxPlayers) return null;
    const players = Array.isArray(raw.players) ? raw.players : [];
    const tokens = Array.isArray(raw.playerTokens) ? [...new Set(raw.playerTokens.slice(0, 1000).filter(isToken))] : [];
    return {
      id: raw.id.toLowerCase(),
      playing: count(raw.playing) || 0,
      maxPlayers,
      ping: count(raw.ping),
      fps: count(raw.fps),
      tokens: tokens.slice(0, HEADS),
      tokenCount: tokens.length,
      friendIds: [...new Set(players.filter(player => player && Rk.isId(player.id)).map(player => Number(player.id)))].slice(0, 50)
    };
  };

  const fetchServers = async (placeId, type, cursor) => {
    const query = type === 'Public' ? 'sortOrder=Desc&excludeFullGames=false&limit=100' : 'limit=100';
    const json = await Rk.api.get(`https://games.roblox.com/v1/games/${placeId}/servers/${type}?${query}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`);
    return {
      list: json && Array.isArray(json.data) ? json.data.map(normalize).filter(Boolean) : [],
      next: json && typeof json.nextPageCursor === 'string' && json.nextPageCursor ? json.nextPageCursor : null
    };
  };

  const parseInvite = text => {
    const value = String(text || '').trim();
    if (isJobId(value)) return { jobId: value.toLowerCase(), placeId: null };
    const job = value.match(/gameInstanceId=([0-9a-f-]{36})(?![0-9a-f-])/i);
    if (!job || !isJobId(job[1])) return null;
    const place = value.match(/placeId=(\d{1,16})(?!\d)/i);
    return { jobId: job[1].toLowerCase(), placeId: place && Rk.isId(place[1]) ? Number(place[1]) : null };
  };

  const record = key => {
    const value = Rk.store.get(key, null);
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  };

  const capPlaces = (all, timeOf) => {
    const keys = Object.keys(all);
    if (keys.length <= MAX_PLACES) return all;
    const kept = keys.sort((a, b) => timeOf(all[b]) - timeOf(all[a])).slice(0, MAX_PLACES);
    return Object.fromEntries(kept.map(key => [key, all[key]]));
  };

  const readSaved = placeId => {
    const list = record('servers.saved')[placeId];
    if (!Array.isArray(list)) return [];
    return list
      .filter(entry => entry && isJobId(entry.jobId) && Number.isFinite(entry.time))
      .slice(0, MAX_SAVED)
      .map(entry => ({ jobId: entry.jobId.toLowerCase(), time: entry.time }));
  };

  const writeSaved = (placeId, list) => {
    const all = { ...record('servers.saved') };
    if (list.length) all[placeId] = list.slice(0, MAX_SAVED);
    else delete all[placeId];
    Rk.store.set('servers.saved', capPlaces(all, entries => (Array.isArray(entries) && entries[0] && Number(entries[0].time)) || 0));
  };

  const lastJob = placeId => {
    const entry = record('servers.last')[placeId];
    return entry && isJobId(entry.jobId) ? entry.jobId.toLowerCase() : null;
  };

  const rememberJoin = (placeId, jobId) => {
    if (!on('rejoinLast')) return;
    const all = { ...record('servers.last'), [placeId]: { jobId, time: Date.now() } };
    Rk.store.set('servers.last', capPlaces(all, entry => (entry && Number(entry.time)) || 0));
  };

  const readPrefs = base => {
    const raw = Rk.store.get('servers.prefs', null);
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return base;
    return {
      sort: SORTS.some(choice => choice[0] === raw.sort) ? raw.sort : base.sort,
      hideFull: typeof raw.hideFull === 'boolean' ? raw.hideFull : base.hideFull,
      minSlots: Number.isFinite(raw.minSlots) ? clampInt(raw.minSlots, 0, 50) : base.minSlots,
      maxPing: Number.isFinite(raw.maxPing) ? clampInt(raw.maxPing, 0, 999) : base.maxPing
    };
  };

  const join = async (placeId, jobId, server) => {
    if (!Rk.isId(placeId) || !isJobId(jobId)) return false;
    if (server && isFull(server) && on('fullWarning')) {
      const confirmed = await ui.confirm('This server is full, so you will wait in a queue until a slot opens.', { title: 'Join a full server?', confirmLabel: 'Join anyway' });
      if (!confirmed) return false;
    }
    rememberJoin(placeId, jobId);
    Rk.launch.server(placeId, jobId);
    return true;
  };

  const sorters = {
    players_desc: (a, b) => b.playing - a.playing,
    players_asc: (a, b) => a.playing - b.playing,
    ping: (a, b) => (a.ping === null ? 1e9 : a.ping) - (b.ping === null ? 1e9 : b.ping),
    fps: (a, b) => (b.fps === null ? -1 : b.fps) - (a.fps === null ? -1 : a.fps),
    free: (a, b) => freeSlots(b) - freeSlots(a)
  };

  const lowest = (list, value) => list.reduce((best, server) => (!best || value(server) < value(best) ? server : best), null);

  const pickers = {
    smallest: list => lowest(list.filter(server => !isFull(server) && server.playing > 0), server => server.playing),
    ping: list => lowest(list.filter(server => !isFull(server) && server.ping !== null), server => server.ping),
    random: list => {
      const open = list.filter(server => !isFull(server));
      return open.length ? open[Math.floor(Math.random() * open.length)] : null;
    },
    busiest: list => lowest(list.filter(server => !isFull(server)), server => -server.playing)
  };

  const whenShown = (node, callback) => {
    const watcher = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      watcher.disconnect();
      callback();
    }, { rootMargin: '300px 0px' });
    watcher.observe(node);
  };

  const paintHeads = (heads, server) => {
    const extra = server.tokens.length ? Math.max(server.tokenCount, server.playing) - server.tokens.length : 0;
    const key = `${server.tokens.join(',')}:${extra}`;
    if (heads.key === key) return;
    heads.key = key;
    heads.faces = new Map(server.tokens.map(token => [
      token,
      heads.faces.get(token) || el('span', { class: 'rk-servers-head' }, ui.thumb(Rk.thumbToken(token, '60x60'), { size: 26, round: true }))
    ]));
    heads.node.replaceChildren(...heads.faces.values());
    if (extra > 0) heads.node.append(el('span', { class: 'rk-servers-extra' }, `+${fmt.num(extra)}`));
  };

  const createServerRow = (server, onJoin, middle, side, className) => {
    const row = {
      server,
      width: '',
      heads: { node: el('span', { class: 'rk-servers-heads rk-servers-opt', 'aria-hidden': 'true' }), faces: new Map(), key: null },
      count: el('span', { class: 'rk-servers-count' }),
      fill: ui.progress(server.playing / server.maxPlayers, { tone: 'neutral' }),
      join: ui.button('Join', { variant: 'primary', onClick: () => onJoin(row.server) })
    };
    row.fill.classList.add('rk-servers-fill', 'rk-servers-opt');
    row.join.classList.add('rk-servers-join');
    row.node = ui.row([row.heads.node, row.count, row.fill, middle], [row.join, side], { className: `rk-servers-row ${className}` });
    return row;
  };

  const updateServerRow = (row, server) => {
    const full = isFull(server);
    const width = `${Math.min(100, (server.playing / server.maxPlayers) * 100).toFixed(1)}%`;
    row.server = server;
    setText(row.count, playersText(server));
    if (row.width !== width) {
      row.width = width;
      row.fill.firstElementChild.style.width = width;
    }
    row.node.classList.toggle('rk-servers-row-full', full);
    row.join.classList.toggle('rk-btn-primary', !full);
    row.join.classList.toggle('rk-btn-secondary', full);
    setText(row.join.lastElementChild, full ? 'Full' : 'Join');
  };

  const createHistogram = () => {
    const chart = svg('svg', { viewBox: '0 0 104 24', width: 104, height: 24, role: 'img', 'aria-label': 'Servers by how full they are' });
    const bars = BUCKETS.map((label, index) => {
      const title = svg('title', {});
      title.textContent = label;
      const bar = svg('rect', { x: index * 21.5, y: 0, width: 18, height: 24, rx: 2, class: `rk-servers-bar rk-servers-bar-${index}` });
      bar.style.transform = 'scaleY(0)';
      const group = svg('g', {});
      group.append(title, svg('rect', { x: index * 21.5, y: 0, width: 18, height: 24, rx: 2, class: 'rk-servers-track' }), bar);
      chart.append(group);
      return { bar, title, transform: '' };
    });
    return { root: el('div', { class: 'rk-servers-histogram' }, el('span', null, 'By fill'), chart), bars };
  };

  const updateHistogram = (histogram, all) => {
    const counts = [0, 0, 0, 0, 0];
    for (const server of all) counts[isFull(server) ? 4 : Math.min(3, Math.floor((server.playing / server.maxPlayers) * 4))]++;
    const top = Math.max(1, ...counts);
    histogram.bars.forEach((entry, index) => {
      const scale = counts[index] ? Math.max(0.08, counts[index] / top) : 0;
      const transform = `scaleY(${scale.toFixed(3)})`;
      setText(entry.title, `${BUCKETS[index]}: ${fmt.plural(counts[index], 'server')}`);
      if (entry.transform === transform) return;
      entry.transform = transform;
      entry.bar.style.transform = transform;
    });
  };

  let browser = null;

  Rk.feature({
    id: 'servers.browser',
    category: 'servers',
    name: 'Server browser',
    description: "Replaces Roblox's server list with a sortable, filterable one with quick join.",
    pages: ['game'],
    options: [
      { key: 'pages', label: 'Pages to load', type: 'number', min: 1, max: 20, step: 1, default: 3 },
      { key: 'sort', label: 'Default sort', type: 'select', choices: SORTS, default: 'players_desc' }
    ],
    css: `${ROW_CSS}
body:has(.rk-servers-browser:not(.rk-hidden)) #rbx-public-running-games {
  display: none !important;
}
.rk-servers-browser {
  scroll-margin-top: 72px;
}
.rk-servers-browser > .rk-section-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.rk-servers-browser .rk-servers-opt {
  display: none;
}
.rk-servers-forms {
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 8px;
}
.rk-servers-form {
  align-items: center;
  gap: 6px;
  min-width: 0;
}
.rk-servers-form .rk-input {
  flex: 1;
  min-width: 0;
  height: 32px;
  font-size: 13px;
}
.rk-servers-form .rk-btn {
  height: 32px;
}
.rk-servers-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.rk-servers-group {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  min-width: 0;
}
.rk-servers-toolbar .rk-select {
  height: 28px;
  padding: 0 28px 0 10px;
  font-size: 13px;
}
.rk-servers-field {
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 500;
  color: var(--rk-muted);
  white-space: nowrap;
  cursor: default;
}
.rk-servers-field .rk-input {
  width: 64px;
  height: 28px;
  padding: 0 8px;
  font-size: 13px;
}
.rk-servers-meta {
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 4px 12px;
  min-height: 24px;
  font-size: 13px;
  color: var(--rk-muted);
}
.rk-servers-summary {
  font-variant-numeric: tabular-nums;
}
.rk-servers-status {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.rk-servers-status:empty {
  display: none;
}
.rk-servers-status > * {
  animation: rk-fade var(--rk-fast) ease both;
}
.rk-servers-skeleton {
  height: 36px;
}
.rk-servers-error {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--rk-muted);
}
.rk-servers-none {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.rk-servers-list {
  position: relative;
  display: flex;
  flex-direction: column;
  max-height: 560px;
  margin: 0 -8px;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
  scrollbar-color: var(--rk-press) transparent;
}
.rk-servers-list:empty {
  display: none;
}
.rk-servers-list > .rk-servers-row {
  flex: none;
  outline: none;
  content-visibility: auto;
  contain-intrinsic-size: auto 44px;
}
.rk-servers-row-in {
  animation: rk-fade var(--rk-fast) ease both;
}
.rk-servers-picked {
  background: var(--rk-accent-soft) !important;
}
.rk-servers-net {
  flex: none;
  align-items: center;
  min-width: 108px;
  font-size: 13px;
  color: var(--rk-muted);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.rk-servers-net > :not(.rk-hidden) ~ :not(.rk-hidden)::before {
  content: '\\00b7';
  margin: 0 6px;
  color: var(--rk-muted);
}
.rk-servers-net > .rk-servers-warn {
  color: var(--rk-danger);
}
.rk-servers-tags {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  overflow: hidden;
}
.rk-servers-saved {
  flex-direction: column;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--rk-border);
}
.rk-servers-label {
  padding-bottom: 4px;
  font-size: 12px;
  font-weight: 600;
  color: var(--rk-muted);
}
.rk-servers-job {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
  color: var(--rk-text-strong);
}
.rk-servers-spin .rk-icon {
  animation: rk-spin 0.8s linear infinite;
}
.rk-servers-footer {
  justify-content: center;
}
@media (prefers-reduced-motion: reduce) {
  .rk-servers-row-in,
  .rk-servers-status > *,
  .rk-servers-spin .rk-icon {
    animation: none !important;
  }
}`,
    run(ctx) {
      const placeId = placeIdFor();
      if (!placeId) return;

      const state = {
        servers: new Map(),
        rows: new Map(),
        visible: [],
        cursor: null,
        pages: 0,
        busy: false,
        loadingMore: false,
        shown: false,
        waiting: false,
        loaded: false,
        error: null,
        errorMore: false,
        lastLoad: 0,
        statusKey: '',
        savedKey: '',
        watch: null,
        refreshTimer: 0,
        watchTimer: 0,
        frame: 0,
        attached: false,
        unsubscribe: null,
        seen: null
      };
      let prefs = { sort: ctx.option('sort'), hideFull: false, minSlots: 0, maxPing: 0 };

      const refreshMs = () => Rk.option('servers.autoRefresh', 'seconds') * 1000;

      const setDisabled = (node, value) => {
        if (node.disabled !== value) node.disabled = value;
      };

      const numberField = (min, max, placeholder, blankZero, onValue) => {
        const field = ui.input({ type: 'number', placeholder, onInput: value => onValue(clampInt(value, min, max)) });
        field.min = String(min);
        field.max = String(max);
        field.step = '1';
        field.addEventListener('change', () => {
          const value = clampInt(field.value, min, max);
          field.value = value || !blankZero ? String(value) : '';
          onValue(value);
        });
        return field;
      };

      const idInput = ui.input({ placeholder: 'Paste a job ID or invite link', maxLength: 300, onEnter: () => joinTyped() });
      const userInput = ui.input({ placeholder: 'Join a user by username', maxLength: 21, onEnter: () => followTyped() });
      const followButton = ui.button('Join', { variant: 'secondary', onClick: () => followTyped() });
      const sortSelect = ui.select(SORTS, prefs.sort, value => setPrefs({ ...prefs, sort: value }));
      const hideChip = ui.button('Hide full', { variant: 'secondary', icon: 'filter', onClick: () => setPrefs({ ...prefs, hideFull: !prefs.hideFull }) });
      const minInput = numberField(0, 50, '0', false, value => setPrefs({ ...prefs, minSlots: value }));
      const maxInput = numberField(0, 999, 'Off', true, value => setPrefs({ ...prefs, maxPing: value }));
      const pickButtons = PICKS.map(entry => {
        const button = ui.button(entry.label, { variant: 'secondary', icon: entry.icon, title: entry.title, onClick: () => pick(entry) });
        button.classList.add('rk-servers-opt', `rk-servers-pick-${entry.key}`);
        return button;
      });
      const rejoinButton = ui.button('Rejoin last server', { variant: 'secondary', icon: 'clock', onClick: () => rejoin() });
      const refreshButton = ui.button('', { variant: 'ghost', icon: 'refresh', title: 'Refresh servers', onClick: () => refresh() });
      const summary = el('span', { class: 'rk-servers-summary rk-servers-opt' });
      const autoLabel = el('span');
      const histogram = createHistogram();
      const status = el('div', { class: 'rk-servers-status', 'aria-live': 'polite' });
      const list = el('div', { class: 'rk-servers-list', role: 'list', 'aria-label': 'Public servers' });
      const loadMoreButton = ui.button('Load more', { variant: 'secondary', size: 'md', icon: 'chevronDown', onClick: () => load({ more: true }) });
      const footer = el('div', { class: 'rk-servers-footer rk-servers-opt rk-hidden' }, loadMoreButton);
      const savedList = el('div', { class: 'rk-servers-saved-list' });
      const savedBox = el('div', { class: 'rk-servers-saved rk-servers-opt rk-hidden' }, el('div', { class: 'rk-servers-label' }, 'Saved servers'), savedList);

      sortSelect.setAttribute('aria-label', 'Sort servers');
      hideChip.classList.add('rk-servers-opt', 'rk-servers-hide-full');
      rejoinButton.classList.add('rk-servers-opt', 'rk-servers-rejoin', 'rk-hidden');
      histogram.root.classList.add('rk-servers-opt');

      const section = ui.section('Server browser', [
        el('div', { class: 'rk-servers-forms rk-servers-opt' },
          el('div', { class: 'rk-servers-form rk-servers-join-id rk-servers-opt' }, idInput, ui.button('Join', { variant: 'secondary', onClick: () => joinTyped() })),
          el('div', { class: 'rk-servers-form rk-servers-follow rk-servers-opt' }, userInput, followButton)
        ),
        savedBox,
        el('div', { class: 'rk-servers-toolbar' },
          el('div', { class: 'rk-servers-group' },
            sortSelect,
            hideChip,
            el('label', { class: 'rk-servers-field rk-servers-min-slots rk-servers-opt' }, 'Min free slots', minInput),
            el('label', { class: 'rk-servers-field rk-servers-max-ping rk-servers-opt' }, 'Max ping', maxInput)
          ),
          el('div', { class: 'rk-servers-group' }, pickButtons, rejoinButton, refreshButton)
        ),
        el('div', { class: 'rk-servers-meta rk-servers-opt' },
          summary,
          el('div', { class: 'rk-servers-group' }, el('span', { class: 'rk-servers-auto rk-servers-opt' }, icon('clock', 14), autoLabel), histogram.root)
        ),
        status,
        list,
        footer
      ], { className: 'rk-servers-browser' });

      const live = () => section.isConnected && document.visibilityState === 'visible' && on('browser');

      const visibleServers = () => {
        const hideFull = on('hideFull') && prefs.hideFull;
        const minSlots = on('minSlots') ? prefs.minSlots : 0;
        const maxPing = on('maxPing') ? prefs.maxPing : 0;
        return [...state.servers.values()]
          .filter(server => !(hideFull && isFull(server)) && freeSlots(server) >= minSlots && !(maxPing && (server.ping === null || server.ping > maxPing)))
          .sort(sorters[prefs.sort] || sorters.players_desc);
      };

      const joinHere = (jobId, server) => join(placeId, jobId, server).then(done => {
        if (done) scheduleRender();
        return done;
      });

      const flash = jobId => {
        const row = state.rows.get(jobId);
        if (!row) return;
        row.node.classList.add('rk-servers-picked');
        setTimeout(() => row.node.classList.remove('rk-servers-picked'), 1600);
      };

      const createRow = server => {
        const tag = (name, title) => {
          const node = ui.pill('', 'neutral', { title });
          node.classList.add(`rk-servers-${name}`, 'rk-servers-opt', 'rk-hidden');
          return node;
        };
        const ping = el('span', { class: 'rk-hidden', title: 'Average ping of the players already in this server, not your own ping' });
        const fps = el('span', { class: 'rk-hidden' });
        const tags = { laggy: tag('laggy', 'Low fps or high ping'), last: tag('last'), saved: tag('saved-tag'), watching: tag('watching') };
        const more = ui.button('', { variant: 'ghost', icon: 'chevronDown', title: 'More actions', onClick: () => openMenu(row.server, more) });
        more.classList.add('rk-servers-more', 'rk-servers-opt');
        const row = createServerRow(server, target => joinHere(target.id, target), [
          el('span', { class: 'rk-servers-net rk-servers-ping rk-servers-opt' }, ping, fps),
          el('span', { class: 'rk-servers-tags' }, Object.values(tags))
        ], more, 'rk-servers-row-in');
        Object.assign(row, { ping, fps, inView: false }, tags);
        row.node.dataset.job = server.id;
        row.node.setAttribute('role', 'listitem');
        row.node.addEventListener('animationend', () => row.node.classList.remove('rk-servers-row-in'), { once: true });
        return row;
      };

      const updateRow = (row, server, info) => {
        updateServerRow(row, server);
        setLabel(row.ping, server.ping === null ? '' : `avg ${fmt.num(server.ping)} ms`, slowPing(server));
        setLabel(row.fps, server.fps === null ? '' : `${server.fps} fps`, lowFps(server));
        setLabel(row.laggy, isLaggy(server) ? 'Laggy' : '');
        setLabel(row.last, server.id === info.last ? 'Last joined' : '');
        setLabel(row.saved, info.saved.has(server.id) ? 'Saved' : '');
        setLabel(row.watching, server.id === info.watching ? 'Watching' : '');
        if (info.heads && row.inView) paintHeads(row.heads, server);
        if (info.keyboard) row.node.setAttribute('tabindex', '0');
        else row.node.removeAttribute('tabindex');
      };

      const savedRow = entry => {
        const server = state.servers.get(entry.jobId);
        const full = Boolean(server && isFull(server));
        const note = server ? playersText(server) : state.loaded ? 'Not seen in the last refresh' : '';
        const joinButton = ui.button(full ? 'Full' : 'Join', { variant: full ? 'secondary' : 'primary', onClick: () => joinHere(entry.jobId, state.servers.get(entry.jobId)) });
        joinButton.classList.add('rk-servers-join');
        return ui.row(
          [el('span', { class: 'rk-servers-job', title: entry.jobId }, entry.jobId), note ? el('span', { class: 'rk-servers-note' }, note) : null],
          [
            el('span', { class: 'rk-servers-when' }, `Saved ${fmt.ago(entry.time)}`),
            joinButton,
            ui.button('', { variant: 'ghost', icon: 'trash', title: 'Remove', onClick: () => toggleSaved(entry.jobId) })
          ],
          { className: `rk-servers-saved-row${full ? ' rk-servers-row-full' : ''}` }
        );
      };

      const renderSaved = () => {
        const entries = readSaved(placeId);
        const key = JSON.stringify([state.loaded, entries.map(entry => {
          const server = state.servers.get(entry.jobId);
          return [entry.jobId, entry.time, server ? playersText(server) : null];
        })]);
        if (key === state.savedKey) return;
        state.savedKey = key;
        savedBox.classList.toggle('rk-hidden', !entries.length);
        savedList.replaceChildren(...entries.map(savedRow));
      };

      const renderStatus = () => {
        let key = '';
        if (state.error && !state.busy) key = `error:${state.errorMore}:${state.loaded}:${state.error.status || 0}`;
        else if (!state.loaded) key = 'loading';
        else if (!state.servers.size && !state.busy) key = 'empty';
        else if (state.servers.size && !state.visible.length) key = 'filtered';
        if (key === state.statusKey) return;
        state.statusKey = key;
        if (key === 'loading') {
          status.replaceChildren(...[0, 1, 2, 3].map(() => el('div', { class: 'rk-skeleton rk-servers-skeleton' })));
        } else if (key === 'empty') {
          status.replaceChildren(ui.empty('No public servers are running right now'));
        } else if (key === 'filtered') {
          status.replaceChildren(el('div', { class: 'rk-empty rk-servers-none' },
            el('span', null, 'No servers match your filters'),
            ui.button('Clear filters', { variant: 'secondary', onClick: () => setPrefs({ ...prefs, hideFull: false, minSlots: 0, maxPing: 0 }) })
          ));
        } else if (key) {
          const text = state.errorMore ? 'Could not load more servers' : state.loaded ? 'Could not refresh the server list' : 'Could not load servers';
          status.replaceChildren(el('div', { class: 'rk-servers-error' },
            icon('info', 16),
            el('span', null, failText(state.error, text)),
            ui.button('Retry', { variant: 'secondary', onClick: () => load({ more: state.errorMore }) })
          ));
        } else {
          status.replaceChildren();
        }
      };

      const renderMeta = () => {
        const all = [...state.servers.values()];
        if (state.loaded) {
          const players = all.reduce((sum, server) => sum + server.playing, 0);
          const pings = all.filter(server => server.ping !== null);
          const average = pings.length ? Math.round(pings.reduce((sum, server) => sum + server.ping, 0) / pings.length) : null;
          const shown = state.visible.length === all.length ? '' : `, ${fmt.num(state.visible.length)} shown`;
          setText(summary, `${fmt.plural(all.length, 'server')} loaded, ${fmt.plural(players, 'player')}, players avg ping ${average === null ? '-' : `${fmt.num(average)} ms`}${shown}`);
        } else {
          setText(summary, state.error ? '' : 'Loading servers');
        }
        setText(autoLabel, `Auto refresh every ${Rk.option('servers.autoRefresh', 'seconds')}s`);
        updateHistogram(histogram, all);
      };

      const renderControls = last => {
        rejoinButton.classList.toggle('rk-hidden', !(last && state.servers.has(last)));
        for (const button of pickButtons) setDisabled(button, !state.visible.length);
        setDisabled(refreshButton, state.busy);
        refreshButton.classList.toggle('rk-servers-spin', state.busy && !state.loadingMore);
        setDisabled(loadMoreButton, state.busy);
        setText(loadMoreButton.lastElementChild, state.loadingMore ? 'Loading' : 'Load more');
        footer.classList.toggle('rk-hidden', !state.loaded || !state.cursor);
      };

      const render = () => {
        if (state.frame) cancelAnimationFrame(state.frame);
        state.frame = 0;
        const info = {
          last: lastJob(placeId),
          saved: new Set(readSaved(placeId).map(entry => entry.jobId)),
          watching: state.watch ? state.watch.jobId : null,
          keyboard: on('keyboard'),
          heads: on('playerHeads')
        };
        const visible = visibleServers();
        state.visible = visible;
        const top = list.scrollTop;
        const focused = list.contains(document.activeElement) ? document.activeElement : null;
        let cursor = list.firstElementChild;
        for (const server of visible) {
          let row = state.rows.get(server.id);
          if (row) {
            row.node.classList.remove('rk-servers-row-in');
          } else {
            row = createRow(server);
            state.rows.set(server.id, row);
            if (state.seen) state.seen.observe(row.node);
          }
          updateRow(row, server, info);
          if (row.node === cursor) cursor = cursor.nextElementSibling;
          else list.insertBefore(row.node, cursor);
        }
        while (cursor) {
          const next = cursor.nextElementSibling;
          cursor.remove();
          cursor = next;
        }
        for (const [id, row] of state.rows) {
          if (state.servers.has(id)) continue;
          if (state.seen) state.seen.unobserve(row.node);
          state.rows.delete(id);
        }
        if (list.scrollTop !== top) list.scrollTop = top;
        if (focused && focused.isConnected && document.activeElement !== focused) focused.focus({ preventScroll: true });
        renderStatus();
        renderMeta();
        renderSaved();
        renderControls(info.last);
      };

      const scheduleRender = () => {
        if (!state.frame) state.frame = requestAnimationFrame(render);
      };

      const syncControls = () => {
        if (sortSelect.value !== prefs.sort) sortSelect.value = prefs.sort;
        hideChip.classList.toggle('rk-btn-active', prefs.hideFull);
        hideChip.setAttribute('aria-pressed', String(prefs.hideFull));
        if (document.activeElement !== minInput) minInput.value = String(prefs.minSlots);
        if (document.activeElement !== maxInput) maxInput.value = prefs.maxPing ? String(prefs.maxPing) : '';
      };

      const setPrefs = (next, { persist = true } = {}) => {
        if (next.sort !== prefs.sort) list.scrollTop = 0;
        prefs = next;
        syncControls();
        if (persist && on('rememberFilters')) Rk.store.set('servers.prefs', { sort: prefs.sort, hideFull: prefs.hideFull, minSlots: prefs.minSlots, maxPing: prefs.maxPing });
        scheduleRender();
      };

      const planRefresh = () => {
        clearTimeout(state.refreshTimer);
        state.refreshTimer = 0;
        if (!state.shown || !on('autoRefresh') || !live()) return;
        state.refreshTimer = setTimeout(() => {
          state.refreshTimer = 0;
          if (!section.isConnected) detach();
          else if (live() && on('autoRefresh')) load();
        }, Math.max(1000, refreshMs() - (Date.now() - state.lastLoad)));
      };

      const slotOpened = server => {
        state.watch = null;
        planWatch();
        Rk.bg('notify', {
          title: 'A server slot opened',
          message: `The server you were watching in ${placeName()} has ${fmt.plural(freeSlots(server), 'free slot')}`,
          url: inviteLink(placeId, server.id)
        }).catch(() => {});
        ui.toast('A slot opened in the server you were watching', { tone: 'success', duration: 5000 });
        flash(server.id);
        scheduleRender();
      };

      const checkWatched = () => {
        const server = state.watch && state.servers.get(state.watch.jobId);
        if (server && !isFull(server)) slotOpened(server);
      };

      const checkWatch = async () => {
        state.watchTimer = 0;
        if (!section.isConnected) {
          detach();
          return;
        }
        const watch = state.watch;
        if (!watch || !live()) return;
        let found = null;
        let cursor = null;
        for (let page = 0; page < ctx.option('pages') && !found; page++) {
          const result = await fetchServers(placeId, 'Public', cursor).catch(() => null);
          if (!result) break;
          found = result.list.find(server => server.id === watch.jobId) || null;
          cursor = result.next;
          if (!cursor) break;
        }
        if (state.watch !== watch) return;
        if (found && state.servers.has(found.id)) {
          state.servers.set(found.id, found);
          scheduleRender();
        }
        if (found && !isFull(found)) slotOpened(found);
        else planWatch();
      };

      const planWatch = () => {
        clearTimeout(state.watchTimer);
        state.watchTimer = 0;
        if (!state.watch || !on('slotAlert') || !live()) return;
        state.watchTimer = setTimeout(checkWatch, WATCH_MS);
      };

      const load = async ({ more = false } = {}) => {
        if (state.busy || (more && !state.cursor)) return;
        state.busy = true;
        state.loadingMore = more;
        state.error = null;
        scheduleRender();
        const pages = more ? 1 : Math.min(20, Math.max(ctx.option('pages'), state.pages));
        const seen = new Set();
        let cursor = more ? state.cursor : null;
        let fetched = 0;
        let failed = null;
        while (fetched < pages) {
          const result = await fetchServers(placeId, 'Public', cursor).catch(err => {
            failed = err || new Error('request failed');
            return null;
          });
          if (!result) break;
          fetched++;
          for (const server of result.list) {
            seen.add(server.id);
            state.servers.set(server.id, server);
          }
          cursor = result.next;
          state.loaded = true;
          checkWatched();
          scheduleRender();
          if (!cursor) break;
        }
        if (more) {
          if (fetched) {
            state.pages += 1;
            state.cursor = cursor;
          }
        } else if (!failed) {
          for (const id of [...state.servers.keys()]) {
            if (!seen.has(id)) state.servers.delete(id);
          }
          state.pages = fetched;
          state.cursor = cursor;
        } else if (fetched >= state.pages) {
          state.pages = fetched;
          state.cursor = cursor;
        }
        if (!more) state.lastLoad = Date.now();
        state.error = failed;
        state.errorMore = more;
        state.busy = false;
        state.loadingMore = false;
        scheduleRender();
        planRefresh();
      };

      const refresh = () => {
        state.shown = true;
        load();
      };

      const toggleSaved = jobId => {
        const entries = readSaved(placeId);
        if (entries.some(entry => entry.jobId === jobId)) {
          writeSaved(placeId, entries.filter(entry => entry.jobId !== jobId));
          ui.toast('Removed from saved servers');
        } else if (entries.length >= MAX_SAVED) {
          ui.toast(`You can save up to ${MAX_SAVED} servers per experience`, { tone: 'warning' });
          return;
        } else {
          writeSaved(placeId, [{ jobId, time: Date.now() }, ...entries]);
          ui.toast('Server saved', { tone: 'success' });
        }
        scheduleRender();
      };

      const watchServer = server => {
        const replacing = Boolean(state.watch);
        state.watch = { jobId: server.id };
        planWatch();
        scheduleRender();
        ui.toast(replacing ? 'Now watching this server instead' : 'You will be notified when a slot opens', { tone: 'success' });
      };

      const unwatch = () => {
        state.watch = null;
        planWatch();
        scheduleRender();
        ui.toast('Stopped watching this server');
      };

      const openMenu = (server, anchor) => {
        const isSaved = readSaved(placeId).some(entry => entry.jobId === server.id);
        const watching = Boolean(state.watch && state.watch.jobId === server.id);
        const items = [
          on('copyLink') && { label: 'Copy invite link', icon: 'link', onClick: () => ui.copy(inviteLink(placeId, server.id), 'Invite link copied') },
          on('copyJobId') && { label: 'Copy job ID', icon: 'copy', onClick: () => ui.copy(server.id, 'Job ID copied') },
          on('saved') && { label: isSaved ? 'Remove from saved' : 'Save server', icon: 'star', onClick: () => toggleSaved(server.id) },
          on('slotAlert') && (watching || isFull(server)) && { label: watching ? 'Stop notifying' : 'Notify when a slot opens', icon: 'bell', onClick: () => (watching ? unwatch() : watchServer(server)) }
        ].filter(Boolean);
        if (items.length) ui.menu(anchor, items);
        else ui.toast('No actions for this server right now');
      };

      const pick = entry => {
        const server = pickers[entry.key](state.visible);
        if (!server) {
          ui.toast('No server fits that right now', { tone: 'warning' });
          return;
        }
        flash(server.id);
        ui.toast(`Joining a server with ${fmt.plural(server.playing, 'player')}`);
        joinHere(server.id, server);
      };

      const rejoin = () => {
        const jobId = lastJob(placeId);
        const server = jobId && state.servers.get(jobId);
        if (server) joinHere(jobId, server);
      };

      const joinTyped = () => {
        const parsed = parseInvite(idInput.value);
        if (!parsed) {
          ui.toast('That is not a valid job ID or invite link', { tone: 'warning' });
          idInput.focus();
          return;
        }
        const target = parsed.placeId || placeId;
        join(target, parsed.jobId, target === placeId ? state.servers.get(parsed.jobId) : null).then(done => {
          if (!done) return;
          idInput.value = '';
          scheduleRender();
        });
      };

      const followTyped = async () => {
        const name = userInput.value.trim().replace(/^@/, '');
        if (!/^[A-Za-z0-9_]{3,20}$/.test(name)) {
          ui.toast('Enter a valid username', { tone: 'warning' });
          userInput.focus();
          return;
        }
        setDisabled(followButton, true);
        try {
          const json = await Rk.api.post('https://users.roblox.com/v1/usernames/users', { usernames: [name], excludeBannedUsers: true });
          const match = json && Array.isArray(json.data) ? json.data.find(user => user && Rk.isId(user.id)) : null;
          if (!match) {
            ui.toast(`No user named ${name}`, { tone: 'warning' });
            return;
          }
          const label = typeof match.displayName === 'string' && match.displayName.trim() ? match.displayName.trim().slice(0, 40) : name;
          Rk.launch.follow(Number(match.id));
          ui.toast(`Joining ${label}`);
          userInput.value = '';
        } catch (err) {
          ui.toast(failText(err, 'Could not look up that user'), { tone: 'danger' });
        } finally {
          setDisabled(followButton, false);
        }
      };

      list.addEventListener('keydown', event => {
        if (!on('keyboard')) return;
        const row = event.target.closest('.rk-servers-row');
        if (!row || row.parentNode !== list) return;
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault();
          const next = event.key === 'ArrowDown' ? row.nextElementSibling : row.previousElementSibling;
          if (next) next.focus();
        } else if (event.key === 'Enter' && event.target === row) {
          event.preventDefault();
          const entry = state.rows.get(row.dataset.job);
          if (entry) joinHere(entry.server.id, entry.server);
        }
      });

      const onVisibility = () => {
        planRefresh();
        planWatch();
      };

      const onRowsSeen = entries => {
        if (!section.isConnected) {
          detach();
          return;
        }
        const heads = on('playerHeads');
        for (const entry of entries) {
          const row = state.rows.get(entry.target.dataset.job);
          if (!row || row.node !== entry.target) continue;
          row.inView = entry.isIntersecting;
          if (row.inView && heads) paintHeads(row.heads, row.server);
        }
      };

      const syncSettings = () => {
        section.classList.toggle('rk-hidden', !on('browser'));
        scheduleRender();
        planRefresh();
        planWatch();
      };

      const detach = () => {
        state.attached = false;
        document.removeEventListener('visibilitychange', onVisibility);
        if (state.unsubscribe) state.unsubscribe();
        state.unsubscribe = null;
        if (state.seen) state.seen.disconnect();
        state.seen = null;
        for (const row of state.rows.values()) row.inView = false;
        clearTimeout(state.refreshTimer);
        clearTimeout(state.watchTimer);
        state.refreshTimer = 0;
        state.watchTimer = 0;
      };

      const attach = () => {
        if (state.attached || !section.isConnected) return;
        state.attached = true;
        state.seen = new IntersectionObserver(onRowsSeen, { root: list, rootMargin: '120px 0px' });
        for (const row of state.rows.values()) state.seen.observe(row.node);
        document.addEventListener('visibilitychange', onVisibility);
        state.unsubscribe = Rk.onSettings(syncSettings);
        syncSettings();
        if (state.waiting) return;
        state.waiting = true;
        whenShown(section, () => {
          if (!state.shown) refresh();
        });
      };

      browser = { restorePrefs: () => setPrefs(readPrefs(prefs), { persist: false }) };
      syncControls();
      render();
      Rk.mount(ANCHORS, section, { position: 'prepend' });
      Rk.observe(ANCHORS.join(', '), attach);
    }
  });

  Rk.feature({
    id: 'servers.playerHeads',
    category: 'servers',
    name: 'Player avatars',
    description: 'Shows the avatars of the players in each server.',
    pages: ['game'],
    css: `${reveal('flex', 'heads')}
.rk-servers-heads {
  flex: none;
  align-items: center;
  width: 152px;
}
.rk-servers-head {
  flex: none;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background-color: var(--rk-bg);
  background-image: linear-gradient(var(--rk-shift), var(--rk-shift));
  box-shadow: 0 0 0 2px var(--rk-bg);
}
.rk-servers-head + .rk-servers-head {
  margin-left: -8px;
}
.rk-servers-head .rk-thumb {
  width: 100% !important;
  height: 100% !important;
  background: transparent;
}
.rk-servers-extra {
  margin-left: 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--rk-muted);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}`
  });

  Rk.feature({
    id: 'servers.ping',
    category: 'servers',
    name: 'Ping and fps',
    description: 'Shows the average ping of the players in each server and its fps, and marks slow ones in red.',
    pages: ['game'],
    css: reveal('inline-flex', 'ping')
  });

  const FLAGS_KEY = 'rk-servers-flags';

  const flagRequests = new Map();
  const flagFor = code => {
    if (!/^[A-Z]{2}$/.test(code)) return Promise.resolve(null);
    if (flagRequests.has(code)) return flagRequests.get(code);
    const request = (async () => {
      let saved = {};
      try {
        saved = JSON.parse(localStorage.getItem(FLAGS_KEY) || '{}') || {};
      } catch {}
      if (typeof saved[code] === 'string' && saved[code].startsWith('data:image/')) return saved[code];
      const data = await Rk.bg('image-data', { url: `https://flagcdn.com/w40/${code.toLowerCase()}.png` }).catch(() => null);
      if (typeof data !== 'string' || !data.startsWith('data:image/')) return null;
      try {
        localStorage.setItem(FLAGS_KEY, JSON.stringify({ ...saved, [code]: data }));
      } catch {}
      return data;
    })();
    flagRequests.set(code, request);
    return request;
  };

  Rk.feature({
    id: 'servers.region',
    category: 'servers',
    name: 'Server region',
    description: 'Shows the city and country each server runs in, worked out from the server address and a public list of Roblox datacenters.',
    default: false,
    pages: ['game'],
    css: `
.rk-servers-region {
  flex: none;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  color: var(--rk-muted);
  white-space: nowrap;
}
.rk-servers-flag {
  width: 18px;
  height: 13px;
  border-radius: 2px;
  object-fit: cover;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.25);
}
.rk-servers-region-missing {
  opacity: 0.6;
}
.rk-servers-region-pending {
  opacity: 0.5;
}
@container (max-width: 560px) {
  .rk-servers-row .rk-servers-region {
    display: none !important;
  }
}`,
    run(ctx) {
      const placeId = placeIdFor();
      if (!placeId) return;
      const found = new Map();
      const waiting = new Map();
      const queue = [];
      let active = 0;
      let pausedUntil = 0;
      let lastStart = 0;
      let pumpTimer = 0;
      let stopped = false;

      const fill = (span, result) => {
        span.classList.remove('rk-servers-region-pending');
        span.classList.toggle('rk-servers-region-missing', !result.label);
        if (!result.label) {
          span.replaceChildren(result.reason);
          span.title = result.detail || result.reason;
          return;
        }
        const code = result.label.split(', ').pop();
        span.replaceChildren(result.label);
        span.title = `Server in ${result.label}`;
        flagFor(code).then(data => {
          if (!data || !span.isConnected || span.querySelector('.rk-servers-flag')) return;
          const flag = el('img', { class: 'rk-servers-flag', alt: code });
          flag.src = data;
          span.prepend(flag);
        });
      };

      const show = (jobId, result) => {
        for (const span of waiting.get(jobId) || []) fill(span, result);
        waiting.delete(jobId);
      };

      const locate = async jobId => {
        const result = await Rk.bg('server-region', { placeId: Number(placeId), jobId }).catch(() => null);
        if (!result) return { reason: 'Region unknown', detail: 'Rola could not run the region lookup' };
        if (result.retry) {
          pausedUntil = Date.now() + 30000;
          return undefined;
        }
        if (result.stop) stopped = true;
        return result;
      };

      const pump = () => {
        while (active < 2 && queue.length && !stopped && Rk.isEnabled(ctx.id)) {
          const wait = Math.max(pausedUntil, lastStart + 1000) - Date.now();
          if (wait > 0) {
            if (!pumpTimer) pumpTimer = setTimeout(() => {
              pumpTimer = 0;
              pump();
            }, wait);
            return;
          }
          const jobId = queue.shift();
          lastStart = Date.now();
          active += 1;
          locate(jobId).then(result => {
            if (result === undefined) {
              queue.push(jobId);
              return;
            }
            found.set(jobId, result);
            show(jobId, result);
          }).finally(() => {
            active -= 1;
            pump();
          });
        }
        if (stopped) for (const jobId of [...waiting.keys()]) show(jobId, { reason: 'Region unavailable', detail: 'Roblox refused the lookup' });
      };

      const request = (jobId, span) => {
        if (found.has(jobId)) {
          fill(span, found.get(jobId));
          return;
        }
        if (!waiting.has(jobId)) {
          waiting.set(jobId, []);
          queue.push(jobId);
        }
        waiting.get(jobId).push(span);
        pump();
      };

      Rk.observe('.rk-servers-browser .rk-servers-row[data-job]', row => {
        const jobId = row.dataset.job;
        if (!isJobId(jobId) || row.querySelector('.rk-servers-region')) return;
        const span = el('span', { class: 'rk-servers-region rk-servers-region-pending' }, '\u2026');
        const net = row.querySelector('.rk-servers-net');
        if (net) net.after(span);
        else if (row.firstElementChild) row.firstElementChild.append(span);
        else return;
        span.classList.toggle('rk-hidden', !Rk.isEnabled(ctx.id));
        whenShown(row, () => request(jobId, span));
      });

      Rk.onSettings(() => {
        const enabled = Rk.isEnabled(ctx.id);
        for (const span of document.querySelectorAll('.rk-servers-region')) span.classList.toggle('rk-hidden', !enabled);
        if (enabled) pump();
      });
    }
  });

  Rk.feature({
    id: 'servers.fillBar',
    category: 'servers',
    name: 'Capacity bars',
    description: 'Shows how full each server is with a small bar.',
    pages: ['game'],
    css: reveal('block', 'fill')
  });

  Rk.feature({
    id: 'servers.joinSmallest',
    category: 'servers',
    name: 'Join smallest server',
    description: 'Adds a button that joins the emptiest server that still has players.',
    pages: ['game'],
    css: reveal('inline-flex', 'pick-smallest')
  });

  Rk.feature({
    id: 'servers.joinBestPing',
    category: 'servers',
    name: 'Join best ping',
    description: 'Adds a button that joins the open server with the lowest ping.',
    pages: ['game'],
    css: reveal('inline-flex', 'pick-ping')
  });

  Rk.feature({
    id: 'servers.joinRandom',
    category: 'servers',
    name: 'Join random server',
    description: 'Adds a button that joins a random server with a free slot.',
    default: false,
    pages: ['game'],
    css: reveal('inline-flex', 'pick-random')
  });

  Rk.feature({
    id: 'servers.joinFullest',
    category: 'servers',
    name: 'Join busiest server',
    description: 'Adds a button that joins the fullest server that still has a free slot.',
    default: false,
    pages: ['game'],
    css: reveal('inline-flex', 'pick-busiest')
  });

  Rk.feature({
    id: 'servers.copyLink',
    category: 'servers',
    name: 'Copy invite link',
    description: 'Lets you copy a link that sends friends straight to a server.',
    pages: ['game'],
    css: reveal('inline-flex', 'more')
  });

  Rk.feature({
    id: 'servers.copyJobId',
    category: 'servers',
    name: 'Copy job ID',
    description: 'Lets you copy the job ID of any server.',
    default: false,
    pages: ['game'],
    css: reveal('inline-flex', 'more')
  });

  Rk.feature({
    id: 'servers.hideFull',
    category: 'servers',
    name: 'Hide full servers',
    description: 'Adds a filter that hides servers with no free slots.',
    pages: ['game'],
    css: reveal('inline-flex', 'hide-full')
  });

  Rk.feature({
    id: 'servers.minSlots',
    category: 'servers',
    name: 'Minimum free slots',
    description: 'Adds a filter for servers with at least a set number of free slots.',
    default: false,
    pages: ['game'],
    css: reveal('inline-flex', 'min-slots')
  });

  Rk.feature({
    id: 'servers.maxPing',
    category: 'servers',
    name: 'Maximum ping',
    description: 'Adds a filter that hides servers above a set ping.',
    default: false,
    pages: ['game'],
    css: reveal('inline-flex', 'max-ping')
  });

  Rk.feature({
    id: 'servers.joinById',
    category: 'servers',
    name: 'Join by job ID',
    description: 'Join a server by pasting its job ID or invite link.',
    pages: ['game'],
    css: `${reveal('grid', 'forms')}${reveal('flex', 'join-id')}`
  });

  Rk.feature({
    id: 'servers.autoRefresh',
    category: 'servers',
    name: 'Auto refresh servers',
    description: 'Refreshes the server list on a timer while the page is open and visible.',
    default: false,
    pages: ['game'],
    options: [
      { key: 'seconds', label: 'Refresh every (seconds)', type: 'number', min: 15, max: 300, step: 5, default: 60 }
    ],
    css: `${reveal('flex', 'meta')}${reveal('inline-flex', 'auto')}
.rk-servers-auto {
  align-items: center;
  gap: 4px;
  white-space: nowrap;
}`
  });

  Rk.feature({
    id: 'servers.summary',
    category: 'servers',
    name: 'Server summary',
    description: 'Shows how many servers and players are loaded and the average ping.',
    pages: ['game'],
    css: `${reveal('flex', 'meta')}${reveal('inline', 'summary')}`
  });

  Rk.feature({
    id: 'servers.friendServers',
    category: 'servers',
    name: "Friends' servers",
    description: "Shows the servers your friends are playing in with a join button, in place of Roblox's list.",
    pages: ['game'],
    css: `${ROW_CSS}
#rbx-friends-running-games {
  display: none !important;
}
.rk-servers-friends .rk-servers-opt {
  display: none;
}
.rk-servers-friend-list {
  display: flex;
  flex-direction: column;
  margin: 0 -8px;
}
.rk-servers-friend-names {
  min-width: 0;
  overflow: hidden;
  font-size: 13px;
  color: var(--rk-muted);
  white-space: nowrap;
  text-overflow: ellipsis;
}`,
    async run() {
      const placeId = placeIdFor();
      if (!placeId || !(await Rk.me())) return;
      const list = el('div', { class: 'rk-servers-friend-list' });
      const refreshButton = ui.button('', { variant: 'ghost', icon: 'refresh', title: "Refresh friends' servers", onClick: () => load() });
      const section = ui.section("Friends' servers", list, { className: 'rk-servers-friends rk-hidden', actions: refreshButton });
      let rows = new Map();
      let busy = false;
      let seen = false;

      const paint = () => {
        if (!seen || !on('playerHeads')) return;
        for (const row of rows.values()) paintHeads(row.heads, row.server);
      };

      const sync = () => {
        section.classList.toggle('rk-hidden', !rows.size || !on('friendServers'));
        paint();
      };

      const friendRow = server => {
        const names = el('span', { class: 'rk-servers-friend-names' });
        const row = createServerRow(server, target => join(placeId, target.id, target), names, null, 'rk-servers-friend-row');
        row.names = names;
        return row;
      };

      const updateFriendRow = (row, server, users) => {
        const names = server.friendIds
          .map(id => users.get(id))
          .map(user => (user && typeof (user.displayName || user.name) === 'string' ? (user.displayName || user.name).slice(0, 40) : ''))
          .filter(Boolean);
        const text = names.length > 3 ? `With ${names.slice(0, 3).join(', ')} and ${fmt.num(names.length - 3)} more` : names.length ? `With ${names.join(', ')}` : '';
        updateServerRow(row, server);
        setText(row.names, text);
        if (row.names.title !== text) row.names.title = text;
      };

      const load = async () => {
        if (busy) return;
        busy = true;
        refreshButton.disabled = true;
        const result = await fetchServers(placeId, 'Friend', null).catch(() => null);
        if (result) {
          const users = await Rk.api.users(result.list.flatMap(server => server.friendIds)).catch(() => new Map());
          const next = new Map();
          for (const server of result.list) {
            const row = rows.get(server.id) || friendRow(server);
            updateFriendRow(row, server, users);
            next.set(server.id, row);
          }
          rows = next;
          list.replaceChildren(...[...rows.values()].map(row => row.node));
          sync();
        }
        busy = false;
        refreshButton.disabled = false;
      };

      Rk.onSettings(sync);
      Rk.mount(ANCHORS, section, { position: 'prepend' });
      whenShown(section, () => {
        seen = true;
        paint();
      });
      await Rk.waitFor(ANCHORS.join(', '));
      await load();
    }
  });

  Rk.feature({
    id: 'servers.saved',
    category: 'servers',
    name: 'Saved servers',
    description: 'Save servers you like and rejoin them later from the top of the list.',
    default: false,
    pages: ['game'],
    css: `${reveal('flex', 'saved')}${reveal('inline-flex', 'more', 'saved-tag')}
.rk-servers-saved-list {
  display: flex;
  flex-direction: column;
  margin: 0 -8px;
}
.rk-servers-saved-row {
  box-sizing: border-box;
  min-height: 40px;
  padding: 4px 8px;
  border-radius: 0;
}
.rk-servers-saved-row + .rk-servers-saved-row {
  border-top: 1px solid var(--rk-border);
}
.rk-servers-saved-row .rk-servers-job {
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.rk-servers-note,
.rk-servers-when {
  font-size: 12px;
  color: var(--rk-muted);
  white-space: nowrap;
}
.rk-servers-note {
  font-variant-numeric: tabular-nums;
}
@media (max-width: 640px) {
  .rk-servers-when {
    display: none;
  }
}`
  });

  Rk.feature({
    id: 'servers.compact',
    category: 'servers',
    name: 'Compact server rows',
    description: 'Makes server rows denser so more fit on screen.',
    default: false,
    pages: ['game'],
    css: `
.rk-servers-row,
.rk-servers-saved-row {
  min-height: 32px !important;
  padding: 2px 8px !important;
  font-size: 13px;
  contain-intrinsic-size: auto 32px !important;
}
.rk-servers-row .rk-btn-sm,
.rk-servers-saved-row .rk-btn-sm {
  height: 24px;
  padding: 0 8px;
  font-size: 12px;
}
.rk-servers-row .rk-btn-icon.rk-btn-sm,
.rk-servers-saved-row .rk-btn-icon.rk-btn-sm {
  width: 24px;
  padding: 0;
}
.rk-servers-row .rk-pill,
.rk-servers-saved-row .rk-pill {
  height: 18px;
  font-size: 11px;
}
.rk-servers-heads {
  width: 124px !important;
}
.rk-servers-head {
  width: 20px !important;
  height: 20px !important;
}
.rk-servers-head + .rk-servers-head {
  margin-left: -6px !important;
}
.rk-servers-skeleton {
  height: 28px !important;
}`
  });

  Rk.feature({
    id: 'servers.keyboard',
    category: 'servers',
    name: 'Keyboard navigation',
    description: 'Move between servers with the arrow keys and join with Enter.',
    default: false,
    pages: ['game'],
    css: `
.rk-servers-list .rk-servers-row:focus-visible {
  background: var(--rk-hover);
  box-shadow: inset 0 0 0 2px var(--rk-accent);
}`
  });

  Rk.feature({
    id: 'servers.fullWarning',
    category: 'servers',
    name: 'Full server warning',
    description: 'Asks before joining a full server, since you would wait in a queue.',
    pages: ['game'],
    css: `
.rk-servers-row-full .rk-servers-join.rk-btn-secondary {
  color: var(--rk-muted) !important;
}
.rk-servers-row-full .rk-servers-join.rk-btn-secondary:hover {
  color: var(--rk-text-strong) !important;
}`
  });

  Rk.feature({
    id: 'servers.rejoinLast',
    category: 'servers',
    name: 'Rejoin last server',
    description: 'Remembers the last server you joined and adds a button to rejoin it.',
    pages: ['game'],
    css: reveal('inline-flex', 'rejoin', 'last')
  });

  Rk.feature({
    id: 'servers.rememberFilters',
    category: 'servers',
    name: 'Remember filters',
    description: 'Keeps your server sort and filters between visits.',
    pages: ['game'],
    run() {
      if (browser) browser.restorePrefs();
    }
  });

  Rk.feature({
    id: 'servers.loadMore',
    category: 'servers',
    name: 'Load more servers',
    description: 'Adds a button to load the next page of servers.',
    pages: ['game'],
    css: reveal('flex', 'footer')
  });

  Rk.feature({
    id: 'servers.followUser',
    category: 'servers',
    name: 'Join a user',
    description: 'Join any user in their server by typing their username.',
    pages: ['game'],
    css: `${reveal('grid', 'forms')}${reveal('flex', 'follow')}`
  });

  Rk.feature({
    id: 'servers.laggyFlags',
    category: 'servers',
    name: 'Laggy server flags',
    description: 'Marks servers with low fps or high ping as laggy.',
    pages: ['game'],
    css: reveal('inline-flex', 'laggy')
  });

  Rk.feature({
    id: 'servers.histogram',
    category: 'servers',
    name: 'Server fill chart',
    description: 'Shows a tiny chart of how full the loaded servers are.',
    default: false,
    pages: ['game'],
    css: `${reveal('flex', 'meta')}${reveal('inline-flex', 'histogram')}
.rk-servers-histogram {
  align-items: center;
  gap: 6px;
  font-size: 12px;
}
.rk-servers-histogram svg {
  display: block;
}
.rk-servers-track {
  fill: var(--rk-shift);
}
.rk-servers-bar {
  fill: var(--rk-text);
  transform-box: fill-box;
  transform-origin: bottom;
  transition: transform var(--rk-med) var(--rk-ease);
}
.rk-servers-bar-0 {
  opacity: 0.3;
}
.rk-servers-bar-1 {
  opacity: 0.45;
}
.rk-servers-bar-2 {
  opacity: 0.6;
}
.rk-servers-bar-3 {
  opacity: 0.75;
}
.rk-servers-bar-4 {
  fill: var(--rk-muted);
  opacity: 0.5;
}
@media (prefers-reduced-motion: reduce) {
  .rk-servers-bar {
    transition: none;
  }
}`
  });

  Rk.feature({
    id: 'servers.slotAlert',
    category: 'servers',
    name: 'Slot alerts',
    description: 'Notifies you when a slot opens in a full server you are watching.',
    default: false,
    pages: ['game'],
    css: reveal('inline-flex', 'more', 'watching')
  });

  Rk.feature({
    id: 'servers.tabShortcut',
    category: 'servers',
    name: 'Servers shortcut',
    description: 'Adds a button by the play button that jumps to the server list.',
    pages: ['game'],
    css: `
.game-calls-to-action .rk-servers-tab-btn {
  align-self: flex-start;
  margin-top: 8px;
}`,
    run() {
      const openTab = () => {
        const tab = document.querySelector('#tab-game-instances a');
        if (tab) tab.click();
        requestAnimationFrame(() => {
          const target = document.querySelector('.rk-servers-browser:not(.rk-hidden)') || document.querySelector('#game-instances');
          if (target) target.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' });
        });
      };
      Rk.observe('.game-calls-to-action', node => {
        if (node.querySelector('.rk-servers-tab-btn')) return;
        const button = ui.button('Servers', { variant: 'ghost', icon: 'server', onClick: openTab });
        button.classList.add('rk-servers-tab-btn');
        node.append(button);
      });
      Rk.onSettings(() => {
        for (const button of document.querySelectorAll('.rk-servers-tab-btn')) button.classList.toggle('rk-hidden', !on('tabShortcut'));
      });
    }
  });
})();
