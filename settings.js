(() => {
  const { el, ui, icon } = Rk;

  let panel = null;
  let dragOffset = { x: 0, y: 0 };
  let activeCategory = Rk.categories[0].id;
  let lastScroll = 0;
  let query = '';
  let localChange = false;
  const defaultMascot = chrome.runtime.getURL('mascot.png');

  const directImageLink = text => {
    let link;
    try {
      link = new URL(text);
    } catch {
      return null;
    }
    const wrapped = link.searchParams.get('imgurl') || link.searchParams.get('mediaurl');
    if (wrapped) return directImageLink(wrapped);
    return link.protocol === 'https:' && /^https:\/\/[^\s"'()]+$/i.test(link.href) ? link.href : null;
  };

  const canLoad = src => new Promise(resolve => {
    const probe = new Image();
    probe.onload = () => resolve(probe.naturalWidth > 0);
    probe.onerror = () => resolve(false);
    probe.src = src;
  });

  const themeFields = [
    ['title', 'Title bar', '--rk-theme-title', '#ff6fae'],
    ['titleText', 'Title text', '--rk-theme-title-text', '#ffffff'],
    ['border', 'Window border', '--rk-theme-border', '#ff7eb6'],
    ['bg', 'Background', '--rk-bg', '#fff0f5'],
    ['surface', 'Sidebar', '--rk-surface', '#ffe3ee'],
    ['card', 'Cards', '--rk-theme-card', '#fff7fa'],
    ['input', 'Inputs', '--rk-theme-input', '#ffffff'],
    ['accent', 'Accent', '--rk-accent', '#ff5fa2'],
    ['heading', 'Headings', '--rk-text-strong', '#3d2533'],
    ['text', 'Text', '--rk-text', '#5a3a4a'],
    ['muted', 'Muted text', '--rk-muted', '#a3708b'],
    ['line', 'Lines', '--rk-border', '#f6b0cf']
  ];

  const themeFlags = [
    ['showMascot', 'Show mascot image', true],
    ['glow', 'Window glow', false],
    ['grid', 'Grid background', false],
    ['sweep', 'Title bar light sweep', false],
    ['upper', 'Uppercase titles', false],
    ['hoverGlow', 'Glow on hover', false]
  ];

  const themeFonts = {
    default: ['Roblox', ''],
    rounded: ['Rounded', 'ui-rounded, "SF Pro Rounded", system-ui, sans-serif'],
    system: ['System', 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'],
    mono: ['Monospace', 'ui-monospace, SFMono-Regular, Consolas, monospace'],
    serif: ['Serif', 'Georgia, "Times New Roman", serif']
  };

  const defaultStyle = { showMascot: true, glow: false, grid: false, sweep: false, upper: false, hoverGlow: false, radius: 6, font: 'default' };

  const builtInThemes = {
    sakura: {
      name: 'Sakura',
      colors: Object.fromEntries(themeFields.map(([key, , , fallback]) => [key, fallback])),
      mascot: '',
      style: defaultStyle
    },
    futuristic: {
      name: 'Futuristic',
      colors: {
        title: '#0a1424',
        titleText: '#5ef2ff',
        border: '#22d3ee',
        bg: '#070b14',
        surface: '#0b1322',
        card: '#0d1828',
        input: '#060a12',
        accent: '#22d3ee',
        heading: '#e6fbff',
        text: '#b6c8d9',
        muted: '#6b85a0',
        line: '#1c3a52'
      },
      mascot: '',
      style: { ...defaultStyle, showMascot: false, glow: true, grid: true, sweep: true, upper: true, hoverGlow: true }
    }
  };

  const isColor = value => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);

  const luminance = hex => {
    const [r, g, b] = [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16) / 255);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };

  const cleanTheme = raw => {
    if (!raw || typeof raw !== 'object' || !raw.colors || typeof raw.colors !== 'object') return null;
    const name = typeof raw.name === 'string' ? raw.name.trim().slice(0, 40) : '';
    if (!name) return null;
    const colors = {};
    for (const [key, , , fallback] of themeFields) colors[key] = isColor(raw.colors[key]) ? raw.colors[key].toLowerCase() : fallback;
    const mascot = typeof raw.mascot === 'string' && raw.mascot.trim() ? directImageLink(raw.mascot.trim()) || '' : '';
    const source = raw.style && typeof raw.style === 'object' ? raw.style : {};
    const style = {};
    for (const [key, , fallback] of themeFlags) style[key] = typeof source[key] === 'boolean' ? source[key] : fallback;
    style.radius = Number.isInteger(source.radius) && source.radius >= 0 && source.radius <= 16 ? source.radius : defaultStyle.radius;
    style.font = Object.hasOwn(themeFonts, source.font) ? source.font : defaultStyle.font;
    return { name, colors, mascot, style };
  };

  const savedThemes = () => {
    const list = Rk.store.get('settings.themes', []);
    if (!Array.isArray(list)) return [];
    return list.slice(0, 30).map(item => {
      const clean = cleanTheme(item);
      return clean && typeof item.id === 'string' && /^t\d+$/.test(item.id) ? { id: item.id, ...clean } : null;
    }).filter(Boolean);
  };

  const themeChoices = () => [
    ...Object.entries(builtInThemes).map(([id, item]) => [id, item.name]),
    ['classic', 'Classic'],
    ...savedThemes().map(item => [item.id, item.name])
  ];

  const storedTheme = () => {
    const saved = Rk.store.get('settings.theme', 'classic');
    return themeChoices().some(([id]) => id === saved) ? saved : 'classic';
  };

  let theme = 'classic';

  const activeTheme = () => savedThemes().find(item => item.id === theme) || null;
  const currentTheme = () => builtInThemes[theme] || activeTheme();

  const themeCode = item => {
    const bytes = new TextEncoder().encode(JSON.stringify({ name: item.name, colors: item.colors, mascot: item.mascot, style: item.style }));
    return `rola-theme:${btoa(String.fromCharCode(...bytes))}`;
  };

  const readThemeCode = code => {
    const match = /^rola-theme:([A-Za-z0-9+/=]+)$/.exec(code.trim());
    if (!match) return null;
    try {
      const bytes = Uint8Array.from(atob(match[1]), char => char.charCodeAt(0));
      return cleanTheme(JSON.parse(new TextDecoder().decode(bytes)));
    } catch {
      return null;
    }
  };

  const applyTheme = (frame, preview) => {
    const item = preview || currentTheme();
    frame.className = 'rk-settings-frame';
    frame.style.cssText = '';
    if (!item) return;
    frame.classList.add('rk-sakura');
    for (const [key] of themeFlags) frame.classList.toggle(`rk-fx-${key}`, item.style[key]);
    const dark = luminance(item.colors.bg) < 0.4;
    frame.classList.toggle('rk-fx-dark', dark);
    for (const [key, , variable] of themeFields) frame.style.setProperty(variable, item.colors[key]);
    frame.style.setProperty('--rk-accent-text', luminance(item.colors.accent) > 0.6 ? '#0b0b0f' : '#ffffff');
    frame.style.setProperty('--rk-radius-l', `${item.style.radius}px`);
    frame.style.setProperty('--rk-radius', `${Math.round(item.style.radius * 0.66)}px`);
    const font = themeFonts[item.style.font][1];
    if (font) frame.style.setProperty('--rk-font', font);
  };

  const mascotUrl = () => {
    const custom = activeTheme();
    if (custom && custom.mascot) return custom.mascot;
    const saved = Rk.store.get('settings.mascot', '');
    return typeof saved === 'string' && /^https:\/\/[^\s"'()]+$/i.test(saved) ? saved : defaultMascot;
  };

  const saveMascot = link => {
    const custom = activeTheme();
    if (custom) Rk.store.set('settings.themes', savedThemes().map(item => (item.id === custom.id ? { ...item, mascot: link } : item)));
    else Rk.store.set('settings.mascot', link);
  };

  const buildMascot = () => {
    const image = el('img', { class: 'rk-mascot-img', alt: '', draggable: 'false' });
    image.addEventListener('error', () => {
      if (image.src !== defaultMascot) image.src = defaultMascot;
    });
    image.src = mascotUrl();
    const mascot = el('div', { class: 'rk-mascot', title: 'Double click to change the image' }, image);
    mascot.addEventListener('dblclick', async () => {
      const custom = activeTheme();
      const current = custom ? custom.mascot : Rk.store.get('settings.mascot', '');
      const next = await ui.prompt('Paste a direct image or gif link, or leave it empty for the default.', { title: 'Mascot image', placeholder: 'https://', value: typeof current === 'string' ? current : '', maxLength: 2000 });
      if (next === null) return;
      if (!next.trim()) {
        saveMascot('');
        image.src = mascotUrl();
        return;
      }
      const link = directImageLink(next.trim());
      if (!link) {
        ui.toast('That has to be an https image link', { tone: 'warning' });
        return;
      }
      if (!(await canLoad(link))) {
        ui.toast('That image could not load, right click the image and use copy image address', { tone: 'danger', duration: 6000 });
        return;
      }
      saveMascot(link);
      image.src = link;
    });
    return mascot;
  };

  const setTheme = next => {
    theme = next;
    Rk.store.set('settings.theme', theme);
    if (!panel) return;
    panel.themePicker.replaceChildren(...themeChoices().map(([value, label]) => el('option', { value }, label)));
    panel.themePicker.value = theme;
    panel.themeEdit.textContent = activeTheme() ? 'Edit theme' : 'New theme';
    applyTheme(panel.frame);
    panel.mascot.firstChild.src = mascotUrl();
  };

  const editTheme = () => {
    if (!panel) return;
    const editing = activeTheme();
    const base = editing || builtInThemes[theme] || builtInThemes.sakura;
    const draft = { name: editing ? base.name : 'My theme', colors: { ...base.colors }, mascot: base.mascot, style: { ...base.style } };
    let saved = false;
    const preview = () => {
      if (panel) applyTheme(panel.frame, draft);
    };
    const nameField = ui.input({ value: draft.name, maxLength: 40, onInput: value => {
      draft.name = value;
    } });
    const mascotField = ui.input({ value: draft.mascot, placeholder: 'Mascot image link, empty uses the default', maxLength: 2000, className: 'rk-theme-mascot', onInput: value => {
      draft.mascot = value;
    } });
    const pickers = new Map();
    const grid = el('div', { class: 'rk-theme-grid' }, themeFields.map(([key, label]) => {
      const picker = el('input', { type: 'color', 'aria-label': label });
      picker.value = draft.colors[key];
      picker.addEventListener('input', () => {
        draft.colors[key] = picker.value;
        preview();
      });
      pickers.set(key, picker);
      return el('label', { class: 'rk-theme-field' }, picker, el('span', null, label));
    }));
    const flagToggles = new Map();
    const syncMascotField = () => mascotField.classList.toggle('rk-hidden', !draft.style.showMascot);
    const flags = el('div', { class: 'rk-theme-grid' }, themeFlags.map(([key, label]) => {
      const toggle = ui.toggle(draft.style[key], next => {
        draft.style[key] = next;
        syncMascotField();
        preview();
      }, { label });
      flagToggles.set(key, toggle);
      return el('div', { class: 'rk-theme-field' }, toggle, el('span', null, label));
    }));
    const fontPicker = ui.select(Object.entries(themeFonts).map(([key, [label]]) => [key, label]), draft.style.font, next => {
      draft.style.font = next;
      preview();
    });
    const radiusPicker = el('input', { type: 'range', min: '0', max: '16', step: '1', 'aria-label': 'Corner roundness' });
    radiusPicker.value = String(draft.style.radius);
    radiusPicker.addEventListener('input', () => {
      draft.style.radius = Number(radiusPicker.value);
      preview();
    });
    syncMascotField();
    const fill = item => {
      draft.name = item.name;
      draft.mascot = item.mascot;
      draft.style = { ...item.style };
      nameField.value = item.name;
      mascotField.value = item.mascot;
      for (const [key, picker] of pickers) {
        draft.colors[key] = item.colors[key];
        picker.value = item.colors[key];
      }
      for (const [key, toggle] of flagToggles) toggle.setAttribute('aria-checked', draft.style[key] ? 'true' : 'false');
      fontPicker.value = draft.style.font;
      radiusPicker.value = String(draft.style.radius);
      syncMascotField();
      preview();
    };
    const copyCode = () => {
      const clean = cleanTheme(draft);
      if (!clean) {
        ui.toast('Give the theme a name first', { tone: 'warning' });
        return;
      }
      ui.copy(themeCode(clean), 'Theme code copied, anyone with Rola can import it');
    };
    const importCode = async () => {
      const code = await ui.prompt('Paste a Rola theme code someone shared with you.', { title: 'Import theme', placeholder: 'rola-theme:', maxLength: 20000, confirmLabel: 'Import' });
      if (code === null) return;
      const item = readThemeCode(code);
      if (!item) {
        ui.toast('That is not a Rola theme code', { tone: 'danger' });
        return;
      }
      fill(item);
      ui.toast('Theme loaded, press save to keep it', { tone: 'success' });
    };
    const store = asNew => {
      const clean = cleanTheme(draft);
      if (!clean) {
        ui.toast('Give the theme a name first', { tone: 'warning' });
        return;
      }
      if (draft.mascot.trim() && !clean.mascot) {
        ui.toast('The mascot has to be an https image link', { tone: 'warning' });
        return;
      }
      const list = savedThemes();
      const replacing = editing && !asNew ? editing : null;
      const taken = [...Object.values(builtInThemes), { name: 'Classic' }, ...list.filter(item => !replacing || item.id !== replacing.id)]
        .some(item => item.name.toLowerCase() === clean.name.toLowerCase());
      if (taken) {
        ui.toast('A theme with that name already exists, pick another name', { tone: 'warning' });
        return;
      }
      if (!replacing && list.length >= 30) {
        ui.toast('You can keep up to 30 themes', { tone: 'warning' });
        return;
      }
      const id = replacing ? replacing.id : `t${Date.now()}`;
      Rk.store.set('settings.themes', replacing ? list.map(item => (item.id === id ? { id, ...clean } : item)) : [...list, { id, ...clean }]);
      saved = true;
      handle.close();
      setTheme(id);
      ui.toast(`Saved ${clean.name}`, { tone: 'success' });
    };
    const remove = async () => {
      const confirmed = await ui.confirm(`"${editing.name}" will be deleted.`, { title: 'Delete theme', confirmLabel: 'Delete', danger: true });
      if (!confirmed) return;
      Rk.store.set('settings.themes', savedThemes().filter(item => item.id !== editing.id));
      saved = true;
      handle.close();
      setTheme('classic');
    };
    const removeButton = editing ? ui.button('Delete', { variant: 'ghost', onClick: remove }) : null;
    if (removeButton) removeButton.classList.add('rk-settings-reset');
    const handle = ui.modal({
      title: editing ? `Edit ${editing.name}` : 'New theme',
      width: 540,
      content: [
        el('label', { class: 'rk-theme-name' }, el('span', null, 'Name'), nameField),
        el('div', { class: 'rk-theme-heading' }, 'Colors'),
        grid,
        el('div', { class: 'rk-theme-heading' }, 'Style'),
        flags,
        mascotField,
        el('div', { class: 'rk-theme-row' },
          el('label', { class: 'rk-theme-field' }, el('span', null, 'Font'), fontPicker),
          el('label', { class: 'rk-theme-field' }, el('span', null, 'Corner roundness'), radiusPicker)
        ),
        el('div', { class: 'rk-theme-heading' }, 'Share'),
        el('div', { class: 'rk-inline' },
          ui.button('Copy share code', { variant: 'ghost', onClick: copyCode }),
          ui.button('Import code', { variant: 'ghost', onClick: importCode })
        )
      ],
      actions: [
        removeButton,
        editing ? ui.button('Save as new', { variant: 'secondary', size: 'md', onClick: () => store(true) }) : null,
        ui.button('Cancel', { variant: 'secondary', size: 'md', onClick: () => handle.close() }),
        ui.button('Save', { variant: 'primary', size: 'md', onClick: () => store(false) })
      ].filter(Boolean),
      onClose: () => {
        if (!saved && panel) applyTheme(panel.frame);
      }
    });
    preview();
  };

  const clampOffset = (dialog, x, y) => {
    const rect = dialog.getBoundingClientRect();
    const left = rect.left - dragOffset.x;
    const top = rect.top - dragOffset.y;
    return {
      x: Math.round(Math.min(Math.max(x, 96 - rect.width - left), window.innerWidth - 96 - left)),
      y: Math.round(Math.min(Math.max(y, -top), window.innerHeight - 48 - top))
    };
  };

  const moveDialog = (dialog, offset) => {
    dragOffset = offset;
    dialog.style.translate = offset.x || offset.y ? `${offset.x}px ${offset.y}px` : '';
  };

  const startDrag = (dialog, event) => {
    if (event.button !== 0 || event.target.closest('button, input, select, a, label')) return;
    event.preventDefault();
    const startX = event.clientX - dragOffset.x;
    const startY = event.clientY - dragOffset.y;
    const move = moveEvent => moveDialog(dialog, clampOffset(dialog, moveEvent.clientX - startX, moveEvent.clientY - startY));
    const stop = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', stop);
      window.removeEventListener('pointercancel', stop);
      dialog.classList.remove('rk-settings-dragging');
      Rk.store.set('settings.position', dragOffset);
    };
    dialog.classList.add('rk-settings-dragging');
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', stop);
    window.addEventListener('pointercancel', stop);
  };

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
    const themePicker = ui.select(themeChoices(), theme, setTheme);
    const themeEdit = ui.button(activeTheme() ? 'Edit theme' : 'New theme', { variant: 'ghost', onClick: editTheme });
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
    const head = el('div', { class: 'rk-settings-head' },
        el('div', null, title, subtitle),
        el('div', { class: 'rk-settings-head-actions' }, bulk, ui.button('', { variant: 'ghost', size: 'md', icon: 'close', title: 'Close', onClick: close }))
    );
    const main = el('section', { class: 'rk-settings-main' },
      head,
      list,
      foot
    );
    const mascot = buildMascot();
    const titlebar = el('div', { class: 'rk-settings-titlebar', title: 'Drag to move, double click to center' },
      el('span', null, 'Rola Settings'),
      el('button', { type: 'button', class: 'rk-settings-titlebar-close', 'aria-label': 'Close', onclick: close }, icon('close', 16))
    );
    const dialog = el('div', { class: 'rk-settings', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Rola settings', tabindex: '-1' },
      titlebar,
      el('aside', { class: 'rk-settings-side' },
        el('div', { class: 'rk-settings-brand' }, el('span', { class: 'rk-settings-brand-name' }, 'Rola')),
        el('div', { class: 'rk-settings-search' }, icon('search', 16), search),
        nav,
        mascot,
        el('div', { class: 'rk-settings-side-footer' }, total, el('div', { class: 'rk-settings-theme' }, el('span', null, 'Theme'), themePicker), themeEdit)
      ),
      main
    );
    const frame = el('div', { class: 'rk-settings-frame' }, dialog);
    applyTheme(frame);
    for (const handle of [titlebar, head]) {
      handle.addEventListener('pointerdown', event => startDrag(dialog, event));
      handle.addEventListener('dblclick', event => {
        if (!event.target.closest('button, input, select, a, label')) moveDialog(dialog, { x: 0, y: 0 });
        Rk.store.set('settings.position', dragOffset);
      });
    }
    const backdrop = el('div', { class: 'rk-modal-backdrop', onmousedown: event => {
      if (event.target === backdrop) close();
    } }, frame);
    backdrop.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        close();
      }
    });
    return { backdrop, dialog, frame, themePicker, themeEdit, mascot, search, counts, navItems, total, title, subtitle, bulk, list, banner, foot, main, previousOverflow: '' };
  };

  const open = () => {
    if (panel) return;
    const saved = Rk.store.get('settings.view', null);
    if (saved && Rk.categories.some(item => item.id === saved.category)) {
      activeCategory = saved.category;
      lastScroll = Number(saved.scroll) || 0;
    }
    theme = storedTheme();
    panel = build();
    panel.previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    renderList();
    updateCounts();
    document.body.append(panel.backdrop);
    panel.list.scrollTop = lastScroll;
    const position = Rk.store.get('settings.position', null);
    dragOffset = { x: 0, y: 0 };
    if (position && Number.isFinite(position.x) && Number.isFinite(position.y)) moveDialog(panel.dialog, clampOffset(panel.dialog, position.x, position.y));
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
