(() => {
  const { el, ui, fmt, icon } = Rk;
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const CARD = '.item-card-container, .item-card, .list-item';
  const DAY = 86400000;
  const demandTones = { Amazing: 'success', High: 'success', Normal: 'neutral', Low: 'danger', Terrible: 'danger' };

  const num = value => {
    if (value === null || value === undefined || value === '' || typeof value === 'boolean') return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  };

  const today = () => new Date().toISOString().slice(0, 10);
  const isDay = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
  const sum = (list, pick) => list.reduce((total, item) => total + pick(item), 0);
  const money = value => (num(value) === null ? '-' : ui.robux(num(value)));
  const signed = value => `${value > 0 ? '+' : ''}${fmt.num(value)}`;
  const toneOf = value => (value > 0 ? 'success' : value < 0 ? 'danger' : 'neutral');
  const percentText = value => `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;

  let valuesPromise = null;
  const valuesMap = () => {
    if (!valuesPromise) {
      valuesPromise = Rk.values().then(map => (map instanceof Map ? map : new Map()), () => {
        valuesPromise = null;
        return new Map();
      });
    }
    return valuesPromise;
  };

  const worth = (assetId, rap, values) => {
    const entry = values.get(assetId);
    return entry && entry.value > 0 ? entry.value : rap;
  };

  const collectibleCache = new Map();
  const collectibles = userId => {
    if (!Rk.isId(userId)) return Promise.resolve([]);
    const id = Number(userId);
    if (!collectibleCache.has(id)) {
      const url = `https://inventory.roblox.com/v1/users/${id}/assets/collectibles?sortOrder=Asc`;
      collectibleCache.set(id, Rk.api.paged(url, { max: 2000, limit: 100 }).then(list => list.filter(item => item && Rk.isId(item.assetId)).map(item => ({
        assetId: Number(item.assetId),
        userAssetId: Rk.isId(item.userAssetId) ? Number(item.userAssetId) : null,
        serial: Rk.isId(item.serialNumber) ? Number(item.serialNumber) : null,
        name: typeof item.name === 'string' && item.name ? item.name : 'Unknown item',
        rap: Math.max(0, num(item.recentAveragePrice) || 0),
        stock: num(item.assetStock)
      })), () => []));
    }
    return collectibleCache.get(id);
  };

  const totals = (items, values) => ({
    value: sum(items, item => worth(item.assetId, item.rap, values)),
    rap: sum(items, item => item.rap)
  });

  let limitedPromise = null;
  const limitedId = () => {
    if (!limitedPromise) {
      limitedPromise = (async () => {
        const { type, kind, id } = Rk.page();
        if (type !== 'item' || kind !== 'asset' || !Rk.isId(id)) return null;
        if ((await valuesMap()).has(id)) return id;
        const details = await Rk.api.get(`https://economy.roblox.com/v2/assets/${id}/details`, { cache: 60000 }).catch(() => null);
        return details && (details.IsLimited === true || details.IsLimitedUnique === true) ? id : null;
      })();
    }
    return limitedPromise;
  };

  const resale = id => Rk.api.get(`https://economy.roblox.com/v1/assets/${id}/resale-data`, { cache: 60000 }).then(json => (json && typeof json === 'object' ? json : null), () => null);

  const hosts = new Map();
  const slot = async order => {
    await Rk.domReady;
    const type = Rk.page().type;
    let host = hosts.get(type);
    if (!host) {
      host = el('div', { class: 'rk-trading-host' });
      hosts.set(type, host);
      if (type === 'item') {
        const node = host;
        Rk.observe('#item-details-container, #item-container, #content', () => {
          const anchor = document.querySelector('#item-details-container');
          if (anchor) {
            if (node.previousElementSibling !== anchor) anchor.after(node);
            return;
          }
          const parent = node.isConnected ? null : document.querySelector('#item-container') || document.querySelector('#content');
          if (parent) parent.append(node);
        });
      } else if (type === 'profile') {
        Rk.mount('.profile-platform-container', host);
      } else {
        Rk.mount('#content', host, { position: 'prepend' });
      }
    }
    const node = el('div', { class: 'rk-trading-slot', dataset: { order: String(order) } });
    host.insertBefore(node, [...host.children].find(child => Number(child.dataset.order) > order) || null);
    return node;
  };

  const serialPill = serial => {
    const node = ui.pill(`#${fmt.num(serial)}`, 'neutral', { title: 'Serial number' });
    if (serial === 1) node.classList.add('rk-serial-1');
    else if (serial <= 100) node.classList.add('rk-serial-low');
    return node;
  };

  const flagPills = entry => [
    entry.projected ? ui.pill('Projected', 'warning', { title: 'RAP is inflated above the usual price' }) : null,
    entry.hyped ? ui.pill('Hyped', 'accent') : null,
    entry.rare ? ui.pill('Rare', 'success') : null
  ].filter(Boolean);

  const csvCell = value => {
    let text = value == null ? '' : String(value);
    if (typeof value === 'string' && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };

  const downloadCsv = (filename, header, rows) => {
    const text = [header, ...rows].map(cells => cells.map(csvCell).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
    const anchor = el('a', { download: filename });
    anchor.href = url;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const svg = (tag, attrs) => {
    const node = document.createElementNS(SVG_NS, tag);
    for (const [key, value] of Object.entries(attrs || {})) node.setAttribute(key, String(value));
    return node;
  };

  const cardLine = card => {
    let line = card.querySelector('.rk-trading-card');
    if (!line) {
      line = el('div', { class: 'rk-trading-card' });
      card.append(line);
    }
    return line;
  };

  const place = (line, node, order) => {
    node.dataset.order = String(order);
    line.insertBefore(node, [...line.children].find(child => Number(child.dataset.order) > order) || null);
  };

  const eachCard = callback => valuesMap().then(values => {
    if (!values.size) return;
    Rk.observe('a[href*="/catalog/"]', link => {
      const card = link.closest(CARD);
      if (!card || card.closest('.rk-trading-host')) return;
      const id = Rk.idFrom(link.getAttribute('href'), 'asset');
      const entry = id ? values.get(id) : null;
      if (entry) callback(cardLine(card), entry);
    });
  });

  const cardCss = `
    .rk-trading-card { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; margin-top: 4px; font-family: var(--rk-font); font-size: 12px; line-height: 1.3; color: var(--rk-muted); animation: rk-fade var(--rk-fast) ease both; }
    .rk-trading-card:empty { display: none; }
    .rk-trading-card .rk-pill { height: 18px; font-size: 11px; }
    .rk-trading-card .rk-robux { font-size: 12px; }
    .rk-trading-card-value, .rk-trading-card-part, .rk-trading-card-flags { display: inline-flex; align-items: center; gap: 4px; min-width: 0; }
    .rk-trading-card-value { gap: 8px; }
  `;

  const pillsCss = `
    .rk-trading-pills { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-top: 10px; }
    .rk-trading-pills:empty { display: none; }
    .rk-trading-pills .rk-link { margin-left: auto; font-size: 13px; }
    .rk-trading-flags { margin: 0 0 18px; }
  `;

  const panelCss = `
    .rk-trading-panel { margin: 0 0 18px; animation: rk-rise var(--rk-med) var(--rk-ease) both; }
  `;

  Rk.feature({
    id: 'trading.cardValues',
    category: 'trading',
    name: 'Values on item cards',
    description: 'Shows the value or RAP under limited item cards.',
    options: [
      { key: 'show', label: 'Show', type: 'select', choices: [['value', 'Value'], ['rap', 'RAP'], ['both', 'Value and RAP']], default: 'value' }
    ],
    css: cardCss,
    run(ctx) {
      return eachCard((line, entry) => {
        if (line.querySelector('.rk-trading-card-value')) return;
        const show = ctx.option('show');
        const compact = show === 'both';
        place(line, el('span', { class: 'rk-trading-card-value' },
          show !== 'rap' ? el('span', { class: 'rk-trading-card-part' }, 'Value', ui.robux(entry.value, { compact })) : null,
          show !== 'value' ? el('span', { class: 'rk-trading-card-part' }, 'RAP', ui.robux(entry.rap, { compact })) : null
        ), 1);
      });
    }
  });

  Rk.feature({
    id: 'trading.cardDemand',
    category: 'trading',
    name: 'Demand on item cards',
    description: 'Adds a demand pill next to the value on limited item cards.',
    default: false,
    css: cardCss,
    run() {
      return eachCard((line, entry) => {
        if (!entry.demand || line.querySelector('.rk-trading-card-demand')) return;
        const node = ui.pill(entry.demand, demandTones[entry.demand] || 'neutral', { title: `${entry.demand} demand` });
        node.classList.add('rk-trading-card-demand');
        place(line, node, 3);
      });
    }
  });

  Rk.feature({
    id: 'trading.acronyms',
    category: 'trading',
    name: 'Item acronyms',
    description: 'Shows the common short name of limited items on their cards.',
    default: false,
    css: cardCss,
    run() {
      return eachCard((line, entry) => {
        if (!entry.acronym || line.querySelector('.rk-trading-card-acronym')) return;
        const node = ui.pill(entry.acronym, 'neutral', { title: 'Acronym' });
        node.classList.add('rk-trading-card-acronym');
        place(line, node, 2);
      });
    }
  });

  Rk.feature({
    id: 'trading.marketFlags',
    category: 'trading',
    name: 'Market flags',
    description: 'Marks projected, hyped and rare limiteds on cards and item pages.',
    css: cardCss + pillsCss,
    async run() {
      const cards = eachCard((line, entry) => {
        const flags = flagPills(entry);
        if (!flags.length || line.querySelector('.rk-trading-card-flags')) return;
        place(line, el('span', { class: 'rk-trading-card-flags' }, flags), 4);
      });
      if (Rk.page().type !== 'item' || Rk.isEnabled('trading.itemValue')) return cards;
      const id = await limitedId();
      const entry = id ? (await valuesMap()).get(id) : null;
      const flags = entry ? flagPills(entry) : [];
      if (flags.length) (await slot(4)).append(el('div', { class: 'rk-trading-pills rk-trading-flags' }, flags));
      return cards;
    }
  });

  const chartCss = `
    .rk-trading-chart { position: relative; color: var(--rk-accent); user-select: none; }
    .dark-theme .rk-trading-chart { color: color-mix(in srgb, var(--rk-accent) 55%, var(--rk-text-strong)); }
    .rk-trading-chart-svg { display: block; width: 100%; overflow: visible; outline: none; touch-action: pan-y; }
    .rk-trading-chart-svg:focus-visible { outline: 2px solid var(--rk-accent); outline-offset: 4px; border-radius: var(--rk-radius-s); }
    .rk-trading-chart-grid { stroke: var(--rk-border); stroke-width: 1; shape-rendering: crispEdges; }
    .rk-trading-chart-label { fill: var(--rk-muted); stroke: var(--rk-bg); stroke-width: 3px; stroke-linejoin: round; paint-order: stroke; font-family: var(--rk-font); font-size: 11px; font-weight: 500; font-variant-numeric: tabular-nums; }
    .rk-trading-chart-area { fill: currentColor; fill-opacity: 0.1; }
    .rk-trading-chart-line { fill: none; stroke: currentColor; stroke-width: 2; stroke-linejoin: round; stroke-linecap: round; }
    .rk-trading-chart-bar { fill: currentColor; transition: opacity var(--rk-fast) ease; }
    .rk-trading-chart-svg[data-active] .rk-trading-chart-bar { opacity: 0.45; }
    .rk-trading-chart-svg[data-active] .rk-trading-chart-bar[data-on] { opacity: 1; }
    .rk-trading-chart-cross { stroke: var(--rk-muted); stroke-width: 1; shape-rendering: crispEdges; opacity: 0; transition: opacity var(--rk-fast) ease; }
    .rk-trading-chart-dot { fill: currentColor; stroke: var(--rk-bg); stroke-width: 2; opacity: 0; transition: opacity var(--rk-fast) ease; }
    .rk-trading-chart-svg[data-active] .rk-trading-chart-cross, .rk-trading-chart-svg[data-active] .rk-trading-chart-dot { opacity: 1; }
    .rk-trading-chart-tip { position: absolute; top: 0; left: 0; z-index: 2; display: flex; flex-direction: column; gap: 2px; padding: 6px 8px; border-radius: var(--rk-radius-s); border: 1px solid var(--rk-border); background: var(--rk-bg); box-shadow: var(--rk-shadow); color: var(--rk-text-strong); font-family: var(--rk-font); font-size: 12px; line-height: 1.3; white-space: nowrap; pointer-events: none; opacity: 0; transform: translateY(4px); transition: opacity var(--rk-fast) ease, transform var(--rk-fast) var(--rk-ease); }
    .rk-trading-chart-tip-on { opacity: 1; transform: translateY(0); }
    .rk-trading-chart-tip-date { color: var(--rk-muted); font-weight: 500; }
  `;

  const calcCss = `
    .rk-trading-calc { display: grid; grid-template-columns: minmax(140px, 220px) 1fr; align-items: center; gap: 12px; }
    .rk-trading-calc .rk-stats { grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); }
    .rk-trading-note { margin-top: 8px; font-size: 12px; color: var(--rk-muted); }
    @media (max-width: 640px) { .rk-trading-calc { grid-template-columns: 1fr; } }
  `;

  const chart = (points, { bars = false, height = 180, label, valueText, valueNode }) => {
    const box = svg('svg', { class: 'rk-trading-chart-svg', role: 'img', 'aria-label': label, tabindex: '0', height });
    const tipValue = el('div', { class: 'rk-strong' });
    const tipDate = el('div', { class: 'rk-trading-chart-tip-date' });
    const tipBox = el('div', { class: 'rk-trading-chart-tip', 'aria-hidden': 'true' }, tipValue, tipDate);
    const wrap = el('div', { class: 'rk-trading-chart' }, box, tipBox);
    const pad = { top: 22, right: 8, bottom: 24, left: 8 };
    const first = points[0].time;
    const last = points[points.length - 1].time;
    const high = Math.max(...points.map(point => point.value));
    const low = Math.min(...points.map(point => point.value));
    let layout = null;
    let frame = 0;
    let pointerX = null;
    let active = -1;

    const show = index => {
      if (!layout || index < 0 || index >= points.length) return;
      active = index;
      const { xs, ys, cross, dot, width, nodes } = layout;
      const x = xs[index];
      if (cross) {
        cross.setAttribute('x1', String(x));
        cross.setAttribute('x2', String(x));
      }
      if (dot) {
        dot.setAttribute('cx', String(x));
        dot.setAttribute('cy', String(ys[index]));
      }
      if (nodes) {
        for (const node of nodes) node.removeAttribute('data-on');
        nodes[index].setAttribute('data-on', '');
      }
      box.setAttribute('data-active', '');
      tipValue.replaceChildren(valueNode(points[index].value));
      tipDate.textContent = fmt.date(points[index].time);
      tipBox.classList.add('rk-trading-chart-tip-on');
      const tipWidth = tipBox.offsetWidth || 120;
      const scale = (wrap.clientWidth || width) / width;
      const left = Math.max(0, Math.min(x * scale - tipWidth / 2, (wrap.clientWidth || width) - tipWidth));
      tipBox.style.left = `${Math.round(left)}px`;
      tipBox.style.top = `${Math.round(ys[index] < 60 ? ys[index] + 12 : ys[index] - 56)}px`;
    };

    const hide = () => {
      active = -1;
      box.removeAttribute('data-active');
      tipBox.classList.remove('rk-trading-chart-tip-on');
    };

    const nearest = x => {
      let best = 0;
      for (let i = 1; i < layout.xs.length; i++) {
        if (Math.abs(layout.xs[i] - x) < Math.abs(layout.xs[best] - x)) best = i;
      }
      return best;
    };

    const draw = measured => {
      const width = Math.max(240, Math.round(measured || 600));
      const plotWidth = width - pad.left - pad.right;
      const plotHeight = height - pad.top - pad.bottom;
      const spread = high - low || Math.max(1, high * 0.1);
      const top = bars ? Math.max(1, high) : high + spread * 0.12;
      const bottom = bars ? 0 : Math.max(0, low - spread * 0.12);
      const span = last - first || DAY;
      const slotWidth = bars ? plotWidth / Math.max(1, Math.round(span / DAY) + 1) : 0;
      const xOf = time => (bars ? pad.left + slotWidth / 2 + ((time - first) / span) * (plotWidth - slotWidth) : pad.left + ((time - first) / span) * plotWidth);
      const yOf = value => pad.top + (1 - (value - bottom) / (top - bottom || 1)) * plotHeight;
      const xs = points.map(point => xOf(point.time));
      const ys = points.map(point => yOf(point.value));
      const base = pad.top + plotHeight;
      const children = [];
      const guide = (value, text) => {
        const y = Math.round(yOf(value)) + 0.5;
        children.push(svg('line', { class: 'rk-trading-chart-grid', x1: pad.left, x2: width - pad.right, y1: y, y2: y }));
        children.push(svg('text', { class: 'rk-trading-chart-label', x: pad.left, y: y - 6 }));
        children[children.length - 1].textContent = text;
      };
      guide(high, `High ${valueText(high)}`);
      if (!bars && low !== high) guide(low, `Low ${valueText(low)}`);
      children.push(svg('line', { class: 'rk-trading-chart-grid', x1: pad.left, x2: width - pad.right, y1: Math.round(base) + 0.5, y2: Math.round(base) + 0.5 }));
      let nodes = null;
      let dot = null;
      if (bars) {
        const barWidth = Math.max(1, Math.min(24, slotWidth - 2));
        nodes = points.map((point, index) => {
          const h = Math.max(1, base - ys[index]);
          const x = xs[index] - barWidth / 2;
          const r = Math.min(4, barWidth / 2, h);
          const y = base - h;
          return svg('path', { class: 'rk-trading-chart-bar', d: `M${x},${base}V${y + r}Q${x},${y} ${x + r},${y}H${x + barWidth - r}Q${x + barWidth},${y} ${x + barWidth},${y + r}V${base}Z` });
        });
        children.push(...nodes);
      } else {
        const line = xs.map((x, index) => `${index ? 'L' : 'M'}${x.toFixed(1)},${ys[index].toFixed(1)}`).join('');
        children.push(svg('path', { class: 'rk-trading-chart-area', d: `${line}L${xs[xs.length - 1].toFixed(1)},${base}L${xs[0].toFixed(1)},${base}Z` }));
        children.push(svg('path', { class: 'rk-trading-chart-line', d: line }));
      }
      const startLabel = svg('text', { class: 'rk-trading-chart-label', x: pad.left, y: height - 6 });
      startLabel.textContent = fmt.date(first);
      const endLabel = svg('text', { class: 'rk-trading-chart-label', x: width - pad.right, y: height - 6, 'text-anchor': 'end' });
      endLabel.textContent = fmt.date(last);
      const cross = bars ? null : svg('line', { class: 'rk-trading-chart-cross', x1: 0, x2: 0, y1: pad.top - 4, y2: base });
      children.push(startLabel, endLabel);
      if (cross) {
        dot = svg('circle', { class: 'rk-trading-chart-dot', r: 4, cx: 0, cy: 0 });
        children.push(cross, dot);
      }
      box.setAttribute('viewBox', `0 0 ${width} ${height}`);
      box.replaceChildren(...children);
      layout = { xs, ys, cross, dot, width, nodes };
      if (active >= 0) show(active);
    };

    const onFrame = () => {
      frame = 0;
      if (pointerX === null || !layout) return;
      const rect = box.getBoundingClientRect();
      if (!rect.width) return;
      show(nearest(((pointerX - rect.left) / rect.width) * layout.width));
    };

    box.addEventListener('pointermove', event => {
      pointerX = event.clientX;
      if (!frame) frame = requestAnimationFrame(onFrame);
    });
    box.addEventListener('pointerleave', () => {
      pointerX = null;
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      hide();
    });
    box.addEventListener('blur', hide);
    box.addEventListener('keydown', event => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      const step = event.key === 'ArrowLeft' ? -1 : 1;
      show(active < 0 ? (step > 0 ? 0 : points.length - 1) : Math.max(0, Math.min(points.length - 1, active + step)));
    });

    let lastWidth = 0;
    const resize = new ResizeObserver(entries => {
      if (!wrap.isConnected) {
        resize.disconnect();
        if (frame) cancelAnimationFrame(frame);
        return;
      }
      const width = entries[0] && entries[0].contentRect ? Math.round(entries[0].contentRect.width) : 0;
      if (width && width !== lastWidth) {
        lastWidth = width;
        draw(width);
      }
    });
    resize.observe(wrap);
    draw(wrap.clientWidth);
    return wrap;
  };

  const series = (list, days) => {
    const since = Date.now() - days * DAY;
    return (Array.isArray(list) ? list : [])
      .map(point => ({ time: point && typeof point.date === 'string' ? Date.parse(point.date) : NaN, value: num(point && point.value) }))
      .filter(point => Number.isFinite(point.time) && point.time >= since && point.value !== null && point.value >= 0)
      .sort((a, b) => a.time - b.time);
  };

  const itemSection = async (order, title, build, options) => {
    const id = await limitedId();
    if (!id) return;
    const body = el('div', null, el('div', { class: 'rk-skeleton', style: { height: '64px' } }));
    const node = ui.section(title, body, options);
    (await slot(order)).append(node);
    const content = await build(id, node);
    if (content) body.replaceChildren(content);
    else node.remove();
  };

  Rk.feature({
    id: 'trading.itemValue',
    category: 'trading',
    name: 'Market value',
    description: 'Shows value, RAP, demand and trend on limited item pages.',
    pages: ['item'],
    css: pillsCss,
    run() {
      return itemSection(1, 'Market value', async id => {
        const entry = (await valuesMap()).get(id);
        const data = entry ? null : await resale(id);
        const rap = entry ? entry.rap : num(data && data.recentAveragePrice);
        const value = entry && entry.value > 0 ? entry.value : rap;
        const valueTitle = entry && entry.valued ? 'Rolimons value' : 'Not valued yet, showing RAP';
        const pills = el('div', { class: 'rk-trading-pills' },
          entry && Rk.isEnabled('trading.marketFlags') ? flagPills(entry) : null,
          Rk.isEnabled('trading.rolimonsLinks') ? null : ui.link(`https://www.rolimons.com/item/${id}`, 'View on Rolimons', { external: true })
        );
        return el('div', null,
          ui.stats([
            ['Value', money(value), { title: valueTitle }],
            ['RAP', money(rap)],
            ['Demand', (entry && entry.demand) || '-'],
            ['Trend', (entry && entry.trend) || '-']
          ]),
          pills
        );
      }, { className: 'rk-trading-value', actions: [] });
    }
  });

  Rk.feature({
    id: 'trading.resaleStats',
    category: 'trading',
    name: 'Resale stats',
    description: 'Shows original price, RAP, stock, sales and growth since release on limited items.',
    pages: ['item'],
    run() {
      return itemSection(2, 'Resale stats', async id => {
        const data = await resale(id);
        if (!data) return null;
        const original = num(data.originalPrice);
        const rap = num(data.recentAveragePrice);
        const entries = [
          ['Original price', money(original)],
          ['RAP', money(rap)],
          ['Stock', data.assetStock == null ? '-' : fmt.num(data.assetStock)],
          ['Remaining', data.numberRemaining == null ? '-' : fmt.num(data.numberRemaining)],
          ['Sales', fmt.num(data.sales)]
        ];
        if (original > 0 && rap !== null) entries.push(['Since release', `x${fmt.num(Number((rap / original).toFixed(rap / original >= 10 ? 1 : 2)))}`, { title: 'RAP divided by the original price' }]);
        return ui.stats(entries);
      });
    }
  });

  Rk.feature({
    id: 'trading.resaleChart',
    category: 'trading',
    name: 'Price chart',
    description: 'Draws the sale price history of limited items for the last 180 days.',
    pages: ['item'],
    css: chartCss,
    run() {
      return itemSection(5, 'Price history', async id => {
        const data = await resale(id);
        if (!data) return null;
        const points = series(data.priceDataPoints, 180);
        if (points.length < 2) return ui.empty('Not enough sales in the last 180 days');
        return chart(points, { label: 'Sale price over the last 180 days', valueText: value => fmt.num(value), valueNode: value => ui.robux(value) });
      });
    }
  });

  Rk.feature({
    id: 'trading.volumeChart',
    category: 'trading',
    name: 'Sales volume chart',
    description: 'Draws daily sales volume of limited items for the last 90 days.',
    default: false,
    pages: ['item'],
    css: chartCss,
    run() {
      return itemSection(6, 'Sales volume', async id => {
        const data = await resale(id);
        if (!data) return null;
        const points = series(data.volumeDataPoints, 90);
        if (!points.length) return ui.empty('No sales in the last 90 days');
        return chart(points, { bars: true, label: 'Daily sales over the last 90 days', valueText: value => fmt.num(value), valueNode: value => fmt.plural(value, 'sale') });
      });
    }
  });

  Rk.feature({
    id: 'trading.lowestPrice',
    category: 'trading',
    name: 'Lowest price',
    description: 'Shows the cheapest reseller price and how it compares to RAP.',
    pages: ['item'],
    css: panelCss,
    async run() {
      const id = await limitedId();
      if (!id) return;
      const [json, data, values] = await Promise.all([
        Rk.api.get(`https://economy.roblox.com/v1/assets/${id}/resellers?limit=10`, { cache: 30000 }).catch(() => null),
        resale(id),
        valuesMap()
      ]);
      if (!json || !Array.isArray(json.data)) return;
      const prices = json.data.map(entry => num(entry && entry.price)).filter(price => price !== null && price > 0);
      const entry = values.get(id);
      const rap = num(data && data.recentAveragePrice) || (entry ? entry.rap : 0);
      let side = ui.pill('No resellers', 'neutral');
      let price = null;
      if (prices.length) {
        price = Math.min(...prices);
        side = rap > 0 ? ui.pill(price < rap ? `${((1 - price / rap) * 100).toFixed(1)}% below RAP` : price > rap ? `${((price / rap - 1) * 100).toFixed(1)}% above RAP` : 'At RAP', price < rap ? 'success' : price > rap ? 'warning' : 'neutral') : null;
      }
      const node = ui.panel(ui.row([el('span', { class: 'rk-muted' }, 'Lowest price'), price === null ? el('span', { class: 'rk-muted' }, '-') : ui.robux(price)], side), { className: 'rk-trading-panel rk-trading-lowest' });
      (await slot(3)).append(node);
    }
  });

  Rk.feature({
    id: 'trading.copiesOwned',
    category: 'trading',
    name: 'Copies you own',
    description: 'Shows how many copies of a limited you own and their serial numbers.',
    pages: ['item'],
    css: panelCss + pillsCss,
    async run() {
      const [id, user] = await Promise.all([limitedId(), Rk.me()]);
      if (!id || !user) return;
      const owned = (await collectibles(user.id)).filter(item => item.assetId === id);
      if (!owned.length) return;
      const serials = owned.map(item => item.serial).filter(Boolean).sort((a, b) => a - b);
      const node = ui.panel([
        el('div', { class: 'rk-strong' }, `You own ${fmt.plural(owned.length, 'copy', 'copies')}`),
        serials.length ? el('div', { class: 'rk-trading-pills' }, serials.slice(0, 60).map(serialPill), serials.length > 60 ? ui.pill(`+${fmt.num(serials.length - 60)} more`) : null) : null
      ], { className: 'rk-trading-panel rk-trading-owned' });
      (await slot(4)).append(node);
    }
  });

  Rk.feature({
    id: 'trading.sellCalculator',
    category: 'trading',
    name: 'Sell calculator',
    description: 'Works out what you receive from a sale after the 30 percent fee.',
    pages: ['item'],
    css: calcCss,
    run() {
      return itemSection(7, 'Sell calculator', async id => {
        const [data, values] = await Promise.all([resale(id), valuesMap()]);
        const entry = values.get(id);
        const rap = num(data && data.recentAveragePrice) || (entry ? entry.rap : 0);
        const results = el('div');
        const update = text => {
          const price = Math.floor(Number(String(text).replace(/[^\d.]/g, '')));
          if (!Number.isFinite(price) || price <= 0) {
            results.replaceChildren(el('span', { class: 'rk-muted' }, 'Enter a sale price to see your share'));
            return;
          }
          const receive = Math.floor(price * 0.7);
          const gain = receive - rap;
          results.replaceChildren(ui.stats([
            ['You receive', ui.robux(receive)],
            ['Marketplace fee', ui.robux(price - receive)],
            ['Gain vs RAP', rap > 0 ? el('span', { class: 'rk-inline' }, signed(gain), ui.pill(percentText((gain / rap) * 100), toneOf(gain))) : '-']
          ]));
        };
        const field = ui.input({ type: 'number', placeholder: 'Sale price', maxLength: 12, onInput: update });
        field.min = '1';
        update('');
        return el('div', null, el('div', { class: 'rk-trading-calc' }, field, results), el('div', { class: 'rk-trading-note' }, `RAP is ${fmt.num(rap)}. Sellers keep 70 percent of the sale price.`));
      });
    }
  });

  const viewCache = new Map();
  const canView = userId => {
    if (!viewCache.has(userId)) {
      viewCache.set(userId, Rk.api.get(`https://inventory.roblox.com/v1/users/${userId}/can-view-inventory`, { cache: 60000 }).then(json => !(json && json.canView === false), () => true));
    }
    return viewCache.get(userId);
  };

  const ranked = (items, values) => items.map(item => ({ ...item, value: worth(item.assetId, item.rap, values), entry: values.get(item.assetId) || null })).sort((a, b) => b.value - a.value || b.rap - a.rap);

  const inventoryCss = `
    .rk-trading-toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-bottom: 8px; }
    .rk-trading-toolbar .rk-input { flex: 1 1 200px; width: auto; min-width: 0; }
    .rk-trading-name { display: inline-flex; align-items: center; gap: 10px; min-width: 0; }
    .rk-trading-name .rk-link { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 320px; }
    .rk-trading-more { display: flex; justify-content: center; margin-top: 8px; }
    .rk-trading-top { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 8px; margin-top: 10px; }
    .rk-trading-top-item { display: flex; flex-direction: column; gap: 4px; min-width: 0; padding: 8px; border-radius: var(--rk-radius); background: var(--rk-shift); color: var(--rk-text) !important; text-decoration: none !important; transition: background-color var(--rk-fast) ease; }
    .rk-trading-top-item:hover { background: var(--rk-press); }
    .rk-trading-top-item .rk-thumb { width: 100% !important; height: auto !important; aspect-ratio: 1; }
    .rk-trading-top-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; font-weight: 600; color: var(--rk-text-strong); }
  `;

  Rk.feature({
    id: 'trading.inventoryValue',
    category: 'trading',
    name: 'Inventory value',
    description: 'Shows total value, RAP and the top item at the top of inventories.',
    pages: ['inventory'],
    async run() {
      const userId = Rk.page().id;
      if (!Rk.isId(userId)) return;
      const body = el('div', null, el('div', { class: 'rk-skeleton', style: { height: '56px' } }));
      const node = ui.section('Inventory value', body, { className: 'rk-trading-inventory', actions: [] });
      (await slot(1)).append(node);
      const [visible, items, values] = await Promise.all([canView(userId), collectibles(userId), valuesMap()]);
      if (!items.length) {
        body.replaceChildren(ui.empty(visible ? 'No collectibles in this inventory' : 'Inventory is private'));
        return;
      }
      const sum = totals(items, values);
      const top = ranked(items, values)[0];
      body.replaceChildren(ui.stats([
        ['Total value', ui.robux(sum.value)],
        ['Total RAP', ui.robux(sum.rap)],
        ['Collectibles', fmt.num(items.length)],
        ['Limited U', fmt.num(items.filter(item => item.serial !== null).length)],
        ['Top item', ui.link(`/catalog/${top.assetId}`, top.name), { title: `${top.name}, ${fmt.num(top.value)}` }]
      ]));
    }
  });

  Rk.feature({
    id: 'trading.collectiblesList',
    category: 'trading',
    name: 'Collectibles list',
    description: 'Lists every collectible in an inventory with serial, RAP, value and demand.',
    pages: ['inventory'],
    css: inventoryCss,
    async run() {
      const userId = Rk.page().id;
      if (!Rk.isId(userId)) return;
      const body = el('div', null, el('div', { class: 'rk-skeleton', style: { height: '120px' } }));
      const count = el('span', { class: 'rk-muted' });
      const node = ui.section('Collectibles', body, { className: 'rk-trading-collectibles', actions: [count] });
      (await slot(3)).append(node);
      const [visible, items, values] = await Promise.all([canView(userId), collectibles(userId), valuesMap()]);
      if (!items.length) {
        body.replaceChildren(ui.empty(visible ? 'No collectibles in this inventory' : 'Inventory is private'));
        return;
      }
      const list = ranked(items, values);
      const cells = new Map();
      const cellsFor = item => {
        if (!cells.has(item)) {
          cells.set(item, [
            el('span', { class: 'rk-trading-name' }, ui.thumb(Rk.thumb('Asset', item.assetId, '150x150'), { size: 36, alt: '' }), ui.link(`/catalog/${item.assetId}`, item.name)),
            item.serial ? serialPill(item.serial) : el('span', { class: 'rk-muted' }, '-'),
            ui.robux(item.rap),
            ui.robux(item.value),
            item.entry && item.entry.demand ? ui.pill(item.entry.demand, demandTones[item.entry.demand] || 'neutral') : el('span', { class: 'rk-muted' }, '-')
          ]);
        }
        return cells.get(item);
      };
      const sorters = {
        value: (a, b) => b.value - a.value || b.rap - a.rap,
        rap: (a, b) => b.rap - a.rap || b.value - a.value,
        name: (a, b) => a.name.localeCompare(b.name),
        serial: (a, b) => (a.serial || Infinity) - (b.serial || Infinity) || b.value - a.value
      };
      const columns = [{ label: 'Item' }, { label: 'Serial' }, { label: 'RAP', align: 'right' }, { label: 'Value', align: 'right' }, { label: 'Demand' }];
      let sort = 'value';
      let query = '';
      let shown = 25;
      const holder = el('div');
      const render = () => {
        const text = query.trim().toLowerCase();
        const matches = list.filter(item => !text || item.name.toLowerCase().includes(text) || (item.entry && item.entry.acronym.toLowerCase() === text)).sort(sorters[sort]);
        count.textContent = text ? `${fmt.num(matches.length)} of ${fmt.num(list.length)}` : fmt.plural(list.length, 'item');
        if (!matches.length) {
          holder.replaceChildren(ui.empty('No collectibles match that name'));
          return;
        }
        holder.replaceChildren(ui.table(columns, matches.slice(0, shown).map(cellsFor)));
        if (matches.length > shown) {
          holder.append(el('div', { class: 'rk-trading-more' }, ui.button(`Show more (${fmt.num(matches.length - shown)} left)`, { variant: 'secondary', onClick: () => {
            shown += 25;
            render();
          } })));
        }
      };
      body.replaceChildren(
        el('div', { class: 'rk-trading-toolbar' },
          ui.input({ placeholder: 'Filter by name', maxLength: 80, onInput: value => {
            query = value;
            shown = 25;
            render();
          } }),
          ui.select([['value', 'Sort by value'], ['rap', 'Sort by RAP'], ['name', 'Sort by name'], ['serial', 'Sort by serial']], sort, value => {
            sort = sorters[value] ? value : 'value';
            render();
          })
        ),
        holder
      );
      render();
    }
  });

  Rk.feature({
    id: 'trading.serialHighlight',
    category: 'trading',
    name: 'Serial highlights',
    description: 'Highlights serial #1 and serials up to 100 in collectible lists.',
    css: `
      .rk-pill.rk-serial-1 { color: var(--rk-accent); }
      .dark-theme .rk-pill.rk-serial-1 { color: color-mix(in srgb, var(--rk-accent) 55%, var(--rk-text-strong)); }
      .rk-pill.rk-serial-low { color: var(--rk-warning); }
    `
  });

  Rk.feature({
    id: 'trading.collectiblesCsv',
    category: 'trading',
    name: 'Collectibles export',
    description: 'Adds an Export CSV button for the collectibles in an inventory.',
    default: false,
    pages: ['inventory'],
    css: panelCss,
    async run() {
      const userId = Rk.page().id;
      if (!Rk.isId(userId)) return;
      const exportItems = async () => {
        const [items, values] = await Promise.all([collectibles(userId), valuesMap()]);
        if (!items.length) {
          ui.toast('No collectibles to export', { tone: 'warning' });
          return;
        }
        downloadCsv(`collectibles-${userId}.csv`, ['assetId', 'userAssetId', 'name', 'serial', 'rap', 'value'], items.map(item => [item.assetId, item.userAssetId, item.name, item.serial, item.rap, worth(item.assetId, item.rap, values)]));
      };
      const button = ui.button('Export CSV', { variant: 'secondary', icon: 'download', onClick: () => exportItems() });
      button.classList.add('rk-trading-csv');
      const target = Rk.isEnabled('trading.collectiblesList') ? '.rk-trading-collectibles .rk-section-actions' : Rk.isEnabled('trading.inventoryValue') ? '.rk-trading-inventory .rk-section-actions' : null;
      if (target) Rk.observe(target, actions => actions.append(button), { once: true });
      else (await slot(2)).append(ui.panel(button, { className: 'rk-trading-panel' }));
    }
  });

  Rk.feature({
    id: 'trading.valueSnapshots',
    category: 'trading',
    name: 'Daily value snapshots',
    description: 'Saves your inventory value once a day and shows the change over 30 days.',
    default: false,
    pages: ['inventory'],
    css: panelCss,
    async run() {
      const user = await Rk.me();
      if (!user || Rk.page().id !== user.id) return;
      const [items, values] = await Promise.all([collectibles(user.id), valuesMap()]);
      if (!items.length || !values.size) return;
      const sum = totals(items, values);
      const day = today();
      const saved = Rk.store.get('trading.valueSnapshots', []);
      const list = (Array.isArray(saved) ? saved : []).filter(entry => Array.isArray(entry) && isDay(entry[0]) && Number.isFinite(entry[1]) && Number.isFinite(entry[2]) && entry[0] !== day);
      list.push([day, sum.value, sum.rap]);
      list.sort((a, b) => a[0].localeCompare(b[0]));
      Rk.store.set('trading.valueSnapshots', list.slice(-120));
      const since = new Date(Date.now() - 30 * DAY).toISOString().slice(0, 10);
      const oldest = list.find(entry => entry[0] >= since);
      let node;
      if (!oldest || oldest[0] === day) {
        node = el('span', { class: 'rk-muted' }, 'Value tracking started today');
      } else {
        const change = sum.value - oldest[1];
        node = ui.pill(`${signed(change)} value since ${fmt.date(`${oldest[0]}T12:00:00Z`)}`, toneOf(change), { title: `Value was ${fmt.num(oldest[1])} on ${fmt.date(`${oldest[0]}T12:00:00Z`)}` });
      }
      node.classList.add('rk-trading-snapshot');
      if (Rk.isEnabled('trading.inventoryValue')) Rk.observe('.rk-trading-inventory .rk-section-actions', actions => actions.prepend(node), { once: true });
      else (await slot(2)).append(ui.panel(node, { className: 'rk-trading-panel' }));
    }
  });

  Rk.feature({
    id: 'trading.profileValue',
    category: 'trading',
    name: 'Profile collectibles',
    description: 'Shows total value, RAP and the most valuable items on profiles.',
    pages: ['profile'],
    css: inventoryCss,
    async run() {
      const userId = Rk.page().id;
      if (!Rk.isId(userId)) return;
      const body = el('div', null, el('div', { class: 'rk-skeleton', style: { height: '56px' } }));
      const node = ui.section('Collectibles', body, {
        className: 'rk-trading-profile',
        actions: [ui.button('Inventory', { variant: 'ghost', href: `/users/${userId}/inventory` })]
      });
      (await slot(1)).append(node);
      const [visible, items, values] = await Promise.all([canView(userId), collectibles(userId), valuesMap()]);
      if (!items.length) {
        body.replaceChildren(el('div', { class: 'rk-muted' }, visible ? 'No collectibles yet' : 'Inventory is private'));
        return;
      }
      const sum = totals(items, values);
      body.replaceChildren(
        ui.stats([['Value', ui.robux(sum.value)], ['RAP', ui.robux(sum.rap)], ['Items', fmt.num(items.length)]]),
        el('div', { class: 'rk-trading-top' }, ranked(items, values).slice(0, 6).map(item => el('a', { class: 'rk-trading-top-item', href: `/catalog/${item.assetId}`, title: item.name },
          ui.thumb(Rk.thumb('Asset', item.assetId, '150x150'), { size: 104, alt: '' }),
          el('span', { class: 'rk-trading-top-name' }, item.name),
          ui.robux(item.value)
        )))
      );
    }
  });

  Rk.feature({
    id: 'trading.profileTrade',
    category: 'trading',
    name: 'Trade from profiles',
    description: 'Adds Trade and Rolimons buttons to the profiles of other users.',
    pages: ['profile'],
    css: `
      .rk-trading-profile-actions { display: flex; flex-wrap: wrap; gap: 8px; margin: 12px 0; animation: rk-fade var(--rk-fast) ease both; }
    `,
    async run() {
      const userId = Rk.page().id;
      const user = await Rk.me();
      if (!Rk.isId(userId) || (user && user.id === userId)) return;
      const status = user ? await Rk.api.get(`https://trades.roblox.com/v1/users/${userId}/can-trade-with`, { cache: 60000 }).catch(() => null) : null;
      const node = el('div', { class: 'rk-trading-profile-actions' },
        status && status.canTrade === true ? ui.button('Trade', { variant: 'primary', icon: 'swap', href: `/users/${userId}/trade` }) : null,
        ui.button('Rolimons', { variant: 'secondary', icon: 'external', href: `https://www.rolimons.com/player/${userId}`, target: '_blank' })
      );
      Rk.mount('.user-profile-header', node, { position: 'after' });
    }
  });

  const tradeRecords = new Map();

  const sideFrom = (offer, values) => {
    const list = Array.isArray(offer && offer.userAssets) ? offer.userAssets : Array.isArray(offer && offer.items) ? offer.items : [];
    const items = [];
    for (const asset of list) {
      if (!asset || typeof asset !== 'object') continue;
      const assetId = Number(asset.assetId != null ? asset.assetId : asset.itemTarget && asset.itemTarget.targetId);
      if (!Rk.isId(assetId)) continue;
      const entry = values.get(assetId);
      const listed = num(asset.recentAveragePrice);
      const rap = Math.max(0, listed === null ? (entry ? entry.rap : 0) : listed);
      const name = [asset.name, asset.itemName, entry && entry.name].find(text => typeof text === 'string' && text) || 'Unknown item';
      items.push({ assetId, name, serial: Rk.isId(asset.serialNumber) ? Number(asset.serialNumber) : null, rap, value: worth(assetId, rap, values) });
    }
    const robux = Math.max(0, num(offer && offer.robux) || 0);
    return { items, robux, value: sum(items, item => item.value) + robux, rap: sum(items, item => item.rap) + robux };
  };

  const tradeDetails = async (id, myId) => {
    const values = await valuesMap();
    let offers = null;
    try {
      const json = await Rk.api.get(`https://trades.roblox.com/v1/trades/${id}`, { cache: 300000 });
      if (json && Array.isArray(json.offers)) offers = json.offers.filter(offer => offer && typeof offer === 'object');
    } catch (err) {
      if (!err || err.status !== 404) throw err;
      const json = await Rk.api.get(`https://trades.roblox.com/v2/trades/${id}`, { cache: 300000 });
      if (json && typeof json === 'object') offers = [json.participantAOffer, json.participantBOffer].filter(offer => offer && typeof offer === 'object');
    }
    if (!offers || offers.length < 2) return null;
    const index = offers.findIndex(offer => offer.user && Number(offer.user.id) === myId);
    const mine = index === -1 ? 0 : index;
    return { mine: sideFrom(offers[mine], values), theirs: sideFrom(offers[mine === 0 ? 1 : 0], values) };
  };

  const gainPill = (give, get) => {
    const diff = get - give;
    if (!give && !get) return ui.pill('Empty', 'neutral');
    const text = give > 0 ? percentText((diff / give) * 100) : 'Gain';
    return ui.pill(diff === 0 ? 'Even' : text, toneOf(diff), { title: `${diff >= 0 ? 'Gain' : 'Loss'} of ${fmt.num(Math.abs(diff))} value` });
  };

  const tradeSide = (title, side) => el('div', { class: 'rk-trading-side' },
    el('div', { class: 'rk-trading-side-head' }, el('span', { class: 'rk-strong' }, title), ui.robux(side.value)),
    side.items.map(item => el('div', { class: 'rk-trading-side-item' },
      ui.thumb(Rk.thumb('Asset', item.assetId, '150x150'), { size: 36, alt: '' }),
      el('div', { class: 'rk-trading-side-text' },
        ui.link(`/catalog/${item.assetId}`, item.name),
        el('div', { class: 'rk-trading-side-meta' }, item.serial ? serialPill(item.serial) : null, el('span', null, `RAP ${fmt.num(item.rap)}`))
      ),
      ui.robux(item.value)
    )),
    side.robux ? el('div', { class: 'rk-trading-side-item rk-trading-side-robux' }, el('span', { class: 'rk-trading-side-icon' }, icon('robux', 18)), el('div', { class: 'rk-trading-side-text' }, 'Robux'), ui.robux(side.robux)) : null,
    !side.items.length && !side.robux ? el('div', { class: 'rk-muted' }, 'Nothing') : null,
    el('div', { class: 'rk-trading-side-total rk-muted' }, `RAP ${fmt.num(side.rap)}`)
  );

  const inspectorCss = `
    .rk-native-trade-tabs { display: none !important; }
    .rk-trading-tabs { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 8px; }
    .rk-trading-trades { display: flex; flex-direction: column; gap: 2px; }
    .rk-trading-trade { border-radius: var(--rk-radius); transition: background-color var(--rk-fast) ease; }
    .rk-trading-trade[data-open] { background: var(--rk-shift); }
    .rk-trading-trade-head { display: flex; align-items: center; gap: 10px; width: 100%; min-height: 52px; padding: 6px 8px; border: 0; border-radius: var(--rk-radius); background: transparent; color: var(--rk-text); font-family: var(--rk-font); font-size: 14px; text-align: left; cursor: pointer; transition: background-color var(--rk-fast) ease; }
    .rk-trading-trade-head:hover { background: var(--rk-hover); }
    .rk-trading-trade-head:focus-visible { outline: 2px solid var(--rk-accent); outline-offset: -2px; }
    .rk-trading-trade-who { display: flex; flex-direction: column; min-width: 0; flex: 1; }
    .rk-trading-trade-title { display: flex; align-items: center; min-width: 0; }
    .rk-trading-trade-name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 600; color: var(--rk-text-strong); }
    .rk-trading-trade-sub { font-size: 12px; color: var(--rk-muted); }
    .rk-trading-trade-sum { display: flex; align-items: center; gap: 8px; flex: none; font-size: 12px; color: var(--rk-muted); }
    .rk-trading-trade-sum .rk-robux { font-size: 13px; }
    .rk-trading-trade-chevron { flex: none; color: var(--rk-muted); transition: transform var(--rk-med) var(--rk-ease); }
    .rk-trading-trade[data-open] .rk-trading-trade-chevron { transform: rotate(90deg); }
    .rk-trading-trade-body { display: grid; grid-template-rows: 0fr; transition: grid-template-rows var(--rk-med) var(--rk-ease); }
    .rk-trading-trade[data-open] .rk-trading-trade-body { grid-template-rows: 1fr; }
    .rk-trading-trade-inner { min-height: 0; overflow: hidden; }
    .rk-trading-trade-sides { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; padding: 4px 8px 10px; }
    .rk-trading-side { display: flex; flex-direction: column; gap: 6px; min-width: 0; padding: 10px; border-radius: var(--rk-radius); background: var(--rk-shift); }
    .rk-trading-side-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
    .rk-trading-side-item { display: flex; align-items: center; gap: 10px; min-width: 0; }
    .rk-trading-side-text { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; }
    .rk-trading-side-text .rk-link { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .rk-trading-side-meta { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--rk-muted); }
    .rk-trading-side-icon { display: inline-flex; align-items: center; justify-content: center; width: 36px; height: 36px; border-radius: var(--rk-radius); background: var(--rk-shift); color: var(--rk-text-strong); }
    .rk-trading-side-total { margin-top: auto; padding-top: 6px; border-top: 1px solid var(--rk-border); font-size: 12px; }
    .rk-trading-trade-note { padding: 4px 8px 12px; color: var(--rk-muted); }
    @media (max-width: 640px) { .rk-trading-trade-sides { grid-template-columns: 1fr; } .rk-trading-trade-sum .rk-trading-trade-label { display: none; } }
  `;

  Rk.feature({
    id: 'trading.tradeInspector',
    category: 'trading',
    name: 'Trade inspector',
    description: 'Lists your trades with the value of both sides and the gain or loss.',
    pages: ['trades'],
    css: inspectorCss + pillsCss,
    async run() {
      const user = await Rk.me();
      if (!user) return;
      const tabs = ['Inbound', 'Outbound', 'Completed', 'Inactive'];
      const state = new Map(tabs.map(tab => [tab, { records: [], cursor: '', done: false, loading: false, failed: false }]));
      const list = el('div', { class: 'rk-trading-trades' });
      const footer = el('div', { class: 'rk-trading-more' });
      const buttons = new Map();
      const queue = [];
      let running = 0;
      let current = 'Inbound';

      const isVerified = (id, flag) => flag === true || (id === user.id && Rk.isEnabled('profiles.fakeVerified'));
      const markVerified = (record, flag) => {
        if (isVerified(record.partner.id, flag) && !record.title.querySelector('.rk-verified')) record.title.append(ui.verified({ size: 14 }));
      };

      const checkVerified = records => {
        const ids = records.filter(record => record.partner.id && !record.title.querySelector('.rk-verified')).map(record => record.partner.id);
        if (!ids.length) return;
        Rk.api.users(ids).then(users => {
          for (const record of records) {
            const info = users.get(record.partner.id);
            if (info) markVerified(record, info.hasVerifiedBadge === true);
          }
        }, () => {});
      };

      const fill = record => {
        const { details } = record;
        if (record.failed) {
          record.summary.replaceChildren(el('span', null, 'Unavailable'));
          record.inner.replaceChildren(el('div', { class: 'rk-trading-trade-note' }, 'Could not load the items in this trade'));
          return;
        }
        if (!details) return;
        record.summary.replaceChildren(
          el('span', { class: 'rk-trading-trade-label' }, 'Give'), ui.robux(details.mine.value, { compact: true }),
          el('span', { class: 'rk-trading-trade-label' }, 'Get'), ui.robux(details.theirs.value, { compact: true }),
          gainPill(details.mine.value, details.theirs.value)
        );
        record.inner.replaceChildren(el('div', { class: 'rk-trading-trade-sides' }, tradeSide('You give', details.mine), tradeSide('You get', details.theirs)));
      };

      const pump = () => {
        while (running < 4 && queue.length) {
          const record = queue.shift();
          if (!record.node.isConnected) {
            record.queued = false;
            continue;
          }
          running++;
          tradeDetails(record.id, user.id).then(details => {
            record.details = details;
            record.failed = !details;
          }, () => {
            record.failed = true;
          }).finally(() => {
            record.loaded = true;
            running--;
            fill(record);
            pump();
          });
        }
      };

      const want = record => {
        if (record.queued || record.loaded) return;
        record.queued = true;
        queue.push(record);
        pump();
      };

      const visible = new IntersectionObserver(entries => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          visible.unobserve(entry.target);
          const record = tradeRecords.get(Number(entry.target.dataset.tradeId));
          if (record) want(record);
        }
      }, { rootMargin: '120px 0px' });

      const recordFor = (raw, tab) => {
        const id = Number(raw.id);
        if (tradeRecords.has(id)) return tradeRecords.get(id);
        const partner = raw.user && typeof raw.user === 'object' ? raw.user : {};
        const partnerId = Rk.isId(partner.id) ? Number(partner.id) : null;
        const name = typeof partner.displayName === 'string' && partner.displayName ? partner.displayName : typeof partner.name === 'string' && partner.name ? partner.name : 'Unknown user';
        const record = {
          id,
          tab,
          partner: { id: partnerId, name: typeof partner.name === 'string' ? partner.name : '', displayName: name },
          status: typeof raw.status === 'string' ? raw.status : tab,
          created: raw.created,
          details: null,
          loaded: false,
          queued: false,
          failed: false,
          summary: el('div', { class: 'rk-trading-trade-sum' }, el('span', { class: 'rk-skeleton', style: { width: '120px', height: '14px' } })),
          inner: el('div', { class: 'rk-trading-trade-inner' }, el('div', { class: 'rk-trading-trade-note' }, ui.spinner(16))),
          title: el('span', { class: 'rk-trading-trade-title' }, el('span', { class: 'rk-trading-trade-name' }, name))
        };
        markVerified(record, partner.hasVerifiedBadge === true);
        const head = el('button', { type: 'button', class: 'rk-trading-trade-head', 'aria-expanded': 'false' },
          ui.thumb(partnerId ? Rk.thumb('AvatarHeadShot', partnerId, '48x48', { circular: true }) : null, { size: 40, round: true, alt: '' }),
          el('div', { class: 'rk-trading-trade-who' },
            record.title,
            el('span', { class: 'rk-trading-trade-sub' }, [partner.name && partner.name !== name ? `@${partner.name}` : null, typeof raw.created === 'string' && raw.created ? fmt.ago(raw.created) : null, record.status].filter(text => text && text !== '-').join(' · '))
          ),
          record.summary,
          el('span', { class: 'rk-trading-trade-chevron' }, icon('chevronRight', 16))
        );
        record.node = el('div', { class: 'rk-trading-trade', dataset: { tradeId: String(id) } }, head, el('div', { class: 'rk-trading-trade-body' }, record.inner));
        head.addEventListener('click', () => {
          const open = !record.node.hasAttribute('data-open');
          record.node.toggleAttribute('data-open', open);
          head.setAttribute('aria-expanded', open ? 'true' : 'false');
          if (open) want(record);
        });
        tradeRecords.set(id, record);
        return record;
      };

      const render = () => {
        const tab = state.get(current);
        visible.disconnect();
        for (const [name, button] of buttons) {
          button.classList.toggle('rk-btn-active', name === current);
          button.setAttribute('aria-pressed', name === current ? 'true' : 'false');
        }
        if (!tab.records.length) {
          list.replaceChildren(tab.loading ? el('div', { class: 'rk-skeleton', style: { height: '52px' } }) : tab.failed ? ui.empty('Could not load trades') : ui.empty(`No ${{ Inbound: 'received', Outbound: 'sent', Completed: 'completed', Inactive: 'closed' }[current]} trades`));
        } else {
          list.replaceChildren(...tab.records.map(record => record.node));
          for (const record of tab.records) if (!record.loaded) visible.observe(record.node);
        }
        const more = tab.failed || (!tab.done && tab.records.length) ? ui.button(tab.failed ? 'Try again' : 'Load more', { variant: 'secondary', onClick: () => load(current) }) : null;
        if (more && tab.loading) more.disabled = true;
        footer.replaceChildren(...(more ? [more] : []));
      };

      const load = async name => {
        const tab = state.get(name);
        if (tab.loading || tab.done) return;
        tab.loading = true;
        tab.failed = false;
        if (name === current) render();
        try {
          const json = await Rk.api.get(`https://trades.roblox.com/v1/trades/${name}?limit=25&sortOrder=Desc${tab.cursor ? `&cursor=${encodeURIComponent(tab.cursor)}` : ''}`);
          const rows = json && Array.isArray(json.data) ? json.data : [];
          const fresh = [];
          for (const raw of rows) {
            if (!raw || !Rk.isId(raw.id) || tab.records.some(record => record.id === Number(raw.id))) continue;
            const record = recordFor(raw, name);
            tab.records.push(record);
            fresh.push(record);
          }
          checkVerified(fresh);
          tab.cursor = json && typeof json.nextPageCursor === 'string' ? json.nextPageCursor : '';
          tab.done = !tab.cursor;
        } catch {
          tab.failed = true;
        }
        tab.loading = false;
        if (name === current) render();
      };

      const nativeLabels = { Inbound: ['received', 'inbound'], Outbound: ['sent', 'outbound'], Completed: ['completed'], Inactive: ['closed', 'inactive'] };
      const allNative = Object.values(nativeLabels).flat();
      const nativeTab = 'button, [role="tab"], a';
      const labelOf = node => node.textContent.replace(/[\d()]/g, '').trim().toLowerCase();
      let nativeGroup = null;

      const findNativeGroup = node => {
        let parent = node.parentElement;
        for (let depth = 0; parent && depth < 4; depth++) {
          const matches = [...parent.querySelectorAll(nativeTab)].filter(child => allNative.includes(labelOf(child)));
          if (matches.length >= 3) return parent;
          parent = parent.parentElement;
        }
        return null;
      };

      Rk.observe('#content button, #content [role="tab"]', node => {
        if (nativeGroup && nativeGroup.isConnected) return;
        if (node.closest('.rk-section') || !allNative.includes(labelOf(node))) return;
        const group = findNativeGroup(node);
        if (!group || group.closest('.rk-section')) return;
        nativeGroup = group;
        group.classList.add('rk-native-trade-tabs');
      });

      const switchNative = name => {
        if (!nativeGroup || !nativeGroup.isConnected) return;
        const target = [...nativeGroup.querySelectorAll(nativeTab)].find(child => nativeLabels[name].includes(labelOf(child)));
        if (target) target.click();
      };

      const tabBar = el('div', { class: 'rk-trading-tabs', role: 'group', 'aria-label': 'Trade type' }, tabs.map(name => {
        const button = ui.button(name === 'Inbound' ? 'Received' : name === 'Outbound' ? 'Sent' : name === 'Inactive' ? 'Closed' : name, { variant: 'ghost', onClick: () => {
          current = name;
          render();
          switchNative(name);
          if (!state.get(name).records.length) load(name);
        } });
        buttons.set(name, button);
        return button;
      }));

      (await slot(2)).append(ui.section('Trade inspector', [tabBar, list, footer], { className: 'rk-trading-inspector', actions: [] }));
      render();
      load(current);
    }
  });

  Rk.feature({
    id: 'trading.tradeWindowTotals',
    category: 'trading',
    name: 'Trade window totals',
    description: 'Adds value and RAP totals under each side of an open trade.',
    pages: ['trades'],
    css: `
      .rk-trading-offer-total { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 12px; margin: 8px 0 4px; font-family: var(--rk-font); font-size: 13px; color: var(--rk-muted); animation: rk-fade var(--rk-fast) ease both; }
      .rk-trading-offer-total > span { display: inline-flex; align-items: center; gap: 6px; }
    `,
    async run() {
      const values = await valuesMap();
      const lines = new WeakMap();
      const pending = new Set();
      let scheduled = false;
      const rapOf = id => (values.has(id) ? values.get(id).rap : 0);
      const linksIn = box => [...box.querySelectorAll('a[href*="/catalog/"]')].filter(link => !link.closest('.rk-trading-offer-total'));
      const watchers = new WeakMap();
      const queue = box => {
        pending.add(box);
        if (!scheduled) {
          scheduled = true;
          requestAnimationFrame(flush);
        }
      };
      const flush = () => {
        scheduled = false;
        for (const box of pending) {
          if (!box.isConnected) {
            if (watchers.has(box)) watchers.get(box).disconnect();
            continue;
          }
          if (!watchers.has(box)) {
            const watcher = new MutationObserver(records => {
              const line = lines.get(box);
              if (records.some(record => !line || !line.contains(record.target))) queue(box);
            });
            watcher.observe(box, { childList: true, subtree: true });
            watchers.set(box, watcher);
          }
          const ids = linksIn(box).map(link => Rk.idFrom(link.getAttribute('href'), 'asset')).filter(Boolean);
          let line = lines.get(box);
          if (!ids.length) {
            if (line) line.remove();
            continue;
          }
          if (!line) {
            line = el('div', { class: 'rk-trading-offer-total' });
            lines.set(box, line);
          }
          if (!line.isConnected) {
            if (box.matches('.trade-request-window-offer')) box.append(line);
            else box.after(line);
          }
          line.replaceChildren(
            el('span', null, 'Value', ui.robux(sum(ids, id => worth(id, rapOf(id), values)))),
            el('span', null, 'RAP', ui.robux(sum(ids, rapOf)))
          );
        }
        pending.clear();
      };
      const offerBox = link => {
        const offer = link.closest('.trade-request-window-offer');
        if (offer) return offer;
        const card = link.closest(CARD);
        const list = card && card.parentElement && card.parentElement.closest('[class*="trade"]') ? card.parentElement : null;
        if (!list) return null;
        const cards = new Set(linksIn(list).map(item => item.closest(CARD)).filter(Boolean));
        return cards.size >= 2 ? list : null;
      };
      Rk.observe('a[href*="/catalog/"]', link => {
        if (link.closest('.rk-trading-host, .rk-modal-backdrop')) return;
        const box = offerBox(link);
        if (box) queue(box);
      });
    }
  });

  Rk.feature({
    id: 'trading.tradeExport',
    category: 'trading',
    name: 'Trade export',
    description: 'Adds an Export CSV button to the trade inspector for the loaded trades.',
    default: false,
    pages: ['trades'],
    run() {
      const exportTrades = () => {
        const records = [...tradeRecords.values()];
        if (!records.length) {
          ui.toast('No trades loaded yet', { tone: 'warning' });
          return;
        }
        downloadCsv('trades.csv', ['id', 'partner', 'status', 'created', 'your value', 'their value'], records.map(record => [
          record.id,
          record.partner.name || record.partner.displayName,
          record.status,
          typeof record.created === 'string' ? record.created : '',
          record.details ? record.details.mine.value : '',
          record.details ? record.details.theirs.value : ''
        ]));
      };
      Rk.observe('.rk-trading-inspector .rk-section-actions', actions => {
        actions.append(ui.button('Export CSV', { variant: 'secondary', icon: 'download', onClick: exportTrades }));
      }, { once: true });
    }
  });

  const calculatorCss = `
    .rk-trading-calc-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .rk-trading-calc-col { display: flex; flex-direction: column; gap: 8px; min-width: 0; padding: 12px; border-radius: var(--rk-radius); background: var(--rk-surface); }
    .rk-trading-suggest { display: none; flex-direction: column; margin-top: 4px; padding: 4px; border-radius: var(--rk-radius); border: 1px solid var(--rk-border); background: var(--rk-bg); }
    .rk-trading-suggest-open { display: flex; animation: rk-fade var(--rk-fast) ease both; }
    .rk-trading-suggest-item { display: flex; align-items: center; gap: 8px; min-height: 32px; padding: 0 8px; border: 0; border-radius: var(--rk-radius-s); background: transparent; color: var(--rk-text-strong); font-family: var(--rk-font); font-size: 13px; text-align: left; cursor: pointer; transition: background-color var(--rk-fast) ease; }
    .rk-trading-suggest-item:hover, .rk-trading-suggest-item[data-on] { background: var(--rk-hover); }
    .rk-trading-suggest-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .rk-trading-calc-items { display: flex; flex-direction: column; gap: 4px; min-height: 40px; }
    .rk-trading-calc-item { display: flex; align-items: center; gap: 8px; min-width: 0; padding: 4px; border-radius: var(--rk-radius); background: var(--rk-shift); animation: rk-fade var(--rk-fast) ease both; }
    .rk-trading-calc-item-text { display: flex; flex-direction: column; min-width: 0; flex: 1; font-size: 13px; }
    .rk-trading-calc-item-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 600; color: var(--rk-text-strong); }
    .rk-trading-calc-item-meta { font-size: 12px; color: var(--rk-muted); }
    .rk-trading-calc-robux { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--rk-muted); }
    .rk-trading-calc-robux .rk-input { flex: 1; }
    .rk-trading-calc-total { display: flex; flex-wrap: wrap; gap: 4px 12px; padding-top: 8px; border-top: 1px solid var(--rk-border); font-size: 13px; color: var(--rk-muted); }
    .rk-trading-calc-total > span { display: inline-flex; align-items: center; gap: 6px; }
    .rk-trading-calc-diff { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-top: 12px; font-size: 14px; }
    @media (max-width: 640px) { .rk-trading-calc-cols { grid-template-columns: 1fr; } }
  `;

  const openCalculator = async () => {
    const values = await valuesMap();
    const entries = [...values.values()];
    const sides = [{ title: 'You give', items: [], robux: 0 }, { title: 'You get', items: [], robux: 0 }];
    const diff = el('div', { class: 'rk-trading-calc-diff' });

    const update = () => {
      const [give, get] = sides.map(side => ({
        value: sum(side.items, item => item.value) + side.robux,
        rap: sum(side.items, item => item.rap) + side.robux
      }));
      sides.forEach((side, index) => {
        const total = index ? get : give;
        side.total.replaceChildren(el('span', null, 'Value', ui.robux(total.value)), el('span', null, 'RAP', ui.robux(total.rap)));
        side.list.replaceChildren(...(side.items.length ? side.items.map(item => item.node) : [el('div', { class: 'rk-muted' }, 'No items yet')]));
      });
      const change = get.value - give.value;
      diff.replaceChildren(...[
        el('span', { class: 'rk-muted' }, 'Difference'),
        el('span', { class: 'rk-strong' }, signed(change)),
        give.value > 0 ? ui.pill(percentText((change / give.value) * 100), toneOf(change)) : null,
        el('span', { class: 'rk-muted' }, `RAP ${signed(get.rap - give.rap)}`)
      ].filter(Boolean));
    };

    const add = (side, item) => {
      if (side.items.length >= 4) {
        ui.toast('A trade holds up to 4 items per side', { tone: 'warning' });
        return;
      }
      const entry = { ...item };
      entry.node = el('div', { class: 'rk-trading-calc-item' },
        ui.thumb(Rk.thumb('Asset', item.assetId, '150x150'), { size: 36, alt: '' }),
        el('div', { class: 'rk-trading-calc-item-text' },
          el('span', { class: 'rk-trading-calc-item-name', title: item.name }, item.name),
          el('span', { class: 'rk-trading-calc-item-meta' }, `Value ${fmt.num(item.value)} · RAP ${fmt.num(item.rap)}`)
        ),
        ui.button('', { variant: 'ghost', icon: 'close', title: 'Remove', onClick: () => {
          side.items = side.items.filter(other => other !== entry);
          update();
        } })
      );
      side.items.push(entry);
      update();
    };

    const fromId = async id => {
      const entry = values.get(id);
      if (entry) return { assetId: id, name: entry.name || `Item ${id}`, rap: entry.rap, value: entry.value || entry.rap };
      const [details, data] = await Promise.all([
        Rk.api.get(`https://economy.roblox.com/v2/assets/${id}/details`, { cache: 60000 }).catch(() => null),
        resale(id)
      ]);
      if (!details || (details.IsLimited !== true && details.IsLimitedUnique !== true)) return null;
      const rap = Math.max(0, num(data && data.recentAveragePrice) || 0);
      return { assetId: id, name: typeof details.Name === 'string' && details.Name ? details.Name : `Item ${id}`, rap, value: rap };
    };

    const column = side => {
      const suggest = el('div', { class: 'rk-trading-suggest', role: 'listbox' });
      let matches = [];
      let index = 0;
      const close = () => suggest.classList.remove('rk-trading-suggest-open');
      const pick = item => {
        field.value = '';
        close();
        add(side, { assetId: item.id, name: item.name || `Item ${item.id}`, rap: item.rap, value: item.value || item.rap });
        field.focus();
      };
      const mark = () => [...suggest.children].forEach((node, i) => node.toggleAttribute('data-on', i === index));
      const search = text => {
        const query = text.trim().toLowerCase();
        index = 0;
        if (!query || /^\d+$/.test(query) || /\/(catalog|library)\//.test(query)) {
          matches = [];
          close();
          return;
        }
        const scored = [];
        for (const entry of entries) {
          const name = entry.name.toLowerCase();
          const acronym = entry.acronym.toLowerCase();
          const score = acronym === query ? 0 : name.startsWith(query) ? 1 : acronym.startsWith(query) && acronym ? 2 : name.includes(query) ? 3 : -1;
          if (score >= 0) scored.push([score, entry]);
        }
        matches = scored.sort((a, b) => a[0] - b[0] || b[1].value - a[1].value).slice(0, 8).map(pair => pair[1]);
        suggest.replaceChildren(...matches.map((entry, i) => el('button', {
          type: 'button',
          class: 'rk-trading-suggest-item',
          role: 'option',
          tabindex: '-1',
          onmousedown: event => event.preventDefault(),
          onmouseenter: () => {
            index = i;
            mark();
          },
          onclick: () => pick(entry)
        }, el('span', { class: 'rk-trading-suggest-name' }, entry.name), entry.acronym ? ui.pill(entry.acronym) : null, ui.robux(entry.value, { compact: true }))));
        mark();
        suggest.classList.toggle('rk-trading-suggest-open', matches.length > 0);
      };
      const submit = async () => {
        if (matches.length) {
          pick(matches[index] || matches[0]);
          return;
        }
        const text = field.value.trim();
        const id = /^\d+$/.test(text) ? Number(text) : Rk.idFrom(text, 'asset');
        if (!Rk.isId(id)) return;
        const item = await fromId(Number(id));
        if (!item) {
          ui.toast('That id is not a limited item', { tone: 'warning' });
          return;
        }
        field.value = '';
        add(side, item);
      };
      const field = ui.input({ placeholder: 'Search by name or acronym, or paste an id', maxLength: 200, onInput: search });
      field.addEventListener('keydown', event => {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          if (!matches.length) return;
          event.preventDefault();
          index = (index + (event.key === 'ArrowDown' ? 1 : -1) + matches.length) % matches.length;
          mark();
        } else if (event.key === 'Enter') {
          event.preventDefault();
          submit();
        }
      });
      field.addEventListener('blur', close);
      field.addEventListener('focus', () => search(field.value));
      const robux = ui.input({ type: 'number', placeholder: '0', maxLength: 12, onInput: text => {
        side.robux = Math.max(0, Math.floor(Number(text)) || 0);
        update();
      } });
      robux.min = '0';
      side.list = el('div', { class: 'rk-trading-calc-items' });
      side.total = el('div', { class: 'rk-trading-calc-total' });
      return el('div', { class: 'rk-trading-calc-col' },
        el('div', { class: 'rk-strong' }, side.title),
        el('div', null, field, suggest),
        side.list,
        el('label', { class: 'rk-trading-calc-robux' }, 'Robux', robux),
        side.total
      );
    };

    const content = [el('div', { class: 'rk-trading-calc-cols' }, sides.map(column)), diff];
    update();
    ui.modal({ title: 'Trade calculator', content, width: 760, className: 'rk-trading-calculator' });
  };

  Rk.feature({
    id: 'trading.tradeCalculator',
    category: 'trading',
    name: 'Trade calculator',
    description: 'Adds a calculator on the trades page to compare the value of two sides.',
    pages: ['trades'],
    css: calculatorCss + panelCss,
    async run() {
      const button = ui.button('Trade calculator', { variant: 'secondary', icon: 'swap', onClick: () => openCalculator() });
      if (Rk.isEnabled('trading.tradeInspector') && await Rk.me()) Rk.observe('.rk-trading-inspector .rk-section-actions', actions => actions.prepend(button), { once: true });
      else (await slot(1)).append(ui.panel(button, { className: 'rk-trading-panel' }));
    }
  });

  Rk.feature({
    id: 'trading.headerRap',
    category: 'trading',
    name: 'Collectibles value in header',
    description: 'Shows your total collectibles value in the Robux menu.',
    default: false,
    async run() {
      const user = await Rk.me();
      if (!user) return;
      let total = null;
      const load = async () => {
        if (total) return;
        total = Promise.all([collectibles(user.id), valuesMap()]).then(([items, values]) => totals(items, values).value);
        const value = await total;
        const text = `Collectibles value ${fmt.num(value)}`;
        if (!document.querySelector('#buy-robux-popover')) {
          const amount = document.querySelector('#nav-robux-amount');
          if (amount) {
            amount.setAttribute('data-rk-tip-pos', 'below');
            ui.tip(amount, text);
          }
        }
        Rk.observe('#buy-robux-popover', popover => {
          if (popover.querySelector('.rk-trading-header-value')) return;
          const balance = popover.querySelector('#nav-robux-balance');
          const item = balance && balance.closest('li');
          const line = el(item ? 'li' : 'div', { class: 'rk-trading-header-value' }, el('span', { class: 'rk-muted' }, 'Collectibles value'), ui.robux(value));
          if (item) item.after(line);
          else popover.append(line);
        });
      };
      Rk.observe('#navbar-robux', node => {
        node.addEventListener('pointerenter', load, { once: true });
        node.addEventListener('focusin', load, { once: true });
      }, { once: true });
    },
    css: `
      .rk-trading-header-value { display: flex !important; align-items: center; justify-content: space-between; gap: 8px; padding: 6px 12px; font-family: var(--rk-font); font-size: 13px; list-style: none; animation: rk-fade var(--rk-fast) ease both; }
    `
  });

  Rk.feature({
    id: 'trading.sidebarTradeCount',
    category: 'trading',
    name: 'Trade count in sidebar',
    description: 'Shows how many inbound trades you have next to Trade in the sidebar.',
    css: `
      .rk-trading-bubble { display: inline-flex; align-items: center; justify-content: center; min-width: 18px; height: 18px; margin-left: auto; padding: 0 5px; border-radius: 999px; background: var(--rk-accent); color: var(--rk-accent-text); font-family: var(--rk-font); font-size: 11px; font-weight: 700; line-height: 1; animation: rk-fade var(--rk-fast) ease both; }
      .left-nav a:has(> .rk-trading-bubble) { display: flex !important; align-items: center; }
    `,
    async run() {
      if (!await Rk.me()) return;
      const cached = () => {
        try {
          const saved = JSON.parse(sessionStorage.getItem('rk-trade-count') || 'null');
          return saved && Date.now() - saved.time < 60000 && Number.isSafeInteger(saved.count) && saved.count >= 0 ? saved.count : null;
        } catch {
          return null;
        }
      };
      let count = cached();
      if (count === null) {
        const json = await Rk.api.get('https://trades.roblox.com/v1/trades/inbound/count', { cache: 60000 }).catch(() => null);
        if (!json) return;
        count = Math.max(0, Math.floor(num(json.count) || 0));
        sessionStorage.setItem('rk-trade-count', JSON.stringify({ time: Date.now(), count }));
      }
      if (!count) return;
      Rk.observe('.left-nav a[href*="/trades"]', link => {
        if (link.querySelector('.rk-trading-bubble')) return;
        link.append(el('span', { class: 'rk-trading-bubble', title: fmt.plural(count, 'inbound trade') }, count > 99 ? '99+' : String(count)));
      });
    }
  });

  Rk.feature({
    id: 'trading.tradeAlerts',
    category: 'trading',
    name: 'Trade alerts',
    description: 'Sends a desktop notification when you get a new trade request.',
    default: false,
    run() {
      const last = Number(sessionStorage.getItem('rk-poll') || 0);
      if (Date.now() - last < 60000) return;
      sessionStorage.setItem('rk-poll', String(Date.now()));
      Rk.bg('poll-now').catch(() => {});
    }
  });

  Rk.feature({
    id: 'trading.tradeBadge',
    category: 'trading',
    name: 'Trade count on toolbar icon',
    description: 'Shows your inbound trade count on the Rola toolbar icon.',
    default: false,
    run() {
      const last = Number(sessionStorage.getItem('rk-poll') || 0);
      if (Date.now() - last < 60000) return;
      sessionStorage.setItem('rk-poll', String(Date.now()));
      Rk.bg('poll-now').catch(() => {});
    }
  });

  Rk.feature({
    id: 'trading.transactionsSummary',
    category: 'trading',
    name: 'Transactions summary',
    description: 'Shows your sales, purchases, stipends and other Robux totals for a chosen period.',
    pages: ['transactions'],
    async run() {
      const user = await Rk.me();
      if (!user) return;
      const body = el('div');
      let request = 0;
      const load = async timeFrame => {
        const ticket = ++request;
        body.style.opacity = body.childElementCount ? '0.5' : '';
        if (!body.childElementCount) body.append(el('div', { class: 'rk-skeleton', style: { height: '120px' } }));
        const json = await Rk.api.get(`https://economy.roblox.com/v2/users/${user.id}/transaction-totals?timeFrame=${timeFrame}&transactionType=summary`, { cache: 60000 }).catch(() => null);
        if (ticket !== request) return;
        body.style.opacity = '';
        if (!json || typeof json !== 'object') {
          body.replaceChildren(ui.empty('Could not load your totals'));
          return;
        }
        const total = key => money(Math.abs(num(json[key]) || 0));
        body.replaceChildren(ui.stats([
          ['Sales', total('salesTotal')],
          ['Purchases', total('purchasesTotal')],
          ['Premium stipends', total('premiumStipendsTotal')],
          ['Group payouts', total('groupPayoutsTotal')],
          ['Affiliate sales', total('affiliateSalesTotal')],
          ['Pending Robux', total('pendingRobuxTotal')],
          ['Incoming', total('incomingRobuxTotal')],
          ['Outgoing', total('outgoingRobuxTotal')]
        ]));
      };
      body.style.transition = 'opacity var(--rk-fast) ease';
      const picker = ui.select([['Day', 'Day'], ['Week', 'Week'], ['Month', 'Month'], ['Year', 'Year']], 'Month', value => load(['Day', 'Week', 'Month', 'Year'].includes(value) ? value : 'Month'));
      (await slot(2)).append(ui.section('Summary', body, { className: 'rk-trading-summary', actions: [picker] }));
      load('Month');
    }
  });

  const SPEND_TYPES = {
    2: 'T-shirts', 11: 'Shirts', 12: 'Pants', 8: 'Hats', 41: 'Hair', 42: 'Face accessories', 43: 'Neck accessories',
    44: 'Shoulder accessories', 45: 'Front accessories', 46: 'Back accessories', 47: 'Waist accessories', 18: 'Faces',
    17: 'Heads', 19: 'Gear', 61: 'Emotes', 64: 'Layered t-shirts', 65: 'Layered shirts', 66: 'Layered pants', 67: 'Jackets',
    68: 'Sweaters', 69: 'Shorts', 70: 'Shoes', 71: 'Shoes', 72: 'Dresses and skirts', 76: 'Eyebrows', 77: 'Eyelashes',
    79: 'Dynamic heads', 3: 'Audio', 10: 'Models', 13: 'Decals', 24: 'Animations'
  };

  Rk.feature({
    id: 'trading.spendingBreakdown',
    category: 'trading',
    name: 'Spending breakdown',
    description: 'Shows how much Robux you spent per game, item type and creator, based on your recent purchases.',
    default: false,
    pages: ['transactions'],
    css: `
      .rk-trading-spend .rk-table td:first-child { max-width: 360px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .rk-trading-spend-note { margin-top: 8px; font-size: 12px; color: var(--rk-muted); }
    `,
    async run() {
      const user = await Rk.me();
      if (!user) return;
      const body = el('div', null, el('div', { class: 'rk-skeleton', style: { height: '160px' } }));
      let view = 'game';
      let range = '30';
      let purchases = null;
      const types = new Map();
      const keyFor = purchase => {
        const { details, agent } = purchase;
        if (view === 'game') {
          const place = details.place && typeof details.place === 'object' ? details.place : null;
          if (place && Rk.isId(place.placeId)) return [`g${place.universeId || place.placeId}`, typeof place.name === 'string' && place.name ? place.name : 'Experience', `/games/${place.placeId}`];
          return ['shop', 'Avatar shop and other', null];
        }
        if (view === 'type') {
          if (details.type === 'GamePass') return ['pass', 'Game passes', null];
          if (details.type === 'DeveloperProduct') return ['product', 'Developer products', null];
          if (details.type === 'PrivateServer') return ['server', 'Private servers', null];
          if (details.type === 'Bundle') return ['bundle', 'Bundles', null];
          const label = details.type === 'Asset' ? SPEND_TYPES[types.get(details.id)] : null;
          return [`t${label || 'other'}`, label || 'Other items', null];
        }
        if (!agent || !Rk.isId(agent.id)) return ['unknown', 'Unknown seller', null];
        const group = agent.type === 'Group';
        return [`${group ? 'c' : 'u'}${agent.id}`, typeof agent.name === 'string' && agent.name ? agent.name : group ? 'Community' : 'User', group ? `/communities/${agent.id}` : `/users/${agent.id}/profile`];
      };
      const render = () => {
        if (!purchases) return;
        const since = range === 'all' ? 0 : Date.now() - Number(range) * DAY;
        const kept = purchases.filter(purchase => purchase.time >= since);
        if (!kept.length) {
          body.replaceChildren(ui.empty('No purchases in this period'));
          return;
        }
        const groups = new Map();
        for (const purchase of kept) {
          const [key, name, href] = keyFor(purchase);
          const entry = groups.get(key) || { name, href, count: 0, spent: 0 };
          entry.count += 1;
          entry.spent += purchase.spent;
          groups.set(key, entry);
        }
        const sorted = [...groups.values()].sort((a, b) => b.spent - a.spent);
        const label = view === 'game' ? 'Experience' : view === 'type' ? 'Item type' : 'Creator';
        body.replaceChildren(
          ui.stats([
            ['Total spent', money(sum(kept, purchase => purchase.spent))],
            ['Purchases', fmt.num(kept.length)],
            [view === 'game' ? 'Experiences' : view === 'type' ? 'Item types' : 'Creators', fmt.num(sorted.length)]
          ]),
          ui.table([{ label }, { label: 'Purchases', align: 'right' }, { label: 'Spent', align: 'right' }], sorted.slice(0, 25).map(entry => [
            entry.href ? ui.link(entry.href, entry.name) : entry.name,
            fmt.num(entry.count),
            money(entry.spent)
          ])),
          el('div', { class: 'rk-trading-spend-note' }, `Based on your last ${fmt.plural(purchases.length, 'purchase')}${sorted.length > 25 ? `, top 25 of ${fmt.num(sorted.length)} shown` : ''}`)
        );
      };
      const viewPicker = ui.select([['game', 'By experience'], ['type', 'By item type'], ['creator', 'By creator']], view, value => {
        view = ['game', 'type', 'creator'].includes(value) ? value : 'game';
        render();
      });
      const rangePicker = ui.select([['7', 'Last 7 days'], ['30', 'Last 30 days'], ['90', 'Last 90 days'], ['365', 'Last year'], ['all', 'All loaded']], range, value => {
        range = ['7', '30', '90', '365', 'all'].includes(value) ? value : '30';
        render();
      });
      (await slot(2)).append(ui.section('Spending breakdown', body, { className: 'rk-trading-spend', actions: [viewPicker, rangePicker] }));
      const rows = await Rk.api.paged(`https://economy.roblox.com/v2/users/${user.id}/transactions?transactionType=Purchase`, { max: 1000, limit: 100 }).catch(() => null);
      if (!Array.isArray(rows)) {
        body.replaceChildren(ui.empty('Could not load your purchases'));
        return;
      }
      purchases = rows.filter(row => row && typeof row === 'object' && row.currency && Number.isFinite(Number(row.currency.amount))).map(row => ({
        time: Date.parse(row.created) || 0,
        spent: Math.abs(Number(row.currency.amount)),
        details: row.details && typeof row.details === 'object' ? row.details : {},
        agent: row.agent && typeof row.agent === 'object' ? row.agent : null
      }));
      const assetIds = [...new Set(purchases.filter(purchase => purchase.details.type === 'Asset' && Rk.isId(purchase.details.id)).map(purchase => purchase.details.id))];
      for (let i = 0; i < assetIds.length; i += 100) {
        const json = await Rk.api.post('https://catalog.roblox.com/v1/catalog/items/details', { items: assetIds.slice(i, i + 100).map(id => ({ itemType: 'Asset', id })) }).catch(() => null);
        for (const item of json && Array.isArray(json.data) ? json.data : []) {
          if (item && Rk.isId(item.id) && Number.isInteger(item.assetType)) types.set(item.id, item.assetType);
        }
      }
      render();
    }
  });

  Rk.feature({
    id: 'trading.transactionsExport',
    category: 'trading',
    name: 'Transactions export',
    description: 'Exports up to 1,000 of your purchases or sales as a CSV file.',
    default: false,
    pages: ['transactions'],
    css: panelCss,
    async run() {
      const user = await Rk.me();
      if (!user) return;
      let type = 'Purchase';
      let busy = false;
      const button = ui.button('Export CSV', { variant: 'secondary', icon: 'download', onClick: async () => {
        if (busy) return;
        busy = true;
        button.disabled = true;
        ui.toast('Preparing your export');
        try {
          const rows = await Rk.api.paged(`https://economy.roblox.com/v2/users/${user.id}/transactions?transactionType=${type}`, { max: 1000, limit: 100 });
          if (!rows.length) {
            ui.toast('No transactions to export', { tone: 'warning' });
            return;
          }
          downloadCsv(`transactions-${type.toLowerCase()}.csv`, ['date', 'type', 'item', 'agent', 'amount', 'pending'], rows.filter(row => row && typeof row === 'object').map(row => [
            typeof row.created === 'string' ? row.created : '',
            type,
            row.details && typeof row.details.name === 'string' ? row.details.name : '',
            row.agent && typeof row.agent.name === 'string' ? row.agent.name : '',
            row.currency ? num(row.currency.amount) : '',
            row.isPending === true ? 'yes' : 'no'
          ]));
          ui.toast(`Exported ${fmt.plural(rows.length, 'transaction')}`, { tone: 'success' });
        } catch {
          ui.toast('Could not load your transactions', { tone: 'danger' });
        } finally {
          busy = false;
          button.disabled = false;
        }
      } });
      const picker = ui.select([['Purchase', 'Purchases'], ['Sale', 'Sales']], type, value => {
        type = value === 'Sale' ? 'Sale' : 'Purchase';
      });
      (await slot(1)).append(ui.panel(ui.row(el('span', { class: 'rk-strong' }, 'Export transactions'), [picker, button]), { className: 'rk-trading-panel rk-trading-export' }));
    }
  });

  Rk.feature({
    id: 'trading.robuxHistory',
    category: 'trading',
    name: 'Robux history',
    description: 'Saves your Robux balance once a day and shows how it changed.',
    default: false,
    pages: ['transactions'],
    css: chartCss,
    async run() {
      const user = await Rk.me();
      if (!user) return;
      const json = await Rk.api.get(`https://economy.roblox.com/v1/users/${user.id}/currency`, { cache: 60000 }).catch(() => null);
      const robux = num(json && json.robux);
      const saved = Rk.store.get('trading.robuxHistory', []);
      const day = today();
      const list = (Array.isArray(saved) ? saved : []).filter(entry => Array.isArray(entry) && isDay(entry[0]) && Number.isFinite(entry[1]) && entry[0] !== day);
      if (robux !== null && robux >= 0) list.push([day, robux]);
      list.sort((a, b) => a[0].localeCompare(b[0]));
      const kept = list.slice(-120);
      if (robux !== null) Rk.store.set('trading.robuxHistory', kept);
      if (!kept.length) return;
      const first = kept[0];
      const latest = kept[kept.length - 1];
      const change = latest[1] - first[1];
      const points = kept.map(entry => ({ time: Date.parse(`${entry[0]}T12:00:00Z`), value: entry[1] }));
      const content = points.length < 2
        ? el('div', { class: 'rk-muted' }, 'Tracking started today. Come back tomorrow to see a trend.')
        : chart(points, { height: 110, label: 'Robux balance by day', valueText: value => fmt.num(value), valueNode: value => ui.robux(value) });
      const actions = points.length < 2 ? [] : [ui.pill(`${signed(change)} since ${fmt.date(points[0].time)}`, toneOf(change))];
      (await slot(3)).append(ui.section('Robux history', content, { className: 'rk-trading-robux', actions }));
    }
  });

  Rk.feature({
    id: 'trading.devexCalculator',
    category: 'trading',
    name: 'DevEx calculator',
    description: 'Converts Robux to US dollars at the DevEx rate.',
    default: false,
    pages: ['transactions'],
    css: calcCss,
    async run() {
      const usd = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' });
      const result = el('div');
      const update = text => {
        const robux = Math.max(0, Math.floor(Number(text)) || 0);
        result.replaceChildren(ui.stats([
          ['You get', usd.format(robux * 0.0038)],
          ['Eligible', robux >= 30000 ? 'Yes' : robux ? `${fmt.num(30000 - robux)} Robux short` : '-']
        ]));
      };
      const field = ui.input({ type: 'number', placeholder: 'Robux amount', maxLength: 12, onInput: update });
      field.min = '0';
      update('');
      (await slot(4)).append(ui.section('DevEx calculator', [
        el('div', { class: 'rk-trading-calc' }, field, result),
        el('div', { class: 'rk-trading-note' }, 'Rate is $0.0038 per Robux. 30,000 earned Robux is the minimum to cash out.')
      ], { className: 'rk-trading-devex' }));
    }
  });

  Rk.feature({
    id: 'trading.premiumCheck',
    category: 'trading',
    name: 'Premium check',
    description: 'Tells you on the trades page when trading needs Premium.',
    pages: ['trades'],
    css: panelCss + `
      .rk-trading-premium { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px; }
    `,
    async run() {
      const user = await Rk.me();
      if (!user) return;
      const premium = await Rk.api.get(`https://premiumfeatures.roblox.com/v1/users/${user.id}/validate-membership`, { cache: 300000 }).catch(() => null);
      if (premium !== false) return;
      (await slot(0)).append(ui.panel([
        el('span', { class: 'rk-muted' }, 'Trading needs Premium'),
        ui.link('/premium/membership', 'Get Premium')
      ], { className: 'rk-trading-panel rk-trading-premium' }));
    }
  });

  Rk.feature({
    id: 'trading.rolimonsLinks',
    category: 'trading',
    name: 'Rolimons links',
    description: 'Adds Rolimons links to the market value and profile collectibles headers.',
    pages: ['item', 'profile'],
    run() {
      const add = (selector, href) => Rk.observe(selector, actions => {
        if (actions.querySelector('.rk-trading-rolimons')) return;
        const button = ui.button('Rolimons', { variant: 'ghost', icon: 'external', href, target: '_blank' });
        button.classList.add('rk-trading-rolimons');
        actions.append(button);
      });
      const { type, kind, id } = Rk.page();
      if (!Rk.isId(id)) return;
      if (type === 'item' && kind === 'asset') add('.rk-trading-value .rk-section-actions', `https://www.rolimons.com/item/${id}`);
      if (type === 'profile') add('.rk-trading-profile .rk-section-actions', `https://www.rolimons.com/player/${id}`);
    }
  });

  Rk.feature({
    id: 'trading.valueTooltips',
    category: 'trading',
    name: 'Value tooltips',
    description: 'Shows value, RAP, demand and trend when you hover a card value.',
    default: false,
    css: cardCss + `
      .rk-trading-card[data-rk-tip] { cursor: default; }
      .rk-trading-card[data-rk-tip]::after { left: 0; white-space: pre-line; transform: translate(0, 4px); }
      .rk-trading-card[data-rk-tip]:hover::after { transform: translate(0, 0); }
    `,
    run() {
      return eachCard((line, entry) => {
        if (line.hasAttribute('data-rk-tip')) return;
        ui.tip(line, [`Value ${fmt.num(entry.value)}`, `RAP ${fmt.num(entry.rap)}`, `Demand ${entry.demand || 'unknown'}`, `Trend ${entry.trend || 'unknown'}`].join('\n'));
      });
    }
  });
})();
