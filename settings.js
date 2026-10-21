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

  const styleFrame = (frame, preview) => {
    applyTheme(frame, preview);
    applyPanelImage(frame);
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
    styleFrame(panel.frame);
    panel.mascot.firstChild.src = mascotUrl();
  };

  const editTheme = () => {
    if (!panel) return;
    const editing = activeTheme();
    const base = editing || builtInThemes[theme] || builtInThemes.sakura;
    const draft = { name: editing ? base.name : 'My theme', colors: { ...base.colors }, mascot: base.mascot, style: { ...base.style } };
    let saved = false;
    const preview = () => {
      if (panel) styleFrame(panel.frame, draft);
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
        if (!saved && panel) styleFrame(panel.frame);
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

  const imageTypes = /^image\/(png|jpeg|gif|webp|avif)$/;

  const imageControl = (entry, def) => {
    const preview = el('span', { class: 'rk-image-preview rk-hidden' });
    const status = el('span', { class: 'rk-image-status' });
    const link = ui.input({ placeholder: 'Image or gif link', maxLength: 2000 });
    const picker = el('input', { type: 'file', accept: 'image/png,image/jpeg,image/gif,image/webp,image/avif', style: { display: 'none' } });
    const remove = ui.button('Remove', { variant: 'ghost', onClick: async () => {
      await Rk.images.remove(entry.id, def.key);
      withLocalChange(() => Rk.setOption(entry.id, def.key, ''));
      showPreview();
    } });
    const showPreview = async () => {
      const data = Rk.option(entry.id, def.key) ? await Rk.images.get(entry.id, def.key) : null;
      preview.style.backgroundImage = data ? `url("${data}")` : '';
      preview.classList.toggle('rk-hidden', !data);
      remove.classList.toggle('rk-hidden', !data);
    };
    const store = async data => {
      try {
        await Rk.images.set(entry.id, def.key, data);
      } catch {
        ui.toast('Could not save that image', { tone: 'danger' });
        return;
      }
      withLocalChange(() => Rk.setOption(entry.id, def.key, String(Date.now())));
      showPreview();
      ui.toast('Image saved', { tone: 'success' });
    };
    const useFile = file => {
      if (!file || !imageTypes.test(file.type)) {
        ui.toast('That has to be a png, jpg, gif or webp image', { tone: 'warning' });
        return;
      }
      if (file.size > 15 * 1024 * 1024) {
        ui.toast('That image is over 15 MB', { tone: 'warning' });
        return;
      }
      const reader = new FileReader();
      reader.addEventListener('load', () => store(String(reader.result)), { once: true });
      reader.readAsDataURL(file);
    };
    const useLink = async text => {
      const target = directImageLink(String(text || '').trim());
      if (!target) {
        ui.toast('That has to be an https image link', { tone: 'warning' });
        return;
      }
      status.textContent = 'Loading';
      const data = await Rk.bg('image-data', { url: target }).catch(() => null);
      status.textContent = '';
      if (typeof data !== 'string' || !data.startsWith('data:image/')) {
        ui.toast('That image could not load, right click the image and use copy image address, or download it and drop the file in', { tone: 'danger', duration: 7000 });
        return;
      }
      link.value = '';
      store(data);
    };
    link.addEventListener('keydown', event => {
      if (event.key === 'Enter') useLink(link.value);
    });
    picker.addEventListener('change', () => {
      useFile(picker.files && picker.files[0]);
      picker.value = '';
    });
    const box = el('div', { class: 'rk-image-option' },
      preview,
      link,
      ui.button('Use link', { variant: 'ghost', onClick: () => useLink(link.value) }),
      ui.button('Choose file', { variant: 'ghost', onClick: () => picker.click() }),
      remove,
      status,
      picker
    );
    box.addEventListener('dragover', event => {
      event.preventDefault();
      box.classList.add('rk-image-drop');
    });
    box.addEventListener('dragleave', () => box.classList.remove('rk-image-drop'));
    box.addEventListener('drop', event => {
      event.preventDefault();
      box.classList.remove('rk-image-drop');
      const file = event.dataTransfer.files && event.dataTransfer.files[0];
      if (file) useFile(file);
      else useLink(event.dataTransfer.getData('text/uri-list') || event.dataTransfer.getData('text/plain'));
    });
    showPreview();
    return box;
  };

  let panelImage = { token: null, data: null };

  const applyPanelImage = async frame => {
    const on = Rk.isEnabled('site.panelBackground');
    const token = on ? Rk.option('site.panelBackground', 'image') : '';
    if (token !== panelImage.token) {
      const data = token ? await Rk.images.get('site.panelBackground', 'image') : null;
      panelImage = { token, data };
    }
    const show = Boolean(on && panelImage.data);
    frame.classList.toggle('rk-panel-image', show);
    if (show) {
      frame.style.setProperty('--rk-panel-bg', `url("${panelImage.data}")`);
      frame.style.setProperty('--rk-panel-dim', `${Rk.option('site.panelBackground', 'dim')}%`);
    } else {
      frame.style.removeProperty('--rk-panel-bg');
      frame.style.removeProperty('--rk-panel-dim');
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
      let typing = 0;
      const save = () => {
        clearTimeout(typing);
        if (field.value.trim() !== Rk.option(entry.id, def.key)) withLocalChange(() => Rk.setOption(entry.id, def.key, field.value.trim()));
      };
      field.addEventListener('input', () => {
        clearTimeout(typing);
        typing = setTimeout(save, 700);
      });
      field.addEventListener('change', save);
      return field;
    }
    if (def.type === 'image') return imageControl(entry, def);
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

  let adminNode = null;

  const adminHash = async (salt, password) => {
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: new TextEncoder().encode(salt), iterations: 210000 }, key, 256);
    return [...new Uint8Array(bits)].map(byte => byte.toString(16).padStart(2, '0')).join('');
  };

  const adminSession = () => {
    try {
      return sessionStorage.getItem('rk-admin') || '';
    } catch {
      return '';
    }
  };

  const syncAdminUi = () => {
    if (!panel) return;
    const name = adminSession();
    for (const mark of panel.adminMarks) {
      mark.classList.toggle('rk-hidden', !name);
      mark.title = name ? `Signed in as ${name}` : '';
    }
    panel.adminIcon.replaceChildren(icon(name ? 'unlock' : 'lock', 14));
  };

  const adminCard = (title, ...content) => el('section', { class: 'rk-admin-card' },
    el('div', { class: 'rk-admin-card-head' }, title),
    el('div', { class: 'rk-admin-card-body' }, content)
  );

  const adminRow = (label, value) => el('div', { class: 'rk-admin-row' }, el('span', { class: 'rk-admin-label' }, label), el('span', { class: 'rk-admin-value' }, value));

  const adminTable = (heads, rows) => rows.length
    ? el('table', { class: 'rk-admin-table' },
      el('thead', null, el('tr', null, heads.map(head => el('th', null, head)))),
      el('tbody', null, rows.map(cells => el('tr', null, cells.map(cell => el('td', null, cell)))))
    )
    : el('div', { class: 'rk-admin-empty' }, 'None');

  const adminDate = value => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString();
  };

  const adminNotes = id => {
    const all = Rk.store.get('admin.notes', {});
    return all && typeof all === 'object' && Array.isArray(all[id]) ? all[id] : [];
  };

  const ROLA_BADGES = [['creator', 'Creator'], ['contributor', 'Contributor'], ['donator', 'Donator']];

  const badgeCard = (userId, current) => {
    const body = el('div', { class: 'rk-admin-card-body' });
    const card = el('section', { class: 'rk-admin-card' }, el('div', { class: 'rk-admin-card-head' }, 'Rola Badges'), body);
    const showToken = () => {
      const field = ui.input({ type: 'password', placeholder: 'GitHub token', maxLength: 300 });
      body.replaceChildren(
        el('div', { class: 'rk-admin-empty' }, 'Badges are saved to badges.json in the Rola repo so every Rola user sees them. Paste a fine-grained GitHub token with Contents read and write access to 1ypii/Rola. It stays on this browser only.'),
        field,
        ui.button('Save token', { variant: 'primary', onClick: async () => {
          const token = field.value.trim();
          if (!/^[A-Za-z0-9_]{20,255}$/.test(token)) {
            ui.toast('That does not look like a GitHub token', { tone: 'warning' });
            return;
          }
          await chrome.storage.local.set({ 'rk:gh-token': token });
          showBadges();
        } })
      );
    };
    const showBadges = () => {
      const chosen = new Set(current);
      body.replaceChildren(
        ...ROLA_BADGES.map(([key, label]) => el('div', { class: 'rk-admin-row' },
          el('span', { class: 'rk-admin-label' }, label),
          ui.toggle(chosen.has(key), on => (on ? chosen.add(key) : chosen.delete(key)), { label })
        )),
        el('div', { class: 'rk-inline' },
          ui.button('Save badges', { variant: 'primary', onClick: async () => {
            try {
              await Rk.bg('save-badges', { userId, badges: [...chosen] });
              current = [...chosen];
              ui.toast('Badges saved, every Rola user sees them within about 30 minutes', { tone: 'success' });
            } catch (err) {
              ui.toast(`Could not save badges: ${err && err.message ? err.message : 'unknown error'}`, { tone: 'danger', duration: 7000 });
            }
          } }),
          ui.button('Change token', { variant: 'ghost', onClick: showToken })
        )
      );
    };
    chrome.storage.local.get('rk:gh-token').then(saved => (saved['rk:gh-token'] ? showBadges() : showToken()), showToken);
    return card;
  };

  const FLAG_REASONS = ['Scamming Users', 'Scamming Developers', 'Paid for Verification Badge', 'Selling Verification Badges', 'Doxxing / Harassment', 'Predatory Behaviour Towards Minors', 'Sexual Misconduct', 'Other'];

  const flagCard = (userId, entry) => {
    const body = el('div', { class: 'rk-admin-card-body' });
    const card = el('section', { class: 'rk-admin-card' }, el('div', { class: 'rk-admin-card-head' }, 'Rola Flags'), body);
    let flags = entry && Array.isArray(entry.flags) ? entry.flags : [];
    const render = () => {
      const rola = flags.filter(flag => flag.source === 'Rola');
      const reason = ui.select(FLAG_REASONS.map(item => [item, item]), FLAG_REASONS[0]);
      const note = el('textarea', { class: 'rk-input rk-admin-textarea', placeholder: 'Why they are flagged, shown to everyone', maxlength: '600' });
      body.replaceChildren(
        ...(flags.length ? flags.map(flag => el('div', { class: 'rk-admin-note' },
          el('span', { class: 'rk-admin-note-date' }, `${flag.source}${flag.at ? ` · ${adminDate(flag.at)}` : ''}`),
          el('span', { class: 'rk-admin-bad' }, flag.reason),
          flag.note ? el('span', null, flag.note) : null,
          flag.source === 'Rola' ? ui.button('Remove', { variant: 'ghost', onClick: () => save({ userId, remove: rola.indexOf(flag) }) }) : null
        )) : [el('div', { class: 'rk-admin-empty' }, 'Not flagged')]),
        reason,
        note,
        ui.button('Flag user', { variant: 'primary', onClick: () => save({ userId, reason: reason.value, note: note.value }) })
      );
    };
    const save = async payload => {
      try {
        const list = await Rk.bg('save-flag', payload);
        flags = [...flags.filter(flag => flag.source !== 'Rola'), ...(Array.isArray(list) ? list.map(flag => ({ ...flag, source: 'Rola' })) : [])];
        render();
        ui.toast('Flags saved, every Rola user sees them within about an hour', { tone: 'success' });
      } catch (err) {
        const message = err && err.message ? err.message : 'unknown error';
        ui.toast(message === 'missing token' ? 'Add your GitHub token in the Rola Badges card first' : `Could not save the flag: ${message}`, { tone: 'danger', duration: 7000 });
      }
    };
    render();
    return card;
  };

  const adminProfile = async id => {
    const safe = promise => Promise.resolve(promise).catch(() => null);
    const [user, groups, games, presence, history, friends, followers, following, badges, flagged, bans] = await Promise.all([
      safe(Rk.api.get(`https://users.roblox.com/v1/users/${id}`)),
      safe(Rk.api.get(`https://groups.roblox.com/v2/users/${id}/groups/roles`)),
      safe(Rk.api.get(`https://games.roblox.com/v2/users/${id}/games?accessFilter=Public&limit=50&sortOrder=Desc`)),
      safe(Rk.api.post('https://presence.roblox.com/v1/presence/users', { userIds: [id] })),
      safe(Rk.api.get(`https://users.roblox.com/v1/users/${id}/username-history?limit=50&sortOrder=Desc`)),
      safe(Rk.api.get(`https://friends.roblox.com/v1/users/${id}/friends/count`)),
      safe(Rk.api.get(`https://friends.roblox.com/v1/users/${id}/followers/count`)),
      safe(Rk.api.get(`https://friends.roblox.com/v1/users/${id}/followings/count`)),
      safe(Rk.bg('rola-badges')),
      safe(Rk.bg('flagged')),
      safe(Rk.bg('bans'))
    ]);
    if (!user || !Rk.isId(user.id)) return el('div', { class: 'rk-admin-empty' }, 'No user found');
    const entry = presence && Array.isArray(presence.userPresences) ? presence.userPresences[0] : null;
    const type = entry ? Number(entry.userPresenceType) || 0 : 0;
    const where = entry && typeof entry.lastLocation === 'string' && entry.lastLocation ? entry.lastLocation : '';
    const location = ['Offline', 'Online', where ? `Playing ${where}` : 'In game', where ? `Studio: ${where}` : 'In Studio'][type] || 'Offline';
    const count = json => (json && Number.isSafeInteger(json.count) ? json.count.toLocaleString() : '?');
    const groupRows = (groups && Array.isArray(groups.data) ? groups.data : []).filter(item => item && item.group).map(item => [
      el('a', { href: `/communities/${item.group.id}`, target: '_blank' }, String(item.group.name)),
      String(item.role && item.role.name ? item.role.name : ''),
      Number(item.group.memberCount || 0).toLocaleString()
    ]);
    const gameRows = (games && Array.isArray(games.data) ? games.data : []).filter(game => game && game.rootPlace).map(game => [
      el('a', { href: `/games/${game.rootPlace.id}`, target: '_blank' }, String(game.name)),
      Number(game.placeVisits || 0).toLocaleString(),
      adminDate(game.updated)
    ]);
    const names = (history && Array.isArray(history.data) ? history.data : []).map(item => item && item.name).filter(name => typeof name === 'string');
    const noteList = el('div', { class: 'rk-admin-notes' });
    const renderNotes = () => noteList.replaceChildren(...adminNotes(user.id).map(note => el('div', { class: 'rk-admin-note' }, el('span', { class: 'rk-admin-note-date' }, adminDate(note.at)), String(note.text))));
    const noteField = el('textarea', { class: 'rk-input rk-admin-textarea', placeholder: 'Enter new note...', maxlength: '1000' });
    const addNote = () => {
      const text = noteField.value.trim();
      if (!text) return;
      const all = Rk.store.get('admin.notes', {});
      const next = all && typeof all === 'object' && !Array.isArray(all) ? { ...all } : {};
      next[user.id] = [{ text, at: Date.now() }, ...adminNotes(user.id)].slice(0, 50);
      Rk.store.set('admin.notes', next);
      noteField.value = '';
      renderNotes();
    };
    renderNotes();
    const rolaStatus = el('span');
    let ban = bans && bans[user.id] && (bans[user.id].until === null || bans[user.id].until > Date.now()) ? bans[user.id] : null;
    const showStatus = () => {
      rolaStatus.className = ban ? 'rk-admin-bad' : 'rk-admin-good';
      rolaStatus.textContent = !ban ? 'OK' : ban.until === null ? 'Terminated' : `Banned until ${new Date(ban.until).toLocaleString()}`;
      rolaStatus.title = ban && ban.reason ? ban.reason : '';
    };
    showStatus();
    const moderate = () => {
      const reason = el('textarea', { class: 'rk-input rk-admin-textarea', placeholder: 'Reason, shown to them', maxlength: '300' });
      const apply = async (duration, remove) => {
        try {
          ban = await Rk.bg('save-ban', { userId: user.id, duration, reason: reason.value, remove });
          showStatus();
          handle.close();
          ui.toast(remove ? `${user.name} can use Rola again` : `${user.name} is ${duration === 'termination' ? 'terminated from' : 'banned from'} Rola`, { tone: 'success' });
        } catch (err) {
          const message = err && err.message ? err.message : 'unknown error';
          ui.toast(message === 'missing token' ? 'Add your GitHub token in the Rola Badges card first' : `Could not save: ${message}`, { tone: 'danger', duration: 7000 });
        }
      };
      const handle = ui.modal({
        title: `Moderate ${user.name}`,
        width: 440,
        content: [
          el('p', { class: 'rk-modal-text' }, 'Choose how long they lose access to Rola. It applies on every browser where they use Rola with this Roblox account.'),
          reason,
          el('div', { class: 'rk-inline' },
            ui.button('1 day', { variant: 'secondary', onClick: () => apply('day') }),
            ui.button('3 days', { variant: 'secondary', onClick: () => apply('three') }),
            ui.button('7 days', { variant: 'secondary', onClick: () => apply('week') }),
            ui.button('Termination', { variant: 'danger', onClick: () => apply('termination') })
          ),
          ban ? ui.button('Lift ban', { variant: 'ghost', onClick: () => apply(null, true) }) : null
        ]
      });
    };
    return el('div', { class: 'rk-admin-grid' },
      el('div', { class: 'rk-admin-column' },
        adminCard('Account Summary',
          adminRow('Display Name', el('span', { class: 'rk-inline' }, String(user.displayName), user.hasVerifiedBadge ? el('span', { class: 'rk-admin-tag' }, 'Verified') : null)),
          adminRow('Moderation Status', el('span', { class: user.isBanned ? 'rk-admin-bad' : 'rk-admin-good' }, user.isBanned ? 'Terminated' : 'OK')),
          adminRow('Rola Status', rolaStatus),
          adminRow('User ID', String(user.id)),
          adminRow('User Name', String(user.name)),
          adminRow('Joined', adminDate(user.created)),
          adminRow('Current Location', location),
          adminRow('Connections', `${count(friends)} friends, ${count(followers)} followers, ${count(following)} following`),
          user.description ? el('p', { class: 'rk-admin-bio' }, String(user.description)) : null,
          el('div', { class: 'rk-admin-person' },
            ui.thumb(Rk.thumb('Avatar', user.id, '420x420'), { size: 120 }),
            el('div', { class: 'rk-admin-links' },
              el('a', { href: `/users/${user.id}/profile`, target: '_blank' }, 'User homepage'),
              el('a', { href: `/users/${user.id}/inventory`, target: '_blank' }, 'Inventory'),
              el('a', { href: `/users/${user.id}/friends`, target: '_blank' }, 'Friends'),
              el('a', { href: '#', onclick: event => {
                event.preventDefault();
                moderate();
              } }, 'Moderate user')
            )
          )
        ),
        adminCard(`Created Games (${gameRows.length})`, adminTable(['Game', 'Visits', 'Updated'], gameRows)),
        flagCard(user.id, flagged && flagged[user.id]),
        adminCard(`Past Usernames (${names.length})`, names.length ? el('div', { class: 'rk-inline' }, names.map(name => el('span', { class: 'rk-admin-tag' }, name))) : el('div', { class: 'rk-admin-empty' }, 'None'))
      ),
      el('div', { class: 'rk-admin-column' },
        adminCard(`Groups (${groupRows.length})`, adminTable(['Group', 'Role', 'Members'], groupRows)),
        adminCard('User Notes', noteField, ui.button('Add Note', { variant: 'primary', onClick: addNote }), noteList),
        badgeCard(user.id, badges && Array.isArray(badges[user.id]) ? badges[user.id] : [])
      )
    );
  };

  const adminView = () => {
    if (adminNode) return adminNode;
    adminNode = el('div', { class: 'rk-admin' });
    const showPanel = () => {
      const results = el('div', { class: 'rk-admin-results' });
      const field = ui.input({ placeholder: 'Username or user id', maxLength: 40, onEnter: () => lookup() });
      const lookup = async () => {
        const text = field.value.trim();
        if (!text) return;
        results.replaceChildren(ui.spinner(20));
        let id = /^\d{1,15}$/.test(text) ? Number(text) : null;
        if (!id) {
          const json = await Rk.api.post('https://users.roblox.com/v1/usernames/users', { usernames: [text], excludeBannedUsers: false }).catch(() => null);
          const hit = json && Array.isArray(json.data) ? json.data[0] : null;
          id = hit ? Number(hit.id) : null;
        }
        results.replaceChildren(Rk.isId(id) ? await adminProfile(id) : el('div', { class: 'rk-admin-empty' }, 'No user found'));
      };
      const signOut = () => {
        try {
          sessionStorage.removeItem('rk-admin');
        } catch {}
        Rk.bg('admin-logout').catch(() => {});
        syncAdminUi();
        showLogin();
      };
      const reasons = { banner: 'Bad profile banner', scam: 'Scamming', harassment: 'Harassment', inappropriate: 'Inappropriate', other: 'Other' };
      const showReports = async () => {
        results.replaceChildren(ui.spinner(20));
        let reports;
        try {
          reports = await Rk.bg('reports');
        } catch (err) {
          const message = err && err.message ? err.message : 'unknown error';
          results.replaceChildren(el('div', { class: 'rk-admin-empty' }, message === 'admins only' ? 'Sign out and back in to load reports. If it still fails, ask the owner to save your admin account again.' : `Could not load reports: ${message}`));
          return;
        }
        reportsButton.textContent = 'Reports';
        const resolve = async ids => {
          try {
            await Rk.bg('resolve-reports', { ids });
            showReports();
          } catch (err) {
            ui.toast(`Could not resolve: ${err && err.message ? err.message : 'unknown error'}`, { tone: 'danger' });
          }
        };
        const names = new Map();
        const ids = [...new Set(reports.flatMap(report => [Number(report.userId), Number(report.reporterId)]))].filter(Rk.isId);
        if (ids.length) {
          const json = await Rk.api.post('https://users.roblox.com/v1/users', { userIds: ids.slice(0, 100), excludeBannedUsers: false }).catch(() => null);
          for (const user of json && Array.isArray(json.data) ? json.data : []) names.set(String(user.id), user.name);
        }
        const person = id => el('a', { href: `/users/${id}/profile`, target: '_blank' }, names.get(String(id)) || String(id));
        const rows = reports.map(report => [
          person(report.userId),
          el('span', null, reasons[report.reason] || report.reason, report.details ? el('div', { class: 'rk-admin-empty' }, report.details) : null),
          el('span', null, person(report.reporterId), report.verified ? null : el('span', { class: 'rk-admin-tag', title: 'This reporter has not linked their account, the name could be faked' }, 'Unlinked')),
          adminDate(report.at),
          el('span', { class: 'rk-inline' },
            ui.button('Look up', { variant: 'ghost', onClick: async () => {
              results.replaceChildren(ui.spinner(20));
              results.replaceChildren(await adminProfile(Number(report.userId)));
            } }),
            ui.button('Resolve', { variant: 'ghost', onClick: () => resolve([report.id]) })
          )
        ]);
        results.replaceChildren(adminCard(`Reports (${reports.length})`,
          adminTable(['User', 'Reason', 'Reported by', 'Date', ''], rows),
          reports.length > 1 ? ui.button('Resolve all', { variant: 'ghost', onClick: () => resolve(reports.map(report => report.id)) }) : null
        ));
      };
      const reportsButton = ui.button('Reports', { variant: 'ghost', onClick: showReports });
      adminNode.replaceChildren(
        el('div', { class: 'rk-admin-search' }, field, ui.button('Search', { variant: 'primary', onClick: lookup }), reportsButton, ui.button('Sign out', { variant: 'ghost', onClick: signOut })),
        results
      );
    };
    const showLogin = () => {
      const user = ui.input({ placeholder: 'Username', maxLength: 40 });
      const pass = ui.input({ type: 'password', placeholder: 'Password', maxLength: 200 });
      const submit = async () => {
        const name = user.value.trim();
        if (!name || !pass.value) return;
        button.disabled = true;
        const admins = await Rk.bg('admins').catch(() => null);
        const entry = Array.isArray(admins) ? admins.find(item => item.username.toLowerCase() === name.toLowerCase()) : null;
        const ok = entry ? (await adminHash(entry.salt, pass.value)) === entry.hash : false;
        button.disabled = false;
        if (!ok) {
          ui.toast(Array.isArray(admins) ? 'Wrong username or password' : 'Could not reach the admin list', { tone: 'danger' });
          pass.value = '';
          return;
        }
        try {
          sessionStorage.setItem('rk-admin', entry.username);
        } catch {}
        Rk.bg('admin-login', { username: entry.username, password: pass.value }).catch(() => ui.toast('Signed in, but reports and bans need the owner to save your admin account again once', { tone: 'warning', duration: 8000 }));
        pass.value = '';
        syncAdminUi();
        showPanel();
      };
      const button = ui.button('Sign in', { variant: 'primary', onClick: submit });
      pass.addEventListener('keydown', event => {
        if (event.key === 'Enter') submit();
      });
      adminNode.replaceChildren(
        adminCard('Sign in', el('div', { class: 'rk-admin-empty' }, 'Admin accounts are given out by the Rola owner.'), user, pass, button),
        el('div', { class: 'rk-admin-search' }, ui.button('Add or remove an admin', { variant: 'ghost', onClick: showManage }))
      );
    };
    const showManage = () => {
      const user = ui.input({ placeholder: 'Admin username', maxLength: 40 });
      const pass = ui.input({ type: 'password', placeholder: 'Their password (12+ characters)', maxLength: 200 });
      const token = ui.input({ type: 'password', placeholder: 'GitHub token (only needed the first time)', maxLength: 300 });
      const run = async remove => {
        const name = user.value.trim();
        if (!name) {
          ui.toast('Type the admin username', { tone: 'warning' });
          return;
        }
        if (!remove && pass.value.length < 12) {
          ui.toast('Use a password of at least 12 characters, the admin list is public', { tone: 'warning' });
          return;
        }
        save.disabled = true;
        drop.disabled = true;
        try {
          const salt = [...crypto.getRandomValues(new Uint8Array(16))].map(byte => byte.toString(16).padStart(2, '0')).join('');
          const hash = remove ? '' : await adminHash(salt, pass.value);
          await Rk.bg('save-admin', { username: name, salt, hash, token: token.value, password: remove ? '' : pass.value, remove });
          ui.toast(remove ? `Removed ${name} from the admins` : `Saved ${name}, they can sign in within a few minutes`, { tone: 'success' });
          pass.value = '';
          token.value = '';
        } catch (err) {
          const message = err && err.message ? err.message : 'unknown error';
          ui.toast(message === 'missing token' ? 'Paste your GitHub token the first time' : `Could not save: ${message}`, { tone: 'danger', duration: 7000 });
        }
        save.disabled = false;
        drop.disabled = false;
      };
      const save = ui.button('Save admin', { variant: 'primary', onClick: () => run(false) });
      const drop = ui.button('Remove admin', { variant: 'ghost', onClick: () => run(true) });
      drop.classList.add('rk-settings-reset');
      adminNode.replaceChildren(adminCard('Add or remove an admin',
        el('div', { class: 'rk-admin-empty' }, 'Only the Rola owner can do this. Rola saves the account to admins.json on GitHub with your GitHub token, the same token the Rola Badges card uses. Saving an existing username changes its password.'),
        user,
        pass,
        token,
        el('div', { class: 'rk-inline' }, save, drop, ui.button('Back', { variant: 'ghost', onClick: showLogin }))
      ));
    };
    if (adminSession()) showPanel();
    else showLogin();
    return adminNode;
  };

  const renderList = ({ keepScroll = false } = {}) => {
    if (!panel) return;
    if (activeCategory === 'admin' && !query.trim()) {
      panel.title.textContent = 'Admin';
      panel.subtitle.textContent = 'Look up any account';
      panel.bulk.classList.add('rk-hidden');
      if (panel.list.firstElementChild !== adminView()) panel.list.replaceChildren(adminView());
      renderNav();
      return;
    }
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
    const adminIcon = el('span', { class: 'rk-admin-nav-icon' }, icon('lock', 14));
    const adminMarks = [el('span', { class: 'rk-admin-mark rk-hidden' }, 'Admin'), el('span', { class: 'rk-admin-mark rk-hidden' }, 'Admin')];
    const adminItem = el('button', { type: 'button', class: 'rk-settings-nav-item', onclick: () => {
      activeCategory = 'admin';
      query = '';
      search.value = '';
      renderList();
    } }, el('span', null, 'Admin'), adminIcon);
    navItems.set('admin', adminItem);
    nav.append(adminItem);
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
      el('span', { class: 'rk-inline' }, 'Rola Settings', adminMarks[0]),
      el('button', { type: 'button', class: 'rk-settings-titlebar-close', 'aria-label': 'Close', onclick: close }, icon('close', 16))
    );
    const dialog = el('div', { class: 'rk-settings', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Rola settings', tabindex: '-1' },
      titlebar,
      el('aside', { class: 'rk-settings-side' },
        el('div', { class: 'rk-settings-brand' }, el('span', { class: 'rk-settings-brand-name' }, 'Rola'), adminMarks[1]),
        el('div', { class: 'rk-settings-search' }, icon('search', 16), search),
        nav,
        mascot,
        el('div', { class: 'rk-settings-side-footer' }, total, el('div', { class: 'rk-settings-theme' }, el('span', null, 'Theme'), themePicker), themeEdit)
      ),
      main
    );
    const frame = el('div', { class: 'rk-settings-frame' }, dialog);
    styleFrame(frame);
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
    return { backdrop, adminMarks, adminIcon, dialog, frame, themePicker, themeEdit, mascot, search, counts, navItems, total, title, subtitle, bulk, list, banner, foot, main, previousOverflow: '' };
  };

  const open = () => {
    if (panel) return;
    const ban = Rk.suspended();
    if (ban) {
      ui.modal({ title: 'Rola', width: 420, content: el('p', { class: 'rk-modal-text' }, Rk.suspensionText()) });
      return;
    }
    const saved = Rk.store.get('settings.view', null);
    if (saved && Rk.categories.some(item => item.id === saved.category)) {
      activeCategory = saved.category;
      lastScroll = Number(saved.scroll) || 0;
    }
    theme = storedTheme();
    panel = build();
    syncAdminUi();
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

  Rk.onSettings(() => {
    if (panel) applyPanelImage(panel.frame);
  });

  Rk.themedWindow = ({ title, content, width = 560, onClose }) => {
    theme = storedTheme();
    const body = el('div', { class: 'rk-settings-list' }, content);
    let closed = false;
    const close = () => {
      if (closed) return;
      closed = true;
      document.removeEventListener('keydown', onKey, true);
      backdrop.classList.remove('rk-modal-open');
      backdrop.addEventListener('transitionend', () => backdrop.remove(), { once: true });
      setTimeout(() => backdrop.remove(), 400);
      if (onClose) onClose();
    };
    const onKey = event => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      close();
    };
    const dialog = el('div', { class: 'rk-settings', role: 'dialog', 'aria-modal': 'true', 'aria-label': title, tabindex: '-1', style: { gridTemplateColumns: '1fr', width: `min(${width}px, calc(100vw - 32px))`, height: 'min(620px, calc(100vh - 32px))' } },
      el('div', { class: 'rk-settings-titlebar' },
        el('span', null, 'Rola'),
        el('button', { type: 'button', class: 'rk-settings-titlebar-close', 'aria-label': 'Close', onclick: close }, icon('close', 16))
      ),
      el('section', { class: 'rk-settings-main' },
        el('div', { class: 'rk-settings-head' },
          el('h2', { class: 'rk-settings-title' }, title),
          el('div', { class: 'rk-settings-head-actions' }, ui.button('', { variant: 'ghost', size: 'md', icon: 'close', title: 'Close', onClick: close }))
        ),
        body
      )
    );
    const frame = el('div', { class: 'rk-settings-frame' }, dialog);
    styleFrame(frame);
    const backdrop = el('div', { class: 'rk-modal-backdrop', onmousedown: event => {
      if (event.target === backdrop) close();
    } }, frame);
    document.addEventListener('keydown', onKey, true);
    document.body.append(backdrop);
    requestAnimationFrame(() => backdrop.classList.add('rk-modal-open'));
    return { close, body };
  };

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
