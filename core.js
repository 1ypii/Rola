const Rk = (() => {
  const SETTINGS_KEY = 'rk:settings';
  const DATA_KEY = 'rk:data';

  const categories = [
    { id: 'site', name: 'Site and navigation', description: 'Header, sidebar, layout and general look of the site' },
    { id: 'games', name: 'Experiences', description: 'Experience pages, stats, badges, passes and launching' },
    { id: 'servers', name: 'Servers', description: 'Server browser, filters and quick joining' },
    { id: 'profiles', name: 'Profiles and social', description: 'Profiles, friends, followers and communities' },
    { id: 'avatar', name: 'Avatar and marketplace', description: 'Avatar editor, marketplace and item pages' },
    { id: 'trading', name: 'Trading and inventory', description: 'Values, trades, inventory and transactions' },
    { id: 'discovery', name: 'Home and discovery', description: 'Home feed, charts and search' },
    { id: 'tools', name: 'Tools', description: 'Shortcuts, quick search, alerts and utilities' }
  ];

  const features = [];
  const featureById = new Map();
  const ran = new Set();
  const settingsListeners = new Set();
  const navigateListeners = new Set();
  const watchers = new Set();
  const hotkeys = [];

  let settings = { enabled: {}, options: {} };
  let data = {};
  let started = false;
  let cachedPage = null;
  let cachedPageHref = '';
  let lastHref = location.href;
  let featureStyle = null;
  let resolveReady;

  const ready = new Promise(resolve => {
    resolveReady = resolve;
  });

  const domReady = new Promise(resolve => {
    if (document.readyState !== 'loading') resolve();
    else document.addEventListener('DOMContentLoaded', () => resolve(), { once: true });
  });

  const report = (where, err) => console.error(`rola ${where}`, err);
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const isId = value => {
    const number = typeof value === 'string' ? (/^\d+$/.test(value) ? Number(value) : NaN) : value;
    return Number.isSafeInteger(number) && number > 0;
  };
  const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

  const feature = def => {
    if (!def || typeof def.id !== 'string' || !def.id) throw new Error('rola feature needs an id');
    if (featureById.has(def.id)) throw new Error(`rola duplicate feature ${def.id}`);
    if (!categories.some(category => category.id === def.category)) throw new Error(`rola unknown category on ${def.id}`);
    const entry = {
      id: def.id,
      category: def.category,
      name: def.name || def.id,
      description: def.description || '',
      default: def.default !== false,
      pages: Array.isArray(def.pages) ? def.pages : null,
      options: Array.isArray(def.options) ? def.options : [],
      css: def.css || null,
      run: typeof def.run === 'function' ? def.run : null
    };
    features.push(entry);
    featureById.set(entry.id, entry);
    return entry;
  };

  const isValidOption = (def, value) => {
    switch (def.type) {
      case 'toggle':
        return typeof value === 'boolean';
      case 'select':
        return Array.isArray(def.choices) && def.choices.some(choice => choice[0] === value);
      case 'number':
        return typeof value === 'number' && Number.isFinite(value) && (def.min == null || value >= def.min) && (def.max == null || value <= def.max);
      case 'text':
        return typeof value === 'string' && value.length <= (def.maxLength || 200);
      case 'color':
        return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);
      case 'image':
        return typeof value === 'string' && value.length <= 40;
      default:
        return false;
    }
  };

  const sanitizeSettings = raw => {
    const clean = { enabled: {}, options: {} };
    if (!raw || typeof raw !== 'object') return clean;
    if (raw.enabled && typeof raw.enabled === 'object') {
      for (const [id, value] of Object.entries(raw.enabled)) {
        if (featureById.has(id) && typeof value === 'boolean') clean.enabled[id] = value;
      }
    }
    if (raw.options && typeof raw.options === 'object') {
      for (const [id, values] of Object.entries(raw.options)) {
        const entry = featureById.get(id);
        if (!entry || !values || typeof values !== 'object') continue;
        for (const def of entry.options) {
          if (hasOwn(values, def.key) && isValidOption(def, values[def.key])) {
            clean.options[id] = clean.options[id] || {};
            clean.options[id][def.key] = values[def.key];
          }
        }
      }
    }
    return clean;
  };

  let suspension = null;

  const isEnabled = id => {
    const entry = featureById.get(id);
    if (!entry || suspension) return false;
    const value = settings.enabled[id];
    return typeof value === 'boolean' ? value : entry.default;
  };

  const option = (id, key) => {
    const entry = featureById.get(id);
    const def = entry && entry.options.find(item => item.key === key);
    if (!def) return undefined;
    const stored = settings.options[id] ? settings.options[id][key] : undefined;
    return stored !== undefined && isValidOption(def, stored) ? stored : def.default;
  };

  const contextFor = entry => ({
    id: entry.id,
    option: key => option(entry.id, key)
  });

  const pendingWrites = [];

  const persist = values => {
    for (const [key, value] of Object.entries(values)) {
      pendingWrites.push(`${key}:${JSON.stringify(value)}`);
      if (pendingWrites.length > 60) pendingWrites.shift();
    }
    try {
      chrome.storage.local.set(values).catch(err => report('storage', err));
    } catch (err) {
      report('storage', err);
    }
  };

  const isOwnWrite = (key, value) => {
    const index = pendingWrites.indexOf(`${key}:${JSON.stringify(value)}`);
    if (index === -1) return false;
    pendingWrites.splice(index, 1);
    return true;
  };

  const emitSettings = () => {
    for (const listener of settingsListeners) {
      try {
        listener();
      } catch (err) {
        report('settings listener', err);
      }
    }
  };

  const applyCss = () => {
    const parts = [];
    for (const entry of features) {
      if (!entry.css || !isEnabled(entry.id)) continue;
      try {
        parts.push(typeof entry.css === 'function' ? entry.css(contextFor(entry)) : entry.css);
      } catch (err) {
        report(entry.id, err);
      }
    }
    const text = parts.join('\n');
    if (!featureStyle) {
      featureStyle = document.createElement('style');
      featureStyle.id = 'rk-feature-styles';
    }
    if (featureStyle.textContent !== text) featureStyle.textContent = text;
    if (!featureStyle.isConnected) (document.head || document.documentElement).append(featureStyle);
  };

  const routes = [
    ['game', /\/games\/(\d+)/],
    ['discover', /\/(?:discover|charts|games)\/?$/],
    ['home', /\/home\/?$/],
    ['profile', /\/users\/(\d+)\/profile/],
    ['friends', /\/users\/(?:(\d+)\/)?friends/],
    ['inventory', /\/users\/(\d+)\/inventory/],
    ['favorites', /\/users\/(\d+)\/favorites/],
    ['group', /\/(?:groups|communities)\/(\d+)/],
    ['marketplace', /\/catalog\/?$/],
    ['item', /\/(catalog|bundles|library|game-pass|badges)\/(\d+)/],
    ['avatar', /\/my\/avatar/],
    ['trades', /\/trades/],
    ['transactions', /\/transactions/],
    ['account', /\/my\/account/],
    ['messages', /\/my\/messages/],
    ['search', /\/search\//],
    ['robux', /\/(?:upgrades\/robux|robux)/]
  ].map(([type, pattern]) => [type, new RegExp(`^(?:/[a-z]{2}(?:-[a-z]{2,4})?)?${pattern.source}`, 'i')]);

  const itemKinds = { catalog: 'asset', library: 'asset', bundles: 'bundle', 'game-pass': 'gamepass', badges: 'badge' };

  const page = () => {
    if (cachedPage && cachedPageHref === location.href) return cachedPage;
    const path = location.pathname;
    let result = { type: 'other', id: null, kind: null, path };
    for (const [type, pattern] of routes) {
      const match = path.match(pattern);
      if (!match) continue;
      if (type === 'item') {
        result = { type, id: Number(match[2]), kind: itemKinds[match[1].toLowerCase()], path };
      } else {
        result = { type, id: match[1] ? Number(match[1]) : null, kind: null, path };
      }
      break;
    }
    if (result.id !== null && !isId(result.id)) result.id = null;
    cachedPage = result;
    cachedPageHref = location.href;
    return result;
  };

  const idPatterns = {
    user: /\/users\/(\d+)/i,
    game: /\/games\/(\d+)/i,
    item: /\/(?:catalog|bundles|library|game-pass|badges)\/(\d+)/i,
    asset: /\/(?:catalog|library)\/(\d+)/i,
    bundle: /\/bundles\/(\d+)/i,
    gamepass: /\/game-pass\/(\d+)/i,
    badge: /\/badges\/(\d+)/i,
    group: /\/(?:groups|communities)\/(\d+)/i
  };

  const idFrom = (href, kind) => {
    if (typeof href !== 'string' || !idPatterns[kind]) return null;
    const match = href.match(idPatterns[kind]);
    if (!match) return null;
    const id = Number(match[1]);
    return isId(id) ? id : null;
  };

  const hit = (watcher, node) => {
    if (watcher.seen.has(node)) return;
    if (watcher.root !== document && !watcher.root.contains(node)) return;
    watcher.seen.add(node);
    if (watcher.once) watchers.delete(watcher);
    try {
      watcher.callback(node);
    } catch (err) {
      report(watcher.selector, err);
    }
  };

  const scanInto = (watcher, node) => {
    if (watcher.root !== document && !watcher.root.contains(node) && !node.contains(watcher.root)) return;
    if (node.matches(watcher.selector)) hit(watcher, node);
    if (watcher.once && !watchers.has(watcher)) return;
    for (const match of node.querySelectorAll(watcher.selector)) {
      hit(watcher, match);
      if (watcher.once && !watchers.has(watcher)) return;
    }
  };

  const observe = (selector, callback, { root = document, once = false } = {}) => {
    try {
      document.createDocumentFragment().querySelector(selector);
    } catch (err) {
      report(`bad selector ${selector}`, err);
      return () => {};
    }
    const watcher = { selector, callback, root, once, seen: new WeakSet() };
    watchers.add(watcher);
    for (const match of root.querySelectorAll(selector)) {
      hit(watcher, match);
      if (once && !watchers.has(watcher)) break;
    }
    return () => watchers.delete(watcher);
  };

  const waitFor = (selector, root = document) => new Promise(resolve => {
    observe(selector, resolve, { root, once: true });
  });

  const mount = (targets, node, { position = 'append' } = {}) => {
    const selector = Array.isArray(targets) ? targets.join(', ') : targets;
    return observe(selector, anchor => {
      if (node.isConnected) return;
      if (position === 'after') anchor.after(node);
      else if (position === 'before') anchor.before(node);
      else if (position === 'prepend') anchor.prepend(node);
      else anchor.append(node);
    });
  };

  const checkLocation = () => {
    if (location.href === lastHref) return;
    const previousPath = new URL(lastHref).pathname;
    lastHref = location.href;
    cachedPage = null;
    if (previousPath === location.pathname) return;
    for (const listener of navigateListeners) {
      try {
        listener(page());
      } catch (err) {
        report('navigate listener', err);
      }
    }
    runFeatures();
  };

  const domObserver = new MutationObserver(records => {
    checkLocation();
    if (!watchers.size) return;
    const added = new Set();
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (node.nodeType === 1 && node.isConnected) added.add(node);
      }
    }
    if (!added.size) return;
    const roots = [];
    for (const node of added) {
      let parent = node.parentElement;
      let nested = false;
      while (parent) {
        if (added.has(parent)) {
          nested = true;
          break;
        }
        parent = parent.parentElement;
      }
      if (!nested) roots.push(node);
    }
    for (const watcher of [...watchers]) {
      for (const node of roots) {
        if (!watchers.has(watcher)) break;
        scanInto(watcher, node);
      }
    }
  });

  let meCache = null;
  const me = () => {
    if (!meCache) {
      meCache = domReady.then(() => {
        const meta = document.querySelector('meta[name="user-data"]');
        const id = meta ? Number(meta.getAttribute('data-userid')) : NaN;
        if (!isId(id)) return null;
        const name = meta.getAttribute('data-name') || '';
        return { id, name, displayName: meta.getAttribute('data-displayname') || name };
      });
    }
    return meCache;
  };

  const theme = () => (document.body && document.body.classList.contains('light-theme') ? 'light' : 'dark');

  const ROBLOX_HOST = /(^|\.)roblox\.com$/i;
  let csrfToken = null;
  let activeRequests = 0;
  const requestQueue = [];
  const responseCache = new Map();

  class ApiError extends Error {
    constructor(status, url) {
      super(`request failed ${status}`);
      this.status = status;
      this.url = url;
    }
  }

  const readCsrf = () => {
    const meta = document.querySelector('meta[name="csrf-token"]');
    return meta ? meta.getAttribute('data-token') : null;
  };

  const limited = task => new Promise((resolve, reject) => {
    const runTask = () => {
      activeRequests++;
      task().then(resolve, reject).finally(() => {
        activeRequests--;
        const next = requestQueue.shift();
        if (next) next();
      });
    };
    if (activeRequests < 6) runTask();
    else requestQueue.push(runTask);
  });

  const request = async (url, init = {}) => {
    const target = new URL(url, location.origin);
    if (target.protocol !== 'https:' || !ROBLOX_HOST.test(target.hostname)) throw new Error('rola only talks to roblox hosts');
    const method = (init.method || 'GET').toUpperCase();
    const headers = { ...(init.headers || {}) };
    let body = init.body;
    if (body !== undefined && typeof body !== 'string') {
      body = JSON.stringify(body);
      headers['content-type'] = 'application/json';
    }
    if (method !== 'GET') {
      csrfToken = csrfToken || readCsrf();
      if (csrfToken) headers['x-csrf-token'] = csrfToken;
    }
    const credentials = init.credentials === 'omit' ? 'omit' : 'include';
    const send = () => limited(() => fetch(target.href, { method, headers, body, credentials }));
    let res = await send();
    if (res.status === 403 && method !== 'GET') {
      const fresh = res.headers.get('x-csrf-token');
      if (fresh && fresh !== headers['x-csrf-token']) {
        csrfToken = fresh;
        headers['x-csrf-token'] = fresh;
        res = await send();
      }
    }
    if (res.status === 429) {
      await wait(2000);
      res = await send();
    }
    if (!res.ok) throw new ApiError(res.status, target.href);
    if (res.status === 204) return null;
    const type = res.headers.get('content-type') || '';
    return type.includes('json') ? res.json() : res.text();
  };

  const get = (url, { cache = 0 } = {}) => {
    if (cache <= 0) return request(url);
    const cached = responseCache.get(url);
    if (cached && Date.now() - cached.time < cache) return cached.promise;
    const promise = request(url);
    responseCache.set(url, { time: Date.now(), promise });
    if (responseCache.size > 400) responseCache.delete(responseCache.keys().next().value);
    promise.catch(() => responseCache.delete(url));
    return promise;
  };

  const post = (url, body) => request(url, { method: 'POST', body });

  const paged = async (url, { max = 1000, limit = 100 } = {}) => {
    const items = [];
    let cursor = '';
    do {
      const target = new URL(url);
      target.searchParams.set('limit', String(limit));
      if (cursor) target.searchParams.set('cursor', cursor);
      const json = await request(target.href);
      if (!json || !Array.isArray(json.data)) break;
      items.push(...json.data);
      cursor = json.nextPageCursor || '';
    } while (cursor && items.length < max);
    return items.slice(0, max);
  };

  const uniqueIds = ids => [...new Set((ids || []).map(Number).filter(isId))];

  const userCache = new Map();
  const users = async ids => {
    const wanted = uniqueIds(ids);
    const missing = wanted.filter(id => !userCache.has(id));
    for (let i = 0; i < missing.length; i += 100) {
      const chunk = missing.slice(i, i + 100);
      const batch = post('https://users.roblox.com/v1/users', { userIds: chunk, excludeBannedUsers: false }).then(json => {
        const map = new Map();
        for (const user of (json && json.data) || []) map.set(user.id, user);
        return map;
      });
      for (const id of chunk) {
        userCache.set(id, batch.then(map => map.get(id) || null, () => {
          userCache.delete(id);
          return null;
        }));
      }
    }
    const result = new Map();
    await Promise.all(wanted.map(async id => {
      const user = await userCache.get(id);
      if (user) result.set(id, user);
    }));
    return result;
  };

  const presence = async ids => {
    const wanted = uniqueIds(ids);
    const result = new Map();
    for (let i = 0; i < wanted.length; i += 50) {
      const json = await post('https://presence.roblox.com/v1/presence/users', { userIds: wanted.slice(i, i + 50) });
      for (const entry of (json && json.userPresences) || []) result.set(entry.userId, entry);
    }
    return result;
  };

  const gameCache = new Map();
  const games = async universeIds => {
    const wanted = uniqueIds(universeIds);
    const missing = wanted.filter(id => !gameCache.has(id));
    for (let i = 0; i < missing.length; i += 50) {
      const chunk = missing.slice(i, i + 50);
      const batch = get(`https://games.roblox.com/v1/games?universeIds=${chunk.join(',')}`).then(json => {
        const map = new Map();
        for (const game of (json && json.data) || []) map.set(game.id, game);
        return map;
      });
      for (const id of chunk) {
        gameCache.set(id, batch.then(map => map.get(id) || null, () => {
          gameCache.delete(id);
          return null;
        }));
      }
    }
    const result = new Map();
    await Promise.all(wanted.map(async id => {
      const game = await gameCache.get(id);
      if (game) result.set(id, game);
    }));
    return result;
  };

  const votes = async universeIds => {
    const wanted = uniqueIds(universeIds);
    const result = new Map();
    for (let i = 0; i < wanted.length; i += 50) {
      const json = await get(`https://games.roblox.com/v1/games/votes?universeIds=${wanted.slice(i, i + 50).join(',')}`, { cache: 60000 });
      for (const entry of (json && json.data) || []) result.set(entry.id, entry);
    }
    return result;
  };

  const universeCache = new Map();
  const universeId = placeId => {
    const id = Number(placeId);
    if (!isId(id)) return Promise.resolve(null);
    if (!universeCache.has(id)) {
      universeCache.set(id, get(`https://apis.roblox.com/universes/v1/places/${id}/universe`).then(json => {
        const value = json && Number(json.universeId);
        return isId(value) ? value : null;
      }, () => {
        universeCache.delete(id);
        return null;
      }));
    }
    return universeCache.get(id);
  };

  const thumbCache = new Map();
  let thumbQueue = [];

  const flushThumbs = () => {
    const batch = thumbQueue;
    thumbQueue = [];
    for (let i = 0; i < batch.length; i += 100) {
      const chunk = batch.slice(i, i + 100);
      const body = chunk.map(entry => {
        const item = {
          requestId: entry.key,
          type: entry.type,
          targetId: entry.targetId,
          size: entry.size,
          format: entry.format,
          isCircular: entry.isCircular
        };
        if (entry.token) item.token = entry.token;
        return item;
      });
      post('https://thumbnails.roblox.com/v1/batch', body).then(json => {
        const byKey = new Map(((json && json.data) || []).map(item => [item.requestId, item]));
        for (const entry of chunk) {
          const item = byKey.get(entry.key);
          const url = item && item.state === 'Completed' && item.imageUrl ? item.imageUrl : null;
          if (!url) thumbCache.delete(entry.key);
          entry.resolve(url);
        }
      }, () => {
        for (const entry of chunk) {
          thumbCache.delete(entry.key);
          entry.resolve(null);
        }
      });
    }
  };

  const thumb = (type, targetId, size = '150x150', { circular = false, format = 'Png' } = {}) => {
    const id = Number(targetId);
    if (!isId(id)) return Promise.resolve(null);
    const key = `${type}:${id}:${size}:${circular ? 1 : 0}:${format}`;
    if (thumbCache.has(key)) return thumbCache.get(key);
    const promise = new Promise(resolve => {
      thumbQueue.push({ key, type, targetId: id, size, format, isCircular: circular, resolve });
      if (thumbQueue.length === 1) queueMicrotask(flushThumbs);
    });
    thumbCache.set(key, promise);
    return promise;
  };

  const thumbToken = (token, size = '48x48', { circular = true } = {}) => {
    if (typeof token !== 'string' || !/^[A-Za-z0-9+/=_-]{8,200}$/.test(token)) return Promise.resolve(null);
    const key = `token:${token}:${size}:${circular ? 1 : 0}`;
    if (thumbCache.has(key)) return thumbCache.get(key);
    const promise = new Promise(resolve => {
      thumbQueue.push({ key, type: 'AvatarHeadShot', targetId: 0, token, size, format: 'Png', isCircular: circular, resolve });
      if (thumbQueue.length === 1) queueMicrotask(flushThumbs);
    });
    thumbCache.set(key, promise);
    if (thumbCache.size > 3000) thumbCache.delete(thumbCache.keys().next().value);
    return promise;
  };

  const imageKey = (id, key) => `rk:image:${id}:${key}`;
  const images = {
    get: async (id, key) => {
      const value = (await chrome.storage.local.get(imageKey(id, key)))[imageKey(id, key)];
      return typeof value === 'string' && value.startsWith('data:image/') ? value : null;
    },
    set: (id, key, data) => chrome.storage.local.set({ [imageKey(id, key)]: data }),
    remove: (id, key) => chrome.storage.local.remove(imageKey(id, key))
  };

  const bg = (type, payload) => new Promise((resolve, reject) => {
    try {
      chrome.runtime.sendMessage({ type, payload }, response => {
        const err = chrome.runtime.lastError;
        if (err) return reject(new Error(err.message));
        if (!response || response.error) return reject(new Error(response ? response.error : 'no response'));
        resolve(response.data);
      });
    } catch (err) {
      reject(err);
    }
  });

  const demandLabels = ['Terrible', 'Low', 'Normal', 'High', 'Amazing'];
  const trendLabels = ['Lowering', 'Unstable', 'Stable', 'Raising', 'Fluctuating'];

  let valuesPromise = null;
  const values = () => {
    if (!valuesPromise) {
      valuesPromise = bg('values').then(raw => {
        const map = new Map();
        for (const [key, item] of Object.entries(raw || {})) {
          const id = Number(key);
          if (!isId(id) || !Array.isArray(item)) continue;
          map.set(id, {
            id,
            name: String(item[0] || ''),
            acronym: String(item[1] || ''),
            rap: Number(item[2]) || 0,
            valued: item[3] !== -1,
            value: Number(item[4]) || 0,
            demand: demandLabels[item[5]] || null,
            trend: trendLabels[item[6]] || null,
            projected: item[7] === 1,
            hyped: item[8] === 1,
            rare: item[9] === 1
          });
        }
        return map;
      }).catch(err => {
        valuesPromise = null;
        throw err;
      });
    }
    return valuesPromise;
  };

  const dispatchLaunch = detail => document.dispatchEvent(new CustomEvent('rk:launch', { detail: JSON.stringify(detail) }));

  const launch = {
    place: placeId => dispatchLaunch({ kind: 'place', placeId: Number(placeId) }),
    server: (placeId, jobId) => dispatchLaunch({ kind: 'server', placeId: Number(placeId), jobId: String(jobId) }),
    follow: userId => dispatchLaunch({ kind: 'follow', userId: Number(userId) }),
    studio: (placeId, universe) => dispatchLaunch({ kind: 'studio', placeId: Number(placeId), universeId: Number(universe) })
  };

  const ACCOUNT_KEYS = new Set(['friends.best', 'friends.favorites', 'nicknames', 'avatar.pinnedOutfits', 'avatar.customPose', 'tools.achievements', 'trading.valueSnapshots', 'trading.robuxHistory']);

  const accountId = () => {
    const meta = document.querySelector('meta[name="user-data"]');
    const id = meta ? Number(meta.getAttribute('data-userid')) : NaN;
    return isId(id) ? id : null;
  };

  const scoped = key => {
    if (!ACCOUNT_KEYS.has(key)) return key;
    const id = accountId();
    if (!id) return key;
    const own = `${key}#${id}`;
    if (!hasOwn(data, own) && hasOwn(data, key)) {
      data[own] = data[key];
      delete data[key];
      persist({ [DATA_KEY]: data });
    }
    return own;
  };

  const suspensionText = () => 'You have been banned from using Rola';

  const showSuspension = ban => {
    const key = `rk-suspension-${ban.at}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
    } catch {}
    domReady.then(() => ui.modal({
      title: 'Rola',
      width: 420,
      content: el('p', { class: 'rk-modal-text' }, suspensionText())
    }));
  };

  const storeApi = {
    get(key, fallback) {
      const real = scoped(key);
      return hasOwn(data, real) ? data[real] : fallback;
    },
    set(key, value) {
      data[scoped(key)] = value;
      persist({ [DATA_KEY]: data });
    },
    remove(key) {
      const real = scoped(key);
      if (!hasOwn(data, real)) return;
      delete data[real];
      persist({ [DATA_KEY]: data });
    },
    keys() {
      return Object.keys(data);
    },
    dump() {
      return JSON.parse(JSON.stringify(data));
    },
    load(next) {
      if (!next || typeof next !== 'object' || Array.isArray(next)) return false;
      data = JSON.parse(JSON.stringify(next));
      persist({ [DATA_KEY]: data });
      return true;
    }
  };

  const numberFormat = new Intl.NumberFormat();
  const compactFormat = new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 });
  const dateFormat = new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  const dateTimeFormat = new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  const relativeFormat = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  const relativeUnits = [['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60], ['second', 1]];

  const toDate = value => {
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  };

  const fmt = {
    num: value => (Number.isFinite(Number(value)) && value !== null && value !== '' ? numberFormat.format(Number(value)) : '-'),
    compact: value => (Number.isFinite(Number(value)) && value !== null && value !== '' ? compactFormat.format(Number(value)) : '-'),
    date: value => {
      const date = toDate(value);
      return date ? dateFormat.format(date) : '-';
    },
    dateTime: value => {
      const date = toDate(value);
      return date ? dateTimeFormat.format(date) : '-';
    },
    ago: value => {
      const date = toDate(value);
      if (!date) return '-';
      const seconds = (date.getTime() - Date.now()) / 1000;
      for (const [unit, size] of relativeUnits) {
        if (Math.abs(seconds) >= size || unit === 'second') return relativeFormat.format(Math.round(seconds / size), unit);
      }
      return '-';
    },
    duration: ms => {
      const total = Math.max(0, Math.floor(Number(ms) / 1000) || 0);
      const days = Math.floor(total / 86400);
      const hours = Math.floor((total % 86400) / 3600);
      const minutes = Math.floor((total % 3600) / 60);
      const seconds = total % 60;
      if (days) return `${days}d ${hours}h`;
      if (hours) return `${hours}h ${minutes}m`;
      if (minutes) return `${minutes}m ${seconds}s`;
      return `${seconds}s`;
    },
    percent: (part, total, digits = 1) => (Number(total) > 0 ? `${((Number(part) / Number(total)) * 100).toFixed(digits)}%` : '-'),
    plural: (count, word, plural) => `${fmt.num(count)} ${Number(count) === 1 ? word : plural || `${word}s`}`
  };

  const safeHref = value => /^(https?:|\/|#|roblox:)/i.test(String(value).trim());

  const appendChildren = (node, children) => {
    for (const child of children.flat(Infinity)) {
      if (child == null || child === false) continue;
      node.append(child instanceof Node ? child : String(child));
    }
    return node;
  };

  const el = (tag, props, ...children) => {
    const node = document.createElement(tag);
    if (props) {
      for (const [key, value] of Object.entries(props)) {
        if (value == null || value === false) continue;
        if (key === 'class') node.className = value;
        else if (key === 'style' && typeof value === 'object') Object.assign(node.style, value);
        else if (key === 'dataset') Object.assign(node.dataset, value);
        else if (key === 'text') node.textContent = value;
        else if (key.startsWith('on') && typeof value === 'function') node.addEventListener(key.slice(2).toLowerCase(), value);
        else if ((key === 'href' || key === 'src') && !safeHref(value)) continue;
        else if (value === true) node.setAttribute(key, '');
        else node.setAttribute(key, String(value));
      }
    }
    return appendChildren(node, children);
  };

  const iconShapes = {
    close: [['path', { d: 'M6 6l12 12M18 6L6 18' }]],
    search: [['circle', { cx: 11, cy: 11, r: 6.5 }], ['path', { d: 'M20 20l-4.2-4.2' }]],
    copy: [['rect', { x: 9, y: 9, width: 11, height: 11, rx: 2 }], ['path', { d: 'M5 15V6a2 2 0 0 1 2-2h8' }]],
    refresh: [['path', { d: 'M20 12a8 8 0 1 1-2.34-5.66' }], ['path', { d: 'M20 4v5h-5' }]],
    external: [['path', { d: 'M14 4h6v6' }], ['path', { d: 'M20 4l-9 9' }], ['path', { d: 'M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5' }]],
    star: [['path', { d: 'M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z' }]],
    pin: [['path', { d: 'M12 16v5' }], ['path', { d: 'M8 3h8l-1 6 3 4H6l3-4z' }]],
    chevronDown: [['path', { d: 'M6 9l6 6 6-6' }]],
    chevronRight: [['path', { d: 'M9 6l6 6-6 6' }]],
    chevronLeft: [['path', { d: 'M15 6l-6 6 6 6' }]],
    check: [['path', { d: 'M5 12.5l4.5 4.5L19 7.5' }]],
    sliders: [['path', { d: 'M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1' }], ['circle', { cx: 15, cy: 6, r: 2 }], ['circle', { cx: 9, cy: 12, r: 2 }], ['circle', { cx: 17, cy: 18, r: 2 }]],
    link: [['path', { d: 'M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1' }], ['path', { d: 'M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1' }]],
    download: [['path', { d: 'M12 4v11M7 10l5 5 5-5M5 20h14' }]],
    play: [['path', { d: 'M8 5.5v13l10.5-6.5z' }]],
    info: [['circle', { cx: 12, cy: 12, r: 9 }], ['path', { d: 'M12 11v6M12 7.5v.01' }]],
    users: [['circle', { cx: 9, cy: 8, r: 3.5 }], ['path', { d: 'M2.5 20a6.5 6.5 0 0 1 13 0' }], ['path', { d: 'M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5a6.5 6.5 0 0 1 3.5 5.5' }]],
    user: [['circle', { cx: 12, cy: 8, r: 4 }], ['path', { d: 'M4 21a8 8 0 0 1 16 0' }]],
    filter: [['path', { d: 'M4 5h16l-6 7.5V19l-4-2v-4.5z' }]],
    heart: [['path', { d: 'M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20z' }]],
    clock: [['circle', { cx: 12, cy: 12, r: 9 }], ['path', { d: 'M12 7v5l3.5 2' }]],
    trash: [['path', { d: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13' }]],
    edit: [['path', { d: 'M4 20h4L19 9l-4-4L4 16z' }]],
    eye: [['path', { d: 'M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z' }], ['circle', { cx: 12, cy: 12, r: 3 }]],
    eyeOff: [['path', { d: 'M3 3l18 18M10.6 5.1A10.7 10.7 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3 3.8M6.6 6.6A17 17 0 0 0 2 12s3.6 7 10 7a9.8 9.8 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2' }]],
    server: [['rect', { x: 3, y: 4, width: 18, height: 7, rx: 2 }], ['rect', { x: 3, y: 13, width: 18, height: 7, rx: 2 }], ['path', { d: 'M7 7.5v.01M7 16.5v.01' }]],
    bell: [['path', { d: 'M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z' }], ['path', { d: 'M10 20.5a2.2 2.2 0 0 0 4 0' }]],
    plus: [['path', { d: 'M12 5v14M5 12h14' }]],
    minus: [['path', { d: 'M5 12h14' }]],
    grid: [['rect', { x: 4, y: 4, width: 7, height: 7, rx: 1.5 }], ['rect', { x: 13, y: 4, width: 7, height: 7, rx: 1.5 }], ['rect', { x: 4, y: 13, width: 7, height: 7, rx: 1.5 }], ['rect', { x: 13, y: 13, width: 7, height: 7, rx: 1.5 }]],
    list: [['path', { d: 'M8 6h12M8 12h12M8 18h12M4 6v.01M4 12v.01M4 18v.01' }]],
    chart: [['path', { d: 'M4 20V4M4 20h16' }], ['path', { d: 'M8 16l4-5 3 3 5-6' }]],
    tag: [['path', { d: 'M3 12V4h8l9 9-8 8z' }], ['circle', { cx: 7.5, cy: 8.5, r: 1.3 }]],
    swap: [['path', { d: 'M7 4L3 8l4 4M3 8h14M17 12l4 4-4 4M21 16H7' }]],
    globe: [['circle', { cx: 12, cy: 12, r: 9 }], ['path', { d: 'M3 12h18M12 3c2.5 3 2.5 15 0 18M12 3c-2.5 3-2.5 15 0 18' }]],
    keyboard: [['rect', { x: 2.5, y: 6, width: 19, height: 12, rx: 2 }], ['path', { d: 'M6 10h.01M10 10h.01M14 10h.01M18 10h.01M8 14h8' }]],
    note: [['path', { d: 'M5 4h14v11l-5 5H5z' }], ['path', { d: 'M14 20v-5h5M8 9h8M8 13h4' }]],
    shield: [['path', { d: 'M12 3l8 3v6c0 4.5-3.4 8.2-8 9-4.6-.8-8-4.5-8-9V6z' }]],
    lock: [['rect', { x: 5, y: 11, width: 14, height: 10, rx: 2 }], ['path', { d: 'M8 11V7a4 4 0 0 1 8 0v4' }]],
    unlock: [['rect', { x: 5, y: 11, width: 14, height: 10, rx: 2 }], ['path', { d: 'M8 11V7a4 4 0 0 1 7.6-1.8' }]],
    box: [['path', { d: 'M3 4h18v4H3zM5 8v12h14V8M10 12h4' }]],
    flag: [['path', { d: 'M5 21V4M5 4h12l-2.5 4.5L17 13H5' }]],
    robux: [['path', { d: 'M12 2.8l8 4.6v9.2l-8 4.6-8-4.6V7.4z' }], ['rect', { x: 9, y: 9, width: 6, height: 6, rx: 0.6 }]]
  };

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const icon = (name, size = 16) => {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', String(size));
    svg.setAttribute('height', String(size));
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('aria-hidden', 'true');
    svg.classList.add('rk-icon');
    for (const [tag, attrs] of iconShapes[name] || iconShapes.info) {
      const shape = document.createElementNS(SVG_NS, tag);
      for (const [key, value] of Object.entries(attrs)) shape.setAttribute(key, String(value));
      svg.append(shape);
    }
    return svg;
  };

  const overlayRoot = () => document.body || document.documentElement;

  const button = (label, { variant = 'secondary', size = 'sm', icon: iconName, title, onClick, href, target } = {}) => {
    const classes = `rk-btn rk-btn-${variant} rk-btn-${size}${label ? '' : ' rk-btn-icon'}`;
    const content = [iconName ? icon(iconName, size === 'md' ? 18 : 16) : null, label ? el('span', null, label) : null];
    if (href) return el('a', { class: classes, href, title, target, rel: target === '_blank' ? 'noopener noreferrer' : null, onclick: onClick }, content);
    return el('button', { type: 'button', class: classes, title, 'aria-label': title || null, onclick: onClick }, content);
  };

  const section = (title, content, { actions, className, id } = {}) => el('div', { class: `rk-section${className ? ` ${className}` : ''}`, id },
    el('div', { class: 'rk-section-header' }, el('h2', { class: 'rk-section-title' }, title), actions ? el('div', { class: 'rk-section-actions' }, actions) : null),
    el('div', { class: 'rk-section-body' }, content)
  );

  const panel = (content, { className } = {}) => el('div', { class: `rk-panel${className ? ` ${className}` : ''}` }, content);

  const stat = (label, value, { title } = {}) => el('div', { class: 'rk-stat', title },
    el('div', { class: 'rk-stat-label' }, label),
    el('div', { class: 'rk-stat-value' }, value == null ? '-' : value)
  );

  const stats = entries => el('div', { class: 'rk-stats' }, entries.map(entry => stat(entry[0], entry[1], entry[2])));

  const pill = (text, tone = 'neutral', { title } = {}) => el('span', { class: `rk-pill rk-pill-${tone}`, title }, text);

  const spinner = (size = 18) => el('span', { class: 'rk-spinner', style: { width: `${size}px`, height: `${size}px` }, role: 'status', 'aria-label': 'Loading' });

  const empty = text => el('div', { class: 'rk-empty' }, text);

  const row = (left, right, { className } = {}) => el('div', { class: `rk-row${className ? ` ${className}` : ''}` }, el('div', { class: 'rk-row-main' }, left), right ? el('div', { class: 'rk-row-side' }, right) : null);

  const link = (href, text, { external = false, className } = {}) => el('a', {
    class: `rk-link${className ? ` ${className}` : ''}`,
    href,
    target: external ? '_blank' : null,
    rel: external ? 'noopener noreferrer' : null
  }, text);

  const robux = (amount, { compact = false } = {}) => el('span', { class: 'rk-robux' }, icon('robux', 14), el('span', null, compact ? fmt.compact(amount) : fmt.num(amount)));

  const progress = (ratio, { tone = 'accent' } = {}) => {
    const clamped = Math.max(0, Math.min(1, Number(ratio) || 0));
    return el('div', { class: `rk-progress rk-progress-${tone}` }, el('div', { class: 'rk-progress-fill', style: { width: `${(clamped * 100).toFixed(1)}%` } }));
  };

  const table = (columns, rows, { className } = {}) => el('table', { class: `rk-table${className ? ` ${className}` : ''}` },
    el('thead', null, el('tr', null, columns.map(column => el('th', { class: column.align ? `rk-align-${column.align}` : null }, column.label)))),
    el('tbody', null, rows.map(cells => el('tr', null, cells.map((cell, index) => el('td', { class: columns[index] && columns[index].align ? `rk-align-${columns[index].align}` : null }, cell)))))
  );

  const tip = (node, text) => {
    node.setAttribute('data-rk-tip', text);
    if (!node.hasAttribute('aria-label')) node.setAttribute('aria-label', text);
    return node;
  };

  const thumbImg = (source, { size = 48, round = false, alt = '', className } = {}) => {
    const img = el('img', { class: `rk-thumb${round ? ' rk-thumb-round' : ''}${className ? ` ${className}` : ''}`, alt, width: size, height: size, loading: 'lazy', decoding: 'async' });
    img.style.width = `${size}px`;
    img.style.height = `${size}px`;
    const markMissing = () => {
      img.alt = '';
      img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
      if (alt) img.title = img.title || alt;
      img.classList.add('rk-thumb-missing');
    };
    img.addEventListener('load', () => img.classList.add('rk-thumb-loaded'), { once: true });
    img.addEventListener('error', markMissing, { once: true });
    Promise.resolve(source).then(url => {
      if (url && safeHref(url)) img.src = url;
      else markMissing();
    }, markMissing);
    return img;
  };

  let toastHost = null;
  const toast = (text, { tone = 'neutral', duration = 2600 } = {}) => {
    if (!toastHost || !toastHost.isConnected) {
      toastHost = el('div', { class: 'rk-toasts', role: 'status', 'aria-live': 'polite' });
      overlayRoot().append(toastHost);
    }
    const node = el('div', { class: `rk-toast rk-toast-${tone}` }, text);
    toastHost.append(node);
    requestAnimationFrame(() => node.classList.add('rk-toast-in'));
    setTimeout(() => {
      node.classList.remove('rk-toast-in');
      node.addEventListener('transitionend', () => node.remove(), { once: true });
      setTimeout(() => node.remove(), 400);
    }, duration);
  };

  const copy = async (text, label = 'Copied to clipboard') => {
    try {
      await navigator.clipboard.writeText(String(text));
      toast(label, { tone: 'success' });
      return true;
    } catch {
      toast('Could not copy', { tone: 'danger' });
      return false;
    }
  };

  const openLayers = [];

  const modal = ({ title, content, actions, width = 520, onClose, className } = {}) => {
    const previousFocus = document.activeElement;
    const body = el('div', { class: 'rk-modal-body' }, content);
    let closed = false;
    const close = () => {
      if (closed) return;
      closed = true;
      const index = openLayers.indexOf(layer);
      if (index !== -1) openLayers.splice(index, 1);
      document.removeEventListener('keydown', onKey, true);
      root.classList.remove('rk-modal-open');
      root.addEventListener('transitionend', () => root.remove(), { once: true });
      setTimeout(() => root.remove(), 400);
      if (previousFocus && typeof previousFocus.focus === 'function') previousFocus.focus();
      if (onClose) onClose();
    };
    const dialog = el('div', { class: `rk-modal${className ? ` ${className}` : ''}`, role: 'dialog', 'aria-modal': 'true', 'aria-label': title || 'Dialog', style: { width: `min(${width}px, calc(100vw - 32px))` } },
      el('div', { class: 'rk-modal-header' },
        el('h2', { class: 'rk-modal-title' }, title || ''),
        button('', { variant: 'ghost', icon: 'close', title: 'Close', onClick: () => close() })
      ),
      body,
      actions && actions.length ? el('div', { class: 'rk-modal-footer' }, actions) : null
    );
    const root = el('div', { class: 'rk-modal-backdrop', onmousedown: event => { if (event.target === root) close(); } }, dialog);
    const layer = { close };
    const onKey = event => {
      if (event.key === 'Escape' && openLayers[openLayers.length - 1] === layer) {
        event.stopPropagation();
        close();
      }
    };
    openLayers.push(layer);
    document.addEventListener('keydown', onKey, true);
    overlayRoot().append(root);
    requestAnimationFrame(() => root.classList.add('rk-modal-open'));
    dialog.setAttribute('tabindex', '-1');
    dialog.focus({ preventScroll: true });
    return { root, dialog, body, close };
  };

  const confirm = (text, { title = 'Are you sure?', confirmLabel = 'Confirm', danger = false } = {}) => new Promise(resolve => {
    let answered = false;
    const finish = value => {
      if (answered) return;
      answered = true;
      resolve(value);
      handle.close();
    };
    const handle = modal({
      title,
      width: 420,
      content: el('p', { class: 'rk-modal-text' }, text),
      actions: [
        button('Cancel', { variant: 'secondary', size: 'md', onClick: () => finish(false) }),
        button(confirmLabel, { variant: danger ? 'danger' : 'primary', size: 'md', onClick: () => finish(true) })
      ],
      onClose: () => finish(false)
    });
  });

  const prompt = (text, { title = 'Enter a value', placeholder = '', value = '', maxLength = 200, confirmLabel = 'Save' } = {}) => new Promise(resolve => {
    let answered = false;
    const field = input({ placeholder, value, maxLength });
    const finish = result => {
      if (answered) return;
      answered = true;
      resolve(result);
      handle.close();
    };
    field.addEventListener('keydown', event => {
      if (event.key === 'Enter') finish(field.value);
    });
    const handle = modal({
      title,
      width: 420,
      content: [text ? el('p', { class: 'rk-modal-text' }, text) : null, field],
      actions: [
        button('Cancel', { variant: 'secondary', size: 'md', onClick: () => finish(null) }),
        button(confirmLabel, { variant: 'primary', size: 'md', onClick: () => finish(field.value) })
      ],
      onClose: () => finish(null)
    });
    requestAnimationFrame(() => field.focus());
  });

  let openMenu = null;
  const menu = (anchor, items) => {
    if (openMenu) openMenu();
    const list = el('div', { class: 'rk-menu', role: 'menu' }, items.filter(Boolean).map(item => el('button', {
      type: 'button',
      class: `rk-menu-item${item.danger ? ' rk-menu-danger' : ''}`,
      role: 'menuitem',
      onclick: () => {
        close();
        if (item.onClick) item.onClick();
      }
    }, item.icon ? icon(item.icon, 16) : null, el('span', null, item.label))));
    const rect = anchor.getBoundingClientRect();
    list.style.top = `${Math.round(rect.bottom + window.scrollY + 6)}px`;
    list.style.left = `${Math.round(rect.left + window.scrollX)}px`;
    const onDown = event => {
      if (!list.contains(event.target) && !anchor.contains(event.target)) close();
    };
    const onKey = event => {
      if (event.key === 'Escape') close();
    };
    const close = () => {
      document.removeEventListener('mousedown', onDown, true);
      document.removeEventListener('keydown', onKey, true);
      list.classList.remove('rk-menu-open');
      setTimeout(() => list.remove(), 180);
      if (openMenu === close) openMenu = null;
    };
    document.addEventListener('mousedown', onDown, true);
    document.addEventListener('keydown', onKey, true);
    overlayRoot().append(list);
    const width = list.offsetWidth;
    if (rect.left + width > window.innerWidth - 8) list.style.left = `${Math.max(8, Math.round(rect.right + window.scrollX - width))}px`;
    requestAnimationFrame(() => list.classList.add('rk-menu-open'));
    openMenu = close;
    return close;
  };

  const toggle = (checked, onChange, { label } = {}) => {
    const node = el('button', { type: 'button', class: 'rk-toggle', role: 'switch', 'aria-checked': checked ? 'true' : 'false', 'aria-label': label || null },
      el('span', { class: 'rk-toggle-knob' })
    );
    node.addEventListener('click', () => {
      const next = node.getAttribute('aria-checked') !== 'true';
      node.setAttribute('aria-checked', next ? 'true' : 'false');
      if (onChange) onChange(next);
    });
    return node;
  };

  const input = ({ placeholder = '', value = '', type = 'text', maxLength = 200, onInput, onEnter, className } = {}) => {
    const node = el('input', { class: `rk-input${className ? ` ${className}` : ''}`, type, placeholder, maxlength: maxLength, spellcheck: 'false', autocomplete: 'off' });
    node.value = value;
    if (onInput) node.addEventListener('input', () => onInput(node.value));
    if (onEnter) node.addEventListener('keydown', event => {
      if (event.key === 'Enter') onEnter(node.value);
    });
    return node;
  };

  const select = (choices, value, onChange, { className } = {}) => {
    const node = el('select', { class: `rk-select${className ? ` ${className}` : ''}` }, choices.map(choice => el('option', { value: choice[0] }, choice[1])));
    node.value = value;
    if (onChange) node.addEventListener('change', () => onChange(node.value));
    return node;
  };

  const verified = ({ size = 16, title = 'Verified' } = {}) => {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 28 28');
    svg.setAttribute('width', String(size));
    svg.setAttribute('height', String(size));
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', title);
    svg.classList.add('rk-verified');
    const back = document.createElementNS(SVG_NS, 'rect');
    for (const [key, value] of Object.entries({ x: 5.88818, width: 22.89, height: 22.89, transform: 'rotate(15 5.88818 0)' })) back.setAttribute(key, String(value));
    back.setAttribute('class', 'rk-verified-shape');
    const check = document.createElementNS(SVG_NS, 'path');
    check.setAttribute('fill-rule', 'evenodd');
    check.setAttribute('d', 'M20.543 8.7508L20.549 8.7568C21.15 9.3578 21.15 10.3318 20.549 10.9328L11.817 19.6648L7.45 15.2968C6.85 14.6958 6.85 13.7218 7.45 13.1218L7.457 13.1148C8.058 12.5138 9.031 12.5138 9.633 13.1148L11.817 15.2998L18.367 8.7508C18.968 8.1498 19.942 8.1498 20.543 8.7508Z');
    check.setAttribute('class', 'rk-verified-check');
    svg.append(back, check);
    return svg;
  };

  const ui = {
    button, section, panel, stat, stats, pill, spinner, empty, row, link, robux, progress, table, tip,
    thumb: thumbImg, toast, copy, modal, confirm, prompt, menu, toggle, input, select, verified
  };

  const isTyping = target => {
    if (!target || target.nodeType !== 1) return false;
    if (target.isContentEditable) return true;
    return /^(input|textarea|select)$/i.test(target.tagName);
  };

  let hotkeysBound = false;
  const hotkey = (combo, handler, { inInputs = false } = {}) => {
    hotkeys.push({ combo: combo.toLowerCase(), handler, inInputs });
    if (hotkeysBound) return;
    hotkeysBound = true;
    document.addEventListener('keydown', event => {
      if (event.repeat || !event.key) return;
      const parts = [];
      if (event.ctrlKey) parts.push('ctrl');
      if (event.altKey) parts.push('alt');
      if (event.shiftKey) parts.push('shift');
      if (event.metaKey) parts.push('meta');
      const key = event.code && /^Key[A-Z]$/.test(event.code) ? event.code.slice(3).toLowerCase() : event.code && /^Digit\d$/.test(event.code) ? event.code.slice(5) : event.key.toLowerCase();
      parts.push(key);
      const pressed = parts.join('+');
      const typing = isTyping(event.target);
      for (const entry of hotkeys) {
        if (entry.combo !== pressed || (typing && !entry.inInputs)) continue;
        event.preventDefault();
        try {
          entry.handler(event);
        } catch (err) {
          report(`hotkey ${entry.combo}`, err);
        }
        break;
      }
    });
  };

  const runFeature = entry => {
    ran.add(entry.id);
    try {
      const result = entry.run(contextFor(entry));
      if (result && typeof result.catch === 'function') result.catch(err => report(entry.id, err));
    } catch (err) {
      report(entry.id, err);
    }
  };

  const pageMatches = entry => !entry.pages || entry.pages.includes(page().type);

  const runFeatures = () => {
    for (const entry of features) {
      if (!entry.run || ran.has(entry.id) || !isEnabled(entry.id) || !pageMatches(entry)) continue;
      runFeature(entry);
    }
  };

  const save = () => persist({ [SETTINGS_KEY]: settings });

  const setEnabled = (id, value) => {
    const entry = featureById.get(id);
    if (!entry || typeof value !== 'boolean') return { needsReload: false };
    const before = isEnabled(id);
    if (value === entry.default) delete settings.enabled[id];
    else settings.enabled[id] = value;
    save();
    applyCss();
    emitSettings();
    if (before === value || !entry.run) return { needsReload: false };
    if (value && !ran.has(id)) {
      if (started && pageMatches(entry)) runFeature(entry);
      return { needsReload: false };
    }
    return { needsReload: true };
  };

  const setOption = (id, key, value) => {
    const entry = featureById.get(id);
    const def = entry && entry.options.find(item => item.key === key);
    if (!def || !isValidOption(def, value)) return false;
    settings.options[id] = settings.options[id] || {};
    settings.options[id][key] = value;
    save();
    applyCss();
    emitSettings();
    return true;
  };

  const resetSettings = () => {
    settings = { enabled: {}, options: {} };
    save();
    applyCss();
    emitSettings();
  };

  const exportSettings = () => JSON.stringify({ app: 'rola', version: 1, settings }, null, 2);

  const importSettings = text => {
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      return false;
    }
    if (!parsed || (parsed.app !== 'rola' && parsed.app !== 'rokit') || !parsed.settings) return false;
    settings = sanitizeSettings(parsed.settings);
    save();
    applyCss();
    emitSettings();
    return true;
  };

  const onStorageChanged = (changes, area) => {
    if (area !== 'local') return;
    if (changes[SETTINGS_KEY] && !isOwnWrite(SETTINGS_KEY, changes[SETTINGS_KEY].newValue)) {
      const next = sanitizeSettings(changes[SETTINGS_KEY].newValue);
      if (JSON.stringify(next) !== JSON.stringify(settings)) {
        settings = next;
        applyCss();
        emitSettings();
      }
    }
    if (changes[DATA_KEY] && !isOwnWrite(DATA_KEY, changes[DATA_KEY].newValue)) {
      const next = changes[DATA_KEY].newValue;
      data = next && typeof next === 'object' ? next : {};
    }
  };

  const start = async () => {
    if (started) return;
    started = true;
    let saved = {};
    try {
      saved = await chrome.storage.local.get([SETTINGS_KEY, DATA_KEY]);
    } catch (err) {
      report('storage', err);
    }
    settings = sanitizeSettings(saved[SETTINGS_KEY]);
    data = saved[DATA_KEY] && typeof saved[DATA_KEY] === 'object' ? saved[DATA_KEY] : {};
    applyCss();
    domReady.then(() => {
      if (featureStyle && document.head) document.head.append(featureStyle);
    });
    domObserver.observe(document.documentElement, { childList: true, subtree: true });
    for (const watcher of [...watchers]) {
      for (const match of watcher.root.querySelectorAll(watcher.selector)) {
        if (!watchers.has(watcher)) break;
        hit(watcher, match);
      }
    }
    window.addEventListener('popstate', checkLocation);
    try {
      chrome.storage.onChanged.addListener(onStorageChanged);
    } catch (err) {
      report('storage', err);
    }
    resolveReady();
    Promise.race([waitFor('meta[name="user-data"]'), domReady]).then(async () => {
      const id = accountId();
      const bans = id ? await bg('bans').catch(() => null) : null;
      const ban = bans && bans[id];
      if (ban && (ban.until === null || ban.until > Date.now())) {
        suspension = ban;
        applyCss();
        emitSettings();
        showSuspension(ban);
        return;
      }
      runFeatures();
    });
  };

  return {
    categories,
    features,
    feature,
    start,
    ready,
    isEnabled,
    option,
    setEnabled,
    setOption,
    resetSettings,
    exportSettings,
    importSettings,
    onSettings: listener => {
      settingsListeners.add(listener);
      return () => settingsListeners.delete(listener);
    },
    onNavigate: listener => {
      navigateListeners.add(listener);
      return () => navigateListeners.delete(listener);
    },
    page,
    idFrom,
    isId,
    observe,
    waitFor,
    mount,
    domReady,
    me,
    theme,
    api: { request, get, post, paged, users, presence, games, votes, universeId },
    thumb,
    thumbToken,
    values,
    bg,
    suspended: () => suspension,
    suspensionText,
    images,
    launch,
    store: storeApi,
    fmt,
    el,
    icon,
    ui,
    hotkey
  };
})();
