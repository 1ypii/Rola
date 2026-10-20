(() => {
  const { el, ui, fmt, icon } = Rk;

  const BUY_RATE = 0.0125;
  const DEVEX_RATE = 0.0038;
  const HOUR = 3600000;
  const ITEM_TYPES = { asset: 'Asset', bundle: 'Bundle', gamepass: 'GamePass', badge: 'Badge' };
  const ITEM_PATHS = { asset: 'catalog', bundle: 'bundles', gamepass: 'game-pass', badge: 'badges' };
  const ASSET_TYPES = {
    2: 'T-shirt', 8: 'Hat', 11: 'Shirt', 12: 'Pants', 17: 'Head', 18: 'Face', 19: 'Gear', 24: 'Animation', 27: 'Torso', 28: 'Right arm', 29: 'Left arm', 30: 'Left leg',
    31: 'Right leg', 41: 'Hair accessory', 42: 'Face accessory', 43: 'Neck accessory', 44: 'Shoulder accessory', 45: 'Front accessory', 46: 'Back accessory',
    47: 'Waist accessory', 48: 'Climb animation', 49: 'Death animation', 50: 'Fall animation', 51: 'Idle animation', 52: 'Jump animation', 53: 'Run animation',
    54: 'Swim animation', 55: 'Walk animation', 56: 'Pose animation', 61: 'Emote', 64: 'T-shirt accessory', 65: 'Shirt accessory', 66: 'Pants accessory',
    67: 'Jacket accessory', 68: 'Sweater accessory', 69: 'Shorts accessory', 70: 'Left shoe accessory', 71: 'Right shoe accessory', 72: 'Dress skirt accessory',
    76: 'Eyebrow accessory', 77: 'Eyelash accessory', 78: 'Mood', 79: 'Dynamic head'
  };
  const BUNDLE_TYPES = {
    1: 'Body bundle', 2: 'Animation bundle', 3: 'Shoe bundle', 4: 'Dynamic head bundle', 5: 'Avatar bundle',
    BodyParts: 'Body bundle', AvatarAnimations: 'Animation bundle', Shoes: 'Shoe bundle', DynamicHead: 'Dynamic head bundle', DynamicHeadAvatar: 'Avatar bundle'
  };
  const BODY_PARTS = [['headColor3', 'Head'], ['torsoColor3', 'Torso'], ['leftArmColor3', 'Left arm'], ['rightArmColor3', 'Right arm'], ['leftLegColor3', 'Left leg'], ['rightLegColor3', 'Right leg']];
  const SCALES = [['height', 'Height'], ['width', 'Width'], ['head', 'Head'], ['depth', 'Depth'], ['proportion', 'Proportion'], ['bodyType', 'Body type']];
  const OURS = '[class^="rk-"]:not(html):not(body), [class*=" rk-"]:not(html):not(body)';
  const EDITOR_CARDS = '.item-card-container, .list-item.item-card';
  const AVATAR_URL = 'https://avatar.roblox.com/v2/avatar/avatar';
  const AXES = ['x', 'y', 'z'];
  const COLLECTIBLE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const ROBLOX_LINK = /https?:\/\/(?:[a-z0-9-]+\.)*roblox\.com(?![a-z0-9-]|\.[a-z0-9])(?:[/?#][^\s<>"']*)?/gi;
  const usdFormat = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' });

  const listCss = `
    .rk-avatar-list { display: flex; flex-direction: column; gap: 2px; max-height: 360px; overflow-y: auto; overscroll-behavior: contain; }
    .rk-avatar-text { display: flex; flex-direction: column; min-width: 0; line-height: 1.3; }
    .rk-avatar-name { display: block; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .rk-avatar-sub { font-size: 12px; color: var(--rk-muted); }
  `;

  const tileCss = `
    .rk-avatar-tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(104px, 1fr)); gap: 8px; }
    .rk-avatar-strip { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px; overscroll-behavior-x: contain; scrollbar-width: thin; }
    .rk-avatar-strip .rk-avatar-tile { flex: none; width: 104px; }
    .rk-avatar-tile { display: flex; flex-direction: column; gap: 6px; min-width: 0; padding: 6px; border-radius: var(--rk-radius); color: var(--rk-text) !important; text-decoration: none !important; transition: background-color var(--rk-fast) ease; }
    a.rk-avatar-tile:hover { background: var(--rk-hover); }
    a.rk-avatar-tile:focus-visible { outline: 2px solid var(--rk-accent); outline-offset: 2px; }
    .rk-avatar-tile .rk-thumb { width: 100% !important; height: auto !important; aspect-ratio: 1 / 1; }
    .rk-avatar-tile-name { font-size: 13px; font-weight: 600; line-height: 1.3; color: var(--rk-text-strong); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .rk-avatar-tile .rk-robux, .rk-avatar-tile .rk-muted { font-size: 13px; }
  `;

  const str = (value, max = 200) => (typeof value === 'string' ? value.trim().slice(0, max) : '');
  const num = value => (typeof value === 'number' && Number.isFinite(value) ? value : null);
  const usd = (robux, rate = BUY_RATE) => usdFormat.format(robux * rate);
  const isCatalogKind = kind => kind === 'asset' || kind === 'bundle';
  const itemUrl = (kind, id) => `/${ITEM_PATHS[kind]}/${id}`;

  const itemThumb = (kind, id, size = '150x150') => {
    if (kind === 'bundle') return Rk.thumb('BundleThumbnail', id, size);
    if (kind === 'gamepass') return Rk.thumb('GamePass', id, '150x150');
    if (kind === 'badge') return Rk.thumb('BadgeIcon', id, '150x150');
    return Rk.thumb('Asset', id, size);
  };

  const creatorOf = (id, type, name, verified) => {
    const creatorId = Number(id);
    if (!Rk.isId(creatorId)) return null;
    return { id: creatorId, type: type === 'Group' || type === 2 ? 'Group' : 'User', name: str(name, 100), verified: verified === true };
  };
  const creatorUrl = creator => (creator.type === 'Group' ? `/communities/${creator.id}` : `/users/${creator.id}/profile`);
  const creatorStoreUrl = creator => (creator.type === 'Group' ? `/communities/${creator.id}` : `/users/${creator.id}/creations`);
  const creatorLink = creator => el('span', null, ui.link(creatorUrl(creator), creator.name || `ID ${creator.id}`), creator.verified ? ui.verified() : null);

  const isObject = value => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  const fetchJson = url => Rk.api.get(url, { cache: 60000 }).then(json => (json && typeof json === 'object' ? json : null), () => null);
  const assetDetails = id => (Rk.isId(id) ? fetchJson(`https://economy.roblox.com/v2/assets/${id}/details`) : Promise.resolve(null));
  const bundleDetails = id => (Rk.isId(id) ? fetchJson(`https://catalog.roblox.com/v1/bundles/${id}/details`) : Promise.resolve(null));
  const avatarData = () => fetchJson(AVATAR_URL);
  const avatarRules = () => fetchJson('https://avatar.roblox.com/v1/avatar-rules');
  const favoriteCount = (kind, id) => Rk.api.get(`https://catalog.roblox.com/v1/favorites/${kind === 'bundle' ? 'bundles' : 'assets'}/${id}/count`, { cache: 60000 }).then(json => {
    if (typeof json === 'number') return json;
    return json && typeof json === 'object' ? num(json.count) : null;
  }, () => null);

  const catalogCache = new Map();
  let catalogQueue = [];

  const flushCatalog = () => {
    const batch = catalogQueue;
    catalogQueue = [];
    for (let i = 0; i < batch.length; i += 100) {
      const chunk = batch.slice(i, i + 100);
      Rk.api.post('https://catalog.roblox.com/v1/catalog/items/details', { items: chunk.map(entry => ({ itemType: entry.itemType, id: entry.id })) }).then(json => {
        const found = new Map();
        for (const item of json && Array.isArray(json.data) ? json.data : []) {
          if (item && Rk.isId(item.id)) found.set(`${item.itemType}:${item.id}`, item);
        }
        for (const entry of chunk) {
          const item = found.get(entry.key) || null;
          if (!item) catalogCache.delete(entry.key);
          entry.resolve(item);
        }
      }, () => {
        for (const entry of chunk) {
          catalogCache.delete(entry.key);
          entry.resolve(null);
        }
      });
    }
  };

  const catalogDetails = async items => {
    const result = new Map();
    await Promise.all(items.map(async item => {
      const id = Number(item && item.id);
      const itemType = item && item.itemType;
      if (!Rk.isId(id) || (itemType !== 'Asset' && itemType !== 'Bundle')) return;
      const key = `${itemType}:${id}`;
      if (!catalogCache.has(key)) {
        catalogCache.set(key, new Promise(resolve => {
          catalogQueue.push({ key, itemType, id, resolve });
          if (catalogQueue.length === 1) queueMicrotask(flushCatalog);
        }));
      }
      const entry = await catalogCache.get(key);
      if (entry) result.set(key, entry);
    }));
    return result;
  };

  const catalogPrice = entry => {
    if (!entry) return null;
    const price = num(entry.price);
    const lowest = num(entry.lowestPrice) > 0 ? entry.lowestPrice : null;
    if (entry.priceStatus === 'Off Sale' || price === null) return lowest;
    return lowest !== null && lowest < price ? lowest : price;
  };

  const priceLabel = price => {
    if (price === null || price === undefined) return el('span', { class: 'rk-muted' }, 'Off sale');
    if (price === 0) return el('span', { class: 'rk-strong' }, 'Free');
    return ui.robux(price);
  };

  const tile = (href, source, name, extra) => el(href ? 'a' : 'div', { class: 'rk-avatar-tile', href, title: name },
    ui.thumb(source, { size: 96, alt: name }),
    el('span', { class: 'rk-avatar-tile-name' }, name),
    extra || null
  );

  const metaLine = (label, content) => el('span', { class: 'rk-inline' }, el('span', { class: 'rk-muted' }, label), content);

  const nativeCss = (key, selector) => `html:not(.rk-show-${key}) :is(${selector}) { display: none !important; }`;
  const replacing = (key, run) => async ctx => {
    let placed = null;
    try {
      placed = await run(ctx);
    } finally {
      if (!placed) document.documentElement.classList.add(`rk-show-${key}`);
    }
  };

  const openSection = (area, title, options) => {
    const node = ui.section(title, ui.spinner(), options);
    area.append(node);
    return { node, body: node.querySelector('.rk-section-body') };
  };

  const readItems = key => {
    const list = Rk.store.get(key, []);
    if (!Array.isArray(list)) return [];
    return list.filter(entry => entry && Rk.isId(entry.id) && isCatalogKind(entry.kind)).map(entry => ({
      id: Number(entry.id),
      kind: entry.kind,
      name: str(entry.name),
      price: num(entry.price),
      time: num(entry.time) || 0
    }));
  };

  const writeWishlist = list => Rk.store.set('wishlist', list.slice(0, 100).map(entry => ({ id: entry.id, kind: entry.kind, name: entry.name, price: entry.price, time: entry.time })));

  const loadMeta = async (kind, id) => {
    if (kind === 'asset') {
      const data = await assetDetails(id);
      if (!data) return null;
      const creator = data.Creator && typeof data.Creator === 'object' ? data.Creator : {};
      const forSale = data.IsForSale === true;
      return {
        name: str(data.Name),
        typeName: ASSET_TYPES[data.AssetTypeId] || 'Asset',
        assetTypeId: num(data.AssetTypeId),
        creator: creatorOf(creator.CreatorTargetId || creator.Id, creator.CreatorType, creator.Name, creator.HasVerifiedBadge),
        created: data.Created || null,
        updated: data.Updated || null,
        forSale,
        price: forSale ? num(data.PriceInRobux) || 0 : null,
        sales: num(data.Sales),
        limited: data.IsLimited === true,
        limitedU: data.IsLimitedUnique === true,
        remaining: num(data.Remaining),
        collectibleItemId: str(data.CollectibleItemId, 64),
        offSaleDeadline: data.OffSaleDeadline || null
      };
    }
    if (kind === 'bundle') {
      const [data, catalog] = await Promise.all([bundleDetails(id), catalogDetails([{ itemType: 'Bundle', id }])]);
      if (!data) return null;
      const entry = catalog.get(`Bundle:${id}`) || {};
      const product = data.product && typeof data.product === 'object' ? data.product : {};
      const creator = data.creator && typeof data.creator === 'object' ? data.creator : {};
      const restrictions = Array.isArray(entry.itemRestrictions) ? entry.itemRestrictions : [];
      const forSale = product.isForSale === true;
      return {
        name: str(data.name) || str(entry.name),
        typeName: BUNDLE_TYPES[data.bundleType] || 'Bundle',
        creator: creatorOf(creator.id, creator.type, creator.name, creator.hasVerifiedBadge) || creatorOf(entry.creatorTargetId, entry.creatorType, entry.creatorName, entry.creatorHasVerifiedBadge),
        forSale,
        price: forSale ? (product.isFree === true ? 0 : num(product.priceInRobux)) : null,
        limited: restrictions.includes('Limited') || restrictions.includes('Collectible'),
        limitedU: restrictions.includes('LimitedUnique'),
        collectibleItemId: str(entry.collectibleItemId, 64),
        offSaleDeadline: entry.offSaleDeadline || null,
        items: Array.isArray(data.items) ? data.items : []
      };
    }
    if (kind === 'gamepass') {
      const data = await fetchJson(`https://apis.roblox.com/game-passes/v1/game-passes/${id}/product-info`);
      if (!data) return null;
      const creator = data.Creator && typeof data.Creator === 'object' ? data.Creator : {};
      const forSale = data.IsForSale === true;
      return {
        name: str(data.Name),
        typeName: 'Pass',
        creator: creatorOf(creator.CreatorTargetId || creator.Id, creator.CreatorType, creator.Name, creator.HasVerifiedBadge),
        created: data.Created || null,
        updated: data.Updated || null,
        forSale,
        price: forSale ? num(data.PriceInRobux) || 0 : null,
        sales: num(data.Sales)
      };
    }
    if (kind === 'badge') {
      const data = await fetchJson(`https://badges.roblox.com/v1/badges/${id}`);
      if (!data) return null;
      const universe = data.awardingUniverse && typeof data.awardingUniverse === 'object' ? data.awardingUniverse : {};
      return {
        name: str(data.name),
        typeName: 'Badge',
        creator: null,
        created: data.created || null,
        updated: data.updated || null,
        enabled: data.enabled === true,
        statistics: data.statistics && typeof data.statistics === 'object' ? data.statistics : {},
        universe: Rk.isId(universe.rootPlaceId) ? { placeId: Number(universe.rootPlaceId), name: str(universe.name, 120) } : null
      };
    }
    return null;
  };

  const metaCache = new Map();
  const itemMeta = (kind, id) => {
    const key = `${kind}:${id}`;
    if (!metaCache.has(key)) metaCache.set(key, loadMeta(kind, id).catch(() => null));
    return metaCache.get(key);
  };

  const itemName = async (kind, id) => {
    const meta = await itemMeta(kind, id);
    if (meta && meta.name) return meta.name;
    await Rk.domReady;
    const title = document.querySelector('#item-details-container h1');
    return title ? title.textContent.trim().slice(0, 200) : '';
  };

  let itemAreaNode = null;
  let pillsNode = null;
  let itemBarNode = null;
  let marketNode = null;
  let avatarNode = null;
  let avatarBarNode = null;

  const itemArea = () => {
    if (itemAreaNode) return itemAreaNode;
    const area = el('div', { class: 'rk-item-sections' });
    itemAreaNode = area;
    Rk.observe('#item-details-container', anchor => anchor.after(area));
    Rk.domReady.then(() => {
      if (area.isConnected) return;
      const fallback = document.querySelector('#item-container') || document.querySelector('#content');
      if (fallback) fallback.append(area);
    });
    return area;
  };

  const addPill = pill => {
    if (!pillsNode) {
      const row = el('div', { class: 'rk-inline rk-item-pills rk-hidden', style: { margin: '6px 0 10px' } });
      pillsNode = row;
      Rk.observe('#item-details-container h1', title => title.after(row));
      Rk.domReady.then(() => {
        if (!row.isConnected) itemArea().prepend(row);
      });
    }
    pillsNode.append(pill);
    pillsNode.classList.remove('rk-hidden');
  };

  const itemToolbar = () => {
    if (!itemBarNode) {
      itemBarNode = el('div', { class: 'rk-inline rk-item-toolbar', style: { display: 'flex', margin: '0 0 16px' } });
      itemArea().prepend(itemBarNode);
    }
    return itemBarNode;
  };

  const marketArea = () => {
    if (!marketNode) {
      marketNode = el('div', { class: 'rk-market-panels' });
      Rk.mount('#content', marketNode, { position: 'prepend' });
    }
    return marketNode;
  };

  const avatarArea = () => {
    if (!avatarNode) {
      avatarNode = el('div', { class: 'rk-avatar-panels', style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))', columnGap: '16px', alignItems: 'start', marginBottom: '24px' } });
      Rk.mount('#avatar-react-container', avatarNode, { position: 'before' });
    }
    return avatarNode;
  };

  const avatarToolbar = () => {
    if (!avatarBarNode) {
      avatarBarNode = el('div', { class: 'rk-inline rk-avatar-toolbar', style: { display: 'flex', gridColumn: '1 / -1', margin: '0 0 16px' } });
      avatarArea().prepend(avatarBarNode);
    }
    return avatarBarNode;
  };

  const saveImage = async (button, type, targetId, size, filename) => {
    button.disabled = true;
    try {
      const [url, name] = await Promise.all([Rk.thumb(type, targetId, size), filename]);
      if (!url) {
        ui.toast('The image is not ready yet, try again in a moment', { tone: 'warning' });
        return;
      }
      await Rk.bg('download', { url, filename: name });
      ui.toast('Download started', { tone: 'success' });
    } catch {
      ui.toast('Could not download the image', { tone: 'danger' });
    } finally {
      button.disabled = false;
    }
  };

  const slot = area => {
    const node = el('div', { class: 'rk-avatar-slot', style: { display: 'contents' } });
    area.append(node);
    return node;
  };

  const typeLabel = assetType => {
    if (!assetType || typeof assetType !== 'object') return 'Item';
    if (ASSET_TYPES[assetType.id]) return ASSET_TYPES[assetType.id];
    const name = str(assetType.name, 60).replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
    return name ? name.charAt(0).toUpperCase() + name.slice(1) : 'Item';
  };

  const percentOf = value => {
    const ratio = num(value);
    if (ratio === null) return '-';
    const percent = ratio * 100;
    return `${percent > 0 && percent < 1 ? percent.toFixed(2) : percent.toFixed(1)}%`;
  };

  const dateStat = (label, value) => ui.stat(label, fmt.date(value), { title: fmt.dateTime(value) });

  Rk.feature({
    id: 'avatar.itemDetails',
    category: 'avatar',
    name: 'Item details',
    description: 'Shows the item ID, type, creator, dates, sales, favorites and price in one place.',
    pages: ['item'],
    async run() {
      const { kind, id } = Rk.page();
      if (!isCatalogKind(kind) || !Rk.isId(id)) return;
      const { node, body } = openSection(itemArea(), 'Item details', { className: 'rk-avatar-details' });
      const [meta, favorites] = await Promise.all([itemMeta(kind, id), favoriteCount(kind, id)]);
      if (!meta) {
        node.remove();
        return;
      }
      const priceTile = ui.stat('Price', priceLabel(meta.price));
      if (meta.price > 0) ui.tip(priceTile, `About ${usd(meta.price)} at the buying rate`);
      body.replaceChildren(el('div', { class: 'rk-stats' },
        ui.stat('ID', el('span', { class: 'rk-inline' }, String(id), ui.button('', { variant: 'ghost', icon: 'copy', title: 'Copy ID', onClick: () => ui.copy(id, 'ID copied') }))),
        ui.stat('Type', meta.typeName),
        ui.stat('Creator', meta.creator ? creatorLink(meta.creator) : '-', { title: meta.creator ? meta.creator.name : null }),
        meta.created ? dateStat('Created', meta.created) : null,
        meta.updated ? dateStat('Updated', meta.updated) : null,
        meta.sales > 0 ? ui.stat('Sales', fmt.num(meta.sales)) : null,
        favorites !== null ? ui.stat('Favorites', fmt.num(favorites)) : null,
        priceTile
      ));
    }
  });

  Rk.feature({
    id: 'avatar.ownedPill',
    category: 'avatar',
    name: 'Owned indicator',
    description: 'Shows an Owned pill on items, passes and badges you already have.',
    pages: ['item'],
    async run() {
      const { kind, id } = Rk.page();
      if (!ITEM_TYPES[kind] || !Rk.isId(id)) return;
      const user = await Rk.me();
      if (!user) return;
      const owned = await Rk.api.get(`https://inventory.roblox.com/v1/users/${user.id}/items/${ITEM_TYPES[kind]}/${id}/is-owned`, { cache: 60000 }).catch(() => null);
      if (owned === true) addPill(ui.pill('Owned', 'success'));
    }
  });

  Rk.feature({
    id: 'avatar.quickActions',
    category: 'avatar',
    name: 'Item quick actions',
    description: 'Adds buttons to copy the item ID or link and to open the creator store.',
    pages: ['item'],
    async run() {
      const { kind, id } = Rk.page();
      if (!ITEM_TYPES[kind] || !Rk.isId(id)) return;
      const more = ui.button('More', { variant: 'secondary', icon: 'chevronDown' });
      more.addEventListener('click', () => ui.menu(more, [{
        label: 'Copy name',
        icon: 'copy',
        onClick: async () => {
          const name = await itemName(kind, id);
          if (name) ui.copy(name, 'Name copied');
          else ui.toast('Could not find the item name', { tone: 'warning' });
        }
      }]));
      itemToolbar().append(
        ui.button('Copy ID', { icon: 'copy', onClick: () => ui.copy(id, 'ID copied') }),
        ui.button('Copy link', { icon: 'link', onClick: () => ui.copy(`https://www.roblox.com${itemUrl(kind, id)}`, 'Link copied') }),
        more
      );
      const meta = await itemMeta(kind, id);
      if (!meta || !meta.creator) return;
      more.before(ui.button('Creator store', { icon: 'tag', href: creatorStoreUrl(meta.creator), title: meta.creator.name ? `Items by ${meta.creator.name}` : null }));
    }
  });

  Rk.feature({
    id: 'avatar.downloadImage',
    category: 'avatar',
    name: 'Download item image',
    description: 'Adds a button that saves the large item thumbnail.',
    default: false,
    pages: ['item'],
    run() {
      const { kind, id } = Rk.page();
      if (!isCatalogKind(kind) || !Rk.isId(id)) return;
      const button = ui.button('Download image', {
        icon: 'download',
        onClick: () => {
          const filename = itemName(kind, id).then(name => `${name || kind}-${id}.png`);
          saveImage(button, kind === 'bundle' ? 'BundleThumbnail' : 'Asset', id, '420x420', filename);
        }
      });
      itemToolbar().append(button);
    }
  });

  Rk.feature({
    id: 'avatar.bundleContents',
    category: 'avatar',
    name: 'Bundle contents',
    description: 'Lists every item in a bundle with its own price and how much the bundle saves, in place of the Roblox included items list.',
    pages: ['item'],
    css: `${listCss}${nativeCss('bundleitems', '.bundle-items, .container-header:has(+ .bundle-items), h2:has(+ .bundle-items)')}`,
    run: replacing('bundleitems', async () => {
      const { kind, id } = Rk.page();
      if (kind !== 'bundle' || !Rk.isId(id)) return null;
      const { node, body } = openSection(itemArea(), 'Included items', { className: 'rk-avatar-bundle' });
      const meta = await itemMeta(kind, id);
      const seen = new Set();
      const items = (meta ? meta.items : []).filter(item => {
        if (!item || item.type !== 'Asset' || !Rk.isId(item.id) || seen.has(Number(item.id))) return false;
        seen.add(Number(item.id));
        return true;
      });
      if (!items.length) {
        node.remove();
        return null;
      }
      const details = await catalogDetails(items.map(item => ({ itemType: 'Asset', id: Number(item.id) })));
      let total = 0;
      let missing = 0;
      const rows = items.map(item => {
        const entry = details.get(`Asset:${item.id}`);
        const price = catalogPrice(entry);
        if (price === null) missing++;
        else total += price;
        const name = str(item.name) || str(entry && entry.name) || `Item ${item.id}`;
        return ui.row([
          ui.thumb(itemThumb('asset', item.id), { size: 40, alt: name }),
          ui.link(itemUrl('asset', item.id), name, { className: 'rk-avatar-name' })
        ], priceLabel(price));
      });
      const footer = [metaLine('Bought separately', ui.robux(total))];
      if (meta.price !== null) {
        footer.push(metaLine('Bundle', priceLabel(meta.price)));
        const saved = total - meta.price;
        if (saved > 0) footer.push(ui.pill(`You save ${fmt.num(saved)} (${fmt.percent(saved, total, 0)})`, 'success'));
        else if (saved < 0 && !missing) footer.push(ui.pill('Cheaper to buy separately', 'warning'));
      }
      if (missing) footer.push(el('span', { class: 'rk-muted' }, `${fmt.plural(missing, 'item')} not sold separately`));
      body.replaceChildren(
        el('div', { class: 'rk-avatar-list' }, rows),
        el('div', { class: 'rk-inline', style: { display: 'flex', gap: '8px 16px', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--rk-border)' } }, footer)
      );
      return node;
    })
  });

  Rk.feature({
    id: 'avatar.creatorItems',
    category: 'avatar',
    name: 'More from this creator',
    description: 'Shows up to 10 other items from the same creator under the item.',
    default: false,
    pages: ['item'],
    css: tileCss,
    async run() {
      const { kind, id } = Rk.page();
      if (!isCatalogKind(kind) || !Rk.isId(id)) return;
      const holder = slot(itemArea());
      const meta = await itemMeta(kind, id);
      if (!meta || !meta.creator) return;
      const search = await fetchJson(`https://catalog.roblox.com/v1/search/items?category=All&creatorTargetId=${meta.creator.id}&creatorType=${meta.creator.type}&limit=10`);
      const current = `${ITEM_TYPES[kind]}:${id}`;
      const wanted = (search && Array.isArray(search.data) ? search.data : [])
        .filter(item => item && Rk.isId(item.id) && (item.itemType === 'Asset' || item.itemType === 'Bundle') && `${item.itemType}:${item.id}` !== current)
        .slice(0, 10);
      if (!wanted.length) return;
      const details = await catalogDetails(wanted);
      const tiles = wanted.map(item => {
        const entry = details.get(`${item.itemType}:${item.id}`);
        if (!entry) return null;
        const itemKind = item.itemType === 'Bundle' ? 'bundle' : 'asset';
        const name = str(entry.name) || `Item ${item.id}`;
        return tile(itemUrl(itemKind, item.id), itemThumb(itemKind, item.id), name, priceLabel(catalogPrice(entry)));
      }).filter(Boolean);
      if (!tiles.length) return;
      holder.replaceWith(ui.section('More from this creator', el('div', { class: 'rk-avatar-tiles' }, tiles), {
        className: 'rk-avatar-creator',
        actions: ui.button('View all', { variant: 'ghost', href: creatorStoreUrl(meta.creator) })
      }));
    }
  });

  Rk.feature({
    id: 'avatar.statusPills',
    category: 'avatar',
    name: 'Item status pills',
    description: 'Shows pills for off sale, free, remaining stock and layered clothing.',
    pages: ['item'],
    async run() {
      const { kind, id } = Rk.page();
      if (!ITEM_TYPES[kind] || kind === 'badge' || !Rk.isId(id)) return;
      const meta = await itemMeta(kind, id);
      if (!meta) return;
      if (!meta.forSale && !meta.limited && !meta.limitedU) addPill(ui.pill('Off sale', 'neutral'));
      else if (meta.price === 0) addPill(ui.pill('Free', 'success'));
      if (meta.remaining > 0) addPill(ui.pill(`${fmt.num(meta.remaining)} remaining`, 'warning'));
      if (meta.assetTypeId >= 64 && meta.assetTypeId <= 72) addPill(ui.pill('Layered', 'neutral'));
    }
  });

  const renderWishlist = area => {
    const list = readItems('wishlist');
    const count = el('span', { class: 'rk-muted' });
    const rows = el('div', { class: 'rk-avatar-list' });
    const section = ui.section('Wishlist', rows, { className: 'rk-avatar-wishlist', actions: count });
    const sync = () => {
      const size = rows.childElementCount;
      count.textContent = fmt.plural(size, 'item');
      section.classList.toggle('rk-hidden', size === 0);
    };
    const remove = (entry, row) => {
      writeWishlist(readItems('wishlist').filter(item => item.id !== entry.id || item.kind !== entry.kind));
      row.remove();
      sync();
      ui.toast('Removed from wishlist');
    };
    for (const entry of list) {
      const name = entry.name || `Item ${entry.id}`;
      const row = ui.row([
        ui.thumb(itemThumb(entry.kind, entry.id), { size: 40, alt: name }),
        el('div', { class: 'rk-avatar-text' },
          ui.link(itemUrl(entry.kind, entry.id), name, { className: 'rk-avatar-name' }),
          el('span', { class: 'rk-avatar-sub' }, `Added ${fmt.ago(entry.time)}`)
        )
      ], ui.button('', { variant: 'ghost', icon: 'trash', title: 'Remove from wishlist', onClick: () => remove(entry, row) }), { className: 'rk-wishlist-row' });
      row.dataset.id = String(entry.id);
      row.dataset.kind = entry.kind;
      row.dataset.price = entry.price === null ? '' : String(entry.price);
      rows.append(row);
    }
    sync();
    area.append(section);
  };

  Rk.feature({
    id: 'avatar.wishlist',
    category: 'avatar',
    name: 'Wishlist',
    description: 'Save items to a wishlist from their page and see it on the marketplace and in the avatar editor.',
    pages: ['item', 'marketplace', 'avatar'],
    css: listCss,
    run() {
      const { type, kind, id } = Rk.page();
      if (type === 'marketplace') return renderWishlist(marketArea());
      if (type === 'avatar') return renderWishlist(avatarArea());
      if (!isCatalogKind(kind) || !Rk.isId(id)) return;
      const has = () => readItems('wishlist').some(item => item.id === id && item.kind === kind);
      const button = ui.button('Wishlist', { icon: 'heart' });
      const sync = () => {
        const saved = has();
        button.classList.toggle('rk-btn-active', saved);
        button.setAttribute('aria-pressed', saved ? 'true' : 'false');
        button.title = saved ? 'Remove from wishlist' : 'Add to wishlist';
      };
      button.addEventListener('click', async () => {
        const list = readItems('wishlist');
        if (list.some(item => item.id === id && item.kind === kind)) {
          writeWishlist(list.filter(item => item.id !== id || item.kind !== kind));
          sync();
          ui.toast('Removed from wishlist');
          return;
        }
        if (list.length >= 100) {
          ui.toast('Your wishlist is full, remove an item first', { tone: 'warning' });
          return;
        }
        button.disabled = true;
        const [meta, name] = await Promise.all([itemMeta(kind, id), itemName(kind, id)]);
        button.disabled = false;
        writeWishlist([{ id, kind, name, price: meta ? meta.price : null, time: Date.now() }, ...readItems('wishlist').filter(item => item.id !== id || item.kind !== kind)]);
        sync();
        ui.toast('Added to wishlist', { tone: 'success' });
      });
      sync();
      itemToolbar().append(button);
    }
  });

  Rk.feature({
    id: 'avatar.wishlistPrices',
    category: 'avatar',
    name: 'Wishlist price changes',
    description: 'Shows the current price of wishlist items and how it changed since you added them.',
    pages: ['marketplace', 'avatar'],
    run() {
      Rk.observe('.rk-wishlist-row', async row => {
        const id = Number(row.dataset.id);
        const itemType = row.dataset.kind === 'bundle' ? 'Bundle' : 'Asset';
        if (!Rk.isId(id) || row.querySelector('.rk-wishlist-price')) return;
        const details = await catalogDetails([{ itemType, id }]);
        const entry = details.get(`${itemType}:${id}`);
        if (!entry || !row.isConnected) return;
        const current = catalogPrice(entry);
        const saved = row.dataset.price === '' ? null : Number(row.dataset.price);
        const side = row.querySelector('.rk-row-side');
        if (!side) return;
        let change = null;
        if (Number.isFinite(saved) && current !== null && current !== saved) {
          const diff = current - saved;
          change = ui.pill(`${diff > 0 ? '+' : ''}${fmt.num(diff)}`, diff < 0 ? 'success' : 'danger', { title: `Was ${fmt.num(saved)} Robux when you added it` });
        }
        side.prepend(el('span', { class: 'rk-inline rk-wishlist-price' }, change, priceLabel(current)));
      });
    }
  });

  const robuxText = node => {
    const text = node.textContent.trim();
    if (!/^\d[\d,.\s']*$/.test(text)) return null;
    const value = Number(text.replace(/\D/g, ''));
    return Number.isSafeInteger(value) ? value : null;
  };

  const cardOf = node => node.closest('.list-item.item-card, .item-card') || node.closest('.item-card-container');

  const priceState = price => {
    const text = price.textContent.replace(/\s+/g, ' ').trim().toLowerCase();
    if (text === 'free') return 'free';
    if (text.includes('off sale') || text.includes('offsale')) return 'offsale';
    return null;
  };

  const cardItem = link => {
    const href = link.getAttribute('href') || '';
    const bundleId = Rk.idFrom(href, 'bundle');
    if (bundleId) return { kind: 'bundle', id: bundleId };
    const assetId = Rk.idFrom(href, 'asset');
    return assetId ? { kind: 'asset', id: assetId } : null;
  };

  Rk.feature({
    id: 'avatar.usdPrices',
    category: 'avatar',
    name: 'Dollar estimates',
    description: 'Shows what Robux prices are worth in US dollars when you hover them.',
    default: false,
    pages: ['marketplace', 'item'],
    options: [
      { key: 'rate', label: 'Rate', type: 'select', choices: [['buy', 'Buying, $0.0125 per Robux'], ['devex', 'DevEx, $0.0038 per Robux']], default: 'buy' }
    ],
    run(ctx) {
      Rk.observe('.item-card-price .text-robux-tile, .text-robux-lg', node => {
        const update = () => {
          const robux = robuxText(node);
          if (!robux) {
            node.removeAttribute('data-rk-tip');
            return;
          }
          const devex = ctx.option('rate') === 'devex';
          node.setAttribute('data-rk-tip', `About ${usd(robux, devex ? DEVEX_RATE : BUY_RATE)} at the ${devex ? 'DevEx' : 'buying'} rate`);
        };
        node.addEventListener('mouseenter', update);
        update();
      });
    }
  });

  const quickView = (kind, id, fallbackName) => {
    const name = el('div', { class: 'rk-strong', style: { fontSize: '18px', lineHeight: '1.3' } }, fallbackName || `Item ${id}`);
    const info = el('div', { class: 'rk-stack', style: { minWidth: '0' } }, name, ui.spinner());
    const handle = ui.modal({
      title: 'Quick view',
      width: 600,
      content: el('div', { class: 'rk-quickview' }, ui.thumb(itemThumb(kind, id, '420x420'), { size: 240, alt: fallbackName || '' }), info),
      actions: [ui.button('Open item page', { variant: 'primary', size: 'md', href: itemUrl(kind, id) })]
    });
    Promise.all([itemMeta(kind, id), catalogDetails([{ itemType: ITEM_TYPES[kind], id }]), favoriteCount(kind, id)]).then(([meta, details, favorites]) => {
      if (!handle.root.isConnected) return;
      const entry = details.get(`${ITEM_TYPES[kind]}:${id}`);
      if (!meta && !entry) {
        info.replaceChildren(name, el('span', { class: 'rk-muted' }, 'Could not load this item'));
        return;
      }
      const creator = (meta && meta.creator) || (entry ? creatorOf(entry.creatorTargetId, entry.creatorType, entry.creatorName, entry.creatorHasVerifiedBadge) : null);
      name.textContent = (meta && meta.name) || str(entry && entry.name) || name.textContent;
      info.replaceChildren(
        name,
        meta ? el('span', { class: 'rk-muted' }, meta.typeName) : null,
        creator ? metaLine('By', creatorLink(creator)) : null,
        metaLine('Price', priceLabel(entry ? catalogPrice(entry) : meta.price)),
        favorites !== null ? metaLine('Favorites', el('span', { class: 'rk-strong' }, fmt.num(favorites))) : null
      );
    });
  };

  Rk.feature({
    id: 'avatar.quickView',
    category: 'avatar',
    name: 'Quick view',
    description: 'Adds an eye button to marketplace cards that previews the item without leaving the page.',
    default: false,
    pages: ['marketplace'],
    css: `
      .rk-quickview-host { position: relative; }
      .rk-quickview-btn { position: absolute !important; top: 6px; right: 6px; z-index: 3; background: var(--rk-bg) !important; box-shadow: 0 1px 4px var(--rk-border); opacity: 0; transition: opacity var(--rk-fast) ease, background-color var(--rk-fast) ease, transform var(--rk-fast) var(--rk-ease) !important; }
      .rk-quickview-host:hover .rk-quickview-btn, .rk-quickview-btn:focus-visible { opacity: 1; }
      .rk-quickview { display: grid; grid-template-columns: 240px 1fr; gap: 16px; align-items: start; }
      .rk-quickview .rk-thumb { max-width: 100%; }
      @media (max-width: 560px) { .rk-quickview { grid-template-columns: 1fr; } }
      @media (hover: none) { .rk-quickview-btn { opacity: 1; } }
    `,
    run() {
      Rk.observe('a.item-card-link', link => {
        const item = cardItem(link);
        const card = cardOf(link);
        if (!item || !card || card.querySelector('.rk-quickview-btn')) return;
        const button = ui.button('', {
          variant: 'secondary',
          icon: 'eye',
          title: 'Quick view',
          onClick: event => {
            event.preventDefault();
            event.stopPropagation();
            const title = card.querySelector('.item-card-name');
            quickView(item.kind, item.id, title ? title.textContent.trim().slice(0, 200) : '');
          }
        });
        button.classList.add('rk-quickview-btn');
        card.classList.add('rk-quickview-host');
        card.append(button);
      });
    }
  });

  Rk.feature({
    id: 'avatar.denseGrid',
    category: 'avatar',
    name: 'Dense marketplace grid',
    description: 'Fits more items on screen with tighter marketplace cards.',
    default: false,
    css: `
      #catalog .item-cards-stackable, .catalog-results .item-cards-stackable { gap: 8px !important; }
      #catalog .list-item.item-card, .catalog-results .list-item.item-card { margin-bottom: 8px !important; padding: 0 4px !important; }
      #catalog .item-card-container, .catalog-results .item-card-container { padding: 4px !important; margin: 0 !important; }
      #catalog .item-card-caption, .catalog-results .item-card-caption { padding-top: 4px !important; }
      #catalog .item-card-name, .catalog-results .item-card-name { margin-bottom: 0 !important; }
    `
  });

  Rk.feature({
    id: 'avatar.recentItems',
    category: 'avatar',
    name: 'Recently viewed items',
    description: 'Remembers the items you open and shows them on the marketplace.',
    pages: ['item', 'marketplace'],
    css: tileCss,
    async run() {
      const { type, kind, id } = Rk.page();
      if (type === 'marketplace') {
        const list = readItems('history.items');
        if (!list.length) return;
        const section = ui.section('Recently viewed', el('div', { class: 'rk-avatar-strip' }, list.map(entry => {
          const name = entry.name || `Item ${entry.id}`;
          return tile(itemUrl(entry.kind, entry.id), itemThumb(entry.kind, entry.id), name, el('span', { class: 'rk-muted' }, fmt.ago(entry.time)));
        })), {
          className: 'rk-avatar-recent',
          actions: ui.button('Clear', {
            variant: 'ghost',
            icon: 'trash',
            onClick: () => {
              Rk.store.set('history.items', []);
              section.remove();
              ui.toast('Recently viewed cleared');
            }
          })
        });
        marketArea().prepend(section);
        return;
      }
      if (!isCatalogKind(kind) || !Rk.isId(id)) return;
      const name = await itemName(kind, id);
      const rest = readItems('history.items').filter(entry => entry.id !== id || entry.kind !== kind);
      Rk.store.set('history.items', [{ id, kind, name, time: Date.now() }, ...rest].slice(0, 40).map(entry => ({ id: entry.id, kind: entry.kind, name: entry.name, time: entry.time })));
    }
  });

  Rk.feature({
    id: 'avatar.relatedHide',
    category: 'avatar',
    name: 'Hide recommendations',
    description: 'Hides the recommended items list on item pages.',
    default: false,
    css: `
      body:has(#item-container) #item-list-container-recommendations,
      body:has(#item-container) #recommendations-container { display: none !important; }
    `
  });

  const countdown = ms => (ms >= HOUR ? fmt.duration(ms) : `${Math.max(1, Math.ceil(ms / 60000))}m`);

  Rk.feature({
    id: 'avatar.saleTimer',
    category: 'avatar',
    name: 'Sale countdown',
    description: 'Shows a live countdown on items that are going off sale soon.',
    pages: ['item'],
    async run() {
      const { kind, id } = Rk.page();
      if (!isCatalogKind(kind) || !Rk.isId(id)) return;
      const meta = await itemMeta(kind, id);
      const deadline = meta && meta.offSaleDeadline ? new Date(meta.offSaleDeadline).getTime() : NaN;
      if (!Number.isFinite(deadline) || deadline <= Date.now()) return;
      const pill = ui.pill('', 'warning', { title: `Goes off sale ${fmt.dateTime(deadline)}` });
      pill.prepend(icon('clock', 12));
      const label = el('span');
      pill.append(label);
      let timer = null;
      let seen = false;
      let done = false;
      const finish = () => {
        done = true;
        clearInterval(timer);
        document.removeEventListener('visibilitychange', sync);
      };
      const tick = () => {
        if (pill.isConnected) seen = true;
        else if (seen) return finish();
        const left = deadline - Date.now();
        if (left > 0) {
          label.textContent = `Off sale in ${countdown(left)}`;
          return;
        }
        label.textContent = 'Sale ended';
        pill.className = 'rk-pill rk-pill-neutral';
        finish();
      };
      const sync = () => {
        clearInterval(timer);
        timer = null;
        tick();
        if (!done && document.visibilityState === 'visible') timer = setInterval(tick, 30000);
      };
      document.addEventListener('visibilitychange', sync);
      addPill(pill);
      sync();
    }
  });

  Rk.feature({
    id: 'avatar.idJump',
    category: 'avatar',
    name: 'Go to item',
    description: 'Adds a box on the marketplace that opens an item from its ID or link.',
    pages: ['marketplace'],
    run() {
      const go = value => {
        const text = value.trim();
        const bundleId = Rk.idFrom(text, 'bundle');
        const assetId = /^\d+$/.test(text) && Rk.isId(text) ? Number(text) : Rk.idFrom(text, 'asset');
        if (bundleId) location.assign(itemUrl('bundle', bundleId));
        else if (assetId) location.assign(itemUrl('asset', assetId));
        else ui.toast('That is not an item ID or marketplace link', { tone: 'warning' });
      };
      const field = ui.input({ placeholder: 'Go to item ID or link', maxLength: 300, onEnter: go });
      field.setAttribute('aria-label', 'Go to item ID or link');
      field.style.width = '260px';
      field.style.height = '32px';
      marketArea().prepend(el('div', { class: 'rk-inline rk-avatar-jump', style: { display: 'flex', margin: '0 0 16px' } },
        field,
        ui.button('Go', { icon: 'chevronRight', onClick: () => go(field.value) })
      ));
    }
  });

  Rk.feature({
    id: 'avatar.itemZoom',
    category: 'avatar',
    name: 'Zoom item image',
    description: 'Click the main item image to see it larger.',
    pages: ['item'],
    css: `
      .rk-zoomable { cursor: zoom-in !important; }
      .rk-zoom-image { width: 100% !important; height: auto !important; max-width: 420px; margin: 0 auto; aspect-ratio: 1 / 1; }
    `,
    run() {
      const { kind, id } = Rk.page();
      if (!ITEM_TYPES[kind] || !Rk.isId(id)) return;
      const candidate = img => !img.parentElement.closest(`a, button, ${OURS}`) && (img.getBoundingClientRect().width >= 200 || img.naturalWidth >= 300);
      const mainImage = (container, target) => {
        const img = target instanceof Element ? target.closest('img') : null;
        if (!img || !container.contains(img)) return null;
        return [...container.querySelectorAll('img')].find(candidate) === img ? img : null;
      };
      Rk.observe('#item-details-container', container => {
        container.addEventListener('mouseover', event => {
          const img = mainImage(container, event.target);
          if (img) img.classList.add('rk-zoomable');
        });
        container.addEventListener('click', async event => {
          const img = mainImage(container, event.target);
          if (!img) return;
          event.preventDefault();
          event.stopPropagation();
          const source = isCatalogKind(kind) ? itemThumb(kind, id, '420x420').then(url => url || img.currentSrc || img.src) : img.currentSrc || img.src;
          ui.modal({ title: await itemName(kind, id) || 'Item image', width: 480, content: ui.thumb(source, { size: 420, alt: img.alt || '', className: 'rk-zoom-image' }) });
        });
      });
    }
  });

  Rk.feature({
    id: 'avatar.freeHighlight',
    category: 'avatar',
    name: 'Highlight free items',
    description: 'Outlines free items on the marketplace so they are easy to spot.',
    default: false,
    pages: ['marketplace'],
    css: `
      .rk-free-card { outline: 2px solid var(--rk-accent); outline-offset: 2px; border-radius: var(--rk-radius); transition: outline-color var(--rk-fast) ease; }
      .rk-free-pill { margin-left: 6px; }
    `,
    run() {
      Rk.observe('.item-card-price, .item-card-price span', node => {
        const price = node.closest('.item-card-price');
        const card = price && cardOf(price);
        if (!card || priceState(price) !== 'free' || price.querySelector('.rk-free-pill')) return;
        card.classList.add('rk-free-card');
        const pill = ui.pill('Free', 'accent');
        pill.classList.add('rk-free-pill');
        price.append(pill);
      });
    }
  });

  Rk.feature({
    id: 'avatar.hideOffsale',
    category: 'avatar',
    name: 'Hide off sale items',
    description: 'Hides marketplace items that are off sale.',
    default: false,
    pages: ['marketplace'],
    run() {
      Rk.observe('.item-card-price, .item-card-price span', node => {
        const price = node.closest('.item-card-price');
        const card = price && cardOf(price);
        if (card && priceState(price) === 'offsale') card.classList.add('rk-hidden');
      });
    }
  });

  const DESCRIPTION = '#item-details-container [class*="description"]';

  const linkify = root => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: node => (node.parentElement && !node.parentElement.closest(`a, button, textarea, input, ${OURS}`) && /roblox\.com/i.test(node.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT)
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) {
      const text = node.nodeValue;
      const parts = [];
      let last = 0;
      for (const match of text.matchAll(ROBLOX_LINK)) {
        const raw = match[0].replace(/[.,;:!?)\]}'"]+$/, '');
        let url = null;
        try {
          url = new URL(raw);
        } catch {
          continue;
        }
        if (!/(^|\.)roblox\.com$/i.test(url.hostname)) continue;
        if (match.index > last) parts.push(text.slice(last, match.index));
        parts.push(el('a', { class: 'rk-link rk-desc-link', href: url.href, rel: 'noopener noreferrer' }, raw));
        last = match.index + raw.length;
      }
      if (!parts.length) continue;
      if (last < text.length) parts.push(text.slice(last));
      node.replaceWith(...parts);
    }
  };

  Rk.feature({
    id: 'avatar.descriptionLinks',
    category: 'avatar',
    name: 'Clickable description links',
    description: 'Turns Roblox links in item descriptions into clickable links.',
    default: false,
    pages: ['item'],
    run() {
      Rk.observe(DESCRIPTION, node => {
        if (!node.closest(OURS)) linkify(node);
      });
    }
  });

  const readPriceHistory = () => {
    const raw = Rk.store.get('avatar.priceHistory', {});
    const clean = {};
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return clean;
    for (const [key, points] of Object.entries(raw)) {
      if (!/^(asset|bundle):\d+$/.test(key) || !Array.isArray(points)) continue;
      const valid = points.filter(point => Array.isArray(point) && num(point[0]) > 0 && num(point[1]) !== null && point[1] >= 0).map(point => [point[0], point[1]]);
      if (valid.length) clean[key] = valid.slice(-30);
    }
    return clean;
  };

  Rk.feature({
    id: 'avatar.priceHistory',
    category: 'avatar',
    name: 'Price change history',
    description: 'Tells you when an item price changed. Limited items use the sale history from Roblox, other items are remembered between visits.',
    default: false,
    pages: ['item'],
    async run() {
      const { kind, id } = Rk.page();
      if (!isCatalogKind(kind) || !Rk.isId(id)) return;
      const meta = await itemMeta(kind, id);
      if (meta && (meta.limited || meta.limitedU) && kind === 'asset') {
        const details = await Rk.api.get(`https://economy.roblox.com/v2/assets/${id}/details`, { cache: 600000 }).catch(() => null);
        const collectible = isObject(details) && typeof details.CollectibleItemId === 'string' && /^[0-9a-f-]{36}$/i.test(details.CollectibleItemId) ? details.CollectibleItemId : null;
        const current = collectible ? await Rk.api.get(`https://apis.roblox.com/marketplace-sales/v1/item/${collectible}/resale-data`, { cache: 60000 }).catch(() => null) : null;
        const data = isObject(current) && Array.isArray(current.priceDataPoints) ? current : await Rk.api.get(`https://economy.roblox.com/v1/assets/${id}/resale-data`, { cache: 60000 }).catch(() => null);
        const sales = (isObject(data) && Array.isArray(data.priceDataPoints) ? data.priceDataPoints : [])
          .map(point => [isObject(point) ? Date.parse(point.date) : NaN, isObject(point) ? Number(point.value) : NaN])
          .filter(([time, value]) => Number.isFinite(time) && Number.isFinite(value) && value > 0)
          .sort((a, b) => a[0] - b[0]);
        if (sales.length < 2) return;
        const latest = sales[sales.length - 1];
        const monthAgo = sales.find(([time]) => time >= latest[0] - 30 * 24 * HOUR) || sales[0];
        if (monthAgo === latest || monthAgo[1] === latest[1]) return;
        const pill = ui.pill(`Sold for ${fmt.num(latest[1])}, was ${fmt.num(monthAgo[1])} on ${fmt.date(monthAgo[0])}`, latest[1] < monthAgo[1] ? 'success' : 'danger', { title: 'From Roblox sale history' });
        pill.prepend(icon('chart', 12));
        addPill(pill);
        return;
      }
      const price = meta ? meta.price : null;
      if (price === null) return;
      const key = `${kind}:${id}`;
      const history = readPriceHistory();
      const points = history[key] || [];
      const now = Date.now();
      const latest = points[points.length - 1];
      const series = [...points, [now, price]];
      if (!latest || now - latest[0] >= 6 * HOUR) {
        history[key] = series.slice(-30);
        const keys = Object.keys(history);
        if (keys.length > 200) {
          keys.sort((a, b) => history[a][history[a].length - 1][0] - history[b][history[b].length - 1][0]);
          for (const old of keys.slice(0, keys.length - 200)) delete history[old];
        }
        Rk.store.set('avatar.priceHistory', history);
      }
      for (let i = series.length - 1; i > 0; i--) {
        const before = series[i - 1][1];
        const after = series[i][1];
        if (before === after) continue;
        const pill = ui.pill(`Price changed from ${fmt.num(before)} to ${fmt.num(after)} on ${fmt.date(series[i][0])}`, after < before ? 'success' : 'danger', { title: fmt.dateTime(series[i][0]) });
        pill.prepend(icon('chart', 12));
        addPill(pill);
        return;
      }
    }
  });

  Rk.feature({
    id: 'avatar.descriptionExpand',
    category: 'avatar',
    name: 'Full item descriptions',
    description: 'Shows the whole item description without cutting it off.',
    default: false,
    css: `
      #item-details-container [class*="description"] {
        max-height: none !important;
        -webkit-line-clamp: unset !important;
        line-clamp: none !important;
        overflow: visible !important;
      }
    `
  });

  const collectibleInfo = async collectibleItemId => {
    if (!COLLECTIBLE_ID.test(collectibleItemId)) return null;
    const json = await Rk.api.post('https://apis.roblox.com/marketplace-items/v1/items/details', { itemIds: [collectibleItemId] }).catch(() => null);
    const list = Array.isArray(json) ? json : json && Array.isArray(json.data) ? json.data : [];
    return list.find(entry => entry && entry.collectibleItemId === collectibleItemId) || list[0] || null;
  };

  Rk.feature({
    id: 'avatar.collectibleStock',
    category: 'avatar',
    name: 'Collectible stock',
    description: 'Shows how many copies of a limited item are left and the lowest resale price.',
    pages: ['item'],
    async run() {
      const { kind, id } = Rk.page();
      if (!isCatalogKind(kind) || !Rk.isId(id)) return;
      const holder = slot(itemArea());
      const meta = await itemMeta(kind, id);
      const info = meta && meta.collectibleItemId ? await collectibleInfo(meta.collectibleItemId) : null;
      if (!info) return;
      const total = num(info.totalQuantity);
      const left = num(info.unitsAvailableForConsumption);
      const lowest = num(info.lowestResalePrice);
      const parts = [];
      if (total > 0 && left !== null) {
        const ratio = left / total;
        parts.push(
          el('div', { class: 'rk-inline', style: { display: 'flex', justifyContent: 'space-between' } },
            el('span', { class: 'rk-strong' }, `${fmt.num(left)} of ${fmt.num(total)} left`),
            el('span', { class: 'rk-muted' }, left === 0 ? 'Sold out' : `${fmt.percent(total - left, total)} sold`)
          ),
          ui.progress(ratio, { tone: left === 0 ? 'danger' : ratio < 0.1 ? 'warning' : 'accent' })
        );
      }
      if (lowest > 0) parts.push(metaLine('Lowest resale', ui.robux(lowest)));
      if (!parts.length) return;
      holder.replaceWith(ui.section('Collectible stock', el('div', { class: 'rk-stack' }, parts), { className: 'rk-avatar-stock' }));
    }
  });

  const experienceLink = async () => {
    await Rk.domReady;
    const anchor = [...document.querySelectorAll('#item-container a[href*="/games/"]')].find(node => !node.closest(OURS) && Rk.idFrom(node.getAttribute('href'), 'game'));
    if (!anchor) return null;
    return ui.link(`/games/${Rk.idFrom(anchor.getAttribute('href'), 'game')}`, anchor.textContent.trim().slice(0, 120) || 'Open experience');
  };

  Rk.feature({
    id: 'avatar.gamepassDetails',
    category: 'avatar',
    name: 'Pass details',
    description: 'Shows the price, sale status, dates, creator and experience of a pass.',
    pages: ['item'],
    async run() {
      const { kind, id } = Rk.page();
      if (kind !== 'gamepass' || !Rk.isId(id)) return;
      const { node, body } = openSection(itemArea(), 'Pass details', { className: 'rk-avatar-pass' });
      const meta = await itemMeta(kind, id);
      if (!meta) {
        node.remove();
        return;
      }
      const game = await experienceLink();
      const priceTile = ui.stat('Price', priceLabel(meta.price));
      if (meta.price > 0) ui.tip(priceTile, `About ${usd(meta.price)} at the buying rate`);
      body.replaceChildren(el('div', { class: 'rk-stats' },
        priceTile,
        ui.stat('For sale', meta.forSale ? 'Yes' : 'No'),
        meta.sales > 0 ? ui.stat('Sales', fmt.num(meta.sales)) : null,
        meta.created ? dateStat('Created', meta.created) : null,
        meta.updated ? dateStat('Updated', meta.updated) : null,
        ui.stat('Creator', meta.creator ? creatorLink(meta.creator) : '-', { title: meta.creator ? meta.creator.name : null }),
        game ? ui.stat('Experience', game, { title: game.textContent }) : null
      ));
    }
  });

  Rk.feature({
    id: 'avatar.badgeDetails',
    category: 'avatar',
    name: 'Badge details',
    description: 'Shows how many players have a badge, how rare it is and when you unlocked it.',
    pages: ['item'],
    async run() {
      const { kind, id } = Rk.page();
      if (kind !== 'badge' || !Rk.isId(id)) return;
      const { node, body } = openSection(itemArea(), 'Badge details', { className: 'rk-avatar-badge' });
      const [meta, user] = await Promise.all([itemMeta(kind, id), Rk.me()]);
      if (!meta) {
        node.remove();
        return;
      }
      let unlocked = null;
      if (user) {
        const json = await fetchJson(`https://badges.roblox.com/v1/users/${user.id}/badges/awarded-dates?badgeIds=${id}`);
        if (json && Array.isArray(json.data)) {
          const entry = json.data.find(item => item && Number(item.badgeId) === id);
          unlocked = entry && entry.awardedDate ? dateStat('Your unlock', entry.awardedDate) : ui.stat('Your unlock', 'Not unlocked');
        }
      }
      const stats = meta.statistics;
      body.replaceChildren(el('div', { class: 'rk-stats' },
        ui.stat('Awarded', fmt.num(num(stats.awardedCount))),
        ui.stat('Awarded yesterday', fmt.num(num(stats.pastDayAwardedCount))),
        ui.stat('Rarity', percentOf(stats.winRatePercentage), { title: 'Share of players who earned it' }),
        meta.created ? dateStat('Created', meta.created) : null,
        ui.stat('Enabled', meta.enabled ? 'Yes' : 'No'),
        meta.universe ? ui.stat('Experience', ui.link(`/games/${meta.universe.placeId}`, meta.universe.name || 'Open experience'), { title: meta.universe.name }) : null,
        unlocked
      ));
    }
  });

  const wornAssets = data => {
    const seen = new Set();
    return (data && Array.isArray(data.assets) ? data.assets : []).filter(asset => {
      if (!asset || !Rk.isId(asset.id) || seen.has(Number(asset.id))) return false;
      seen.add(Number(asset.id));
      return true;
    });
  };

  const bodyColorsOf = data => {
    const colors = data && data.bodyColor3s && typeof data.bodyColor3s === 'object' ? data.bodyColor3s : {};
    const result = {};
    for (const [key] of BODY_PARTS) {
      const hex = str(colors[key], 7).replace(/^#/, '');
      if (/^[0-9a-f]{6}$/i.test(hex)) result[key] = `#${hex.toUpperCase()}`;
    }
    return result;
  };

  const scalesOf = data => {
    const scales = data && data.scales && typeof data.scales === 'object' ? data.scales : {};
    const result = {};
    for (const [key] of SCALES) {
      if (num(scales[key]) !== null) result[key] = scales[key];
    }
    return result;
  };

  const avatarType = data => (data && (data.playerAvatarType === 'R6' || data.playerAvatarType === 'R15') ? data.playerAvatarType : null);

  Rk.feature({
    id: 'avatar.bodyColors',
    category: 'avatar',
    name: 'Body colors',
    description: 'Shows the hex code of each body part color in the avatar editor.',
    pages: ['avatar'],
    css: `${listCss}
      .rk-avatar-swatches { display: grid; grid-template-columns: repeat(auto-fill, minmax(132px, 1fr)); gap: 8px; }
      .rk-avatar-swatch { display: flex; align-items: center; gap: 10px; min-width: 0; padding: 6px 8px; border: 0; border-radius: var(--rk-radius); background: var(--rk-shift); color: var(--rk-text); font-family: var(--rk-font); text-align: left; cursor: pointer; transition: background-color var(--rk-fast) ease, transform var(--rk-fast) var(--rk-ease); }
      .rk-avatar-swatch:hover { background: var(--rk-press); }
      .rk-avatar-swatch:active { transform: scale(0.97); }
      .rk-avatar-swatch:focus-visible { outline: 2px solid var(--rk-accent); outline-offset: 2px; }
      .rk-avatar-swatch-color { flex: none; width: 28px; height: 28px; border-radius: 6px; box-shadow: inset 0 0 0 1px var(--rk-border); }
      .rk-avatar-swatch-hex { font-size: 13px; font-weight: 700; color: var(--rk-text-strong); font-variant-numeric: tabular-nums; }
    `,
    async run() {
      const holder = slot(avatarArea());
      const colors = bodyColorsOf(await avatarData());
      const swatches = BODY_PARTS.filter(([key]) => colors[key]).map(([key, label]) => el('button', {
        type: 'button',
        class: 'rk-avatar-swatch',
        title: `Copy ${label.toLowerCase()} color`,
        onclick: () => ui.copy(colors[key], `${colors[key]} copied`)
      },
        el('span', { class: 'rk-avatar-swatch-color', style: { backgroundColor: colors[key] } }),
        el('span', { class: 'rk-avatar-text' }, el('span', { class: 'rk-avatar-sub' }, label), el('span', { class: 'rk-avatar-swatch-hex' }, colors[key]))
      ));
      if (!swatches.length) return;
      holder.replaceWith(ui.section('Body colors', el('div', { class: 'rk-avatar-swatches' }, swatches), { className: 'rk-avatar-colors' }));
    }
  });

  Rk.feature({
    id: 'avatar.scales',
    category: 'avatar',
    name: 'Avatar scales',
    description: 'Shows your avatar type and every body scale as a percent.',
    pages: ['avatar'],
    async run() {
      const holder = slot(avatarArea());
      const data = await avatarData();
      if (!data) return;
      const type = avatarType(data);
      const scales = scalesOf(data);
      const tiles = SCALES.filter(([key]) => key in scales).map(([key, label]) => [label, `${Math.round(scales[key] * 100)}%`]);
      if (!type && !tiles.length) return;
      holder.replaceWith(ui.section('Scales', ui.stats([type ? ['Avatar type', type] : null, ...tiles].filter(Boolean)), { className: 'rk-avatar-scales' }));
    }
  });

  Rk.feature({
    id: 'avatar.keepR6',
    category: 'avatar',
    name: 'Stay on R6',
    description: 'When equipping a dynamic head or face makes the editor switch you to R15, puts you back on R6. Picking R15 yourself still works.',
    default: false,
    pages: ['avatar'],
    async run(ctx) {
      const editor = await Rk.waitFor('#avatar-react-container');
      const controls = 'button, [role="button"], [role="tab"], [role="radio"], label';
      let type = avatarType(await Rk.api.get(AVATAR_URL).catch(() => null));
      let reverted = false;
      let checking = false;
      let again = false;
      const syncFlag = () => {
        document.documentElement.dataset.rkKeepR6 = Rk.isEnabled(ctx.id) && type === 'R6' ? 'on' : 'off';
      };
      const typeControl = label => [...editor.querySelectorAll(controls)].find(node => node.textContent.trim() === label) || null;
      const showR6 = () => {
        const control = typeControl('R6');
        if (control && control.getAttribute('aria-selected') !== 'true' && control.getAttribute('aria-checked') !== 'true') control.click();
      };
      syncFlag();
      Rk.onSettings(syncFlag);
      editor.addEventListener('pointerdown', event => {
        if (!event.isTrusted) return;
        const target = event.target instanceof Element ? event.target.closest(controls) : null;
        const text = target ? target.textContent.trim() : '';
        if (text === 'R6' || text === 'R15') {
          type = text;
          reverted = false;
          syncFlag();
        }
      }, true);
      document.addEventListener('rk:avatar-kept', () => setTimeout(showR6));
      document.addEventListener('rk:avatar-wearing', () => check());
      const check = async () => {
        if (!Rk.isEnabled(ctx.id)) return;
        if (checking) {
          again = true;
          return;
        }
        checking = true;
        const current = avatarType(await Rk.api.get(AVATAR_URL).catch(() => null));
        checking = false;
        if (current && type === 'R6' && current === 'R15') {
          if (reverted) {
            type = 'R15';
            reverted = false;
            ui.toast('Roblox needs R15 for what you equipped', { tone: 'warning' });
          } else {
            reverted = true;
            const control = typeControl('R6');
            if (control) control.click();
            else await Rk.api.post('https://avatar.roblox.com/v1/avatar/set-player-avatar-type', { playerAvatarType: 'R6' }).catch(() => null);
            const after = avatarType(await Rk.api.get(AVATAR_URL).catch(() => null));
            if (after === 'R6') {
              if (!control) ui.toast('Kept you on R6, reload the editor to see it', { tone: 'success' });
            } else {
              type = 'R15';
              reverted = false;
              syncFlag();
              ui.toast('Roblox requires R15 for that head, so it could not stay on R6', { tone: 'warning', duration: 6000 });
            }
          }
        } else if (current) {
          if (current === type) reverted = false;
          else if (!reverted) type = current;
          syncFlag();
        }
        if (again) {
          again = false;
          check();
        }
      };
      Rk.observe('#avatar-react-container .left-wrapper-placeholder', preview => {
        new MutationObserver(check).observe(preview, { childList: true, subtree: true, attributes: true, attributeFilter: ['src'] });
      });
    }
  });

  const CLASSIC_CAMERA = { distanceScale: -1, fieldOfViewDeg: 30, yRotDeg: 0 };

  const cleanPose = entry => {
    if (!isObject(entry) || (entry.thumbnailType !== 1 && entry.thumbnailType !== 2)) return null;
    const camera = isObject(entry.camera) ? entry.camera : {};
    const number = (value, fallback) => (Number.isFinite(Number(value)) ? Number(value) : fallback);
    const emote = Number(entry.emoteAssetId);
    return {
      thumbnailType: entry.thumbnailType,
      emoteAssetId: Number.isSafeInteger(emote) && emote > 0 ? emote : 0,
      camera: {
        distanceScale: number(camera.distanceScale, CLASSIC_CAMERA.distanceScale),
        fieldOfViewDeg: number(camera.fieldOfViewDeg, CLASSIC_CAMERA.fieldOfViewDeg),
        yRotDeg: number(camera.yRotDeg, CLASSIC_CAMERA.yRotDeg)
      }
    };
  };

  const isClassicPose = pose => pose.emoteAssetId === 0 && pose.camera.distanceScale === CLASSIC_CAMERA.distanceScale && pose.camera.fieldOfViewDeg === CLASSIC_CAMERA.fieldOfViewDeg && pose.camera.yRotDeg === CLASSIC_CAMERA.yRotDeg;

  Rk.feature({
    id: 'avatar.classicPose',
    category: 'avatar',
    name: 'Classic thumbnail pose',
    description: 'Adds a Classic / Custom switch under your avatar in the editor. Classic puts your avatar pictures back in the old default pose, Custom brings your own pose back.',
    default: false,
    pages: ['avatar'],
    css: `
      .rk-avatar-pose { display: flex; gap: 2px; margin-top: 10px; padding: 3px; border-radius: var(--rk-radius); background: var(--rk-shift); }
      .rk-avatar-pose button { flex: 1; height: 30px; padding: 0 12px; border: 0; border-radius: calc(var(--rk-radius) - 2px); background: transparent; color: var(--rk-muted); font-family: var(--rk-font); font-size: 13px; font-weight: 600; cursor: pointer; transition: background-color var(--rk-fast) ease, color var(--rk-fast) ease, box-shadow var(--rk-fast) ease; }
      .rk-avatar-pose button:hover { color: var(--rk-text-strong); }
      .rk-avatar-pose button[aria-pressed="true"] { background: var(--rk-bg); color: var(--rk-text-strong); box-shadow: 0 1px 3px rgba(0, 0, 0, 0.18); }
      .rk-avatar-pose[aria-busy="true"] { opacity: 0.6; pointer-events: none; }
    `,
    run() {
      const currentPoses = async () => {
        const json = await Rk.api.get('https://avatar.roblox.com/v1/avatar/thumbnail-customizations').catch(() => null);
        const list = Array.isArray(json) ? json : isObject(json) ? Object.values(json).find(Array.isArray) || [] : [];
        return list.map(cleanPose).filter(Boolean);
      };
      const savedPoses = () => {
        const saved = Rk.store.get('avatar.customPose', []);
        return Array.isArray(saved) ? saved.map(cleanPose).filter(Boolean).slice(0, 2) : [];
      };
      const apply = poses => Promise.all(poses.map(pose => Rk.api.post('https://avatar.roblox.com/v1/avatar/thumbnail-customization', pose)));
      const classic = el('button', { type: 'button', 'aria-pressed': 'false' }, 'Classic');
      const custom = el('button', { type: 'button', 'aria-pressed': 'false' }, 'Custom');
      const control = el('div', { class: 'rk-avatar-pose rk-avatar-pose-control', role: 'group', 'aria-label': 'Thumbnail pose', title: 'Pose used for your avatar pictures' }, classic, custom);
      const mark = isClassic => {
        classic.setAttribute('aria-pressed', isClassic ? 'true' : 'false');
        custom.setAttribute('aria-pressed', isClassic ? 'false' : 'true');
      };
      const busy = async action => {
        control.setAttribute('aria-busy', 'true');
        try {
          await action();
        } catch {
          ui.toast('Could not change your thumbnail pose', { tone: 'danger' });
        }
        control.removeAttribute('aria-busy');
      };
      classic.addEventListener('click', () => busy(async () => {
        const current = await currentPoses();
        const own = current.filter(pose => !isClassicPose(pose));
        if (own.length) Rk.store.set('avatar.customPose', own);
        await apply([1, 2].map(thumbnailType => ({ thumbnailType, emoteAssetId: 0, camera: { ...CLASSIC_CAMERA } })));
        mark(true);
        ui.toast('Switched to the classic pose, your pictures can take a minute to update', { tone: 'success' });
      }));
      custom.addEventListener('click', () => busy(async () => {
        const saved = savedPoses();
        if (!saved.length) {
          ui.toast('No custom pose saved yet, set one in the editor first', { tone: 'warning' });
          return;
        }
        await apply(saved);
        mark(false);
        ui.toast('Switched back to your custom pose, your pictures can take a minute to update', { tone: 'success' });
      }));
      currentPoses().then(poses => mark(poses.length > 0 && poses.every(isClassicPose)));
      Rk.observe('#avatar-react-container .left-wrapper-placeholder', preview => {
        if (!control.isConnected) preview.append(control);
      });
    }
  });

  Rk.feature({
    id: 'avatar.wearingList',
    category: 'avatar',
    name: 'Currently wearing',
    description: 'Lists everything you are wearing with links and a button to copy all IDs.',
    pages: ['avatar'],
    css: listCss,
    async run() {
      const holder = slot(avatarArea());
      const assets = wornAssets(await avatarData());
      if (!assets.length) return;
      const ids = assets.map(asset => Number(asset.id));
      const rows = assets.map(asset => {
        const name = str(asset.name) || `Item ${asset.id}`;
        return ui.row([
          ui.thumb(itemThumb('asset', asset.id), { size: 40, alt: name }),
          el('div', { class: 'rk-avatar-text' },
            ui.link(itemUrl('asset', asset.id), name, { className: 'rk-avatar-name' }),
            el('span', { class: 'rk-avatar-sub' }, typeLabel(asset.assetType))
          )
        ]);
      });
      holder.replaceWith(ui.section('Wearing', el('div', { class: 'rk-avatar-list' }, rows), {
        className: 'rk-avatar-wearing',
        actions: ui.button('Copy IDs', { variant: 'ghost', icon: 'copy', onClick: () => ui.copy(ids.join(','), `${fmt.plural(ids.length, 'ID')} copied`) })
      }));
    }
  });

  const typeKey = value => str(value, 60).replace(/\s+/g, '').toLowerCase();

  const vectorOf = (source, kind) => {
    const result = {};
    const key = isObject(source) ? Object.keys(source).find(name => name.toLowerCase() === kind) : null;
    const group = key ? source[key] : null;
    if (!isObject(group)) return result;
    for (const [name, value] of Object.entries(group)) {
      const axis = name.charAt(0).toLowerCase();
      if (AXES.includes(axis) && !(axis in result) && num(value) !== null) result[axis] = value;
    }
    return result;
  };

  const boundsEntry = (map, keys) => {
    if (!isObject(map)) return null;
    const key = Object.keys(map).find(name => keys.includes(typeKey(name)));
    return key ? map[key] : null;
  };

  const refineBounds = (rules, typeId, keys) => {
    const lower = boundsEntry(rules && rules.accessoryRefinementLowerBounds, keys);
    const upper = boundsEntry(rules && rules.accessoryRefinementUpperBounds, keys);
    const result = {};
    for (const kind of ['position', 'rotation', 'scale']) {
      const low = vectorOf(lower, kind);
      const high = vectorOf(upper, kind);
      result[kind] = {};
      for (const axis of AXES) {
        const fallback = kind === 'position' ? [-0.25, 0.25] : kind === 'scale' ? [0.8, 1.2] : axis === 'x' && (typeId === 45 || typeId === 46) ? [-15, 15] : [-30, 30];
        result[kind][axis] = low[axis] < high[axis] ? [low[axis], high[axis]] : fallback;
      }
    }
    return result;
  };

  const adjustableOf = (data, rules) => {
    const listed = rules && Array.isArray(rules.accessoryRefinementTypes) ? rules.accessoryRefinementTypes.map(Number).filter(Rk.isId) : [];
    const types = new Set(listed.length ? listed : [8, 42, 43, 44, 45, 46]);
    const names = new Map((rules && Array.isArray(rules.wearableAssetTypes) ? rules.wearableAssetTypes : [])
      .filter(type => isObject(type) && Rk.isId(type.id))
      .map(type => [Number(type.id), typeKey(type.name)]));
    return wornAssets(data).filter(asset => isObject(asset.assetType) && types.has(Number(asset.assetType.id))).map(asset => {
      const typeId = Number(asset.assetType.id);
      const bounds = refineBounds(rules, typeId, [names.get(typeId), typeKey(asset.assetType.name), typeKey(ASSET_TYPES[typeId])].filter(Boolean));
      const read = (kind, fallback) => {
        const values = vectorOf(asset.meta, kind);
        return Object.fromEntries(AXES.map(axis => {
          const [low, high] = bounds[kind][axis];
          return [axis, Math.min(high, Math.max(low, axis in values ? values[axis] : fallback))];
        }));
      };
      return {
        id: Number(asset.id),
        name: str(asset.name) || `Item ${asset.id}`,
        assetType: asset.assetType,
        bounds,
        position: read('position', 0),
        rotation: read('rotation', 0),
        scale: read('scale', 1)
      };
    });
  };

  const refinedMeta = (meta, item) => {
    const kept = isObject(meta) ? Object.entries(meta).filter(([key]) => !/^(version|position|rotation|scale)$/i.test(key)) : [];
    const vector = kind => Object.fromEntries(AXES.map(axis => {
      const [low, high] = item.bounds[kind][axis];
      return [axis.toUpperCase(), Math.min(high, Math.max(low, Math.round(item[kind][axis] * 1000) / 1000))];
    }));
    return { ...Object.fromEntries(kept), version: 1, position: vector('position'), rotation: vector('rotation'), scale: vector('scale') };
  };

  const redrawPreview = () => {
    const isRedraw = node => node.textContent.trim() === 'Redraw' && !node.closest(OURS);
    const target = [...document.querySelectorAll('.redraw-avatar a, .redraw-avatar button')].find(isRedraw) || [...document.querySelectorAll('a, button')].find(isRedraw);
    if (target) target.click();
  };

  Rk.feature({
    id: 'avatar.accessoryAdjust',
    category: 'avatar',
    name: 'Adjust accessories',
    description: 'Move, rotate and resize your hats and other accessories, like the Roblox app.',
    pages: ['avatar'],
    css: `${listCss}
      .rk-adjust-note { margin: 0 0 8px; font-size: 13px; line-height: 1.4; color: var(--rk-muted); }
      .rk-adjust-status { font-size: 13px; color: var(--rk-muted); white-space: nowrap; }
      .rk-adjust-list { display: flex; flex-direction: column; gap: 2px; }
      .rk-adjust-item { border-radius: var(--rk-radius); transition: background-color var(--rk-fast) ease; }
      .rk-adjust-open { background: var(--rk-shift); }
      .rk-adjust-head { display: flex; align-items: center; gap: 10px; width: 100%; margin: 0; padding: 6px 8px; border: 0; border-radius: var(--rk-radius); background: transparent; color: var(--rk-text); font-family: var(--rk-font); font-size: 14px; font-weight: 400; line-height: 1.45; text-align: left; cursor: pointer; transition: background-color var(--rk-fast) ease; }
      .rk-adjust-head:hover { background: var(--rk-hover); }
      .rk-adjust-head:focus-visible { outline: 2px solid var(--rk-accent); outline-offset: -2px; }
      .rk-adjust-head .rk-avatar-text { flex: 1; }
      .rk-adjust-name { font-weight: 600; color: var(--rk-text-strong); }
      .rk-adjust-head > .rk-icon { color: var(--rk-muted); transition: transform var(--rk-med) var(--rk-ease); }
      .rk-adjust-open .rk-adjust-head > .rk-icon { transform: rotate(180deg); }
      .rk-adjust-body { display: grid; grid-template-rows: 0fr; transition: grid-template-rows var(--rk-med) var(--rk-ease); }
      .rk-adjust-open .rk-adjust-body { grid-template-rows: 1fr; }
      .rk-adjust-inner { min-height: 0; overflow: hidden; }
      .rk-adjust-fields { display: grid; grid-template-columns: auto minmax(0, 1fr) 44px; align-items: center; gap: 2px 10px; padding: 2px 10px 10px; }
      .rk-adjust-label { font-size: 12px; color: var(--rk-muted); white-space: nowrap; }
      .rk-adjust-value { font-size: 12px; font-weight: 600; color: var(--rk-text-strong); text-align: right; font-variant-numeric: tabular-nums; }
      .rk-adjust-gap { grid-column: 1 / -1; height: 6px; }
      .rk-adjust-actions { grid-column: 1 / -1; display: flex; justify-content: flex-end; padding-top: 4px; }
      .rk-adjust-range { -webkit-appearance: none; appearance: none; display: block; width: 100%; height: 22px; margin: 0; padding: 0; background: transparent; cursor: pointer; }
      .rk-adjust-range:focus { outline: none; }
      .rk-adjust-range::-webkit-slider-runnable-track { height: 4px; border-radius: 999px; background: var(--rk-shift); }
      .rk-adjust-range::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 14px; height: 14px; margin-top: -5px; border: 0; border-radius: 50%; background: var(--rk-accent); transition: box-shadow var(--rk-fast) ease, transform var(--rk-fast) var(--rk-ease); }
      .rk-adjust-range:hover::-webkit-slider-thumb, .rk-adjust-range:focus-visible::-webkit-slider-thumb { box-shadow: 0 0 0 5px var(--rk-accent-soft); }
      .rk-adjust-range:active::-webkit-slider-thumb { transform: scale(1.15); }
      @media (prefers-reduced-motion: reduce) {
        .rk-adjust-body, .rk-adjust-head > .rk-icon, .rk-adjust-range::-webkit-slider-thumb { transition: none !important; }
      }
    `,
    async run() {
      const holder = slot(avatarArea());
      const user = await Rk.me();
      if (!user) return;
      const status = el('span', { class: 'rk-adjust-status', 'aria-live': 'polite' });
      const list = el('div', { class: 'rk-adjust-list' }, ui.spinner());
      const refresh = ui.button('', { variant: 'ghost', icon: 'refresh', title: 'Reload worn accessories' });
      holder.replaceWith(ui.section('Adjust accessories', [
        el('p', { class: 'rk-adjust-note' }, 'Changes save to your avatar and show in the preview after a moment.'),
        list
      ], { className: 'rk-avatar-adjust', actions: [status, refresh] }));

      const pending = new Map();
      const signatureOf = found => JSON.stringify(found.map(item => [item.id, item.position, item.rotation, item.scale]));
      let items = [];
      let signature = '';
      let openId = null;
      let timer = 0;
      let saving = false;
      let again = false;
      let reloadAfter = false;

      const setOpen = id => {
        openId = id;
        for (const node of list.querySelectorAll('.rk-adjust-item')) {
          const open = node.dataset.id === String(id);
          node.classList.toggle('rk-adjust-open', open);
          node.querySelector('.rk-adjust-head').setAttribute('aria-expanded', open ? 'true' : 'false');
          node.querySelector('.rk-adjust-body').toggleAttribute('inert', !open);
        }
      };

      const queue = item => {
        pending.set(item.id, item);
        clearTimeout(timer);
        timer = setTimeout(save, 400);
      };

      const row = item => {
        const fields = [];
        const syncs = [];
        const slider = (label, range, step, read, write, format) => {
          const value = el('span', { class: 'rk-adjust-value' });
          const input = el('input', { type: 'range', class: 'rk-adjust-range', min: range[0], max: range[1], step, 'aria-label': `${label}, ${item.name}` });
          const sync = () => {
            input.value = String(read());
            value.textContent = format(read());
          };
          input.addEventListener('input', () => {
            value.textContent = format(Number(input.value));
          });
          input.addEventListener('change', () => {
            write(Number(input.value));
            sync();
            queue(item);
          });
          sync();
          syncs.push(sync);
          fields.push(el('span', { class: 'rk-adjust-label' }, label), input, value);
        };
        const groups = [
          ['position', 'Position', 0.01, value => (Math.round(value * 100) / 100 || 0).toFixed(2)],
          ['rotation', 'Rotation', 1, value => `${Math.round(value) || 0}°`]
        ];
        for (const [kind, label, step, format] of groups) {
          for (const axis of AXES) slider(`${label} ${axis.toUpperCase()}`, item.bounds[kind][axis], step, () => item[kind][axis], next => { item[kind][axis] = next; }, format);
          fields.push(el('span', { class: 'rk-adjust-gap' }));
        }
        const low = Math.max(...AXES.map(axis => item.bounds.scale[axis][0]));
        const high = Math.min(...AXES.map(axis => item.bounds.scale[axis][1]));
        slider('Size', low < high ? [low, high] : item.bounds.scale.x, 0.01, () => (item.scale.x + item.scale.y + item.scale.z) / 3, next => {
          for (const axis of AXES) item.scale[axis] = next;
        }, value => `${Math.round(value * 100)}%`);
        const reset = ui.button('Reset', {
          onClick: () => {
            for (const axis of AXES) {
              item.position[axis] = 0;
              item.rotation[axis] = 0;
              item.scale[axis] = 1;
            }
            for (const sync of syncs) sync();
            queue(item);
          }
        });
        const node = el('div', { class: 'rk-adjust-item' },
          el('button', { type: 'button', class: 'rk-adjust-head', 'aria-expanded': 'false', onclick: () => setOpen(openId === item.id ? null : item.id) },
            ui.thumb(itemThumb('asset', item.id), { size: 48, alt: item.name }),
            el('span', { class: 'rk-avatar-text' }, el('span', { class: 'rk-avatar-name rk-adjust-name' }, item.name), el('span', { class: 'rk-avatar-sub' }, typeLabel(item.assetType))),
            icon('chevronDown', 16)
          ),
          el('div', { class: 'rk-adjust-body', inert: true }, el('div', { class: 'rk-adjust-inner' }, el('div', { class: 'rk-adjust-fields' }, fields, el('div', { class: 'rk-adjust-actions' }, reset))))
        );
        node.dataset.id = String(item.id);
        return node;
      };

      const render = (data, rules) => {
        const found = adjustableOf(data, rules);
        const next = signatureOf(found);
        if (next === signature) return;
        signature = next;
        items = found;
        list.replaceChildren(...(found.length ? found.map(row) : [ui.empty('You are not wearing any accessories that can be adjusted')]));
        setOpen(found.some(item => item.id === openId) ? openId : null);
      };

      const load = async force => {
        if (saving || timer) {
          reloadAfter = true;
          return;
        }
        const [data, rules] = await Promise.all([Rk.api.get(AVATAR_URL).catch(() => null), avatarRules()]);
        if (saving || timer) {
          reloadAfter = true;
          return;
        }
        if (!isObject(data) || !Array.isArray(data.assets)) {
          if (!signature) list.replaceChildren(ui.empty('Could not load your accessories'));
          else if (force) ui.toast('Could not load your accessories', { tone: 'danger' });
          return;
        }
        if (force) signature = '';
        render(data, rules);
      };

      const save = async () => {
        timer = 0;
        if (saving) {
          again = true;
          return;
        }
        if (!pending.size) return;
        saving = true;
        status.textContent = 'Saving';
        let outcome = 'saved';
        let latest = null;
        try {
          do {
            again = false;
            const changes = new Map(pending);
            pending.clear();
            latest = await Rk.api.get(AVATAR_URL);
            const worn = isObject(latest) && Array.isArray(latest.assets) ? latest.assets : null;
            if (!worn || worn.some(asset => !isObject(asset) || !Rk.isId(asset.id))) throw new Error('unexpected avatar data');
            if ([...changes.keys()].some(id => !worn.some(asset => Number(asset.id) === id))) {
              outcome = 'gone';
              break;
            }
            const assets = worn.map(asset => {
              const id = Number(asset.id);
              if (changes.has(id)) return { id, meta: refinedMeta(asset.meta, changes.get(id)) };
              return isObject(asset.meta) ? { id, meta: asset.meta } : { id };
            });
            const result = await Rk.api.post('https://avatar.roblox.com/v2/avatar/set-wearing-assets', { assets });
            if (isObject(result) && result.success === false) throw new Error('save rejected');
          } while (again && pending.size);
        } catch {
          outcome = 'failed';
        }
        saving = false;
        if (outcome === 'gone') {
          again = false;
          pending.clear();
          status.textContent = '';
          ui.toast('That accessory is no longer worn', { tone: 'warning' });
          signature = '';
          render(latest, await avatarRules());
        } else if (outcome === 'failed') {
          status.textContent = 'Could not save';
          ui.toast('Could not save your accessory changes', { tone: 'danger' });
        } else {
          status.textContent = 'Saved';
          signature = signatureOf(items);
          redrawPreview();
        }
        if (reloadAfter && !timer && !saving) {
          reloadAfter = false;
          load(false);
        }
      };

      refresh.addEventListener('click', async () => {
        refresh.disabled = true;
        await load(true);
        refresh.disabled = false;
      });
      const onFocus = () => load(false);
      window.addEventListener('focus', onFocus);
      const stop = Rk.onNavigate(next => {
        if (next.type === 'avatar') return;
        window.removeEventListener('focus', onFocus);
        stop();
      });
      await load(false);
    }
  });

  Rk.feature({
    id: 'avatar.outfitCost',
    category: 'avatar',
    name: 'Outfit cost',
    description: 'Shows what your current outfit costs and how many worn items are off sale.',
    pages: ['avatar'],
    run() {
      Rk.observe('.rk-avatar-wearing .rk-section-actions', async actions => {
        if (actions.querySelector('.rk-avatar-cost')) return;
        const cost = el('span', { class: 'rk-inline rk-avatar-cost' }, ui.spinner(14));
        actions.prepend(cost);
        const assets = wornAssets(await avatarData());
        const details = await catalogDetails(assets.map(asset => ({ itemType: 'Asset', id: Number(asset.id) })));
        let total = 0;
        let offSale = 0;
        for (const asset of assets) {
          const price = catalogPrice(details.get(`Asset:${asset.id}`));
          if (price === null) offSale++;
          else total += price;
        }
        cost.replaceChildren(ui.robux(total), offSale ? el('span', { class: 'rk-muted' }, `${fmt.num(offSale)} off sale`) : null);
        ui.tip(cost, 'Total price of the worn items that are for sale');
      });
    }
  });

  Rk.feature({
    id: 'avatar.exportAvatar',
    category: 'avatar',
    name: 'Export avatar',
    description: 'Adds a button that copies your avatar type, scales, body colors and item IDs as JSON.',
    default: false,
    pages: ['avatar'],
    run() {
      const button = ui.button('Export', {
        icon: 'download',
        title: 'Copy avatar as JSON',
        onClick: async () => {
          button.disabled = true;
          const data = await avatarData();
          button.disabled = false;
          if (!data) {
            ui.toast('Could not load your avatar', { tone: 'danger' });
            return;
          }
          const json = {
            avatarType: avatarType(data),
            scales: scalesOf(data),
            bodyColors: bodyColorsOf(data),
            assetIds: wornAssets(data).map(asset => Number(asset.id))
          };
          ui.copy(JSON.stringify(json, null, 2), 'Avatar copied as JSON');
        }
      });
      avatarToolbar().append(button);
    }
  });

  Rk.feature({
    id: 'avatar.emotes',
    category: 'avatar',
    name: 'Equipped emotes',
    description: 'Lists your equipped emotes by slot with links to each one.',
    default: false,
    pages: ['avatar'],
    css: listCss,
    async run() {
      const holder = slot(avatarArea());
      const data = await avatarData();
      const emotes = (data && Array.isArray(data.emotes) ? data.emotes : [])
        .filter(emote => emote && Rk.isId(emote.assetId) && Rk.isId(emote.position))
        .sort((a, b) => a.position - b.position);
      if (!emotes.length) return;
      const rows = emotes.map(emote => {
        const name = str(emote.assetName) || `Emote ${emote.assetId}`;
        return ui.row([
          ui.pill(`Slot ${emote.position}`, 'neutral'),
          ui.thumb(itemThumb('asset', emote.assetId), { size: 40, alt: name }),
          ui.link(itemUrl('asset', emote.assetId), name, { className: 'rk-avatar-name' })
        ]);
      });
      holder.replaceWith(ui.section('Emotes', el('div', { class: 'rk-avatar-list' }, rows), { className: 'rk-avatar-emotes' }));
    }
  });

  Rk.feature({
    id: 'avatar.biggerCards',
    category: 'avatar',
    name: 'Bigger editor cards',
    description: 'Makes item cards in the avatar editor larger and easier to see.',
    default: false,
    css: `
      #avatar-web-app .item-cards-stackable:not(#avatar-web-app .item-cards-stackable *) { zoom: 1.2; }
    `
  });

  Rk.feature({
    id: 'avatar.editorSearch',
    category: 'avatar',
    name: 'Search your items',
    description: 'Adds a search box that filters the item cards in the avatar editor as you type.',
    pages: ['avatar'],
    css: `
      .rk-avatar-toolbar:empty { display: none !important; }
      .rk-avatar-toolbar .rk-avatar-search { margin: 0 !important; }
    `,
    run() {
      let query = '';
      const count = el('span', { class: 'rk-muted', 'aria-live': 'polite' });
      const outerCard = node => node.closest('.list-item.item-card') || node;
      const nameOf = card => {
        const label = card.querySelector('.item-card-name');
        if (label && label.textContent.trim()) return label.textContent;
        const link = card.querySelector('a.item-card-link, a');
        if (link && (link.getAttribute('title') || link.textContent.trim())) return link.getAttribute('title') || link.textContent;
        const img = card.querySelector('img[alt]');
        return img ? img.getAttribute('alt') : '';
      };
      const apply = card => {
        const match = !query || nameOf(card).toLowerCase().includes(query);
        card.classList.toggle('rk-hidden', !match);
        return match;
      };
      const cards = () => [...new Set([...document.querySelectorAll(EDITOR_CARDS)].map(outerCard))].filter(card => !card.closest('.rk-avatar-panels'));
      const filter = value => {
        query = value.trim().toLowerCase();
        const all = cards();
        const shown = all.filter(apply).length;
        count.textContent = query ? `${fmt.num(shown)} of ${fmt.num(all.length)}` : '';
      };
      const field = ui.input({ type: 'search', placeholder: 'Search your items', maxLength: 80, onInput: filter });
      field.setAttribute('aria-label', 'Search your items');
      field.style.width = '240px';
      field.style.height = '32px';
      field.addEventListener('keydown', event => {
        if (event.key !== 'Escape' || !field.value) return;
        event.stopPropagation();
        field.value = '';
        filter('');
      });
      const bar = el('div', { class: 'rk-inline rk-avatar-search', style: { display: 'flex', margin: '0 0 12px' } }, field, count);
      Rk.observe('.item-cards-stackable', grid => {
        if (grid.closest('.rk-avatar-panels') || (grid.parentElement && grid.parentElement.closest('.item-cards-stackable'))) return;
        if (bar.nextElementSibling !== grid) grid.before(bar);
      });
      Rk.domReady.then(() => {
        if (!bar.isConnected) avatarToolbar().prepend(bar);
      });
      Rk.observe(EDITOR_CARDS, node => {
        if (query && !node.closest('.rk-avatar-panels')) apply(outerCard(node));
      });
    }
  });

  Rk.feature({
    id: 'avatar.renderDownload',
    category: 'avatar',
    name: 'Download avatar images',
    description: 'Adds buttons that save your full body render and headshot.',
    default: false,
    pages: ['avatar'],
    async run() {
      const user = await Rk.me();
      if (!user) return;
      const name = user.name || String(user.id);
      const body = ui.button('Full body', { icon: 'download', title: 'Download full body image', onClick: () => saveImage(body, 'Avatar', user.id, '720x720', `${name}-avatar.png`) });
      const head = ui.button('Headshot', { icon: 'download', title: 'Download headshot image', onClick: () => saveImage(head, 'AvatarHeadShot', user.id, '420x420', `${name}-headshot.png`) });
      avatarToolbar().append(body, head);
    }
  });

  const pinnedOutfitIds = () => {
    const saved = Rk.store.get('avatar.pinnedOutfits', []);
    return Array.isArray(saved) ? saved.filter(id => Rk.isId(id)).slice(0, 50) : [];
  };

  const togglePinnedOutfit = id => {
    const pins = pinnedOutfitIds();
    Rk.store.set('avatar.pinnedOutfits', pins.includes(id) ? pins.filter(pin => pin !== id) : [...pins, id].slice(0, 50));
  };

  const pinnedFirst = outfits => {
    const pins = pinnedOutfitIds();
    return [
      ...pins.map(id => outfits.find(outfit => outfit.id === id)).filter(Boolean),
      ...outfits.filter(outfit => !pins.includes(outfit.id))
    ];
  };

  const userOutfits = async () => {
    const user = await Rk.me();
    if (!user) return [];
    const json = await fetchJson(`https://avatar.roblox.com/v1/users/${user.id}/outfits?page=1&itemsPerPage=50&isEditable=true`);
    return (json && Array.isArray(json.data) ? json.data : []).filter(outfit => outfit && Rk.isId(outfit.id)).slice(0, 50);
  };

  const wearOutfit = async outfit => {
    const details = await Rk.api.get(`https://avatar.roblox.com/v1/outfits/${outfit.id}/details`);
    const assets = isObject(details) && Array.isArray(details.assets) ? details.assets.filter(asset => isObject(asset) && Rk.isId(asset.id)) : null;
    if (!assets) throw new Error('unexpected outfit data');
    const result = await Rk.api.post('https://avatar.roblox.com/v2/avatar/set-wearing-assets', { assets: assets.map(asset => (isObject(asset.meta) ? { id: Number(asset.id), meta: asset.meta } : { id: Number(asset.id) })) });
    if (isObject(result) && result.success === false) throw new Error('wear rejected');
    await Promise.allSettled([
      isObject(details.bodyColors) ? Rk.api.post('https://avatar.roblox.com/v1/avatar/set-body-colors', details.bodyColors) : null,
      typeof details.playerAvatarType === 'string' ? Rk.api.post('https://avatar.roblox.com/v1/avatar/set-player-avatar-type', { playerAvatarType: details.playerAvatarType }) : null,
      isObject(details.scale) ? Rk.api.post('https://avatar.roblox.com/v1/avatar/set-scales', details.scale) : null
    ]);
  };

  const pinCss = `
    .rk-avatar-pin { flex: none; display: flex; align-items: center; justify-content: center; width: 30px; height: 30px; padding: 0; border: 0; border-radius: var(--rk-radius); background: transparent; color: var(--rk-muted); opacity: 0.45; cursor: pointer; transition: opacity var(--rk-fast) ease, background-color var(--rk-fast) ease, color var(--rk-fast) ease; }
    .rk-avatar-pin:hover { opacity: 1; background: var(--rk-hover); }
    .rk-avatar-pin[aria-pressed="true"] { color: var(--rk-accent); opacity: 1; }
    .rk-avatar-pin-flash { animation: rk-avatar-pin-flash 700ms var(--rk-ease); }
    @keyframes rk-avatar-pin-flash { from { box-shadow: 0 0 0 2px var(--rk-accent); } to { box-shadow: 0 0 0 2px transparent; } }
  `;

  const pinButton = (outfit, name, onChange) => {
    const pinned = pinnedOutfitIds().includes(outfit.id);
    const pin = el('button', { type: 'button', class: 'rk-avatar-pin', 'aria-pressed': pinned ? 'true' : 'false', 'aria-label': pinned ? `Unpin ${name}` : `Pin ${name}`, title: pinned ? 'Unpin' : 'Pin to top' }, icon('pin', 16));
    pin.addEventListener('click', event => {
      event.stopPropagation();
      togglePinnedOutfit(outfit.id);
      onChange(outfit.id);
    });
    return pin;
  };

  Rk.feature({
    id: 'avatar.outfits',
    category: 'avatar',
    name: 'Saved outfits',
    description: 'Replaces the Creations list in the Avatars tab with bigger outfit previews you can pin to the top. Click one to wear it.',
    default: false,
    pages: ['avatar'],
    css: `${tileCss}${pinCss}
      #costumes.rk-outfits-on #avatar-items-container { display: none !important; }
      #costumes:not(.rk-outfits-on) > .rk-avatar-outfits-grid { display: none; }
      .rk-avatar-outfits-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 10px; margin: 8px 0; }
      .rk-avatar-outfit { position: relative; cursor: pointer; }
      .rk-avatar-outfit:hover { background: var(--rk-hover); }
      .rk-avatar-outfit:focus-visible { outline: 2px solid var(--rk-accent); outline-offset: 2px; }
      .rk-avatar-outfit .rk-avatar-pin { position: absolute; top: 8px; right: 8px; background: var(--rk-bg); }
      .rk-avatar-outfit-pinned { background: var(--rk-accent-soft); }
      .rk-avatar-outfit.rk-busy { opacity: 0.5; pointer-events: none; }
    `,
    run(ctx) {
      let outfits = [];
      let pane = null;
      let grid = null;
      let nativeCount = -1;
      let reloadTimer = 0;
      let order = [];
      const nativeItems = () => [...pane.querySelectorAll('#avatar-items-container li')];
      const nativeMatch = (outfit, index) => {
        const name = str(outfit.name, 100);
        const items = nativeItems();
        const byName = items.filter(item => item.textContent.includes(name));
        return byName.length === 1 ? byName[0] : items[index] || null;
      };
      const choose = async (outfit, card) => {
        const name = str(outfit.name, 100) || 'outfit';
        const native = nativeMatch(outfit, outfits.indexOf(outfit));
        const target = native && (native.querySelector('.item-card-thumb-container, .item-card-link, a, button') || native);
        if (target) {
          target.click();
          return;
        }
        card.classList.add('rk-busy');
        try {
          await wearOutfit(outfit);
          ui.toast(`Wearing ${name}, reload the editor to see it`, { tone: 'success' });
        } catch {
          ui.toast('Could not wear that outfit', { tone: 'danger' });
        }
        card.classList.remove('rk-busy');
      };
      const render = toggled => {
        if (!grid) return;
        const kept = order.map(id => outfits.find(outfit => outfit.id === id)).filter(Boolean);
        const list = toggled && kept.length === outfits.length ? kept : pinnedFirst(outfits);
        order = list.map(outfit => outfit.id);
        grid.replaceChildren(...list.map(outfit => {
          const name = str(outfit.name, 100) || 'Outfit';
          const pinned = pinnedOutfitIds().includes(outfit.id);
          const card = el('div', { class: `rk-avatar-tile rk-avatar-outfit${pinned ? ' rk-avatar-outfit-pinned' : ''}${outfit.id === toggled ? ' rk-avatar-pin-flash' : ''}`, role: 'button', tabindex: '0', title: name },
            ui.thumb(Rk.thumb('Outfit', outfit.id, '150x150'), { size: 120, alt: name }),
            el('span', { class: 'rk-avatar-tile-name' }, name),
            pinButton(outfit, name, render)
          );
          card.addEventListener('click', () => choose(outfit, card));
          card.addEventListener('keydown', event => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              choose(outfit, card);
            }
          });
          return card;
        }));
      };
      const sync = () => {
        if (!pane) return;
        const label = pane.firstElementChild && pane.firstElementChild !== grid ? pane.firstElementChild.textContent : '';
        pane.classList.toggle('rk-outfits-on', Rk.isEnabled(ctx.id) && outfits.length > 0 && /creations/i.test(label));
        if (grid && !grid.isConnected) {
          if (pane.firstElementChild) pane.firstElementChild.after(grid);
          else pane.append(grid);
        }
        const count = nativeItems().length;
        if (count === nativeCount) return;
        const first = nativeCount === -1;
        nativeCount = count;
        if (first) return;
        clearTimeout(reloadTimer);
        reloadTimer = setTimeout(async () => {
          outfits = await userOutfits();
          render();
          sync();
        }, 600);
      };
      Rk.observe('#costumes', async node => {
        pane = node;
        grid = el('div', { class: 'rk-avatar-outfits-grid' });
        outfits = await userOutfits();
        render();
        sync();
        new MutationObserver(records => {
          if (records.every(record => grid.contains(record.target))) return;
          sync();
        }).observe(pane, { childList: true, subtree: true, characterData: true });
      });
      Rk.onSettings(sync);
    }
  });

  Rk.feature({
    id: 'avatar.quickOutfits',
    category: 'avatar',
    name: 'Quick outfit switcher',
    description: 'Adds a button to the top bar that lets you wear one of your saved outfits from any page.',
    default: false,
    css: `${pinCss}
      .rk-avatar-quick { min-width: 240px; max-width: 280px; max-height: 360px; overflow-y: auto; overscroll-behavior: contain; }
      .rk-avatar-quick .rk-menu-item { gap: 10px; }
      .rk-avatar-quick .rk-menu-item > span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .rk-avatar-quick .rk-menu-item[disabled] { opacity: 0.5; pointer-events: none; }
      .rk-avatar-quick-empty { padding: 12px; font-size: 13px; color: var(--rk-muted); }
      .rk-avatar-quick-row { display: flex; align-items: center; }
      .rk-avatar-quick-row > .rk-menu-item { flex: 1; min-width: 0; }
      .rk-avatar-quick-row .rk-avatar-pin { margin-right: 4px; }
      .rk-avatar-quick-row:hover .rk-avatar-pin { opacity: 1; }
      .rk-avatar-quick-pinned { background: var(--rk-accent-soft); }
    `,
    run(ctx) {
      let outfits = null;
      let close = null;
      let busy = false;
      const loadOutfits = async () => {
        if (!outfits) outfits = await userOutfits();
        return outfits;
      };
      const wear = async (outfit, item) => {
        if (busy) return;
        busy = true;
        item.disabled = true;
        try {
          await wearOutfit(outfit);
          ui.toast(`Wearing ${str(outfit.name, 100) || 'outfit'}`, { tone: 'success' });
          if (close) close();
        } catch {
          ui.toast('Could not wear that outfit', { tone: 'danger' });
        }
        busy = false;
        item.disabled = false;
      };
      const open = async anchor => {
        if (close) {
          close();
          return;
        }
        const list = el('div', { class: 'rk-menu rk-avatar-quick', role: 'menu' }, el('div', { class: 'rk-avatar-quick-empty' }, ui.spinner(16)));
        const onDown = event => {
          if (!list.contains(event.target) && !anchor.contains(event.target)) close();
        };
        const onKey = event => {
          if (event.key === 'Escape') close();
        };
        close = () => {
          document.removeEventListener('mousedown', onDown, true);
          document.removeEventListener('keydown', onKey, true);
          list.classList.remove('rk-menu-open');
          setTimeout(() => list.remove(), 180);
          close = null;
        };
        document.addEventListener('mousedown', onDown, true);
        document.addEventListener('keydown', onKey, true);
        const place = () => {
          const rect = anchor.getBoundingClientRect();
          list.style.top = `${Math.round(rect.bottom + window.scrollY + 6)}px`;
          list.style.left = `${Math.max(8, Math.round(rect.right + window.scrollX - list.offsetWidth))}px`;
        };
        document.body.append(list);
        place();
        requestAnimationFrame(() => list.classList.add('rk-menu-open'));
        const saved = await loadOutfits();
        if (!list.isConnected) return;
        const order = pinnedFirst(saved);
        const render = toggled => {
          const pins = pinnedOutfitIds();
          list.replaceChildren(...order.map(outfit => {
            const isPinned = pins.includes(outfit.id);
            const name = str(outfit.name, 100) || 'Outfit';
            const item = el('button', { type: 'button', class: 'rk-menu-item', role: 'menuitem' }, ui.thumb(Rk.thumb('Outfit', outfit.id, '150x150'), { size: 36 }), el('span', null, name));
            item.addEventListener('click', () => wear(outfit, item));
            return el('div', { class: `rk-avatar-quick-row${isPinned ? ' rk-avatar-quick-pinned' : ''}${outfit.id === toggled ? ' rk-avatar-pin-flash' : ''}` }, item, pinButton(outfit, name, render));
          }));
        };
        if (!saved.length) list.replaceChildren(el('div', { class: 'rk-avatar-quick-empty' }, 'No saved outfits yet'));
        else render();
        place();
      };
      const button = ui.tip(el('a', { class: 'rk-nav-button', href: '/my/avatar', role: 'button', 'data-rk-tip-pos': 'below' }, icon('user', 22)), 'Outfits');
      button.addEventListener('click', event => {
        event.preventDefault();
        open(button);
      });
      const item = el('li', { class: 'navbar-icon-item rk-nav-item rk-avatar-quick-nav' }, button);
      Rk.onSettings(() => item.classList.toggle('rk-hidden', !Rk.isEnabled(ctx.id)));
      Rk.observe('ul.navbar-right', navbar => {
        if (navbar.contains(item)) return;
        const robux = [...navbar.children].find(node => node.id === 'navbar-robux' || node.querySelector('#navbar-robux'));
        if (robux) robux.before(item);
        else navbar.append(item);
      });
    }
  });
})();
