const SETTINGS_KEY = 'rk:settings';
const DATA_KEY = 'rk:data';
const VALUES_KEY = 'rkbg:values';
const STATE_KEY = 'rkbg:state';
const UNFRIENDS_KEY = 'rkbg:unfriends';
const PLAYTIME_KEY = 'rkbg:playtime';
const VALUES_URL = 'https://api.rolimons.com/items/v2/itemdetails';
const VALUES_TTL = 10 * 60 * 1000;
const POLL_ALARM = 'rk-poll';
const ALERT_FEATURES = ['tools.friendOnlineAlerts', 'trading.tradeAlerts', 'trading.tradeBadge', 'tools.robuxAlerts', 'tools.unfriendAlerts', 'tools.watchFriend', 'tools.wishlistAlerts', 'tools.gameUpdateAlerts', 'tools.playtime'];
const NOTIFY_ICON = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGAAAABgCAYAAADimHc4AAABeUlEQVR42u3dgU3DQBBE0XhFR9APlAb9QE2hARRi5c6z8b1fQHyZf7NnK5F8uQAAVmWb9cGv79frmYL6+dq29gLOFvoRMjahZ2WU8LMbcBN8tg0l/GwbSvhZCSX8rIQSflZCCT8rocSUpez+bAtK+FkJRlDnEYSQAOPnuDGkAUYQAcZPcAxpgBFEAAggAAQQgAAvXRby/Xns9d4+NCAWfuqaLQUkg+ggoVYNv8saauXwO6zFXZBDmAAQ4EGsJaMeljod+BpAAAggAAQQAAIIAAEEEAACCAABBIAAAnAwrX8R6/xLlgYQAAIIwNMK6PL//PRaatUv3mUNtXIAHTZArToCuozANg9inc4Ed0EEgAACQAABIGA1AbPeFoS/s9UAI4iAu6qC8eNHA4wg1N7KYNz4+bcBJMwN3wh6hjNAC+bt/rsbQMKc8HeNIBLGh7/7DCBhfEY1+wLCv81DYXrbxuObslIXFv6ABqzaiJEbb9oOPpsMbQcAjOYX6ZKCsgWRhdEAAAAASUVORK5CYII=';

let valuesMemory = null;
let valuesRequest = null;
let csrfToken = null;

const isRobloxUrl = value => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && /(^|\.)roblox\.com$/i.test(url.hostname);
  } catch {
    return false;
  }
};

const cleanText = (value, max) => String(value == null ? '' : value).replace(/[\u0000-\u001f]/g, ' ').slice(0, max);

const loadValues = () => {
  if (valuesMemory && Date.now() - valuesMemory.time < VALUES_TTL) return Promise.resolve(valuesMemory.items);
  if (valuesRequest) return valuesRequest;
  valuesRequest = (async () => {
    const stored = (await chrome.storage.local.get(VALUES_KEY))[VALUES_KEY];
    if (stored && stored.items && Date.now() - stored.time < VALUES_TTL) {
      valuesMemory = stored;
      return stored.items;
    }
    try {
      const res = await fetch(VALUES_URL);
      if (!res.ok) throw new Error(`values request failed ${res.status}`);
      const json = await res.json();
      if (!json || !json.success || !json.items || typeof json.items !== 'object') throw new Error('values response was not valid');
      const items = {};
      for (const [id, item] of Object.entries(json.items)) {
        if (!/^\d+$/.test(id) || !Array.isArray(item)) continue;
        items[id] = item.slice(0, 10).map(part => (typeof part === 'number' ? part : cleanText(part, 120)));
      }
      valuesMemory = { time: Date.now(), items };
      await chrome.storage.local.set({ [VALUES_KEY]: valuesMemory });
      return items;
    } catch (err) {
      if (stored && stored.items) {
        valuesMemory = stored;
        return stored.items;
      }
      throw err;
    }
  })().finally(() => {
    valuesRequest = null;
  });
  return valuesRequest;
};

const robloxRequest = async (url, { method = 'GET', body } = {}) => {
  const headers = {};
  if (body !== undefined) headers['content-type'] = 'application/json';
  if (method !== 'GET' && csrfToken) headers['x-csrf-token'] = csrfToken;
  const send = () => fetch(url, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined, credentials: 'include' });
  let res = await send();
  if (res.status === 403 && method !== 'GET' && res.headers.get('x-csrf-token')) {
    csrfToken = res.headers.get('x-csrf-token');
    headers['x-csrf-token'] = csrfToken;
    res = await send();
  }
  if (!res.ok) throw new Error(`request failed ${res.status}`);
  return res.json();
};

const soundAsset = settings => {
  const options = settings && settings.options && settings.options['tools.alertSound'];
  const value = options && typeof options.assetId === 'string' ? options.assetId.trim() : '';
  return /^\d{1,20}$/.test(value) ? value : null;
};

const audioUrl = async assetId => {
  const json = await robloxRequest(`https://assetdelivery.roblox.com/v2/assetId/${assetId}`);
  const location = json && Array.isArray(json.locations) && json.locations[0] ? json.locations[0].location : null;
  if (typeof location !== 'string') throw new Error('audio has no location');
  const target = new URL(location);
  if (target.protocol !== 'https:' || !/(^|\.)rbxcdn\.com$/i.test(target.hostname)) throw new Error('audio host not allowed');
  return target.href;
};

const hasOffscreen = async () => (await chrome.runtime.getContexts({ contextTypes: ['OFFSCREEN_DOCUMENT'] })).length > 0;

const openOffscreen = async () => {
  try {
    await chrome.offscreen.createDocument({ url: 'offscreen.html', reasons: ['AUDIO_PLAYBACK'], justification: 'Plays notification sounds and background music' });
  } catch {}
};

const playSound = async () => {
  const settings = (await chrome.storage.local.get(SETTINGS_KEY))[SETTINGS_KEY];
  if (settings && settings.enabled && settings.enabled['tools.alertSound'] === false) return;
  const assetId = soundAsset(settings);
  const src = assetId ? await audioUrl(assetId).catch(() => null) : null;
  await openOffscreen();
  await chrome.runtime.sendMessage({ type: 'rk-play', src }).catch(() => {});
};

const syncMusic = async () => {
  const settings = (await chrome.storage.local.get(SETTINGS_KEY))[SETTINGS_KEY];
  const options = (settings && settings.options && settings.options['tools.backgroundMusic']) || {};
  const assetId = typeof options.assetId === 'string' && /^\d{1,20}$/.test(options.assetId.trim()) ? options.assetId.trim() : null;
  const volume = Number.isFinite(options.volume) ? Math.min(Math.max(options.volume, 0), 100) / 100 : 0.4;
  const tabs = assetId && isOn(settings, 'tools.backgroundMusic') ? await chrome.tabs.query({ url: 'https://www.roblox.com/*' }) : [];
  const open = await hasOffscreen();
  if (!tabs.length) {
    if (open) await chrome.runtime.sendMessage({ type: 'rk-music', id: null }).catch(() => {});
    return;
  }
  const current = open ? await chrome.runtime.sendMessage({ type: 'rk-music-state' }).catch(() => null) : null;
  if (current && current.id === assetId) {
    await chrome.runtime.sendMessage({ type: 'rk-music', id: assetId, volume }).catch(() => {});
    return;
  }
  const src = await audioUrl(assetId).catch(() => null);
  if (!src) return;
  await openOffscreen();
  await chrome.runtime.sendMessage({ type: 'rk-music', id: assetId, src, volume }).catch(() => {});
};

const notify = (title, message, url) => {
  const id = `rk|${Date.now()}|${isRobloxUrl(url) ? url : 'https://www.roblox.com/home'}`;
  chrome.notifications.create(id, {
    type: 'basic',
    iconUrl: NOTIFY_ICON,
    title: cleanText(title, 80),
    message: cleanText(message, 200),
    priority: 0,
    silent: true
  });
  playSound().catch(() => {});
};

const isOn = (settings, id) => Boolean(settings && settings.enabled && settings.enabled[id] === true);

const syncAlarm = async () => {
  const settings = (await chrome.storage.local.get(SETTINGS_KEY))[SETTINGS_KEY];
  const wanted = ALERT_FEATURES.some(id => isOn(settings, id));
  const existing = await chrome.alarms.get(POLL_ALARM);
  if (wanted && !existing) {
    chrome.alarms.create(POLL_ALARM, { periodInMinutes: 1, delayInMinutes: 0.1 });
  } else if (!wanted && existing) {
    await chrome.alarms.clear(POLL_ALARM);
  }
  if (!isOn(settings, 'trading.tradeBadge')) chrome.action.setBadgeText({ text: '' });
};

const pollFriends = async (userId, state) => {
  const friends = await robloxRequest(`https://friends.roblox.com/v1/users/${userId}/friends`);
  const ids = ((friends && friends.data) || []).map(friend => friend.id).filter(id => Number.isSafeInteger(id)).slice(0, 250);
  const previous = state.presence || {};
  const next = {};
  const cameOnline = [];
  for (let i = 0; i < ids.length; i += 50) {
    const json = await robloxRequest('https://presence.roblox.com/v1/presence/users', { method: 'POST', body: { userIds: ids.slice(i, i + 50) } });
    for (const entry of (json && json.userPresences) || []) {
      next[entry.userId] = entry.userPresenceType;
      const before = previous[entry.userId];
      if (state.presence && (before === 0 || before === undefined) && (entry.userPresenceType === 1 || entry.userPresenceType === 2)) cameOnline.push(entry);
    }
  }
  state.presence = next;
  if (!cameOnline.length) return;
  const lookup = await robloxRequest('https://users.roblox.com/v1/users', { method: 'POST', body: { userIds: cameOnline.slice(0, 20).map(entry => entry.userId), excludeBannedUsers: true } });
  const names = new Map(((lookup && lookup.data) || []).map(user => [user.id, user.displayName || user.name]));
  for (const entry of cameOnline.slice(0, 5)) {
    const name = names.get(entry.userId) || 'A friend';
    const playing = entry.userPresenceType === 2 && entry.lastLocation ? `Playing ${entry.lastLocation}` : 'Now online';
    notify(name, playing, `https://www.roblox.com/users/${entry.userId}/profile`);
  }
  if (cameOnline.length > 5) notify('Friends online', `${cameOnline.length - 5} more friends came online`, 'https://www.roblox.com/users/friends');
};

const pollTrades = async (settings, state) => {
  const json = await robloxRequest('https://trades.roblox.com/v1/trades/inbound/count');
  const count = Number(json && json.count) || 0;
  if (isOn(settings, 'trading.tradeBadge')) {
    chrome.action.setBadgeBackgroundColor({ color: '#335fff' });
    chrome.action.setBadgeText({ text: count > 0 ? String(Math.min(count, 99)) : '' });
  }
  if (isOn(settings, 'trading.tradeAlerts') && typeof state.tradeCount === 'number' && count > state.tradeCount) {
    const fresh = count - state.tradeCount;
    notify('New trade request', fresh === 1 ? 'You have a new inbound trade' : `You have ${fresh} new inbound trades`, 'https://www.roblox.com/trades');
  }
  state.tradeCount = count;
};

const pollRobux = async (userId, state) => {
  const json = await robloxRequest(`https://economy.roblox.com/v1/users/${userId}/currency`);
  const robux = Number(json && json.robux);
  if (!Number.isFinite(robux)) return;
  if (typeof state.robux === 'number' && robux !== state.robux) {
    const diff = robux - state.robux;
    notify('Robux balance changed', `${diff > 0 ? '+' : ''}${diff.toLocaleString()} Robux, balance is now ${robux.toLocaleString()}`, 'https://www.roblox.com/transactions');
  }
  state.robux = robux;
};

const friendIds = async userId => {
  const ids = [];
  let cursor = '';
  for (let page = 0; page < 40; page++) {
    const json = await robloxRequest(`https://friends.roblox.com/v1/users/${userId}/friends/find?limit=50${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`);
    const items = (json && (json.PageItems || json.data)) || [];
    for (const item of items) if (item && Number.isSafeInteger(item.id)) ids.push(item.id);
    cursor = json && (json.NextCursor || json.nextPageCursor);
    if (!cursor) return ids;
  }
  return ids;
};

const pollUnfriends = async (userId, state) => {
  const count = await robloxRequest(`https://friends.roblox.com/v1/users/${userId}/friends/count`);
  const total = Number(count && count.count);
  const previous = Array.isArray(state.friendIds) ? state.friendIds : null;
  if (previous && total === state.friendTotal && Date.now() - (state.friendsAt || 0) < 30 * 60 * 1000) return;
  const ids = await friendIds(userId);
  if (previous && previous.length > 5 && !ids.length) return;
  state.friendIds = ids;
  state.friendTotal = total;
  state.friendsAt = Date.now();
  if (!previous) return;
  const current = new Set(ids);
  const removed = previous.filter(id => !current.has(id)).slice(0, 50);
  if (!removed.length) return;
  const [all, active] = await Promise.all([
    robloxRequest('https://users.roblox.com/v1/users', { method: 'POST', body: { userIds: removed, excludeBannedUsers: false } }),
    robloxRequest('https://users.roblox.com/v1/users', { method: 'POST', body: { userIds: removed, excludeBannedUsers: true } })
  ]);
  const names = new Map(((all && all.data) || []).map(user => [user.id, user]));
  const activeIds = new Set(((active && active.data) || []).map(user => user.id));
  const time = Date.now();
  const entries = removed.map(id => {
    const user = names.get(id) || {};
    return { userId: id, name: cleanText(user.name, 40), displayName: cleanText(user.displayName || user.name, 60), banned: !activeIds.has(id), time };
  });
  const log = (await chrome.storage.local.get(UNFRIENDS_KEY))[UNFRIENDS_KEY];
  await chrome.storage.local.set({ [UNFRIENDS_KEY]: [...entries, ...(Array.isArray(log) ? log : [])].slice(0, 100) });
  for (const entry of entries.slice(0, 5)) {
    const name = entry.displayName || `User ${entry.userId}`;
    notify(entry.banned ? 'Friend removed' : 'Unfriended', entry.banned ? `${name} is no longer your friend, their account was banned or deleted` : `${name} unfriended you`, `https://www.roblox.com/users/${entry.userId}/profile`);
  }
  if (entries.length > 5) notify('Unfriended', `${entries.length - 5} more people are no longer your friends`, 'https://www.roblox.com/users/friends');
};

const watchTargets = async (settings, state) => {
  const options = (settings && settings.options && settings.options['tools.watchFriend']) || {};
  const raw = typeof options.users === 'string' ? options.users : '';
  if (state.watchKey === raw && Array.isArray(state.watchUsers)) return state.watchUsers;
  const parts = raw.split(',').map(part => part.trim()).filter(Boolean).slice(0, 10);
  const ids = parts.filter(part => /^\d{1,19}$/.test(part)).map(Number).filter(Number.isSafeInteger);
  const names = parts.filter(part => /^[A-Za-z0-9_]{3,20}$/.test(part) && !/^\d+$/.test(part));
  const users = [];
  if (names.length) {
    const json = await robloxRequest('https://users.roblox.com/v1/usernames/users', { method: 'POST', body: { usernames: names, excludeBannedUsers: true } });
    for (const user of (json && json.data) || []) users.push({ id: user.id, name: cleanText(user.displayName || user.name, 60) });
  }
  if (ids.length) {
    const json = await robloxRequest('https://users.roblox.com/v1/users', { method: 'POST', body: { userIds: ids, excludeBannedUsers: true } });
    for (const user of (json && json.data) || []) users.push({ id: user.id, name: cleanText(user.displayName || user.name, 60) });
  }
  state.watchKey = raw;
  state.watchUsers = users;
  state.watch = {};
  return users;
};

const pollWatched = async (settings, state) => {
  const users = await watchTargets(settings, state);
  if (!users.length) return;
  const json = await robloxRequest('https://presence.roblox.com/v1/presence/users', { method: 'POST', body: { userIds: users.map(user => user.id) } });
  const previous = state.watch || {};
  const next = {};
  for (const entry of (json && json.userPresences) || []) {
    const user = users.find(item => item.id === entry.userId);
    if (!user) continue;
    const now = { type: entry.userPresenceType, place: entry.placeId || entry.rootPlaceId || null };
    next[entry.userId] = now;
    const before = previous[entry.userId];
    if (!before) continue;
    const url = `https://www.roblox.com/users/${entry.userId}/profile`;
    if (now.type === 2 && (before.type !== 2 || before.place !== now.place)) notify(user.name, entry.lastLocation ? `Joined ${cleanText(entry.lastLocation, 120)}` : 'Joined a game', url);
    else if (now.type === 0 && before.type !== 0) notify(user.name, 'Went offline', url);
    else if (now.type === 1 && before.type === 0) notify(user.name, 'Came online', url);
    else if (now.type === 1 && before.type === 2) notify(user.name, 'Left their game', url);
  }
  state.watch = next;
};

const pollWishlist = async (settings, data, state) => {
  if (Date.now() - (state.wishlistAt || 0) < 15 * 60 * 1000) return;
  state.wishlistAt = Date.now();
  const list = Array.isArray(data && data.wishlist) ? data.wishlist : [];
  const items = list.filter(entry => entry && Number.isSafeInteger(entry.id) && (entry.kind === 'asset' || entry.kind === 'bundle')).slice(0, 100);
  if (!items.length) return;
  const options = (settings && settings.options && settings.options['tools.wishlistAlerts']) || {};
  const percent = Number.isFinite(options.percent) ? Math.min(Math.max(options.percent, 0), 95) : 0;
  const prices = state.wishPrices || {};
  const next = {};
  let sent = 0;
  for (let i = 0; i < items.length; i += 50) {
    const chunk = items.slice(i, i + 50);
    const json = await robloxRequest('https://catalog.roblox.com/v1/catalog/items/details', { method: 'POST', body: { items: chunk.map(entry => ({ itemType: entry.kind === 'bundle' ? 'Bundle' : 'Asset', id: entry.id })) } });
    for (const detail of (json && json.data) || []) {
      const entry = chunk.find(item => item.id === detail.id && (item.kind === 'bundle') === (detail.itemType === 'Bundle'));
      if (!entry) continue;
      const key = `${entry.kind}:${entry.id}`;
      const lowest = Number.isFinite(detail.lowestPrice) ? detail.lowestPrice : null;
      const price = lowest !== null ? lowest : Number.isFinite(detail.price) ? detail.price : null;
      next[key] = price;
      if (price === null || entry.price === 0) continue;
      const saved = Number.isFinite(entry.price) ? entry.price : null;
      const hit = saved === null || (price < saved && price <= saved * (1 - percent / 100));
      const before = prices[key];
      if (!hit || (Number.isFinite(before) && price >= before) || sent >= 3) continue;
      sent++;
      notify(cleanText(entry.name || detail.name, 80) || 'Wishlist item', saved === null ? `Now on sale for ${price.toLocaleString()} Robux` : `Dropped to ${price.toLocaleString()} Robux, was ${saved.toLocaleString()}`, `https://www.roblox.com/${entry.kind === 'bundle' ? 'bundles' : 'catalog'}/${entry.id}`);
    }
  }
  state.wishPrices = next;
};

const pollGameUpdates = async (data, state) => {
  if (Date.now() - (state.gamesAt || 0) < 10 * 60 * 1000) return;
  state.gamesAt = Date.now();
  const pins = Array.isArray(data && data['pins.games']) ? data['pins.games'] : [];
  const ids = [...new Set(pins.map(entry => entry && Number(entry.universeId)).filter(Number.isSafeInteger))].slice(0, 50);
  if (!ids.length) return;
  const json = await robloxRequest(`https://games.roblox.com/v1/games?universeIds=${ids.join(',')}`);
  const previous = state.gameUpdated || {};
  const next = {};
  for (const game of (json && json.data) || []) {
    if (typeof game.updated !== 'string') continue;
    next[game.id] = game.updated;
    if (previous[game.id] && previous[game.id] !== game.updated) notify(cleanText(game.name, 80), 'Just got an update', `https://www.roblox.com/games/${game.rootPlaceId}`);
  }
  state.gameUpdated = next;
};

const pollPlaytime = async (userId, state) => {
  const json = await robloxRequest('https://presence.roblox.com/v1/presence/users', { method: 'POST', body: { userIds: [userId] } });
  const entry = json && Array.isArray(json.userPresences) ? json.userPresences[0] : null;
  const now = Date.now();
  const universe = entry && entry.userPresenceType === 2 && Number.isSafeInteger(entry.universeId) ? entry.universeId : null;
  const last = state.playing;
  state.playing = universe ? { universe, time: now } : null;
  if (!universe || !last || last.universe !== universe) return;
  const minutes = Math.min(now - last.time, 2 * 60 * 1000) / 60000;
  const stored = (await chrome.storage.local.get(PLAYTIME_KEY))[PLAYTIME_KEY];
  const games = stored && typeof stored === 'object' ? stored : {};
  const game = games[universe] && typeof games[universe] === 'object' ? games[universe] : { minutes: 0 };
  games[universe] = { minutes: (Number(game.minutes) || 0) + minutes, placeId: entry.rootPlaceId || entry.placeId || game.placeId || null, name: cleanText(entry.lastLocation || game.name, 120), last: now };
  const kept = Object.entries(games).sort((a, b) => (b[1].last || 0) - (a[1].last || 0)).slice(0, 200);
  await chrome.storage.local.set({ [PLAYTIME_KEY]: Object.fromEntries(kept) });
};

const poll = async () => {
  const stored = await chrome.storage.local.get([SETTINGS_KEY, STATE_KEY, DATA_KEY]);
  const settings = stored[SETTINGS_KEY];
  const data = stored[DATA_KEY] && typeof stored[DATA_KEY] === 'object' ? stored[DATA_KEY] : {};
  if (!ALERT_FEATURES.some(id => isOn(settings, id))) return syncAlarm();
  let me;
  try {
    me = await robloxRequest('https://users.roblox.com/v1/users/authenticated');
  } catch {
    return;
  }
  let state = stored[STATE_KEY] && typeof stored[STATE_KEY] === 'object' ? stored[STATE_KEY] : {};
  if (state.userId !== me.id) state = { userId: me.id };
  const jobs = [];
  if (isOn(settings, 'tools.friendOnlineAlerts')) jobs.push(pollFriends(me.id, state));
  else delete state.presence;
  if (isOn(settings, 'trading.tradeAlerts') || isOn(settings, 'trading.tradeBadge')) jobs.push(pollTrades(settings, state));
  else delete state.tradeCount;
  if (isOn(settings, 'tools.robuxAlerts')) jobs.push(pollRobux(me.id, state));
  else delete state.robux;
  if (isOn(settings, 'tools.unfriendAlerts')) jobs.push(pollUnfriends(me.id, state));
  else delete state.friendIds;
  if (isOn(settings, 'tools.watchFriend')) jobs.push(pollWatched(settings, state));
  else delete state.watch;
  if (isOn(settings, 'tools.wishlistAlerts')) jobs.push(pollWishlist(settings, data, state));
  else delete state.wishPrices;
  if (isOn(settings, 'tools.gameUpdateAlerts')) jobs.push(pollGameUpdates(data, state));
  else delete state.gameUpdated;
  if (isOn(settings, 'tools.playtime')) jobs.push(pollPlaytime(me.id, state));
  else delete state.playing;
  await Promise.allSettled(jobs);
  await chrome.storage.local.set({ [STATE_KEY]: state });
};

const download = async ({ url, filename }) => {
  if (typeof url !== 'string') throw new Error('missing url');
  const target = new URL(url);
  if (target.protocol !== 'https:' || !/(^|\.)(rbxcdn\.com|roblox\.com)$/i.test(target.hostname)) throw new Error('download host not allowed');
  const safeName = cleanText(filename || 'roblox-image', 100).replace(/[\\/:*?"<>|]+/g, '-').replace(/^\.+/, '').trim() || 'roblox-image';
  await chrome.downloads.download({ url: target.href, filename: /\.(png|jpe?g|webp)$/i.test(safeName) ? safeName : `${safeName}.png`, saveAs: false });
  return true;
};

const handlers = {
  values: () => loadValues(),
  notify: payload => {
    if (!payload || typeof payload !== 'object') throw new Error('bad notification');
    notify(payload.title, payload.message, payload.url);
    return true;
  },
  download: payload => download(payload || {}),
  sound: () => playSound().then(() => true),
  music: () => syncMusic().then(() => true),
  unfriends: async () => {
    const log = (await chrome.storage.local.get(UNFRIENDS_KEY))[UNFRIENDS_KEY];
    return Array.isArray(log) ? log : [];
  },
  playtime: async () => {
    const games = (await chrome.storage.local.get(PLAYTIME_KEY))[PLAYTIME_KEY];
    return games && typeof games === 'object' ? games : {};
  },
  'poll-now': () => poll().then(() => true)
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id || !sender.url || !isRobloxUrl(sender.url)) return false;
  const handler = message && handlers[message.type];
  if (!handler) return false;
  Promise.resolve()
    .then(() => handler(message.payload))
    .then(data => sendResponse({ data }), err => sendResponse({ error: String((err && err.message) || err) }));
  return true;
});

chrome.action.onClicked.addListener(async tab => {
  if (tab && tab.id && tab.url && /^https:\/\/www\.roblox\.com\//i.test(tab.url)) {
    const opened = await chrome.tabs.sendMessage(tab.id, { type: 'open-settings' }).then(() => true, () => false);
    if (opened) return;
  }
  chrome.tabs.create({ url: 'https://www.roblox.com/home#rk-settings' });
});

chrome.runtime.onMessage.addListener((message, sender) => {
  if (sender.id !== chrome.runtime.id || !message || message.type !== 'rk-sound-done') return false;
  chrome.offscreen.closeDocument().catch(() => {});
  return false;
});

chrome.notifications.onClicked.addListener(id => {
  const parts = id.split('|');
  if (parts[0] !== 'rk') return;
  const url = parts.slice(2).join('|');
  if (isRobloxUrl(url)) chrome.tabs.create({ url });
  chrome.notifications.clear(id);
});

chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === POLL_ALARM) poll();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local' || !changes[SETTINGS_KEY]) return;
  syncAlarm();
  syncMusic().catch(() => {});
});

chrome.tabs.onRemoved.addListener(() => {
  syncMusic().catch(() => {});
});

chrome.tabs.onUpdated.addListener((tabId, change) => {
  if (change.url || change.status === 'complete') syncMusic().catch(() => {});
});

chrome.runtime.onInstalled.addListener(() => syncAlarm());
chrome.runtime.onStartup.addListener(() => syncAlarm());
