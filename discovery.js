(() => {
  const { el, ui, fmt, icon } = Rk;

  const homeIds = ['discovery.friendActivity', 'discovery.pinnedRow', 'discovery.recentRow', 'discovery.updatesRow', 'discovery.friendsPlayingRow', 'discovery.recentProfilesRow', 'discovery.recentItemsRow', 'discovery.shortcuts', 'discovery.greeting', 'discovery.randomGame'];
  const searchIds = ['discovery.searchPresence', 'discovery.searchFriendTag', 'discovery.searchJoinDate', 'discovery.idJump', 'discovery.exactMatch', 'discovery.searchHistory'];
  const cardSelector = '.game-card-container';
  const pageRoots = '#content, #container-main, #HomeContainer, .home-container, main, body';

  const sharedCss = (ids, text) => ctx => (ids.find(id => Rk.isEnabled(id)) === ctx.id ? text : '');

  const homeStyles = sharedCss(homeIds, `
.rk-home-rows {
  font-family: var(--rk-font);
}
.rk-home-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 32px;
  margin: 0 0 16px;
}
.rk-home-top-right {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}
.rk-home-greeting {
  font-size: 16px;
  font-weight: 600;
  line-height: 1.3;
  color: var(--rk-text-strong);
}
.rk-home-row {
  margin: 0 0 24px;
}
.rk-home-row .rk-section-body {
  padding: 0;
  border-radius: 0;
  background: transparent;
}
.rk-home-arrows {
  display: flex;
  gap: 2px;
}
.rk-home-track {
  display: flex;
  gap: 12px;
  margin: -4px -4px 0;
  padding: 4px 4px 6px;
  scroll-padding: 0 4px;
  overflow-x: auto;
  overflow-y: hidden;
  scroll-snap-type: x mandatory;
  scroll-behavior: smooth;
  overscroll-behavior-x: contain;
  scrollbar-width: none;
}
.rk-home-track::-webkit-scrollbar {
  display: none;
}
.rk-home-track.rk-fade-end {
  -webkit-mask-image: linear-gradient(to right, var(--rk-text-strong) calc(100% - 48px), transparent);
  mask-image: linear-gradient(to right, var(--rk-text-strong) calc(100% - 48px), transparent);
}
.rk-home-track.rk-fade-start {
  -webkit-mask-image: linear-gradient(to right, transparent, var(--rk-text-strong) 48px);
  mask-image: linear-gradient(to right, transparent, var(--rk-text-strong) 48px);
}
.rk-home-track.rk-fade-start.rk-fade-end {
  -webkit-mask-image: linear-gradient(to right, transparent, var(--rk-text-strong) 48px, var(--rk-text-strong) calc(100% - 48px), transparent);
  mask-image: linear-gradient(to right, transparent, var(--rk-text-strong) 48px, var(--rk-text-strong) calc(100% - 48px), transparent);
}
.rk-home-tile {
  position: relative;
  flex: none;
  width: 150px;
  scroll-snap-align: start;
  transition: opacity var(--rk-fast) ease, transform var(--rk-fast) var(--rk-ease);
}
.rk-home-tile-round {
  width: 100px;
}
.rk-home-tile-out {
  opacity: 0;
  transform: scale(0.96);
}
.rk-home-link {
  display: block;
  color: inherit !important;
  text-decoration: none !important;
  outline: none;
}
.rk-home-thumb {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: var(--rk-radius);
  background: var(--rk-shift);
  overflow: hidden;
}
.rk-home-tile-round .rk-home-thumb {
  border-radius: 50%;
}
.rk-home-thumb .rk-thumb {
  width: 100% !important;
  height: 100% !important;
  border-radius: 0;
  background: transparent;
}
.rk-home-thumb::after {
  content: "";
  position: absolute;
  inset: 0;
  background: var(--rk-hover);
  opacity: 0;
  pointer-events: none;
  transition: opacity var(--rk-fast) ease;
}
.rk-home-tile:hover .rk-home-thumb::after {
  opacity: 1;
}
.rk-home-link:focus-visible .rk-home-thumb {
  outline: 2px solid var(--rk-accent);
  outline-offset: 2px;
}
.rk-home-name {
  display: -webkit-box;
  height: 36px;
  margin-top: 6px;
  overflow: hidden;
  font-size: 14px;
  font-weight: 600;
  line-height: 18px;
  color: var(--rk-text-strong);
  overflow-wrap: anywhere;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}
.rk-home-tile-round .rk-home-name {
  text-align: center;
}
.rk-home-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 20px;
  margin-top: 2px;
  overflow: hidden;
  font-size: 12px;
  line-height: 20px;
  color: var(--rk-muted);
  white-space: nowrap;
}
.rk-home-meta > .rk-verified {
  margin-left: -2px;
}
.rk-home-who {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}
.rk-home-skel-thumb {
  width: 100%;
  aspect-ratio: 1 / 1;
}
.rk-home-skel .rk-home-name {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-top: 3px;
}
.rk-home-bar {
  width: 92%;
  height: 12px;
  border-radius: var(--rk-radius-s);
}
.rk-home-bar-short {
  width: 56%;
}
.rk-home-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  aspect-ratio: 1 / 1;
  pointer-events: none;
}
.rk-home-action {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  border-radius: 50%;
  cursor: pointer;
  pointer-events: auto;
  opacity: 0;
  transform: scale(0.9);
  transition: opacity var(--rk-fast) ease, transform var(--rk-fast) var(--rk-ease), background-color var(--rk-fast) ease;
}
.rk-home-tile:hover .rk-home-action,
.rk-home-action:focus-visible {
  opacity: 1;
  transform: scale(1);
}
.rk-home-action:focus-visible {
  outline: 2px solid var(--rk-accent);
  outline-offset: 2px;
}
.rk-home-play {
  right: 8px;
  bottom: 8px;
  width: 40px;
  height: 40px;
  background: var(--rk-accent);
  color: var(--rk-accent-text);
  box-shadow: 0 2px 6px var(--rk-press);
}
.rk-home-play:hover {
  background: var(--rk-accent-hover);
}
.rk-home-play .rk-icon path {
  fill: currentColor;
}
.rk-home-more {
  top: 6px;
  right: 6px;
  width: 28px;
  height: 28px;
  background: var(--rk-bg);
  color: var(--rk-text-strong);
  box-shadow: 0 2px 6px var(--rk-press);
}
.rk-home-more:hover {
  background: var(--rk-surface-2);
}
@media (hover: none) {
  .rk-home-action {
    opacity: 1;
    transform: none;
  }
}
.rk-home-faces {
  display: flex;
  align-items: center;
  flex: none;
}
.rk-home-faces .rk-thumb {
  box-shadow: 0 0 0 2px var(--rk-bg);
}
.rk-home-faces .rk-thumb + .rk-thumb {
  margin-left: -6px;
}
.rk-home-shortcut {
  display: flex;
  flex: none;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 112px;
  height: 72px;
  border-radius: var(--rk-radius);
  background: var(--rk-shift);
  color: var(--rk-text-strong) !important;
  font-size: 14px;
  font-weight: 600;
  text-decoration: none !important;
  scroll-snap-align: start;
  transition: background-color var(--rk-fast) ease, transform var(--rk-fast) var(--rk-ease);
}
.rk-home-shortcut:hover {
  background: var(--rk-press);
}
.rk-home-shortcut:active {
  transform: scale(0.97);
}
.rk-home-shortcut:focus-visible {
  outline: 2px solid var(--rk-accent);
  outline-offset: 2px;
}`);

  const searchStyles = sharedCss(searchIds, `
.rk-search-top {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 0 0 16px;
  font-family: var(--rk-font);
}
.rk-search-top:empty {
  display: none;
}
.rk-search-history {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
.rk-search-history-label {
  margin-right: 2px;
  font-size: 13px;
  font-weight: 600;
  color: var(--rk-muted);
}
.rk-search-chip {
  display: inline-flex;
  align-items: center;
  max-width: 220px;
  height: 28px;
  padding: 0 12px;
  border-radius: 999px;
  background: var(--rk-shift);
  color: var(--rk-text-strong) !important;
  font-size: 13px;
  font-weight: 500;
  line-height: 28px;
  text-decoration: none !important;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: background-color var(--rk-fast) ease, box-shadow var(--rk-fast) ease;
}
.rk-search-chip:hover {
  background: var(--rk-press);
}
.rk-search-chip-active {
  background: var(--rk-accent-soft);
  box-shadow: inset 0 0 0 1px var(--rk-accent);
}
.rk-search-jump {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
.rk-search-jump-label {
  margin-right: 4px;
  font-weight: 600;
  color: var(--rk-muted);
}
.rk-search-exact {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--rk-accent-soft);
  box-shadow: inset 0 0 0 1px var(--rk-accent);
}
.rk-search-exact-text {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.rk-search-exact-title {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.rk-search-exact-name {
  overflow: hidden;
  font-size: 16px;
  font-weight: 700;
  color: var(--rk-text-strong) !important;
  text-decoration: none !important;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.rk-search-exact-name:hover {
  text-decoration: underline !important;
}
.rk-search-exact-title > .rk-verified {
  margin-left: -4px;
}
.rk-search-exact-sub {
  font-size: 13px;
  color: var(--rk-muted);
}
.rk-search-exact .rk-skeleton {
  height: 12px;
}
.rk-search-tags {
  min-height: 20px;
  margin-top: 4px;
  line-height: 20px;
}
.rk-search-tags > * + * {
  margin-left: 4px;
}
.rk-search-joined {
  min-height: 16px;
  margin-top: 2px;
  font-family: var(--rk-font);
  font-size: 12px;
  line-height: 16px;
  color: var(--rk-muted);
}`);

  const clip = (value, max = 120) => (typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : '');

  let myId = null;
  const meLoaded = Rk.me().then(me => {
    myId = me ? me.id : null;
  });
  const isVerified = (id, flag) => flag === true || (myId !== null && Number(id) === myId && Rk.isEnabled('profiles.fakeVerified'));
  const markUser = (node, userId, size = 14) => {
    Promise.all([Rk.api.users([userId]), meLoaded]).then(([users]) => {
      const user = users.get(Number(userId));
      if (!isVerified(userId, user && user.hasVerifiedBadge) || node.querySelector('.rk-verified')) return;
      const badge = ui.verified({ size });
      if (Rk.isEnabled('profiles.fakeVerified') && !(user && user.hasVerifiedBadge)) badge.classList.add('rk-self-badge');
      node.append(badge);
    }, () => {});
  };

  const watchers = new Map();
  const watch = (key, fn) => {
    if (!watchers.has(key)) watchers.set(key, new Set());
    watchers.get(key).add(fn);
  };
  const save = (key, value) => {
    Rk.store.set(key, value);
    for (const fn of watchers.get(key) || []) fn();
  };

  const listOf = key => {
    const value = Rk.store.get(key, []);
    return Array.isArray(value) ? value.filter(entry => entry && typeof entry === 'object') : [];
  };

  const uniqueBy = (items, keyOf) => {
    const seen = new Set();
    return items.filter(item => {
      const key = keyOf(item);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const gamesIn = key => uniqueBy(listOf(key).filter(entry => Rk.isId(entry.placeId)).map(entry => ({
    placeId: Number(entry.placeId),
    universeId: Rk.isId(entry.universeId) ? Number(entry.universeId) : null,
    name: clip(entry.name) || 'Experience',
    time: Number(entry.time) || 0
  })), entry => entry.placeId);

  const profilesIn = () => uniqueBy(listOf('history.profiles').filter(entry => Rk.isId(entry.userId)).map(entry => {
    const name = clip(entry.name, 40);
    return { userId: Number(entry.userId), name, displayName: clip(entry.displayName, 60) || name || 'User', time: Number(entry.time) || 0 };
  }), entry => entry.userId);

  const itemsIn = () => uniqueBy(listOf('history.items').filter(entry => Rk.isId(entry.id) && (entry.kind === 'asset' || entry.kind === 'bundle')).map(entry => ({
    id: Number(entry.id),
    kind: entry.kind,
    name: clip(entry.name) || 'Item',
    time: Number(entry.time) || 0
  })), entry => `${entry.kind}:${entry.id}`);

  const gameIcon = entry => (entry.universeId ? Promise.resolve(entry.universeId) : Rk.api.universeId(entry.placeId)).then(id => Rk.thumb('GameIcon', id, '150x150'));

  const history = {
    games: {
      key: 'history.games',
      label: 'Experiences',
      empty: 'No experiences viewed yet',
      views: () => gamesIn('history.games').map(entry => ({
        href: `/games/${entry.placeId}`,
        name: entry.name,
        thumb: () => gameIcon(entry),
        time: entry.time,
        match: raw => Number(raw.placeId) === entry.placeId
      }))
    },
    profiles: {
      key: 'history.profiles',
      label: 'Profiles',
      empty: 'No profiles viewed yet',
      views: () => profilesIn().map(entry => ({
        href: `/users/${entry.userId}/profile`,
        name: entry.displayName,
        sub: entry.name ? `@${entry.name}` : '',
        thumb: () => Rk.thumb('AvatarHeadShot', entry.userId, '150x150'),
        userId: entry.userId,
        round: true,
        time: entry.time,
        match: raw => Number(raw.userId) === entry.userId
      }))
    },
    items: {
      key: 'history.items',
      label: 'Items',
      empty: 'No items viewed yet',
      views: () => itemsIn().map(entry => ({
        href: `/${entry.kind === 'bundle' ? 'bundles' : 'catalog'}/${entry.id}`,
        name: entry.name,
        sub: entry.kind === 'bundle' ? 'Bundle' : '',
        thumb: () => Rk.thumb(entry.kind === 'bundle' ? 'BundleThumbnail' : 'Asset', entry.id, '150x150'),
        time: entry.time,
        match: raw => Number(raw.id) === entry.id && raw.kind === entry.kind
      }))
    }
  };

  const unpin = placeId => save('pins.games', listOf('pins.games').filter(entry => Number(entry.placeId) !== placeId));
  const pinGame = async (placeId, name) => {
    const list = uniqueBy(listOf('pins.games').filter(entry => Rk.isId(entry.placeId) && Number(entry.placeId) !== placeId), entry => Number(entry.placeId));
    if (list.length >= 30) {
      ui.toast('You can pin up to 30 experiences', { tone: 'warning' });
      return;
    }
    const universeId = await Rk.api.universeId(placeId);
    if (!universeId) {
      ui.toast('Could not pin this experience', { tone: 'danger' });
      return;
    }
    save('pins.games', [{ placeId, universeId, name: name || 'Experience', time: Date.now() }, ...list].slice(0, 30));
    ui.toast(`Pinned ${name || 'experience'}`, { tone: 'success' });
  };

  const cardPlace = card => {
    const link = card.querySelector('a[href*="/games/"]') || card.closest('a[href*="/games/"]');
    return link ? Rk.idFrom(link.getAttribute('href'), 'game') : null;
  };

  const cardName = card => {
    const node = card.querySelector('.game-card-name');
    return node ? clip(node.textContent) : '';
  };

  const cardBox = card => {
    const parent = card.parentElement;
    return parent && parent.matches('li, .grid-item-container, .game-card, .game-tile') && parent.querySelectorAll(cardSelector).length === 1 ? parent : card;
  };

  const isOurs = node => Boolean(node.closest('.rk-section, .rk-home-rows, .rk-search-top, .rk-modal, .rk-menu'));

  const rowFor = heading => {
    let node = heading;
    for (let depth = 0; depth < 6; depth++) {
      const parent = node.parentElement;
      if (!parent || parent.matches(pageRoots) || parent.querySelector('.rk-home-rows, .rk-search-top') || parent.querySelectorAll('h2, h3').length > 1) break;
      node = parent;
    }
    return node === heading ? null : node;
  };

  const sortHeadings = (callback, wanted) => Rk.observe('h2, h3, .container-header', node => {
    if (isOurs(node) || (node.matches('.container-header') && node.querySelector('h2, h3'))) return;
    const title = clip((node.matches('.container-header') ? node.firstElementChild || node : node).textContent, 200).toLowerCase();
    if (!title || (wanted && !wanted(title))) return;
    const row = rowFor(node);
    if (!row) return;
    if (row.querySelector(cardSelector)) callback(title, row);
    else Rk.observe(cardSelector, () => callback(title, row), { root: row, once: true });
  });

  const collapse = node => {
    if (!node || !node.isConnected) return;
    Object.assign(node.style, {
      height: `${node.offsetHeight}px`,
      overflow: 'hidden',
      animation: 'none',
      transition: 'height var(--rk-med) var(--rk-ease), opacity var(--rk-fast) ease, margin var(--rk-med) var(--rk-ease), padding var(--rk-med) var(--rk-ease)'
    });
    node.getBoundingClientRect();
    Object.assign(node.style, { height: '0px', opacity: '0', marginTop: '0px', marginBottom: '0px', paddingTop: '0px', paddingBottom: '0px' });
    setTimeout(() => node.remove(), 240);
  };

  const placeIn = (wrap, node, order) => {
    node.dataset.order = String(order);
    const next = [...wrap.children].find(child => Number(child.dataset.order) > order);
    wrap.insertBefore(node, next || null);
    return node;
  };

  let homeWrap = null;
  const homeRows = () => {
    if (!homeWrap) {
      homeWrap = el('div', { class: 'rk-home-rows' });
      Rk.mount(['#HomeContainer', '.home-container', '#content'], homeWrap, { position: 'prepend' });
    }
    return homeWrap;
  };

  let homeTop = null;
  const topBar = () => {
    if (!homeTop) {
      homeTop = { left: el('div', { class: 'rk-home-top-left' }), right: el('div', { class: 'rk-home-top-right' }) };
      placeIn(homeRows(), el('div', { class: 'rk-home-top' }, homeTop.left, homeTop.right), -1);
    }
    return homeTop;
  };

  let searchWrap = null;
  const searchTop = () => {
    if (!searchWrap) {
      searchWrap = el('div', { class: 'rk-search-top' });
      Rk.mount('#content', searchWrap, { position: 'prepend' });
    }
    return searchWrap;
  };

  const thumbTile = ({ key, href, name, thumb, round, meta, play, menu }) => el('div', { class: `rk-home-tile${round ? ' rk-home-tile-round' : ''}`, dataset: { key } },
    el('a', { class: 'rk-home-link', href, title: name },
      el('div', { class: 'rk-home-thumb' }, ui.thumb(thumb, { size: 150, alt: name })),
      el('div', { class: 'rk-home-name' }, name),
      meta ? el('div', { class: 'rk-home-meta' }, meta) : null
    ),
    play || menu ? el('div', { class: 'rk-home-overlay' },
      play ? el('button', {
        type: 'button',
        class: 'rk-home-action rk-home-play',
        title: play.title,
        'aria-label': play.title,
        onclick: event => {
          event.preventDefault();
          play.onClick();
        }
      }, icon('play', 18)) : null,
      menu ? el('button', {
        type: 'button',
        class: 'rk-home-action rk-home-more',
        title: 'More',
        'aria-label': 'More',
        onclick: event => {
          event.preventDefault();
          ui.menu(event.currentTarget, menu(event.currentTarget.closest('.rk-home-tile')));
        }
      }, icon('chevronDown', 16)) : null
    ) : null
  );

  const gameTile = entry => thumbTile({
    key: String(entry.placeId),
    href: `/games/${entry.placeId}`,
    name: entry.name,
    thumb: gameIcon(entry),
    meta: entry.meta,
    play: entry.play,
    menu: entry.menu
  });

  const skeletonTile = () => el('div', { class: 'rk-home-tile rk-home-skel', 'aria-hidden': 'true' },
    el('div', { class: 'rk-skeleton rk-home-skel-thumb' }),
    el('div', { class: 'rk-home-name' }, el('div', { class: 'rk-skeleton rk-home-bar' }), el('div', { class: 'rk-skeleton rk-home-bar rk-home-bar-short' })),
    el('div', { class: 'rk-home-meta' }, el('div', { class: 'rk-skeleton rk-home-bar rk-home-bar-short' }))
  );

  const homeRow = (title, tiles, actions) => {
    const track = el('div', { class: 'rk-home-track' }, tiles);
    const step = direction => track.scrollBy({ left: direction * Math.max(150, track.clientWidth - 96), behavior: 'smooth' });
    const back = ui.button('', { variant: 'ghost', icon: 'chevronLeft', title: 'Scroll left', onClick: () => step(-1) });
    const next = ui.button('', { variant: 'ghost', icon: 'chevronRight', title: 'Scroll right', onClick: () => step(1) });
    const arrows = el('div', { class: 'rk-home-arrows rk-hidden' }, back, next);
    const root = ui.section(title, track, { className: 'rk-home-row', actions: [actions, arrows] });
    let frame = 0;
    const sync = () => {
      frame = 0;
      const max = track.scrollWidth - track.clientWidth;
      const start = track.scrollLeft > 2;
      const end = track.scrollLeft < max - 2;
      track.classList.toggle('rk-fade-start', start);
      track.classList.toggle('rk-fade-end', end);
      arrows.classList.toggle('rk-hidden', max <= 2);
      back.disabled = !start;
      next.disabled = !end;
    };
    const queue = () => {
      if (!frame) frame = requestAnimationFrame(sync);
    };
    track.addEventListener('scroll', queue, { passive: true });
    const resizer = new ResizeObserver(queue);
    resizer.observe(track);
    queue();
    return { root, track, sync: queue, stop: () => resizer.disconnect() };
  };

  const removeRow = row => {
    row.stop();
    collapse(row.root);
  };

  const storeRow = ({ key, order, title, actions, entries, keyOf, make }) => {
    let row = null;
    const render = () => {
      const list = entries();
      if (!list.length) {
        if (row) removeRow(row);
        row = null;
        return;
      }
      if (!row) {
        row = homeRow(title, [], actions ? actions() : null);
        placeIn(homeRows(), row.root, order);
      }
      const existing = new Map([...row.track.children].map(node => [node.dataset.key, node]));
      row.track.replaceChildren(...list.map(entry => existing.get(keyOf(entry)) || make(entry)));
      row.sync();
    };
    render();
    watch(key, render);
  };

  const rowHint = (name, fallback) => {
    const hints = Rk.store.get('discovery.rowHints', null);
    const value = hints && typeof hints === 'object' ? hints[name] : null;
    return Number.isInteger(value) && value >= 0 ? Math.min(value, 8) : fallback;
  };

  const asyncRow = async ({ name, order, title, fallback, load }) => {
    const count = rowHint(name, fallback);
    let row = count ? homeRow(title, Array.from({ length: count }, skeletonTile)) : null;
    if (row) placeIn(homeRows(), row.root, order);
    const tiles = await load().catch(() => null);
    if (tiles && rowHint(name, -1) !== Math.min(tiles.length, 8)) {
      const hints = {};
      for (const key of ['updates', 'friends']) {
        if (rowHint(key, -1) >= 0) hints[key] = rowHint(key, -1);
      }
      hints[name] = Math.min(tiles.length, 8);
      Rk.store.set('discovery.rowHints', hints);
    }
    if (!tiles || !tiles.length) {
      if (row) removeRow(row);
      return;
    }
    if (row) {
      row.track.replaceChildren(...tiles);
      row.sync();
    } else {
      row = homeRow(title, tiles);
      placeIn(homeRows(), row.root, order);
    }
  };

  let friendsPromise = null;
  const friendIds = () => {
    if (!friendsPromise) {
      friendsPromise = Rk.me()
        .then(me => (me ? Rk.api.get(`https://friends.roblox.com/v1/users/${me.id}/friends`, { cache: 60000 }) : null))
        .then(json => [...new Set((json && Array.isArray(json.data) ? json.data : []).map(entry => Number(entry && entry.id)).filter(Rk.isId))])
        .catch(() => []);
    }
    return friendsPromise;
  };

  const presenceCache = new Map();
  const presenceFor = async ids => {
    const wanted = [...new Set(ids.map(Number).filter(Rk.isId))];
    const missing = wanted.filter(id => !presenceCache.has(id));
    if (missing.length) {
      const batch = Rk.api.presence(missing).catch(() => new Map());
      for (const id of missing) presenceCache.set(id, batch.then(map => map.get(id) || null));
    }
    const result = new Map();
    await Promise.all(wanted.map(async id => {
      const entry = await presenceCache.get(id);
      if (entry && typeof entry === 'object') result.set(id, entry);
    }));
    return result;
  };

  const batched = handle => {
    let queue = [];
    return node => {
      queue.push(node);
      if (queue.length > 1) return;
      queueMicrotask(() => {
        const nodes = queue.filter(item => item.isConnected);
        queue = [];
        if (nodes.length) handle(nodes);
      });
    };
  };

  const seeAll = tab => (Rk.isEnabled('discovery.historyModal') ? ui.button('See all', { variant: 'ghost', onClick: () => openHistory(tab) }) : null);

  Rk.feature({
    id: 'discovery.pinnedRow',
    category: 'discovery',
    name: 'Pinned row',
    description: 'Shows your pinned experiences as a row at the top of home.',
    pages: ['home'],
    css: homeStyles,
    run() {
      storeRow({
        key: 'pins.games',
        order: 1,
        title: 'Pinned',
        entries: () => gamesIn('pins.games'),
        keyOf: entry => String(entry.placeId),
        make: entry => gameTile({
          ...entry,
          play: { title: `Play ${entry.name}`, onClick: () => Rk.launch.place(entry.placeId) },
          menu: tile => [
            { label: 'Play', icon: 'play', onClick: () => Rk.launch.place(entry.placeId) },
            { label: 'Unpin', icon: 'pin', danger: true, onClick: () => {
              tile.classList.add('rk-home-tile-out');
              setTimeout(() => unpin(entry.placeId), 160);
            } }
          ]
        })
      });
    }
  });

  Rk.feature({
    id: 'discovery.recentRow',
    category: 'discovery',
    name: 'Recently viewed row',
    description: 'Shows the experiences you viewed last as a row on home.',
    pages: ['home'],
    css: homeStyles,
    run() {
      storeRow({
        key: 'history.games',
        order: 3,
        title: 'Recently viewed',
        actions: () => [
          seeAll('games'),
          ui.button('Clear', { variant: 'ghost', onClick: async () => {
            if (await ui.confirm('Your recently viewed experiences will be removed.', { title: 'Clear history', confirmLabel: 'Clear', danger: true })) save('history.games', []);
          } })
        ],
        entries: () => gamesIn('history.games').slice(0, 20),
        keyOf: entry => String(entry.placeId),
        make: entry => gameTile({
          ...entry,
          meta: entry.time ? fmt.ago(entry.time) : null,
          play: { title: `Play ${entry.name}`, onClick: () => Rk.launch.place(entry.placeId) }
        })
      });
    }
  });

  Rk.feature({
    id: 'discovery.updatesRow',
    category: 'discovery',
    name: 'Updated since you looked',
    description: 'Shows pinned experiences that updated since your last visit as a row on home.',
    pages: ['home'],
    css: homeStyles,
    async run() {
      const seen = Rk.store.get('games.seenUpdated', null);
      if (!seen || typeof seen !== 'object' || Array.isArray(seen)) return;
      const pins = gamesIn('pins.games').filter(entry => entry.universeId && typeof seen[entry.universeId] === 'string');
      if (!pins.length) return;
      await asyncRow({
        name: 'updates',
        order: 2,
        title: 'Updated since you looked',
        fallback: 0,
        load: async () => {
          const info = await Rk.api.games(pins.map(entry => entry.universeId));
          return pins.flatMap(entry => {
            const game = info.get(entry.universeId);
            const updated = game ? Date.parse(game.updated) : NaN;
            const last = Date.parse(seen[entry.universeId]);
            if (!Number.isFinite(updated) || !Number.isFinite(last) || updated <= last) return [];
            const name = clip(game.name) || entry.name;
            return [gameTile({
              ...entry,
              name,
              meta: `Updated ${fmt.ago(updated)}`,
              play: { title: `Play ${name}`, onClick: () => Rk.launch.place(entry.placeId) }
            })];
          });
        }
      });
    }
  });

  Rk.feature({
    id: 'discovery.friendsPlayingRow',
    category: 'discovery',
    name: 'Friends playing row',
    description: 'Shows the experiences your friends are in right now as a row on home.',
    pages: ['home'],
    css: homeStyles,
    async run() {
      if (!await Rk.me()) return;
      await asyncRow({ name: 'friends', order: 4, title: 'Friends playing', fallback: 4, load: async () => {
        const ids = (await friendIds()).slice(0, 200);
        if (!ids.length) return [];
        const presence = await presenceFor(ids);
        const groups = new Map();
        for (const id of ids) {
          const entry = presence.get(id);
          if (!entry || entry.userPresenceType !== 2 || !Rk.isId(entry.universeId) || !Rk.isId(entry.rootPlaceId || entry.placeId)) continue;
          const universeId = Number(entry.universeId);
          if (!groups.has(universeId)) groups.set(universeId, { universeId, placeId: Number(entry.rootPlaceId || entry.placeId), name: clip(entry.lastLocation), friends: [] });
          groups.get(universeId).friends.push(id);
        }
        if (!groups.size) return [];
        const sorted = [...groups.values()].sort((a, b) => b.friends.length - a.friends.length);
        const info = await Rk.api.games(sorted.map(group => group.universeId)).catch(() => new Map());
        const names = await Rk.api.users(sorted.flatMap(group => group.friends.slice(0, 3))).catch(() => new Map());
        return sorted.map(group => {
          const game = info.get(group.universeId);
          const name = clip(game && game.name) || group.name || 'Experience';
          const first = names.get(group.friends[0]);
          const firstName = first ? clip(first.displayName || first.name, 60) : 'friend';
          const others = group.friends.length - 1;
          return gameTile({
            placeId: game && Rk.isId(game.rootPlaceId) ? game.rootPlaceId : group.placeId,
            universeId: group.universeId,
            name,
            meta: [
              el('span', { class: 'rk-home-faces' }, group.friends.slice(0, 3).map(id => ui.thumb(Rk.thumb('AvatarHeadShot', id, '48x48', { circular: true }), { size: 20, round: true, alt: '' }))),
              first ? [
                el('span', { class: 'rk-home-who', title: others ? `${firstName} and ${fmt.plural(others, 'other friend')}` : firstName }, firstName),
                isVerified(group.friends[0], first.hasVerifiedBadge) ? ui.verified({ size: 14 }) : null,
                others ? el('span', null, `+${fmt.num(others)}`) : null
              ] : el('span', null, fmt.plural(group.friends.length, 'friend'))
            ],
            play: { title: `Join ${firstName}`, onClick: () => Rk.launch.follow(group.friends[0]) }
          });
        });
      } });
    }
  });

  Rk.feature({
    id: 'discovery.recentProfilesRow',
    category: 'discovery',
    name: 'Recent profiles row',
    description: 'Shows the profiles you visited last as a row on home.',
    default: false,
    pages: ['home'],
    css: homeStyles,
    run() {
      Rk.api.users(profilesIn().slice(0, 20).map(entry => entry.userId)).catch(() => null);
      storeRow({
        key: 'history.profiles',
        order: 5,
        title: 'Recent profiles',
        actions: () => [seeAll('profiles')],
        entries: () => profilesIn().slice(0, 20),
        keyOf: entry => String(entry.userId),
        make: entry => {
          const tile = thumbTile({
            key: String(entry.userId),
            href: `/users/${entry.userId}/profile`,
            name: entry.displayName,
            thumb: Rk.thumb('AvatarHeadShot', entry.userId, '150x150'),
            round: true
          });
          markUser(tile.querySelector('.rk-home-name'), entry.userId);
          return tile;
        }
      });
    }
  });

  Rk.feature({
    id: 'discovery.recentItemsRow',
    category: 'discovery',
    name: 'Recent items row',
    description: 'Shows the marketplace items you viewed last as a row on home.',
    default: false,
    pages: ['home'],
    css: homeStyles,
    run() {
      storeRow({
        key: 'history.items',
        order: 6,
        title: 'Recent items',
        actions: () => [seeAll('items')],
        entries: () => itemsIn().slice(0, 20),
        keyOf: entry => `${entry.kind}:${entry.id}`,
        make: entry => thumbTile({
          key: `${entry.kind}:${entry.id}`,
          href: `/${entry.kind === 'bundle' ? 'bundles' : 'catalog'}/${entry.id}`,
          name: entry.name,
          thumb: Rk.thumb(entry.kind === 'bundle' ? 'BundleThumbnail' : 'Asset', entry.id, '150x150')
        })
      });
    }
  });

  Rk.feature({
    id: 'discovery.shortcuts',
    category: 'discovery',
    name: 'Shortcuts row',
    description: 'Adds a row of quick links to avatar, inventory, trades and more on home.',
    default: false,
    pages: ['home'],
    css: homeStyles,
    run() {
      const links = [
        ['Avatar', 'user', '/my/avatar'],
        ['Inventory', 'grid', '/users/inventory'],
        ['Trades', 'swap', '/trades'],
        ['Transactions', 'robux', '/transactions'],
        ['Friends', 'users', '/users/friends'],
        ['Create', 'edit', 'https://create.roblox.com/']
      ].map(([label, name, href]) => el('a', { class: 'rk-home-shortcut', href }, icon(name, 22), el('span', null, label)));
      const row = homeRow('Shortcuts', links);
      placeIn(homeRows(), row.root, 0);
      Rk.me().then(me => {
        if (me) links[1].setAttribute('href', `/users/${me.id}/inventory`);
      });
    }
  });

  const sponsoredTitles = new Set(['sponsored', 'sponsored experiences']);
  const adBadges = '.game-card-native-ad, .native-ad-label, .ad-badge, [class*="sponsored" i], [data-testid*="sponsored" i]';

  Rk.feature({
    id: 'discovery.hideSponsored',
    category: 'discovery',
    name: 'Hide sponsored',
    description: 'Hides sponsored experiences and sponsored rows.',
    css: '.rk-ad-hidden { display: none !important; }',
    run() {
      const hideCard = card => {
        if (!isOurs(card)) cardBox(card).classList.add('rk-ad-hidden');
      };
      sortHeadings((title, row) => row.classList.add('rk-ad-hidden'), title => sponsoredTitles.has(title));
      Rk.observe(adBadges, badge => {
        const card = badge.closest(cardSelector);
        if (card) hideCard(card);
      });
      Rk.observe(cardSelector, card => {
        if ([...card.querySelectorAll('span, div, p')].some(node => !node.firstElementChild && clip(node.textContent, 40).toLowerCase() === 'sponsored')) hideCard(card);
      });
    }
  });

  Rk.feature({
    id: 'discovery.hideFriendsCarousel',
    category: 'discovery',
    name: 'Hide friends row',
    description: 'Hides the friends row on home.',
    default: false,
    css: `
.friends-carousel-container,
.people-list-container:has(.friends-carousel-container),
:is(div, section):has(> .container-header):has(> .friends-carousel-container),
:is(div, section):has(> .container-header):has(> * > .friends-carousel-container) {
  display: none !important;
}`
  });

  Rk.feature({
    id: 'discovery.hideSorts',
    category: 'discovery',
    name: 'Hide rows by title',
    description: 'Hides home and charts rows whose title you list.',
    default: false,
    pages: ['home', 'discover'],
    options: [
      { key: 'titles', label: 'Row titles', type: 'text', maxLength: 300, placeholder: 'comma separated, e.g. Continue, Recommended for you', default: '' }
    ],
    css: '.rk-sort-hidden { display: none !important; }',
    run(ctx) {
      const rows = new Map();
      const hidden = () => new Set(ctx.option('titles').split(',').map(text => text.trim().toLowerCase()).filter(Boolean));
      const apply = () => {
        const names = hidden();
        for (const [row, title] of rows) {
          if (!row.isConnected) rows.delete(row);
          else row.classList.toggle('rk-sort-hidden', names.has(title));
        }
      };
      sortHeadings((title, row) => {
        rows.set(row, title);
        row.classList.toggle('rk-sort-hidden', hidden().has(title));
      });
      Rk.onSettings(apply);
    }
  });

  Rk.feature({
    id: 'discovery.hideRecommended',
    category: 'discovery',
    name: 'Hide recommended for you',
    description: 'Hides the Recommended For You row on home.',
    default: false,
    pages: ['home'],
    css: '.rk-recommended-hidden { display: none !important; }',
    run(ctx) {
      const rows = new Set();
      Rk.observe('h2, h3, .container-header, .sort-header', node => {
        if (isOurs(node)) return;
        const heading = node.matches('.container-header') ? node.querySelector('h2, h3') || node.firstElementChild || node : node;
        if (!/^recommended for you\b/.test(clip(heading.textContent, 200).toLowerCase())) return;
        const row = rowFor(node);
        if (!row || rows.has(row)) return;
        rows.add(row);
        row.classList.toggle('rk-recommended-hidden', Rk.isEnabled(ctx.id));
      });
      Rk.onSettings(() => {
        for (const row of rows) {
          if (!row.isConnected) rows.delete(row);
          else row.classList.toggle('rk-recommended-hidden', Rk.isEnabled(ctx.id));
        }
      });
    }
  });

  Rk.feature({
    id: 'discovery.compactCards',
    category: 'discovery',
    name: 'Compact cards',
    description: 'Makes game cards smaller on home and charts so more fit on screen.',
    default: false,
    css: () => (['home', 'discover'].includes(Rk.page().type) ? `
:is(.game-grid, .game-carousel, ul.game-cards, .hlist.game-cards):not(:is(.game-grid, .game-carousel, ul.game-cards, .hlist.game-cards) *) {
  zoom: 0.85;
}` : '')
  });

  const friendTiles = handle => Rk.observe('.friends-carousel-tile', batched(async tiles => {
    const ids = tiles.map(tile => {
      const link = tile.querySelector('a[href*="/users/"]');
      return link ? Rk.idFrom(link.getAttribute('href'), 'user') : null;
    });
    const presence = await presenceFor(ids.filter(Boolean));
    tiles.forEach((tile, index) => {
      const entry = presence.get(ids[index]);
      if (entry && entry.userPresenceType === 2) handle(tile, ids[index], entry);
    });
  }));

  Rk.feature({
    id: 'discovery.friendGames',
    category: 'discovery',
    name: 'Friend game names',
    description: 'Shows the game each friend is playing under their name on the home friends row.',
    pages: ['home'],
    css: `
.rk-friend-game {
  width: 0;
  min-width: 100%;
  overflow: hidden;
  text-align: center;
  font-family: var(--rk-font);
  font-size: 12px;
  font-weight: 400;
  line-height: 16px;
  color: var(--rk-muted);
  white-space: nowrap;
  text-overflow: ellipsis;
  animation: rk-fade var(--rk-fast) ease both;
}`,
    run() {
      friendTiles((tile, id, entry) => {
        const name = clip(entry.lastLocation);
        if (!name || tile.querySelector('.rk-friend-game, .friends-carousel-tile-experience')) return;
        const label = el('div', { class: 'rk-friend-game', title: name }, name);
        const row = tile.querySelector('.friends-carousel-tile-label');
        if (row) row.after(label);
        else tile.append(label);
      });
    }
  });

  Rk.feature({
    id: 'discovery.friendJoin',
    category: 'discovery',
    name: 'Join from friends row',
    description: 'Adds a play button on friends who are in a game so you can join them from home.',
    pages: ['home'],
    css: `
.friends-carousel-tile:has(> .rk-friend-join) {
  position: relative;
}
.rk-friend-join {
  position: absolute;
  top: 4px;
  right: 4px;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: var(--rk-accent);
  color: var(--rk-accent-text);
  box-shadow: 0 2px 6px var(--rk-press);
  cursor: pointer;
  opacity: 0;
  transform: scale(0.85);
  transition: opacity var(--rk-fast) ease, transform var(--rk-fast) var(--rk-ease), background-color var(--rk-fast) ease;
}
.rk-friend-join .rk-icon path {
  fill: currentColor;
}
.friends-carousel-tile:hover > .rk-friend-join,
.rk-friend-join:focus-visible {
  opacity: 1;
  transform: scale(1);
}
.rk-friend-join:hover {
  background: var(--rk-accent-hover);
}
.rk-friend-join:focus-visible {
  outline: 2px solid var(--rk-accent);
  outline-offset: 2px;
}
@media (hover: none) {
  .rk-friend-join {
    opacity: 1;
    transform: none;
  }
}`,
    run() {
      friendTiles((tile, id, entry) => {
        if (tile.querySelector(':scope > .rk-friend-join')) return;
        const place = clip(entry.lastLocation);
        const title = place ? `Join in ${place}` : 'Join game';
        tile.append(el('button', {
          type: 'button',
          class: 'rk-friend-join',
          title,
          'aria-label': title,
          onclick: event => {
            event.preventDefault();
            event.stopPropagation();
            Rk.launch.follow(id);
          }
        }, icon('play', 14)));
      });
    }
  });

  Rk.feature({
    id: 'discovery.friendsOnline',
    category: 'discovery',
    name: 'Friends online count',
    description: 'Shows how many friends are online next to the home friends row title.',
    pages: ['home'],
    css: '.rk-friends-online { margin-left: 8px; animation: rk-fade var(--rk-fast) ease both; }',
    run() {
      Rk.observe('.friends-carousel-container', async carousel => {
        let heading = null;
        for (let parent = carousel, depth = 0; parent && !heading && depth < 4 && !parent.matches(pageRoots) && !parent.querySelector(cardSelector); parent = parent.parentElement, depth++) {
          heading = [...parent.querySelectorAll('h2, h3')].find(item => !isOurs(item)) || null;
        }
        if (!heading || heading.querySelector('.rk-friends-online')) return;
        const ids = (await friendIds()).slice(0, 200);
        if (!ids.length) return;
        const presence = await presenceFor(ids);
        const online = ids.filter(id => {
          const entry = presence.get(id);
          return entry && [1, 2, 3].includes(entry.userPresenceType);
        }).length;
        if (heading.querySelector('.rk-friends-online')) return;
        const pill = ui.pill(`${fmt.num(online)} online`, online ? 'success' : 'neutral', { title: 'Friends online right now' });
        pill.classList.add('rk-friends-online');
        heading.append(pill);
      });
    }
  });

  Rk.feature({
    id: 'discovery.greeting',
    category: 'discovery',
    name: 'Greeting',
    description: 'Shows a short greeting with your name at the top of home.',
    default: false,
    pages: ['home'],
    css: homeStyles,
    async run() {
      const me = await Rk.me();
      const hour = new Date().getHours();
      const part = hour >= 5 && hour < 12 ? 'morning' : hour >= 12 && hour < 18 ? 'afternoon' : 'evening';
      const name = me ? clip(me.displayName || me.name, 60) : '';
      const label = el('span', null, name);
      const line = el('div', { class: 'rk-home-greeting' }, name ? [`Good ${part}, `, label] : `Good ${part}`);
      const hideName = () => label.classList.toggle('rk-tools-streamer', Rk.isEnabled('tools.streamerMode') && Boolean(Rk.option('tools.streamerMode', 'blurName')));
      topBar().left.replaceChildren(line);
      if (!name) return;
      hideName();
      Rk.onSettings(hideName);
      markUser(line, me.id, 16);
    }
  });

  Rk.feature({
    id: 'discovery.friendActivity',
    category: 'discovery',
    name: 'Friend activity',
    description: 'Shows a timeline of what your friends played today on home. It only records what it sees while you have Roblox open in a tab.',
    default: false,
    css: ctx => `${homeStyles(ctx)}
.rk-activity-list { display: flex; flex-direction: column; }
.rk-activity-row { display: flex; align-items: center; gap: 10px; padding: 7px 4px; border-top: 1px solid var(--rk-border); font-size: 14px; color: var(--rk-text); }
.rk-activity-row:first-child { border-top: 0; }
.rk-activity-text { flex: 1; min-width: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.rk-activity-text a { font-weight: 600; color: var(--rk-text-strong) !important; }
.rk-activity-time { flex: none; font-size: 12px; color: var(--rk-muted); }
.rk-activity-empty { padding: 4px 0; font-size: 13px; color: var(--rk-muted); }
`,
    async run(ctx) {
      const me = await Rk.me();
      if (!me) return;
      const DAY = 86400000;
      const read = () => {
        const saved = Rk.store.get('friends.activity', null);
        return saved && typeof saved === 'object' && Array.isArray(saved.events) && saved.last && typeof saved.last === 'object' ? saved : { events: [], last: {} };
      };
      const describe = (event, link) => {
        const game = event.placeId ? el('a', { href: `/games/${event.placeId}` }, event.game || 'a game') : event.game || 'a game';
        if (event.type === 2) return [link, ' started playing ', game];
        if (event.type === 3) return [link, ' opened Studio'];
        if (event.type === 1) return [link, event.from === 2 ? ' left their game' : ' came online'];
        return [link, ' went offline'];
      };
      let section = null;
      const list = el('div', { class: 'rk-activity-list' });
      const render = async () => {
        if (Rk.page().type !== 'home') return;
        if (!section) {
          section = ui.section('Friend activity', list, { className: 'rk-activity' });
          placeIn(homeRows(), section, 8);
        }
        const now = Date.now();
        const events = read().events.filter(event => event && now - event.at < DAY).slice(-20).reverse();
        if (!events.length) {
          list.replaceChildren(el('div', { class: 'rk-activity-empty' }, 'Nothing yet today. What your friends play shows up here while you have Roblox open.'));
          return;
        }
        const users = await Rk.api.users(events.map(event => event.id)).catch(() => new Map());
        list.replaceChildren(...events.map(event => {
          const user = users.get(event.id) || {};
          const name = String(user.displayName || user.name || `User ${event.id}`);
          const link = el('a', { href: `/users/${event.id}/profile` }, name);
          return el('div', { class: 'rk-activity-row' },
            ui.thumb(Rk.thumb('AvatarHeadShot', event.id, '150x150'), { size: 32, round: true }),
            el('span', { class: 'rk-activity-text' }, describe(event, link)),
            el('span', { class: 'rk-activity-time' }, fmt.ago(event.at))
          );
        }));
      };
      const poll = async () => {
        if (!Rk.isEnabled(ctx.id) || document.visibilityState !== 'visible') return;
        const ids = await friendIds();
        if (!ids.length) return;
        const presence = await Rk.api.presence(ids).catch(() => null);
        if (!presence) return;
        const saved = read();
        const now = Date.now();
        const baseline = !Object.keys(saved.last).length;
        const last = {};
        const events = saved.events.filter(event => event && now - event.at < DAY);
        for (const id of ids) {
          const entry = presence.get(id);
          const type = entry ? Number(entry.userPresenceType) || 0 : 0;
          const placeId = type === 2 && entry ? Number(entry.rootPlaceId || entry.placeId) || null : null;
          const state = `${type}:${placeId || ''}`;
          const before = saved.last[id];
          if (!baseline && before && before.s !== state) {
            events.push({ id, at: now, type, from: Number(before.t) || 0, placeId, game: type === 2 && entry && typeof entry.lastLocation === 'string' ? clip(entry.lastLocation, 80) : '' });
          }
          last[id] = { s: state, t: type };
        }
        Rk.store.set('friends.activity', { events: events.slice(-200), last });
        render();
      };
      let timer = 0;
      const schedule = () => {
        clearInterval(timer);
        timer = document.visibilityState === 'visible' && Rk.isEnabled(ctx.id) ? setInterval(poll, 60000) : 0;
      };
      document.addEventListener('visibilitychange', () => {
        schedule();
        poll();
      });
      schedule();
      render();
      poll();
    }
  });

  Rk.feature({
    id: 'discovery.chartsFilter',
    category: 'discovery',
    name: 'Charts filter',
    description: 'Adds a search box on charts that filters the experiences shown by name.',
    pages: ['discover'],
    css: `
.rk-charts-filter {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0 0 16px;
  font-family: var(--rk-font);
}
.rk-charts-filter-field {
  position: relative;
  flex: 0 1 360px;
}
.rk-charts-filter-field .rk-icon {
  position: absolute;
  left: 10px;
  top: 50%;
  color: var(--rk-muted);
  transform: translateY(-50%);
  pointer-events: none;
}
.rk-charts-filter-field .rk-input {
  padding-left: 34px;
}
.rk-charts-filter-count {
  font-size: 13px;
  color: var(--rk-muted);
}
.rk-filter-hidden {
  display: none !important;
}`,
    run() {
      let query = '';
      const rows = new Set();
      const count = el('span', { class: 'rk-charts-filter-count', 'aria-live': 'polite' });
      const applyCard = card => {
        if (isOurs(card)) return false;
        const match = !query || cardName(card).toLowerCase().includes(query);
        cardBox(card).classList.toggle('rk-filter-hidden', !match);
        return match;
      };
      const apply = () => {
        let shown = 0;
        for (const card of document.querySelectorAll(cardSelector)) {
          if (applyCard(card)) shown++;
        }
        for (const row of rows) {
          if (!row.isConnected) rows.delete(row);
          else row.classList.toggle('rk-filter-hidden', Boolean(query) && [...row.querySelectorAll(cardSelector)].every(card => cardBox(card).classList.contains('rk-filter-hidden')));
        }
        count.textContent = query ? `${fmt.num(shown)} shown` : '';
      };
      const field = ui.input({
        type: 'search',
        placeholder: 'Filter experiences on this page',
        maxLength: 80,
        onInput: value => {
          query = value.trim().toLowerCase();
          apply();
        }
      });
      field.setAttribute('aria-label', 'Filter experiences');
      field.addEventListener('keydown', event => {
        if (event.key !== 'Escape' || !field.value) return;
        field.value = '';
        query = '';
        apply();
      });
      Rk.mount('#content', el('div', { class: 'rk-charts-filter' }, el('div', { class: 'rk-charts-filter-field' }, icon('search', 16), field), count), { position: 'prepend' });
      const refresh = batched(() => {
        if (query) apply();
      });
      sortHeadings((title, row) => {
        rows.add(row);
        refresh(row);
      });
      Rk.observe(cardSelector, refresh);
    }
  });

  const markCards = (key, className) => {
    const marked = new Set();
    let current = new Set(gamesIn(key).map(entry => entry.placeId));
    const apply = card => {
      const id = cardPlace(card);
      const on = Boolean(id) && current.has(id);
      card.classList.toggle(className, on);
      if (on) marked.add(card);
    };
    Rk.observe(cardSelector, card => {
      if (!isOurs(card)) apply(card);
    });
    watch(key, () => {
      current = new Set(gamesIn(key).map(entry => entry.placeId));
      for (const card of marked) {
        marked.delete(card);
        card.classList.remove(className);
      }
      for (const card of document.querySelectorAll(cardSelector)) {
        if (!isOurs(card)) apply(card);
      }
    });
  };

  Rk.feature({
    id: 'discovery.dimVisited',
    category: 'discovery',
    name: 'Dim visited',
    description: 'Fades game cards for experiences you already viewed.',
    default: false,
    css: `
.rk-card-visited {
  opacity: 0.6;
  transition: opacity var(--rk-fast) ease;
}
.rk-card-visited:hover,
.rk-card-visited:focus-within {
  opacity: 1;
}`,
    run() {
      markCards('history.games', 'rk-card-visited');
    }
  });

  Rk.feature({
    id: 'discovery.highlightPinned',
    category: 'discovery',
    name: 'Highlight pinned',
    description: 'Adds an accent ring to game cards for experiences you pinned.',
    css: `
.rk-card-pinned .game-card-thumb-container {
  position: relative;
}
.rk-card-pinned .game-card-thumb-container::after {
  content: "";
  position: absolute;
  inset: 0;
  z-index: 1;
  border-radius: var(--rk-radius);
  box-shadow: inset 0 0 0 2px var(--rk-accent);
  pointer-events: none;
  animation: rk-fade var(--rk-fast) ease both;
}`,
    run() {
      markCards('pins.games', 'rk-card-pinned');
    }
  });

  Rk.feature({
    id: 'discovery.cardActions',
    category: 'discovery',
    name: 'Card actions',
    description: 'Adds a small menu on game cards to pin, copy the link or open servers.',
    default: false,
    css: `
.game-card-thumb-container:has(> .rk-card-menu) {
  position: relative;
}
.rk-card-menu {
  position: absolute;
  top: 6px;
  right: 6px;
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: var(--rk-bg);
  color: var(--rk-text-strong);
  box-shadow: 0 2px 6px var(--rk-press);
  cursor: pointer;
  opacity: 0;
  transform: scale(0.9);
  transition: opacity var(--rk-fast) ease, transform var(--rk-fast) var(--rk-ease), background-color var(--rk-fast) ease;
}
.rk-card-menu:hover {
  background: var(--rk-surface-2);
}
.game-card-container:hover .rk-card-menu,
.rk-card-menu:focus-visible {
  opacity: 1;
  transform: scale(1);
}
.rk-card-menu:focus-visible {
  outline: 2px solid var(--rk-accent);
  outline-offset: 2px;
}
@media (hover: none) {
  .rk-card-menu {
    opacity: 1;
    transform: none;
  }
}`,
    run() {
      Rk.observe(cardSelector, card => {
        if (isOurs(card)) return;
        const placeId = cardPlace(card);
        const holder = card.querySelector('.game-card-thumb-container');
        if (!placeId || !holder || holder.querySelector(':scope > .rk-card-menu')) return;
        const trigger = el('button', {
          type: 'button',
          class: 'rk-card-menu',
          title: 'More actions',
          'aria-label': 'More actions',
          onclick: event => {
            event.preventDefault();
            event.stopPropagation();
            const pinned = gamesIn('pins.games').some(entry => entry.placeId === placeId);
            const name = cardName(card);
            ui.menu(trigger, [
              pinned
                ? { label: 'Unpin', icon: 'pin', onClick: () => {
                  unpin(placeId);
                  ui.toast(`Unpinned ${name || 'experience'}`);
                } }
                : { label: 'Pin', icon: 'pin', onClick: () => pinGame(placeId, name) },
              { label: 'Copy link', icon: 'link', onClick: () => ui.copy(`https://www.roblox.com/games/${placeId}`, 'Link copied') },
              { label: 'Open servers', icon: 'server', onClick: () => location.assign(`/games/${placeId}#!/game-instances`) }
            ]);
          }
        }, icon('chevronDown', 16));
        holder.append(trigger);
      });
    }
  });

  Rk.feature({
    id: 'discovery.fullTitles',
    category: 'discovery',
    name: 'Full titles',
    description: 'Shows the full experience name on game cards instead of cutting it off.',
    default: false,
    css: `
.game-card-name {
  display: block !important;
  height: auto !important;
  max-height: none !important;
  overflow: visible !important;
  white-space: normal !important;
  text-overflow: clip !important;
  overflow-wrap: anywhere;
  -webkit-line-clamp: unset !important;
}`
  });

  Rk.feature({
    id: 'discovery.randomGame',
    category: 'discovery',
    name: 'Surprise me',
    description: 'Adds a button on home that opens a random experience from the page.',
    default: false,
    pages: ['home'],
    css: homeStyles,
    run() {
      topBar().right.append(ui.button('Surprise me', {
        variant: 'secondary',
        size: 'md',
        icon: 'refresh',
        onClick: () => {
          const ids = [...new Set([...document.querySelectorAll(cardSelector)].filter(card => !isOurs(card) && card.getClientRects().length).map(cardPlace).filter(Boolean))];
          if (!ids.length) {
            ui.toast('No experiences on this page yet', { tone: 'warning' });
            return;
          }
          location.assign(`/games/${ids[Math.floor(Math.random() * ids.length)]}`);
        }
      }));
    }
  });

  const historyCss = `
.rk-history-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 12px;
  padding: 4px;
  border-radius: var(--rk-radius);
  background: var(--rk-surface);
}
.rk-history-tab {
  flex: 1;
  height: 32px;
  border: 0;
  border-radius: var(--rk-radius-s);
  background: transparent;
  color: var(--rk-text);
  font-family: var(--rk-font);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color var(--rk-fast) ease, color var(--rk-fast) ease;
}
.rk-history-tab:hover {
  color: var(--rk-text-strong);
}
.rk-history-tab[aria-selected="true"] {
  background: var(--rk-bg);
  color: var(--rk-text-strong);
  box-shadow: 0 1px 2px var(--rk-press);
}
.rk-history-tab:focus-visible {
  outline: 2px solid var(--rk-accent);
  outline-offset: 1px;
}
.rk-history-count {
  margin-left: 4px;
  font-weight: 500;
  color: var(--rk-muted);
}
.rk-history-list {
  min-height: 240px;
  animation: rk-fade var(--rk-fast) ease both;
}
.rk-history-list .rk-row {
  transition: background-color var(--rk-fast) ease, opacity var(--rk-fast) ease;
}
.rk-history-list .rk-row-out {
  opacity: 0;
}
.rk-history-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.rk-history-name {
  overflow: hidden;
  color: var(--rk-text-strong) !important;
  font-weight: 600;
  text-decoration: none !important;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.rk-history-name:hover {
  text-decoration: underline !important;
}
.rk-history-title {
  display: flex;
  align-items: center;
  min-width: 0;
}
.rk-history-title > .rk-history-name {
  min-width: 0;
}
.rk-history-sub {
  font-size: 12px;
  color: var(--rk-muted);
}`;

  const openHistory = (start = 'games') => {
    const tabs = Object.keys(history);
    let active = tabs.includes(start) ? start : 'games';
    const list = el('div', { class: 'rk-history-list', role: 'tabpanel' });
    const counts = new Map();
    const tabNodes = tabs.map(name => {
      const count = el('span', { class: 'rk-history-count' });
      counts.set(name, count);
      return el('button', {
        type: 'button',
        class: 'rk-history-tab',
        role: 'tab',
        dataset: { tab: name },
        onclick: () => {
          active = name;
          render();
        },
        onkeydown: event => {
          if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
          const index = (tabs.indexOf(active) + (event.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length;
          active = tabs[index];
          render();
          tabNodes[index].focus();
        }
      }, history[name].label, count);
    });
    const clearAll = ui.button('Clear all', {
      variant: 'danger',
      size: 'md',
      onClick: async () => {
        const source = history[active];
        if (!await ui.confirm(`All ${source.label.toLowerCase()} in your history will be removed.`, { title: 'Clear history', confirmLabel: 'Clear', danger: true })) return;
        save(source.key, []);
        render();
      }
    });
    Rk.api.users(profilesIn().map(entry => entry.userId)).catch(() => null);
    const render = () => {
      for (const name of tabs) counts.get(name).textContent = String(history[name].views().length);
      for (const node of tabNodes) node.setAttribute('aria-selected', node.dataset.tab === active ? 'true' : 'false');
      const source = history[active];
      const views = source.views();
      clearAll.disabled = !views.length;
      list.replaceChildren(...(views.length ? views.map(view => {
        const title = el('div', { class: 'rk-history-title' }, el('a', { class: 'rk-history-name', href: view.href, title: view.name }, view.name));
        if (view.userId) markUser(title, view.userId);
        const node = ui.row(
          [
            el('a', { href: view.href, tabindex: '-1' }, ui.thumb(view.thumb(), { size: 40, round: view.round, alt: '' })),
            el('div', { class: 'rk-history-text' },
              title,
              el('span', { class: 'rk-history-sub' }, [view.sub, view.time ? fmt.ago(view.time) : ''].filter(Boolean).join(' · '))
            )
          ],
          ui.button('', {
            variant: 'ghost',
            icon: 'close',
            title: 'Remove',
            onClick: () => {
              node.classList.add('rk-row-out');
              setTimeout(() => {
                save(source.key, listOf(source.key).filter(raw => !view.match(raw)));
                render();
              }, 140);
            }
          })
        );
        return node;
      }) : [ui.empty(source.empty)]));
    };
    render();
    const handle = ui.modal({
      title: 'History',
      width: 560,
      className: 'rk-history',
      content: [el('div', { class: 'rk-history-tabs', role: 'tablist', 'aria-label': 'History type' }, tabNodes), list],
      actions: [clearAll, ui.button('Done', { variant: 'primary', size: 'md', onClick: () => handle.close() })]
    });
    return handle;
  };

  Rk.feature({
    id: 'discovery.historyModal',
    category: 'discovery',
    name: 'History viewer',
    description: 'Lets you browse and clean up your recent experiences, profiles and items in one place.',
    css: historyCss
  });

  const keyword = () => {
    const params = new URLSearchParams(location.search);
    return clip(params.get('keyword') || params.get('Keyword') || '', 100);
  };

  const peopleSearch = () => /\/search\/users/i.test(Rk.page().path);

  const userCards = handle => {
    if (!peopleSearch()) return;
    Rk.observe('#content a[href*="/users/"]', batched(links => {
      const cards = new Map();
      for (const link of links) {
        const card = link.closest('.avatar-card-container, .avatar-card, .player-search-result, li');
        const id = Rk.idFrom(link.getAttribute('href'), 'user');
        if (card && id && !isOurs(card) && !cards.has(card)) cards.set(card, id);
      }
      if (cards.size) handle([...cards]);
    }));
  };

  const captionOf = card => card.querySelector('.avatar-card-caption') || card;

  const tagSlot = card => card.querySelector('.rk-search-tags') || captionOf(card).appendChild(el('div', { class: 'rk-search-tags' }));

  const setTag = (card, kind, pill) => {
    const slotNode = tagSlot(card);
    if (slotNode.querySelector(`[data-kind="${kind}"]`)) return;
    pill.dataset.kind = kind;
    if (kind === 'friend') slotNode.prepend(pill);
    else slotNode.append(pill);
  };

  const presenceLabels = { 1: ['Online', 'accent'], 2: ['In game', 'success'], 3: ['In Studio', 'warning'] };

  Rk.feature({
    id: 'discovery.searchPresence',
    category: 'discovery',
    name: 'Search presence',
    description: 'Shows who is online, in game or in Studio in people search results.',
    pages: ['search'],
    css: searchStyles,
    run() {
      userCards(async cards => {
        cards.forEach(([card]) => tagSlot(card));
        const presence = await presenceFor(cards.map(([, id]) => id));
        for (const [card, id] of cards) {
          const entry = presence.get(id);
          const label = entry && presenceLabels[entry.userPresenceType];
          if (!label) continue;
          const place = entry.userPresenceType === 2 ? clip(entry.lastLocation) : '';
          setTag(card, 'presence', ui.pill(label[0], label[1], { title: place || null }));
        }
      });
    }
  });

  Rk.feature({
    id: 'discovery.searchFriendTag',
    category: 'discovery',
    name: 'Search friend tag',
    description: 'Marks people you are friends with in people search results.',
    pages: ['search'],
    css: searchStyles,
    run() {
      userCards(async cards => {
        cards.forEach(([card]) => tagSlot(card));
        const friends = new Set(await friendIds());
        for (const [card, id] of cards) {
          if (friends.has(id)) setTag(card, 'friend', ui.pill('Friend', 'accent'));
        }
      });
    }
  });

  Rk.feature({
    id: 'discovery.searchJoinDate',
    category: 'discovery',
    name: 'Search join year',
    description: 'Shows the year each person joined in people search results.',
    default: false,
    pages: ['search'],
    css: searchStyles,
    run() {
      let budget = 30;
      userCards(cards => {
        for (const [card, id] of cards) {
          if (budget <= 0) return;
          if (card.querySelector('.rk-search-joined')) continue;
          budget--;
          const line = captionOf(card).appendChild(el('div', { class: 'rk-search-joined' }));
          Rk.api.get(`https://users.roblox.com/v1/users/${id}`, { cache: 3600000 }).then(user => {
            const created = user ? new Date(user.created) : null;
            if (created && !Number.isNaN(created.getTime())) line.textContent = `Joined ${created.getFullYear()}`;
          }, () => {});
        }
      });
    }
  });

  Rk.feature({
    id: 'discovery.idJump',
    category: 'discovery',
    name: 'Jump to id',
    description: 'When you search a number, offers links to the user, experience or item with that id.',
    pages: ['search'],
    css: searchStyles,
    run() {
      const text = keyword();
      if (!/^\d+$/.test(text) || !Rk.isId(text)) return;
      const id = Number(text);
      placeIn(searchTop(), ui.panel([
        el('span', { class: 'rk-search-jump-label' }, 'Jump to'),
        ui.button(`Open user #${id}`, { icon: 'user', href: `/users/${id}/profile` }),
        ui.button(`Open experience #${id}`, { icon: 'play', href: `/games/${id}` }),
        ui.button(`Open item #${id}`, { icon: 'tag', href: `/catalog/${id}` })
      ], { className: 'rk-search-jump' }), 1);
    }
  });

  Rk.feature({
    id: 'discovery.exactMatch',
    category: 'discovery',
    name: 'Exact username match',
    description: 'Shows the person whose username exactly matches your search at the top of people results.',
    pages: ['search'],
    css: searchStyles,
    async run() {
      const text = keyword();
      if (!peopleSearch() || !/^[A-Za-z0-9_]{3,20}$/.test(text)) return;
      const card = placeIn(searchTop(), ui.panel([
        el('div', { class: 'rk-skeleton', style: { width: '60px', height: '60px', borderRadius: '50%', flex: 'none' } }),
        el('div', { class: 'rk-search-exact-text' },
          el('div', { class: 'rk-skeleton', style: { width: '160px' } }),
          el('div', { class: 'rk-skeleton', style: { width: '100px', marginTop: '6px' } })
        )
      ], { className: 'rk-search-exact' }), 2);
      const json = await Rk.api.post('https://users.roblox.com/v1/usernames/users', { usernames: [text], excludeBannedUsers: false }).catch(() => null);
      const user = json && Array.isArray(json.data) ? json.data.find(entry => entry && Rk.isId(entry.id)) : null;
      if (!user) {
        collapse(card);
        return;
      }
      const [users] = await Promise.all([Rk.api.users([user.id]).catch(() => null), meLoaded]);
      const info = users ? users.get(Number(user.id)) : null;
      const verified = isVerified(user.id, user.hasVerifiedBadge === true || Boolean(info && info.hasVerifiedBadge === true));
      const name = clip(user.name, 40);
      const displayName = clip(user.displayName, 60) || name;
      const href = `/users/${Number(user.id)}/profile`;
      card.replaceChildren(
        el('a', { href, tabindex: '-1' }, ui.thumb(Rk.thumb('AvatarHeadShot', user.id, '150x150', { circular: true }), { size: 60, round: true, alt: displayName })),
        el('div', { class: 'rk-search-exact-text' },
          el('div', { class: 'rk-search-exact-title' }, el('a', { class: 'rk-search-exact-name', href }, displayName), verified ? ui.verified({ size: 16 }) : null, ui.pill('Exact match', 'accent')),
          el('div', { class: 'rk-search-exact-sub' }, `@${name}`)
        ),
        ui.button('View profile', { variant: 'primary', size: 'md', href })
      );
    }
  });

  Rk.feature({
    id: 'discovery.searchHistory',
    category: 'discovery',
    name: 'Search history',
    description: 'Remembers what you search from the header and shows recent searches as chips on search pages.',
    default: false,
    css: searchStyles,
    run() {
      const read = () => {
        const value = Rk.store.get('search.history', []);
        return Array.isArray(value) ? uniqueBy(value.filter(text => typeof text === 'string').map(text => clip(text, 100)).filter(Boolean), text => text.toLowerCase()).slice(0, 15) : [];
      };
      Rk.observe('#navbar-universal-search input, .navbar-search input', field => {
        field.addEventListener('keydown', event => {
          if (event.key !== 'Enter' || event.isComposing) return;
          const text = clip(field.value, 100);
          if (!text) return;
          save('search.history', [text, ...read().filter(item => item.toLowerCase() !== text.toLowerCase())].slice(0, 15));
        });
      });
      if (Rk.page().type !== 'search') return;
      let row = null;
      const render = () => {
        const list = read();
        if (!list.length) {
          if (row) collapse(row);
          row = null;
          return;
        }
        const current = keyword().toLowerCase();
        const chips = list.map(text => el('a', {
          class: `rk-search-chip${text.toLowerCase() === current ? ' rk-search-chip-active' : ''}`,
          href: `${location.pathname}?keyword=${encodeURIComponent(text)}`,
          title: text
        }, text));
        const next = el('div', { class: 'rk-search-history', dataset: { order: '0' } },
          el('span', { class: 'rk-search-history-label' }, 'Recent searches'),
          chips,
          ui.button('Clear', { variant: 'ghost', onClick: () => save('search.history', []) })
        );
        if (row && row.isConnected) row.replaceWith(next);
        else placeIn(searchTop(), next, 0);
        row = next;
      };
      render();
      watch('search.history', render);
    }
  });

  Rk.feature({
    id: 'discovery.cardPeek',
    category: 'discovery',
    name: 'Card peek',
    description: 'Hover a game card for a moment to see its active players, visits and rating.',
    default: false,
    css: `
.rk-peek {
  position: absolute;
  z-index: 2147481000;
  width: 200px;
  padding: 10px 12px;
  border: 1px solid var(--rk-border);
  border-radius: 12px;
  background: var(--rk-bg);
  box-shadow: var(--rk-shadow);
  color: var(--rk-text);
  font-family: var(--rk-font);
  font-size: 13px;
  line-height: 1.4;
  pointer-events: none;
  opacity: 0;
  transform: translateY(4px);
  transition: opacity var(--rk-fast) ease, transform var(--rk-fast) var(--rk-ease);
}
.rk-peek-in {
  opacity: 1;
  transform: translateY(0);
}
.rk-peek-name {
  margin-bottom: 6px;
  overflow: hidden;
  font-size: 14px;
  font-weight: 700;
  color: var(--rk-text-strong);
  white-space: nowrap;
  text-overflow: ellipsis;
}
.rk-peek-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 22px;
}
.rk-peek-label {
  color: var(--rk-muted);
}
.rk-peek-value {
  font-weight: 600;
  color: var(--rk-text-strong);
}
.rk-peek .rk-skeleton {
  width: 48px;
  height: 12px;
}`,
    run() {
      const cache = new Map();
      const load = placeId => {
        if (!cache.has(placeId)) {
          cache.set(placeId, Rk.api.universeId(placeId).then(async universeId => {
            if (!universeId) return null;
            const [info, votes] = await Promise.all([Rk.api.games([universeId]), Rk.api.votes([universeId]).catch(() => new Map())]);
            const game = info.get(universeId);
            return game ? { game, vote: votes.get(universeId) || null } : null;
          }).catch(() => null).then(result => {
            if (!result) cache.delete(placeId);
            return result;
          }));
        }
        return cache.get(placeId);
      };
      let timer = 0;
      let current = null;
      let popover = null;
      const hide = () => {
        clearTimeout(timer);
        timer = 0;
        current = null;
        if (!popover) return;
        const node = popover;
        popover = null;
        node.classList.remove('rk-peek-in');
        setTimeout(() => node.remove(), 180);
      };
      const line = (label, value) => el('div', { class: 'rk-peek-line' }, el('span', { class: 'rk-peek-label' }, label), el('span', { class: 'rk-peek-value' }, value));
      const show = async (card, placeId) => {
        const name = cardName(card);
        const values = [0, 1, 2].map(() => el('span', { class: 'rk-skeleton' }));
        const node = el('div', { class: 'rk-peek', role: 'tooltip' },
          name ? el('div', { class: 'rk-peek-name' }, name) : null,
          line('Active', values[0]),
          line('Visits', values[1]),
          line('Rating', values[2])
        );
        document.body.append(node);
        const rect = card.getBoundingClientRect();
        const width = node.offsetWidth;
        const right = rect.right + 8 + width <= window.innerWidth - 8;
        const left = right ? rect.right + 8 : Math.max(8, rect.left - 8 - width);
        const top = Math.min(Math.max(8, rect.top), Math.max(8, window.innerHeight - node.offsetHeight - 8));
        node.style.left = `${Math.round(left + window.scrollX)}px`;
        node.style.top = `${Math.round(top + window.scrollY)}px`;
        popover = node;
        requestAnimationFrame(() => node.classList.add('rk-peek-in'));
        const data = await load(placeId);
        if (popover !== node) return;
        if (!data) {
          hide();
          return;
        }
        const up = Number(data.vote && data.vote.upVotes) || 0;
        const down = Number(data.vote && data.vote.downVotes) || 0;
        values[0].replaceWith(fmt.num(data.game.playing));
        values[1].replaceWith(fmt.compact(data.game.visits));
        values[2].replaceWith(up + down ? fmt.percent(up, up + down, 0) : '-');
      };
      const onOver = event => {
        const card = event.target instanceof Element ? event.target.closest(cardSelector) : null;
        if (card === current) return;
        hide();
        const placeId = card && !isOurs(card) ? cardPlace(card) : null;
        if (!placeId) return;
        current = card;
        timer = setTimeout(() => {
          timer = 0;
          if (current === card && card.isConnected) show(card, placeId);
        }, 600);
      };
      document.addEventListener('mouseover', onOver, { passive: true });
      document.addEventListener('mousedown', hide, true);
      document.addEventListener('scroll', hide, { capture: true, passive: true });
      document.addEventListener('visibilitychange', hide);
      document.documentElement.addEventListener('mouseleave', hide);
    }
  });
})();
