const SETTINGS_KEY = 'rk:settings';
const VALUES_KEY = 'rkbg:values';
const STATE_KEY = 'rkbg:state';
const VALUES_URL = 'https://api.rolimons.com/items/v2/itemdetails';
const VALUES_TTL = 10 * 60 * 1000;
const POLL_ALARM = 'rk-poll';
const ALERT_FEATURES = ['tools.friendOnlineAlerts', 'trading.tradeAlerts', 'trading.tradeBadge', 'tools.robuxAlerts'];
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

const playSound = async () => {
  const settings = (await chrome.storage.local.get(SETTINGS_KEY))[SETTINGS_KEY];
  if (settings && settings.enabled && settings.enabled['tools.alertSound'] === false) return;
  const assetId = soundAsset(settings);
  const src = assetId ? await audioUrl(assetId).catch(() => null) : null;
  try {
    await chrome.offscreen.createDocument({ url: 'offscreen.html', reasons: ['AUDIO_PLAYBACK'], justification: 'Plays the notification sound' });
  } catch {}
  await chrome.runtime.sendMessage({ type: 'rk-play', src }).catch(() => {});
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

const poll = async () => {
  const stored = await chrome.storage.local.get([SETTINGS_KEY, STATE_KEY]);
  const settings = stored[SETTINGS_KEY];
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
  if (area === 'local' && changes[SETTINGS_KEY]) syncAlarm();
});

chrome.runtime.onInstalled.addListener(() => syncAlarm());
chrome.runtime.onStartup.addListener(() => syncAlarm());
