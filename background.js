const SETTINGS_KEY = 'rk:settings';
const DATA_KEY = 'rk:data';
const VALUES_KEY = 'rkbg:values';
const STATE_KEY = 'rkbg:state';
const UNFRIENDS_KEY = 'rkbg:unfriends';
const TERMS_KEY = 'rkbg:terms';
const PLAYTIME_KEY = 'rkbg:playtime';
const DROPS_KEY = 'rkbg:drops';
const VALUES_URL = 'https://api.rolimons.com/items/v2/itemdetails';
const VALUES_TTL = 10 * 60 * 1000;
const POLL_ALARM = 'rk-poll';
const ALERT_FEATURES = ['tools.friendOnlineAlerts', 'trading.tradeAlerts', 'trading.tradeBadge', 'tools.robuxAlerts', 'tools.unfriendAlerts', 'tools.watchFriend', 'tools.wishlistAlerts', 'tools.gameUpdateAlerts', 'tools.playtime', 'tools.itemDrops', 'tools.terminationWatch', 'trading.resaleAlerts'];

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

const audioUrls = new Map();

const audioUrl = async assetId => {
  const cached = audioUrls.get(assetId);
  if (cached && Date.now() - cached.at < 3600000) return cached.url;
  const json = await robloxRequest(`https://assetdelivery.roblox.com/v2/assetId/${assetId}`);
  const location = json && Array.isArray(json.locations) && json.locations[0] ? json.locations[0].location : null;
  if (typeof location !== 'string') throw new Error('audio has no location');
  const target = new URL(location);
  if (target.protocol !== 'https:' || !/(^|\.)rbxcdn\.com$/i.test(target.hostname)) throw new Error('audio host not allowed');
  audioUrls.set(assetId, { url: target.href, at: Date.now() });
  if (audioUrls.size > 20) audioUrls.delete(audioUrls.keys().next().value);
  return target.href;
};

const hasOffscreen = async () => (await chrome.runtime.getContexts({ contextTypes: ['OFFSCREEN_DOCUMENT'] })).length > 0;

const openOffscreen = async () => {
  try {
    await chrome.offscreen.createDocument({ url: 'offscreen.html', reasons: ['AUDIO_PLAYBACK'], justification: 'Plays notification sounds and background music' });
  } catch {}
};

const soundKey = assetId => `rkbg:sound:${assetId}`;

const encodeBytes = buffer => {
  const bytes = new Uint8Array(buffer);
  let text = '';
  for (let i = 0; i < bytes.length; i += 0x8000) text += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(text);
};

const soundMemory = new Map();

const soundBytes = async assetId => {
  if (soundMemory.has(assetId)) return soundMemory.get(assetId);
  const key = soundKey(assetId);
  const saved = (await chrome.storage.local.get(key))[key];
  if (typeof saved === 'string' && saved) {
    soundMemory.set(assetId, saved);
    return saved;
  }
  const response = await fetch(await audioUrl(assetId));
  if (!response.ok) throw new Error(`audio request failed ${response.status}`);
  const buffer = await response.arrayBuffer();
  if (buffer.byteLength > 1500000) throw new Error('audio too large to keep');
  const data = encodeBytes(buffer);
  soundMemory.set(assetId, data);
  if (soundMemory.size > 4) soundMemory.delete(soundMemory.keys().next().value);
  await chrome.storage.local.set({ [key]: data });
  return data;
};

const termSoundAsset = settings => {
  const options = settings && settings.options && settings.options['tools.terminationWatch'];
  const value = options && typeof options.assetId === 'string' ? options.assetId.trim() : '';
  return isOn(settings, 'tools.terminationWatch') && /^\d{1,20}$/.test(value) ? value : null;
};

const purchaseSoundAsset = settings => {
  const options = settings && settings.options && settings.options['tools.purchaseFailSound'];
  const value = options && typeof options.assetId === 'string' ? options.assetId.trim() : '';
  return isOn(settings, 'tools.purchaseFailSound') && /^\d{1,20}$/.test(value) ? value : null;
};

const preloadSounds = async () => {
  const settings = (await chrome.storage.local.get(SETTINGS_KEY))[SETTINGS_KEY];
  const wanted = [settings && settings.enabled && settings.enabled['tools.alertSound'] === false ? null : soundAsset(settings), purchaseSoundAsset(settings), termSoundAsset(settings)].filter(Boolean);
  const kept = (await chrome.storage.local.get('rkbg:sounds'))['rkbg:sounds'];
  const stale = (Array.isArray(kept) ? kept : []).filter(id => typeof id === 'string' && !wanted.includes(id)).map(soundKey);
  if (stale.length) await chrome.storage.local.remove(stale);
  await chrome.storage.local.set({ 'rkbg:sounds': wanted });
  await Promise.allSettled(wanted.map(soundBytes));
};

const playSound = async override => {
  const settings = (await chrome.storage.local.get(SETTINGS_KEY))[SETTINGS_KEY];
  const custom = override && typeof override === 'object' && typeof override.assetId === 'string' && /^\d{1,20}$/.test(override.assetId.trim()) ? override.assetId.trim() : null;
  if (!custom && settings && settings.enabled && settings.enabled['tools.alertSound'] === false) return;
  const assetId = custom || soundAsset(settings);
  await openOffscreen();
  if (assetId) {
    const ready = await chrome.runtime.sendMessage({ type: 'rk-play', key: assetId }).catch(() => null);
    if (ready && ready.played) return;
  }
  const data = assetId ? await soundBytes(assetId).catch(() => null) : null;
  await chrome.runtime.sendMessage({ type: 'rk-play', key: data ? assetId : null, data }).catch(() => {});
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
    return 'off';
  }
  const current = open ? await chrome.runtime.sendMessage({ type: 'rk-music-state' }).catch(() => null) : null;
  if (current && current.id === assetId) {
    await chrome.runtime.sendMessage({ type: 'rk-music', id: assetId, volume }).catch(() => {});
    return 'playing';
  }
  await openOffscreen();
  const stored = await chrome.runtime.sendMessage({ type: 'rk-music', id: assetId, volume }).catch(() => null);
  if (stored && stored.state !== 'need') return stored.state;
  const src = await audioUrl(assetId).catch(() => null);
  if (!src) return 'unavailable';
  const result = await chrome.runtime.sendMessage({ type: 'rk-music', id: assetId, src, volume }).catch(() => null);
  return result ? result.state : 'unavailable';
};

const iconCache = new Map();

const thumbIcon = async (key, url) => {
  if (iconCache.has(key)) return iconCache.get(key);
  const json = await robloxRequest(url).catch(() => null);
  const entry = json && Array.isArray(json.data) ? json.data[0] : null;
  const src = entry && entry.state === 'Completed' && typeof entry.imageUrl === 'string' ? entry.imageUrl : null;
  if (!src || !/^https:\/\/[a-z0-9.-]+\.rbxcdn\.com\//i.test(src)) return null;
  const response = await fetch(src, { credentials: 'omit' }).catch(() => null);
  if (!response || !response.ok) return null;
  const data = `data:image/png;base64,${encodeBytes(await response.arrayBuffer())}`;
  iconCache.set(key, data);
  if (iconCache.size > 150) iconCache.delete(iconCache.keys().next().value);
  return data;
};

const drawIcon = async (key, paint) => {
  if (iconCache.has(key)) return iconCache.get(key);
  const canvas = new OffscreenCanvas(128, 128);
  paint(canvas.getContext('2d'));
  const blob = await canvas.convertToBlob({ type: 'image/png' });
  const data = `data:image/png;base64,${encodeBytes(await blob.arrayBuffer())}`;
  iconCache.set(key, data);
  return data;
};

const robuxIcon = () => drawIcon('draw:robux', context => {
  context.fillStyle = '#1f2126';
  context.beginPath();
  context.roundRect(0, 0, 128, 128, 28);
  context.fill();
  context.strokeStyle = '#ffffff';
  context.lineWidth = 9;
  context.lineJoin = 'round';
  context.beginPath();
  for (let side = 0; side < 6; side += 1) {
    const angle = (Math.PI / 3) * side - Math.PI / 2;
    const x = 64 + 40 * Math.cos(angle);
    const y = 64 + 40 * Math.sin(angle);
    if (side) context.lineTo(x, y);
    else context.moveTo(x, y);
  }
  context.closePath();
  context.stroke();
  context.lineWidth = 8;
  context.strokeRect(53, 53, 22, 22);
});

const blankIcon = () => drawIcon('draw:blank', () => {});

const notifyIcon = async icon => {
  if (icon === 'robux') return robuxIcon();
  if (!icon || typeof icon !== 'object') return null;
  const id = Number(icon.user || icon.asset || icon.bundle || icon.game);
  if (!Number.isSafeInteger(id) || id <= 0) return null;
  if (icon.user) return thumbIcon(`user:${id}`, `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${id}&size=150x150&format=Png&isCircular=true`);
  if (icon.asset) return thumbIcon(`asset:${id}`, `https://thumbnails.roblox.com/v1/assets?assetIds=${id}&size=150x150&format=Png`);
  if (icon.bundle) return thumbIcon(`bundle:${id}`, `https://thumbnails.roblox.com/v1/bundles/thumbnails?bundleIds=${id}&size=150x150&format=Png`);
  return thumbIcon(`game:${id}`, `https://thumbnails.roblox.com/v1/games/icons?universeIds=${id}&size=150x150&format=Png`);
};

const notify = async (title, message, url, sound, icon) => {
  const id = `rk|${Date.now()}|${isRobloxUrl(url) ? url : 'https://www.roblox.com/home'}`;
  const iconUrl = (await notifyIcon(icon).catch(() => null)) || (await blankIcon());
  chrome.notifications.create(id, {
    type: 'basic',
    iconUrl,
    title: cleanText(title, 80),
    message: cleanText(message, 200),
    priority: 0,
    silent: true
  });
  playSound(sound).catch(() => {});
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
    notify(name, playing, `https://www.roblox.com/users/${entry.userId}/profile`, undefined, { user: entry.userId });
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
    notify('Robux balance changed', `${diff > 0 ? '+' : ''}${diff.toLocaleString()} Robux, balance is now ${robux.toLocaleString()}`, 'https://www.roblox.com/transactions', undefined, 'robux');
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
    return { userId: id, name: cleanText(user.name, 40), displayName: cleanText(user.displayName || user.name, 60), banned: !activeIds.has(id), time, owner: userId };
  });
  const log = (await chrome.storage.local.get(UNFRIENDS_KEY))[UNFRIENDS_KEY];
  await chrome.storage.local.set({ [UNFRIENDS_KEY]: [...entries, ...(Array.isArray(log) ? log : [])].slice(0, 100) });
  for (const entry of entries.slice(0, 5)) {
    const name = entry.displayName || `User ${entry.userId}`;
    notify(entry.banned ? 'Friend removed' : 'Unfriended', entry.banned ? `${name} is no longer your friend, their account was banned or deleted` : `${name} unfriended you`, `https://www.roblox.com/users/${entry.userId}/profile`, undefined, { user: entry.userId });
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
    if (now.type === 2 && (before.type !== 2 || before.place !== now.place)) notify(user.name, entry.lastLocation ? `Joined ${cleanText(entry.lastLocation, 120)}` : 'Joined a game', url, undefined, { user: user.id });
    else if (now.type === 0 && before.type !== 0) notify(user.name, 'Went offline', url, undefined, { user: user.id });
    else if (now.type === 1 && before.type === 0) notify(user.name, 'Came online', url, undefined, { user: user.id });
    else if (now.type === 1 && before.type === 2) notify(user.name, 'Left their game', url, undefined, { user: user.id });
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
      notify(cleanText(entry.name || detail.name, 80) || 'Wishlist item', saved === null ? `Now on sale for ${price.toLocaleString()} Robux` : `Dropped to ${price.toLocaleString()} Robux, was ${saved.toLocaleString()}`, `https://www.roblox.com/${entry.kind === 'bundle' ? 'bundles' : 'catalog'}/${entry.id}`, undefined, entry.kind === 'bundle' ? { bundle: entry.id } : { asset: entry.id });
    }
  }
  state.wishPrices = next;
};

const pollPriceAlerts = async (data, state) => {
  if (Date.now() - (state.priceAlertsAt || 0) < 110000) return;
  state.priceAlertsAt = Date.now();
  const alerts = (Array.isArray(data['trading.priceAlerts']) ? data['trading.priceAlerts'] : [])
    .filter(alert => alert && Number.isSafeInteger(alert.id) && alert.id > 0 && Number.isFinite(alert.target) && alert.target > 0)
    .slice(0, 30);
  const hits = state.priceHits && typeof state.priceHits === 'object' ? state.priceHits : {};
  const next = {};
  const lows = {};
  for (const alert of alerts) {
    let collectible = typeof alert.collectible === 'string' && /^[0-9a-f-]{36}$/i.test(alert.collectible) ? alert.collectible : null;
    if (!collectible) {
      const details = await robloxRequest(`https://economy.roblox.com/v2/assets/${alert.id}/details`).catch(() => null);
      collectible = details && typeof details.CollectibleItemId === 'string' && /^[0-9a-f-]{36}$/i.test(details.CollectibleItemId) ? details.CollectibleItemId : null;
    }
    if (!collectible) continue;
    const json = await robloxRequest(`https://apis.roblox.com/marketplace-sales/v1/item/${collectible}/resellers?limit=1`).catch(() => null);
    const listing = json && Array.isArray(json.data) ? json.data[0] : null;
    const price = listing && Number.isFinite(Number(listing.price)) ? Number(listing.price) : null;
    if (price === null) continue;
    lows[alert.id] = price;
    if (price > alert.target) continue;
    const key = `${alert.id}:${alert.target}`;
    next[key] = true;
    if (!hits[key]) notify(cleanText(alert.name, 80) || 'Price alert', `Listed for ${price.toLocaleString()} Robux, your target was ${alert.target.toLocaleString()}`, `https://www.roblox.com/catalog/${alert.id}`, undefined, { asset: Number(alert.id) });
  }
  state.priceHits = next;
  await chrome.storage.local.set({ 'rkbg:priceLows': lows });
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
    if (previous[game.id] && previous[game.id] !== game.updated) notify(cleanText(game.name, 80), 'Just got an update', `https://www.roblox.com/games/${game.rootPlaceId}`, undefined, { game: game.id });
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
  const key = `${PLAYTIME_KEY}:${userId}`;
  const saved = await chrome.storage.local.get([key, PLAYTIME_KEY]);
  const stored = saved[key] || saved[PLAYTIME_KEY];
  if (!saved[key] && saved[PLAYTIME_KEY]) await chrome.storage.local.remove(PLAYTIME_KEY);
  const games = stored && typeof stored === 'object' ? stored : {};
  const game = games[universe] && typeof games[universe] === 'object' ? games[universe] : { minutes: 0 };
  games[universe] = { minutes: (Number(game.minutes) || 0) + minutes, placeId: entry.rootPlaceId || entry.placeId || game.placeId || null, name: cleanText(entry.lastLocation || game.name, 120), last: now };
  const kept = Object.entries(games).sort((a, b) => (b[1].last || 0) - (a[1].last || 0)).slice(0, 200);
  await chrome.storage.local.set({ [key]: Object.fromEntries(kept) });
};

const pollDrops = async state => {
  if (Date.now() - (state.dropsAt || 0) < 5 * 60 * 1000) return;
  state.dropsAt = Date.now();
  const json = await robloxRequest('https://catalog.roblox.com/v1/search/items/details?Category=1&CreatorName=Roblox&SortType=3&Limit=30');
  const items = ((json && json.data) || []).filter(item => item && Number.isSafeInteger(item.id) && (item.itemType === 'Asset' || item.itemType === 'Bundle') && item.creatorTargetId === 1);
  if (!items.length) return;
  const keyOf = item => `${item.itemType === 'Bundle' ? 'b' : 'a'}${item.id}`;
  const seen = Array.isArray(state.dropsSeen) ? state.dropsSeen : null;
  state.dropsSeen = [...new Set([...items.map(keyOf), ...(seen || [])])].slice(0, 300);
  if (!seen) return;
  const now = Date.now();
  const entries = items
    .filter(item => !seen.includes(keyOf(item)))
    .map(item => ({
      id: item.id,
      kind: item.itemType === 'Bundle' ? 'bundle' : 'asset',
      name: cleanText(item.name, 120),
      price: Number.isFinite(item.price) ? item.price : null,
      created: Date.parse(item.itemCreatedUtc) || now,
      time: now
    }))
    .filter(entry => now - entry.created < 3 * 24 * 60 * 60 * 1000);
  if (!entries.length) return;
  const log = (await chrome.storage.local.get(DROPS_KEY))[DROPS_KEY];
  await chrome.storage.local.set({ [DROPS_KEY]: [...entries, ...(Array.isArray(log) ? log : [])].slice(0, 100) });
  for (const entry of entries.slice(0, 3)) {
    const price = entry.price === null ? 'New item from Roblox' : entry.price === 0 ? 'New free item from Roblox' : `New item from Roblox for ${entry.price.toLocaleString()} Robux`;
    notify(entry.name || 'New Roblox item', price, `https://www.roblox.com/${entry.kind === 'bundle' ? 'bundles' : 'catalog'}/${entry.id}`, undefined, entry.kind === 'bundle' ? { bundle: entry.id } : { asset: entry.id });
  }
  if (entries.length > 3) notify('New Roblox items', `${entries.length - 3} more new items from Roblox`, 'https://www.roblox.com/catalog?CreatorName=Roblox&SortType=3');
};

const pollTerms = async (settings, data, state) => {
  const ids = (Array.isArray(data['tools.terminationWatch']) ? data['tools.terminationWatch'] : []).map(Number).filter(id => Number.isSafeInteger(id) && id > 0).slice(0, 100);
  const idsKey = ids.join(',');
  if (state.termsKey === idsKey && state.termsAt && Date.now() - state.termsAt < 300000) return;
  state.termsKey = idsKey;
  state.termsAt = Date.now();
  const saved = (await chrome.storage.local.get(TERMS_KEY))[TERMS_KEY];
  const previous = saved && saved.users && typeof saved.users === 'object' ? saved.users : {};
  const log = saved && Array.isArray(saved.log) ? saved.log : [];
  const users = {};
  if (ids.length) {
    const [all, active] = await Promise.all([
      robloxRequest('https://users.roblox.com/v1/users', { method: 'POST', body: { userIds: ids, excludeBannedUsers: false } }),
      robloxRequest('https://users.roblox.com/v1/users', { method: 'POST', body: { userIds: ids, excludeBannedUsers: true } })
    ]);
    const activeIds = new Set(((active && active.data) || []).map(user => user.id));
    const sound = termSoundAsset(settings);
    const now = Date.now();
    for (const user of (all && all.data) || []) {
      if (!user || !ids.includes(user.id)) continue;
      const banned = !activeIds.has(user.id);
      const entry = { name: cleanText(user.name, 40), displayName: cleanText(user.displayName || user.name, 40), banned, checked: now };
      const before = previous[user.id];
      if (before && typeof before.banned === 'boolean' && before.banned !== banned) {
        log.unshift({ userId: user.id, name: entry.name, displayName: entry.displayName, event: banned ? 'terminated' : 'returned', time: now });
        if (banned) notify(`${entry.displayName} was terminated`, `@${entry.name} is no longer on Roblox`, `https://www.roblox.com/users/${user.id}/profile`, sound ? { assetId: sound } : undefined, { user: user.id });
        else notify(`${entry.displayName} is back`, `@${entry.name} is no longer terminated`, `https://www.roblox.com/users/${user.id}/profile`, sound ? { assetId: sound } : undefined, { user: user.id });
      }
      users[user.id] = entry;
    }
  }
  await chrome.storage.local.set({ [TERMS_KEY]: { users, log: log.slice(0, 100) } });
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
  if (isOn(settings, 'tools.itemDrops')) jobs.push(pollDrops(state));
  else delete state.dropsSeen;
  if (isOn(settings, 'tools.terminationWatch')) jobs.push(pollTerms(settings, data, state));
  else delete state.termsAt;
  if (isOn(settings, 'trading.resaleAlerts')) jobs.push(pollPriceAlerts(data, state));
  else delete state.priceHits;
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

const imageData = async ({ url } = {}) => {
  if (typeof url !== 'string') throw new Error('missing url');
  const target = new URL(url);
  if (target.protocol !== 'https:') throw new Error('only https images');
  const response = await fetch(target.href, { credentials: 'omit' });
  if (!response.ok) throw new Error(`image request failed ${response.status}`);
  const type = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  if (!/^image\/(png|jpeg|gif|webp|avif)$/.test(type)) throw new Error('not an image');
  const buffer = await response.arrayBuffer();
  if (buffer.byteLength > 15 * 1024 * 1024) throw new Error('image too large');
  return `data:${type};base64,${encodeBytes(buffer)}`;
};

const REGIONS_KEY = 'rkbg:regions2';

const regionList = async () => {
  const saved = (await chrome.storage.local.get(REGIONS_KEY))[REGIONS_KEY];
  if (saved && Date.now() - saved.time < 86400000 && Array.isArray(saved.labels) && Array.isArray(saved.groups)) return { labels: saved.labels, groups: saved.groups };
  const response = await fetch('https://raw.githubusercontent.com/RoRegion/Storage/refs/heads/main/regionList.json', { credentials: 'omit' });
  if (!response.ok) throw new Error(`region list failed ${response.status}`);
  const raw = await response.json();
  if (!raw || !Array.isArray(raw._c) || !Array.isArray(raw._ci)) throw new Error('unexpected region list');
  const names = new Intl.DisplayNames(['en'], { type: 'region', fallback: 'none' });
  const realCode = code => typeof code === 'string' && /^[A-Z]{2}$/.test(code) && Boolean(names.of(code));
  const cityCodes = new Map();
  for (const entry of Object.values(raw)) {
    if (!entry || typeof entry !== 'object' || !Array.isArray(raw._c[entry.co])) continue;
    const code = raw._c[entry.co][1];
    if (realCode(code) && typeof raw._ci[entry.ci] === 'string') cityCodes.set(raw._ci[entry.ci], code);
  }
  const labels = [];
  const groups = [];
  for (const [key, entry] of Object.entries(raw)) {
    const match = /^(\d{1,3}\.\d{1,3}\.\d{1,3})\.0$/.exec(key);
    if (!match || !entry || typeof entry !== 'object') continue;
    const city = raw._ci[entry.ci];
    const listed = Array.isArray(raw._c[entry.co]) ? raw._c[entry.co][1] : null;
    const country = realCode(listed) ? listed : cityCodes.get(city) || listed;
    if (typeof city !== 'string' || typeof country !== 'string') continue;
    const label = `${city.slice(0, 40)}, ${country.slice(0, 4)}`;
    let index = labels.indexOf(label);
    if (index === -1) {
      index = labels.push(label) - 1;
      groups.push([]);
    }
    groups[index].push(match[1]);
  }
  if (!labels.length) throw new Error('empty region list');
  const list = { labels, groups: groups.map(prefixes => prefixes.join(' ')) };
  await chrome.storage.local.set({ [REGIONS_KEY]: { time: Date.now(), ...list } });
  return list;
};

const REGION_RULE_ID = 7301;
let regionRuleReady = null;

const ensureRegionRule = () => {
  if (!regionRuleReady) {
    regionRuleReady = chrome.declarativeNetRequest.updateSessionRules({
      removeRuleIds: [REGION_RULE_ID],
      addRules: [{
        id: REGION_RULE_ID,
        priority: 1,
        action: {
          type: 'modifyHeaders',
          requestHeaders: [
            { header: 'user-agent', operation: 'set', value: 'Roblox/WinInet' },
            { header: 'origin', operation: 'set', value: 'https://www.roblox.com' },
            { header: 'referer', operation: 'set', value: 'https://www.roblox.com/' }
          ]
        },
        condition: { urlFilter: '||gamejoin.roblox.com/v1/join-game-instance', resourceTypes: ['xmlhttprequest', 'other'], tabIds: [chrome.tabs.TAB_ID_NONE] }
      }]
    }).catch(err => {
      regionRuleReady = null;
      throw err;
    });
  }
  return regionRuleReady;
};

let regionMap = null;

const regionFor = async ip => {
  const prefix = ip.split('.').slice(0, 3).join('.');
  if (!regionMap) {
    const list = await regionList();
    const map = new Map();
    list.groups.forEach((prefixes, index) => {
      for (const item of String(prefixes).split(' ')) map.set(item, list.labels[index]);
    });
    regionMap = map;
  }
  if (regionMap.has(prefix)) return regionMap.get(prefix);
  const saved = (await chrome.storage.local.get('rkbg:geo'))['rkbg:geo'] || {};
  if (typeof saved[prefix] === 'string') return saved[prefix];
  const geo = await fetch(`https://get.geojs.io/v1/ip/geo/${ip}.json`, { credentials: 'omit' }).then(res => (res.ok ? res.json() : null)).catch(() => null);
  const code = geo && /^[A-Z]{2}$/.test(geo.country_code) ? geo.country_code : '';
  if (!code) return null;
  const city = typeof geo.city === 'string' && geo.city ? geo.city : typeof geo.region === 'string' ? geo.region : '';
  const label = city ? `${city.slice(0, 40)}, ${code}` : code;
  const entries = Object.entries(saved).slice(-499);
  await chrome.storage.local.set({ 'rkbg:geo': { ...Object.fromEntries(entries), [prefix]: label } });
  return label;
};

const jobRegions = new Map();
let jobsLoaded = null;
let jobsSaveTimer = 0;

const loadJobs = () => {
  if (!jobsLoaded) {
    jobsLoaded = chrome.storage.local.get('rkbg:jobs').then(stored => {
      const saved = stored['rkbg:jobs'] && typeof stored['rkbg:jobs'] === 'object' ? stored['rkbg:jobs'] : {};
      for (const [id, entry] of Object.entries(saved)) {
        if (entry && typeof entry.label === 'string' && Date.now() - entry.at < 1800000) jobRegions.set(id, entry);
      }
    }).catch(() => {});
  }
  return jobsLoaded;
};

const saveJobs = () => {
  clearTimeout(jobsSaveTimer);
  jobsSaveTimer = setTimeout(() => {
    const now = Date.now();
    const fresh = [...jobRegions].filter(([, entry]) => now - entry.at < 1800000).slice(-2000);
    chrome.storage.local.set({ 'rkbg:jobs': Object.fromEntries(fresh) }).catch(() => {});
  }, 2000);
};

const serverRegion = async ({ placeId, jobId } = {}) => {
  if (!Number.isSafeInteger(placeId) || placeId <= 0 || typeof jobId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(jobId)) throw new Error('bad server');
  await loadJobs();
  const known = jobRegions.get(jobId);
  if (known && Date.now() - known.at < 1800000) return { label: known.label };
  await ensureRegionRule();
  let json;
  try {
    json = await robloxRequest('https://gamejoin.roblox.com/v1/join-game-instance', { method: 'POST', body: { placeId, isTeleport: false, gameId: jobId, gameJoinAttemptId: crypto.randomUUID() } });
  } catch (err) {
    const status = Number((/(\d{3})/.exec(String(err && err.message)) || [])[1]) || 0;
    if (status === 429) return { retry: true };
    return { reason: 'Region unavailable', detail: `Roblox refused the lookup${status ? ` (${status})` : ''}`, stop: status === 401 || status === 403 };
  }
  const script = json && json.joinScript;
  const endpoint = script && Array.isArray(script.UdmuxEndpoints) && script.UdmuxEndpoints[0] ? script.UdmuxEndpoints[0].Address : null;
  const address = typeof endpoint === 'string' ? endpoint : script && typeof script.MachineAddress === 'string' ? script.MachineAddress : null;
  if (!address || !/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(address)) {
    const message = json && typeof json.message === 'string' && json.message ? json.message : '';
    return { reason: 'Region unknown', detail: `Roblox did not give this server's address${message ? `: ${message}` : ''}` };
  }
  const label = await regionFor(address).catch(() => null);
  if (label) {
    jobRegions.set(jobId, { label, at: Date.now() });
    saveJobs();
  }
  return label ? { label } : { reason: 'Unknown region', detail: `No location found for ${address.split('.').slice(0, 3).join('.')}.x` };
};

const BADGE_TYPES = ['creator', 'contributor', 'donator'];
let badgeCache = null;

const cleanBadges = users => {
  const clean = {};
  for (const [id, list] of Object.entries(users && typeof users === 'object' ? users : {})) {
    if (!/^\d{1,15}$/.test(id) || !Array.isArray(list)) continue;
    const kept = BADGE_TYPES.filter(type => list.includes(type));
    if (kept.length) clean[id] = kept;
  }
  return clean;
};

const rolaBadges = async () => {
  if (badgeCache && Date.now() - badgeCache.at < 1800000) return badgeCache.users;
  const json = await fetch('https://raw.githubusercontent.com/1ypii/Rola/main/badges.json', { credentials: 'omit', cache: 'no-cache' }).then(res => (res.ok ? res.json() : null)).catch(() => null);
  const users = cleanBadges(json && json.users);
  badgeCache = { at: Date.now(), users };
  return users;
};

const saveBadges = async ({ userId, badges } = {}) => {
  if (!Number.isSafeInteger(userId) || userId <= 0 || !Array.isArray(badges)) throw new Error('bad badge request');
  const token = (await chrome.storage.local.get('rk:gh-token'))['rk:gh-token'];
  if (typeof token !== 'string' || !token) throw new Error('missing token');
  const api = 'https://api.github.com/repos/1ypii/Rola/contents/badges.json';
  const headers = { authorization: `Bearer ${token}`, accept: 'application/vnd.github+json' };
  const current = await fetch(api, { headers, credentials: 'omit', cache: 'no-store' });
  if (!current.ok) throw new Error(`github read failed ${current.status}`);
  const file = await current.json();
  const decoded = new TextDecoder().decode(Uint8Array.from(atob(String(file.content || '').replace(/\s/g, '')), char => char.charCodeAt(0)));
  const users = cleanBadges((JSON.parse(decoded) || {}).users);
  const kept = BADGE_TYPES.filter(type => badges.includes(type));
  if (kept.length) users[userId] = kept;
  else delete users[userId];
  const text = `${JSON.stringify({ users }, null, 2)}\n`;
  const content = encodeBytes(new TextEncoder().encode(text).buffer);
  const saved = await fetch(api, { method: 'PUT', headers: { ...headers, 'content-type': 'application/json' }, credentials: 'omit', body: JSON.stringify({ message: '', content, sha: file.sha }) });
  if (!saved.ok) throw new Error(`github write failed ${saved.status}`);
  badgeCache = { at: Date.now(), users };
  return users;
};

const FLAGS_KEY = 'rkbg:flags';

const flagText = (value, max) => (typeof value === 'string' ? value.trim().slice(0, max) : '');

const cleanFlagList = list => (Array.isArray(list) ? list : [])
  .map(entry => ({ reason: flagText(entry && entry.reason, 80), note: flagText(entry && entry.note, 600), at: Number(entry && entry.at) || 0 }))
  .filter(entry => entry.reason)
  .slice(0, 20);

const verifiedsPage = async page => {
  const response = await fetch(`https://robloxverifieds.com/flagged/__data.json?page=${page}`, { credentials: 'omit' });
  if (!response.ok) throw new Error(`flag list failed ${response.status}`);
  const json = await response.json();
  const node = json && Array.isArray(json.nodes) ? json.nodes.find(item => item && Array.isArray(item.data) && item.data[0] && 'Flagged' in item.data[0]) : null;
  if (!node) throw new Error('unexpected flag list');
  const data = node.data;
  const seen = new Set();
  const hydrate = index => {
    if (!Number.isInteger(index) || index < 0 || index >= data.length || seen.has(index)) return null;
    const value = data[index];
    if (Array.isArray(value)) {
      seen.add(index);
      const result = value.map(hydrate);
      seen.delete(index);
      return result;
    }
    if (value && typeof value === 'object') {
      seen.add(index);
      const result = Object.fromEntries(Object.entries(value).map(([key, item]) => [key, hydrate(item)]));
      seen.delete(index);
      return result;
    }
    return value;
  };
  return hydrate(0);
};

const flaggedUsers = async () => {
  const saved = (await chrome.storage.local.get(FLAGS_KEY))[FLAGS_KEY];
  if (saved && Date.now() - saved.time < 3600000 && saved.users && typeof saved.users === 'object') return saved.users;
  const users = {};
  const add = (id, name, source, flags) => {
    if (!/^\d{1,15}$/.test(String(id)) || !flags.length) return;
    const entry = users[id] || { name: '', flags: [] };
    if (name && !entry.name) entry.name = name;
    entry.flags.push(...flags.map(flag => ({ ...flag, source })));
    users[id] = entry;
  };
  try {
    const first = await verifiedsPage(1);
    const pages = Math.min(Number(first && first.TotalPages) || 1, 20);
    const results = [first];
    for (let page = 2; page <= pages; page += 1) results.push(await verifiedsPage(page));
    for (const result of results) {
      for (const item of Array.isArray(result && result.Flagged) ? result.Flagged : []) {
        const user = item && item.User;
        if (!user || user.OptedOut || user.HiddenForReview) continue;
        add(user.UserId, flagText(user.Username, 40), 'Roblox Verifieds', cleanFlagList((item.Flags || []).map(flag => ({ reason: flag && flag.Reason, note: flag && flag.Note, at: flag && flag.CreatedAt }))));
      }
    }
  } catch {}
  const rola = await fetch('https://raw.githubusercontent.com/1ypii/Rola/main/flags.json', { credentials: 'omit', cache: 'no-cache' }).then(res => (res.ok ? res.json() : null)).catch(() => null);
  for (const [id, list] of Object.entries(rola && rola.users && typeof rola.users === 'object' ? rola.users : {})) add(id, '', 'Rola', cleanFlagList(list));
  await chrome.storage.local.set({ [FLAGS_KEY]: { time: Date.now(), users } });
  return users;
};

const repoFile = async (path, token) => {
  const headers = { authorization: `Bearer ${token}`, accept: 'application/vnd.github+json' };
  const response = await fetch(`https://api.github.com/repos/1ypii/Rola/contents/${path}`, { headers, credentials: 'omit', cache: 'no-store' });
  if (!response.ok) throw new Error(`github read failed ${response.status}`);
  const file = await response.json();
  const text = new TextDecoder().decode(Uint8Array.from(atob(String(file.content || '').replace(/\s/g, '')), char => char.charCodeAt(0)));
  return { sha: file.sha, data: JSON.parse(text) || {}, headers };
};

const writeRepoFile = async (path, file, data) => {
  const content = encodeBytes(new TextEncoder().encode(`${JSON.stringify(data, null, 2)}\n`).buffer);
  const response = await fetch(`https://api.github.com/repos/1ypii/Rola/contents/${path}`, { method: 'PUT', headers: { ...file.headers, 'content-type': 'application/json' }, credentials: 'omit', body: JSON.stringify({ message: '', content, sha: file.sha }) });
  if (!response.ok) throw new Error(`github write failed ${response.status}`);
};

const saveFlag = async ({ userId, reason, note, remove } = {}) => {
  if (!Number.isSafeInteger(userId) || userId <= 0) throw new Error('bad flag request');
  const token = (await chrome.storage.local.get('rk:gh-token'))['rk:gh-token'];
  if (typeof token !== 'string' || !token) throw new Error('missing token');
  const file = await repoFile('flags.json', token);
  const users = file.data.users && typeof file.data.users === 'object' ? file.data.users : {};
  const list = cleanFlagList(users[userId]);
  if (Number.isInteger(remove)) list.splice(remove, 1);
  else if (flagText(reason, 80)) list.push({ reason: flagText(reason, 80), note: flagText(note, 600), at: Date.now() });
  else throw new Error('missing reason');
  if (list.length) users[userId] = list;
  else delete users[userId];
  await writeRepoFile('flags.json', file, { users });
  await chrome.storage.local.remove(FLAGS_KEY);
  return list;
};

let adminCache = null;

const adminAccounts = async () => {
  if (adminCache && Date.now() - adminCache.at < 600000) return adminCache.list;
  const json = await fetch('https://raw.githubusercontent.com/1ypii/Rola/main/admins.json', { credentials: 'omit', cache: 'no-cache' }).then(res => (res.ok ? res.json() : null)).catch(() => null);
  const list = (json && Array.isArray(json.admins) ? json.admins : [])
    .filter(entry => entry && typeof entry.username === 'string' && /^[0-9a-f]{32}$/.test(entry.salt) && /^[0-9a-f]{64}$/.test(entry.hash))
    .map(entry => ({ username: entry.username.trim().slice(0, 40), salt: entry.salt, hash: entry.hash }))
    .slice(0, 50);
  adminCache = { at: Date.now(), list };
  return list;
};

const currentUserId = async () => {
  const me = await robloxRequest('https://users.roblox.com/v1/users/authenticated').catch(() => null);
  return me && Number.isSafeInteger(me.id) ? me.id : null;
};

const handlers = {
  values: () => loadValues(),
  notify: payload => {
    if (!payload || typeof payload !== 'object') throw new Error('bad notification');
    notify(payload.title, payload.message, payload.url);
    return true;
  },
  download: payload => download(payload || {}),
  'image-data': payload => imageData(payload || {}),
  regions: () => regionList(),
  'rola-badges': () => rolaBadges(),
  flagged: () => flaggedUsers(),
  admins: () => adminAccounts(),
  'save-admin': async ({ username, salt, hash, token, remove } = {}) => {
    const name = typeof username === 'string' ? username.trim().slice(0, 40) : '';
    if (!/^[A-Za-z0-9_.-]{2,40}$/.test(name)) throw new Error('pick a username with letters, numbers, dots, dashes or underscores');
    if (typeof token === 'string' && token.trim()) {
      if (!/^[A-Za-z0-9_]{20,255}$/.test(token.trim())) throw new Error('that does not look like a GitHub token');
      await chrome.storage.local.set({ 'rk:gh-token': token.trim() });
    }
    const saved = (await chrome.storage.local.get('rk:gh-token'))['rk:gh-token'];
    if (typeof saved !== 'string' || !saved) throw new Error('missing token');
    const file = await repoFile('admins.json', saved);
    const admins = (Array.isArray(file.data.admins) ? file.data.admins : []).filter(entry => entry && typeof entry.username === 'string' && entry.username.toLowerCase() !== name.toLowerCase());
    if (!remove) {
      if (!/^[0-9a-f]{32}$/.test(salt) || !/^[0-9a-f]{64}$/.test(hash)) throw new Error('bad password data');
      admins.push({ username: name, salt, hash });
    }
    await writeRepoFile('admins.json', file, { admins });
    adminCache = null;
    return admins.map(entry => entry.username);
  },
  'save-flag': payload => saveFlag(payload || {}),
  'save-badges': payload => saveBadges(payload || {}),
  'server-region': payload => serverRegion(payload || {}),
  sound: payload => playSound(payload).then(() => true),
  music: () => syncMusic(),
  unfriends: async () => {
    const [log, me] = await Promise.all([chrome.storage.local.get(UNFRIENDS_KEY).then(saved => saved[UNFRIENDS_KEY]), currentUserId()]);
    return (Array.isArray(log) ? log : []).filter(entry => entry && (!entry.owner || entry.owner === me));
  },
  playtime: async () => {
    const me = await currentUserId();
    if (!me) return {};
    const key = `${PLAYTIME_KEY}:${me}`;
    const saved = await chrome.storage.local.get([key, PLAYTIME_KEY]);
    const games = saved[key] || saved[PLAYTIME_KEY];
    return games && typeof games === 'object' ? games : {};
  },
  terms: async () => {
    const saved = (await chrome.storage.local.get(TERMS_KEY))[TERMS_KEY];
    return saved && typeof saved === 'object' ? saved : { users: {}, log: [] };
  },
  drops: async () => {
    const log = (await chrome.storage.local.get(DROPS_KEY))[DROPS_KEY];
    return Array.isArray(log) ? log : [];
  },
  'price-lows': async () => {
    const lows = (await chrome.storage.local.get('rkbg:priceLows'))['rkbg:priceLows'];
    return lows && typeof lows === 'object' ? lows : {};
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
  preloadSounds().catch(() => {});
});

chrome.tabs.onRemoved.addListener(() => {
  syncMusic().catch(() => {});
});

chrome.tabs.onUpdated.addListener((tabId, change) => {
  if (change.url || change.status === 'complete') syncMusic().catch(() => {});
});

chrome.runtime.onInstalled.addListener(() => {
  syncAlarm();
  preloadSounds().catch(() => {});
});
chrome.runtime.onStartup.addListener(() => {
  syncAlarm();
  preloadSounds().catch(() => {});
});
