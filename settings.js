(() => {
  const { el, ui, icon } = Rk;

  let panel = null;
  let activeCategory = Rk.categories[0].id;
  let lastScroll = 0;
  let query = '';
  let localChange = false;
  let theme = Rk.store.get('settings.theme', 'sakura') === 'classic' ? 'classic' : 'sakura';

  const mascotSvg = `
    <svg viewBox="0 0 200 250" width="150" height="188" aria-hidden="true">
      <g class="rk-mascot-bubble">
        <rect x="118" y="2" width="56" height="28" rx="14" fill="#ffffff" stroke="#ff7eb6" stroke-width="2"/>
        <path d="M134 29 L128 38 L142 29 Z" fill="#ffffff" stroke="#ff7eb6" stroke-width="2" stroke-linejoin="round"/>
        <rect x="131" y="26" width="12" height="4" fill="#ffffff"/>
        <text x="146" y="21" text-anchor="middle" font-size="14" font-weight="700" font-family="Arial, sans-serif" fill="#ff5fa2">hi!</text>
      </g>
      <g class="rk-mascot-figure">
        <path class="rk-mascot-tail rk-mascot-tail-l" d="M50 74 C20 98 14 150 26 204 C30 220 46 222 46 205 C40 160 50 120 62 92 Z" fill="#f78fc0"/>
        <path class="rk-mascot-tail rk-mascot-tail-r" d="M150 74 C180 98 186 150 174 204 C170 220 154 222 154 205 C160 160 150 120 138 92 Z" fill="#f78fc0"/>
        <path d="M44 96 C40 46 70 22 100 22 C130 22 160 46 156 96 L154 136 C140 146 60 146 46 136 Z" fill="#ec79b1"/>
        <rect x="86" y="222" width="10" height="20" rx="4" fill="#ffe6dc"/>
        <rect x="104" y="222" width="10" height="20" rx="4" fill="#ffe6dc"/>
        <ellipse cx="90" cy="243" rx="9" ry="5" fill="#d9468f"/>
        <ellipse cx="110" cy="243" rx="9" ry="5" fill="#d9468f"/>
        <path d="M80 154 C70 170 66 186 66 200" stroke="#f08fbd" stroke-width="15" stroke-linecap="round" fill="none"/>
        <path d="M80 154 C70 170 66 186 66 200" stroke="#ffc2dc" stroke-width="11" stroke-linecap="round" fill="none"/>
        <circle cx="66" cy="204" r="6" fill="#ffe6dc"/>
        <path d="M78 148 C88 144 112 144 122 148 L142 222 C120 232 80 232 58 222 Z" fill="#fff4f8" stroke="#f3a3c8" stroke-width="2" stroke-linejoin="round"/>
        <path d="M62 210 C84 218 116 218 138 210" stroke="#ff7eb6" stroke-width="3" fill="none" stroke-linecap="round"/>
        <path d="M84 148 L100 162 L116 148" stroke="#ff7eb6" stroke-width="3" fill="none" stroke-linejoin="round"/>
        <path d="M100 162 L88 155 L88 170 Z M100 162 L112 155 L112 170 Z" fill="#ff5fa2"/>
        <circle cx="100" cy="162" r="3.5" fill="#e04589"/>
        <g class="rk-mascot-arm">
          <g class="rk-mascot-wave">
            <path d="M120 154 C130 170 134 186 134 200" stroke="#f08fbd" stroke-width="15" stroke-linecap="round" fill="none"/>
            <path d="M120 154 C130 170 134 186 134 200" stroke="#ffc2dc" stroke-width="11" stroke-linecap="round" fill="none"/>
            <circle cx="134" cy="204" r="6" fill="#ffe6dc"/>
          </g>
        </g>
        <rect x="93" y="132" width="14" height="16" fill="#ffd9cc"/>
        <ellipse cx="100" cy="94" rx="48" ry="44" fill="#ffe9df"/>
        <g class="rk-mascot-eyes">
          <ellipse cx="80" cy="100" rx="8.5" ry="11" fill="#4b2453"/>
          <ellipse cx="80" cy="104" rx="6" ry="6.5" fill="#c55aa8"/>
          <circle cx="77" cy="96" r="3" fill="#ffffff"/>
          <circle cx="83" cy="106" r="1.4" fill="#ffffff"/>
          <ellipse cx="120" cy="100" rx="8.5" ry="11" fill="#4b2453"/>
          <ellipse cx="120" cy="104" rx="6" ry="6.5" fill="#c55aa8"/>
          <circle cx="117" cy="96" r="3" fill="#ffffff"/>
          <circle cx="123" cy="106" r="1.4" fill="#ffffff"/>
        </g>
        <path d="M71 92 Q80 85 89 91 M111 91 Q120 85 129 92" stroke="#4b2453" stroke-width="2.5" fill="none" stroke-linecap="round"/>
        <ellipse cx="68" cy="116" rx="7" ry="4" fill="#ff8fb8" opacity="0.55"/>
        <ellipse cx="132" cy="116" rx="7" ry="4" fill="#ff8fb8" opacity="0.55"/>
        <path d="M95 117 Q100 122 105 117" stroke="#c4466f" stroke-width="2" fill="none" stroke-linecap="round"/>
        <path d="M52 86 C44 104 46 124 54 138 C58 122 60 104 60 90 Z" fill="#f78fc0"/>
        <path d="M148 86 C156 104 154 124 146 138 C142 122 140 104 140 90 Z" fill="#f78fc0"/>
        <path d="M52 92 C50 52 76 36 100 36 C124 36 150 52 148 92 C142 78 134 68 126 80 C120 64 110 60 102 74 C96 60 84 62 78 78 C70 66 58 74 52 92 Z" fill="#f78fc0"/>
        <path d="M76 50 Q100 40 124 50" stroke="#ffffff" stroke-width="3" opacity="0.45" fill="none" stroke-linecap="round"/>
        <g transform="translate(52 76)" fill="#ffffff">
          <circle cx="0" cy="-4" r="3.5"/><circle cx="3.8" cy="-1.2" r="3.5"/><circle cx="2.4" cy="3.2" r="3.5"/><circle cx="-2.4" cy="3.2" r="3.5"/><circle cx="-3.8" cy="-1.2" r="3.5"/>
          <circle r="2" fill="#ff5fa2"/>
        </g>
        <g transform="translate(148 76)" fill="#ffffff">
          <circle cx="0" cy="-4" r="3.5"/><circle cx="3.8" cy="-1.2" r="3.5"/><circle cx="2.4" cy="3.2" r="3.5"/><circle cx="-2.4" cy="3.2" r="3.5"/><circle cx="-3.8" cy="-1.2" r="3.5"/>
          <circle r="2" fill="#ff5fa2"/>
        </g>
      </g>
    </svg>
  `;

  const categoryName = id => {
    const category = Rk.categories.find(item => item.id === id);
    return category ? category.name : id;
  };

  const featuresIn = id => Rk.features.filter(entry => entry.category === id);
  const countEnabled = list => list.filter(entry => Rk.isEnabled(entry.id)).length;

  const matchesQuery = (entry, text) => entry.name.toLowerCase().includes(text) || entry.description.toLowerCase().includes(text) || categoryName(entry.category).toLowerCase().includes(text);

  const withLocalChange = action => {
    localChange = true;
    try {
      return action();
    } finally {
      localChange = false;
    }
  };

  const optionControl = (entry, def) => {
    const value = Rk.option(entry.id, def.key);
    if (def.type === 'toggle') {
      return ui.toggle(value, next => withLocalChange(() => Rk.setOption(entry.id, def.key, next)), { label: def.label });
    }
    if (def.type === 'select') {
      return ui.select(def.choices, value, next => withLocalChange(() => Rk.setOption(entry.id, def.key, next)));
    }
    if (def.type === 'number') {
      const field = ui.input({ type: 'number', value: String(value) });
      if (def.min != null) field.min = String(def.min);
      if (def.max != null) field.max = String(def.max);
      field.step = String(def.step || 1);
      field.addEventListener('change', () => {
        const next = Number(field.value);
        if (!withLocalChange(() => Rk.setOption(entry.id, def.key, next))) {
          field.value = String(Rk.option(entry.id, def.key));
          ui.toast(def.max == null ? `Pick a number of at least ${def.min}` : `Pick a number between ${def.min} and ${def.max}`, { tone: 'warning' });
        }
      });
      return field;
    }
    if (def.type === 'text') {
      const field = ui.input({ value, maxLength: def.maxLength || 200, placeholder: def.placeholder || '' });
      field.addEventListener('change', () => withLocalChange(() => Rk.setOption(entry.id, def.key, field.value.trim())));
      return field;
    }
    if (def.type === 'color') {
      const field = el('input', { type: 'color', 'aria-label': def.label });
      field.value = value;
      field.addEventListener('change', () => withLocalChange(() => Rk.setOption(entry.id, def.key, field.value)));
      return field;
    }
    return null;
  };

  const showReload = () => {
    if (!panel || panel.banner.isConnected) return;
    panel.main.insertBefore(panel.banner, panel.foot);
  };

  const updateCounts = () => {
    if (!panel) return;
    for (const [id, node] of panel.counts) {
      const list = featuresIn(id);
      node.textContent = `${countEnabled(list)}/${list.length}`;
    }
    panel.total.textContent = `${countEnabled(Rk.features)} of ${Rk.features.length} features on`;
  };

  const featureRow = (entry, showCategory) => {
    const options = entry.options.length
      ? el('div', { class: 'rk-setting-options' }, entry.options.map(def => el('label', { class: 'rk-setting-option' }, el('span', null, def.label), optionControl(entry, def))))
      : null;
    const syncOptions = () => {
      if (options) options.classList.toggle('rk-hidden', !Rk.isEnabled(entry.id));
    };
    const switchNode = ui.toggle(Rk.isEnabled(entry.id), next => {
      const result = withLocalChange(() => Rk.setEnabled(entry.id, next));
      if (result.needsReload) showReload();
      syncOptions();
      updateCounts();
    }, { label: entry.name });
    syncOptions();
    return el('div', { class: 'rk-setting', dataset: { feature: entry.id } },
      el('div', { class: 'rk-setting-top' },
        el('div', { class: 'rk-setting-text' },
          el('div', { class: 'rk-setting-name' }, entry.name, showCategory ? ui.pill(categoryName(entry.category)) : null),
          entry.description ? el('div', { class: 'rk-setting-desc' }, entry.description) : null
        ),
        switchNode
      ),
      options
    );
  };

  const setAll = value => {
    let reload = false;
    withLocalChange(() => {
      for (const entry of featuresIn(activeCategory)) {
        if (Rk.setEnabled(entry.id, value).needsReload) reload = true;
      }
    });
    if (reload) showReload();
    renderList({ keepScroll: true });
    updateCounts();
  };

  const renderNav = () => {
    for (const [id, node] of panel.navItems) node.setAttribute('aria-current', !query.trim() && id === activeCategory ? 'true' : 'false');
  };

  const renderList = ({ keepScroll = false } = {}) => {
    if (!panel) return;
    const scroll = panel.list.scrollTop;
    const text = query.trim().toLowerCase();
    const category = Rk.categories.find(item => item.id === activeCategory);
    const items = text ? Rk.features.filter(entry => matchesQuery(entry, text)) : featuresIn(activeCategory);
    panel.title.textContent = text ? 'Search results' : category.name;
    panel.subtitle.textContent = text ? `${items.length} ${items.length === 1 ? 'feature matches' : 'features match'} "${query.trim()}"` : category.description;
    panel.bulk.classList.toggle('rk-hidden', Boolean(text));
    panel.list.replaceChildren(...(items.length ? items.map(entry => featureRow(entry, Boolean(text))) : [ui.empty('Nothing matches that search')]));
    panel.list.scrollTop = keepScroll ? scroll : 0;
    renderNav();
  };

  const exportFile = () => {
    const blob = new Blob([Rk.exportSettings()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = el('a', { download: 'rola-settings.json' });
    anchor.href = url;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const importFile = () => {
    const picker = el('input', { type: 'file', accept: 'application/json,.json' });
    picker.addEventListener('change', async () => {
      const file = picker.files && picker.files[0];
      if (!file) return;
      if (file.size > 512 * 1024) {
        ui.toast('That file is too large', { tone: 'danger' });
        return;
      }
      const text = await file.text();
      if (withLocalChange(() => Rk.importSettings(text))) {
        ui.toast('Settings imported', { tone: 'success' });
        renderList();
        updateCounts();
        showReload();
      } else {
        ui.toast('That file is not a Rola settings export', { tone: 'danger' });
      }
    }, { once: true });
    picker.click();
  };

  const resetAll = async () => {
    const confirmed = await ui.confirm('Every feature goes back to its default state and all options are cleared.', { title: 'Reset settings', confirmLabel: 'Reset', danger: true });
    if (!confirmed) return;
    withLocalChange(() => Rk.resetSettings());
    renderList();
    updateCounts();
    showReload();
    ui.toast('Settings reset', { tone: 'success' });
  };

  const close = () => {
    if (!panel) return;
    const current = panel;
    panel = null;
    lastScroll = current.list.scrollTop;
    Rk.store.set('settings.view', { category: activeCategory, scroll: lastScroll });
    document.documentElement.style.overflow = current.previousOverflow;
    current.mascot.classList.remove('rk-mascot-shown');
    current.backdrop.classList.remove('rk-modal-open');
    current.backdrop.addEventListener('transitionend', () => current.backdrop.remove(), { once: true });
    setTimeout(() => current.backdrop.remove(), 400);
  };

  const build = () => {
    const search = ui.input({ placeholder: 'Search features', maxLength: 80, onInput: value => {
      query = value;
      renderList();
    } });
    const counts = new Map();
    const navItems = new Map();
    const nav = el('nav', { class: 'rk-settings-nav', 'aria-label': 'Feature categories' }, Rk.categories.map(category => {
      const count = el('span', { class: 'rk-settings-nav-count' });
      counts.set(category.id, count);
      const item = el('button', { type: 'button', class: 'rk-settings-nav-item', onclick: () => {
        activeCategory = category.id;
        query = '';
        search.value = '';
        renderList();
      } }, el('span', null, category.name), count);
      navItems.set(category.id, item);
      return item;
    }));
    const total = el('div');
    const themePicker = ui.select([['sakura', 'Sakura'], ['classic', 'Classic']], theme, next => {
      theme = next === 'classic' ? 'classic' : 'sakura';
      Rk.store.set('settings.theme', theme);
      frame.classList.toggle('rk-sakura', theme === 'sakura');
    });
    const title = el('h2', { class: 'rk-settings-title' });
    const subtitle = el('p', { class: 'rk-settings-subtitle' });
    const bulk = el('div', { class: 'rk-inline' },
      ui.button('All on', { variant: 'ghost', onClick: () => setAll(true) }),
      ui.button('All off', { variant: 'ghost', onClick: () => setAll(false) })
    );
    const list = el('div', { class: 'rk-settings-list' });
    const banner = el('div', { class: 'rk-settings-banner' },
      el('span', null, 'Some changes finish applying after a reload'),
      ui.button('Reload page', { variant: 'primary', onClick: () => location.reload() })
    );
    const reset = ui.button('Reset', { variant: 'ghost', onClick: resetAll });
    reset.classList.add('rk-settings-reset');
    const foot = el('div', { class: 'rk-settings-foot' },
      ui.button('Export', { variant: 'ghost', icon: 'download', onClick: exportFile }),
      ui.button('Import', { variant: 'ghost', icon: 'plus', onClick: importFile }),
      reset,
      ui.button('Done', { variant: 'primary', size: 'md', onClick: close })
    );
    const main = el('section', { class: 'rk-settings-main' },
      el('div', { class: 'rk-settings-head' },
        el('div', null, title, subtitle),
        el('div', { class: 'rk-settings-head-actions' }, bulk, ui.button('', { variant: 'ghost', size: 'md', icon: 'close', title: 'Close', onClick: close }))
      ),
      list,
      foot
    );
    const mascot = el('div', { class: 'rk-mascot' });
    mascot.innerHTML = mascotSvg;
    const dialog = el('div', { class: 'rk-settings', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Rola settings', tabindex: '-1' },
      el('div', { class: 'rk-settings-titlebar' },
        el('span', null, 'Rola Settings'),
        el('button', { type: 'button', class: 'rk-settings-titlebar-close', 'aria-label': 'Close', onclick: close }, icon('close', 16))
      ),
      el('aside', { class: 'rk-settings-side' },
        el('div', { class: 'rk-settings-brand' }, el('span', { class: 'rk-settings-brand-name' }, 'Rola')),
        el('div', { class: 'rk-settings-search' }, icon('search', 16), search),
        nav,
        mascot,
        el('div', { class: 'rk-settings-side-footer' }, total, el('label', { class: 'rk-settings-theme' }, el('span', null, 'Theme'), themePicker))
      ),
      main
    );
    const frame = el('div', { class: `rk-settings-frame${theme === 'sakura' ? ' rk-sakura' : ''}` }, dialog);
    const backdrop = el('div', { class: 'rk-modal-backdrop', onmousedown: event => {
      if (event.target === backdrop) close();
    } }, frame);
    backdrop.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        close();
      }
    });
    return { backdrop, dialog, mascot, search, counts, navItems, total, title, subtitle, bulk, list, banner, foot, main, previousOverflow: '' };
  };

  const open = () => {
    if (panel) return;
    const saved = Rk.store.get('settings.view', null);
    if (saved && Rk.categories.some(item => item.id === saved.category)) {
      activeCategory = saved.category;
      lastScroll = Number(saved.scroll) || 0;
    }
    panel = build();
    panel.previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    renderList();
    updateCounts();
    document.body.append(panel.backdrop);
    panel.list.scrollTop = lastScroll;
    requestAnimationFrame(() => {
      if (!panel) return;
      panel.backdrop.classList.add('rk-modal-open');
      panel.mascot.classList.add('rk-mascot-shown');
      panel.search.focus({ preventScroll: true });
    });
  };

  const toggleOpen = () => {
    if (panel) close();
    else Rk.ready.then(open);
  };

  Rk.onSettings(() => {
    if (!panel || localChange) return;
    renderList({ keepScroll: true });
    updateCounts();
  });

  Rk.observe('ul.navbar-right', navbar => {
    if (navbar.querySelector('.rk-nav-settings')) return;
    const trigger = el('a', {
      class: 'rk-nav-button',
      role: 'button',
      tabindex: '0',
      'aria-label': 'Rola settings',
      'data-rk-tip-pos': 'below',
      onclick: event => {
        event.preventDefault();
        toggleOpen();
      },
      onkeydown: event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          toggleOpen();
        }
      }
    }, icon('sliders', 22));
    ui.tip(trigger, 'Rola settings');
    navbar.prepend(el('li', { class: 'navbar-icon-item rk-nav-item rk-nav-settings' }, trigger));
  });

  Rk.observe('#settings-popover-menu', menuList => {
    if (menuList.querySelector('.rk-menu-entry')) return;
    menuList.prepend(el('li', { class: 'rk-menu-entry' }, el('a', {
      class: 'rbx-menu-item',
      role: 'button',
      onclick: event => {
        event.preventDefault();
        Rk.ready.then(open);
      }
    }, 'Rola settings')));
  });

  Rk.hotkey('alt+k', toggleOpen);

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (sender.id !== chrome.runtime.id || !message || message.type !== 'open-settings') return false;
    Promise.all([Rk.ready, Rk.domReady]).then(open);
    sendResponse(true);
    return false;
  });

  if (location.hash === '#rk-settings') {
    Promise.all([Rk.ready, Rk.domReady]).then(() => {
      history.replaceState(history.state, '', location.pathname + location.search);
      open();
    });
  }

  Rk.start();
})();
