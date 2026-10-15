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
.rk-profile-status { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 12px; font-family: var(--rk-font); font-size: 14px; font-weight: 600; line-height: 22px; }
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
    const json = await Rk.api.get(`https://avatar.roblox.com/v1/users/${userId}/currently-wearing`);
    const ids = json && Array.isArray(json.assetIds) ? [...new Set(json.assetIds.map(Number).filter(Rk.isId))].slice(0, 100) : [];
    const details = new Map();
    if (ids.length) {
      const result = await safe(Rk.api.post('https://catalog.roblox.com/v1/catalog/items/details', { items: ids.map(id => ({ itemType: 'Asset', id })) }));
      for (const item of (result && Array.isArray(result.data) ? result.data : [])) {
        if (item && Rk.isId(item.id)) details.set(Number(item.id), item);
      }
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
    description: 'Shows the user ID, username, display name, join date and account age on profiles.',
    pages: PROFILE,
    css: `${copyableCss}
.rk-profile-account-extra:not(:empty) { margin-top: 10px; font-size: 13px; }
`,
    async run() {
      const id = profileId();
      const user = id ? await profileUser() : null;
      if (!user) return;
      await meLoaded;
      const age = accountAge(user.created);
      const joined = toTime(user.created);
      addSection('profile', ui.section('Account', [
        ui.stats([
          ['User ID', el('span', { class: 'rk-profile-copyable' }, String(id), ui.button('', { variant: 'ghost', icon: 'copy', title: 'Copy user ID', onClick: () => ui.copy(String(id), 'User ID copied') }))],
          ['Username', `@${user.name}`],
          ['Display name', el('span', { class: 'rk-profile-named' }, el('span', null, String(user.displayName || user.name)), mark(isVerified(id, user.hasVerifiedBadge), 16))],
          ['Joined', joined ? new Intl.DateTimeFormat(undefined, { dateStyle: 'long' }).format(joined) : '-', { title: fmt.dateTime(user.created) }],
          ['Account age', age ? (age.years ? `${fmt.num(age.years)}y ${fmt.num(age.days)}d` : fmt.plural(age.days, 'day')) : '-', age ? { title: `${fmt.plural(age.years, 'year')}, ${fmt.plural(age.days, 'day')}` } : undefined]
        ]),
        el('div', { class: 'rk-profile-account-extra rk-inline' })
      ], { className: 'rk-profile-account', actions: user.isBanned === true ? ui.pill('Banned', 'danger') : null }), 1);
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
    id: 'profiles.socialCounts',
    category: 'profiles',
    name: 'Exact social counts',
    description: 'Shows exact friend, follower and following counts.',
    pages: PROFILE,
    async run() {
      const id = profileId();
      if (!id) return;
      const kinds = [['Friends', 'friends'], ['Followers', 'followers'], ['Following', 'followings']];
      const counts = await Promise.all(kinds.map(([, path]) => safe(Rk.api.get(`https://friends.roblox.com/v1/users/${id}/${path}/count`, { cache: 60000 }))));
      const values = counts.map(json => (json && Number.isFinite(json.count) ? json.count : null));
      if (values.every(value => value === null)) return;
      const grid = statsGrid();
      kinds.forEach(([label], index) => place(grid, ui.stat(label, fmt.num(values[index])), index + 1));
    }
  });

  Rk.feature({
    id: 'profiles.mutualFriends',
    category: 'profiles',
    name: 'Mutual friends',
    description: 'Shows the friends you have in common with other users.',
    pages: PROFILE,
    css: tilesCss,
    async run() {
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
      addSection('profile', ui.section('Mutual friends', el('div', { class: 'rk-profile-tiles' }, tiles), { className: 'rk-profile-mutuals', actions: ui.pill(fmt.num(shared.length)) }), 4, { replace: '.react-friends-carousel-container, .friends-carousel-0-friends' });
    }
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
    description: 'Lets you set private nicknames that show on profiles and friend lists.',
    default: false,
    pages: ['profile', 'friends', 'home'],
    css: `${headerCss}
.rk-pill.rk-profile-nick { display: inline-block; max-width: 100%; margin-top: 2px; line-height: 20px; overflow: hidden; text-overflow: ellipsis; }
`,
    async run() {
      const nicknames = () => {
        const map = Rk.store.get('nicknames', {});
        return map && typeof map === 'object' && !Array.isArray(map) ? map : {};
      };
      const nicknameOf = userId => {
        const value = nicknames()[userId];
        return typeof value === 'string' ? value.trim().slice(0, 40) : '';
      };
      Rk.observe('.avatar-name, .friends-carousel-tile-name', name => {
        const next = name.nextElementSibling;
        if (next && next.classList.contains('rk-profile-nick')) return;
        const userId = userIdNear(name);
        const nick = userId ? nicknameOf(userId) : '';
        if (nick) name.after(el('span', { class: 'rk-pill rk-pill-accent rk-profile-nick', title: 'Your nickname' }, nick));
      });
      const id = profileId();
      if (!id || await ownProfile()) return;
      const pill = ui.pill(nicknameOf(id), 'accent', { title: 'Your nickname' });
      pill.classList.toggle('rk-hidden', !nicknameOf(id));
      addPill(pill, 2);
      addTool(ui.button('Set nickname', { icon: 'edit', onClick: async () => {
        const value = await ui.prompt('Only you can see it. Leave it empty to remove it.', { title: 'Set nickname', placeholder: 'Nickname', value: nicknameOf(id), maxLength: 40 });
        if (value === null) return;
        const text = value.trim().slice(0, 40);
        if (text === nicknameOf(id)) return;
        const map = { ...nicknames() };
        if (text) map[id] = text;
        else delete map[id];
        Rk.store.set('nicknames', map);
        pill.textContent = text;
        pill.classList.toggle('rk-hidden', !text);
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

  Rk.feature({
    id: 'profiles.robloxBadges',
    category: 'profiles',
    name: 'Roblox badges',
    description: 'Shows the official Roblox badges a user has earned.',
    pages: PROFILE,
    css: `${chipsCss}
.rk-profile-chip.rk-profile-badge { padding: 4px 12px 4px 4px; }
.rk-profile-badge[data-rk-tip]::after { width: max-content; max-width: 240px; white-space: normal; }
`,
    async run() {
      const id = profileId();
      const list = id ? await safe(Rk.api.get(`https://accountinformation.roblox.com/v1/users/${id}/roblox-badges`, { cache: 60000 })) : null;
      const badges = Array.isArray(list) ? list.filter(badge => badge && typeof badge.name === 'string' && badge.name) : [];
      if (!badges.length) return;
      const chips = badges.map(badge => {
        const image = typeof badge.imageUrl === 'string' && /^https:\/\//i.test(badge.imageUrl) ? badge.imageUrl : null;
        const chip = el('div', { class: 'rk-profile-chip rk-profile-badge', tabindex: '0' }, ui.thumb(image, { size: 32 }), el('span', null, badge.name));
        return typeof badge.description === 'string' && badge.description.trim() ? ui.tip(chip, badge.description.trim()) : chip;
      });
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
    css: tilesCss,
    async run() {
      const id = profileId();
      const json = id ? await safe(Rk.api.get(`https://badges.roblox.com/v1/users/${id}/badges?limit=10&sortOrder=Desc`, { cache: 60000 })) : null;
      const badges = json && Array.isArray(json.data) ? json.data.filter(badge => badge && Rk.isId(badge.id)).slice(0, 10) : [];
      if (!badges.length) return;
      const tiles = badges.map(badge => tile(`/badges/${badge.id}`, ui.thumb(Rk.thumb('BadgeIcon', badge.id, '150x150'), { size: 64 }), typeof badge.name === 'string' && badge.name ? badge.name : 'Badge'));
      addSection('profile', ui.section('Recent badges', el('div', { class: 'rk-profile-tiles' }, tiles), { className: 'rk-profile-badges' }), 9, { replace: '.profile-carousel:has(a[href*="/inventory/#!/badges"])' });
    }
  });

  Rk.feature({
    id: 'profiles.groups',
    category: 'profiles',
    name: 'Community list',
    description: 'Lists every community the user is in with role, rank and exact member count.',
    pages: PROFILE,
    css: listCss,
    async run() {
      const id = profileId();
      const groups = id ? await groupsOf(id) : null;
      if (!groups || !groups.length) return;
      const rows = [...groups].sort((a, b) => b.rank - a.rank || a.name.localeCompare(b.name)).map(group => entryRow(
        ui.thumb(Rk.thumb('GroupIcon', group.id, '150x150'), { size: 40 }),
        `/communities/${group.id}`,
        group.name,
        `${group.role}, rank ${group.rank}`,
        [group.rank === 255 ? ui.pill('Owner', 'accent') : null, Number.isFinite(group.members) ? el('span', { class: 'rk-muted' }, fmt.plural(group.members, 'member')) : null],
        mark(group.verified)
      ));
      const [list, more] = collapsible(rows, 8);
      addSection('profile', ui.section('Communities', list, { className: 'rk-profile-groups', actions: [ui.pill(fmt.num(groups.length)), more] }), 10, { replace: '.profile-communities' });
    }
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
    css: listCss,
    async run() {
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
      addSection('profile', ui.section('Experiences', rowsNode, { className: 'rk-profile-games', actions: [ui.pill(fmt.plural(total, 'visit')), more] }), 11, { replace: '.profile-experiences' });
    }
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
    css: tilesCss,
    async run() {
      const id = profileId();
      if (!id) return;
      const worn = await wornItems(id);
      if (!worn || !worn.ids.length) return;
      const tiles = worn.ids.map(assetId => {
        const item = worn.details.get(assetId);
        const name = item && typeof item.name === 'string' && item.name ? item.name : `Item ${assetId}`;
        return tile(`/catalog/${assetId}`, ui.thumb(Rk.thumb('Asset', assetId, '150x150'), { size: 64 }), name);
      });
      addSection('profile', ui.section('Currently wearing', el('div', { class: 'rk-profile-tiles' }, tiles), { className: 'rk-profile-wearing', actions: ui.pill(fmt.num(worn.ids.length)) }), 7, { replace: '.profile-currently-wearing' });
    }
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
    description: 'Shows a verified badge next to your own name. Only you can see it.',
    default: false,
    async run() {
      const me = await Rk.me();
      const display = me ? String(me.displayName || me.name).trim() : '';
      if (!display) return;
      const handle = `@${me.name}`;
      const tags = 'h1, h2, h3, h4, span, div, p, a';
      const add = node => {
        if (node.hasAttribute('data-rk-self-verified')) return;
        if (node.parentElement && node.parentElement.querySelector('[class*="verified" i]:not([class*="rk-verified"]), [data-testid*="verified" i]')) return;
        const style = getComputedStyle(node);
        const size = Math.round(Math.min(28, Math.max(14, (parseFloat(style.fontSize) || 16) * 0.8)));
        const beside = style.display.startsWith('inline') || /flex|grid/.test(node.parentElement ? getComputedStyle(node.parentElement).display : '');
        node.setAttribute('data-rk-self-verified', '');
        if (beside) node.after(ui.verified({ size }));
        else node.append(ui.verified({ size }));
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
              const target = nameIn(header, display) || nameIn(header, handle);
              if (target) add(target);
            }
          });
        });
      }
      const names = new Set([display, me.name].filter(Boolean));
      Rk.observe('#header :is(span, div, a, p), .left-nav :is(span, div, a, p)', node => {
        if (!node.firstElementChild && names.has(node.textContent.trim()) && !node.closest('.rk-nav-item, .rk-menu, .rk-modal, .rk-section')) add(node);
      });
    }
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
    description: 'Shows what friends are playing on their cards, with a join button.',
    pages: FRIENDS,
    css: `
.rk-friends-game { display: flex; align-items: center; gap: 6px; min-width: 0; margin-top: 4px; font-family: var(--rk-font); font-size: 12px; color: var(--rk-muted); }
.rk-friends-game-name { min-width: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.rk-friends-game .rk-btn.rk-btn-sm { flex: none; height: 22px; padding: 0 8px; font-size: 12px; }
`,
    run() {
      onCardBatch(async cards => {
        const map = await presenceOf(cards.map(userIdNear));
        for (const card of cards) {
          const userId = userIdNear(card);
          const entry = userId ? map.get(userId) : null;
          if (presenceType(entry) !== 2 || card.querySelector('.rk-friends-game')) continue;
          const game = typeof entry.lastLocation === 'string' && entry.lastLocation.trim() ? entry.lastLocation.trim() : 'In game';
          const name = card.querySelector('.avatar-name');
          const target = card.querySelector('.avatar-card-caption') || (name && name.parentElement) || card;
          target.append(el('div', { class: 'rk-friends-game' },
            el('span', { class: 'rk-friends-game-name', title: game }, game),
            Rk.isId(entry.rootPlaceId) || Rk.isId(entry.placeId) ? ui.button('Join', { variant: 'primary', icon: 'play', onClick: event => {
              event.preventDefault();
              event.stopPropagation();
              Rk.launch.follow(userId);
            } }) : null
          ));
        }
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
    id: 'profiles.bestFriends',
    category: 'profiles',
    name: 'Best friends',
    description: 'Star friends on their profile and see them at the top of your friends page.',
    default: false,
    pages: ['profile', 'friends'],
    css: `${headerCss}${tilesCss}${friendsCss}
.rk-friends-best { display: flex; gap: 4px; overflow-x: auto; scrollbar-width: thin; }
.rk-friends-best > .rk-profile-tile { flex: 0 0 88px; }
.rk-friends-dot { position: absolute; right: 0; bottom: 0; width: 14px; height: 14px; box-sizing: border-box; border: 2px solid var(--rk-bg); border-radius: 50%; }
.rk-friends-dot[data-state="online"] { background: var(--rk-accent); }
.rk-friends-dot[data-state="game"] { background: var(--rk-success); }
.rk-friends-dot[data-state="studio"] { background: var(--rk-warning); }
.rk-friends-dot[data-state="offline"] { display: none; }
`,
    async run() {
      const bestList = () => {
        const list = Rk.store.get('friends.best', []);
        return Array.isArray(list) ? [...new Set(list.map(Number).filter(Rk.isId))].slice(0, 50) : [];
      };
      if (Rk.page().type === 'profile') {
        const id = profileId();
        const me = await Rk.me();
        if (!id || !me || me.id === id) return;
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
      const ids = bestList();
      if (!ids.length) return;
      const [users, presence] = await Promise.all([safe(Rk.api.users(ids)), presenceOf(ids)]);
      const labels = { online: 'Online', game: 'In game', studio: 'In Studio' };
      const tiles = ids.map(userId => {
        const user = users && users.get(userId);
        const state = ['offline', 'online', 'game', 'studio'][presenceType(presence.get(userId))] || 'offline';
        return tile(`/users/${userId}/profile`, el('span', { class: 'rk-profile-face' },
          ui.thumb(Rk.thumb('AvatarHeadShot', userId, '150x150'), { size: 64, round: true }),
          el('span', { class: 'rk-friends-dot', dataset: { state }, title: labels[state] || null })
        ), user ? String(user.displayName || user.name) : `User ${userId}`, mark(isVerified(userId, user && user.hasVerifiedBadge)));
      });
      place(friendsHost(), ui.section('Best friends', el('div', { class: 'rk-friends-best' }, tiles), { className: 'rk-friends-best-section' }), 1);
    }
  });

  Rk.feature({
    id: 'profiles.groupInfo',
    category: 'profiles',
    name: 'Community details',
    description: 'Shows the community ID, owner, exact member count, entry type and shout details.',
    pages: GROUP,
    css: `${copyableCss}
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
      const owner = person(group.owner);
      const poster = shout ? person(shout.poster) : null;
      const posted = shout && toTime(shout.updated) ? fmt.dateTime(shout.updated) : null;
      const entry = group.publicEntryAllowed === true ? 'Anyone can join' : group.publicEntryAllowed === false ? 'Approval needed' : '-';
      const title = ['Community details', group.hasVerifiedBadge === true ? ui.verified({ size: 16, title: 'Verified community' }) : null];
      addSection('group', ui.section(title, [
        el('div', { class: 'rk-group-top rk-inline' }),
        ui.stats([
          ['Community ID', el('span', { class: 'rk-profile-copyable' }, String(id), ui.button('', { variant: 'ghost', icon: 'copy', title: 'Copy community ID', onClick: () => ui.copy(String(id), 'Community ID copied') }))],
          ['Owner', owner || 'No owner'],
          ['Members', fmt.num(group.memberCount)],
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
    description: 'Lists the experiences of the community with visits and active players.',
    pages: GROUP,
    css: listCss,
    async run() {
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
      addSection('group', ui.section('Community experiences', rowsNode, { className: 'rk-group-games', actions: [ui.pill(fmt.num(games.length)), more] }), 2);
    }
  });

  Rk.feature({
    id: 'profiles.groupRoles',
    category: 'profiles',
    name: 'Community roles',
    description: 'Shows every role in the community with its rank and member count.',
    pages: GROUP,
    async run() {
      const id = groupId();
      const json = id ? await safe(Rk.api.get(`https://groups.roblox.com/v1/groups/${id}/roles`, { cache: 60000 })) : null;
      const roles = json && Array.isArray(json.roles) ? json.roles.filter(role => role && typeof role.name === 'string') : [];
      if (!roles.length) return;
      roles.sort((a, b) => (Number(b.rank) || 0) - (Number(a.rank) || 0));
      const table = ui.table([{ label: 'Rank' }, { label: 'Name' }, { label: 'Members', align: 'right' }], roles.map(role => [fmt.num(role.rank), role.name, fmt.num(role.memberCount)]));
      addSection('group', ui.section('Roles', table, { className: 'rk-group-roles', actions: ui.pill(fmt.num(roles.length)) }), 3);
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
