(() => {
  const { el, ui, fmt, icon } = Rk;

  const GAME = ['game'];
  const HOUR = 3600000;
  const DAY = 86400000;
  const ROBUX_USD = 0.0125;
  const BADGE_ROW = '.badge-container .badge-row';
  const PASS_LINK = '#rbx-passes-container a[href*="/game-pass/"]';
  const PLAY_BUTTON = 'button.btn-common-play-game-lg';
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const LINK_HOSTS = /(^|\.)(roblox\.com|youtube\.com|youtu\.be|twitch\.tv|x\.com|twitter\.com)$/i;
  const AVATAR_TYPES = new Map([['MorphToR6', 'R6'], ['MorphToR15', 'R15'], ['PlayerChoice', 'R6 or R15']]);
  const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

  const sectionsCss = `
.rk-games-sections { display: flow-root; clear: both; margin: 16px 0 0; }
`;

  const listCss = `
.rk-games-list { display: flex; flex-direction: column; }
.rk-games-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 2px 8px; }
.rk-games-scroll { max-height: 320px; overflow: auto; overscroll-behavior: contain; }
.rk-games-text { display: flex; flex-direction: column; min-width: 0; }
.rk-games-text > * { display: block; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.rk-games-text > .rk-games-title { display: flex; align-items: center; min-width: 0; }
.rk-games-title > .rk-link { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
.rk-games-sub { font-size: 12px; color: var(--rk-muted); }
`;

  const pillsCss = `
.rk-games-pills { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin: 8px 0; clear: both; }
.rk-games-pills .rk-robux { color: inherit; font-weight: inherit; }
`;

  const headCss = `
.rk-games-head { display: flex; flex-direction: column; gap: 10px; width: 100%; margin-top: 12px; clear: both; }
.rk-games-toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
`;

  const insightsCss = `
.rk-games-insights { display: flex; flex-direction: column; gap: 10px; }
.rk-games-insights-section:not(:has(.rk-games-insights > :not(.rk-hidden))) { display: none; }
.rk-games-line { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--rk-muted); }
`;

  const text = value => (typeof value === 'string' ? value.trim() : '');
  const count = value => (typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null);
  const toTime = value => {
    const time = typeof value === 'number' ? value : typeof value === 'string' ? new Date(value).getTime() : NaN;
    return Number.isFinite(time) && time > 0 ? time : null;
  };
  const since = time => (Date.now() - time < 60000 ? 'just now' : fmt.ago(time));
  const safe = promise => Promise.resolve(promise).catch(() => null);

  let myId = null;
  const meLoaded = Rk.me().then(me => {
    myId = me ? me.id : null;
  });
  const isVerified = (id, flag) => flag === true || (myId !== null && Number(id) === myId && Rk.isEnabled('profiles.fakeVerified'));
  const named = (link, verified, size = 14) => el('span', { class: 'rk-games-title' }, link, verified ? ui.verified({ size }) : null);

  const memo = new Map();
  const cached = (key, load) => {
    if (!memo.has(key)) {
      memo.set(key, Promise.resolve().then(load).catch(() => {
        memo.delete(key);
        return null;
      }));
    }
    return memo.get(key);
  };

  const readMap = key => {
    const value = Rk.store.get(key, null);
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  };

  const readList = key => {
    const value = Rk.store.get(key, null);
    return Array.isArray(value) ? value : [];
  };

  const remember = (key, id, value, max, timeOf) => {
    const map = readMap(key);
    delete map[id];
    const keys = Object.keys(map).sort((a, b) => timeOf(map[a]) - timeOf(map[b]));
    for (const old of keys.slice(0, Math.max(0, keys.length - max + 1))) delete map[old];
    map[id] = value;
    Rk.store.set(key, map);
  };

  const lastOf = entry => (entry && typeof entry === 'object' && toTime(entry.last)) || 0;

  const place = (parent, node, order) => {
    node.dataset.rkOrder = String(order);
    const next = [...parent.children].find(child => child !== node && Number(child.dataset.rkOrder) > order);
    if (next) parent.insertBefore(node, next);
    else parent.append(node);
    return node;
  };

  const nativeCss = (key, selector) => `html:not(.rk-show-${key}) :is(${selector}) { display: none !important; }`;
  const replacing = (key, run) => async ctx => {
    let placed = null;
    try {
      placed = await run(ctx);
    } finally {
      if (!placed) document.documentElement.classList.add(`rk-show-${key}`);
    }
  };

  let sectionHost = null;
  const addSection = (node, order) => {
    if (!sectionHost) {
      sectionHost = el('div', { class: 'rk-games-sections' });
      Rk.mount('.game-main-content', sectionHost, { position: 'after' });
      const fallback = () => {
        if (!sectionHost.isConnected) Rk.mount('#game-detail-page', sectionHost, { position: 'append' });
      };
      if (document.readyState === 'complete') fallback();
      else window.addEventListener('load', fallback, { once: true });
    }
    return place(sectionHost, node, order);
  };

  let pillRow = null;
  const addPill = (node, order) => {
    if (!pillRow) {
      pillRow = el('div', { class: 'rk-games-pills' });
      Rk.mount('h1.game-name', pillRow, { position: 'after' });
    }
    return place(pillRow, node, order);
  };

  let head = null;
  const addHead = (node, order) => {
    if (!head) {
      head = el('div', { class: 'rk-games-head' });
      Rk.mount('.game-calls-to-action', head, { position: 'append' });
    }
    return place(head, node, order);
  };

  let toolbar = null;
  const addTool = (node, order) => {
    if (!toolbar) toolbar = addHead(el('div', { class: 'rk-games-toolbar', role: 'toolbar', 'aria-label': 'Experience actions' }), 2);
    return place(toolbar, node, order);
  };

  let insights = null;
  const addInsight = (node, order) => {
    if (!insights) {
      insights = el('div', { class: 'rk-games-insights' });
      addSection(ui.section('Experience insights', insights, { className: 'rk-games-insights-section' }), 1);
    }
    return place(insights, node, order);
  };

  const entryRow = (image, title, sub, side) => ui.row([image, el('div', { class: 'rk-games-text' }, title, sub ? el('span', { class: 'rk-games-sub' }, sub) : null)], side);

  const metaValue = key => {
    const meta = document.querySelector('#game-detail-meta-data');
    return meta ? meta.getAttribute(`data-${key}`) : null;
  };

  const metaId = key => {
    const value = metaValue(key);
    return Rk.isId(value) ? Number(value) : null;
  };

  const gameInfo = () => cached('info', async () => {
    await Rk.domReady;
    const page = Rk.page();
    const placeId = metaId('place-id') || (page.type === 'game' ? page.id : null);
    if (!Rk.isId(placeId)) return null;
    const universeId = metaId('universe-id') || (await Rk.api.universeId(placeId));
    const games = Rk.isId(universeId) ? await safe(Rk.api.games([universeId])) : null;
    const found = games ? games.get(universeId) : null;
    const game = found && typeof found === 'object' ? found : null;
    const rootPlaceId = metaId('root-place-id') || (game && Rk.isId(game.rootPlaceId) ? Number(game.rootPlaceId) : placeId);
    const heading = document.querySelector('h1.game-name');
    const name = text(game && game.name) || text(metaValue('place-name')) || text(heading && heading.textContent) || `Experience ${placeId}`;
    return { placeId, universeId: Rk.isId(universeId) ? universeId : null, rootPlaceId, game, name };
  });

  const voteInfo = () => cached('votes', async () => {
    const info = await gameInfo();
    if (!info || !info.universeId) return null;
    const entry = (await Rk.api.votes([info.universeId])).get(info.universeId);
    const up = entry ? count(entry.upVotes) : null;
    const down = entry ? count(entry.downVotes) : null;
    if (up === null || down === null || up + down === 0) return null;
    return { up, down, total: up + down, ratio: up / (up + down) };
  });

  const voteSummary = votes => `${fmt.plural(votes.up, 'like')}, ${fmt.plural(votes.down, 'dislike')}`;
  const ratioTone = ratio => (ratio >= 0.8 ? 'success' : ratio >= 0.6 ? 'warning' : 'danger');

  const favoriteCount = () => cached('favorites', async () => {
    const info = await gameInfo();
    if (!info || !info.universeId) return null;
    const json = await safe(Rk.api.get(`https://games.roblox.com/v1/games/${info.universeId}/favorites/count`, { cache: 60000 }));
    const exact = json ? count(json.favoritesCount) : null;
    if (exact !== null) return exact;
    return info.game ? count(info.game.favoritedCount) : null;
  });

  const universeBadges = () => cached('badges', async () => {
    const info = await gameInfo();
    if (!info || !info.universeId) return null;
    const list = await Rk.api.paged(`https://badges.roblox.com/v1/universes/${info.universeId}/badges?sortOrder=Asc`, { max: 500, limit: 100 });
    return list.filter(badge => badge && Rk.isId(badge.id)).map(badge => ({
      id: Number(badge.id),
      created: toTime(badge.created),
      enabled: badge.enabled !== false
    }));
  });

  const awarded = new Map();
  const awardedDates = async ids => {
    const me = await Rk.me();
    if (!me) return null;
    const wanted = [...new Set(ids.filter(Rk.isId).map(Number))];
    const missing = wanted.filter(id => !awarded.has(id));
    for (let i = 0; i < missing.length; i += 100) {
      const chunk = missing.slice(i, i + 100);
      const batch = Rk.api.get(`https://badges.roblox.com/v1/users/${me.id}/badges/awarded-dates?badgeIds=${chunk.join(',')}`).then(json => {
        const dates = new Map();
        for (const entry of (json && Array.isArray(json.data) ? json.data : [])) {
          if (entry && Rk.isId(entry.badgeId) && toTime(entry.awardedDate)) dates.set(Number(entry.badgeId), entry.awardedDate);
        }
        return dates;
      });
      for (const id of chunk) {
        awarded.set(id, batch.then(dates => dates.get(id) || null, () => {
          awarded.delete(id);
          return undefined;
        }));
      }
    }
    const result = new Map();
    await Promise.all(wanted.map(async id => {
      const date = await awarded.get(id);
      if (date !== undefined) result.set(id, date);
    }));
    return result;
  };

  const creatorOf = info => {
    const creator = info && info.game && info.game.creator;
    if (!creator || typeof creator !== 'object' || !Rk.isId(creator.id) || (creator.type !== 'User' && creator.type !== 'Group')) return null;
    return { id: Number(creator.id), type: creator.type, name: text(creator.name), verified: creator.hasVerifiedBadge === true };
  };

  const isCreator = () => cached('creator', async () => {
    const [info, me] = await Promise.all([gameInfo(), Rk.me()]);
    const creator = creatorOf(info);
    return Boolean(me && creator && creator.type === 'User' && creator.id === me.id);
  });

  const descriptionText = () => {
    const node = document.querySelector('.game-description-container .game-description') || document.querySelector('pre.game-description');
    return node ? node.textContent.trim() : '';
  };

  const badgeIdOf = row => {
    const link = row.querySelector('.badge-image > a[href]') || row.querySelector('a[href*="/badges/"]');
    return link ? Rk.idFrom(link.getAttribute('href'), 'badge') : null;
  };

  const badgeNameOf = row => {
    const name = row.querySelector('.badge-name');
    if (!name) return '';
    return [...name.childNodes].filter(node => !(node.nodeType === 1 && node.classList.contains('rk-pill'))).map(node => node.textContent).join('').trim();
  };

  const percentOf = node => {
    const match = node ? node.textContent.match(/(\d+(?:[.,]\d+)?)\s*%/) : null;
    return match ? Number(match[1].replace(',', '.')) : null;
  };

  const rarityOf = row => {
    for (const info of row.querySelectorAll('.badge-stats-info')) {
      const value = percentOf(info);
      if (value !== null) return value;
    }
    return null;
  };

  const passCard = link => link.closest('#rbx-passes-container li') || link.closest('.store-card') || link.parentElement;

  const passCards = () => {
    const cards = new Set();
    for (const link of document.querySelectorAll(PASS_LINK)) {
      const card = passCard(link);
      if (card) cards.add(card);
    }
    return [...cards];
  };

  const priceOf = card => {
    const node = card.querySelector('.text-robux');
    const digits = node ? node.textContent.replace(/\D/g, '') : '';
    return digits ? Number(digits) : null;
  };

  const batched = (selector, handler) => {
    let batch = null;
    Rk.observe(selector, node => {
      if (!batch) {
        batch = [];
        queueMicrotask(() => {
          const nodes = batch;
          batch = null;
          handler(nodes);
        });
      }
      batch.push(node);
    });
  };

  const sortNodes = (nodes, compare) => {
    if (nodes.length < 2) return;
    const sorted = nodes.map((node, index) => ({ node, index })).sort((a, b) => compare(a.node, b.node) || a.index - b.index);
    if (sorted.every((entry, index) => entry.index === index)) return;
    const parent = nodes[0].parentElement;
    const anchor = nodes[nodes.length - 1].nextSibling;
    for (const entry of sorted) parent.insertBefore(entry.node, anchor);
  };

  const blockOf = node => {
    const block = node.parentElement;
    if (!block || block.matches('#game-detail-page, .tab-content, .tab-pane')) return null;
    if (block.querySelector('.game-main-content, .tab-pane, #game-detail-meta-data')) return null;
    return block;
  };

  let refreshLaunches = null;
  const recordLaunch = placeId => {
    if (!Rk.isEnabled('games.launchCounter') || !Rk.isId(placeId)) return;
    const previous = readMap('games.launches')[placeId];
    const before = previous && count(previous.count) ? previous.count : 0;
    remember('games.launches', String(placeId), { count: before + 1, last: Date.now() }, 300, lastOf);
    if (refreshLaunches) refreshLaunches();
  };

  const play = placeId => {
    recordLaunch(placeId);
    Rk.launch.place(placeId);
  };

  const svgNode = (tag, attrs) => {
    const node = document.createElementNS(SVG_NS, tag);
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
    return node;
  };

  const sparkline = values => {
    const width = 160;
    const height = 40;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const step = width / (values.length - 1);
    const y = value => (max === min ? height / 2 : 4 + (1 - (value - min) / (max - min)) * (height - 8));
    const points = values.map((value, index) => `${(index * step).toFixed(1)},${y(value).toFixed(1)}`).join(' ');
    const svg = svgNode('svg', { class: 'rk-games-spark', viewBox: `0 0 ${width} ${height}`, width, height, 'aria-hidden': 'true' });
    svg.append(
      svgNode('polygon', { class: 'rk-games-spark-fill', points: `0,${height} ${points} ${width},${height}` }),
      svgNode('polyline', { class: 'rk-games-spark-line', points })
    );
    return svg;
  };

  const fold = (part, folded) => {
    part.classList.add('rk-games-fold');
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || (!folded && !part.scrollHeight)) {
      part.style.maxHeight = folded ? '0px' : '';
      part.style.opacity = folded ? '0' : '';
      if (!folded) part.classList.remove('rk-games-fold');
      return;
    }
    part.style.maxHeight = `${part.scrollHeight}px`;
    if (folded) {
      part.getBoundingClientRect();
      part.style.maxHeight = '0px';
      part.style.opacity = '0';
      return;
    }
    part.style.opacity = '';
    const done = event => {
      if (event.target !== part || event.propertyName !== 'max-height') return;
      part.removeEventListener('transitionend', done);
      if (part.parentElement && part.parentElement.classList.contains('rk-games-folded')) return;
      part.style.maxHeight = '';
      part.classList.remove('rk-games-fold');
    };
    part.addEventListener('transitionend', done);
  };

  Rk.feature({
    id: 'games.statsPanel',
    category: 'games',
    name: 'Experience insights',
    description: 'Shows exact players, visits, favorites, like ratio, server size and dates in one panel, in place of the Roblox stats list.',
    pages: GAME,
    css: `${sectionsCss}${insightsCss}${nativeCss('gamestats', 'ul:has(> li.game-stat)')}`,
    run: replacing('gamestats', async () => {
      const info = await gameInfo();
      const game = info && info.game;
      if (!game) return null;
      const [favorites, votes] = await Promise.all([favoriteCount(), voteInfo()]);
      const playing = count(game.playing);
      const visits = count(game.visits);
      const maxPlayers = count(game.maxPlayers);
      const created = toTime(game.created);
      const updated = toTime(game.updated);
      const years = created ? Math.round(((Date.now() - created) / (365.25 * DAY)) * 10) / 10 : null;
      addInsight(ui.stats([
        ['Active', fmt.num(playing)],
        ['Visits', fmt.num(visits)],
        ['Favorites', fmt.num(favorites)],
        ['Like ratio', votes ? fmt.percent(votes.up, votes.total) : '-', { title: votes ? voteSummary(votes) : null }],
        ['Max players', maxPlayers ? fmt.num(maxPlayers) : '-'],
        ['Estimated servers', playing !== null && maxPlayers ? fmt.num(Math.ceil(playing / maxPlayers)) : '-', { title: 'Active players divided by server size, rounded up' }],
        ['Created', created ? fmt.date(created) : '-', { title: created ? fmt.dateTime(created) : null }],
        ['Updated', updated ? since(updated) : '-', { title: updated ? fmt.dateTime(updated) : null }],
        ['Favorites per 1K visits', favorites !== null && visits ? fmt.num(Math.round((favorites / visits) * 10000) / 10) : '-', { title: 'Favorites per 1,000 visits' }],
        ['Age', years !== null ? fmt.plural(years, 'year') : '-']
      ]), 1);
    })
  });

  Rk.feature({
    id: 'games.exactStats',
    category: 'games',
    name: 'Exact stat numbers',
    description: 'Replaces the rounded active, favorites and visits numbers with exact ones.',
    pages: GAME,
    async run() {
      const info = await gameInfo();
      if (!info || !info.game) return;
      const values = new Map([['active', count(info.game.playing)], ['visits', count(info.game.visits)], ['favorites', await favoriteCount()]]);
      Rk.observe('.game-stat .text-lead', lead => {
        if (lead.classList.contains('rk-games-exact')) return;
        const previous = lead.previousElementSibling;
        const stat = lead.closest('.game-stat');
        const label = previous && previous.matches('.text-label') ? previous : stat && stat.querySelector('.text-label');
        const value = label ? values.get(label.textContent.trim().toLowerCase()) : null;
        if (value === null || value === undefined) return;
        lead.title = lead.textContent.trim();
        lead.textContent = fmt.num(value);
        lead.classList.add('rk-games-exact');
      });
    }
  });

  Rk.feature({
    id: 'games.likeRatio',
    category: 'games',
    name: 'Like ratio pill',
    description: 'Shows the like percentage next to the title, colored by how well it is rated.',
    pages: GAME,
    css: pillsCss,
    async run() {
      const votes = await voteInfo();
      if (!votes) return;
      addPill(ui.pill(`${fmt.percent(votes.up, votes.total, 0)} liked`, ratioTone(votes.ratio), { title: voteSummary(votes) }), 2);
    }
  });

  Rk.feature({
    id: 'games.voteBar',
    category: 'games',
    name: 'Vote bar',
    description: 'Adds a thin bar showing the share of likes, with exact counts on hover.',
    pages: GAME,
    css: `${headCss}
.rk-games-votes { padding: 4px 0; }
.rk-games-votes .rk-progress { height: 4px; }
`,
    async run() {
      const votes = await voteInfo();
      if (!votes) return;
      const bar = el('div', { class: 'rk-games-votes', role: 'img' }, ui.progress(votes.ratio, { tone: ratioTone(votes.ratio) }));
      ui.tip(bar, voteSummary(votes));
      addHead(bar, 1);
    }
  });

  Rk.feature({
    id: 'games.updatedPill',
    category: 'games',
    name: 'Last updated pill',
    description: 'Shows how long ago the experience was updated next to the title.',
    pages: GAME,
    css: pillsCss,
    async run() {
      const info = await gameInfo();
      const updated = info && info.game ? toTime(info.game.updated) : null;
      if (!updated) return;
      addPill(ui.pill(`Updated ${since(updated)}`, Date.now() - updated < DAY ? 'accent' : 'neutral', { title: fmt.dateTime(updated) }), 4);
    }
  });

  Rk.feature({
    id: 'games.quickActions',
    category: 'games',
    name: 'Quick actions',
    description: 'Adds buttons to copy the place ID, universe ID, link, name and description.',
    pages: GAME,
    css: headCss,
    async run() {
      const info = await gameInfo();
      if (!info) return;
      addTool(ui.button('Copy place ID', { icon: 'copy', onClick: () => ui.copy(String(info.placeId), 'Place ID copied') }), 1);
      if (info.universeId) addTool(ui.button('Copy universe ID', { icon: 'copy', onClick: () => ui.copy(String(info.universeId), 'Universe ID copied') }), 1);
      addTool(ui.button('Copy link', { icon: 'link', onClick: () => ui.copy(`https://www.roblox.com/games/${info.placeId}`, 'Link copied') }), 1);
      const more = ui.button('More', { title: 'More actions' });
      more.append(icon('chevronDown', 16));
      more.setAttribute('aria-haspopup', 'menu');
      more.addEventListener('click', () => {
        const description = text(info.game && info.game.description) || descriptionText();
        ui.menu(more, [
          { label: 'Copy name', icon: 'copy', onClick: () => ui.copy(info.name, 'Name copied') },
          description ? { label: 'Copy description', icon: 'note', onClick: () => ui.copy(description, 'Description copied') } : null
        ]);
      });
      addTool(more, 9);
    }
  });

  Rk.feature({
    id: 'games.studioButton',
    category: 'games',
    name: 'Edit in Studio button',
    description: 'Adds an Edit in Studio button on experiences you own.',
    pages: GAME,
    css: headCss,
    async run() {
      const info = await gameInfo();
      if (!info || !info.universeId || !(await isCreator())) return;
      addTool(ui.button('Edit in Studio', { icon: 'edit', onClick: () => Rk.launch.studio(info.placeId, info.universeId) }), 4);
    }
  });

  Rk.feature({
    id: 'games.creatorHubLinks',
    category: 'games',
    name: 'Creator Hub links',
    description: 'Adds Creator Hub overview and analytics links on experiences you own.',
    pages: GAME,
    css: headCss,
    async run() {
      const info = await gameInfo();
      if (!info || !info.universeId || !(await isCreator())) return;
      const base = `https://create.roblox.com/dashboard/creations/experiences/${info.universeId}`;
      addTool(ui.button('Creator Hub', { icon: 'external', href: `${base}/overview`, target: '_blank', title: 'Open the overview in Creator Hub' }), 5);
      addTool(ui.button('Analytics', { icon: 'chart', href: `${base}/analytics`, target: '_blank', title: 'Open analytics in Creator Hub' }), 5);
    }
  });

  Rk.feature({
    id: 'games.rootPlaceBanner',
    category: 'games',
    name: 'Main experience banner',
    description: 'Shows which experience a place belongs to, with a button to play the main one.',
    pages: GAME,
    css: `${sectionsCss}
.rk-games-root { margin: 0 0 18px; animation: rk-rise var(--rk-med) var(--rk-ease) both; }
.rk-games-banner { display: flex; align-items: center; gap: 10px; }
.rk-games-banner > .rk-icon { color: var(--rk-muted); }
.rk-games-banner-text { flex: 1; min-width: 0; }
@media (prefers-reduced-motion: reduce) { .rk-games-root { animation: none; } }
`,
    async run() {
      const info = await gameInfo();
      if (!info || !info.rootPlaceId || info.rootPlaceId === info.placeId) return;
      const name = text(info.game && info.game.name) || 'the main experience';
      addSection(ui.panel(el('div', { class: 'rk-games-banner' },
        icon('info', 18),
        el('span', { class: 'rk-games-banner-text' }, 'This place is part of ', ui.link(`/games/${info.rootPlaceId}`, name)),
        ui.button('Play', { variant: 'primary', icon: 'play', onClick: () => play(info.rootPlaceId) })
      ), { className: 'rk-games-root' }), 0);
    }
  });

  Rk.feature({
    id: 'games.badgeOwned',
    category: 'games',
    name: 'Owned badges',
    description: 'Dims badges you do not have and shows when you unlocked the others.',
    pages: GAME,
    options: [
      { key: 'hideOwned', label: 'Hide badges you own', type: 'toggle', default: false }
    ],
    css: ctx => `
.badge-row.rk-games-badge-locked { opacity: 0.55; transition: opacity var(--rk-fast) ease; }
.badge-row.rk-games-badge-locked:hover { opacity: 1; }
.rk-games-unlocked { margin-top: 4px; font-family: var(--rk-font); font-size: 12px; color: var(--rk-muted); }
${ctx.option('hideOwned') ? '.badge-row.rk-games-badge-owned { display: none !important; }' : ''}
`,
    run() {
      batched(BADGE_ROW, async rows => {
        const dates = await awardedDates(rows.map(badgeIdOf));
        if (!dates) return;
        for (const row of rows) {
          const id = badgeIdOf(row);
          if (!dates.has(id)) continue;
          const date = dates.get(id);
          row.classList.toggle('rk-games-badge-owned', Boolean(date));
          row.classList.toggle('rk-games-badge-locked', !date);
          if (!date || row.querySelector('.rk-games-unlocked')) continue;
          (row.querySelector('.badge-data-container') || row).append(el('div', { class: 'rk-games-unlocked', title: fmt.dateTime(date) }, `Unlocked ${fmt.date(date)}`));
        }
      });
    }
  });

  Rk.feature({
    id: 'games.badgeProgress',
    category: 'games',
    name: 'Badge progress',
    description: 'Shows how many of the badges you own, with a progress bar.',
    pages: GAME,
    css: `
.rk-games-badge-progress { display: flex; flex-direction: column; gap: 8px; margin: 0 0 12px; animation: rk-rise var(--rk-med) var(--rk-ease) both; }
.rk-games-badge-progress-text { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; font-weight: 600; color: var(--rk-text-strong); }
@media (prefers-reduced-motion: reduce) { .rk-games-badge-progress { animation: none; } }
`,
    async run() {
      const [badges, me] = await Promise.all([universeBadges(), Rk.me()]);
      if (!badges || !me) return;
      const ids = badges.filter(badge => badge.enabled).map(badge => badge.id);
      if (!ids.length) return;
      const dates = await awardedDates(ids);
      if (!dates || dates.size !== ids.length) return;
      const owned = ids.filter(id => dates.get(id)).length;
      Rk.mount('.badge-container .stack-list', ui.panel([
        el('div', { class: 'rk-games-badge-progress-text' },
          el('span', null, `You own ${fmt.num(owned)} of ${fmt.plural(ids.length, 'badge')}`),
          el('span', { class: 'rk-muted' }, fmt.percent(owned, ids.length, 0))
        ),
        ui.progress(owned / ids.length, { tone: owned === ids.length ? 'success' : 'accent' })
      ], { className: 'rk-games-badge-progress' }), { position: 'before' });
    }
  });

  Rk.feature({
    id: 'games.badgeRarity',
    category: 'games',
    name: 'Badge rarity colors',
    description: 'Colors badge rarity so the hardest badges stand out.',
    default: false,
    pages: GAME,
    css: `
.badge-container .rk-games-rarity-danger { color: var(--rk-danger) !important; font-weight: 600; }
.badge-container .rk-games-rarity-warning { color: var(--rk-warning) !important; font-weight: 600; }
.badge-container .rk-games-rarity-accent { color: var(--rk-accent) !important; font-weight: 600; }
.dark-theme .badge-container .rk-games-rarity-accent { color: var(--rk-accent-hover) !important; }
.badge-container .rk-games-rarity-neutral { color: var(--rk-text) !important; }
`,
    run() {
      Rk.observe('.badge-container .badge-stats-info', node => {
        const value = percentOf(node);
        if (value === null) return;
        node.classList.add(`rk-games-rarity-${value < 1 ? 'danger' : value < 5 ? 'warning' : value < 20 ? 'accent' : 'neutral'}`);
      });
    }
  });

  Rk.feature({
    id: 'games.badgeSort',
    category: 'games',
    name: 'Sort badges',
    description: 'Sorts the badge list by rarity or by name.',
    default: false,
    pages: GAME,
    options: [
      { key: 'by', label: 'Sort by', type: 'select', choices: [['rarity', 'Rarest first'], ['name', 'Name']], default: 'rarity' }
    ],
    run(ctx) {
      batched(BADGE_ROW, rows => {
        const byName = ctx.option('by') === 'name';
        const compare = byName
          ? (a, b) => badgeNameOf(a).localeCompare(badgeNameOf(b), undefined, { sensitivity: 'base', numeric: true })
          : (a, b) => (rarityOf(a) ?? Infinity) - (rarityOf(b) ?? Infinity);
        const lists = new Set(rows.map(row => row.parentElement).filter(list => list && list.matches('.stack-list')));
        for (const list of lists) sortNodes([...list.children].filter(child => child.matches('.badge-row')), compare);
      });
    }
  });

  Rk.feature({
    id: 'games.badgeLinks',
    category: 'games',
    name: 'Badge name links',
    description: 'Makes badge names link to their badge pages.',
    pages: GAME,
    css: `
.rk-link.rk-games-badge-link { font: inherit; }
`,
    run() {
      Rk.observe('.badge-container .badge-row .badge-name', name => {
        if (name.querySelector('a')) return;
        const row = name.closest('.badge-row');
        const id = row ? badgeIdOf(row) : null;
        if (!id) return;
        const link = el('a', { class: 'rk-link rk-games-badge-link', href: `/badges/${id}` });
        link.append(...[...name.childNodes].filter(node => !(node.nodeType === 1 && node.classList.contains('rk-pill'))));
        name.prepend(link);
      });
    }
  });

  Rk.feature({
    id: 'games.badgeFullText',
    category: 'games',
    name: 'Full badge descriptions',
    description: 'Shows full badge descriptions instead of cutting them off.',
    default: false,
    pages: GAME,
    css: `
.badge-container .badge-row p.para-overflow { display: block !important; max-height: none !important; overflow: visible !important; white-space: normal !important; text-overflow: clip !important; -webkit-line-clamp: unset !important; }
`
  });

  Rk.feature({
    id: 'games.badgeCount',
    category: 'games',
    name: 'Badge count',
    description: 'Adds the total number of badges to the badges header.',
    pages: GAME,
    css: `
.rk-games-badge-count { color: var(--rk-muted); font-weight: inherit; }
`,
    async run() {
      const badges = await universeBadges();
      if (!badges || !badges.length) return;
      const total = badges.length >= 500 ? '500+' : fmt.num(badges.filter(badge => badge.enabled).length);
      Rk.observe('.badge-container .container-header h2', heading => {
        if (heading.querySelector('.rk-games-badge-count')) return;
        heading.append(el('span', { class: 'rk-games-badge-count' }, ` (${total})`));
      });
    }
  });

  Rk.feature({
    id: 'games.badgeNew',
    category: 'games',
    name: 'New badge tags',
    description: 'Tags badges that were added in the last 7 days.',
    default: false,
    pages: GAME,
    css: `
.rk-games-badge-new { margin-left: 8px; }
`,
    async run() {
      const badges = await universeBadges();
      if (!badges) return;
      const fresh = new Map(badges.filter(badge => badge.created && Date.now() - badge.created < 7 * DAY).map(badge => [badge.id, badge.created]));
      if (!fresh.size) return;
      Rk.observe(BADGE_ROW, row => {
        const name = row.querySelector('.badge-name');
        const id = badgeIdOf(row);
        if (!name || !fresh.has(id) || name.querySelector('.rk-games-badge-new')) return;
        const pill = ui.pill('New', 'accent', { title: `Added ${fmt.date(fresh.get(id))}` });
        pill.classList.add('rk-games-badge-new');
        name.append(pill);
      });
    }
  });

  Rk.feature({
    id: 'games.ownedPasses',
    category: 'games',
    name: 'Owned passes',
    description: 'Marks passes you already own in the store.',
    pages: GAME,
    css: `
.rk-games-pass-owned { margin-top: 6px; }
`,
    async run() {
      const me = await Rk.me();
      if (!me) return;
      const checked = new WeakSet();
      Rk.observe(PASS_LINK, link => {
        const id = Rk.idFrom(link.getAttribute('href'), 'gamepass');
        const card = passCard(link);
        if (!id || !card || checked.has(card)) return;
        checked.add(card);
        safe(Rk.api.get(`https://inventory.roblox.com/v1/users/${me.id}/items/GamePass/${id}/is-owned`, { cache: 60000 })).then(owned => {
          if (owned !== true || card.querySelector('.rk-games-pass-owned')) return;
          const pill = ui.pill('Owned', 'success');
          pill.classList.add('rk-games-pass-owned');
          (card.querySelector('.store-card-caption') || card).append(pill);
        });
      });
    }
  });

  Rk.feature({
    id: 'games.passesTotal',
    category: 'games',
    name: 'Passes total',
    description: 'Shows how many passes there are and what they cost together.',
    pages: GAME,
    css: `
.rk-games-passes-total { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin: 0 0 10px; font-family: var(--rk-font); font-size: 14px; color: var(--rk-text); }
`,
    run() {
      const line = el('div', { class: 'rk-games-passes-total' });
      batched(PASS_LINK, () => {
        const cards = passCards();
        if (!cards.length) {
          line.remove();
          return;
        }
        const total = cards.map(priceOf).filter(price => price !== null).reduce((sum, price) => sum + price, 0);
        line.replaceChildren(`${fmt.plural(cards.length, 'pass', 'passes')}, total`, ui.robux(total));
        const list = cards[0].parentElement;
        if (list && line.nextElementSibling !== list) list.before(line);
      });
    }
  });

  Rk.feature({
    id: 'games.passSort',
    category: 'games',
    name: 'Sort passes by price',
    description: 'Sorts passes from cheapest to most expensive, with off sale passes last.',
    default: false,
    pages: GAME,
    run() {
      batched(PASS_LINK, () => {
        const cards = passCards();
        for (const list of new Set(cards.map(card => card.parentElement).filter(Boolean))) {
          sortNodes(cards.filter(card => card.parentElement === list), (a, b) => (priceOf(a) ?? Infinity) - (priceOf(b) ?? Infinity));
        }
      });
    }
  });

  Rk.feature({
    id: 'games.descriptionLinks',
    category: 'games',
    name: 'Clickable description links',
    description: 'Turns Roblox, YouTube, Twitch and X links in descriptions into real links.',
    default: false,
    pages: GAME,
    run() {
      const linkify = node => {
        const value = node.nodeValue;
        const parts = [];
        let last = 0;
        for (const match of value.matchAll(/https:\/\/[^\s<>"'`]+/g)) {
          const raw = match[0].replace(/[.,!?;:)\]}]+$/, '');
          let url = null;
          try {
            url = new URL(raw);
          } catch {
            continue;
          }
          if (!LINK_HOSTS.test(url.hostname)) continue;
          parts.push(value.slice(last, match.index), ui.link(url.href, raw, { external: true }));
          last = match.index + raw.length;
        }
        if (!parts.length) return;
        parts.push(value.slice(last));
        node.replaceWith(...parts.filter(part => part !== ''));
      };
      Rk.observe('.game-description-container .game-description, pre.game-description', description => {
        if (description.classList.contains('rk-games-linked')) return;
        description.classList.add('rk-games-linked');
        const walker = document.createTreeWalker(description, NodeFilter.SHOW_TEXT);
        const targets = [];
        while (walker.nextNode()) {
          const node = walker.currentNode;
          if (node.nodeValue.includes('https://') && !node.parentElement.closest('a')) targets.push(node);
        }
        for (const node of targets) linkify(node);
      });
    }
  });

  Rk.feature({
    id: 'games.expandDescription',
    category: 'games',
    name: 'Full description',
    description: 'Always shows the whole description without Read more.',
    default: false,
    pages: GAME,
    css: `
.game-description-container .game-description { display: block !important; max-height: none !important; overflow: visible !important; -webkit-line-clamp: unset !important; }
.game-description-container .toggle-content, .game-description-container .read-more-button, .game-description-container [class*="read-more"] { display: none !important; }
`
  });

  Rk.feature({
    id: 'games.noTrailerAutoplay',
    category: 'games',
    name: 'No trailer autoplay',
    description: 'Stops trailers from playing on their own when the page opens.',
    pages: GAME,
    run() {
      Rk.observe('#carousel-game-details', carousel => carousel.setAttribute('data-is-video-autoplayed-on-ready', 'false'));
    }
  });

  Rk.feature({
    id: 'games.downloadIcon',
    category: 'games',
    name: 'Download icon button',
    description: 'Adds a button that downloads the experience icon in full size.',
    default: false,
    pages: GAME,
    css: headCss,
    async run() {
      const info = await gameInfo();
      if (!info || !info.universeId) return;
      const button = ui.button('Download icon', { icon: 'download', onClick: async () => {
        button.disabled = true;
        try {
          const url = await Rk.thumb('GameIcon', info.universeId, '512x512');
          if (!url) {
            ui.toast('The icon is not ready yet, try again in a moment', { tone: 'warning' });
            return;
          }
          const base = info.name.replace(/[^\p{L}\p{N} _-]+/gu, '').trim().replace(/\s+/g, '-').slice(0, 60) || 'experience';
          await Rk.bg('download', { url, filename: `${base}-icon.png` });
          ui.toast('Download started', { tone: 'success' });
        } catch {
          ui.toast('Could not download the icon', { tone: 'danger' });
        } finally {
          button.disabled = false;
        }
      } });
      addTool(button, 3);
    }
  });

  Rk.feature({
    id: 'games.creatorCard',
    category: 'games',
    name: 'Creator card',
    description: 'Shows the creator with their picture, verified status and join date or member count.',
    pages: GAME,
    css: `${sectionsCss}${listCss}`,
    async run() {
      const [info] = await Promise.all([gameInfo(), meLoaded]);
      const creator = creatorOf(info);
      if (!creator) return;
      const group = creator.type === 'Group';
      const details = await safe(Rk.api.get(group ? `https://groups.roblox.com/v1/groups/${creator.id}` : `https://users.roblox.com/v1/users/${creator.id}`, { cache: 60000 }));
      const username = text(details && details.name) || creator.name || `${group ? 'Community' : 'User'} ${creator.id}`;
      const name = group ? username : text(details && details.displayName) || username;
      const members = group && details ? count(details.memberCount) : null;
      const joined = !group && details ? toTime(details.created) : null;
      let sub = group ? 'Community' : 'User';
      if (members !== null) sub = fmt.plural(members, 'member');
      if (joined) sub = name !== username ? `@${username}, joined ${fmt.date(joined)}` : `Joined ${fmt.date(joined)}`;
      const flag = creator.verified || Boolean(details && details.hasVerifiedBadge === true);
      const verified = group ? flag : isVerified(creator.id, flag);
      const image = ui.thumb(group ? Rk.thumb('GroupIcon', creator.id, '150x150') : Rk.thumb('AvatarHeadShot', creator.id, '150x150'), { size: 48, round: !group, alt: '' });
      const href = group ? `/communities/${creator.id}` : `/users/${creator.id}/profile`;
      addSection(ui.section('Creator', el('div', { class: 'rk-games-list' }, entryRow(image, named(ui.link(href, name), verified), sub)), { className: 'rk-games-creator' }), 3);
    }
  });

  Rk.feature({
    id: 'games.moreFromCreator',
    category: 'games',
    name: 'More from this creator',
    description: 'Lists other experiences made by the same creator.',
    pages: GAME,
    css: `${sectionsCss}${listCss}`,
    async run() {
      const [info] = await Promise.all([gameInfo(), meLoaded]);
      const creator = creatorOf(info);
      if (!creator) return;
      const json = await safe(Rk.api.get(`https://games.roblox.com/v2/${creator.type === 'Group' ? 'groups' : 'users'}/${creator.id}/games?accessFilter=Public&limit=50&sortOrder=Desc`, { cache: 60000 }));
      const others = (json && Array.isArray(json.data) ? json.data : [])
        .filter(entry => entry && Rk.isId(entry.id) && Number(entry.id) !== info.universeId && entry.rootPlace && Rk.isId(entry.rootPlace.id))
        .map(entry => ({ universeId: Number(entry.id), placeId: Number(entry.rootPlace.id), name: text(entry.name), visits: count(entry.placeVisits) }))
        .sort((a, b) => (b.visits || 0) - (a.visits || 0))
        .slice(0, 8);
      if (!others.length) return;
      const live = await safe(Rk.api.games(others.map(entry => entry.universeId)));
      const rows = others.map(entry => {
        const game = live ? live.get(entry.universeId) : null;
        const visits = (game && count(game.visits)) || entry.visits;
        const playing = game ? count(game.playing) : null;
        const name = text(game && game.name) || entry.name || `Experience ${entry.placeId}`;
        const sub = playing !== null ? `${fmt.compact(visits)} visits, ${fmt.num(playing)} playing` : `${fmt.compact(visits)} visits`;
        return entryRow(ui.thumb(Rk.thumb('GameIcon', entry.universeId, '50x50'), { size: 50, alt: '' }), ui.link(`/games/${entry.placeId}`, name), sub);
      });
      const verified = creator.type === 'Group' ? creator.verified : isVerified(creator.id, creator.verified);
      const title = creator.name ? ['More from ', creator.name, verified ? ui.verified({ size: 16 }) : null] : 'More from this creator';
      addSection(ui.section(title, el('div', { class: 'rk-games-grid' }, rows), { className: 'rk-games-more' }), 4);
    }
  });

  Rk.feature({
    id: 'games.trackHistory',
    category: 'games',
    name: 'Experience history',
    description: 'Remembers the experiences you view so they show up in your recent list.',
    pages: GAME,
    async run() {
      const info = await gameInfo();
      if (!info || !info.universeId) return;
      const placeId = info.rootPlaceId || info.placeId;
      const list = readList('history.games').filter(entry => entry && Rk.isId(entry.placeId) && Number(entry.placeId) !== placeId);
      list.unshift({ placeId, universeId: info.universeId, name: text(info.game && info.game.name) || info.name, time: Date.now() });
      Rk.store.set('history.games', list.slice(0, 40));
    }
  });

  Rk.feature({
    id: 'games.playHotkey',
    category: 'games',
    name: 'Play with P',
    description: 'Press P on an experience page to start playing.',
    default: false,
    pages: GAME,
    run() {
      Rk.hotkey('p', async () => {
        if (Rk.page().type !== 'game' || !Rk.isEnabled('games.playHotkey')) return;
        const info = await gameInfo();
        if (!info) return;
        ui.toast(`Launching ${info.name}`);
        play(info.placeId);
      });
    }
  });

  Rk.feature({
    id: 'games.pinGames',
    category: 'games',
    name: 'Pin experiences',
    description: 'Adds a pin button that keeps the experience in your pinned list.',
    pages: GAME,
    css: headCss,
    async run() {
      const info = await gameInfo();
      if (!info || !info.universeId) return;
      const placeId = info.rootPlaceId || info.placeId;
      const name = text(info.game && info.game.name) || info.name;
      const matches = entry => Number(entry.placeId) === placeId || Number(entry.universeId) === info.universeId;
      const pins = () => readList('pins.games').filter(entry => entry && Rk.isId(entry.placeId));
      const button = ui.button('Pin', { icon: 'pin', onClick: () => {
        const list = pins();
        if (list.some(matches)) {
          Rk.store.set('pins.games', list.filter(entry => !matches(entry)));
          ui.toast('Experience unpinned');
        } else if (list.length >= 30) {
          ui.toast('You can pin up to 30 experiences', { tone: 'warning' });
        } else {
          list.unshift({ placeId, universeId: info.universeId, name, time: Date.now() });
          Rk.store.set('pins.games', list);
          ui.toast('Experience pinned', { tone: 'success' });
        }
        sync();
      } });
      const sync = () => {
        const pinned = pins().some(matches);
        const label = pinned ? 'Unpin this experience' : 'Pin this experience';
        button.classList.toggle('rk-btn-active', pinned);
        button.querySelector('span').textContent = pinned ? 'Pinned' : 'Pin';
        button.setAttribute('aria-pressed', pinned ? 'true' : 'false');
        button.setAttribute('aria-label', label);
        button.title = label;
      };
      sync();
      addTool(button, 2);
    }
  });

  Rk.feature({
    id: 'games.notes',
    category: 'games',
    name: 'Experience notes',
    description: 'Adds a private notes box to each experience that saves as you type.',
    default: false,
    pages: GAME,
    css: `${sectionsCss}
.rk-input.rk-games-notes-input { display: block; height: auto; min-height: 80px; padding: 10px 12px; line-height: 1.45; resize: vertical; }
.rk-games-notes-status { font-family: var(--rk-font); font-size: 12px; color: var(--rk-muted); opacity: 0; transition: opacity var(--rk-fast) ease; }
.rk-games-notes-status-show { opacity: 1; }
`,
    async run() {
      const info = await gameInfo();
      if (!info) return;
      const key = String(info.placeId);
      const saved = readMap('notes.games')[key];
      const status = el('span', { class: 'rk-games-notes-status', 'aria-live': 'polite' }, 'Saved');
      const area = el('textarea', { class: 'rk-input rk-games-notes-input', rows: 4, maxlength: 2000, placeholder: 'Write a note, only you can see it', 'aria-label': 'Your notes' });
      area.value = typeof saved === 'string' ? saved.slice(0, 2000) : '';
      let timer = 0;
      const save = () => {
        clearTimeout(timer);
        timer = 0;
        const notes = readMap('notes.games');
        const value = area.value.slice(0, 2000);
        if (value.trim() && notes[key] === undefined && Object.keys(notes).length >= 500) {
          status.textContent = 'Too many notes, remove some first';
          status.classList.add('rk-games-notes-status-show');
          return;
        }
        if (value.trim()) notes[key] = value;
        else delete notes[key];
        Rk.store.set('notes.games', notes);
        status.textContent = 'Saved';
        status.classList.add('rk-games-notes-status-show');
      };
      area.addEventListener('input', () => {
        status.classList.remove('rk-games-notes-status-show');
        clearTimeout(timer);
        timer = setTimeout(save, 400);
      });
      area.addEventListener('blur', () => {
        if (timer) save();
      });
      addSection(ui.section('Your notes', area, { className: 'rk-games-notes', actions: status }), 6);
    }
  });

  Rk.feature({
    id: 'games.genrePills',
    category: 'games',
    name: 'Genre and avatar pills',
    description: 'Shows the genre, avatar type and server size next to the title.',
    pages: GAME,
    css: pillsCss,
    async run() {
      const info = await gameInfo();
      const game = info && info.game;
      if (!game) return;
      const genres = [text(game.genre_l1), text(game.genre_l2)].filter(Boolean);
      if (!genres.length && text(game.genre) && text(game.genre) !== 'All') genres.push(text(game.genre));
      for (const genre of new Set(genres)) addPill(ui.pill(genre), 5);
      const avatar = AVATAR_TYPES.get(game.universeAvatarType);
      if (avatar) addPill(ui.pill(avatar, 'neutral', { title: 'Avatar type' }), 6);
      const maxPlayers = count(game.maxPlayers);
      if (maxPlayers) addPill(ui.pill(`${fmt.num(maxPlayers)} per server`), 7);
    }
  });

  Rk.feature({
    id: 'games.universePlaces',
    category: 'games',
    name: 'Places list',
    description: 'Lists every place in the experience with how many people are in each one and a play button.',
    default: false,
    pages: GAME,
    css: `${sectionsCss}${listCss}
.rk-games-places .rk-skeleton { display: inline-block; width: 64px; height: 10px; vertical-align: middle; }
.rk-games-note { margin-top: 8px; padding: 0 8px; font-size: 12px; line-height: 1.4; color: var(--rk-muted); }
`,
    async run() {
      const info = await gameInfo();
      if (!info || !info.universeId) return;
      const json = await safe(Rk.api.get(`https://develop.roblox.com/v1/universes/${info.universeId}/places?isUniverseCreation=false&limit=100`, { cache: 60000 }));
      const places = [];
      for (const entry of (json && Array.isArray(json.data) ? json.data : [])) {
        const id = entry && Rk.isId(entry.id) ? Number(entry.id) : null;
        if (id && !places.some(item => item.id === id)) places.push({ id, name: text(entry.name) || `Place ${id}` });
      }
      if (places.length < 2) return;
      places.sort((a, b) => Number(b.id === info.rootPlaceId) - Number(a.id === info.rootPlaceId));
      const playersIn = async placeId => {
        let total = 0;
        let cursor = '';
        for (let page = 0; page < 3; page++) {
          const result = await Rk.api.get(`https://games.roblox.com/v1/games/${placeId}/servers/Public?limit=100&sortOrder=Desc${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`);
          for (const server of (result && Array.isArray(result.data) ? result.data : [])) total += (server && count(server.playing)) || 0;
          cursor = result && typeof result.nextPageCursor === 'string' ? result.nextPageCursor : '';
          if (!cursor) break;
        }
        return `${fmt.num(total)}${cursor ? '+' : ''} playing`;
      };
      const pending = new Map();
      const queue = [];
      let loading = 0;
      const pump = () => {
        while (loading < 2 && queue.length) {
          const slot = queue.shift();
          loading++;
          playersIn(slot.id).then(label => {
            slot.node.textContent = label;
          }, () => {
            slot.node.textContent = 'Player count unavailable';
          }).finally(() => {
            loading--;
            pump();
          });
        }
      };
      const watcher = new IntersectionObserver(entries => {
        for (const entry of entries) {
          if (!entry.isIntersecting || !pending.has(entry.target)) continue;
          watcher.unobserve(entry.target);
          queue.push(pending.get(entry.target));
          pending.delete(entry.target);
        }
        if (!pending.size) watcher.disconnect();
        pump();
      });
      const rows = places.map(entry => {
        const players = el('span', null, el('span', { class: 'rk-skeleton' }));
        const row = entryRow(
          ui.thumb(Rk.thumb('PlaceIcon', entry.id, '150x150'), { size: 40, alt: '' }),
          ui.link(`/games/${entry.id}`, entry.name),
          players,
          [
            entry.id === info.rootPlaceId ? ui.pill('Start place') : entry.id === info.placeId ? ui.pill('Current', 'accent') : null,
            ui.button('Play', { variant: 'primary', icon: 'play', title: `Play ${entry.name}`, onClick: () => play(entry.id) })
          ]
        );
        pending.set(row, { id: entry.id, node: players });
        return row;
      });
      const visits = info.game ? count(info.game.visits) : null;
      addSection(ui.section('Places in this experience', [
        el('div', { class: 'rk-games-list rk-games-scroll' }, rows),
        el('div', { class: 'rk-games-note' }, 'Roblox no longer shares visits per place.', visits !== null ? ` The whole experience has ${fmt.plural(visits, 'visit')}.` : null)
      ], { className: 'rk-games-places', actions: ui.pill(fmt.num(places.length)) }), 5);
      for (const row of rows) watcher.observe(row);
    }
  });

  Rk.feature({
    id: 'games.paidAccess',
    category: 'games',
    name: 'Paid access price',
    description: 'Shows the price of paid access experiences with an estimate in US dollars.',
    pages: GAME,
    css: pillsCss,
    async run() {
      const info = await gameInfo();
      const price = info && info.game ? count(info.game.price) : null;
      if (!price) return;
      const pill = ui.pill(['Paid access', ui.robux(price)], 'warning');
      ui.tip(pill, `About ${usd.format(price * ROBUX_USD)} USD`);
      addPill(pill, 1);
    }
  });

  Rk.feature({
    id: 'games.hideRecommendations',
    category: 'games',
    name: 'Hide recommendations',
    description: 'Hides recommended experiences on experience pages.',
    default: false,
    pages: GAME,
    css: `
body:has(#game-detail-page) #recommended-games-container, .rk-games-recs-hidden { display: none !important; }
`,
    run() {
      Rk.observe('#game-detail-page h2', heading => {
        if (!/^(recommended|others also played)\b/i.test(heading.textContent.trim())) return;
        const block = blockOf(heading.closest('.container-header') || heading);
        if (block && !block.closest('.rk-section, #game-instances')) block.classList.add('rk-games-recs-hidden');
      });
    }
  });

  Rk.feature({
    id: 'games.yourHistory',
    category: 'games',
    name: 'Your visit history',
    description: 'Shows when you first viewed an experience and how often you came back.',
    default: false,
    pages: GAME,
    css: `${sectionsCss}${insightsCss}`,
    async run() {
      const info = await gameInfo();
      if (!info) return;
      const key = String(info.placeId);
      const previous = readMap('games.viewLog')[key];
      const valid = previous && typeof previous === 'object' && toTime(previous.first) && count(previous.count);
      const now = Date.now();
      const entry = valid ? { first: toTime(previous.first), count: previous.count + 1, last: now } : { first: now, count: 1, last: now };
      remember('games.viewLog', key, entry, 300, lastOf);
      const message = entry.count === 1 ? 'This is your first visit' : `You first viewed this ${fmt.date(entry.first)}, ${fmt.plural(entry.count, 'visit')}`;
      addInsight(el('div', { class: 'rk-games-line', title: valid ? `Last visit ${fmt.dateTime(toTime(previous.last) || entry.first)}` : null }, icon('eye', 14), message), 3);
    }
  });

  Rk.feature({
    id: 'games.badgeIconZoom',
    category: 'games',
    name: 'Badge icon preview',
    description: 'Click a badge icon to see it larger with its description.',
    default: false,
    pages: GAME,
    css: `
.badge-container .badge-image, .badge-container .badge-image a { cursor: zoom-in; }
.rk-games-zoom { display: flex; flex-direction: column; align-items: center; gap: 12px; text-align: center; }
.rk-games-zoom .rk-thumb { border-radius: var(--rk-radius-l); }
.rk-games-zoom-text { margin: 0; color: var(--rk-text); white-space: pre-line; overflow-wrap: anywhere; }
`,
    run() {
      Rk.observe('.badge-container .badge-image', image => {
        image.addEventListener('click', event => {
          if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
          const row = image.closest('.badge-row');
          const id = row ? badgeIdOf(row) : null;
          if (!id) return;
          event.preventDefault();
          const name = badgeNameOf(row) || 'Badge';
          const paragraph = row.querySelector('p.para-overflow');
          const description = paragraph ? paragraph.textContent.trim() : '';
          ui.modal({
            title: name,
            width: 380,
            content: el('div', { class: 'rk-games-zoom' },
              ui.thumb(Rk.thumb('BadgeIcon', id, '150x150'), { size: 300, alt: name }),
              description ? el('p', { class: 'rk-games-zoom-text' }, description) : null
            ),
            actions: [ui.button('Open badge page', { variant: 'secondary', size: 'md', icon: 'external', href: `/badges/${id}` })]
          });
        });
      });
    }
  });

  Rk.feature({
    id: 'games.defaultTab',
    category: 'games',
    name: 'Default tab',
    description: 'Opens your preferred tab when an experience page loads.',
    default: false,
    pages: GAME,
    options: [
      { key: 'tab', label: 'Tab to open', type: 'select', choices: [['about', 'About'], ['servers', 'Servers'], ['store', 'Store']], default: 'servers' }
    ],
    run(ctx) {
      if (/^#!\//.test(location.hash)) return;
      const tab = new Map([['about', '#tab-about'], ['servers', '#tab-game-instances'], ['store', '#tab-store']]).get(ctx.option('tab'));
      if (!tab) return;
      const open = () => Rk.observe(`${tab} a`, link => link.click(), { once: true });
      if (document.readyState === 'complete') open();
      else window.addEventListener('load', open, { once: true });
    }
  });

  Rk.feature({
    id: 'games.stickyPlay',
    category: 'games',
    name: 'Floating play bar',
    description: 'Shows a small play bar at the bottom once the play button scrolls out of view.',
    default: false,
    pages: GAME,
    css: `
.rk-games-sticky { position: fixed; left: 50%; bottom: 16px; z-index: 1050; box-sizing: border-box; display: flex; align-items: center; gap: 10px; width: min(440px, calc(100vw - 32px)); padding: 8px 8px 8px 10px; border: 1px solid var(--rk-border); border-radius: 12px; background: var(--rk-bg); color: var(--rk-text-strong); font-family: var(--rk-font); box-shadow: var(--rk-shadow); visibility: hidden; transform: translate(-50%, calc(100% + 24px)); transition: transform var(--rk-med) var(--rk-ease), visibility 0s linear var(--rk-med); }
.rk-games-sticky.rk-games-sticky-show { visibility: visible; transform: translate(-50%, 0); transition: transform var(--rk-med) var(--rk-ease), visibility 0s; }
.rk-games-sticky-name { flex: 1; min-width: 0; font-size: 15px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
@media (prefers-reduced-motion: reduce) { .rk-games-sticky, .rk-games-sticky.rk-games-sticky-show { transition: none; } }
`,
    async run() {
      const info = await gameInfo();
      if (!info) return;
      const bar = el('div', { class: 'rk-games-sticky', role: 'region', 'aria-label': 'Play bar' },
        info.universeId ? ui.thumb(Rk.thumb('GameIcon', info.universeId, '150x150'), { size: 36, alt: '' }) : null,
        el('span', { class: 'rk-games-sticky-name' }, info.name),
        ui.button('Play', { variant: 'primary', size: 'md', icon: 'play', onClick: () => {
          const native = document.querySelector(PLAY_BUTTON);
          if (native) native.click();
          else play(info.placeId);
        } })
      );
      document.body.append(bar);
      let watched = null;
      const io = new IntersectionObserver(entries => {
        const entry = entries[entries.length - 1];
        const rect = entry && entry.boundingClientRect;
        bar.classList.toggle('rk-games-sticky-show', Boolean(entry && !entry.isIntersecting && rect && rect.bottom < 0));
      });
      Rk.observe(`${PLAY_BUTTON}, .game-calls-to-action`, () => {
        const target = document.querySelector(PLAY_BUTTON) || document.querySelector('.game-calls-to-action');
        if (!target || target === watched) return;
        watched = target;
        io.disconnect();
        io.observe(target);
      });
    }
  });

  Rk.feature({
    id: 'games.gameIcon',
    category: 'games',
    name: 'Icon next to title',
    description: 'Shows the experience icon next to its title.',
    default: false,
    pages: GAME,
    css: `
img.rk-games-title-icon { display: inline-block; width: 44px; height: 44px; margin: 0 12px 0 0; border-radius: 12px; vertical-align: middle; }
`,
    async run() {
      const info = await gameInfo();
      if (!info || !info.universeId) return;
      Rk.mount('h1.game-name', ui.thumb(Rk.thumb('GameIcon', info.universeId, '150x150'), { size: 44, alt: '', className: 'rk-games-title-icon' }), { position: 'prepend' });
    }
  });

  Rk.feature({
    id: 'games.mediaLightbox',
    category: 'games',
    name: 'Media viewer',
    description: 'Click a screenshot to view it large.',
    default: false,
    pages: GAME,
    css: `
#carousel-game-details img { cursor: zoom-in; }
.rk-games-lightbox .rk-modal-body { display: flex; justify-content: center; }
.rk-games-lightbox-image { display: block; max-width: 100%; max-height: calc(100vh - 140px); object-fit: contain; border-radius: var(--rk-radius); }
`,
    async run() {
      const info = await gameInfo();
      Rk.observe('#carousel-game-details', carousel => {
        carousel.addEventListener('click', event => {
          if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
          const image = event.target.closest('img');
          const src = image ? image.currentSrc || image.src : '';
          if (!/^https:\/\//i.test(src)) return;
          event.preventDefault();
          ui.modal({
            title: info ? info.name : 'Media',
            width: 1280,
            className: 'rk-games-lightbox',
            content: el('img', { class: 'rk-games-lightbox-image', src, alt: image.alt || '' })
          });
        });
      });
    }
  });

  Rk.feature({
    id: 'games.friendsPlaying',
    category: 'games',
    name: 'Friends playing',
    description: 'Shows friends who are playing this experience right now, with a join button.',
    pages: GAME,
    css: `${sectionsCss}${listCss}`,
    async run() {
      const [info, me] = await Promise.all([gameInfo(), Rk.me()]);
      if (!info || !me || !info.universeId) return;
      const json = await safe(Rk.api.get(`https://friends.roblox.com/v1/users/${me.id}/friends`, { cache: 60000 }));
      const ids = [...new Set((json && Array.isArray(json.data) ? json.data : []).map(entry => Number(entry && entry.id)).filter(Rk.isId))].slice(0, 200);
      if (!ids.length) return;
      const presence = await safe(Rk.api.presence(ids));
      if (!presence) return;
      const playing = ids.filter(id => {
        const entry = presence.get(id);
        return Boolean(entry && Number(entry.userPresenceType) === 2 && (Number(entry.universeId) === info.universeId || Number(entry.rootPlaceId) === info.rootPlaceId));
      });
      if (!playing.length) return;
      const users = await safe(Rk.api.users(playing));
      const rows = playing.map(id => {
        const user = users ? users.get(id) : null;
        const username = text(user && user.name);
        const display = text(user && user.displayName) || username || `User ${id}`;
        return entryRow(
          ui.thumb(Rk.thumb('AvatarHeadShot', id, '150x150'), { size: 40, round: true, alt: '' }),
          named(ui.link(`/users/${id}/profile`, display), isVerified(id, user && user.hasVerifiedBadge)),
          username && username !== display ? `@${username}` : null,
          ui.button('Join', { variant: 'primary', icon: 'play', title: `Join ${display}`, onClick: () => {
            recordLaunch(info.placeId);
            Rk.launch.follow(id);
          } })
        );
      });
      addSection(ui.section('Friends playing', el('div', { class: 'rk-games-grid' }, rows), { className: 'rk-games-friends', actions: ui.pill(fmt.num(playing.length)) }), 2);
    }
  });

  Rk.feature({
    id: 'games.launchCounter',
    category: 'games',
    name: 'Launch counter',
    description: 'Counts how often you launched an experience and when you last did.',
    default: false,
    pages: GAME,
    css: `${sectionsCss}${insightsCss}`,
    async run() {
      const info = await gameInfo();
      if (!info) return;
      const line = el('div', { class: 'rk-games-line' });
      refreshLaunches = () => {
        const entry = readMap('games.launches')[info.placeId];
        const total = entry && typeof entry === 'object' ? count(entry.count) : null;
        const last = total ? toTime(entry.last) : null;
        line.classList.toggle('rk-hidden', !last);
        if (last) line.replaceChildren(icon('play', 14), `Launched ${fmt.plural(total, 'time')}, last ${since(last)}`);
      };
      refreshLaunches();
      addInsight(line, 4);
      Rk.observe(PLAY_BUTTON, button => button.addEventListener('click', () => recordLaunch(info.placeId)));
    }
  });

  Rk.feature({
    id: 'games.updatedSinceVisit',
    category: 'games',
    name: 'Updated since last visit',
    description: 'Tells you when an experience was updated since you last looked at it.',
    pages: GAME,
    css: pillsCss,
    async run() {
      const info = await gameInfo();
      const updated = info && info.game && toTime(info.game.updated) ? String(info.game.updated) : null;
      if (!updated || !info.universeId) return;
      const previous = toTime(readMap('games.seenUpdated')[info.universeId]);
      remember('games.seenUpdated', String(info.universeId), updated, 300, value => toTime(value) || 0);
      if (!previous || toTime(updated) <= previous) return;
      addPill(ui.pill('Updated since your last visit', 'accent', { title: `Updated ${fmt.dateTime(updated)}` }), 3);
    }
  });

  Rk.feature({
    id: 'games.playerTrend',
    category: 'games',
    name: 'Player trend',
    description: 'Draws a small chart of active players across your visits.',
    default: false,
    pages: GAME,
    css: `${sectionsCss}${insightsCss}
.rk-games-trend { display: flex; align-items: center; gap: 12px; }
.rk-games-spark { flex: none; display: block; overflow: visible; }
.rk-games-spark-line { fill: none; stroke: var(--rk-accent); stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.rk-games-spark-fill { fill: var(--rk-accent-soft); stroke: none; }
.rk-games-trend-text { display: flex; flex-direction: column; gap: 2px; min-width: 0; font-size: 13px; }
.rk-games-trend-title { font-weight: 600; color: var(--rk-text-strong); }
.rk-games-trend-range { font-size: 12px; color: var(--rk-muted); }
`,
    async run() {
      const info = await gameInfo();
      const playing = info && info.game ? count(info.game.playing) : null;
      if (playing === null || !info.universeId) return;
      const stored = readMap('games.playerCounts')[info.universeId];
      let points = (Array.isArray(stored) ? stored : []).filter(point => Array.isArray(point) && toTime(point[0]) && count(point[1]) !== null);
      const latest = points.length ? toTime(points[points.length - 1][0]) : 0;
      if (Date.now() - latest >= HOUR) {
        points = [...points, [Date.now(), playing]].slice(-30);
        remember('games.playerCounts', String(info.universeId), points, 200, value => (Array.isArray(value) && Array.isArray(value[value.length - 1]) && toTime(value[value.length - 1][0])) || 0);
      }
      if (points.length < 2) {
        addInsight(el('div', { class: 'rk-games-line' }, icon('chart', 14), 'Visit again in an hour or later to see the player trend'), 2);
        return;
      }
      const values = points.map(point => point[1]);
      addInsight(el('div', { class: 'rk-games-trend' },
        sparkline(values),
        el('div', { class: 'rk-games-trend-text' },
          el('span', { class: 'rk-games-trend-title' }, `Active players over your last ${fmt.plural(points.length, 'visit')}`),
          el('span', { class: 'rk-games-trend-range' }, `Min ${fmt.num(Math.min(...values))}, max ${fmt.num(Math.max(...values))}`)
        )
      ), 2);
    }
  });

  Rk.feature({
    id: 'games.translateDescription',
    category: 'games',
    name: 'Translate description',
    description: 'Adds a link that opens the description in Google Translate.',
    default: false,
    pages: GAME,
    css: `
.rk-games-translate { margin-top: 8px; font-family: var(--rk-font); font-size: 13px; }
.rk-games-translate .rk-link { display: inline-flex; align-items: center; gap: 4px; }
`,
    async run() {
      const info = await gameInfo();
      const description = (descriptionText() || text(info && info.game && info.game.description)).toWellFormed();
      if (!description) return;
      const base = String(navigator.language || 'en').split('-')[0].toLowerCase();
      const language = /^[a-z]{2,3}$/.test(base) ? base : 'en';
      const href = `https://translate.google.com/?sl=auto&tl=${language}&text=${encodeURIComponent([...description].slice(0, 4000).join(''))}`;
      Rk.mount('.game-description-container', el('div', { class: 'rk-games-translate' },
        el('a', { class: 'rk-link', href, target: '_blank', rel: 'noopener noreferrer' }, icon('globe', 14), 'Translate')
      ), { position: 'append' });
    }
  });

  Rk.feature({
    id: 'games.collapsibleSections',
    category: 'games',
    name: 'Collapsible sections',
    description: 'Lets you fold page sections like badges and passes by clicking their header.',
    default: false,
    pages: GAME,
    css: `
.rk-games-fold-header { cursor: pointer; user-select: none; }
.rk-games-chevron { display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; margin-left: 6px; padding: 0; border: 0; border-radius: var(--rk-radius-s); background: transparent; color: var(--rk-muted); vertical-align: middle; cursor: pointer; transition: transform var(--rk-med) var(--rk-ease), background-color var(--rk-fast) ease, color var(--rk-fast) ease; }
.rk-games-chevron:hover { background: var(--rk-hover); color: var(--rk-text-strong); }
.rk-games-chevron:focus-visible { outline: 2px solid var(--rk-accent); outline-offset: 2px; }
.rk-games-folded > .rk-games-fold-header .rk-games-chevron { transform: rotate(-90deg); }
.rk-games-fold { overflow: hidden !important; transition: max-height var(--rk-med) var(--rk-ease), opacity var(--rk-fast) ease; }
.rk-games-folded > .rk-games-fold { visibility: hidden; transition: max-height var(--rk-med) var(--rk-ease), opacity var(--rk-fast) ease, visibility 0s linear var(--rk-med); }
@media (prefers-reduced-motion: reduce) { .rk-games-chevron, .rk-games-fold, .rk-games-folded > .rk-games-fold { transition: none; } }
`,
    run() {
      Rk.observe('#game-detail-page .container-header', header => {
        const block = blockOf(header);
        if (!block || header.querySelector('.rk-games-chevron') || header.closest('#game-instances, #running-game-instances-container, .rk-section')) return;
        const chevron = el('button', { type: 'button', class: 'rk-games-chevron', 'aria-expanded': 'true', 'aria-label': 'Collapse section' }, icon('chevronDown', 16));
        (header.querySelector('h2, h3') || header).append(chevron);
        header.classList.add('rk-games-fold-header');
        header.addEventListener('click', event => {
          const control = event.target.closest('a, button, input, select, textarea, label');
          if (control && control !== chevron) return;
          const folded = !block.classList.contains('rk-games-folded');
          block.classList.toggle('rk-games-folded', folded);
          chevron.setAttribute('aria-expanded', folded ? 'false' : 'true');
          chevron.setAttribute('aria-label', folded ? 'Expand section' : 'Collapse section');
          for (const part of block.children) {
            if (part !== header) fold(part, folded);
          }
        });
      });
    }
  });
})();
