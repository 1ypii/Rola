(() => {
  const { el, ui, fmt, icon } = Rk;

  const PROFILE = ['profile'];
  const FRIENDS = ['friends'];
  const GROUP = ['group'];
  const CARD = '.avatar-card, .list-item.avatar-card, li:has(.avatar-card-link)';
  const DAY = 86400000;

  const headerCss = `
.user-profile-header:has(> .rk-profile-pills, > .rk-profile-toolbar) { flex-wrap: wrap !important; }
.rk-profile-pills, .rk-profile-toolbar { width: 100%; }
.rk-profile-pills { margin-top: 8px; }
.rk-profile-toolbar { margin-top: 12px; }
.rk-profile-pills:not(:has(> :not(.rk-hidden))), .rk-profile-toolbar:not(:has(> :not(.rk-hidden))) { display: none !important; }
.rk-profile-pill-link { display: inline-flex; text-decoration: none !important; transition: opacity var(--rk-fast) ease; }
.rk-profile-pill-link:hover { opacity: 0.8; }
`;

  const statusCss = `
.rk-profile-status { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 12px; margin-top: 6px; font-family: var(--rk-font); font-size: 14px; font-weight: 600; line-height: 22px; }
.rk-profile-state { display: inline-flex; align-items: center; gap: 5px; text-decoration: none !important; }
a.rk-profile-state { transition: opacity var(--rk-fast) ease; }
a.rk-profile-state:hover { opacity: 0.8; }
.rk-profile-state-online { color: var(--rk-accent); }
.dark-theme .rk-profile-state-online { color: #9db8ff; }
.rk-profile-state-offline { color: var(--rk-muted); }
.rk-profile-state-game, .rk-profile-state-public { color: var(--rk-success); }
.rk-profile-state-studio { color: var(--rk-warning); }
.rk-profile-state-private { color: var(--rk-danger); }
.rk-profile-state svg { flex: none; fill: currentColor; }
.rk-profile-status .rk-btn.rk-btn-sm { height: 22px; padding: 0 8px; font-size: 12px; }
`;

  const copyableCss = `
.rk-profile-copyable { display: inline-flex; align-items: center; gap: 2px; max-width: 100%; }
.rk-profile-copyable .rk-btn.rk-btn-icon { width: 24px; height: 24px; }
.rk-profile-named { display: inline-flex; align-items: center; max-width: 100%; min-width: 0; }
.rk-profile-named > :first-child { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
`;

  const chipsCss = `
.rk-profile-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.rk-profile-chip { display: inline-flex; align-items: center; gap: 8px; min-height: 28px; padding: 0 12px; border: 0; border-radius: 999px; background: var(--rk-shift); color: var(--rk-text-strong); font-family: var(--rk-font); font-size: 13px; font-weight: 600; transition: background-color var(--rk-fast) ease, transform var(--rk-fast) var(--rk-ease); }
button.rk-profile-chip { cursor: pointer; }
button.rk-profile-chip:hover { background: var(--rk-press); }
button.rk-profile-chip:active { transform: scale(0.97); }
`;

  const tilesCss = `
.rk-profile-tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(96px, 1fr)); gap: 4px; }
.rk-profile-tile { display: flex; flex-direction: column; align-items: center; gap: 6px; min-width: 0; padding: 8px 4px; border-radius: var(--rk-radius); color: var(--rk-text-strong) !important; text-decoration: none !important; transition: background-color var(--rk-fast) ease; }
.rk-profile-tile:hover { background: var(--rk-hover); }
.rk-profile-tile-label { display: flex; align-items: center; justify-content: center; max-width: 100%; min-width: 0; }
.rk-profile-tile-name { min-width: 0; max-width: 100%; font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rk-profile-face { position: relative; display: block; }
`;

  const listCss = `
.rk-profile-list { display: flex; flex-direction: column; }
.rk-profile-rowtext { display: flex; flex-direction: column; min-width: 0; }
.rk-profile-rowtext > * { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rk-profile-rowtext > .rk-profile-title { display: flex; align-items: center; min-width: 0; }
.rk-profile-title > .rk-link { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
.rk-profile-sub { font-size: 12px; color: var(--rk-muted); }
.rk-profile-list .rk-row-side { font-size: 13px; }
`;

  const friendsCss = `
.rk-friends-bar { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; margin: 0 0 12px; font-family: var(--rk-font); color: var(--rk-text); }
.rk-friends-bar:empty { display: none; }
.rk-friends-bar > .rk-section, .rk-friends-bar > .rk-friends-summary { flex: 1 1 100%; margin: 0; }
.rk-friends-summary { font-size: 14px; }
`;

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

  const safe = promise => Promise.resolve(promise).catch(() => null);

  let myId = null;
  const meLoaded = Rk.me().then(me => {
    myId = me ? me.id : null;
  });
  const isVerified = (id, flag) => flag === true || (myId !== null && Number(id) === myId && Rk.isEnabled('profiles.fakeVerified'));
  const mark = (verified, size = 14) => (verified ? ui.verified({ size }) : null);

  const toTime = value => {
    const time = new Date(value).getTime();
    return Number.isFinite(time) && time > 0 ? time : null;
  };

  const accountAge = created => {
    const start = toTime(created);
    if (!start || start > Date.now()) return null;
    const from = new Date(start);
    const now = new Date();
    let years = now.getFullYear() - from.getFullYear();
    const anniversary = new Date(start);
    anniversary.setFullYear(from.getFullYear() + years);
    if (anniversary > now) {
      years -= 1;
      anniversary.setFullYear(from.getFullYear() + years);
    }
    return { years, days: Math.floor((now - anniversary) / DAY), total: Math.floor((now - from) / DAY) };
  };

  const place = (parent, node, order) => {
    node.dataset.rkOrder = String(order);
    const next = [...parent.children].find(child => child !== node && Number(child.dataset.rkOrder) > order);
    if (next) parent.insertBefore(node, next);
    else parent.append(node);
    return node;
  };

  const profileId = () => {
    const page = Rk.page();
    return page.type === 'profile' && Rk.isId(page.id) ? page.id : null;
  };

  const groupId = () => {
    const page = Rk.page();
    return page.type === 'group' && Rk.isId(page.id) ? page.id : null;
  };

  const ownProfile = async () => {
    const me = await Rk.me();
    return Boolean(me && me.id === profileId());
  };

  const ownFriendsPage = async () => {
    const me = await Rk.me();
    const page = Rk.page();
    return Boolean(me && page.type === 'friends' && (page.id === null || page.id === me.id));
  };

  const profileUser = () => {
    const id = profileId();
    if (!id) return Promise.resolve(null);
    return cached(`user:${id}`, async () => {
      const user = await Rk.api.get(`https://users.roblox.com/v1/users/${id}`);
      return user && typeof user === 'object' && typeof user.name === 'string' && user.name ? user : null;
    });
  };

  const friendIdsOf = userId => cached(`friends:${userId}`, async () => {
    const json = await Rk.api.get(`https://friends.roblox.com/v1/users/${userId}/friends`);
    return json && Array.isArray(json.data) ? [...new Set(json.data.map(entry => Number(entry && entry.id)).filter(Rk.isId))] : [];
  });

  const myFriendIds = async () => {
    const me = await Rk.me();
    return me ? friendIdsOf(me.id) : [];
  };

  const groupsOf = userId => cached(`groups:${userId}`, async () => {
    const json = await Rk.api.get(`https://groups.roblox.com/v2/users/${userId}/groups/roles`);
    if (!json || !Array.isArray(json.data)) return [];
    return json.data.filter(entry => entry && entry.group && Rk.isId(entry.group.id) && entry.role && typeof entry.role === 'object').map(entry => ({
      id: Number(entry.group.id),
      name: typeof entry.group.name === 'string' && entry.group.name ? entry.group.name : `Community ${entry.group.id}`,
      verified: entry.group.hasVerifiedBadge === true,
      members: Number(entry.group.memberCount),
      role: typeof entry.role.name === 'string' && entry.role.name ? entry.role.name : 'Member',
      rank: Number(entry.role.rank) || 0
    }));
  });

  const pastNames = () => {
    const id = profileId();
    if (!id) return Promise.resolve(null);
    return cached(`names:${id}`, async () => {
      const [list, user] = await Promise.all([Rk.api.paged(`https://users.roblox.com/v1/users/${id}/username-history?sortOrder=Desc`, { max: 200, limit: 100 }), profileUser()]);
      const current = user ? user.name.toLowerCase() : '';
      const names = list.map(entry => (entry && typeof entry.name === 'string' ? entry.name.trim() : '')).filter(name => name && name.toLowerCase() !== current);
      return [...new Set(names)];
    });
  };

  const wornItems = userId => cached(`worn:${userId}`, async () => {
    const [json, avatar] = await Promise.all([
      Rk.api.get(`https://avatar.roblox.com/v1/users/${userId}/currently-wearing`),
      safe(Rk.api.get(`https://avatar.roblox.com/v1/users/${userId}/avatar`))
    ]);
    const ids = json && Array.isArray(json.assetIds) ? [...new Set(json.assetIds.map(Number).filter(Rk.isId))].slice(0, 100) : [];
    const names = new Map((avatar && Array.isArray(avatar.assets) ? avatar.assets : []).filter(asset => asset && Rk.isId(asset.id) && typeof asset.name === 'string').map(asset => [Number(asset.id), asset.name]));
    const details = new Map();
    if (ids.length) {
      const result = await safe(Rk.api.post('https://catalog.roblox.com/v1/catalog/items/details', { items: ids.map(id => ({ itemType: 'Asset', id })) }));
      for (const item of (result && Array.isArray(result.data) ? result.data : [])) {
        if (!item || !Rk.isId(item.id)) continue;
        const offSale = item.isOffSale === true || item.priceStatus === 'Off Sale' || typeof item.price !== 'number';
        const resale = [item.lowestResalePrice, item.lowestPrice].find(value => typeof value === 'number' && value > 0);
        details.set(Number(item.id), { ...item, rkName: item.name, rkSale: offSale ? null : item.price, rkResale: offSale && item.hasResellers !== false && resale ? resale : null });
      }
      const missing = ids.filter(id => !details.has(id));
      for (let index = 0; index < missing.length; index += 4) {
        await Promise.all(missing.slice(index, index + 4).map(async id => {
          const asset = await safe(Rk.api.get(`https://economy.roblox.com/v2/assets/${id}/details`, { cache: 600000 }));
          if (!asset || typeof asset.Name !== 'string') return;
          const collectible = asset.CollectiblesItemDetails && typeof asset.CollectiblesItemDetails === 'object' ? asset.CollectiblesItemDetails : null;
          const resale = collectible && typeof collectible.CollectibleLowestResalePrice === 'number' && collectible.CollectibleLowestResalePrice > 0 ? collectible.CollectibleLowestResalePrice : null;
          const sale = asset.IsForSale && typeof asset.PriceInRobux === 'number' ? asset.PriceInRobux : null;
          details.set(id, { id, name: asset.Name, price: sale, priceStatus: asset.IsForSale ? null : 'Off Sale', rkName: asset.Name, rkSale: sale, rkResale: sale === null ? resale : null });
        }));
      }
    }
    for (const id of ids) {
      const item = details.get(id);
      if (item && item.rkName) continue;
      if (names.has(id)) details.set(id, { ...(item || { id, price: null, priceStatus: 'Off Sale' }), rkName: names.get(id) });
    }
    return { ids, details };
  });

  const ownText = node => [...node.childNodes].filter(child => child.nodeType === 3).map(child => child.nodeValue).join('').trim();

  let nativeWearing = null;
  const wearingWatchers = new Set();
  const onNativeWearing = callback => {
    if (!wearingWatchers.size) {
      Rk.observe('h2, h3, h4, div, span', node => {
        if (ownText(node).toLowerCase() !== 'currently wearing' || node.closest('.rk-section, .rk-modal')) return;
        nativeWearing = node;
        for (const watcher of wearingWatchers) watcher(node);
      });
    }
    wearingWatchers.add(callback);
    if (nativeWearing && nativeWearing.isConnected) callback(nativeWearing);
  };

  const presenceNow = new Map();
  const presenceAsked = new Map();
  const presenceOf = async ids => {
    const wanted = [...new Set(ids)].filter(Rk.isId);
    const missing = wanted.filter(id => !presenceAsked.has(id));
    if (missing.length) {
      const batch = safe(Rk.api.presence(missing)).then(map => {
        for (const id of missing) {
          const entry = map && map.get(id);
          presenceNow.set(id, entry && typeof entry === 'object' ? entry : null);
        }
      });
      for (const id of missing) presenceAsked.set(id, batch);
    }
    await Promise.all(wanted.map(id => presenceAsked.get(id)));
    return presenceNow;
  };

  const presenceType = entry => (entry ? Number(entry.userPresenceType) || 0 : 0);

  const hosts = new Map();
  const addSection = (kind, section, order, { replace, after } = {}) => {
    if (!hosts.has(kind)) {
      const host = el('div', { class: `rk-${kind}-sections` });
      hosts.set(kind, host);
      if (kind === 'profile') {
        Rk.observe('.profile-platform-container', container => container.append(host));
        const fallback = () => {
          if (!host.isConnected) Rk.mount('#content', host, { position: 'append' });
        };
        if (document.readyState === 'complete') fallback();
        else window.addEventListener('load', fallback, { once: true });
      } else {
        Rk.mount('#content', host, { position: 'append' });
      }
    }
    place(hosts.get(kind), section, order);
    if (replace) Rk.observe(replace, native => {
      native.classList.add('rk-replaced');
      native.before(section);
    });
    if (after) Rk.observe(after, anchor => anchor.after(section));
    return section;
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

  const headerRow = (header, kind, order) => header.querySelector(`:scope > .rk-profile-${kind}`) || place(header, el('div', { class: `rk-profile-${kind} rk-inline` }), order);
  const addPill = (node, order) => Rk.observe('.user-profile-header', header => place(headerRow(header, 'pills', 1), node, order));
  const addStatus = (node, order) => Rk.observe('.user-profile-header .stylistic-alts-username', name => {
    const line = name.parentElement;
    const row = line.parentElement.querySelector(':scope > .rk-profile-status') || el('div', { class: 'rk-profile-status' });
    if (row.previousElementSibling !== line) line.after(row);
    place(row, node, order);
  });
  const addTool = (node, order) => Rk.observe('.user-profile-header', header => place(headerRow(header, 'toolbar', 3), node, order));

  let statsSection = null;
  const statsGrid = () => {
    if (!statsSection || !statsSection.parentElement) statsSection = addSection('profile', ui.section('Stats', ui.stats([]), { className: 'rk-profile-stats' }), 2, { after: ':is(.profile-tabs + .profile-tab-content, .profile-content) > :first-child:not(.rk-section)' });
    return statsSection.querySelector('.rk-stats');
  };

  const pillLink = (href, pill, title) => el('a', { class: 'rk-profile-pill-link', href, title }, pill);

  const tile = (href, image, name, badge) => el('a', { class: 'rk-profile-tile', href, title: name }, image, el('span', { class: 'rk-profile-tile-label' }, el('span', { class: 'rk-profile-tile-name' }, name), badge));

  const entryRow = (image, href, name, sub, side, badge) => ui.row([image, el('div', { class: 'rk-profile-rowtext' }, el('span', { class: 'rk-profile-title' }, ui.link(href, name), badge), sub ? el('span', { class: 'rk-profile-sub' }, sub) : null)], side);

  const collapsible = (rows, limit) => {
    const extra = rows.slice(limit);
    let expanded = false;
    const more = extra.length ? ui.button('Show all', { variant: 'ghost', onClick: () => {
      expanded = !expanded;
      for (const row of extra) row.classList.toggle('rk-hidden', !expanded);
      more.querySelector('span').textContent = expanded ? 'Show less' : 'Show all';
    } }) : null;
    for (const row of extra) row.classList.add('rk-hidden');
    return [el('div', { class: 'rk-profile-list' }, rows), more];
  };

  const userIdNear = node => {
    const link = node.closest('a[href*="/users/"]') || (node.closest('.avatar-card-container, .avatar-card, .friends-carousel-tile, li') || node.parentElement || node).querySelector('a[href*="/users/"]');
    return link ? Rk.idFrom(link.getAttribute('href'), 'user') : null;
  };

  const singleCard = card => !card.querySelector(CARD);
  const friendCards = () => [...document.querySelectorAll(CARD)].filter(singleCard);

  let friendsBar = null;
  const friendsHost = () => {
    if (friendsBar) return friendsBar;
    friendsBar = el('div', { class: 'rk-friends-bar' });
    Rk.observe(CARD, card => {
      if (friendsBar.isConnected) return;
      const list = card.closest('ul, ol') || card.parentElement;
      if (list && list.parentElement) list.before(friendsBar);
    });
    return friendsBar;
  };

  const onCardBatch = handler => {
    let batch = null;
    Rk.observe(CARD, card => {
      if (!singleCard(card)) return;
      if (!batch) {
        batch = [];
        queueMicrotask(() => {
          const cards = batch;
          batch = null;
          handler(cards);
        });
      }
      batch.push(card);
    });
  };

  let shownQueued = false;
  const updateShown = () => {
    if (shownQueued) return;
    shownQueued = true;
    queueMicrotask(() => {
      shownQueued = false;
      const count = document.querySelector('.rk-friends-count');
      if (!count) return;
      const visible = friendCards().filter(card => !card.hasAttribute('data-rk-search-out') && !card.hasAttribute('data-rk-filter-out')).length;
      count.textContent = `${fmt.num(visible)} shown`;
    });
  };

  Rk.feature({
    id: 'profiles.infoCard',
    category: 'profiles',
    name: 'Account card',
    description: 'Shows the user ID, join date and account age under the profile buttons.',
    pages: PROFILE,
    css: `${copyableCss}
.rk-profile-account { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 24px; width: 100%; }
.rk-profile-account .rk-stats { display: flex; flex-wrap: wrap; gap: 8px 24px; }
.rk-profile-account .rk-stat { padding: 0; background: transparent; }
.rk-profile-account-extra:not(:empty) { font-size: 13px; }
`,
    async run() {
      const id = profileId();
      const user = id ? await profileUser() : null;
      if (!user) return;
      await meLoaded;
      const age = accountAge(user.created);
      const joined = toTime(user.created);
      const row = el('div', { class: 'rk-profile-account' },
        ui.stats([
          ['User ID', el('span', { class: 'rk-profile-copyable' }, String(id), ui.button('', { variant: 'ghost', icon: 'copy', title: 'Copy user ID', onClick: () => ui.copy(String(id), 'User ID copied') }))],
          ['Joined', joined ? new Intl.DateTimeFormat(undefined, { dateStyle: 'long' }).format(joined) : '-', { title: fmt.dateTime(user.created) }],
          ['Account age', age ? (age.years ? `${fmt.num(age.years)}y ${fmt.num(age.days)}d` : fmt.plural(age.days, 'day')) : '-', age ? { title: `${fmt.plural(age.years, 'year')}, ${fmt.plural(age.days, 'day')}` } : undefined]
        ]),
        user.isBanned === true ? ui.pill('Banned', 'danger') : null,
        el('div', { class: 'rk-profile-account-extra rk-inline' })
      );
      Rk.observe('.user-profile-header', header => place(header, row, 4));
    }
  });

  Rk.feature({
    id: 'profiles.agePill',
    category: 'profiles',
    name: 'Account age pill',
    description: 'Adds a pill with the account age next to the name.',
    default: false,
    pages: PROFILE,
    css: headerCss,
    async run() {
      const user = await profileUser();
      const age = user ? accountAge(user.created) : null;
      if (!age) return;
      const text = age.years ? `${fmt.num(age.years)} year old account` : `${fmt.num(age.total)} day old account`;
      addPill(ui.pill(text, 'neutral', { title: `Joined ${fmt.date(user.created)}` }), 6);
    }
  });

  Rk.feature({
    id: 'profiles.pastNames',
    category: 'profiles',
    name: 'Past usernames',
    description: 'Lists previous usernames on profiles, click one to copy it.',
    pages: PROFILE,
    css: chipsCss,
    async run() {
      const names = await pastNames();
      if (!names || !names.length) return;
      const chips = names.map(name => el('button', { type: 'button', class: 'rk-profile-chip', title: 'Click to copy', onclick: () => ui.copy(name, `Copied ${name}`) }, name));
      addSection('profile', ui.section('Past usernames', el('div', { class: 'rk-profile-chips' }, chips), { className: 'rk-profile-names', actions: ui.pill(fmt.num(names.length)) }), 6);
    }
  });

  Rk.feature({
    id: 'profiles.mutualFriends',
    category: 'profiles',
    name: 'Mutual friends',
    description: 'Shows the friends you have in common with other users.',
    default: false,
    pages: PROFILE,
    css: `${tilesCss}${nativeCss('friends', '.react-friends-carousel-container, .friends-carousel-0-friends')}`,
    run: replacing('friends', async () => {
      const id = profileId();
      const me = await Rk.me();
      if (!id || !me || me.id === id) return;
      const [mine, theirs] = await Promise.all([myFriendIds(), friendIdsOf(id)]);
      if (!mine || !theirs) return;
      const set = new Set(mine);
      const shared = theirs.filter(friendId => set.has(friendId));
      if (!shared.length) return;
      const shown = shared.slice(0, 24);
      const users = await safe(Rk.api.users(shown));
      const tiles = shown.map(friendId => {
        const user = users && users.get(friendId);
        return tile(`/users/${friendId}/profile`, ui.thumb(Rk.thumb('AvatarHeadShot', friendId, '150x150'), { size: 64, round: true }), user ? String(user.displayName || user.name) : `User ${friendId}`, mark(isVerified(friendId, user && user.hasVerifiedBadge)));
      });
      return addSection('profile', ui.section('Mutual friends', el('div', { class: 'rk-profile-tiles' }, tiles), { className: 'rk-profile-mutuals', actions: ui.pill(fmt.num(shared.length)) }), 4, { replace: '.react-friends-carousel-container, .friends-carousel-0-friends' });
    })
  });

  Rk.feature({
    id: 'profiles.presence',
    category: 'profiles',
    name: 'Presence pill',
    description: 'Shows if the user is online, in Studio or in game, with a join button.',
    pages: PROFILE,
    css: statusCss,
    async run() {
      const id = profileId();
      if (!id) return;
      const entry = (await presenceOf([id])).get(id);
      if (!entry) return;
      const type = presenceType(entry);
      const status = (state, ...children) => el('span', { class: `rk-profile-state rk-profile-state-${state}` }, ...children);
      if (type === 2) {
        const placeId = Rk.isId(entry.rootPlaceId) ? Number(entry.rootPlaceId) : Rk.isId(entry.placeId) ? Number(entry.placeId) : null;
        const game = typeof entry.lastLocation === 'string' ? entry.lastLocation.trim() : '';
        const label = game ? `Playing ${game}` : 'In game';
        const own = await ownProfile();
        addStatus(el('span', { class: 'rk-inline' },
          placeId ? el('a', { class: 'rk-profile-state rk-profile-state-game', href: `/games/${placeId}` }, label) : status('game', label),
          own || !placeId ? null : ui.button('Join', { variant: 'primary', icon: 'play', onClick: () => Rk.launch.follow(id) })
        ), 1);
      } else if (type === 1) {
        addStatus(status('online', 'Online'), 1);
      } else if (type === 3) {
        const logo = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        logo.setAttribute('viewBox', '157 157 710 710');
        logo.setAttribute('width', '14');
        logo.setAttribute('height', '14');
        logo.setAttribute('aria-hidden', 'true');
        const shape = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        shape.setAttribute('fill-rule', 'evenodd');
        shape.setAttribute('d', 'M227.807 452.65 307.063 157 867 307.065l-54.062 201.63-358.233-96.003-25.195 93.947zm-16.745 62.581 358.233 96.004 25.195-93.947 201.703 54.062L716.937 867 157 716.935z');
        logo.append(shape);
        addStatus(status('studio', logo, 'In Studio'), 1);
      } else {
        const seen = toTime(entry.lastOnline);
        if (seen) addStatus(el('span', { class: 'rk-profile-state rk-profile-state-offline', title: fmt.dateTime(seen) }, `Last online ${fmt.ago(seen)}`), 1);
      }
    }
  });

  Rk.feature({
    id: 'profiles.quickActions',
    category: 'profiles',
    name: 'Profile actions',
    description: 'Adds buttons to copy the ID, link or username and to open inventory, favorites and friends.',
    pages: PROFILE,
    css: headerCss,
    run() {
      const id = profileId();
      if (!id) return;
      const copyName = async () => {
        const user = await profileUser();
        if (user) ui.copy(user.name, 'Username copied');
        else ui.toast('Could not load the username', { tone: 'danger' });
      };
      [
        ui.button('Copy ID', { icon: 'copy', onClick: () => ui.copy(String(id), 'User ID copied') }),
        ui.button('Copy profile link', { icon: 'link', onClick: () => ui.copy(`https://www.roblox.com/users/${id}/profile`, 'Profile link copied') }),
        ui.button('Copy username', { icon: 'user', onClick: copyName }),
        ui.button('Inventory', { icon: 'grid', href: `/users/${id}/inventory` }),
        ui.button('Favorites', { icon: 'heart', href: `/users/${id}/favorites` }),
        ui.button('Friends', { icon: 'users', href: `/users/${id}/friends` })
      ].forEach((button, index) => addTool(button, index + 1));
    }
  });

  Rk.feature({
    id: 'profiles.notes',
    category: 'profiles',
    name: 'Profile notes',
    description: 'Lets you keep private notes on any profile, saved as you type.',
    default: false,
    pages: PROFILE,
    css: `
textarea.rk-input.rk-profile-note { display: block; height: auto; min-height: 96px; padding: 10px 12px; resize: vertical; line-height: 1.45; }
.rk-profile-note-status { font-size: 12px; }
`,
    run() {
      const id = profileId();
      if (!id) return;
      const read = () => {
        const map = Rk.store.get('notes.users', {});
        return map && typeof map === 'object' && !Array.isArray(map) ? map : {};
      };
      const status = el('span', { class: 'rk-muted rk-profile-note-status' });
      const field = el('textarea', { class: 'rk-input rk-profile-note', rows: 4, maxlength: 2000, placeholder: 'Only you can see these notes', 'aria-label': 'Your notes' });
      const current = read()[id];
      field.value = typeof current === 'string' ? current.slice(0, 2000) : '';
      let timer = 0;
      const save = () => {
        clearTimeout(timer);
        timer = 0;
        const text = field.value.slice(0, 2000);
        const map = { ...read() };
        if (text === (typeof map[id] === 'string' ? map[id] : '')) return;
        if (text.trim()) map[id] = text;
        else delete map[id];
        Rk.store.set('notes.users', map);
        status.textContent = 'Saved';
      };
      field.addEventListener('input', () => {
        status.textContent = '';
        clearTimeout(timer);
        timer = setTimeout(save, 500);
      });
      field.addEventListener('blur', save);
      window.addEventListener('pagehide', save);
      addSection('profile', ui.section('Your notes', field, { className: 'rk-profile-notes', actions: status }), 3);
    }
  });

  Rk.feature({
    id: 'profiles.nicknames',
    category: 'profiles',
    name: 'Nicknames',
    description: 'Lets you set private nicknames that replace the display names of people on profiles and friend lists. Hover the name to see the real one.',
    default: false,
    pages: ['profile', 'friends', 'home'],
    css: headerCss,
    async run(ctx) {
      const nicknames = () => {
        const map = Rk.store.get('nicknames', {});
        return map && typeof map === 'object' && !Array.isArray(map) ? map : {};
      };
      const nicknameOf = userId => {
        const value = nicknames()[userId];
        return typeof value === 'string' ? value.trim().slice(0, 40) : '';
      };
      const nameText = node => document.createTreeWalker(node, NodeFilter.SHOW_TEXT, { acceptNode: text => (text.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP) }).nextNode();
      const tracked = new Map();
      const apply = (node, userId) => {
        const text = nameText(node);
        if (!text) return;
        const nick = Rk.isEnabled(ctx.id) && userId ? nicknameOf(userId) : '';
        const real = node.dataset.rkRealName;
        if (nick) {
          const current = text.nodeValue.trim();
          if (current !== node.dataset.rkNick) node.dataset.rkRealName = current;
          if (current !== nick) text.nodeValue = nick;
          node.dataset.rkNick = nick;
          if (node.title !== node.dataset.rkRealName) node.title = node.dataset.rkRealName;
          return;
        }
        if (real === undefined) return;
        if (text.nodeValue.trim() === node.dataset.rkNick) text.nodeValue = real;
        delete node.dataset.rkRealName;
        delete node.dataset.rkNick;
        node.removeAttribute('title');
      };
      const track = (node, userId) => {
        if (tracked.has(node)) return;
        tracked.set(node, userId);
        apply(node, userId);
        new MutationObserver(() => apply(node, tracked.get(node))).observe(node, { childList: true, subtree: true, characterData: true });
      };
      const refresh = () => {
        for (const [node, userId] of tracked) {
          if (node.isConnected) apply(node, userId);
          else tracked.delete(node);
        }
      };
      Rk.onSettings(refresh);
      Rk.observe('.avatar-name, .friends-carousel-display-name, .friends-carousel-tile-name', name => {
        if (name.querySelector('.avatar-name, .friends-carousel-display-name')) return;
        track(name, userIdNear(name));
      });
      const id = profileId();
      if (!id || await ownProfile()) return;
      Rk.observe('#profile-header-title-container-name', name => track(name, id));
      addTool(ui.button('Set nickname', { icon: 'edit', onClick: async () => {
        const value = await ui.prompt('Only you can see it. It replaces their display name for you. Leave it empty to remove it.', { title: 'Set nickname', placeholder: 'Nickname', value: nicknameOf(id), maxLength: 40 });
        if (value === null) return;
        const text = value.trim().slice(0, 40);
        if (text === nicknameOf(id)) return;
        const map = { ...nicknames() };
        if (text) map[id] = text;
        else delete map[id];
        Rk.store.set('nicknames', map);
        refresh();
        ui.toast(text ? 'Nickname saved' : 'Nickname removed', { tone: 'success' });
      } }), 8);
    }
  });

  Rk.feature({
    id: 'profiles.premium',
    category: 'profiles',
    name: 'Premium status',
    description: 'Shows whether the user has Premium.',
    pages: PROFILE,
    css: `${statusCss}
.rk-profile-state-premium { color: var(--rk-text-strong); }
`,
    async run() {
      const id = profileId();
      const result = id ? await safe(Rk.api.get(`https://premiumfeatures.roblox.com/v1/users/${id}/validate-membership`, { cache: 60000 })) : null;
      if (result === null || result === undefined) return;
      const premium = result === true || result === 'true';
      const logo = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      logo.setAttribute('viewBox', '0 0 32 32');
      logo.setAttribute('width', '16');
      logo.setAttribute('height', '16');
      logo.setAttribute('aria-hidden', 'true');
      for (const d of [
        'M23 4C25.7614 4 28 6.23858 28 9V23C28 25.7614 25.7614 28 23 28H15C14.4477 28 14 27.5523 14 27C14 26.4477 14.4477 26 15 26H23C24.6569 26 26 24.6569 26 23V9C26 7.34315 24.6569 6 23 6H9C7.34315 6 6 7.34315 6 9V27C6 27.5523 5.55228 28 5 28C4.44772 28 4 27.5523 4 27V9C4 6.23858 6.23858 4 9 4H23Z',
        'M20 10C21.1046 10 22 10.8954 22 12V20C22 21.1046 21.1046 22 20 22H15C14.4477 22 14 21.5523 14 21C14 20.4477 14.4477 20 15 20H20V12H12V27C12 27.5523 11.5523 28 11 28C10.4477 28 10 27.5523 10 27V12C10 10.8954 10.8954 10 12 10H20Z'
      ]) {
        const shape = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        shape.setAttribute('d', d);
        logo.append(shape);
      }
      addStatus(el('span', { class: 'rk-profile-state rk-profile-state-premium', title: 'Premium' }, logo, premium ? 'True' : 'False'), 3);
    }
  });

  const ROBLOX_BADGES = [
    ['administrator', 'administrator', 'Administrator', 'Given to Roblox staff.', 1, 6],
    ['veteran', 'veteran', 'Veteran', 'Has been on Roblox for over a year.', 0, 7],
    ['friendship', 'friendship', 'Friendship', 'Has made at least 20 friends on Roblox.', 1, 0],
    ['ambassador', 'ambassador', 'Ambassador', 'Helped keep Roblox safe as an ambassador.', 1, 1],
    ['bloxxer', 'bloxxer', 'Bloxxer', 'Has won at least 250 battles and been knocked out fewer times.', 0, 3],
    ['homestead', 'homestead', 'Homestead', 'Their place has been visited 100 times.', 1, 3],
    ['bricksmith', 'bricksmith', 'Bricksmith', 'Their place has been visited 1,000 times.', 0, 4],
    ['combatInitiation', 'combat-initiation', 'Combat Initiation', 'Has scored 10 knockouts.', 0, 2],
    ['warrior', 'warrior', 'Warrior', 'Has scored 100 knockouts.', 1, 2],
    ['inviter', 'inviter', 'Inviter', 'Invited friends who joined Roblox.', 0, 0],
    ['officialModelMaker', 'official-model-maker', 'Official Model Maker', 'Made models featured by Roblox.', 1, 4],
    ['welcomeToTheClub', 'welcome-to-the-club', 'Welcome To The Club', 'Has bought a membership.', 0, 1],
    ['buildersClub', 'builders-club', 'Builders Club', 'Was a Builders Club member.', 0, 5],
    ['turboBuildersClub', 'turbo-builders-club', 'Turbo Builders Club', 'Was a Turbo Builders Club member.', 1, 5],
    ['outrageousBuildersClub', 'outrageous-builders-club', 'Outrageous Builders Club', 'Was an Outrageous Builders Club member.', 0, 6]
  ];

  Rk.feature({
    id: 'profiles.robloxBadges',
    category: 'profiles',
    name: 'Roblox badges',
    description: 'Shows the official Roblox badges a user has earned.',
    pages: PROFILE,
    css: `${chipsCss}
.rk-profile-chip.rk-profile-badge { padding: 4px 12px 4px 4px; }
.rk-profile-badge[data-rk-tip]::after { width: max-content; max-width: 240px; white-space: normal; }
.rk-profile-badge-sprite { flex: none; width: 32px !important; height: 32px !important; background-size: 64px auto !important; }
`,
    async run() {
      const id = profileId();
      const list = id ? await safe(Rk.api.get(`https://accountinformation.roblox.com/v1/users/${id}/roblox-badges`, { cache: 60000 })) : null;
      const badges = Array.isArray(list) ? list.filter(badge => badge && typeof badge.name === 'string' && badge.name) : [];
      const owned = new Set(badges.map(badge => badge.name.toLowerCase()));
      const fakes = Rk.isEnabled('profiles.fakeBadges') && await ownProfile() ? ROBLOX_BADGES.filter(([key, , name]) => Rk.option('profiles.fakeBadges', key) === true && !owned.has(name.toLowerCase())) : [];
      if (!badges.length && !fakes.length) return;
      const chips = badges.map(badge => {
        const image = typeof badge.imageUrl === 'string' && /^https:\/\//i.test(badge.imageUrl) ? badge.imageUrl : null;
        const chip = el('div', { class: 'rk-profile-chip rk-profile-badge', tabindex: '0' }, ui.thumb(image, { size: 32 }), el('span', null, badge.name));
        return typeof badge.description === 'string' && badge.description.trim() ? ui.tip(chip, badge.description.trim()) : chip;
      });
      for (const [, slug, name, description, column, line] of fakes) {
        const sprite = el('span', { class: `rk-profile-badge-sprite icon-badge-${slug}`, style: { backgroundPosition: `${-32 * column}px ${-32 * line}px` } });
        chips.push(ui.tip(el('div', { class: 'rk-profile-chip rk-profile-badge', tabindex: '0' }, sprite, el('span', null, name)), description));
      }
      addSection('profile', ui.section('Roblox badges', el('div', { class: 'rk-profile-chips' }, chips), { className: 'rk-profile-roblox-badges' }), 8);
    }
  });

  Rk.feature({
    id: 'profiles.badgeTotal',
    category: 'profiles',
    name: 'Badge count',
    description: 'Counts how many experience badges a user has earned.',
    default: false,
    pages: PROFILE,
    async run() {
      const id = profileId();
      if (!id) return;
      const value = el('span', null, ui.spinner(14));
      const grid = statsGrid();
      const stat = place(grid, ui.stat('Badges', value), 4);
      let count = 0;
      let cursor = '';
      try {
        do {
          const json = await Rk.api.get(`https://badges.roblox.com/v1/users/${id}/badges?limit=100&sortOrder=Desc${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`);
          if (!json || !Array.isArray(json.data)) break;
          count += json.data.length;
          cursor = typeof json.nextPageCursor === 'string' ? json.nextPageCursor : '';
        } while (cursor && count < 1000);
      } catch {
        stat.remove();
        if (!grid.children.length) grid.closest('.rk-section').remove();
        return;
      }
      value.textContent = count >= 1000 && cursor ? `${fmt.num(1000)}+` : fmt.num(count);
    }
  });

  Rk.feature({
    id: 'profiles.recentBadges',
    category: 'profiles',
    name: 'Recent badges',
    description: 'Shows the 10 badges the user earned most recently.',
    pages: PROFILE,
    css: `${tilesCss}${nativeCss('badges', '.profile-carousel:has(a[href*="/inventory/#!/badges"])')}`,
    run: replacing('badges', async () => {
      const id = profileId();
      const json = id ? await safe(Rk.api.get(`https://badges.roblox.com/v1/users/${id}/badges?limit=10&sortOrder=Desc`, { cache: 60000 })) : null;
      const badges = json && Array.isArray(json.data) ? json.data.filter(badge => badge && Rk.isId(badge.id)).slice(0, 10) : [];
      if (!badges.length) return;
      const tiles = badges.map(badge => tile(`/badges/${badge.id}`, ui.thumb(Rk.thumb('BadgeIcon', badge.id, '150x150'), { size: 64 }), typeof badge.name === 'string' && badge.name ? badge.name : 'Badge'));
      return addSection('profile', ui.section('Recent badges', el('div', { class: 'rk-profile-tiles' }, tiles), { className: 'rk-profile-badges' }), 9, { replace: '.profile-carousel:has(a[href*="/inventory/#!/badges"])' });
    })
  });

  Rk.feature({
    id: 'profiles.groups',
    category: 'profiles',
    name: 'Community list',
    description: 'Lists every community the user is in with role, rank and exact member count.',
    pages: PROFILE,
    css: `${listCss}${nativeCss('communities', '.profile-communities')}
.rk-profile-owner { font-weight: 600; color: var(--rk-text-strong); }
`,
    run: replacing('communities', async () => {
      const id = profileId();
      const groups = id ? await groupsOf(id) : null;
      if (!groups || !groups.length) return;
      const rows = [...groups].sort((a, b) => b.rank - a.rank || a.name.localeCompare(b.name)).map(group => entryRow(
        ui.thumb(Rk.thumb('GroupIcon', group.id, '150x150'), { size: 40 }),
        `/communities/${group.id}`,
        group.name,
        `${group.role}, rank ${group.rank}`,
        [group.rank === 255 ? el('span', { class: 'rk-profile-owner' }, 'Owner') : null, Number.isFinite(group.members) ? el('span', { class: 'rk-muted' }, fmt.plural(group.members, 'member')) : null],
        mark(group.verified)
      ));
      const [list, more] = collapsible(rows, 8);
      return addSection('profile', ui.section('Communities', list, { className: 'rk-profile-groups', actions: [ui.pill(fmt.num(groups.length)), more] }), 10, { replace: '.profile-communities' });
    })
  });

  Rk.feature({
    id: 'profiles.primaryGroup',
    category: 'profiles',
    name: 'Primary community pill',
    description: 'Shows the primary community of the user next to the name.',
    default: false,
    pages: PROFILE,
    css: `${headerCss}
.rk-profile-pills .rk-pill > .rk-verified { margin-left: 0; }
`,
    async run() {
      const id = profileId();
      const json = id ? await safe(Rk.api.get(`https://groups.roblox.com/v1/users/${id}/groups/primary/role`, { cache: 60000 })) : null;
      const group = json && json.group;
      if (!group || !Rk.isId(group.id) || typeof group.name !== 'string' || !group.name) return;
      addPill(pillLink(`/communities/${group.id}`, el('span', { class: 'rk-pill rk-pill-neutral' }, icon('users', 12), group.name, mark(group.hasVerifiedBadge === true)), 'Primary community'), 5);
    }
  });

  Rk.feature({
    id: 'profiles.createdGames',
    category: 'profiles',
    name: 'Created experiences',
    description: 'Lists the public experiences the user made, with total visits.',
    pages: PROFILE,
    css: `${listCss}${nativeCss('experiences', '.profile-experiences')}`,
    run: replacing('experiences', async () => {
      const id = profileId();
      const list = id ? await safe(Rk.api.paged(`https://games.roblox.com/v2/users/${id}/games?accessFilter=Public&sortOrder=Desc`, { max: 100, limit: 50 })) : null;
      const games = Array.isArray(list) ? list.filter(game => game && Rk.isId(game.id) && game.rootPlace && Rk.isId(game.rootPlace.id)) : [];
      if (!games.length) return;
      const total = games.reduce((sum, game) => sum + (Number(game.placeVisits) || 0), 0);
      const rows = games.map(game => entryRow(
        ui.thumb(Rk.thumb('GameIcon', game.id, '150x150'), { size: 40 }),
        `/games/${game.rootPlace.id}`,
        typeof game.name === 'string' && game.name ? game.name : 'Experience',
        null,
        el('span', { class: 'rk-muted' }, fmt.plural(Number(game.placeVisits) || 0, 'visit'))
      ));
      const [rowsNode, more] = collapsible(rows, 8);
      return addSection('profile', ui.section('Experiences', rowsNode, { className: 'rk-profile-games', actions: [ui.pill(fmt.plural(total, 'visit')), more] }), 11, { replace: '.profile-experiences' });
    })
  });

  Rk.feature({
    id: 'profiles.inventoryPrivacy',
    category: 'profiles',
    name: 'Inventory privacy pill',
    description: 'Shows whether the inventory of the user is public or private.',
    pages: PROFILE,
    css: statusCss,
    async run() {
      const id = profileId();
      const json = id ? await safe(Rk.api.get(`https://inventory.roblox.com/v1/users/${id}/can-view-inventory`, { cache: 60000 })) : null;
      if (!json || typeof json.canView !== 'boolean') return;
      addStatus(json.canView ? el('span', { class: 'rk-profile-state rk-profile-state-public' }, 'Inventory public') : el('span', { class: 'rk-profile-state rk-profile-state-private' }, 'Inventory private'), 2);
    }
  });

  Rk.feature({
    id: 'profiles.flagged',
    category: 'profiles',
    name: 'Flagged users',
    description: 'Shows a red flag next to users flagged by Roblox Verifieds or Rola admins. Hover or click the flag to see why.',
    default: false,
    css: `
.rk-flag { display: inline-flex; align-items: center; justify-content: center; flex: none; width: 20px; height: 20px; margin-left: 4px; padding: 0; border: 0; border-radius: 4px; background: transparent; color: #ff4d4f; vertical-align: middle; cursor: pointer; transition: background-color var(--rk-fast) ease; }
.rk-flag:hover, .rk-flag[aria-expanded="true"] { background: rgba(255, 77, 79, 0.16); }
.rk-flag svg { fill: currentColor; }
.rk-flag-pop { position: fixed; z-index: 2147481800; width: 290px; max-height: 340px; overflow-y: auto; padding: 10px 12px; border: 1px solid rgba(255, 77, 79, 0.45); border-radius: 10px; background: var(--rk-bg); box-shadow: var(--rk-shadow); color: var(--rk-text); font-family: var(--rk-font); text-align: left; opacity: 0; transform: translateY(-4px); pointer-events: none; transition: opacity 140ms ease, transform 180ms var(--rk-ease); }
.rk-flag-pop.rk-flag-pop-open { opacity: 1; transform: none; pointer-events: auto; }
.rk-flag-title { display: flex; align-items: center; gap: 6px; margin-bottom: 8px; font-size: 13px; font-weight: 700; color: #ff4d4f; }
.rk-flag-item + .rk-flag-item { margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--rk-border); }
.rk-flag-reason { font-size: 14px; font-weight: 700; color: var(--rk-text-strong); }
.rk-flag-note { margin-top: 2px; font-size: 13px; color: var(--rk-text); white-space: pre-wrap; overflow-wrap: anywhere; }
.rk-flag-meta { margin-top: 4px; font-size: 11px; color: var(--rk-muted); }
.rk-flag-pop a { color: var(--rk-accent); font-size: 12px; }
`,
    async run(ctx) {
      const flags = await Rk.bg('flagged').catch(() => null);
      if (!flags || typeof flags !== 'object') return;
      const pop = el('div', { class: 'rk-flag-pop', role: 'dialog', 'aria-label': 'Why this user is flagged' });
      let owner = null;
      let pinned = false;
      let hideTimer = 0;
      const when = at => {
        const date = new Date(Number(at));
        return Number.isNaN(date.getTime()) || !at ? '' : date.toLocaleDateString();
      };
      const close = () => {
        clearTimeout(hideTimer);
        pop.classList.remove('rk-flag-pop-open');
        if (owner) owner.setAttribute('aria-expanded', 'false');
        owner = null;
        pinned = false;
      };
      const open = (button, userId) => {
        const entry = flags[userId];
        if (!entry) return;
        clearTimeout(hideTimer);
        if (owner && owner !== button) owner.setAttribute('aria-expanded', 'false');
        owner = button;
        button.setAttribute('aria-expanded', 'true');
        const fromVerifieds = entry.flags.some(flag => flag.source === 'Roblox Verifieds');
        pop.replaceChildren(
          el('div', { class: 'rk-flag-title' }, icon('flag', 14), entry.flags.length === 1 ? 'Flagged for 1 reason' : `Flagged for ${entry.flags.length} reasons`),
          ...entry.flags.map(flag => el('div', { class: 'rk-flag-item' },
            el('div', { class: 'rk-flag-reason' }, flag.reason),
            flag.note ? el('div', { class: 'rk-flag-note' }, flag.note) : null,
            el('div', { class: 'rk-flag-meta' }, [flag.source, when(flag.at)].filter(Boolean).join(' · '))
          )),
          fromVerifieds ? el('div', { class: 'rk-flag-meta' }, el('a', { href: `https://robloxverifieds.com/user/${userId}`, target: '_blank', rel: 'noopener noreferrer' }, 'View on Roblox Verifieds')) : null
        );
        if (!pop.isConnected) document.body.append(pop);
        const rect = button.getBoundingClientRect();
        pop.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - 300))}px`;
        pop.style.top = `${rect.bottom + 6 + 340 > window.innerHeight ? Math.max(8, rect.top - 6 - Math.min(pop.scrollHeight || 200, 340)) : rect.bottom + 6}px`;
        pop.classList.add('rk-flag-pop-open');
      };
      const later = () => {
        if (pinned) return;
        clearTimeout(hideTimer);
        hideTimer = setTimeout(close, 180);
      };
      pop.addEventListener('mouseenter', () => clearTimeout(hideTimer));
      pop.addEventListener('mouseleave', later);
      document.addEventListener('mousedown', event => {
        if (owner && !pop.contains(event.target) && !owner.contains(event.target)) close();
      }, true);
      window.addEventListener('scroll', () => {
        if (owner && !pinned) close();
      }, { passive: true });
      const flagButton = userId => {
        const button = el('button', { type: 'button', class: 'rk-flag', 'aria-label': 'Flagged user, see why', 'aria-expanded': 'false', dataset: { userId: String(userId) } }, icon('flag', 14));
        button.addEventListener('mouseenter', () => open(button, Number(button.dataset.userId)));
        button.addEventListener('mouseleave', later);
        button.addEventListener('click', event => {
          event.preventDefault();
          event.stopPropagation();
          if (owner === button && pinned) {
            close();
            return;
          }
          open(button, Number(button.dataset.userId));
          pinned = true;
        });
        return button;
      };
      const mark = (host, userId) => {
        if (!host || !Rk.isId(userId)) return;
        let button = host.querySelector(':scope > .rk-flag');
        const flagged = Rk.isEnabled(ctx.id) && Boolean(flags[userId]);
        if (!flagged) {
          if (button) button.remove();
          return;
        }
        if (!button) {
          button = flagButton(userId);
          host.append(button);
        }
        button.dataset.userId = String(userId);
      };
      const page = Rk.page();
      if (page.type === 'profile') {
        const id = profileId();
        if (id && flags[id]) {
          const button = flagButton(id);
          const place = () => {
            const name = document.getElementById('profile-header-title-container-name');
            if (!name || !name.parentElement) return;
            const badges = name.parentElement.querySelector(':scope > span.inline-flex.shrink-0');
            if (badges) {
              if (badges.lastElementChild !== button) badges.append(button);
            } else if (name.nextElementSibling !== button) {
              name.after(button);
            }
          };
          Rk.observe('#profile-header-title-container-name', place);
          Rk.observe('.user-profile-header span.inline-flex.shrink-0', place);
        }
      }
      Rk.observe(CARD, card => {
        if (!singleCard(card)) return;
        const sync = () => mark(card.querySelector('.avatar-name, .avatar-card-name, .text-overflow') || card, userIdNear(card));
        sync();
        new MutationObserver(sync).observe(card, { attributes: true, attributeFilter: ['href'], subtree: true });
      });
      Rk.observe('.friends-carousel-tile', tile => {
        const link = tile.querySelector('a[href*="/users/"]');
        const match = link && /\/users\/(\d+)/.exec(link.getAttribute('href'));
        if (match) mark(tile.querySelector('.friends-carousel-tile-label') || tile, Number(match[1]));
      });
      Rk.onSettings(() => {
        if (!Rk.isEnabled(ctx.id)) {
          close();
          for (const button of document.querySelectorAll('.rk-flag')) button.remove();
        }
      });
    }
  });

  Rk.feature({
    id: 'profiles.exactCounts',
    category: 'profiles',
    name: 'Exact friend counts',
    description: 'Shows the exact friends, followers and following counts under the name, even when the user hides their lists.',
    default: false,
    pages: PROFILE,
    css: `${statusCss}
.rk-profile-counts { display: inline-flex; flex-wrap: wrap; gap: 4px 10px; }
.rk-profile-counts a { color: var(--rk-muted) !important; text-decoration: none !important; }
.rk-profile-counts a:hover { color: var(--rk-text-strong) !important; }
.rk-profile-counts b { color: var(--rk-text-strong); font-weight: 700; }
${nativeCss('counts', '.profile-header-social-counts')}`,
    run: replacing('counts', async () => {
      const id = profileId();
      if (!id) return null;
      const counts = await Promise.all(['friends', 'followers', 'followings'].map(kind => safe(Rk.api.get(`https://friends.roblox.com/v1/users/${id}/${kind}/count`, { cache: 60000 }))));
      const parts = [['Friend', 'Friends', 'friends'], ['Follower', 'Followers', 'followers'], ['Following', 'Following', 'following']]
        .map(([one, many, tab], index) => ({ value: counts[index] && counts[index].count, one, many, tab }))
        .filter(part => Number.isSafeInteger(part.value) && part.value >= 0);
      if (!parts.length) return null;
      const node = el('span', { class: 'rk-profile-counts' }, parts.map(part => el('a', { href: `/users/${id}/friends#!/${part.tab}` }, el('b', null, fmt.num(part.value)), ` ${part.value === 1 ? part.one : part.many}`)));
      addStatus(node, 4);
      return node;
    })
  });

  const VALUE_TIERS = [[100000000, '100M+'], [50000000, '50M+'], [20000000, '20M+'], [10000000, '10M+'], [5000000, '5M+'], [1000000, '1M+'], [500000, '500K+'], [100000, '100K+']];
  const RARES = [
    ['dominus', /^Dominus\b/i, 'Dominus', 'Owns a Dominus'],
    ['valkyrie', /\bValkyrie\b/i, 'Valkyrie', 'Owns a Valkyrie Helm'],
    ['fedora', /Sparkle Time Fedora/i, 'Sparkle Time', 'Owns a Sparkle Time Fedora']
  ];

  const achievementFacts = id => cached(`achievements:${id}`, async () => {
    const stored = Rk.store.get('profiles.achievements', {});
    const saved = stored && typeof stored === 'object' && !Array.isArray(stored) ? stored : {};
    const hit = saved[id];
    if (hit && typeof hit === 'object' && Date.now() - hit.time < 3600000) return hit;
    const [user, privacy, premium, friends, groups, games] = await Promise.all([
      profileUser(),
      safe(Rk.api.get(`https://inventory.roblox.com/v1/users/${id}/can-view-inventory`, { cache: 60000 })),
      safe(Rk.api.get(`https://premiumfeatures.roblox.com/v1/users/${id}/validate-membership`, { cache: 60000 })),
      safe(Rk.api.get(`https://friends.roblox.com/v1/users/${id}/friends/count`)),
      groupsOf(id),
      safe(Rk.api.paged(`https://games.roblox.com/v2/users/${id}/games?accessFilter=Public&sortOrder=Desc`, { max: 100, limit: 50 }))
    ]);
    if (!user) return null;
    let value = null;
    const rares = [];
    if (privacy && privacy.canView === true) {
      const [items, values] = await Promise.all([
        safe(Rk.api.paged(`https://inventory.roblox.com/v1/users/${id}/assets/collectibles?sortOrder=Asc`, { max: 2000, limit: 100 })),
        safe(Rk.values())
      ]);
      if (Array.isArray(items)) {
        value = 0;
        for (const item of items) {
          if (!item || !Rk.isId(item.assetId)) continue;
          const entry = values instanceof Map ? values.get(Number(item.assetId)) : null;
          value += entry && entry.value > 0 ? entry.value : Math.max(0, Number(item.recentAveragePrice) || 0);
          const name = typeof item.name === 'string' ? item.name : '';
          for (const [key, pattern] of RARES) if (pattern.test(name) && !rares.includes(key)) rares.push(key);
        }
      }
    }
    let badges = 0;
    let cursor = '';
    do {
      const json = await safe(Rk.api.get(`https://badges.roblox.com/v1/users/${id}/badges?limit=100&sortOrder=Desc${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`));
      if (!json || !Array.isArray(json.data)) break;
      badges += json.data.length;
      cursor = typeof json.nextPageCursor === 'string' ? json.nextPageCursor : '';
    } while (cursor && badges < 1000);
    const facts = {
      time: Date.now(),
      created: user.created,
      verified: user.hasVerifiedBadge === true,
      premium: premium === true || premium === 'true',
      friends: friends && Number.isSafeInteger(friends.count) ? friends.count : 0,
      owned: (groups || []).filter(group => group.rank === 255).reduce((most, group) => Math.max(most, Number.isFinite(group.members) ? group.members : 0), 0),
      visits: (Array.isArray(games) ? games : []).reduce((sum, game) => sum + (game && Number(game.placeVisits) > 0 ? Number(game.placeVisits) : 0), 0),
      badges,
      value,
      rares
    };
    const next = { ...saved, [id]: facts };
    const ids = Object.keys(next);
    if (ids.length > 100) ids.sort((a, b) => (next[a].time || 0) - (next[b].time || 0)).slice(0, ids.length - 100).forEach(key => delete next[key]);
    Rk.store.set('profiles.achievements', next);
    return facts;
  });

  const achievementList = (facts, fake) => {
    const list = [];
    const tier = fake.value ? VALUE_TIERS.find(([, label]) => label === fake.value) : facts.value !== null ? VALUE_TIERS.find(([min]) => facts.value >= min) : null;
    if (tier) list.push(['value', 'robux', `${tier[1]} value`, `Collectibles worth ${tier[1]} by Rolimons values`]);
    for (const [key, , label, tip] of RARES) {
      if ((Array.isArray(facts.rares) && facts.rares.includes(key)) || fake[key]) list.push(['rare', 'star', label, tip]);
    }
    const age = accountAge(facts.created);
    if (age && age.years >= 15) list.push(['age', 'clock', 'Legend', 'Account is 15 or more years old']);
    else if (age && age.years >= 10) list.push(['age', 'clock', 'OG', 'Account is 10 or more years old']);
    else if (age && age.years >= 5) list.push(['age', 'clock', 'Veteran', 'Account is 5 or more years old']);
    if (facts.verified) list.push(['verified', 'check', 'Verified', 'Has the Roblox verified badge']);
    if (facts.premium) list.push(['premium', 'star', 'Premium', 'Has Roblox Premium']);
    const visits = [[1000000000, '1B+'], [100000000, '100M+'], [1000000, '1M+']].find(([min]) => facts.visits >= min);
    if (visits) list.push(['creator', 'play', `Creator ${visits[1]}`, `Made experiences with ${visits[1]} total visits`]);
    const members = [[1000000, '1M+'], [100000, '100K+']].find(([min]) => facts.owned >= min);
    if (members) list.push(['community', 'users', `Owner ${members[1]}`, `Owns a community with ${members[1]} members`]);
    if (facts.badges >= 1000) list.push(['badges', 'shield', 'Badge hunter', 'Earned 1,000 or more experience badges']);
    if (facts.friends >= 200) list.push(['friends', 'heart', 'Popular', 'Has 200 or more friends']);
    return list;
  };

  Rk.feature({
    id: 'profiles.achievementBadges',
    category: 'profiles',
    name: 'Achievement badges',
    description: 'Shows Rola achievement badges on profiles, like value tiers, rare items, account age and big creators. Hover a badge to see what it means.',
    default: false,
    pages: PROFILE,
    css: `
.user-profile-header:has(> .rk-profile-achievements) { flex-wrap: wrap !important; }
.rk-profile-achievements { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 14px; width: 100%; margin-top: 8px; font-family: var(--rk-font); font-size: 13px; font-weight: 700; line-height: 20px; }
.rk-profile-achievements:empty { display: none; }
.rk-profile-achievement { display: inline-flex; align-items: center; gap: 5px; color: var(--rk-accent); cursor: default; animation: rk-fade var(--rk-fast) ease both; }
.dark-theme .rk-profile-achievement { color: #9db8ff; }
.rk-profile-achievement-value, .rk-profile-achievement-creator { color: var(--rk-success) !important; }
.rk-profile-achievement-rare { color: var(--rk-warning) !important; }
.rk-profile-achievement-premium, .rk-profile-achievement-badges { color: var(--rk-text-strong) !important; }
.rk-profile-achievement-friends { color: #e0559a !important; }
.rk-profile-achievement[data-rk-tip]::after { width: max-content; max-width: 240px; white-space: normal; }
`,
    async run(ctx) {
      const id = profileId();
      if (!id) return;
      const row = el('div', { class: 'rk-profile-achievements' });
      Rk.observe('.user-profile-header', header => place(header, row, 5));
      const facts = await achievementFacts(id);
      if (!facts) return;
      const own = await ownProfile();
      const render = () => {
        if (!Rk.isEnabled(ctx.id)) return;
        const fake = {};
        if (own && Rk.isEnabled('profiles.fakeBadges')) {
          fake.value = Rk.option('profiles.fakeBadges', 'value');
          for (const [key] of RARES) fake[key] = Rk.option('profiles.fakeBadges', key) === true;
        }
        row.replaceChildren(...achievementList(facts, fake).map(([kind, iconName, label, tip]) => ui.tip(el('span', { class: `rk-profile-achievement rk-profile-achievement-${kind}`, tabindex: '0' }, icon(iconName, 14), label), tip)));
      };
      render();
      if (own) Rk.onSettings(render);
    }
  });

  Rk.feature({
    id: 'profiles.visitCounter',
    category: 'profiles',
    name: 'Visit counter',
    description: 'Counts how many times you opened each profile and shows it under the name.',
    default: false,
    pages: PROFILE,
    css: statusCss,
    async run() {
      const id = profileId();
      if (!id || await ownProfile()) return;
      const stored = Rk.store.get('profiles.visits', {});
      const visits = stored && typeof stored === 'object' && !Array.isArray(stored) ? { ...stored } : {};
      const entry = visits[id];
      const count = (entry && Number.isSafeInteger(entry.count) && entry.count > 0 ? entry.count : 0) + 1;
      visits[id] = { count, last: Date.now() };
      const ids = Object.keys(visits);
      if (ids.length > 1000) ids.sort((a, b) => ((visits[a] && visits[a].last) || 0) - ((visits[b] && visits[b].last) || 0)).slice(0, ids.length - 1000).forEach(key => delete visits[key]);
      Rk.store.set('profiles.visits', visits);
      addStatus(el('span', { class: 'rk-profile-state rk-profile-state-offline' }, `Visited ${fmt.plural(count, 'time')}`), 5);
    }
  });

  Rk.feature({
    id: 'profiles.banner',
    category: 'profiles',
    name: 'Profile banner',
    description: 'Shows a banner image or gif above your own profile and on your avatar page. Paste a link, choose a file or drop one in. Only you can see it.',
    default: false,
    pages: ['profile', 'avatar'],
    options: [
      { key: 'image', label: 'Banner image or gif', type: 'image', default: '' },
      { key: 'height', label: 'Height (px)', type: 'number', min: 80, max: 400, step: 10, default: 200 },
      { key: 'position', label: 'Image focus', type: 'select', choices: [['top', 'Top'], ['center', 'Center'], ['bottom', 'Bottom']], default: 'center' }
    ],
    css: `
.rk-profile-banner { position: relative; flex: 0 0 100%; width: 100%; margin: 0 0 16px; overflow: hidden; border-radius: var(--rk-radius-l); background: var(--rk-shift); transition: height var(--rk-fast) var(--rk-ease); }
.rk-profile-banner > img { display: block; width: 100%; height: 100%; object-fit: cover; opacity: 0; transition: opacity 400ms ease; }
.rk-profile-banner > img.rk-profile-banner-loaded { opacity: 1; }
.rk-banner-host { background-image: var(--rk-profile-banner) !important; background-size: cover !important; background-repeat: no-repeat !important; background-position: var(--rk-profile-banner-focus, center) !important; }
.rk-banner-host :is(.thumbnail-3d-container, .thumbnail-2d-container, [class*="thumbnail-holder"], canvas, .rk-banner-clear) { background: transparent !important; }
`,
    async run(ctx) {
      const onAvatar = Rk.page().type === 'avatar';
      if (!onAvatar && !await ownProfile()) return;
      const image = el('img', { alt: '', decoding: 'async' });
      const banner = el('div', { class: 'rk-profile-banner rk-hidden' }, image);
      image.addEventListener('load', () => image.classList.add('rk-profile-banner-loaded'));
      image.addEventListener('error', () => banner.classList.add('rk-hidden'));
      let token = null;
      let data = null;
      let host = null;
      const painted = el => {
        const style = getComputedStyle(el);
        return style.backgroundImage !== 'none' || !/rgba\(0, 0, 0, 0\)|transparent/.test(style.backgroundColor);
      };
      const large = el => {
        const rect = el.getBoundingClientRect();
        return rect.width >= 300 && rect.height >= 150;
      };
      const clearInside = () => {
        if (!host || !data) return;
        for (const node of host.querySelectorAll('*')) {
          if (node.classList.contains('rk-banner-clear') || node.matches('button, a, img, canvas, svg, svg *')) continue;
          if (large(node) && painted(node)) node.classList.add('rk-banner-clear');
        }
      };
      const paint = () => {
        if (host) {
          host.classList.toggle('rk-banner-host', Boolean(data));
          clearInside();
          if (data) {
            host.style.setProperty('--rk-profile-banner', `url("${data}")`);
            host.style.setProperty('--rk-profile-banner-focus', `center ${ctx.option('position')}`);
          } else {
            host.style.removeProperty('--rk-profile-banner');
          }
        }
        banner.classList.toggle('rk-hidden', !data || Boolean(host));
      };
      const apply = async () => {
        banner.style.height = `${ctx.option('height')}px`;
        image.style.objectPosition = `center ${ctx.option('position')}`;
        const next = Rk.isEnabled(ctx.id) ? ctx.option('image') : '';
        if (next !== token) {
          token = next;
          const loaded = next ? await Rk.images.get(ctx.id, 'image') : null;
          if (token !== next) return;
          data = loaded;
          image.classList.remove('rk-profile-banner-loaded');
          if (data) image.src = data;
          else image.removeAttribute('src');
        }
        paint();
      };
      apply();
      Rk.onSettings(apply);
      if (onAvatar) {
        Rk.observe('#avatar-react-container', container => {
          const parent = container.parentElement;
          if (parent && parent.firstElementChild !== banner) parent.prepend(banner);
        });
        return;
      }
      Rk.observe('.user-profile-header', header => {
        if (banner.nextElementSibling !== header) header.before(banner);
      });
      Rk.observe('.thumbnail-3d-container, .avatar-toggle-button, .enable-three-dee', node => {
        if (host && host.isConnected) return;
        let box = node;
        for (let depth = 0; depth < 6 && box.parentElement; depth += 1) {
          box = box.parentElement;
          const rect = box.getBoundingClientRect();
          if (rect.width >= 300 && rect.height >= 150) break;
        }
        if (box === document.body || box.contains(document.querySelector('.user-profile-header'))) return;
        host = [box, ...box.querySelectorAll('*')].find(node => !node.matches('button, a, img, canvas, svg, svg *') && large(node) && painted(node)) || box;
        new MutationObserver(clearInside).observe(host, { childList: true, subtree: true });
        paint();
      });
    }
  });

  Rk.feature({
    id: 'profiles.selfPresence',
    category: 'profiles',
    name: 'Your status on your top bar avatar',
    description: 'Shows the online, in game or in Studio dot on your own avatar in the top bar, like Roblox shows on friends.',
    default: false,
    css: `
.rk-self-presence-host { position: relative; }
.rk-self-presence { position: absolute; right: -2px; bottom: -2px; z-index: 1; width: 11px; height: 11px; box-sizing: border-box; border: 2px solid var(--rk-bg); border-radius: 50%; pointer-events: none; }
.rk-self-presence[data-state="online"] { background: #00a2ff; }
.rk-self-presence[data-state="game"] { background: #02b757; }
.rk-self-presence[data-state="studio"] { background: #f68802; }
.rk-self-presence[data-state="offline"] { display: none; }
`,
    async run(ctx) {
      const me = await Rk.me();
      if (!me) return;
      const states = ['offline', 'online', 'game', 'studio'];
      const dot = el('span', { class: 'rk-self-presence', dataset: { state: 'offline' } });
      let timer = 0;
      const refresh = async () => {
        clearTimeout(timer);
        if (document.visibilityState !== 'visible' || !Rk.isEnabled(ctx.id)) return;
        const map = await safe(Rk.api.presence([me.id]));
        const entry = map && map.get(me.id);
        const state = states[presenceType(entry)] || 'offline';
        dot.dataset.state = state;
        dot.title = { online: 'Online', game: entry && entry.lastLocation ? `Playing ${entry.lastLocation}` : 'In game', studio: 'In Studio', offline: 'Offline' }[state];
        timer = setTimeout(refresh, 60000);
      };
      Rk.observe('.age-bracket-label', label => {
        const avatar = label.querySelector('img, .thumbnail-2d-container, .avatar-card-image, [class*="avatar"]');
        const host = avatar && avatar.tagName === 'IMG' ? avatar.parentElement : avatar;
        if (!host || host.contains(dot)) return;
        host.classList.add('rk-self-presence-host');
        host.append(dot);
      });
      document.addEventListener('visibilitychange', refresh);
      Rk.onSettings(() => {
        dot.classList.toggle('rk-hidden', !Rk.isEnabled(ctx.id));
        refresh();
      });
      refresh();
    }
  });

  Rk.feature({
    id: 'profiles.downloadAvatar',
    category: 'profiles',
    name: 'Download avatar',
    description: 'Adds a button to download a large image of the avatar.',
    default: false,
    pages: PROFILE,
    css: headerCss,
    run() {
      const id = profileId();
      if (!id) return;
      const button = ui.button('Download avatar', { icon: 'download', onClick: async () => {
        button.disabled = true;
        const [url, user] = await Promise.all([Rk.thumb('Avatar', id, '720x720'), profileUser()]);
        const done = url ? await Rk.bg('download', { url, filename: `${user ? user.name : id}-avatar.png` }).then(() => true, () => false) : false;
        button.disabled = false;
        ui.toast(done ? 'Download started' : 'Could not download the avatar', { tone: done ? 'success' : 'danger' });
      } });
      addTool(button, 9);
    }
  });

  Rk.feature({
    id: 'profiles.wearing',
    category: 'profiles',
    name: 'Currently wearing details',
    description: 'Lists the items the user is wearing in place of the Roblox list.',
    pages: PROFILE,
    css: `${nativeCss('wearing', '.profile-currently-wearing')}
.rk-profile-items { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 16px 12px; }
.rk-profile-item { display: flex; flex-direction: column; gap: 6px; min-width: 0; color: var(--rk-text-strong) !important; text-decoration: none !important; }
.rk-profile-item .rk-thumb { width: 100% !important; height: auto !important; aspect-ratio: 1; transition: opacity var(--rk-med) ease, transform var(--rk-fast) var(--rk-ease); }
.rk-profile-item:hover .rk-thumb { transform: translateY(-2px); }
.rk-profile-item-name { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; font-size: 14px; font-weight: 600; line-height: 18px; }
.rk-profile-item-price { font-size: 14px; line-height: 18px; color: var(--rk-muted); }
.rk-profile-item-price .rk-robux { font-weight: 600; }
`,
    run: replacing('wearing', async () => {
      const id = profileId();
      if (!id) return null;
      const worn = await wornItems(id);
      if (!worn || !worn.ids.length) return null;
      const cards = worn.ids.map(assetId => {
        const item = worn.details.get(assetId);
        const name = item && typeof item.rkName === 'string' && item.rkName ? item.rkName : `Item ${assetId}`;
        let price = 'Off Sale';
        if (item && typeof item.rkSale === 'number') price = item.rkSale > 0 ? ui.robux(item.rkSale) : 'Free';
        else if (item && typeof item.rkResale === 'number') price = ui.robux(item.rkResale);
        return el('a', { class: 'rk-profile-item', href: `/catalog/${assetId}`, title: name },
          ui.thumb(Rk.thumb('Asset', assetId, '150x150'), { size: 150, alt: name }),
          el('span', { class: 'rk-profile-item-name' }, name),
          el('span', { class: 'rk-profile-item-price' }, price)
        );
      });
      return addSection('profile', ui.section('Currently wearing', el('div', { class: 'rk-profile-items' }, cards), { className: 'rk-profile-wearing', actions: ui.pill(fmt.num(worn.ids.length)) }), 7, { replace: '.profile-currently-wearing' });
    })
  });

  Rk.feature({
    id: 'profiles.outfitCost',
    category: 'profiles',
    name: 'Outfit cost',
    description: 'Shows what the worn items cost right now and how many are off sale.',
    pages: PROFILE,
    css: `
.rk-profile-cost { display: inline-flex; align-items: center; gap: 8px; margin-left: 12px; font-family: var(--rk-font); font-size: 13px; font-weight: 400; line-height: 20px; letter-spacing: normal; text-transform: none; color: var(--rk-muted); vertical-align: middle; white-space: nowrap; }
.rk-profile-cost .rk-robux { color: inherit; }
`,
    async run() {
      const id = profileId();
      const worn = id ? await wornItems(id) : null;
      if (!worn || !worn.details.size) return;
      const prices = [...worn.details.values()].map(item => item.price).filter(price => typeof price === 'number' && Number.isFinite(price) && price >= 0);
      const offSale = worn.details.size - prices.length;
      const total = prices.reduce((sum, price) => sum + price, 0);
      const node = el('span', { class: 'rk-inline' },
        prices.length ? ui.tip(ui.robux(total), 'Current price of the items for sale') : null,
        offSale ? ui.pill(`${fmt.num(offSale)} off sale`) : null
      );
      const line = el('span', { class: 'rk-profile-cost', title: 'Current price of the worn items for sale' },
        prices.length ? ui.robux(total) : null,
        offSale ? el('span', null, `${fmt.num(offSale)} off sale`) : null
      );
      if (!Rk.isEnabled('profiles.wearing')) onNativeWearing(heading => {
        node.remove();
        const texts = [...heading.childNodes].filter(child => child.nodeType === 3 && child.nodeValue.trim());
        if (texts.length) texts[texts.length - 1].after(line);
        else heading.append(line);
      });
      Rk.observe('.rk-profile-wearing .rk-section-actions', actions => {
        if (!line.isConnected && !actions.contains(node)) actions.prepend(node);
      });
    }
  });

  Rk.feature({
    id: 'profiles.bioLinks',
    category: 'profiles',
    name: 'Clickable bio links',
    description: 'Turns Roblox links in the about text into real links.',
    default: false,
    pages: PROFILE,
    run() {
      const pattern = /(?<![\w./@-])(?:https?:\/\/)?(?:[a-z0-9-]+\.)*roblox\.com(?![a-z0-9-]|\.[a-z0-9])(?:\/[^\s<>"'`]*)?/gi;
      const safeUrl = text => {
        try {
          const url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
          return /(^|\.)roblox\.com$/i.test(url.hostname) ? `https://${url.host}${url.pathname}${url.search}${url.hash}` : null;
        } catch {
          return null;
        }
      };
      const linkify = root => {
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        const texts = [];
        while (walker.nextNode()) {
          if (!walker.currentNode.parentElement.closest('a')) texts.push(walker.currentNode);
        }
        for (const node of texts) {
          const text = node.nodeValue || '';
          const parts = [];
          let last = 0;
          for (const match of text.matchAll(pattern)) {
            const raw = match[0].replace(/[.,!?;:)\]}]+$/, '');
            const href = safeUrl(raw);
            if (!href) continue;
            parts.push(text.slice(last, match.index), ui.link(href, raw));
            last = match.index + raw.length;
          }
          if (!parts.length) continue;
          parts.push(text.slice(last));
          node.replaceWith(...parts);
        }
      };
      Rk.observe('.description-content', root => {
        linkify(root);
        const watcher = new MutationObserver(() => {
          if (root.isConnected) linkify(root);
          else watcher.disconnect();
        });
        watcher.observe(root, { childList: true, subtree: true, characterData: true });
      });
    }
  });

  Rk.feature({
    id: 'profiles.visitHistory',
    category: 'profiles',
    name: 'Profile history',
    description: 'Remembers the profiles you visit for recent lists and quick search.',
    pages: PROFILE,
    async run() {
      const id = profileId();
      if (!id || await ownProfile()) return;
      const user = await profileUser();
      if (!user) return;
      const stored = Rk.store.get('history.profiles', []);
      const list = (Array.isArray(stored) ? stored : []).filter(entry => entry && Rk.isId(entry.userId) && Number(entry.userId) !== id);
      list.unshift({ userId: id, name: user.name, displayName: String(user.displayName || user.name), time: Date.now() });
      Rk.store.set('history.profiles', list.slice(0, 40));
    }
  });

  Rk.feature({
    id: 'profiles.joinCompare',
    category: 'profiles',
    name: 'Join date compare',
    description: 'Shows how many days before or after you a user joined.',
    default: false,
    pages: PROFILE,
    async run() {
      const id = profileId();
      const me = await Rk.me();
      if (!id || !me || me.id === id) return;
      const [user, mine] = await Promise.all([profileUser(), safe(Rk.api.get(`https://users.roblox.com/v1/users/${me.id}`, { cache: 600000 }))]);
      const theirs = user ? toTime(user.created) : null;
      const own = mine ? toTime(mine.created) : null;
      if (!theirs || !own) return;
      const days = Math.round((theirs - own) / DAY);
      const text = days === 0 ? 'Joined the same day as you' : `Joined ${fmt.plural(Math.abs(days), 'day')} ${days < 0 ? 'before' : 'after'} you`;
      const node = el('span', { class: 'rk-muted' }, text);
      Rk.observe('.rk-profile-account .rk-profile-account-extra', extra => {
        if (!extra.contains(node)) extra.append(node);
      });
    }
  });

  Rk.feature({
    id: 'profiles.idPill',
    category: 'profiles',
    name: 'User ID pill',
    description: 'Adds a pill with the user ID that copies on click.',
    default: false,
    pages: PROFILE,
    css: `${headerCss}
.rk-profile-click { border: 0; font-family: var(--rk-font); cursor: pointer; transition: background-color var(--rk-fast) ease; }
.rk-profile-click:hover { background: var(--rk-press); }
`,
    run() {
      const id = profileId();
      if (!id) return;
      addPill(el('button', { type: 'button', class: 'rk-pill rk-pill-neutral rk-profile-click', title: 'Copy user ID', onclick: () => ui.copy(String(id), 'User ID copied') }, `#${id}`), 8);
    }
  });

  Rk.feature({
    id: 'profiles.hotkeys',
    category: 'profiles',
    name: 'Profile shortcuts',
    description: 'Press I for inventory, T to trade and F for friends on profiles.',
    default: false,
    pages: PROFILE,
    async run() {
      const me = await Rk.me();
      let lastG = 0;
      document.addEventListener('keydown', event => {
        if (event.code === 'KeyG' && !event.ctrlKey && !event.altKey && !event.metaKey) lastG = Date.now();
      });
      const go = path => () => {
        const id = profileId();
        const sequence = Rk.isEnabled('tools.navHotkeys') && Date.now() - lastG < 1200;
        lastG = 0;
        if (id && !sequence) location.href = `/users/${id}/${path}`;
      };
      Rk.hotkey('i', go('inventory'));
      Rk.hotkey('f', go('friends'));
      if (me && me.id !== profileId()) Rk.hotkey('t', go('trade'));
    }
  });

  Rk.feature({
    id: 'profiles.notableGroups',
    category: 'profiles',
    name: 'Notable community pills',
    description: 'Marks members of Roblox staff, Roblox interns and Video stars.',
    pages: PROFILE,
    css: headerCss,
    async run() {
      const id = profileId();
      const groups = id ? await groupsOf(id) : null;
      if (!groups || !groups.length) return;
      const byId = new Map(groups.map(group => [group.id, group]));
      for (const [notableId, label] of [[1200769, 'Roblox staff'], [2868472, 'Roblox interns'], [4199740, 'Video stars']]) {
        const group = byId.get(notableId);
        if (group) addPill(pillLink(`/communities/${notableId}`, el('span', { class: 'rk-pill rk-pill-accent' }, icon('shield', 12), label), group.role), 4);
      }
    }
  });

  Rk.feature({
    id: 'profiles.creations',
    category: 'profiles',
    name: 'Marketplace creations',
    description: 'Shows items the user published to the marketplace.',
    default: false,
    pages: PROFILE,
    css: tilesCss,
    async run() {
      const id = profileId();
      const json = id ? await safe(Rk.api.get(`https://catalog.roblox.com/v1/search/items?category=All&creatorTargetId=${id}&creatorType=User&limit=10`, { cache: 60000 })) : null;
      const items = json && Array.isArray(json.data) ? json.data.filter(item => item && Rk.isId(item.id) && (item.itemType === 'Asset' || item.itemType === 'Bundle')).slice(0, 10) : [];
      if (!items.length) return;
      const details = await safe(Rk.api.post('https://catalog.roblox.com/v1/catalog/items/details', { items: items.map(item => ({ itemType: item.itemType, id: Number(item.id) })) }));
      const names = new Map();
      for (const entry of (details && Array.isArray(details.data) ? details.data : [])) {
        if (entry && Rk.isId(entry.id) && typeof entry.name === 'string') names.set(`${entry.itemType}:${entry.id}`, entry.name);
      }
      const tiles = items.map(item => {
        const bundle = item.itemType === 'Bundle';
        const name = names.get(`${item.itemType}:${item.id}`) || (bundle ? 'Bundle' : 'Item');
        return tile(`/${bundle ? 'bundles' : 'catalog'}/${item.id}`, ui.thumb(Rk.thumb(bundle ? 'BundleThumbnail' : 'Asset', item.id, '150x150'), { size: 64 }), name);
      });
      addSection('profile', ui.section('Marketplace creations', el('div', { class: 'rk-profile-tiles' }, tiles), { className: 'rk-profile-creations' }), 12);
    }
  });

  Rk.feature({
    id: 'profiles.copyName',
    category: 'profiles',
    name: 'Click to copy username',
    description: 'Copies the username when you click it in the profile header.',
    default: false,
    pages: PROFILE,
    css: `
.rk-profile-copyname { cursor: pointer; transition: opacity var(--rk-fast) ease; }
.rk-profile-copyname:hover { opacity: 0.75; }
`,
    async run() {
      const user = await profileUser();
      if (!user) return;
      const targets = new Set([`@${user.name}`, user.name]);
      Rk.observe('.user-profile-header :is(span, div, p, a, h1, h2, h3)', node => {
        if (node.children.length || node.closest('[data-rk-order]') || !targets.has(node.textContent.trim())) return;
        node.classList.add('rk-profile-copyname');
        node.setAttribute('data-rk-tip', 'Click to copy');
        node.setAttribute('data-rk-tip-pos', 'below');
        node.addEventListener('click', event => {
          event.preventDefault();
          ui.copy(user.name, 'Username copied');
        });
      });
    }
  });

  Rk.feature({
    id: 'profiles.fakeVerified',
    category: 'profiles',
    name: 'Verified badge on you',
    description: 'Shows a verified badge next to your name on your profile, in the sidebar and in the top bar, in any color. Only you can see it.',
    default: false,
    options: [
      { key: 'color', label: 'Badge color', type: 'color', default: '#0066ff' },
      { key: 'rgb', label: 'RGB badge that cycles colors', type: 'toggle', default: false }
    ],
    css: ctx => `.rk-self-badge { --rk-verified: ${ctx.option('rgb') ? '#ff2a6d' : ctx.option('color')}; flex: none; margin-left: 4px; vertical-align: middle; }
${ctx.option('rgb') ? `.rk-self-badge .rk-verified-shape { animation: rk-rgb-badge 3s linear infinite; }
@keyframes rk-rgb-badge { to { filter: hue-rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .rk-self-badge .rk-verified-shape { animation: none; } }` : ''}`,
    async run() {
      const me = await Rk.me();
      const display = me ? String(me.displayName || me.name).trim() : '';
      if (!display) return;
      const custom = key => (Rk.isEnabled('profiles.fakeName') ? String(Rk.option('profiles.fakeName', key) || '').trim().replace(/^@/, '') : '');
      const displays = [display, custom('displayName')].filter(Boolean);
      const usernames = [me.name, custom('username')].filter(Boolean);
      const tags = 'h1, h2, h3, h4, span, div, p, a';
      const selfBadge = size => {
        const badge = ui.verified({ size });
        badge.classList.add('rk-self-badge');
        return badge;
      };
      const mine = text => displays.includes(text) || usernames.includes(text.replace(/^@/, ''));
      Rk.observe('.age-bracket-label-username', node => {
        if (!mine(node.textContent.trim()) || (node.parentElement && node.parentElement.querySelector(':scope > .rk-self-badge'))) return;
        node.after(selfBadge(16));
      });
      Rk.observe(':is(#left-navigation-container, #navigation) a[href*="/users/"]', link => {
        if (link.querySelector('.rk-self-badge')) return;
        const name = [...link.querySelectorAll('span, div, p')].find(node => !node.firstElementChild && mine(node.textContent.trim()));
        if (name) name.after(selfBadge(14));
      });
      const add = node => {
        if (node.hasAttribute('data-rk-self-verified')) return;
        if (node.parentElement && node.parentElement.querySelector('[class*="verified" i]:not([class*="rk-verified"]), [data-testid*="verified" i]')) return;
        const style = getComputedStyle(node);
        const size = Math.round(Math.min(28, Math.max(14, (parseFloat(style.fontSize) || 16) * 0.8)));
        const beside = style.display.startsWith('inline') || /flex|grid/.test(node.parentElement ? getComputedStyle(node.parentElement).display : '');
        node.setAttribute('data-rk-self-verified', '');
        if (beside) node.after(selfBadge(size));
        else node.append(selfBadge(size));
      };
      const page = Rk.page();
      if (page.type === 'profile' && page.id === me.id) {
        const nameIn = (header, text) => [...header.querySelectorAll(tags)].find(node => node.textContent.trim() === text && ![...node.children].some(child => child.textContent.trim() === text) && !node.closest('[data-rk-order], .rk-section'));
        let queued = false;
        Rk.observe(`.user-profile-header :is(${tags})`, () => {
          if (queued) return;
          queued = true;
          queueMicrotask(() => {
            queued = false;
            for (const header of document.querySelectorAll('.user-profile-header')) {
              if (header.querySelector('[data-rk-self-verified]')) continue;
              const title = header.querySelector('#profile-header-title-container-name');
              if (title && displays.includes(title.textContent.trim())) {
                if (title.parentElement.querySelector('[class*="verified" i]')) continue;
                const badge = selfBadge(24);
                badge.style.cssText = 'width: var(--icon-size-large, 24px); height: var(--icon-size-large, 24px); margin: 0;';
                const group = title.nextElementSibling && title.nextElementSibling.classList.contains('shrink-0') ? title.nextElementSibling : null;
                title.setAttribute('data-rk-self-verified', '');
                if (group) group.prepend(badge);
                else title.after(el('span', { class: 'items-center gap-xxsmall inline-flex shrink-0' }, badge));
                continue;
              }
              const target = displays.map(text => nameIn(header, text)).find(Boolean) || usernames.map(name => nameIn(header, `@${name}`)).find(Boolean);
              if (target) add(target);
            }
          });
        });
      }
    }
  });

  Rk.feature({
    id: 'profiles.fakeName',
    category: 'profiles',
    name: 'Custom name on you',
    description: 'Swaps your display name and username for your own text. Only you can see it, nothing on your account changes.',
    default: false,
    options: [
      { key: 'displayName', label: 'Display name', type: 'text', maxLength: 50, placeholder: 'Your display name', default: '' },
      { key: 'username', label: 'Username', type: 'text', maxLength: 50, placeholder: 'Your username', default: '' }
    ],
    async run(ctx) {
      const me = await Rk.me();
      if (!me || !me.name) return;
      const swaps = () => {
        const map = new Map();
        const display = ctx.option('displayName').trim();
        const username = ctx.option('username').trim().replace(/^@/, '');
        if (username) {
          map.set(me.name, username);
          map.set(`@${me.name}`, `@${username}`);
        }
        if (display && me.displayName) map.set(me.displayName, display);
        return map;
      };
      let applied = swaps();
      let current = applied;
      const swapText = text => {
        if (!current.size || text.parentElement === null) return;
        if (text.parentElement.closest('script, style, textarea, input, [contenteditable], .rk-modal, .rk-settings')) return;
        const raw = text.nodeValue;
        const next = current.get(raw.trim());
        if (next === undefined) return;
        text.nodeValue = raw.replace(raw.trim(), next);
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
      Rk.domReady.then(() => swapIn(document.body));
      Rk.onSettings(() => {
        const next = Rk.isEnabled(ctx.id) ? swaps() : new Map();
        if ([...next].join() === [...applied].join()) return;
        current = new Map(next);
        for (const [key, value] of applied) current.set(value, next.has(key) ? next.get(key) : key);
        applied = next;
        swapIn(document.body);
      });
    }
  });

  Rk.feature({
    id: 'profiles.fakeBadges',
    category: 'profiles',
    name: 'Custom badges on you',
    description: 'Shows the Roblox badges, value tier and rare items you pick on your own profile. Only you can see them. Needs Roblox badges and Achievement badges on.',
    default: false,
    options: [
      { key: 'value', label: 'Value tier', type: 'select', choices: [['', 'Real value'], ...VALUE_TIERS.map(([, label]) => [label, label])], default: '' },
      ...RARES.map(([key, , label]) => ({ key, label: `${label} owner`, type: 'toggle', default: false })),
      ...ROBLOX_BADGES.map(([key, , name]) => ({ key, label: name, type: 'toggle', default: false }))
    ]
  });

  Rk.feature({
    id: 'profiles.pastNameHint',
    category: 'profiles',
    name: 'Previous name hint',
    description: 'Shows the most recent previous username under the name.',
    default: false,
    pages: PROFILE,
    css: `${headerCss}
.user-profile-header:has(> .rk-profile-hint) { flex-wrap: wrap !important; }
.rk-profile-hint { width: 100%; margin-top: 4px; font-family: var(--rk-font); font-size: 13px; }
`,
    async run() {
      const names = await pastNames();
      if (!names || !names.length) return;
      const hint = el('div', { class: 'rk-profile-hint rk-muted' }, `Previously ${names[0]}`);
      Rk.observe('.user-profile-header', header => place(header, hint, 2));
    }
  });

  Rk.feature({
    id: 'profiles.friendsSearch',
    category: 'profiles',
    name: 'Friends search',
    description: 'Adds a search box that filters friend lists as you type.',
    pages: FRIENDS,
    css: `${friendsCss}
.rk-friends-search { position: relative; display: flex; align-items: center; gap: 10px; flex: 1 1 280px; max-width: 440px; margin: 0; font-weight: 400; }
.rk-friends-search > .rk-icon { position: absolute; left: 10px; color: var(--rk-muted); pointer-events: none; }
.rk-friends-search .rk-input { padding-left: 34px; }
.rk-friends-count { flex: none; font-size: 13px; white-space: nowrap; }
[data-rk-search-out] { display: none !important; }
`,
    run() {
      let query = '';
      const textOf = card => {
        const names = [...card.querySelectorAll('.avatar-name, .avatar-card-label, .rk-profile-nick')];
        return (names.length ? names.map(node => node.textContent).join(' ') : card.textContent || '').toLowerCase();
      };
      const apply = card => card.toggleAttribute('data-rk-search-out', Boolean(query) && !textOf(card).includes(query));
      const field = ui.input({ placeholder: 'Search by name', maxLength: 60, onInput: value => {
        query = value.trim().toLowerCase();
        friendCards().forEach(apply);
        updateShown();
      } });
      field.setAttribute('aria-label', 'Search friends');
      place(friendsHost(), el('label', { class: 'rk-friends-search' }, icon('search', 16), field, el('span', { class: 'rk-friends-count rk-muted' })), 3);
      onCardBatch(cards => {
        cards.forEach(apply);
        updateShown();
      });
    }
  });

  Rk.feature({
    id: 'profiles.friendsFilters',
    category: 'profiles',
    name: 'Friends filters',
    description: 'Adds All, Online and In game filters to friend lists.',
    pages: FRIENDS,
    css: `${friendsCss}
[data-rk-filter-out] { display: none !important; }
`,
    run() {
      let mode = 'all';
      const keep = card => {
        if (mode === 'all') return true;
        const userId = userIdNear(card);
        const entry = userId ? presenceNow.get(userId) : null;
        return mode === 'game' ? presenceType(entry) === 2 : [1, 2, 3].includes(presenceType(entry));
      };
      const apply = card => card.toggleAttribute('data-rk-filter-out', !keep(card));
      const chips = [['all', 'All'], ['online', 'Online'], ['game', 'In game']].map(([value, label]) => {
        const chip = ui.button(label, { variant: 'ghost', onClick: () => {
          mode = value;
          sync();
          friendCards().forEach(apply);
          updateShown();
        } });
        chip.dataset.mode = value;
        return chip;
      });
      const sync = () => {
        for (const chip of chips) {
          const active = chip.dataset.mode === mode;
          chip.classList.toggle('rk-btn-active', active);
          chip.setAttribute('aria-pressed', active ? 'true' : 'false');
        }
      };
      sync();
      place(friendsHost(), el('div', { class: 'rk-inline', role: 'group', 'aria-label': 'Filter friends' }, chips), 4);
      onCardBatch(async cards => {
        cards.forEach(apply);
        await presenceOf(cards.map(userIdNear));
        cards.forEach(apply);
        updateShown();
      });
    }
  });

  Rk.feature({
    id: 'profiles.friendsSummary',
    category: 'profiles',
    name: 'Friends summary',
    description: 'Shows how many of your friends are online and in game.',
    pages: FRIENDS,
    css: friendsCss,
    async run() {
      if (!await ownFriendsPage()) return;
      const ids = await myFriendIds();
      if (!ids || !ids.length) return;
      const line = place(friendsHost(), el('div', { class: 'rk-friends-summary rk-muted' }, ui.spinner(14)), 2);
      const map = await presenceOf(ids);
      const known = ids.map(id => map.get(id)).filter(Boolean);
      if (!known.length) {
        line.remove();
        return;
      }
      const online = known.filter(entry => [1, 2, 3].includes(presenceType(entry))).length;
      const inGame = known.filter(entry => presenceType(entry) === 2).length;
      line.textContent = `${fmt.num(online)} online, ${fmt.num(inGame)} in game`;
    }
  });

  Rk.feature({
    id: 'profiles.friendsJoin',
    category: 'profiles',
    name: 'Join from friends list',
    description: 'Adds a join button to the cards of friends who are in a game.',
    pages: FRIENDS,
    css: `
.rk-friends-joinable { position: relative; }
.rk-friends-game { position: absolute; right: 10px; bottom: 10px; z-index: 1; }
.rk-friends-game .rk-btn.rk-btn-sm { height: 22px; padding: 0 8px; font-size: 12px; }
`,
    run() {
      const sync = async () => {
        const cards = friendCards();
        const map = await presenceOf(cards.map(userIdNear));
        for (const card of cards) {
          const userId = userIdNear(card);
          const entry = userId ? map.get(userId) : null;
          const joinable = presenceType(entry) === 2 && (Rk.isId(entry.rootPlaceId) || Rk.isId(entry.placeId));
          const current = card.querySelector('.rk-friends-game');
          if (current && joinable && current.dataset.userId === String(userId)) continue;
          if (current) current.remove();
          if (!joinable) continue;
          const target = card.querySelector('.avatar-card-container') || card;
          target.classList.add('rk-friends-joinable');
          target.append(el('div', { class: 'rk-friends-game', dataset: { userId: String(userId) } },
            ui.button('Join', { variant: 'primary', icon: 'play', onClick: event => {
              event.preventDefault();
              event.stopPropagation();
              Rk.launch.follow(userId);
            } })
          ));
        }
      };
      let queued = false;
      const schedule = () => {
        if (queued) return;
        queued = true;
        queueMicrotask(() => {
          queued = false;
          sync();
        });
      };
      const watched = new WeakSet();
      Rk.observe(CARD, card => {
        const list = card.closest('ul, ol') || card.parentElement;
        if (list && !watched.has(list)) {
          watched.add(list);
          new MutationObserver(schedule).observe(list, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['href'] });
        }
        schedule();
      });
    }
  });

  Rk.feature({
    id: 'profiles.favoriteFriends',
    category: 'profiles',
    name: 'Favorite friends',
    description: 'Adds a star to your friend cards. Starred friends move to the front of your friends list and the home friends row.',
    default: false,
    pages: ['friends', 'home'],
    css: `
.rk-friends-starrable { position: relative; }
.rk-friends-star { position: absolute; top: 8px; right: 8px; z-index: 1; display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; padding: 0; border: 0; border-radius: 999px; background: transparent; color: var(--rk-muted); cursor: pointer; opacity: 0; transition: opacity var(--rk-fast) ease, color var(--rk-fast) ease, transform var(--rk-fast) var(--rk-ease); }
.rk-friends-starrable:hover > .rk-friends-star, .rk-friends-star:focus-visible, .rk-friends-star[aria-pressed="true"] { opacity: 1; }
.rk-friends-star:hover { color: var(--rk-text-strong); }
.rk-friends-star[aria-pressed="true"] { color: #f5b400; }
.rk-friends-star[aria-pressed="true"] svg { fill: currentColor; }
.rk-friends-star:active { transform: scale(0.9); }
[data-rk-favorite] { order: -1; }
`,
    async run(ctx) {
      const favorites = () => {
        const list = Rk.store.get('friends.favorites', []);
        return new Set((Array.isArray(list) ? list : []).filter(Rk.isId).map(Number));
      };
      const tileId = tile => {
        const link = tile.querySelector('a[href*="/users/"]');
        return link ? Rk.idFrom(link.getAttribute('href'), 'user') : null;
      };
      if (Rk.page().type === 'home') {
        const marked = new Set();
        const markTile = tile => {
          const userId = tileId(tile);
          tile.toggleAttribute('data-rk-favorite', Boolean(userId) && Rk.isEnabled(ctx.id) && favorites().has(userId));
        };
        Rk.observe('.friends-carousel-tile', tile => {
          marked.add(tile);
          markTile(tile);
        });
        Rk.onSettings(() => {
          for (const tile of marked) {
            if (tile.isConnected) markTile(tile);
            else marked.delete(tile);
          }
        });
        return;
      }
      if (!await ownFriendsPage()) return;
      const sync = () => {
        const starred = favorites();
        for (const card of friendCards()) {
          const userId = userIdNear(card);
          const item = card.closest('li') || card;
          item.toggleAttribute('data-rk-favorite', Boolean(userId) && starred.has(userId));
          const target = card.querySelector('.avatar-card-container') || card;
          let star = target.querySelector(':scope > .rk-friends-star');
          if (!userId) {
            if (star) star.remove();
            continue;
          }
          if (!star) {
            star = el('button', { type: 'button', class: 'rk-friends-star' }, icon('star', 16));
            star.addEventListener('click', event => {
              event.preventDefault();
              event.stopPropagation();
              const id = Number(star.dataset.userId);
              const next = favorites();
              if (next.has(id)) next.delete(id);
              else next.add(id);
              Rk.store.set('friends.favorites', [...next].slice(-200));
              sync();
            });
            target.classList.add('rk-friends-starrable');
            target.append(star);
          }
          const on = starred.has(userId);
          if (star.dataset.userId !== String(userId)) star.dataset.userId = String(userId);
          if (star.getAttribute('aria-pressed') !== String(on)) {
            star.setAttribute('aria-pressed', String(on));
            star.setAttribute('aria-label', on ? 'Remove from favorites' : 'Add to favorites');
            star.title = on ? 'Remove from favorites' : 'Add to favorites';
          }
        }
      };
      let queued = false;
      const schedule = () => {
        if (queued) return;
        queued = true;
        queueMicrotask(() => {
          queued = false;
          sync();
        });
      };
      const watched = new WeakSet();
      Rk.observe(CARD, card => {
        const list = card.closest('ul, ol') || card.parentElement;
        if (list && !watched.has(list)) {
          watched.add(list);
          new MutationObserver(schedule).observe(list, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['href'] });
        }
        schedule();
      });
    }
  });

  Rk.feature({
    id: 'profiles.friendsExport',
    category: 'profiles',
    name: 'Export friends',
    description: 'Downloads your friends list as a CSV file.',
    default: false,
    pages: FRIENDS,
    css: `${friendsCss}
.rk-friends-export { margin-left: auto; }
`,
    async run() {
      if (!await ownFriendsPage()) return;
      const cell = value => {
        const text = String(value == null ? '' : value);
        const guarded = /^[=+\-@]/.test(text) ? `'${text}` : text;
        return /[",\r\n]/.test(guarded) ? `"${guarded.replace(/"/g, '""')}"` : guarded;
      };
      const button = ui.button('Export CSV', { icon: 'download', onClick: async () => {
        button.disabled = true;
        const ids = await myFriendIds();
        const users = ids && ids.length ? await safe(Rk.api.users(ids)) : null;
        button.disabled = false;
        if (ids && !ids.length) return ui.toast('No friends to export', { tone: 'warning' });
        if (!users) return ui.toast('Could not load your friends', { tone: 'danger' });
        const rows = [['id', 'username', 'display name'], ...ids.map(id => {
          const user = users.get(id);
          return [id, user ? user.name : '', user ? user.displayName : ''];
        })];
        const url = URL.createObjectURL(new Blob([`${rows.map(row => row.map(cell).join(',')).join('\r\n')}\r\n`], { type: 'text/csv' }));
        const anchor = el('a', { download: 'friends.csv' });
        anchor.href = url;
        document.body.append(anchor);
        anchor.click();
        anchor.remove();
        setTimeout(() => URL.revokeObjectURL(url), 0);
        ui.toast(`Exported ${fmt.plural(ids.length, 'friend')}`, { tone: 'success' });
      } });
      button.classList.add('rk-friends-export');
      place(friendsHost(), button, 5);
    }
  });

  Rk.feature({
    id: 'profiles.joinCard',
    category: 'profiles',
    name: 'Floating join bar on profiles',
    description: 'When someone is in an experience you can see, a bar slides up once you scroll past their profile header, with a Join button that takes you to their server.',
    default: false,
    pages: PROFILE,
    css: `
.rk-profile-sticky { position: fixed; left: 50%; bottom: 16px; z-index: 1050; box-sizing: border-box; display: flex; align-items: center; gap: 10px; width: min(480px, calc(100vw - 32px)); padding: 8px 8px 8px 10px; border: 1px solid var(--rk-border); border-radius: 12px; background: var(--rk-bg); color: var(--rk-text-strong); font-family: var(--rk-font); box-shadow: var(--rk-shadow); visibility: hidden; transform: translate(-50%, calc(100% + 24px)); transition: transform var(--rk-med) var(--rk-ease), visibility 0s linear var(--rk-med); }
.rk-profile-sticky.rk-profile-sticky-show { visibility: visible; transform: translate(-50%, 0); transition: transform var(--rk-med) var(--rk-ease), visibility 0s; }
.rk-profile-sticky .rk-thumb { flex: none; }
.rk-profile-sticky-icon { border-radius: 8px; }
.rk-profile-sticky-text { display: flex; flex: 1; flex-direction: column; min-width: 0; }
.rk-profile-sticky-user { overflow: hidden; font-size: 12px; color: var(--rk-muted); white-space: nowrap; text-overflow: ellipsis; }
.rk-profile-sticky-game { overflow: hidden; font-size: 15px; font-weight: 700; color: var(--rk-text-strong) !important; white-space: nowrap; text-overflow: ellipsis; text-decoration: none !important; }
.rk-profile-sticky-game:hover { text-decoration: underline !important; }
@media (prefers-reduced-motion: reduce) { .rk-profile-sticky, .rk-profile-sticky.rk-profile-sticky-show { transition: none; } }
`,
    async run(ctx) {
      const id = profileId();
      const [me, user] = await Promise.all([Rk.me(), profileUser()]);
      if (!id || !user || (me && me.id === id)) return;
      const entry = (await presenceOf([id])).get(id);
      const placeId = entry && Number(entry.placeId || entry.rootPlaceId);
      if (presenceType(entry) !== 2 || !Rk.isId(placeId)) return;
      const universeId = Rk.isId(Number(entry.universeId)) ? Number(entry.universeId) : await safe(Rk.api.universeId(placeId));
      const name = typeof entry.lastLocation === 'string' && entry.lastLocation ? entry.lastLocation : 'Experience';
      const jobId = typeof entry.gameId === 'string' ? entry.gameId : null;
      const bar = el('div', { class: 'rk-profile-sticky', role: 'region', 'aria-label': 'Join bar' },
        ui.thumb(Rk.thumb('AvatarHeadShot', id, '150x150'), { size: 36, round: true, alt: '' }),
        ui.thumb(universeId ? Rk.thumb('GameIcon', universeId, '150x150') : Promise.resolve(null), { size: 36, alt: '', className: 'rk-profile-sticky-icon' }),
        el('span', { class: 'rk-profile-sticky-text' },
          el('span', { class: 'rk-profile-sticky-user' }, `${user.displayName || user.name} is playing`),
          el('a', { class: 'rk-profile-sticky-game', href: `/games/${placeId}`, title: name }, name)
        ),
        ui.button('Join', { variant: 'primary', size: 'md', icon: 'play', onClick: () => {
          if (jobId) Rk.launch.server(placeId, jobId);
          else Rk.launch.follow(id);
        } })
      );
      document.body.append(bar);
      let watched = null;
      let past = false;
      const sync = () => bar.classList.toggle('rk-profile-sticky-show', past && Rk.isEnabled(ctx.id));
      const io = new IntersectionObserver(entries => {
        const last = entries[entries.length - 1];
        const rect = last && last.boundingClientRect;
        past = Boolean(last && !last.isIntersecting && rect && rect.bottom < 0);
        sync();
      });
      const watch = target => {
        if (target === watched) return;
        watched = target;
        io.disconnect();
        io.observe(target);
      };
      const joinButton = header => [...header.querySelectorAll('button, a')].find(node => /^(join|play)$/i.test(node.textContent.trim()) && !bar.contains(node));
      Rk.observe('.user-profile-header', header => {
        watch(joinButton(header) || header);
        new MutationObserver(() => {
          const button = joinButton(header);
          if (button) watch(button);
        }).observe(header, { childList: true, subtree: true });
      });
      Rk.onSettings(sync);
    }
  });

  const ROLA_BADGES = [
    ['creator', 'Creator', 'star', 'Rola Creator'],
    ['contributor', 'Contributor', 'edit', 'Rola Contributor'],
    ['donator', 'Donator', 'heart', 'Rola Donator']
  ];

  Rk.feature({
    id: 'profiles.rolaBadges',
    category: 'profiles',
    name: 'Rola badges',
    description: 'Shows Rola Creator, Contributor and Donator badges under the name of people who have them.',
    pages: PROFILE,
    css: `${statusCss}
.rk-rola-badge { display: inline-flex; align-items: center; gap: 4px; font-weight: 700; cursor: default; }
.rk-rola-badge-creator { color: #f5b300; }
.rk-rola-badge-contributor { color: #3b82f6; }
.rk-rola-badge-donator { color: #ec4899; }
.rk-rola-badge .rk-icon { fill: currentColor; }
`,
    async run() {
      const id = profileId();
      if (!id) return;
      const all = await Rk.bg('rola-badges').catch(() => null);
      const owned = all && typeof all === 'object' && Array.isArray(all[id]) ? all[id] : [];
      const badges = ROLA_BADGES.filter(([key]) => owned.includes(key));
      badges.forEach(([key, label, iconName, tip], index) => {
        addStatus(ui.tip(el('span', { class: `rk-profile-state rk-rola-badge rk-rola-badge-${key}` }, icon(iconName, 14), label), tip), 6 + index);
      });
    }
  });

  Rk.feature({
    id: 'profiles.terminatedView',
    category: 'profiles',
    name: 'View terminated accounts',
    description: 'When you open a banned account, shows what is still public about it: names, join date, description, past usernames, counts and communities.',
    default: false,
    css: `
.rk-terminated { max-width: 970px; margin: 24px auto; padding: 0 12px; }
.rk-terminated-head { display: flex; align-items: center; gap: 16px; margin-bottom: 18px; }
.rk-terminated-face { flex: none; display: flex; align-items: center; justify-content: center; width: 110px; height: 110px; border-radius: 50%; background: var(--rk-surface); color: var(--rk-muted); overflow: hidden; }
.rk-terminated-name { margin: 0; font-size: 28px; font-weight: 700; color: var(--rk-text-strong); }
.rk-terminated-user { font-size: 15px; color: var(--rk-muted); }
.rk-terminated-banned { color: var(--rk-danger); font-weight: 700; }
.rk-terminated-desc { margin: 0 0 18px; white-space: pre-wrap; word-break: break-word; color: var(--rk-text); }
.rk-terminated-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.rk-terminated-chip { padding: 4px 10px; border-radius: 999px; background: var(--rk-shift); font-size: 13px; color: var(--rk-text-strong); }
.rk-terminated-groups { display: grid; gap: 8px; }
.rk-terminated-group { display: flex; align-items: center; gap: 10px; color: var(--rk-text) !important; text-decoration: none !important; }
`,
    async run() {
      document.addEventListener('click', event => {
        const link = event.target instanceof Element ? event.target.closest('a[href*="/users/"]') : null;
        const match = link && /\/users\/(\d+)\/profile/.exec(link.getAttribute('href') || '');
        if (!match) return;
        try {
          sessionStorage.setItem('rk-last-profile', JSON.stringify({ id: Number(match[1]), at: Date.now() }));
        } catch {}
      }, true);
      const lastClicked = () => {
        try {
          const saved = JSON.parse(sessionStorage.getItem('rk-last-profile') || 'null');
          return saved && Rk.isId(saved.id) && Date.now() - saved.at < 30000 ? saved.id : null;
        } catch {
          return null;
        }
      };
      const errorPage = /\/request-error/i.test(location.pathname);
      const asked = Number(new URLSearchParams(location.search).get('rk-user'));
      const id = Rk.page().type === 'profile' ? profileId() : errorPage ? (Rk.isId(asked) ? asked : lastClicked()) : null;
      if (!id) return;
      const user = await safe(Rk.api.get(`https://users.roblox.com/v1/users/${id}`));
      if (!user || user.isBanned !== true) return;
      const count = kind => safe(Rk.api.get(`https://friends.roblox.com/v1/users/${id}/${kind}/count`)).then(json => (json && Number.isSafeInteger(json.count) ? json.count : null));
      const [history, groups, friends, followers, following, face] = await Promise.all([
        safe(Rk.api.paged(`https://users.roblox.com/v1/users/${id}/username-history?sortOrder=Desc`, { max: 100, limit: 100 })),
        safe(Rk.api.get(`https://groups.roblox.com/v2/users/${id}/groups/roles`)),
        count('friends'),
        count('followers'),
        count('followings'),
        safe(Rk.thumb('AvatarHeadShot', id, '150x150'))
      ]);
      const created = user.created ? new Date(user.created) : null;
      const pastNames = (Array.isArray(history) ? history : []).map(entry => entry && entry.name).filter(name => typeof name === 'string' && name);
      const groupList = groups && Array.isArray(groups.data) ? groups.data.filter(entry => entry && entry.group && Rk.isId(entry.group.id)) : [];
      const stats = [
        ['User ID', String(id)],
        ['Joined', created && !Number.isNaN(created.getTime()) ? created.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'Unknown'],
        ['Friends', friends === null ? 'Hidden' : fmt.num(friends)],
        ['Followers', followers === null ? 'Hidden' : fmt.num(followers)],
        ['Following', following === null ? 'Hidden' : fmt.num(following)]
      ];
      const content = el('div', null,
        el('div', { class: 'rk-terminated-head' },
          el('div', { class: 'rk-terminated-face' }, face ? ui.thumb(Promise.resolve(face), { size: 110, round: true, alt: user.name }) : icon('user', 44)),
          el('div', null,
            el('h1', { class: 'rk-terminated-name' }, String(user.displayName || user.name)),
            el('div', { class: 'rk-terminated-user' }, `@${user.name} · `, el('span', { class: 'rk-terminated-banned' }, 'Terminated'))
          )
        ),
        typeof user.description === 'string' && user.description.trim() ? el('p', { class: 'rk-terminated-desc' }, user.description.trim()) : null,
        ui.stats(stats.map(([label, value]) => ui.stat(label, value))),
        pastNames.length ? ui.section(`Past usernames (${pastNames.length})`, el('div', { class: 'rk-terminated-chips' }, pastNames.map(name => el('span', { class: 'rk-terminated-chip' }, name)))) : null,
        groupList.length ? ui.section(`Communities (${groupList.length})`, el('div', { class: 'rk-terminated-groups' }, groupList.slice(0, 50).map(entry => el('a', { class: 'rk-terminated-group', href: `/communities/${entry.group.id}` },
          ui.thumb(Rk.thumb('GroupIcon', entry.group.id, '150x150'), { size: 36, alt: '' }),
          el('span', null, String(entry.group.name || 'Community'), entry.role && entry.role.name ? el('span', { class: 'rk-muted' }, ` · ${entry.role.name}`) : null)
        )))) : null
      );
      const section = el('div', { class: 'rk-terminated' }, content);
      Rk.mount(['#content', '.content', 'main', 'body'], section, { position: 'append' });
    }
  });

  Rk.feature({
    id: 'profiles.bestFriends',
    category: 'profiles',
    name: 'Best friends',
    description: 'Mark friends as best friends and see them in their own row above your friends on the home page and friends page.',
    default: false,
    pages: ['profile', 'friends', 'home'],
    css: `${headerCss}
.rk-friends-best-section { margin-bottom: 24px; }
.rk-home-best { margin-bottom: 18px; }
.rk-home-best .rk-friends-best { display: flex; gap: 8px; overflow-x: auto; overscroll-behavior-x: contain; scrollbar-width: none; }
.rk-home-best .rk-best-card { flex: none; width: 100px; padding: 8px 4px; background: transparent; }
.rk-home-best .rk-best-card:hover { background: var(--rk-hover); }
.rk-home-best .rk-best-dot { border-color: var(--rk-bg); }
.rk-home-best .rk-best-name { font-size: 13px; }
.rk-friends-best { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; }
.rk-best-card { display: flex; flex-direction: column; align-items: center; gap: 6px; min-width: 0; padding: 14px 10px 12px; border-radius: 8px; background: var(--rk-surface); color: var(--rk-text) !important; text-decoration: none !important; transition: background-color var(--rk-fast) ease; }
.rk-best-card:hover { background: var(--rk-hover); }
.rk-best-face { position: relative; display: inline-flex; }
.rk-best-dot { position: absolute; right: 2px; bottom: 2px; width: 16px; height: 16px; box-sizing: border-box; border: 3px solid var(--rk-surface); border-radius: 50%; }
.rk-best-dot[data-state="online"] { background: #00a2ff; }
.rk-best-dot[data-state="game"] { background: #02b757; }
.rk-best-dot[data-state="studio"] { background: #f68802; }
.rk-best-dot[data-state="offline"] { display: none; }
.rk-best-name { display: flex; align-items: center; gap: 4px; max-width: 100%; font-size: 15px; font-weight: 600; color: var(--rk-text-strong); }
.rk-best-name > span { min-width: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.rk-best-status { max-width: 100%; overflow: hidden; font-size: 12px; color: var(--rk-muted); white-space: nowrap; text-overflow: ellipsis; }
.rk-best-status[data-state="online"] { color: #00a2ff; }
.rk-best-status[data-state="game"] { color: #02b757; }
.rk-best-status[data-state="studio"] { color: #f68802; }
.rk-best-empty { padding: 4px 0; font-size: 14px; color: var(--rk-muted); }
.rk-friends-heartable { position: relative; }
.rk-friends-heart { position: absolute; top: 8px; left: 8px; z-index: 1; display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; padding: 0; border: 0; border-radius: 999px; background: transparent; color: var(--rk-muted); cursor: pointer; opacity: 0; transition: opacity var(--rk-fast) ease, color var(--rk-fast) ease, transform var(--rk-fast) var(--rk-ease); }
.rk-best-card { position: relative; }
.rk-friends-heartable:hover > .rk-friends-heart, .rk-best-card:hover > .rk-friends-heart, .rk-friends-heart:focus-visible, .rk-friends-heart[aria-pressed="true"] { opacity: 1; }
.rk-friends-heart:hover { color: var(--rk-text-strong); }
.rk-friends-heart[aria-pressed="true"] { color: #ff4d6d; }
.rk-friends-heart[aria-pressed="true"] svg { fill: currentColor; }
.rk-friends-heart:active { transform: scale(0.9); }
`,
    async run() {
      const bestList = () => {
        const list = Rk.store.get('friends.best', []);
        return Array.isArray(list) ? [...new Set(list.map(Number).filter(Rk.isId))].slice(0, 50) : [];
      };
      const friendsAmong = async ids => {
        const me = await Rk.me();
        if (!me || !ids.length) return null;
        const json = await safe(Rk.api.get(`https://friends.roblox.com/v1/users/${me.id}/friends/statuses?userIds=${ids.join(',')}`));
        if (!json || !Array.isArray(json.data)) return null;
        return new Set(json.data.filter(entry => entry && entry.status === 'Friends').map(entry => Number(entry.id)).filter(Rk.isId));
      };
      const prune = async () => {
        const ids = bestList();
        const friends = await friendsAmong(ids);
        if (!friends) return ids;
        const kept = ids.filter(id => friends.has(id));
        if (kept.length !== ids.length) Rk.store.set('friends.best', kept);
        return kept;
      };
      const states = ['offline', 'online', 'game', 'studio'];
      const cardFor = (userId, users, presence, size) => {
        const user = users && users.get(userId);
        const entry = presence.get(userId);
        const state = states[presenceType(entry)] || 'offline';
        const where = entry && typeof entry.lastLocation === 'string' && entry.lastLocation ? entry.lastLocation : '';
        const status = { online: 'Online', game: where || 'In game', studio: where ? `Studio: ${where}` : 'In Studio', offline: 'Offline' }[state];
        const name = user ? String(user.displayName || user.name) : `User ${userId}`;
        return el('a', { class: 'rk-best-card', href: `/users/${userId}/profile`, title: user ? `@${user.name}` : name },
          el('span', { class: 'rk-best-face' },
            ui.thumb(Rk.thumb('AvatarHeadShot', userId, '150x150'), { size, round: true }),
            el('span', { class: 'rk-best-dot', dataset: { state } })
          ),
          el('span', { class: 'rk-best-name' }, el('span', null, name), mark(isVerified(userId, user && user.hasVerifiedBadge))),
          el('span', { class: 'rk-best-status', dataset: { state } }, status)
        );
      };
      if (Rk.page().type === 'home') {
        const ids = await prune();
        if (!ids.length) return;
        const [users, presence] = await Promise.all([safe(Rk.api.users(ids)), presenceOf(ids)]);
        const row = ui.section(`Best friends (${ids.length})`, el('div', { class: 'rk-friends-best' }, ids.map(userId => cardFor(userId, users, presence, 84))), { className: 'rk-home-best' });
        const best = new Set(ids);
        Rk.observe('.friends-carousel-tile', tile => {
          const link = tile.querySelector('a[href*="/users/"]');
          const match = link && /\/users\/(\d+)/.exec(link.getAttribute('href'));
          if (match && best.has(Number(match[1]))) tile.classList.add('rk-hidden');
        });
        Rk.observe('.friends-carousel-container', carousel => {
          if (row.isConnected) return;
          let block = carousel;
          for (let depth = 0; depth < 6 && block.parentElement && block.parentElement !== document.body; depth += 1) {
            block = block.parentElement;
            const heading = [...block.querySelectorAll('.container-header, h2, h3')].find(node => !carousel.contains(node));
            if (heading) break;
          }
          block.before(row);
        });
        return;
      }
      if (Rk.page().type === 'profile') {
        const id = profileId();
        const me = await Rk.me();
        if (!id || !me || me.id === id) return;
        const friends = await friendsAmong([id]);
        if (!friends) return;
        if (!friends.has(id)) {
          if (bestList().includes(id)) Rk.store.set('friends.best', bestList().filter(item => item !== id));
          return;
        }
        const button = ui.button('Best friend', { icon: 'star', onClick: () => {
          const list = bestList();
          const active = list.includes(id);
          if (!active && list.length >= 50) return ui.toast('You can have up to 50 best friends', { tone: 'warning' });
          Rk.store.set('friends.best', active ? list.filter(item => item !== id) : [id, ...list]);
          sync();
          ui.toast(active ? 'Removed from best friends' : 'Added to best friends', { tone: 'success' });
        } });
        const sync = () => {
          const active = bestList().includes(id);
          button.classList.toggle('rk-btn-active', active);
          button.setAttribute('aria-pressed', active ? 'true' : 'false');
          button.querySelector('span').textContent = active ? 'Best friend' : 'Add to best friends';
        };
        sync();
        addTool(button, 7);
        return;
      }
      if (!await ownFriendsPage()) return;
      const followTab = () => /follow/i.test(location.hash);
      const grid = el('div', { class: 'rk-friends-best' });
      const section = ui.section('Best friends', grid, { className: 'rk-friends-best-section' });
      const heading = section.querySelector('.rk-section-title');
      const render = async () => {
        const ids = bestList();
        heading.textContent = ids.length ? `Best friends (${ids.length})` : 'Best friends';
        if (!ids.length) {
          grid.replaceChildren(el('div', { class: 'rk-best-empty' }, 'Click the heart on a friend to pin them here'));
          return;
        }
        const [users, presence] = await Promise.all([safe(Rk.api.users(ids)), presenceOf(ids)]);
        if (bestList().join() !== ids.join()) return;
        grid.replaceChildren(...ids.map(userId => {
          const card = cardFor(userId, users, presence, 84);
          const heart = el('button', { type: 'button', class: 'rk-friends-heart', 'aria-pressed': 'true', 'aria-label': 'Remove from best friends', title: 'Remove from best friends' }, icon('heart', 16));
          heart.addEventListener('click', event => {
            event.preventDefault();
            event.stopPropagation();
            Rk.store.set('friends.best', bestList().filter(item => item !== userId));
            syncHearts();
            render();
          });
          card.append(heart);
          return card;
        }));
      };
      const syncHearts = () => {
        const best = new Set(bestList());
        const hidden = followTab();
        section.classList.toggle('rk-hidden', hidden);
        for (const card of friendCards()) {
          if (card.closest('.rk-friends-best-section')) continue;
          const userId = userIdNear(card);
          const target = card.querySelector('.avatar-card-container') || card;
          let heart = target.querySelector(':scope > .rk-friends-heart');
          card.classList.toggle('rk-hidden', Boolean(userId) && !hidden && best.has(userId));
          if (!userId || hidden) {
            if (heart) heart.remove();
            continue;
          }
          if (!heart) {
            heart = el('button', { type: 'button', class: 'rk-friends-heart' }, icon('heart', 16));
            heart.addEventListener('click', async event => {
              event.preventDefault();
              event.stopPropagation();
              const id = Number(heart.dataset.userId);
              const list = bestList();
              if (list.includes(id)) {
                Rk.store.set('friends.best', list.filter(item => item !== id));
              } else {
                if (list.length >= 50) return ui.toast('You can have up to 50 best friends', { tone: 'warning' });
                const friends = await friendsAmong([id]);
                if (!friends || !friends.has(id)) return ui.toast('Only friends can be best friends', { tone: 'warning' });
                Rk.store.set('friends.best', [id, ...bestList().filter(item => item !== id)]);
              }
              syncHearts();
              render();
            });
            target.classList.add('rk-friends-heartable');
            target.append(heart);
          }
          const on = best.has(userId);
          if (heart.dataset.userId !== String(userId)) heart.dataset.userId = String(userId);
          if (heart.getAttribute('aria-pressed') !== String(on)) {
            heart.setAttribute('aria-pressed', String(on));
            heart.setAttribute('aria-label', on ? 'Remove from best friends' : 'Add to best friends');
            heart.title = on ? 'Remove from best friends' : 'Add to best friends';
          }
        }
      };
      let queued = false;
      const schedule = () => {
        if (queued) return;
        queued = true;
        queueMicrotask(() => {
          queued = false;
          syncHearts();
        });
      };
      const watched = new WeakSet();
      Rk.observe(CARD, card => {
        if (card.closest('.rk-friends-best-section')) return;
        const list = card.closest('ul, ol') || card.parentElement;
        if (list && !section.isConnected && list.parentElement) {
          const bar = list.previousElementSibling && list.previousElementSibling.classList.contains('rk-friends-bar') ? list.previousElementSibling : null;
          (bar || list).before(section);
        }
        if (list && !watched.has(list)) {
          watched.add(list);
          new MutationObserver(schedule).observe(list, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['href'] });
        }
        schedule();
      });
      window.addEventListener('hashchange', schedule);
      await prune();
      render();
    }
  });

  Rk.feature({
    id: 'profiles.quickUnfriend',
    category: 'profiles',
    name: 'Quick unfriend',
    description: 'Adds a trash button to the cards on your friends list that unfriends them right away.',
    default: false,
    pages: FRIENDS,
    css: `
.rk-friends-unfriendable { position: relative; }
.rk-friends-unfriend { position: absolute; bottom: 8px; left: 8px; z-index: 1; display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; padding: 0; border: 0; border-radius: 999px; background: var(--rk-shift); color: var(--rk-muted); cursor: pointer; opacity: 0; transition: opacity var(--rk-fast) ease, color var(--rk-fast) ease, background-color var(--rk-fast) ease; }
.rk-friends-unfriendable:hover > .rk-friends-unfriend, .rk-friends-unfriend:focus-visible { opacity: 1; }
.rk-friends-unfriend:hover { background: var(--rk-danger-soft); color: var(--rk-danger); }
.rk-friends-unfriend[disabled] { opacity: 0.5; pointer-events: none; }
[data-rk-unfriended] { display: none !important; }
`,
    async run(ctx) {
      if (!await ownFriendsPage()) return;
      const sync = () => {
        const hidden = /follow/i.test(location.hash) || !Rk.isEnabled(ctx.id);
        for (const card of friendCards()) {
          if (card.closest('.rk-friends-best-section')) continue;
          const userId = userIdNear(card);
          const target = card.querySelector('.avatar-card-container') || card;
          let button = target.querySelector(':scope > .rk-friends-unfriend');
          if (!userId || hidden) {
            if (button) button.remove();
            continue;
          }
          if (!button) {
            button = el('button', { type: 'button', class: 'rk-friends-unfriend', title: 'Unfriend', 'aria-label': 'Unfriend' }, icon('trash', 15));
            button.addEventListener('click', async event => {
              event.preventDefault();
              event.stopPropagation();
              const id = Number(button.dataset.userId);
              const name = button.dataset.name || 'this friend';
              button.disabled = true;
              const result = await safe(Rk.api.post(`https://friends.roblox.com/v1/users/${id}/unfriend`, {}));
              button.disabled = false;
              if (!result) return ui.toast('Could not unfriend', { tone: 'danger' });
              const item = button.closest('li') || button.closest('.avatar-card') || target;
              item.setAttribute('data-rk-unfriended', '');
              const best = Rk.store.get('friends.best', []);
              if (Array.isArray(best) && best.map(Number).includes(id)) Rk.store.set('friends.best', best.map(Number).filter(item => item !== id));
              ui.toast(`Unfriended ${name}`, { tone: 'success' });
            });
            target.classList.add('rk-friends-unfriendable');
            target.append(button);
          }
          const nameNode = card.querySelector('.avatar-name, .avatar-card-label');
          button.dataset.name = nameNode ? nameNode.textContent.trim().slice(0, 60) : '';
          if (button.dataset.userId !== String(userId)) {
            button.dataset.userId = String(userId);
            const item = button.closest('li') || target;
            item.removeAttribute('data-rk-unfriended');
          }
        }
      };
      let queued = false;
      const schedule = () => {
        if (queued) return;
        queued = true;
        queueMicrotask(() => {
          queued = false;
          sync();
        });
      };
      const watched = new WeakSet();
      Rk.observe(CARD, card => {
        const list = card.closest('ul, ol') || card.parentElement;
        if (list && !watched.has(list)) {
          watched.add(list);
          new MutationObserver(schedule).observe(list, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['href'] });
        }
        schedule();
      });
      window.addEventListener('hashchange', schedule);
      Rk.onSettings(schedule);
    }
  });

  Rk.feature({
    id: 'profiles.groupFunds',
    category: 'profiles',
    name: 'Community funds on hover',
    description: 'Hover a community you own to see how many Robux it has.',
    default: false,
    css: `
.rk-group-funds { position: absolute; z-index: 2147481000; display: flex; align-items: center; gap: 6px; padding: 6px 10px; border: 1px solid var(--rk-border); border-radius: 8px; background: var(--rk-bg); box-shadow: var(--rk-shadow); color: var(--rk-text); font-family: var(--rk-font); font-size: 13px; pointer-events: none; opacity: 0; transform: translateY(4px); transition: opacity var(--rk-fast) ease, transform var(--rk-fast) var(--rk-ease); }
.rk-group-funds.rk-group-funds-open { opacity: 1; transform: none; }
.rk-group-funds .rk-robux { font-weight: 700; color: var(--rk-text-strong); }
`,
    run(ctx) {
      const funds = new Map();
      const tip = el('div', { class: 'rk-group-funds', role: 'tooltip' });
      let current = null;
      const owned = Rk.me().then(me => (me ? groupsOf(me.id) : null)).then(groups => new Set((groups || []).filter(group => group.rank === 255).map(group => group.id)));
      const fundsOf = id => {
        const hit = funds.get(id);
        if (hit && Date.now() - hit.time < 180000) return hit.promise;
        const promise = safe(Rk.api.get(`https://economy.roblox.com/v1/groups/${id}/currency`)).then(json => (json && Number.isSafeInteger(json.robux) && json.robux >= 0 ? json.robux : null));
        funds.set(id, { time: Date.now(), promise });
        return promise;
      };
      const hide = () => {
        current = null;
        tip.classList.remove('rk-group-funds-open');
      };
      Rk.domReady.then(() => document.body.append(tip));
      document.addEventListener('mouseover', async event => {
        if (!Rk.isEnabled(ctx.id) || !(event.target instanceof Element)) return;
        const link = event.target.closest('a[href*="/communities/"], a[href*="/groups/"]');
        if (!link || link === current) return;
        if (link.closest('.rk-group-funds')) return;
        const id = Rk.idFrom(link.getAttribute('href'), 'group');
        if (!id || !(await owned).has(id)) return;
        current = link;
        const robux = await fundsOf(id);
        if (current !== link || robux === null) return;
        tip.replaceChildren(el('span', { class: 'rk-muted' }, 'Funds'), ui.robux(robux));
        const rect = link.getBoundingClientRect();
        tip.style.left = `${Math.round(rect.left + window.scrollX)}px`;
        tip.style.top = `${Math.round(rect.bottom + window.scrollY + 6)}px`;
        tip.classList.add('rk-group-funds-open');
      });
      document.addEventListener('mouseout', event => {
        if (!current || !(event.target instanceof Element)) return;
        const next = event.relatedTarget;
        if (next instanceof Node && current.contains(next)) return;
        if (current.contains(event.target)) hide();
      });
      Rk.onSettings(() => {
        if (!Rk.isEnabled(ctx.id)) hide();
      });
    }
  });

  Rk.feature({
    id: 'profiles.groupInfo',
    category: 'profiles',
    name: 'Community details',
    description: 'Shows the community ID, owner, entry type and shout details.',
    pages: GROUP,
    css: `${copyableCss}
.rk-group-owner { display: inline-flex; align-items: center; gap: 6px; max-width: 100%; min-width: 0; }
.rk-group-top:not(:empty) { margin-bottom: 10px; }
.rk-group-shout, .rk-group-extra:not(:empty) { margin-top: 10px; font-size: 13px; }
`,
    async run() {
      const id = groupId();
      const group = id ? await safe(Rk.api.get(`https://groups.roblox.com/v1/groups/${id}`, { cache: 600000 })) : null;
      if (!group || typeof group !== 'object') return;
      const shout = group.shout && typeof group.shout === 'object' ? group.shout : null;
      const people = [group.owner, shout && shout.poster].filter(user => user && typeof user === 'object' && Rk.isId(user.userId));
      const [users] = await Promise.all([people.length ? safe(Rk.api.users(people.map(user => user.userId))) : null, meLoaded]);
      const person = user => {
        if (!people.includes(user)) return null;
        const info = users ? users.get(Number(user.userId)) : null;
        return el('span', { class: 'rk-profile-named' },
          ui.link(`/users/${user.userId}/profile`, String(user.displayName || user.username || user.userId)),
          mark(isVerified(user.userId, user.hasVerifiedBadge === true || Boolean(info && info.hasVerifiedBadge === true)))
        );
      };
      const ownerName = person(group.owner);
      const owner = ownerName ? el('span', { class: 'rk-group-owner' }, ui.thumb(Rk.thumb('AvatarHeadShot', group.owner.userId, '150x150'), { size: 24, round: true }), ownerName) : null;
      const poster = shout ? person(shout.poster) : null;
      const posted = shout && toTime(shout.updated) ? fmt.dateTime(shout.updated) : null;
      const entry = group.publicEntryAllowed === true ? 'Anyone can join' : group.publicEntryAllowed === false ? 'Approval needed' : '-';
      const title = ['Community details', group.hasVerifiedBadge === true ? ui.verified({ size: 16, title: 'Verified community' }) : null];
      addSection('group', ui.section(title, [
        el('div', { class: 'rk-group-top rk-inline' }),
        ui.stats([
          ['Community ID', el('span', { class: 'rk-profile-copyable' }, String(id), ui.button('', { variant: 'ghost', icon: 'copy', title: 'Copy community ID', onClick: () => ui.copy(String(id), 'Community ID copied') }))],
          ['Owner', owner || 'No owner'],
          ['Public entry', entry]
        ]),
        poster || posted ? el('div', { class: 'rk-group-shout rk-muted' }, poster ? ['Shout by ', poster] : 'Shout posted', posted ? ` on ${posted}` : null) : null,
        el('div', { class: 'rk-group-extra' })
      ], { className: 'rk-group-details', actions: [] }), 1);
    }
  });

  Rk.feature({
    id: 'profiles.groupGames',
    category: 'profiles',
    name: 'Community experiences',
    description: 'Lists the experiences of the community with visits and active players in place of the Roblox list.',
    pages: GROUP,
    css: `${listCss}${nativeCss('groupgames', 'group-games')}`,
    run: replacing('groupgames', async () => {
      const id = groupId();
      const list = id ? await safe(Rk.api.paged(`https://games.roblox.com/v2/groups/${id}/games?accessFilter=Public&sortOrder=Desc`, { max: 100, limit: 50 })) : null;
      const games = Array.isArray(list) ? list.filter(game => game && Rk.isId(game.id) && game.rootPlace && Rk.isId(game.rootPlace.id)) : [];
      if (!games.length) return;
      const live = await safe(Rk.api.games(games.map(game => game.id)));
      const rows = games.map(game => {
        const info = live ? live.get(Number(game.id)) : null;
        const playing = info && Number.isFinite(info.playing) ? info.playing : null;
        const visits = info && Number.isFinite(info.visits) ? info.visits : Number(game.placeVisits) || 0;
        return entryRow(
          ui.thumb(Rk.thumb('GameIcon', game.id, '150x150'), { size: 40 }),
          `/games/${game.rootPlace.id}`,
          typeof game.name === 'string' && game.name ? game.name : 'Experience',
          null,
          [playing === null ? null : ui.pill(`${fmt.num(playing)} playing`, playing > 0 ? 'success' : 'neutral'), el('span', { class: 'rk-muted' }, fmt.plural(visits, 'visit'))]
        );
      });
      const [rowsNode, more] = collapsible(rows, 8);
      return addSection('group', ui.section('Community experiences', rowsNode, { className: 'rk-group-games', actions: [ui.pill(fmt.num(games.length)), more] }), 2, { replace: 'group-games' });
    })
  });

  Rk.feature({
    id: 'profiles.groupRoles',
    category: 'profiles',
    name: 'Community roles',
    description: 'Shows every role in the community. Open a role to see its members.',
    pages: GROUP,
    css: `${tilesCss}
.rk-group-role { border-bottom: 1px solid var(--rk-border); }
.rk-group-role:last-child { border-bottom: 0; }
.rk-group-role > summary { display: flex; align-items: center; gap: 12px; padding: 10px 4px; cursor: pointer; list-style: none; font-family: var(--rk-font); font-size: 14px; }
.rk-group-role > summary::-webkit-details-marker { display: none; }
.rk-group-role > summary::before { content: ''; flex: none; width: 6px; height: 6px; border-right: 2px solid var(--rk-muted); border-bottom: 2px solid var(--rk-muted); transform: rotate(-45deg); transition: transform var(--rk-fast) var(--rk-ease); }
.rk-group-role[open] > summary::before { transform: rotate(45deg); }
.rk-group-role-name { flex: 1; min-width: 0; overflow: hidden; font-weight: 600; color: var(--rk-text-strong); white-space: nowrap; text-overflow: ellipsis; }
.rk-group-role-body { padding: 0 0 12px; }
.rk-group-role-body > .rk-btn { margin-top: 8px; }
`,
    async run() {
      const id = groupId();
      const json = id ? await safe(Rk.api.get(`https://groups.roblox.com/v1/groups/${id}/roles`, { cache: 60000 })) : null;
      const roles = json && Array.isArray(json.roles) ? json.roles.filter(role => role && typeof role.name === 'string' && Rk.isId(role.id)) : [];
      if (!roles.length) return;
      roles.sort((a, b) => (Number(b.rank) || 0) - (Number(a.rank) || 0));
      const roleNode = role => {
        const count = Number(role.memberCount) || 0;
        const tiles = el('div', { class: 'rk-profile-tiles' });
        const body = el('div', { class: 'rk-group-role-body' }, tiles);
        let cursor = '';
        let started = false;
        let busy = false;
        const more = ui.button('Load more', { variant: 'secondary', onClick: () => load() });
        const load = async () => {
          if (busy) return;
          busy = true;
          more.disabled = true;
          if (!tiles.children.length) tiles.replaceWith(el('div', { class: 'rk-group-role-loading' }, ui.spinner(18)));
          const page = await safe(Rk.api.get(`https://groups.roblox.com/v1/groups/${id}/roles/${role.id}/users?limit=100&sortOrder=Desc${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`));
          const loading = body.querySelector('.rk-group-role-loading');
          if (loading) loading.replaceWith(tiles);
          const users = page && Array.isArray(page.data) ? page.data.filter(user => user && Rk.isId(user.userId)) : [];
          tiles.append(...users.map(user => tile(`/users/${user.userId}/profile`, ui.thumb(Rk.thumb('AvatarHeadShot', user.userId, '150x150'), { size: 64, round: true }), String(user.displayName || user.username || `User ${user.userId}`), mark(isVerified(user.userId, user.hasVerifiedBadge)))));
          if (!page) body.append(el('div', { class: 'rk-muted' }, 'Could not load the members of this role'));
          else if (!tiles.children.length) body.append(el('div', { class: 'rk-muted' }, 'Nobody has this role'));
          cursor = page && typeof page.nextPageCursor === 'string' ? page.nextPageCursor : '';
          if (cursor) body.append(more);
          else more.remove();
          more.disabled = false;
          busy = false;
        };
        const node = el('details', { class: 'rk-group-role' },
          el('summary', null,
            el('span', { class: 'rk-group-role-name', title: role.name }, role.name),
            el('span', { class: 'rk-muted' }, `Rank ${fmt.num(role.rank)}`),
            el('span', { class: 'rk-muted' }, fmt.plural(count, 'member'))
          ),
          body
        );
        node.addEventListener('toggle', () => {
          if (!node.open || started) return;
          started = true;
          load();
        });
        return node;
      };
      addSection('group', ui.section('Roles', el('div', null, roles.map(roleNode)), { className: 'rk-group-roles', actions: ui.pill(fmt.num(roles.length)) }), 3);
    }
  });

  Rk.feature({
    id: 'profiles.groupAllies',
    category: 'profiles',
    name: 'Community allies',
    description: 'Lists allied communities with their member counts.',
    default: false,
    pages: GROUP,
    css: listCss,
    async run() {
      const id = groupId();
      const json = id ? await safe(Rk.api.get(`https://groups.roblox.com/v1/groups/${id}/relationships/allies?model.startRowIndex=0&model.maxRows=50`, { cache: 60000 })) : null;
      const allies = json && Array.isArray(json.relatedGroups) ? json.relatedGroups.filter(ally => ally && Rk.isId(ally.id)).slice(0, 50) : [];
      if (!allies.length) return;
      const rows = allies.map(ally => entryRow(
        ui.thumb(Rk.thumb('GroupIcon', ally.id, '150x150'), { size: 40 }),
        `/communities/${ally.id}`,
        typeof ally.name === 'string' && ally.name ? ally.name : `Community ${ally.id}`,
        null,
        Number.isFinite(ally.memberCount) ? el('span', { class: 'rk-muted' }, fmt.plural(ally.memberCount, 'member')) : null,
        mark(ally.hasVerifiedBadge === true)
      ));
      const [rowsNode, more] = collapsible(rows, 8);
      addSection('group', ui.section('Allies', rowsNode, { className: 'rk-group-allies', actions: [ui.pill(fmt.num(allies.length)), more] }), 4);
    }
  });

  Rk.feature({
    id: 'profiles.groupYourRole',
    category: 'profiles',
    name: 'Your community role',
    description: 'Shows your role and rank in the community you are viewing.',
    pages: GROUP,
    async run() {
      const id = groupId();
      const me = await Rk.me();
      if (!id || !me) return;
      const groups = await groupsOf(me.id);
      if (!groups) return;
      const membership = groups.find(group => group.id === id);
      const pill = membership ? ui.pill(`Your role: ${membership.role} (rank ${membership.rank})`, 'accent') : ui.pill('Not a member');
      Rk.observe('.rk-group-details .rk-group-top', top => place(top, pill, 1));
    }
  });

  Rk.feature({
    id: 'profiles.groupMemberCheck',
    category: 'profiles',
    name: 'Member check',
    description: 'Lets you check whether a username is in the community.',
    default: false,
    pages: GROUP,
    css: `
.rk-group-check { display: flex; gap: 8px; max-width: 440px; }
.rk-group-check .rk-btn { flex: none; }
.rk-group-check-result:empty { display: none; }
`,
    run() {
      const id = groupId();
      if (!id) return;
      let ticket = 0;
      const result = el('div', { class: 'rk-group-check-result' });
      const show = (...parts) => result.replaceChildren(...parts);
      const check = async () => {
        const name = field.value.trim();
        const current = ++ticket;
        if (!/^[A-Za-z0-9_]{3,20}$/.test(name)) {
          button.disabled = false;
          return show(el('span', { class: 'rk-muted' }, 'Enter a valid username'));
        }
        button.disabled = true;
        show(ui.spinner(16));
        const lookup = await safe(Rk.api.post('https://users.roblox.com/v1/usernames/users', { usernames: [name], excludeBannedUsers: false }));
        const user = lookup && Array.isArray(lookup.data) ? lookup.data.find(entry => entry && Rk.isId(entry.id)) : null;
        const groups = user ? await groupsOf(Number(user.id)) : null;
        if (current !== ticket) return;
        button.disabled = false;
        if (!lookup) return show(el('span', { class: 'rk-muted' }, 'Could not look up that username'));
        if (!user) return show(el('span', { class: 'rk-muted' }, 'No user has that username'));
        const profile = [ui.link(`/users/${user.id}/profile`, String(user.name || name)), mark(isVerified(user.id, user.hasVerifiedBadge))].filter(Boolean);
        if (!groups) return show(el('span', { class: 'rk-muted' }, 'Could not load communities for '), ...profile);
        const membership = groups.find(group => group.id === id);
        show(...profile, membership ? ` is a member: ${membership.role} (rank ${membership.rank})` : ' is not a member');
      };
      const field = ui.input({ placeholder: 'Username', maxLength: 20, onEnter: check });
      field.setAttribute('aria-label', 'Username');
      const button = ui.button('Check', { variant: 'primary', size: 'md', onClick: check });
      addSection('group', ui.section('Check if a user is a member', el('div', { class: 'rk-stack' }, el('div', { class: 'rk-group-check' }, field, button), result), { className: 'rk-group-member-check' }), 5);
    }
  });

  Rk.feature({
    id: 'profiles.mutualGroups',
    category: 'profiles',
    name: 'Shared communities',
    description: 'Shows the communities you and another user are both in, with both roles.',
    default: false,
    pages: PROFILE,
    css: listCss,
    async run() {
      const id = profileId();
      const me = await Rk.me();
      if (!id || !me || me.id === id) return;
      const [theirs, mine] = await Promise.all([groupsOf(id), groupsOf(me.id)]);
      if (!theirs || !mine) return;
      const myRoles = new Map(mine.map(group => [group.id, group]));
      const shared = theirs.filter(group => myRoles.has(group.id)).sort((a, b) => b.rank - a.rank || a.name.localeCompare(b.name));
      if (!shared.length) return;
      const rows = shared.map(group => entryRow(
        ui.thumb(Rk.thumb('GroupIcon', group.id, '150x150'), { size: 40 }),
        `/communities/${group.id}`,
        group.name,
        `Their role: ${group.role}, your role: ${myRoles.get(group.id).role}`,
        null,
        mark(group.verified)
      ));
      const [rowsNode, more] = collapsible(rows, 8);
      addSection('profile', ui.section('Shared communities', rowsNode, { className: 'rk-profile-shared-groups', actions: [ui.pill(fmt.num(shared.length)), more] }), 5);
    }
  });

  Rk.feature({
    id: 'profiles.groupGrowth',
    category: 'profiles',
    name: 'Member growth',
    description: 'Tracks member counts across your visits and shows the change.',
    default: false,
    pages: GROUP,
    async run() {
      const id = groupId();
      const group = id ? await safe(Rk.api.get(`https://groups.roblox.com/v1/groups/${id}`, { cache: 600000 })) : null;
      const count = group && typeof group === 'object' ? Number(group.memberCount) : NaN;
      if (!Number.isSafeInteger(count) || count < 0) return;
      const stored = Rk.store.get('profiles.groupCounts', {});
      const all = {};
      for (const [key, list] of Object.entries(stored && typeof stored === 'object' && !Array.isArray(stored) ? stored : {})) {
        const points = Rk.isId(key) && Array.isArray(list) ? list.filter(point => Array.isArray(point) && Number.isFinite(point[0]) && Number.isFinite(point[1])).slice(-30) : [];
        if (points.length) all[key] = points;
      }
      const points = all[id] || [];
      const now = Date.now();
      const last = points[points.length - 1];
      if (!last || now - last[0] >= 6 * 3600000) points.push([now, count]);
      all[id] = points.slice(-30);
      const keys = Object.keys(all);
      if (keys.length > 100) keys.sort((a, b) => all[a][all[a].length - 1][0] - all[b][all[b].length - 1][0]).slice(0, keys.length - 100).forEach(key => delete all[key]);
      Rk.store.set('profiles.groupCounts', all);
      const first = all[id][0];
      if (!first || first[0] === now) return;
      const diff = count - first[1];
      const since = fmt.date(first[0]);
      const text = diff === 0 ? `No member change since ${since}` : `${diff > 0 ? '+' : '-'}${fmt.plural(Math.abs(diff), 'member')} since ${since}`;
      const node = el('span', { class: diff > 0 ? 'rk-strong' : 'rk-muted' }, text);
      Rk.observe('.rk-group-details .rk-group-extra', extra => {
        if (!extra.contains(node)) extra.append(node);
      });
    }
  });

  Rk.feature({
    id: 'profiles.groupIcon',
    category: 'profiles',
    name: 'Download community icon',
    description: 'Adds a button to download the community icon.',
    default: false,
    pages: GROUP,
    run() {
      const id = groupId();
      if (!id) return;
      const button = ui.button('Download icon', { variant: 'ghost', icon: 'download', onClick: async () => {
        button.disabled = true;
        const url = await Rk.thumb('GroupIcon', id, '420x420');
        const done = url ? await Rk.bg('download', { url, filename: `community-${id}-icon.png` }).then(() => true, () => false) : false;
        button.disabled = false;
        ui.toast(done ? 'Download started' : 'Could not download the icon', { tone: done ? 'success' : 'danger' });
      } });
      Rk.observe('.rk-group-details .rk-section-actions', actions => {
        if (!actions.contains(button)) actions.append(button);
      });
    }
  });
})();
