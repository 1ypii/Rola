(() => {
  const { el, ui, fmt, icon } = Rk;

  const hide = selector => `${selector} { display: none !important; }`;
  const headerItems = ids => ids.map(id => `li:not(:has(li)):has(#${id})`).join(',\n');
  const sidebarItems = parts => parts.map(part => `.left-nav li:not(:has(li)):has(a[href*="${part}"])`).join(',\n');
  const hideWhenOff = (id, selector) => Rk.onSettings(() => {
    const off = !Rk.isEnabled(id);
    for (const node of document.querySelectorAll(selector)) node.classList.toggle('rk-hidden', off);
  });

  const onFrame = (events, update) => {
    let queued = false;
    const schedule = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        update();
      });
    };
    for (const name of events) window.addEventListener(name, schedule, { passive: true });
    update();
  };

  let balanceRequest = null;
  let balanceKey = '';
  let balanceText = '';
  const headerBalance = () => {
    const node = document.getElementById('nav-robux-amount');
    return node ? node.textContent.trim() : '';
  };
  const balance = key => {
    if (balanceRequest && (key === balanceKey || (balanceText && key === balanceText))) return balanceRequest;
    balanceKey = key;
    balanceText = '';
    const request = Rk.me()
      .then(user => (user ? Rk.api.get(`https://economy.roblox.com/v1/users/${user.id}/currency`) : null))
      .then(json => {
        const robux = json && Number.isSafeInteger(json.robux) && json.robux >= 0 ? json.robux : null;
        if (balanceRequest === request && robux !== null) balanceText = fmt.num(robux);
        return robux;
      })
      .catch(() => {
        if (balanceRequest === request) balanceRequest = null;
        return null;
      });
    balanceRequest = request;
    return request;
  };

  const headerButton = ({ id, name, description, order, href, iconName, label }) => Rk.feature({
    id,
    category: 'site',
    name,
    description,
    default: false,
    run(ctx) {
      hideWhenOff(ctx.id, `.rk-site-nav[data-rk-order="${order}"]`);
      Rk.observe('ul.navbar-right', navbar => {
        if (navbar.querySelector(`.rk-site-nav[data-rk-order="${order}"]`)) return;
        const button = ui.tip(el('a', { class: 'rk-nav-button', href, 'data-rk-tip-pos': 'below' }, icon(iconName, 22)), label);
        const item = el('li', { class: 'navbar-icon-item rk-nav-item rk-site-nav', dataset: { rkOrder: String(order) } }, button);
        const later = [...navbar.querySelectorAll('.rk-site-nav')].find(node => Number(node.dataset.rkOrder) > order);
        const robux = [...navbar.children].find(node => node.id === 'navbar-robux' || node.querySelector('#navbar-robux'));
        if (later) later.before(item);
        else if (robux) robux.before(item);
        else navbar.append(item);
      });
    }
  });

  Rk.feature({
    id: 'site.hideChat',
    category: 'site',
    name: 'Hide chat',
    description: 'Hides the chat dock in the corner of every page.',
    default: false,
    css: hide('#chat-container')
  });

  Rk.feature({
    id: 'site.hideFooter',
    category: 'site',
    name: 'Hide footer',
    description: 'Hides the footer at the bottom of every page.',
    default: false,
    css: hide('#footer-container')
  });

  let sidebarWatched = false;
  const markSidebar = () => {
    if (sidebarWatched) return;
    sidebarWatched = true;
    Rk.observe('.left-nav', nav => {
      let root = nav;
      while (root.parentElement && root.parentElement !== document.body && !root.parentElement.querySelector('#content, #container-main, .container-main, #header')) root = root.parentElement;
      if (root !== document.body && !root.querySelector('#content, #container-main, .container-main, #header')) root.setAttribute('data-rk-sidebar', '');
    });
  };

  Rk.feature({
    id: 'site.hideSidebar',
    category: 'site',
    name: 'Hide sidebar',
    description: 'Hides the left sidebar and lets the page use the full width.',
    default: false,
    css: `
      :root {
        --left-nav-reserved-width: 0px !important;
      }
      #navigation,
      [data-rk-sidebar] {
        display: none !important;
      }
      #container-main,
      .container-main {
        margin-left: 0 !important;
      }
    `,
    run() {
      markSidebar();
    }
  });

  Rk.feature({
    id: 'site.homeLink',
    category: 'site',
    name: 'Home link in header',
    description: 'Adds a Home link as the first item in the header.',
    run(ctx) {
      hideWhenOff(ctx.id, '.rk-site-home');
      Rk.observe('ul.rbx-navbar', list => {
        if (list.querySelector('.rk-site-home')) return;
        const hasHome = [...list.querySelectorAll('a[href]')].some(link => /^(?:\/[a-z]{2}(?:-[a-z]{2,4})?)?\/home\/?$/i.test(link.pathname));
        if (hasHome) return;
        const sample = list.querySelector('a.nav-menu-title');
        const sampleItem = sample && sample.parentElement && sample.parentElement.tagName === 'LI' ? sample.parentElement : null;
        const item = el('li', { class: sampleItem && sampleItem.className ? `${sampleItem.className} rk-site-home` : 'rk-site-home' },
          el('a', { class: 'font-header-2 nav-menu-title text-header', href: '/home' }, 'Home')
        );
        list.prepend(item);
      });
    }
  });

  Rk.feature({
    id: 'site.hideChartsLink',
    category: 'site',
    name: 'Hide charts link',
    description: 'Hides the Charts link in the header.',
    default: false,
    css: hide(headerItems(['nav-charts-md-link', 'nav-charts-sm-link']))
  });

  Rk.feature({
    id: 'site.hideMarketplaceLink',
    category: 'site',
    name: 'Hide marketplace link',
    description: 'Hides the Marketplace link in the header.',
    default: false,
    css: hide(headerItems(['nav-marketplace-md-link', 'nav-marketplace-sm-link']))
  });

  Rk.feature({
    id: 'site.hideCreateLink',
    category: 'site',
    name: 'Hide create link',
    description: 'Hides the Create link in the header.',
    default: false,
    css: hide(headerItems(['header-develop-md-link', 'header-develop-sm-link']))
  });

  Rk.feature({
    id: 'site.hideRobuxLink',
    category: 'site',
    name: 'Hide Robux link',
    description: 'Hides the Robux link in the header.',
    default: false,
    css: hide([
      'ul.rbx-navbar li:has(> a[href^="/robux"])',
      'ul.rbx-navbar li:has(> a[href^="/upgrades/robux"])',
      'ul.rbx-navbar li:has(> a[href*="roblox.com/robux"])',
      'ul.rbx-navbar li:has(> a[href*="roblox.com/upgrades/robux"])'
    ].join(',\n'))
  });

  Rk.feature({
    id: 'site.hideSidebarPremium',
    category: 'site',
    name: 'Hide Premium in sidebar',
    description: 'Hides the Premium item in the sidebar.',
    default: false,
    css: hide(sidebarItems(['/plus', '/premium']))
  });

  Rk.feature({
    id: 'site.hideSidebarStore',
    category: 'site',
    name: 'Hide store items in sidebar',
    description: 'Hides the gift card and official store items in the sidebar.',
    default: false,
    css: hide(sidebarItems(['giftcards', 'gift-cards', '/shop', 'amazon.com']))
  });

  Rk.feature({
    id: 'site.hideSidebarBlog',
    category: 'site',
    name: 'Hide blog in sidebar',
    description: 'Hides the blog item in the sidebar.',
    default: false,
    css: hide(sidebarItems(['blog.roblox.com']))
  });

  Rk.feature({
    id: 'site.hideSidebarMessages',
    category: 'site',
    name: 'Hide messages in sidebar',
    description: 'Hides the Messages item in the sidebar.',
    default: false,
    css: hide(sidebarItems(['my/messages']))
  });

  Rk.feature({
    id: 'site.hideSidebarInventory',
    category: 'site',
    name: 'Hide inventory in sidebar',
    description: 'Hides the Inventory item in the sidebar.',
    default: false,
    css: hide(sidebarItems(['/inventory']))
  });

  Rk.feature({
    id: 'site.hideSidebarTrade',
    category: 'site',
    name: 'Hide trade in sidebar',
    description: 'Hides the Trade item in the sidebar.',
    default: false,
    css: hide(sidebarItems(['/trade']))
  });

  Rk.feature({
    id: 'site.hideSidebarCommunities',
    category: 'site',
    name: 'Hide communities in sidebar',
    description: 'Hides the Communities item in the sidebar.',
    default: false,
    css: hide(sidebarItems(['/communities', '/groups']))
  });

  Rk.feature({
    id: 'site.hideSidebarAvatar',
    category: 'site',
    name: 'Hide avatar in sidebar',
    description: 'Hides the Avatar item in the sidebar.',
    default: false,
    css: hide(sidebarItems(['my/avatar']))
  });

  Rk.feature({
    id: 'site.exactRobux',
    category: 'site',
    name: 'Exact Robux balance',
    description: 'Shows your exact Robux balance in the header instead of the rounded one.',
    run(ctx) {
      Rk.observe('#nav-robux-amount', node => {
        let short = '';
        let exact = '';
        let applied = '';
        const setText = value => {
          const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
          let target = walker.nextNode();
          while (target && !target.nodeValue.trim()) target = walker.nextNode();
          if (target) target.nodeValue = value;
          else node.textContent = value;
        };
        const syncTitle = () => {
          if (applied && Rk.isEnabled(ctx.id) && !Rk.isEnabled('site.robuxToCash')) node.title = short;
          else node.removeAttribute('title');
        };
        const show = () => {
          if (Rk.isEnabled('tools.fakeRobux')) return;
          const text = node.textContent.trim();
          if (applied && text === applied && !Rk.isEnabled(ctx.id)) {
            applied = '';
            setText(short);
          } else if (text && text !== applied) {
            if (text !== short) {
              short = text;
              applied = '';
              exact = '';
              load();
            } else if (exact && text !== exact && Rk.isEnabled(ctx.id)) {
              setText(exact);
              applied = node.textContent.trim();
            }
          }
          syncTitle();
        };
        const load = () => {
          const key = short;
          balance(key).then(robux => {
            if (key !== short) return;
            exact = robux === null ? '' : fmt.num(robux);
            show();
          });
        };
        new MutationObserver(show).observe(node, { characterData: true, childList: true, subtree: true });
        const off = Rk.onSettings(() => (node.isConnected ? show() : off()));
        show();
      });
    }
  });

  Rk.feature({
    id: 'site.robuxToCash',
    category: 'site',
    name: 'Robux cash value',
    description: 'Shows roughly what your Robux balance is worth in US dollars.',
    default: false,
    options: [
      { key: 'rate', label: 'Rate', type: 'select', choices: [['buy', 'Buying rate'], ['devex', 'DevEx rate']], default: 'buy' }
    ],
    css: `
      .rk-site-cash {
        display: block;
        margin-top: 2px;
        font-size: 12px;
        font-weight: 400;
        line-height: 1.3;
      }
    `,
    run(ctx) {
      const usd = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' });
      const describe = robux => {
        const devex = ctx.option('rate') === 'devex';
        return `About ${usd.format(robux * (devex ? 0.0038 : 0.0125))} at the ${devex ? 'DevEx' : 'buying'} rate`;
      };
      Rk.observe('#nav-robux-amount', node => {
        let latest = null;
        const update = () => {
          const request = balance(node.textContent.trim());
          latest = request;
          request.then(robux => {
            if (latest !== request) return;
            if (robux === null || !Rk.isEnabled(ctx.id)) {
              node.removeAttribute('data-rk-tip');
              return;
            }
            node.setAttribute('data-rk-tip', describe(robux));
            node.setAttribute('data-rk-tip-pos', 'below');
          });
        };
        new MutationObserver(update).observe(node, { characterData: true, childList: true, subtree: true });
        const off = Rk.onSettings(() => (node.isConnected ? update() : off()));
        update();
      });
      Rk.observe('#nav-robux-balance', node => {
        const line = el('span', { class: 'rk-site-cash rk-muted' });
        const update = () => balance(headerBalance()).then(robux => {
          if (robux === null || !Rk.isEnabled(ctx.id)) {
            line.remove();
            return;
          }
          line.textContent = describe(robux);
          if (!line.isConnected) node.append(line);
        });
        new MutationObserver(() => {
          if (!line.isConnected && line.textContent && Rk.isEnabled(ctx.id)) node.append(line);
        }).observe(node, { childList: true });
        const off = Rk.onSettings(() => (node.isConnected ? update() : off()));
        update();
      });
    }
  });

  Rk.feature({
    id: 'site.announcements',
    category: 'site',
    name: 'Rola announcements',
    description: 'Shows messages from the Rola team once, like new updates or warnings about scammers.',
    css: `
.rk-announce { position: fixed; top: 64px; left: 50%; z-index: 2147481500; display: flex; align-items: flex-start; gap: 10px; width: min(520px, calc(100vw - 32px)); padding: 12px 10px 12px 16px; border: 1px solid var(--rk-border); border-left: 3px solid var(--rk-accent); border-radius: var(--rk-radius); background: var(--rk-bg); box-shadow: var(--rk-shadow); color: var(--rk-text); font-family: var(--rk-font); font-size: 14px; opacity: 0; transform: translate(-50%, -8px); transition: opacity var(--rk-med) ease, transform var(--rk-med) var(--rk-ease); }
.rk-announce.rk-announce-in { opacity: 1; transform: translate(-50%, 0); }
.rk-announce-body { flex: 1; min-width: 0; }
.rk-announce-title { margin-bottom: 2px; font-size: 12px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--rk-accent); }
.rk-announce-text { white-space: pre-wrap; overflow-wrap: anywhere; }
`,
    async run(ctx) {
      const announcement = await Rk.bg('announcement').catch(() => null);
      if (!announcement || typeof announcement.id !== 'string' || !Rk.isEnabled(ctx.id)) return;
      if (Rk.store.get('announcements.seen', '') === announcement.id) return;
      const card = el('div', { class: 'rk-announce', role: 'status' },
        el('div', { class: 'rk-announce-body' }, el('div', { class: 'rk-announce-title' }, 'Rola'), el('div', { class: 'rk-announce-text' }, announcement.text)),
        ui.button('', { variant: 'ghost', icon: 'close', title: 'Dismiss', onClick: () => {
          Rk.store.set('announcements.seen', announcement.id);
          card.classList.remove('rk-announce-in');
          card.addEventListener('transitionend', () => card.remove(), { once: true });
          setTimeout(() => card.remove(), 400);
        } })
      );
      document.body.append(card);
      requestAnimationFrame(() => card.classList.add('rk-announce-in'));
    }
  });

  Rk.feature({
    id: 'site.pendingRobux',
    category: 'site',
    name: 'Pending Robux in header',
    description: 'Shows your pending Robux in brackets next to your balance.',
    default: false,
    css: `
      .rk-site-pending {
        display: inline-flex;
        align-items: center;
        gap: 2px;
        margin-left: 5px;
        font-size: 11px;
        font-weight: 400;
        white-space: nowrap;
        opacity: 0.7;
      }
      .rk-site-pending .rk-icon {
        width: 11px;
        height: 11px;
      }
    `,
    run(ctx) {
      const full = new Intl.NumberFormat();
      const short = value => {
        if (value < 10000) return full.format(value);
        const text = String(value);
        const suffix = ['', 'K', 'M', 'B', 'T'][Math.min(Math.floor(Math.log(value) / Math.log(1000)), 4)];
        const cut = value < 1e6 ? 3 : value < 1e9 ? 6 : value < 1e12 ? 9 : 12;
        return text.slice(0, text.length - cut) + suffix;
      };
      let pending = null;
      let loadedAt = 0;
      const load = async () => {
        if (Date.now() - loadedAt < 300000) return pending;
        loadedAt = Date.now();
        const user = await Rk.me();
        const json = user ? await Rk.api.get(`https://economy.roblox.com/v2/users/${user.id}/transaction-totals?timeFrame=Year&transactionType=summary`).catch(() => null) : null;
        const value = json && Number(json.pendingRobuxTotal);
        pending = Number.isSafeInteger(value) && value > 0 ? value : null;
        return pending;
      };
      Rk.observe('#nav-robux-amount', node => {
        const label = el('span', { class: 'rk-site-pending', title: 'Pending Robux' });
        const update = async () => {
          const value = Rk.isEnabled(ctx.id) && !Rk.isEnabled('tools.fakeRobux') ? await load() : null;
          if (!node.isConnected) return;
          if (value === null || !Rk.isEnabled(ctx.id) || Rk.isEnabled('tools.fakeRobux')) {
            label.remove();
            return;
          }
          label.replaceChildren('+', icon('robux', 11), `${short(value)} pending`);
          label.title = `${full.format(value)} pending Robux`;
          if (label.previousElementSibling !== node) node.after(label);
        };
        const off = Rk.onSettings(() => (node.isConnected ? update() : off()));
        update();
      });
    }
  });

  Rk.feature({
    id: 'site.chatBestFriends',
    category: 'site',
    name: 'Best friends first in chat',
    description: 'Pins your best friends to the top of the chat list under a Best friends label.',
    default: false,
    css: `
      .rk-chat-pinned {
        display: flex !important;
        flex-direction: column;
      }
      .rk-chat-pinned > .rk-chat-best {
        order: -2;
      }
      .rk-chat-label {
        order: -3;
        list-style: none;
        padding: 8px 12px 4px;
        font-size: 12px;
        font-weight: 600;
        color: var(--rk-muted);
      }
      .rk-chat-label.rk-chat-label-rest {
        order: -1;
      }
      .rk-chat-pinned:not(.rk-chat-has-best) > .rk-chat-label {
        display: none;
      }
    `,
    run(ctx) {
      const people = new Map();
      let queued = false;
      const bestIds = () => {
        const list = Rk.store.get('friends.best', []);
        return new Set((Array.isArray(list) ? list : []).filter(id => Rk.isId(id)).slice(0, 200));
      };
      const loadPeople = async ids => {
        const missing = [...ids].filter(id => !people.has(id));
        if (!missing.length) return;
        for (const id of missing) people.set(id, null);
        const json = await Rk.api.post('https://users.roblox.com/v1/users', { userIds: missing.slice(0, 100), excludeBannedUsers: false }).catch(() => null);
        for (const user of json && Array.isArray(json.data) ? json.data : []) {
          if (user && Rk.isId(user.id)) people.set(user.id, [user.name, user.displayName].filter(name => typeof name === 'string' && name).map(name => name.toLowerCase()));
        }
        schedule();
      };
      const rowId = row => {
        const tagged = row.matches('[data-user-id], [data-userid], [data-target-id]') ? row : row.querySelector('[data-user-id], [data-userid], [data-target-id]');
        const raw = tagged ? tagged.getAttribute('data-user-id') || tagged.getAttribute('data-userid') || tagged.getAttribute('data-target-id') : null;
        if (raw && /^\d+$/.test(raw)) return Number(raw);
        const link = row.querySelector('a[href*="/users/"]');
        const match = link && /\/users\/(\d+)/.exec(link.getAttribute('href'));
        return match ? Number(match[1]) : null;
      };
      const isBest = (row, ids) => {
        const id = rowId(row);
        if (id) return ids.has(id);
        const title = row.querySelector('.react-chat-row-title');
        const texts = title ? [title.textContent.trim().toLowerCase()] : [...row.querySelectorAll('span, div, p, a')].filter(node => !node.firstElementChild).map(node => node.textContent.trim().toLowerCase());
        return [...ids].some(best => {
          const names = people.get(best);
          return Array.isArray(names) && names.some(name => texts.includes(name));
        });
      };
      const apply = () => {
        queued = false;
        const container = document.getElementById('chat-container') || document.querySelector('.react-chat-root') || document.body;
        if (!container) return;
        const on = Rk.isEnabled(ctx.id);
        const ids = on ? bestIds() : new Set();
        if (on) loadPeople(ids);
        const lists = new Map();
        for (const list of container.querySelectorAll('.react-chat-thread-list, [data-testid="react-chat-thread-list"]')) {
          lists.set(list, [...list.querySelectorAll(':scope > .react-chat-row')]);
        }
        for (const [list, rows] of lists) {
          let found = false;
          for (const row of rows) {
            const best = on && isBest(row, ids);
            row.classList.toggle('rk-chat-best', best);
            if (best) found = true;
          }
          list.classList.toggle('rk-chat-pinned', on && found);
          list.classList.toggle('rk-chat-has-best', on && found);
          if (on && found && !list.querySelector(':scope > .rk-chat-label')) {
            const tag = /^(UL|OL)$/.test(list.tagName) ? 'li' : 'div';
            list.prepend(el(tag, { class: 'rk-chat-label', role: 'presentation' }, 'Best friends'), el(tag, { class: 'rk-chat-label rk-chat-label-rest', role: 'presentation' }, 'Friends'));
          }
          if (!(on && found)) for (const label of list.querySelectorAll(':scope > .rk-chat-label')) label.remove();
        }
      };
      const schedule = () => {
        if (queued) return;
        queued = true;
        requestAnimationFrame(apply);
      };
      Rk.observe('.react-chat-thread-list, [data-testid="react-chat-thread-list"]', container => {
        new MutationObserver(records => {
          if (records.every(record => [...record.addedNodes, ...record.removedNodes].every(node => node.nodeType === 1 && node.classList.contains('rk-chat-label')))) return;
          schedule();
        }).observe(container, { childList: true, subtree: true });
        schedule();
      });
      Rk.onSettings(schedule);
    }
  });

  Rk.feature({
    id: 'site.chatQuickReplies',
    category: 'site',
    name: 'Chat quick replies',
    description: 'Adds a button next to the chat message box with saved replies that send with one click.',
    default: false,
    css: `
      .rk-quick-reply-button {
        flex: none;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        margin: 0 4px 2px 0;
        padding: 0;
        border: 0;
        border-radius: 999px;
        background: transparent;
        color: var(--rk-muted);
        cursor: pointer;
        transition: background-color var(--rk-fast) ease, color var(--rk-fast) ease;
      }
      .rk-quick-reply-button:hover,
      .rk-quick-reply-button[aria-expanded="true"] {
        background: var(--rk-hover);
        color: var(--rk-text-strong);
      }
      .rk-quick-replies {
        width: 220px;
        max-height: 280px;
        overflow-y: auto;
        overscroll-behavior: contain;
      }
      .rk-quick-reply-row {
        display: flex;
        align-items: center;
      }
      .rk-quick-reply-row > .rk-menu-item {
        flex: 1;
        min-width: 0;
      }
      .rk-quick-reply-row > .rk-menu-item > span {
        min-width: 0;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
      }
      .rk-quick-reply-remove {
        flex: none;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 26px;
        height: 26px;
        padding: 0;
        border: 0;
        border-radius: var(--rk-radius);
        background: transparent;
        color: var(--rk-muted);
        opacity: 0;
        cursor: pointer;
        transition: opacity var(--rk-fast) ease, background-color var(--rk-fast) ease;
      }
      .rk-quick-reply-row:hover .rk-quick-reply-remove,
      .rk-quick-reply-remove:focus-visible {
        opacity: 1;
      }
      .rk-quick-reply-remove:hover {
        background: var(--rk-hover);
        color: var(--rk-danger);
      }
      .rk-quick-reply-empty {
        padding: 8px 10px;
        font-size: 13px;
        color: var(--rk-muted);
      }
    `,
    run(ctx) {
      const defaults = ['gg', 'brb', 'one sec', 'join me?', 'on my way'];
      const fieldSelector = 'textarea, input[type="text"], input:not([type]), [contenteditable="true"]';
      let close = null;
      const saved = () => {
        const list = Rk.store.get('chat.quickReplies', null);
        if (!Array.isArray(list)) return defaults;
        return list.filter(text => typeof text === 'string' && text.trim()).map(text => text.trim().slice(0, 300)).slice(0, 30);
      };
      const insert = (field, text) => {
        field.focus();
        if (field.isContentEditable) {
          document.execCommand('insertText', false, text);
          return;
        }
        const proto = field instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
        const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
        const start = typeof field.selectionStart === 'number' ? field.selectionStart : field.value.length;
        const end = typeof field.selectionEnd === 'number' ? field.selectionEnd : field.value.length;
        const next = field.value.slice(0, start) + text + field.value.slice(end);
        setter.call(field, next);
        field.dispatchEvent(new Event('input', { bubbles: true }));
        const caret = start + text.length;
        if (typeof field.setSelectionRange === 'function') field.setSelectionRange(caret, caret);
      };
      const send = (field, text) => {
        if (field.isContentEditable) field.textContent = '';
        else Object.getOwnPropertyDescriptor(field instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype, 'value').set.call(field, '');
        insert(field, text);
        requestAnimationFrame(() => {
          const shell = field.closest('.react-chat-dialog-shell');
          const button = shell && shell.querySelector('button[aria-label*="send" i], button[type="submit"]');
          if (button && !button.disabled) {
            button.click();
            return;
          }
          field.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true }));
        });
      };
      const open = (button, field) => {
        if (close) {
          close();
          return;
        }
        const menu = el('div', { class: 'rk-menu rk-quick-replies', role: 'menu' });
        const render = () => {
          const replies = saved();
          menu.replaceChildren(
            ...(replies.length ? replies.map((text, index) => {
              const item = el('button', { type: 'button', class: 'rk-menu-item', role: 'menuitem', title: text }, el('span', null, text));
              item.addEventListener('click', () => {
                close();
                send(field, text);
              });
              const remove = el('button', { type: 'button', class: 'rk-quick-reply-remove', 'aria-label': `Remove ${text}`, title: 'Remove' }, icon('close', 14));
              remove.addEventListener('click', event => {
                event.stopPropagation();
                Rk.store.set('chat.quickReplies', saved().filter((entry, position) => position !== index));
                render();
              });
              return el('div', { class: 'rk-quick-reply-row' }, item, remove);
            }) : [el('div', { class: 'rk-quick-reply-empty' }, 'No saved replies yet')]),
            el('button', { type: 'button', class: 'rk-menu-item', role: 'menuitem', onclick: async () => {
              close();
              const text = await ui.prompt('Type a reply to keep for later.', { title: 'Add quick reply', maxLength: 300, confirmLabel: 'Add' });
              const clean = typeof text === 'string' ? text.trim().slice(0, 300) : '';
              if (!clean) return;
              const replies = saved();
              if (replies.length >= 30) {
                ui.toast('You can keep up to 30 quick replies', { tone: 'warning' });
                return;
              }
              Rk.store.set('chat.quickReplies', [...replies, clean]);
              ui.toast('Quick reply saved', { tone: 'success' });
            } }, icon('plus', 16), el('span', null, 'Add reply'))
          );
        };
        const onDown = event => {
          if (!menu.contains(event.target) && !button.contains(event.target)) close();
        };
        const onKey = event => {
          if (event.key === 'Escape') close();
        };
        close = () => {
          document.removeEventListener('mousedown', onDown, true);
          document.removeEventListener('keydown', onKey, true);
          button.setAttribute('aria-expanded', 'false');
          menu.classList.remove('rk-menu-open');
          setTimeout(() => menu.remove(), 180);
          close = null;
        };
        render();
        document.body.append(menu);
        const rect = button.getBoundingClientRect();
        menu.style.left = `${Math.max(8, Math.round(rect.left + window.scrollX))}px`;
        menu.style.top = `${Math.max(8, Math.round(rect.top + window.scrollY - menu.offsetHeight - 6))}px`;
        button.setAttribute('aria-expanded', 'true');
        document.addEventListener('mousedown', onDown, true);
        document.addEventListener('keydown', onKey, true);
        requestAnimationFrame(() => menu.classList.add('rk-menu-open'));
      };
      const attach = shell => {
        if (shell.querySelector('[data-testid="react-chat-thread-list"]')) return;
        const field = shell.querySelector(fieldSelector);
        if (!field || shell.querySelector('.rk-quick-reply-button')) return;
        const button = el('button', { type: 'button', class: 'rk-quick-reply-button', 'aria-label': 'Quick replies', 'aria-haspopup': 'menu', 'aria-expanded': 'false', title: 'Quick replies' }, icon('note', 18));
        button.addEventListener('click', event => {
          event.preventDefault();
          open(button, field.isConnected ? field : shell.querySelector(fieldSelector) || field);
        });
        button.classList.toggle('rk-hidden', !Rk.isEnabled(ctx.id));
        const box = field.closest('.flex.items-end') || field.parentElement;
        if (box && box !== shell) box.prepend(button);
        else field.before(button);
      };
      Rk.observe('.react-chat-dialog-shell', shell => {
        attach(shell);
        new MutationObserver(() => {
          if (!shell.querySelector('.rk-quick-reply-button')) attach(shell);
        }).observe(shell, { childList: true, subtree: true });
      });
      Rk.onSettings(() => {
        const on = Rk.isEnabled(ctx.id);
        for (const button of document.querySelectorAll('.rk-quick-reply-button')) button.classList.toggle('rk-hidden', !on);
        if (!on && close) close();
      });
    }
  });

  Rk.feature({
    id: 'site.smoothScroll',
    category: 'site',
    name: 'Smooth scrolling',
    description: 'Scrolls smoothly when jumping to another part of a page.',
    default: false,
    css: `
      html {
        scroll-behavior: smooth;
      }
    `
  });

  Rk.feature({
    id: 'site.accentColor',
    category: 'site',
    name: 'Accent color',
    description: 'Recolors primary buttons and links with a color you pick.',
    default: false,
    options: [
      { key: 'color', label: 'Accent color', type: 'color', default: '#335fff' }
    ],
    css: ctx => {
      const color = ctx.option('color');
      const buttons = ['.btn-primary-md', '.btn-primary-lg', '.btn-primary-sm', '.btn-cta-md', '.btn-cta-lg', '.btn-growth-md', '.btn-growth-lg', '.btn-common-play-game-lg'];
      return `
        :root,
        .light-theme,
        .dark-theme {
          --rk-accent: ${color} !important;
          --rk-accent-hover: color-mix(in srgb, ${color} 86%, var(--rk-text-strong)) !important;
          --rk-accent-soft: color-mix(in srgb, ${color} 15%, transparent) !important;
          --color-action-emphasis-background: ${color} !important;
        }
        ${buttons.join(',\n')} {
          background-color: ${color} !important;
          border-color: ${color} !important;
        }
        ${buttons.map(selector => `${selector}:hover`).join(',\n')} {
          filter: brightness(1.08);
        }
        .text-link {
          color: ${color} !important;
        }
        .dark-theme .text-link,
        .dark-theme .rk-link,
        .dark-theme .rk-pill-accent,
        .dark-theme .rk-btn-active {
          color: color-mix(in srgb, ${color} 65%, var(--rk-text-strong)) !important;
        }
      `;
    }
  });

  Rk.feature({
    id: 'site.fontChoice',
    category: 'site',
    name: 'Site font',
    description: 'Switches the site font to a system, rounded, serif or monospace style.',
    default: false,
    options: [
      { key: 'font', label: 'Font', type: 'select', choices: [['system', 'System'], ['rounded', 'Rounded'], ['serif', 'Serif'], ['mono', 'Monospace']], default: 'system' }
    ],
    css: ctx => {
      const stacks = {
        system: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        rounded: 'ui-rounded, "SF Pro Rounded", system-ui, sans-serif',
        serif: 'Georgia, "Times New Roman", serif',
        mono: 'ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", monospace'
      };
      const stack = stacks[ctx.option('font')] || stacks.system;
      return `
        :root {
          --rk-font: ${stack} !important;
        }
        body,
        body *:not([class*="icon"], code, kbd, samp, svg, svg *) {
          font-family: ${stack} !important;
        }
      `;
    }
  });

  Rk.feature({
    id: 'site.wideLayout',
    category: 'site',
    name: 'Wide layout',
    description: 'Lets the main content grow wider on large screens.',
    default: false,
    options: [
      { key: 'width', label: 'Maximum width', type: 'number', min: 1100, max: 2400, step: 50, default: 1600 }
    ],
    css: ctx => `
      #container-main > .content,
      #content {
        box-sizing: border-box !important;
        width: 100% !important;
        max-width: ${ctx.option('width')}px !important;
        margin-left: auto !important;
        margin-right: auto !important;
      }
    `
  });

  Rk.feature({
    id: 'site.roundedThumbs',
    category: 'site',
    name: 'Rounded thumbnails',
    description: 'Rounds the corners of experience and item thumbnails.',
    default: false,
    options: [
      { key: 'radius', label: 'Corner radius', type: 'number', min: 0, max: 24, step: 1, default: 12 }
    ],
    css: ctx => {
      const radius = ctx.option('radius');
      const thumbs = [
        '.thumbnail-2d-container:not(.radius-circle, [class*="avatar"], [class*="headshot"]):not(:is(.radius-circle, [class*="avatar"], [class*="headshot"]) *)',
        '.game-card-thumb-container',
        '.item-card-thumb-container'
      ];
      return `
        ${thumbs.join(',\n')} {
          border-radius: ${radius}px !important;
          overflow: hidden !important;
        }
        ${thumbs.map(selector => `${selector} img`).join(',\n')} {
          border-radius: ${radius}px !important;
        }
      `;
    }
  });

  Rk.feature({
    id: 'site.reduceMotion',
    category: 'site',
    name: 'Reduce motion',
    description: 'Turns off Roblox animations and transitions.',
    default: false,
    css: `
      *:not([class^="rk-"], [class*=" rk-"], [data-rk-tip]),
      *:not([class^="rk-"], [class*=" rk-"], [data-rk-tip])::before,
      *:not([class^="rk-"], [class*=" rk-"], [data-rk-tip])::after {
        transition-duration: 0.01ms !important;
        transition-delay: 0s !important;
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
      }
      .shimmer {
        animation: none !important;
      }
    `
  });

  Rk.feature({
    id: 'site.focusRings',
    category: 'site',
    name: 'Clear focus rings',
    description: 'Shows a clear outline around whatever has keyboard focus.',
    default: false,
    css: `
      a:focus-visible,
      button:focus-visible,
      input:focus-visible,
      select:focus-visible,
      textarea:focus-visible,
      [tabindex]:not([tabindex="-1"]):focus-visible {
        outline: 2px solid var(--rk-accent) !important;
        outline-offset: 2px !important;
      }
    `
  });

  Rk.feature({
    id: 'site.themedScrollbars',
    category: 'site',
    name: 'Themed scrollbars',
    description: 'Uses thin rounded scrollbars that match the theme.',
    css: `
      ::-webkit-scrollbar {
        width: 10px;
        height: 10px;
      }
      ::-webkit-scrollbar-track,
      ::-webkit-scrollbar-corner {
        background: transparent;
      }
      ::-webkit-scrollbar-thumb {
        border: 2px solid transparent;
        border-radius: 999px;
        background-color: color-mix(in srgb, var(--rk-muted) 55%, transparent);
        background-clip: padding-box;
      }
      ::-webkit-scrollbar-thumb:hover {
        background-color: color-mix(in srgb, var(--rk-muted) 80%, transparent);
      }
      @supports not selector(::-webkit-scrollbar) {
        html {
          scrollbar-width: thin;
          scrollbar-color: color-mix(in srgb, var(--rk-muted) 55%, transparent) transparent;
        }
      }
    `
  });

  Rk.feature({
    id: 'site.hideAgeLabel',
    category: 'site',
    name: 'Hide age label',
    description: 'Hides the age label next to your name in the header.',
    default: false,
    css: hide('.age-bracket-label')
  });

  Rk.feature({
    id: 'site.hideUncheckedLabel',
    category: 'site',
    name: 'Hide unchecked label',
    description: 'Hides the Unchecked age check label next to your name in the sidebar.',
    default: false,
    css: hide(':is(#left-navigation-container, #navigation) span.large\\:fill.large\\:justify-end')
  });

  Rk.feature({
    id: 'site.hideNotificationBell',
    category: 'site',
    name: 'Hide notification bell',
    description: 'Hides the notification bell in the header.',
    default: false,
    css: hide('#navbar-stream')
  });

  Rk.feature({
    id: 'site.cleanTitles',
    category: 'site',
    name: 'Clean tab titles',
    description: 'Removes " - Roblox" from the end of tab titles.',
    default: false,
    run(ctx) {
      const clean = () => {
        if (!Rk.isEnabled(ctx.id)) return;
        const next = document.title.replace(/\s+-\s+Roblox\s*$/, '');
        if (next && next !== document.title) document.title = next;
      };
      Rk.observe('head > title', node => {
        clean();
        new MutationObserver(clean).observe(node, { childList: true, characterData: true, subtree: true });
      });
    }
  });

  Rk.feature({
    id: 'site.backToTop',
    category: 'site',
    name: 'Back to top button',
    description: 'Adds a button that takes you back to the top of long pages.',
    css: () => `
      .rk-btn.rk-site-top {
        position: fixed;
        right: 24px;
        bottom: 24px;
        z-index: 1035;
        border-radius: 50%;
        background: var(--rk-bg);
        border: 1px solid var(--rk-border);
        box-shadow: 0 4px 14px color-mix(in srgb, var(--rk-overlay) 40%, transparent);
        opacity: 0;
        visibility: hidden;
        transform: translateY(8px);
        transition: opacity var(--rk-med) var(--rk-ease), transform var(--rk-med) var(--rk-ease), background-color var(--rk-fast) ease, visibility 0s linear var(--rk-med);
      }
      .rk-btn.rk-site-top:hover {
        background: var(--rk-surface-2);
      }
      .rk-btn.rk-site-top-visible {
        opacity: 1;
        visibility: visible;
        transform: translateY(0);
        transition-delay: 0s;
      }
      .rk-btn.rk-site-top-visible:active {
        transform: scale(0.94);
      }
      .rk-site-top .rk-icon {
        transform: rotate(180deg);
      }
      ${Rk.isEnabled('site.hideChat') ? '' : 'body:has(#chat-container) .rk-btn.rk-site-top { bottom: 76px; }'}
      @media print {
        .rk-site-top {
          display: none !important;
        }
      }
    `,
    run(ctx) {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
      const button = ui.button('', { variant: 'secondary', size: 'md', icon: 'chevronDown', onClick: () => window.scrollTo({ top: 0, behavior: reduced.matches ? 'auto' : 'smooth' }) });
      button.classList.add('rk-site-top');
      ui.tip(button, 'Back to top');
      Rk.mount('body', button);
      onFrame(['scroll', 'resize'], () => button.classList.toggle('rk-site-top-visible', window.scrollY > 900));
      hideWhenOff(ctx.id, '.rk-site-top');
    }
  });

  Rk.feature({
    id: 'site.scrollProgress',
    category: 'site',
    name: 'Scroll progress bar',
    description: 'Shows a thin bar at the top of the page with how far you have scrolled.',
    default: false,
    css: `
      .rk-site-progress {
        position: fixed;
        top: 0;
        left: 0;
        z-index: 1060;
        width: 100%;
        height: 3px;
        background: var(--rk-accent);
        transform: scaleX(0);
        transform-origin: 0 50%;
        pointer-events: none;
        will-change: transform;
      }
      @media print {
        .rk-site-progress {
          display: none !important;
        }
      }
    `,
    run(ctx) {
      const bar = el('div', { class: 'rk-site-progress', 'aria-hidden': 'true' });
      Rk.mount('body', bar);
      onFrame(['scroll', 'resize'], () => {
        const room = document.documentElement.scrollHeight - window.innerHeight;
        const ratio = room > 0 ? Math.min(1, Math.max(0, window.scrollY / room)) : 0;
        bar.style.transform = `scaleX(${ratio.toFixed(4)})`;
      });
      hideWhenOff(ctx.id, '.rk-site-progress');
    }
  });

  Rk.feature({
    id: 'site.newTabLinks',
    category: 'site',
    name: 'Open cards in new tabs',
    description: 'Opens experience, item and profile cards in a new tab.',
    default: false,
    run() {
      Rk.observe('a.game-card-link, a.item-card-link, a.avatar-card-link', link => {
        link.target = '_blank';
        link.relList.add('noopener');
      });
    }
  });

  headerButton({
    id: 'site.headerFriends',
    name: 'Friends button in header',
    description: 'Adds a friends button to the header.',
    order: 1,
    href: '/users/friends',
    iconName: 'users',
    label: 'Friends'
  });

  headerButton({
    id: 'site.headerMessages',
    name: 'Messages button in header',
    description: 'Adds a messages button to the header.',
    order: 2,
    href: '/my/messages',
    iconName: 'note',
    label: 'Messages'
  });

  headerButton({
    id: 'site.headerTrades',
    name: 'Trades button in header',
    description: 'Adds a trades button to the header.',
    order: 3,
    href: '/trades',
    iconName: 'swap',
    label: 'Trades'
  });

  headerButton({
    id: 'site.headerAvatar',
    name: 'Avatar button in header',
    description: 'Adds an avatar editor button to the header.',
    order: 4,
    href: '/my/avatar',
    iconName: 'user',
    label: 'Avatar'
  });

  Rk.feature({
    id: 'site.forceTheme',
    category: 'site',
    name: 'Force theme',
    description: 'Uses the theme you pick here without changing your account setting.',
    default: false,
    options: [
      { key: 'theme', label: 'Theme', type: 'select', choices: [['dark', 'Dark'], ['light', 'Light'], ['system', 'Match system']], default: 'dark' }
    ],
    run(ctx) {
      const media = window.matchMedia('(prefers-color-scheme: dark)');
      let original = null;
      let forced = false;
      let streak = 0;
      let streakStart = 0;
      const setTheme = (body, theme) => {
        const other = theme === 'dark' ? 'light' : 'dark';
        if (body.classList.contains(`${theme}-theme`) && !body.classList.contains(`${other}-theme`)) return;
        const now = Date.now();
        if (now - streakStart > 2000) {
          streakStart = now;
          streak = 0;
        }
        streak += 1;
        if (streak > 10) return;
        body.classList.remove(`${other}-theme`);
        body.classList.add(`${theme}-theme`);
      };
      const apply = () => {
        const body = document.body;
        if (!body) return;
        if (original === null) original = body.classList.contains('light-theme') ? 'light' : 'dark';
        if (Rk.isEnabled(ctx.id)) {
          const choice = ctx.option('theme');
          forced = true;
          setTheme(body, choice === 'system' ? (media.matches ? 'dark' : 'light') : choice);
        } else if (forced) {
          forced = false;
          setTheme(body, original);
        }
      };
      media.addEventListener('change', apply);
      Rk.onSettings(apply);
      Rk.waitFor('body').then(body => {
        apply();
        new MutationObserver(apply).observe(body, { attributes: true, attributeFilter: ['class'] });
      });
    }
  });

  Rk.feature({
    id: 'site.amoledDark',
    category: 'site',
    name: 'Pure black dark theme',
    description: 'Makes the dark theme pure black.',
    default: false,
    css: `
      :root:has(> body.dark-theme),
      body.dark-theme {
        --color-surface-0: #000000 !important;
        --dark-mode-surface-0: #000000 !important;
        --rk-bg: #000000;
      }
      body.dark-theme,
      .dark-theme #wrap,
      .dark-theme #container-main,
      .dark-theme .container-main {
        background-color: #000000 !important;
      }
    `
  });

  Rk.feature({
    id: 'site.cardLift',
    category: 'site',
    name: 'Card hover lift',
    description: 'Lifts experience and item cards slightly when you hover them.',
    default: false,
    css: `
      @media (prefers-reduced-motion: no-preference) {
        .game-card-container,
        .item-card-container {
          border-radius: var(--rk-radius);
          transition: transform 160ms var(--rk-ease), box-shadow 160ms var(--rk-ease);
        }
        .game-card-container:hover,
        .item-card-container:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px color-mix(in srgb, var(--rk-overlay) 35%, transparent);
        }
      }
    `
  });

  Rk.feature({
    id: 'site.pageLoadBar',
    category: 'site',
    name: 'Page load bar',
    description: 'Shows a loading bar at the top while the next page loads.',
    default: false,
    css: `
      .rk-site-loadbar {
        position: fixed;
        top: 0;
        left: 0;
        z-index: 1061;
        width: 100%;
        height: 3px;
        background: var(--rk-accent);
        transform: scaleX(0);
        transform-origin: 0 50%;
        opacity: 0;
        pointer-events: none;
        transition: opacity var(--rk-med) ease;
      }
      .rk-site-loadbar.rk-site-loading {
        opacity: 1;
        animation: rk-site-load 8s cubic-bezier(0.1, 0.6, 0.2, 1) forwards;
      }
      @media (prefers-reduced-motion: reduce) {
        .rk-site-loadbar.rk-site-loading {
          animation: none;
          transform: scaleX(0.6);
        }
      }
      @keyframes rk-site-load {
        0% {
          transform: scaleX(0);
        }
        4% {
          transform: scaleX(0.3);
        }
        100% {
          transform: scaleX(0.92);
        }
      }
      @media print {
        .rk-site-loadbar {
          display: none !important;
        }
      }
    `,
    run(ctx) {
      const bar = el('div', { class: 'rk-site-loadbar', 'aria-hidden': 'true' });
      let fallback = 0;
      const stop = () => {
        clearTimeout(fallback);
        bar.classList.remove('rk-site-loading');
      };
      const start = () => {
        if (!Rk.isEnabled(ctx.id) || bar.classList.contains('rk-site-loading')) return;
        bar.classList.add('rk-site-loading');
        clearTimeout(fallback);
        fallback = setTimeout(stop, 10000);
      };
      document.addEventListener('click', event => {
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        const link = event.target instanceof Element ? event.target.closest('a[href]') : null;
        if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self')) return;
        let url;
        try {
          url = new URL(link.href);
        } catch {
          return;
        }
        if (url.origin !== location.origin || (url.pathname === location.pathname && url.search === location.search)) return;
        start();
      });
      window.addEventListener('beforeunload', start);
      window.addEventListener('pageshow', stop);
      Rk.onNavigate(stop);
      Rk.mount('body', bar);
    }
  });

  Rk.feature({
    id: 'site.compactSections',
    category: 'site',
    name: 'Compact sections',
    description: 'Tightens the spacing between page sections.',
    default: false,
    css: `
      #content .container-header {
        margin-top: 0 !important;
        margin-bottom: 6px !important;
      }
      #content .container-header h2,
      #content .container-header h3 {
        margin-top: 0 !important;
        margin-bottom: 0 !important;
      }
      #content .section {
        margin-bottom: 12px !important;
      }
      #content .section + .section {
        margin-top: 0 !important;
      }
      #content .rk-section {
        margin-bottom: 12px;
      }
    `
  });

  Rk.feature({
    id: 'site.selectionColor',
    category: 'site',
    name: 'Accent text selection',
    description: 'Highlights selected text in a soft accent color.',
    default: false,
    css: `
      ::selection {
        background-color: color-mix(in srgb, var(--rk-accent) 30%, transparent);
      }
    `
  });

  Rk.feature({
    id: 'site.underlineLinks',
    category: 'site',
    name: 'Underline links',
    description: 'Underlines text links so they are easier to spot.',
    default: false,
    css: `
      .text-link,
      .rk-link {
        text-decoration: underline !important;
        text-decoration-thickness: 1px;
        text-underline-offset: 2px;
      }
    `
  });

  Rk.feature({
    id: 'site.hideVerifiedBadges',
    category: 'site',
    name: 'Hide verified badges',
    description: 'Hides verified checkmarks next to names.',
    default: false,
    css: hide([
      '.verified-badge-icon-container',
      '[class*="verified-badge-icon"]',
      'img[class*="verified-badge"]',
      'svg[class*="verified-badge"]',
      '[class*="verified-badge"]:not(:has(*))'
    ].join(',\n'))
  });

  Rk.feature({
    id: 'site.compactSidebar',
    category: 'site',
    name: 'Compact sidebar',
    description: 'Fits more sidebar items on screen with tighter spacing.',
    default: false,
    css: `
      .left-nav ul li a:not([class*="btn-"]) {
        padding-top: 4px !important;
        padding-bottom: 4px !important;
      }
    `
  });

  Rk.feature({
    id: 'site.strongerText',
    category: 'site',
    name: 'Stronger secondary text',
    description: 'Makes labels and secondary text easier to read.',
    default: false,
    css: `
      .text-secondary,
      .text-label,
      .text-description {
        color: var(--rk-text-strong) !important;
      }
    `
  });

  Rk.feature({
    id: 'site.headerShadow',
    category: 'site',
    name: 'Header shadow on scroll',
    description: 'Adds a soft shadow under the header once you scroll.',
    default: false,
    css: `
      #header {
        transition: box-shadow var(--rk-med) var(--rk-ease);
      }
      html.rk-site-scrolled #header {
        box-shadow: 0 2px 12px color-mix(in srgb, var(--rk-overlay) 40%, transparent) !important;
      }
    `,
    run() {
      onFrame(['scroll', 'resize'], () => document.documentElement.classList.toggle('rk-site-scrolled', window.scrollY > 4));
    }
  });

  Rk.feature({
    id: 'site.extraSidebarLinks',
    category: 'site',
    name: 'Extra sidebar links',
    description: 'Adds Trades and Transactions links to the sidebar.',
    default: false,
    css: `
      .rk-site-nav-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        vertical-align: middle;
      }
    `,
    run(ctx) {
      const extras = [
        { path: '/trades', match: '/trade', label: 'Trades', iconName: 'swap' },
        { path: '/transactions', match: '/transactions', label: 'Transactions', iconName: 'robux' }
      ];
      const labelText = root => {
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        let best = null;
        let bestDepth = -1;
        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
          if (!/\p{L}/u.test(node.nodeValue)) continue;
          let depth = 0;
          for (let parent = node.parentNode; parent && parent !== root; parent = parent.parentNode) depth += 1;
          if (depth > bestDepth) {
            best = node;
            bestDepth = depth;
          }
        }
        return best;
      };
      hideWhenOff(ctx.id, '.rk-site-extra');
      Rk.observe('.left-nav ul', list => {
        const items = [...list.children].filter(node => node.tagName === 'LI' && node.querySelector('a[href]'));
        if (!items.some(node => node.querySelector('a[href*="/home"], a[href*="/my/avatar"], a[href*="/inventory"]'))) return;
        const template = items.find(node => {
          const text = node.querySelector('a[href]').textContent;
          return !node.querySelector('[class*="btn-"]') && !/\d/.test(text) && /\p{L}/u.test(text);
        });
        if (!template) return;
        let anchor = items.find(node => node.querySelector('a[href*="/inventory"]')) || null;
        for (const extra of extras) {
          const existing = list.querySelector(`a[href*="${extra.match}"]`);
          if (existing) {
            anchor = [...list.children].find(node => node.contains(existing)) || anchor;
            continue;
          }
          const item = template.cloneNode(true);
          item.classList.add('rk-site-extra');
          for (const node of [item, ...item.querySelectorAll('*')]) {
            for (const name of ['id', 'title', 'aria-label', 'aria-current']) node.removeAttribute(name);
            node.classList.remove('active');
          }
          const link = item.querySelector('a[href]');
          link.setAttribute('href', extra.path);
          link.removeAttribute('target');
          const text = labelText(link);
          if (text) text.nodeValue = extra.label;
          const art = item.querySelector('[class*="icon-nav"]');
          if (art) art.replaceWith(el('span', { class: 'rk-site-nav-icon' }, icon(extra.iconName, 20)));
          if (anchor) anchor.after(item);
          else list.append(item);
          anchor = item;
        }
      });
    }
  });

  Rk.feature({
    id: 'site.glassHeader',
    category: 'site',
    name: 'Glass header',
    description: 'Makes the header translucent with a blurred background.',
    default: false,
    css: `
      #rbx-body #header {
        background-color: color-mix(in srgb, var(--rk-surface) 72%, transparent) !important;
        -webkit-backdrop-filter: saturate(1.5) blur(16px);
        backdrop-filter: saturate(1.5) blur(16px);
      }
    `
  });

  Rk.feature({
    id: 'site.readableText',
    category: 'site',
    name: 'Readable descriptions',
    description: 'Gives long descriptions larger text and more line spacing.',
    default: false,
    css: `
      .game-description,
      pre.game-description,
      .description-content,
      #item-details-container .description-content {
        font-size: 16px !important;
        line-height: 1.6 !important;
      }
    `
  });

  Rk.feature({
    id: 'site.collapsibleSidebar',
    category: 'site',
    name: 'Collapsible sidebar',
    description: 'Adds a button that hides or shows the sidebar and remembers your choice.',
    default: false,
    css: () => `
      :is(#navigation, [data-rk-sidebar]) {
        transition: opacity var(--rk-med) var(--rk-ease), transform var(--rk-med) var(--rk-ease), left var(--rk-med) var(--rk-ease), visibility 0s linear 0s !important;
      }
      #container-main,
      .container-main {
        transition: margin-left var(--rk-med) var(--rk-ease);
      }
      html.rk-site-sidebar-collapsed {
        --left-nav-reserved-width: 0px !important;
      }
      html.rk-site-sidebar-collapsed :is(#navigation, [data-rk-sidebar]) {
        opacity: 0 !important;
        visibility: hidden !important;
        transform: translateX(-16px) !important;
        pointer-events: none !important;
        transition: opacity var(--rk-med) var(--rk-ease), transform var(--rk-med) var(--rk-ease), left var(--rk-med) var(--rk-ease), visibility 0s linear var(--rk-med) !important;
      }
      html.rk-site-sidebar-collapsed #container-main,
      html.rk-site-sidebar-collapsed .container-main {
        margin-left: 0 !important;
      }
      .rk-btn.rk-site-sidebar-toggle {
        position: fixed;
        left: 12px;
        bottom: 12px;
        z-index: 1035;
        background: var(--rk-bg);
        border: 1px solid var(--rk-border);
        box-shadow: 0 2px 8px color-mix(in srgb, var(--rk-overlay) 30%, transparent);
      }
      .rk-btn.rk-site-sidebar-toggle:hover {
        background: var(--rk-surface-2);
      }
      .rk-site-sidebar-toggle[data-rk-tip]::after {
        left: 0;
        transform: translate(0, 4px);
      }
      .rk-site-sidebar-toggle[data-rk-tip]:hover::after,
      .rk-site-sidebar-toggle[data-rk-tip]:focus-visible::after {
        transform: translate(0, 0);
      }
      body:not(:has(#navigation, [data-rk-sidebar])) .rk-btn.rk-site-sidebar-toggle {
        display: none !important;
      }
      ${Rk.isEnabled('site.hideSidebar') ? '.rk-btn.rk-site-sidebar-toggle { display: none !important; }' : ''}
      @media print {
        .rk-site-sidebar-toggle {
          display: none !important;
        }
      }
    `,
    run(ctx) {
      const root = document.documentElement;
      let collapsed = Rk.store.get('site.sidebarCollapsed', false) === true;
      const button = ui.button('', { variant: 'secondary', onClick: () => {
        collapsed = !collapsed;
        Rk.store.set('site.sidebarCollapsed', collapsed);
        render();
      } });
      const navShown = () => {
        const nav = document.querySelector('[data-rk-sidebar]') || document.getElementById('navigation');
        return Boolean(nav) && getComputedStyle(nav).display !== 'none' && nav.getBoundingClientRect().right > 0;
      };
      const render = () => {
        const enabled = Rk.isEnabled(ctx.id);
        const label = collapsed ? 'Show sidebar' : 'Hide sidebar';
        root.classList.toggle('rk-site-sidebar-collapsed', enabled && collapsed);
        button.classList.toggle('rk-hidden', !enabled || (!collapsed && document.body !== null && !navShown()));
        button.replaceChildren(icon(collapsed ? 'chevronRight' : 'chevronLeft', 16));
        button.setAttribute('data-rk-tip', label);
        button.setAttribute('aria-label', label);
        button.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
      };
      button.classList.add('rk-site-sidebar-toggle');
      onFrame(['resize'], render);
      markSidebar();
      Rk.mount('body', button);
      Rk.waitFor('#navigation, [data-rk-sidebar]').then(render);
      Rk.onSettings(render);
    }
  });

  Rk.feature({
    id: 'site.pageBackground',
    category: 'site',
    name: 'Page background color',
    description: 'Sets your own page background color for each theme.',
    default: false,
    options: [
      { key: 'light', label: 'Light theme color', type: 'color', default: '#f2f4f5' },
      { key: 'dark', label: 'Dark theme color', type: 'color', default: '#111114' }
    ],
    css: ctx => `
      body.light-theme,
      body.light-theme #container-main {
        background-color: ${ctx.option('light')} !important;
      }
      ${Rk.isEnabled('site.amoledDark') ? '' : `body.dark-theme,
      body.dark-theme #container-main {
        background-color: ${ctx.option('dark')} !important;
      }`}
    `
  });

  const soundPacks = {
    csgo: {
      label: 'CS:GO',
      hover: [{ wave: 'square', from: 3200, to: 3000, length: 0.012, gain: 0.05 }],
      click: [{ noise: 'bandpass', freq: 2500, length: 0.03, gain: 0.5 }, { wave: 'square', from: 1900, to: 1500, length: 0.035, gain: 0.12 }]
    },
    chill: {
      label: 'Chill',
      hover: [{ wave: 'sine', from: 659, length: 0.12, gain: 0.08 }],
      click: [{ wave: 'sine', from: 523, length: 0.25, gain: 0.25 }, { wave: 'sine', from: 784, length: 0.3, gain: 0.12, delay: 0.04 }]
    },
    minimal: {
      label: 'Minimal',
      hover: [{ wave: 'sine', from: 1400, length: 0.012, gain: 0.06 }],
      click: [{ wave: 'sine', from: 1000, length: 0.025, gain: 0.18 }]
    },
    mechanical: {
      label: 'Mechanical keyboard',
      hover: [{ noise: 'bandpass', freq: 3000, length: 0.008, gain: 0.2 }],
      click: [{ noise: 'bandpass', freq: 2000, length: 0.015, gain: 0.5 }, { noise: 'lowpass', freq: 300, length: 0.04, gain: 0.5, delay: 0.012 }]
    },
    typewriter: {
      label: 'Typewriter',
      hover: [{ noise: 'highpass', freq: 5000, length: 0.01, gain: 0.2 }],
      click: [{ noise: 'highpass', freq: 3500, length: 0.025, gain: 0.5 }, { noise: 'bandpass', freq: 400, length: 0.04, gain: 0.4 }]
    },
    wood: {
      label: 'Wood',
      hover: [{ noise: 'bandpass', freq: 1400, length: 0.02, gain: 0.25 }],
      click: [{ noise: 'bandpass', freq: 800, length: 0.05, gain: 0.6 }, { wave: 'sine', from: 200, to: 120, length: 0.07, gain: 0.3 }]
    },
    glass: {
      label: 'Glass',
      hover: [{ wave: 'sine', from: 2637, length: 0.1, gain: 0.07 }],
      click: [{ wave: 'triangle', from: 2093, length: 0.35, gain: 0.14 }, { wave: 'sine', from: 3136, length: 0.3, gain: 0.08, delay: 0.01 }]
    },
    bubble: {
      label: 'Bubble',
      hover: [{ wave: 'sine', from: 600, to: 900, length: 0.05, gain: 0.15 }],
      click: [{ wave: 'sine', from: 300, to: 1000, length: 0.09, gain: 0.35 }]
    },
    droplet: {
      label: 'Droplet',
      hover: [{ wave: 'sine', from: 1400, to: 1000, length: 0.03, gain: 0.12 }],
      click: [{ wave: 'sine', from: 1200, to: 600, length: 0.06, gain: 0.3 }, { wave: 'sine', from: 1800, to: 900, length: 0.05, gain: 0.1, delay: 0.03 }]
    },
    pop: {
      label: 'Pop',
      hover: [{ wave: 'sine', from: 700, to: 400, length: 0.04, gain: 0.15 }],
      click: [{ wave: 'sine', from: 400, to: 90, length: 0.08, gain: 0.45 }]
    },
    retro: {
      label: 'Retro',
      hover: [{ wave: 'square', from: 1320, length: 0.025, gain: 0.05 }],
      click: [{ wave: 'square', from: 660, to: 990, length: 0.07, gain: 0.12 }]
    },
    arcade: {
      label: 'Arcade',
      hover: [{ wave: 'triangle', from: 1568, length: 0.03, gain: 0.08 }],
      click: [{ wave: 'square', from: 523, length: 0.05, gain: 0.1 }, { wave: 'square', from: 784, length: 0.05, gain: 0.1, delay: 0.05 }, { wave: 'square', from: 1047, length: 0.07, gain: 0.1, delay: 0.1 }]
    },
    coin: {
      label: 'Coin',
      hover: [{ wave: 'square', from: 1976, length: 0.02, gain: 0.04 }],
      click: [{ wave: 'square', from: 988, length: 0.06, gain: 0.08 }, { wave: 'square', from: 1319, length: 0.18, gain: 0.08, delay: 0.06 }]
    },
    laser: {
      label: 'Laser',
      hover: [{ wave: 'sawtooth', from: 900, to: 600, length: 0.04, gain: 0.03 }],
      click: [{ wave: 'sawtooth', from: 1600, to: 180, length: 0.14, gain: 0.08 }]
    },
    scifi: {
      label: 'Sci-fi',
      hover: [{ wave: 'sine', from: 880, to: 1100, length: 0.06, gain: 0.08 }],
      click: [{ wave: 'sine', from: 220, to: 880, length: 0.2, gain: 0.2 }, { wave: 'triangle', from: 440, to: 1760, length: 0.15, gain: 0.06 }]
    }
  };

  const eventSounds = {
    toggle: [{ wave: 'sine', from: 900, to: 1200, length: 0.05, gain: 0.15 }, { wave: 'sine', from: 1500, length: 0.04, gain: 0.08, delay: 0.03 }],
    tab: [{ wave: 'triangle', from: 700, to: 900, length: 0.06, gain: 0.12 }],
    join: [{ wave: 'sine', from: 523, length: 0.12, gain: 0.18 }, { wave: 'sine', from: 659, length: 0.12, gain: 0.18, delay: 0.08 }, { wave: 'sine', from: 784, length: 0.22, gain: 0.18, delay: 0.16 }, { wave: 'triangle', from: 1047, length: 0.25, gain: 0.08, delay: 0.16 }],
    error: [{ wave: 'square', from: 220, to: 180, length: 0.12, gain: 0.08 }, { wave: 'square', from: 180, to: 150, length: 0.16, gain: 0.08, delay: 0.12 }]
  };

  const typingSounds = {
    mechanical: { label: 'Mechanical', parts: [{ noise: 'bandpass', freq: 2400, length: 0.02, gain: 0.35 }, { noise: 'lowpass', freq: 280, length: 0.035, gain: 0.35, delay: 0.008 }] },
    typewriter: { label: 'Typewriter', parts: [{ noise: 'highpass', freq: 3200, length: 0.02, gain: 0.4 }, { noise: 'bandpass', freq: 500, length: 0.03, gain: 0.3 }] },
    soft: { label: 'Soft', parts: [{ wave: 'sine', from: 900, length: 0.03, gain: 0.07 }] },
    bubble: { label: 'Bubble', parts: [{ wave: 'sine', from: 500, to: 800, length: 0.04, gain: 0.12 }] }
  };

  Rk.feature({
    id: 'site.uiSounds',
    category: 'site',
    name: 'Hover and click sounds',
    description: 'Plays a short sound when you hover or click buttons and links, switch tabs, flip toggles, join games or type. Pick a sound pack from the list.',
    default: false,
    options: [
      { key: 'pack', label: 'Sound pack', type: 'select', choices: Object.entries(soundPacks).map(([key, pack]) => [key, pack.label]), default: 'csgo' },
      { key: 'hover', label: 'Play on hover', type: 'toggle', default: true },
      { key: 'click', label: 'Play on click', type: 'toggle', default: true },
      { key: 'events', label: 'Toggle, tab, join and error sounds', type: 'toggle', default: true },
      { key: 'typing', label: 'Play when typing', type: 'toggle', default: false },
      { key: 'typingSound', label: 'Typing sound', type: 'select', choices: Object.entries(typingSounds).map(([key, sound]) => [key, sound.label]), default: 'mechanical' },
      { key: 'volume', label: 'Volume', type: 'number', min: 0, max: 100, step: 5, default: 50 }
    ],
    run(ctx) {
      const targets = 'a[href], button, summary, select, label, [role="button"], [role="tab"], [role="menuitem"], [role="option"], [role="checkbox"], [role="switch"], input[type="checkbox"], input[type="radio"], input[type="submit"], .rbx-tab';
      const toggles = 'input[type="checkbox"], input[type="radio"], [role="switch"], [role="checkbox"], .rk-toggle';
      const tabs = '[role="tab"], .rbx-tab';
      const typingKeys = new Set(['Backspace', 'Delete', 'Enter']);
      let audio = null;
      let noise = null;
      let hovered = null;
      let lastHover = 0;
      const pack = () => soundPacks[ctx.option('pack')] || soundPacks.csgo;
      const warm = () => {
        if (!audio) {
          audio = new AudioContext({ latencyHint: 'interactive' });
          noise = audio.createBuffer(1, audio.sampleRate, audio.sampleRate);
          const samples = noise.getChannelData(0);
          for (let i = 0; i < samples.length; i += 1) samples[i] = Math.random() * 2 - 1;
        }
        if (audio.state === 'suspended') return audio.resume().catch(() => {});
        return null;
      };
      const play = (parts, pitch = 1) => {
        const volume = Math.min(Math.max(Number(ctx.option('volume')) || 0, 0), 100) / 100;
        if (!volume) return;
        const waking = warm();
        if (waking) {
          waking.then(() => schedule(parts, pitch, volume));
          return;
        }
        schedule(parts, pitch, volume);
      };
      const schedule = (parts, pitch, volume) => {
        const start = audio.currentTime;
        for (const part of parts) {
          const at = start + (part.delay || 0);
          const gain = audio.createGain();
          gain.gain.setValueAtTime(0.0001, at);
          gain.gain.exponentialRampToValueAtTime(part.gain * volume, at + 0.003);
          gain.gain.exponentialRampToValueAtTime(0.0001, at + part.length);
          gain.connect(audio.destination);
          let source;
          if (part.noise) {
            source = audio.createBufferSource();
            source.buffer = noise;
            const filter = audio.createBiquadFilter();
            filter.type = part.noise;
            filter.frequency.value = part.freq * pitch;
            source.connect(filter).connect(gain);
          } else {
            source = audio.createOscillator();
            source.type = part.wave;
            source.frequency.setValueAtTime(part.from * pitch, at);
            if (part.to) source.frequency.exponentialRampToValueAtTime(part.to * pitch, at + part.length);
            source.connect(gain);
          }
          source.addEventListener('ended', () => gain.disconnect(), { once: true });
          source.start(at);
          source.stop(at + part.length + 0.02);
        }
      };
      const wake = () => {
        if (Rk.isEnabled(ctx.id)) warm();
      };
      document.addEventListener('pointerdown', wake, { capture: true, once: true });
      document.addEventListener('keydown', wake, { capture: true, once: true });
      document.addEventListener('visibilitychange', () => {
        if (audio && document.visibilityState === 'visible' && Rk.isEnabled(ctx.id)) warm();
      });
      document.addEventListener('pointerover', event => {
        if (event.pointerType !== 'mouse' || !Rk.isEnabled(ctx.id) || !ctx.option('hover')) return;
        const target = event.target instanceof Element ? event.target.closest(targets) : null;
        if (target === hovered) return;
        hovered = target;
        if (!target || !navigator.userActivation.hasBeenActive) return;
        const now = performance.now();
        if (now - lastHover < 45) return;
        lastHover = now;
        play(pack().hover);
      }, true);
      document.addEventListener('pointerdown', event => {
        if (event.button !== 0 || !Rk.isEnabled(ctx.id)) return;
        const target = event.target instanceof Element ? event.target.closest(targets) : null;
        if (!target) return;
        if (ctx.option('events')) {
          const label = target.matches('button, a[href]') ? target.textContent.trim() : '';
          if (target.matches('button.btn-common-play-game-lg') || /^(join|play)$/i.test(label)) return play(eventSounds.join);
          if (target.closest(tabs)) return play(eventSounds.tab);
          if (target.matches(toggles)) return play(eventSounds.toggle);
        }
        if (ctx.option('click')) play(pack().click);
      }, true);
      document.addEventListener('keydown', event => {
        if (event.repeat || event.ctrlKey || event.metaKey || event.altKey || !Rk.isEnabled(ctx.id) || !ctx.option('typing')) return;
        if (event.key.length !== 1 && !typingKeys.has(event.key)) return;
        const field = event.target;
        const typeable = field instanceof HTMLTextAreaElement
          || (field instanceof HTMLInputElement && /^(text|search|email|url|tel|password|number)$/.test(field.type))
          || (field instanceof HTMLElement && field.isContentEditable);
        if (!typeable) return;
        const sound = typingSounds[ctx.option('typingSound')] || typingSounds.mechanical;
        play(sound.parts, 0.92 + Math.random() * 0.16);
      }, true);
      const playError = () => {
        if (Rk.isEnabled(ctx.id) && ctx.option('events') && navigator.userActivation.hasBeenActive) play(eventSounds.error);
      };
      Rk.observe('.rk-toast-danger', playError);
      Rk.observe('.alert-system-feedback .alert', alert => {
        let shown = alert.classList.contains('on');
        new MutationObserver(() => {
          const now = alert.classList.contains('on');
          if (now && !shown && alert.classList.contains('alert-warning')) playError();
          shown = now;
        }).observe(alert, { attributes: true, attributeFilter: ['class'] });
      });
      Rk.onSettings(() => {
        if (Rk.isEnabled(ctx.id) || !audio) return;
        audio.close().catch(() => {});
        audio = null;
      });
    }
  });

  const starfield = (count, size, seed) => {
    const stars = [];
    let value = seed;
    for (let i = 0; i < count; i += 1) {
      value = (value * 9301 + 49297) % 233280;
      const x = Math.round((value / 233280) * size);
      value = (value * 9301 + 49297) % 233280;
      const y = Math.round((value / 233280) * size);
      const radius = i % 7 === 0 ? 1.5 : 1;
      const alpha = (0.45 + (i % 5) * 0.12).toFixed(2);
      stars.push(`radial-gradient(${radius}px ${radius}px at ${x}px ${y}px, rgba(255, 255, 255, ${alpha}), transparent)`);
    }
    return stars.join(',\n');
  };

  const backgroundThemes = {
    space: {
      label: 'Space',
      stars: 'dense',
      background: 'radial-gradient(ellipse at 50% 120%, #1b2440 0%, #070912 60%, #030409 100%)'
    },
    universe: {
      label: 'Universe',
      stars: 'dense',
      background: 'radial-gradient(circle at 20% 30%, rgba(124, 58, 237, 0.35), transparent 45%), radial-gradient(circle at 80% 20%, rgba(236, 72, 153, 0.25), transparent 40%), radial-gradient(circle at 60% 85%, rgba(14, 165, 233, 0.25), transparent 45%), #05040d'
    },
    galaxy: {
      label: 'Galaxy',
      stars: 'dense',
      background: 'radial-gradient(ellipse 70% 25% at 50% 50%, rgba(255, 214, 170, 0.18), rgba(129, 90, 213, 0.18) 40%, transparent 70%), #04030a'
    },
    midnight: {
      label: 'Midnight',
      stars: 'light',
      background: 'radial-gradient(circle at 50% 0%, #1e293b, #020617 70%)'
    },
    aurora: {
      label: 'Aurora',
      stars: 'light',
      background: 'radial-gradient(ellipse 80% 40% at 30% 0%, rgba(16, 185, 129, 0.35), transparent 70%), radial-gradient(ellipse 60% 35% at 75% 10%, rgba(56, 189, 248, 0.3), transparent 70%), linear-gradient(#04121a, #020608)'
    },
    synthwave: {
      label: 'Synthwave',
      stars: 'light',
      grid: true,
      background: 'radial-gradient(ellipse 60% 30% at 50% 100%, rgba(255, 64, 160, 0.35), transparent 70%), linear-gradient(#0d0221 0%, #261447 60%, #2e1065 100%)'
    },
    ocean: {
      label: 'Deep ocean',
      background: 'radial-gradient(ellipse 70% 40% at 50% 0%, rgba(56, 189, 248, 0.22), transparent 70%), linear-gradient(#0a2a43 0%, #06192b 50%, #030b14 100%)'
    },
    sunset: {
      label: 'Sunset',
      background: 'linear-gradient(#1a0b2e 0%, #3d1540 45%, #6b2a45 75%, #8f4140 100%)'
    },
    ember: {
      label: 'Ember',
      background: 'radial-gradient(ellipse at 50% 110%, rgba(239, 68, 68, 0.45), transparent 60%), radial-gradient(circle at 20% 100%, rgba(249, 115, 22, 0.3), transparent 50%), #0c0503'
    },
    forest: {
      label: 'Forest',
      background: 'radial-gradient(ellipse 80% 50% at 50% 100%, rgba(34, 197, 94, 0.18), transparent 70%), linear-gradient(#071a12, #030d09)'
    },
    sakura: {
      label: 'Sakura',
      background: 'radial-gradient(circle at 15% 20%, rgba(244, 114, 182, 0.25), transparent 45%), radial-gradient(circle at 85% 80%, rgba(251, 207, 232, 0.12), transparent 45%), #160a12'
    },
    terminal: {
      label: 'Terminal',
      background: 'repeating-linear-gradient(rgba(0, 255, 70, 0.04) 0 1px, transparent 1px 4px), radial-gradient(ellipse at 50% 50%, rgba(0, 255, 70, 0.12), transparent 70%), #000000'
    }
  };

  const denseStars = starfield(40, 300, 7);
  const twinkleStars = starfield(18, 470, 31);

  Rk.feature({
    id: 'site.backgroundTheme',
    category: 'site',
    name: 'Background theme',
    description: 'Puts a themed background like space, universe or aurora behind the site. Works with the dark theme.',
    default: false,
    options: [
      { key: 'theme', label: 'Theme', type: 'select', choices: Object.entries(backgroundThemes).map(([key, theme]) => [key, theme.label]), default: 'space' }
    ],
    css: ctx => {
      const theme = backgroundThemes[ctx.option('theme')] || backgroundThemes.space;
      const root = 'html:has(> body.dark-theme)';
      const stars = theme.stars ? `
        ${root}::before {
          content: '';
          position: fixed;
          left: 0;
          right: 0;
          top: -300px;
          height: calc(100vh + 300px);
          z-index: -1;
          pointer-events: none;
          background-image: ${denseStars};
          background-size: 300px 300px;
          opacity: ${theme.stars === 'dense' ? 1 : 0.5};
          will-change: transform;
          animation: rk-site-drift 120s linear infinite;
        }
        @keyframes rk-site-drift {
          to {
            transform: translateY(300px);
          }
        }
      ` : '';
      const twinkle = theme.stars === 'dense' && !theme.grid ? `
        ${root}::after {
          content: '';
          position: fixed;
          inset: 0;
          z-index: -1;
          pointer-events: none;
          background-image: ${twinkleStars};
          background-size: 470px 470px;
          animation: rk-site-twinkle 5s ease-in-out infinite alternate;
        }
        @keyframes rk-site-twinkle {
          from {
            opacity: 0.25;
          }
          to {
            opacity: 1;
          }
        }
      ` : '';
      const grid = theme.grid ? `
        ${root}::after {
          content: '';
          position: fixed;
          left: -50%;
          right: -50%;
          bottom: -10vh;
          height: 55vh;
          z-index: -1;
          pointer-events: none;
          background-image: linear-gradient(rgba(255, 64, 160, 0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 64, 160, 0.4) 1px, transparent 1px);
          background-size: 60px 60px;
          transform: perspective(400px) rotateX(62deg);
          transform-origin: 50% 100%;
          -webkit-mask-image: linear-gradient(transparent, #000000 70%);
          mask-image: linear-gradient(transparent, #000000 70%);
          animation: rk-site-grid 3s linear infinite;
        }
        @keyframes rk-site-grid {
          to {
            background-position: 0 60px;
          }
        }
      ` : '';
      return `
        ${root} {
          background: ${theme.background} !important;
          background-attachment: fixed !important;
        }
        html body.dark-theme,
        html body.dark-theme #wrap,
        html body.dark-theme #container-main,
        html body.dark-theme .container-main {
          background: transparent !important;
        }
        ${stars}
        ${twinkle}
        ${grid}
        @media (prefers-reduced-motion: reduce) {
          ${root}::before,
          ${root}::after {
            animation: none;
          }
        }
      `;
    }
  });

  const random = (min, max) => min + Math.random() * (max - min);

  const ambientEffects = {
    snow: {
      label: 'Snow',
      count: 90,
      make: (width, height, scatter) => ({ x: random(0, width), y: scatter ? random(0, height) : -8, size: random(1, 3.2), speed: random(0.35, 1.1), sway: random(0, 6.28), alpha: random(0.45, 0.9) }),
      move: (flake, step, width, height) => {
        flake.y += flake.speed * step;
        flake.sway += 0.012 * step;
        flake.x += Math.sin(flake.sway) * 0.35 * step;
        return flake.y < height + 8;
      },
      draw: (context, flake) => {
        context.globalAlpha = flake.alpha;
        context.fillStyle = '#ffffff';
        context.beginPath();
        context.arc(flake.x, flake.y, flake.size, 0, 6.283);
        context.fill();
      }
    },
    rain: {
      label: 'Rain',
      count: 120,
      make: (width, height, scatter) => ({ x: random(-60, width), y: scatter ? random(0, height) : random(-60, -10), length: random(10, 22), speed: random(9, 15), alpha: random(0.15, 0.35) }),
      move: (drop, step, width, height) => {
        drop.y += drop.speed * step;
        drop.x += drop.speed * 0.12 * step;
        return drop.y < height + 30;
      },
      draw: (context, drop) => {
        context.globalAlpha = drop.alpha;
        context.strokeStyle = '#a8c6ff';
        context.lineWidth = 1;
        context.beginPath();
        context.moveTo(drop.x, drop.y);
        context.lineTo(drop.x + drop.length * 0.12, drop.y + drop.length);
        context.stroke();
      }
    },
    particles: {
      label: 'Floating particles',
      count: 70,
      make: (width, height, scatter) => ({ x: random(0, width), y: scatter ? random(0, height) : height + 8, size: random(0.8, 2), speed: random(0.15, 0.5), drift: random(-0.15, 0.15), alpha: random(0.2, 0.6) }),
      move: (dot, step) => {
        dot.y -= dot.speed * step;
        dot.x += dot.drift * step;
        return dot.y > -8;
      },
      draw: (context, dot) => {
        context.globalAlpha = dot.alpha;
        context.fillStyle = '#9db8ff';
        context.beginPath();
        context.arc(dot.x, dot.y, dot.size, 0, 6.283);
        context.fill();
      }
    },
    fireflies: {
      label: 'Fireflies',
      count: 28,
      make: (width, height) => ({ x: random(0, width), y: random(0, height), vx: random(-0.3, 0.3), vy: random(-0.3, 0.3), size: random(1.5, 2.6), pulse: random(0, 6.28), life: random(600, 1400) }),
      move: (fly, step, width, height) => {
        fly.pulse += 0.03 * step;
        fly.vx = Math.min(Math.max(fly.vx + random(-0.02, 0.02) * step, -0.5), 0.5);
        fly.vy = Math.min(Math.max(fly.vy + random(-0.02, 0.02) * step, -0.5), 0.5);
        fly.x += fly.vx * step;
        fly.y += fly.vy * step;
        fly.life -= step;
        return fly.life > 0 && fly.x > -20 && fly.x < width + 20 && fly.y > -20 && fly.y < height + 20;
      },
      draw: (context, fly) => {
        const glow = 0.5 + Math.sin(fly.pulse) * 0.5;
        context.fillStyle = '#d9ff7a';
        context.globalAlpha = 0.15 * glow;
        context.beginPath();
        context.arc(fly.x, fly.y, fly.size * 4, 0, 6.283);
        context.fill();
        context.globalAlpha = 0.9 * glow;
        context.beginPath();
        context.arc(fly.x, fly.y, fly.size, 0, 6.283);
        context.fill();
      }
    },
    sakura: {
      label: 'Sakura petals',
      count: 40,
      make: (width, height, scatter) => ({ x: random(-40, width), y: scatter ? random(0, height) : -12, size: random(4, 7), speed: random(0.6, 1.4), spin: random(0, 6.28), spinSpeed: random(-0.04, 0.04), sway: random(0, 6.28), alpha: random(0.6, 0.9) }),
      move: (petal, step, width, height) => {
        petal.y += petal.speed * step;
        petal.sway += 0.02 * step;
        petal.x += (0.4 + Math.sin(petal.sway) * 0.6) * step;
        petal.spin += petal.spinSpeed * step;
        return petal.y < height + 12 && petal.x < width + 20;
      },
      draw: (context, petal) => {
        context.globalAlpha = petal.alpha;
        context.fillStyle = '#ffb7d5';
        context.beginPath();
        context.ellipse(petal.x, petal.y, petal.size, petal.size * 0.55, petal.spin, 0, 6.283);
        context.fill();
      }
    },
    embers: {
      label: 'Embers',
      count: 60,
      make: (width, height, scatter) => ({ x: random(0, width), y: scatter ? random(0, height) : height + 6, size: random(0.8, 2), speed: random(0.4, 1.1), sway: random(0, 6.28), flicker: random(0, 6.28) }),
      move: (ember, step) => {
        ember.y -= ember.speed * step;
        ember.sway += 0.02 * step;
        ember.flicker += 0.15 * step;
        ember.x += Math.sin(ember.sway) * 0.4 * step;
        return ember.y > -8;
      },
      draw: (context, ember) => {
        context.globalAlpha = 0.45 + Math.sin(ember.flicker) * 0.35;
        context.fillStyle = '#ff9a3c';
        context.beginPath();
        context.arc(ember.x, ember.y, ember.size, 0, 6.283);
        context.fill();
      }
    }
  };

  Rk.feature({
    id: 'site.ambientEffects',
    category: 'site',
    name: 'Animated effects',
    description: 'Adds falling snow, rain, particles, fireflies, petals or embers over the site.',
    default: false,
    options: [
      { key: 'effect', label: 'Effect', type: 'select', choices: Object.entries(ambientEffects).map(([key, effect]) => [key, effect.label]), default: 'snow' },
      { key: 'density', label: 'Amount', type: 'select', choices: [['low', 'Low'], ['normal', 'Normal'], ['high', 'High']], default: 'normal' }
    ],
    css: `
      .rk-site-ambient {
        position: fixed;
        inset: 0;
        width: 100%;
        height: 100%;
        z-index: 999;
        pointer-events: none;
      }
    `,
    run(ctx) {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
      const amounts = { low: 0.5, normal: 1, high: 2 };
      let canvas = null;
      let context = null;
      let effect = null;
      let items = [];
      let filled = '';
      let frame = 0;
      let last = 0;
      let width = 0;
      let height = 0;
      const resize = () => {
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = Math.round(width * ratio);
        canvas.height = Math.round(height * ratio);
        context.setTransform(ratio, 0, 0, ratio, 0, 0);
      };
      const tick = now => {
        frame = requestAnimationFrame(tick);
        const step = last ? Math.min((now - last) / 16.67, 3) : 1;
        last = now;
        context.clearRect(0, 0, width, height);
        for (let i = 0; i < items.length; i += 1) {
          if (!effect.move(items[i], step, width, height)) items[i] = effect.make(width, height, false);
          effect.draw(context, items[i]);
        }
        context.globalAlpha = 1;
      };
      const stop = () => {
        cancelAnimationFrame(frame);
        frame = 0;
        last = 0;
      };
      const sync = () => {
        if (!Rk.isEnabled(ctx.id) || reduce.matches) {
          stop();
          if (!canvas) return;
          canvas.remove();
          canvas = null;
          items = [];
          filled = '';
          window.removeEventListener('resize', resize);
          return;
        }
        if (!canvas) {
          canvas = el('canvas', { class: 'rk-site-ambient', 'aria-hidden': 'true' });
          context = canvas.getContext('2d');
          document.body.append(canvas);
          window.addEventListener('resize', resize);
          resize();
        }
        const key = `${ctx.option('effect')}|${ctx.option('density')}`;
        if (key !== filled) {
          filled = key;
          effect = ambientEffects[ctx.option('effect')] || ambientEffects.snow;
          const area = Math.min(Math.max((width * height) / 2073600, 0.4), 1.5);
          const count = Math.round(effect.count * (amounts[ctx.option('density')] || 1) * area);
          items = Array.from({ length: count }, () => effect.make(width, height, true));
        }
        if (document.hidden) stop();
        else if (!frame) frame = requestAnimationFrame(tick);
      };
      Rk.waitFor('body').then(() => {
        sync();
        Rk.onSettings(sync);
        document.addEventListener('visibilitychange', sync);
        reduce.addEventListener('change', sync);
      });
    }
  });

  Rk.feature({
    id: 'site.customBackground',
    category: 'site',
    name: 'Custom background image',
    description: 'Puts your own image or gif behind the site. Paste a link, choose a file or drop one in, then pick the blur and dimming.',
    default: false,
    options: [
      { key: 'image', label: 'Image or gif', type: 'image', default: '' },
      { key: 'blur', label: 'Blur', type: 'number', min: 0, max: 30, step: 1, default: 0 },
      { key: 'dim', label: 'Dim (percent)', type: 'number', min: 0, max: 90, step: 5, default: 40 }
    ],
    css: ctx => {
      if (!ctx.option('image')) return '';
      const blur = Math.min(Math.max(Number(ctx.option('blur')) || 0, 0), 30);
      const dim = Math.min(Math.max(Number(ctx.option('dim')) || 0, 0), 90) / 100;
      return `
        html:has(> body.rk-custom-bg) body,
        html:has(> body.rk-custom-bg) #wrap,
        html:has(> body.rk-custom-bg) #container-main,
        html:has(> body.rk-custom-bg) .container-main {
          background: transparent !important;
        }
        html body.rk-custom-bg::before {
          content: '';
          position: fixed;
          inset: ${-blur * 2}px;
          z-index: -1;
          pointer-events: none;
          background-image: linear-gradient(rgba(0, 0, 0, ${dim}), rgba(0, 0, 0, ${dim})), var(--rk-custom-bg);
          background-size: cover;
          background-position: center;
          filter: ${blur ? `blur(${blur}px)` : 'none'};
        }
      `;
    },
    run(ctx) {
      let token = null;
      const apply = async () => {
        const next = Rk.isEnabled(ctx.id) ? ctx.option('image') : '';
        if (next === token) return;
        token = next;
        const data = next ? await Rk.images.get(ctx.id, 'image') : null;
        if (token !== next) return;
        const body = await Rk.waitFor('body');
        if (data) document.documentElement.style.setProperty('--rk-custom-bg', `url("${data}")`);
        else document.documentElement.style.removeProperty('--rk-custom-bg');
        body.classList.toggle('rk-custom-bg', Boolean(data));
      };
      apply();
      Rk.onSettings(apply);
    }
  });

  Rk.feature({
    id: 'site.panelBackground',
    category: 'site',
    name: 'Settings window background',
    description: 'Puts your own image or gif behind the Rola settings window. Paste a link, choose a file or drop one in.',
    default: false,
    options: [
      { key: 'image', label: 'Image or gif', type: 'image', default: '' },
      { key: 'dim', label: 'Dim (percent)', type: 'number', min: 0, max: 95, step: 5, default: 70 }
    ]
  });

  const cursorSvg = (svg, x, y) => `url("data:image/svg+xml,${encodeURIComponent(svg)}") ${x} ${y}`;

  const cursorStyles = {
    arrow: { label: 'White arrow', value: cursorSvg('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M4 2l15 11.5-6.6 1 3.9 7-2.6 1.4-3.9-7.1L5 20z" fill="#ffffff" stroke="#111111" stroke-width="1.5" stroke-linejoin="round"/></svg>', 4, 2) },
    classic: { label: 'Black arrow', value: cursorSvg('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M4 2l15 11.5-6.6 1 3.9 7-2.6 1.4-3.9-7.1L5 20z" fill="#111111" stroke="#ffffff" stroke-width="1.5" stroke-linejoin="round"/></svg>', 4, 2) },
    crosshair: { label: 'Crosshair', value: cursorSvg('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M12 2v6M12 16v6M2 12h6M16 12h6" stroke="#000000" stroke-opacity="0.5" stroke-width="4"/><path d="M12 2v6M12 16v6M2 12h6M16 12h6" stroke="#4ade80" stroke-width="2"/><circle cx="12" cy="12" r="1.2" fill="#4ade80"/></svg>', 12, 12) },
    dot: { label: 'Dot', value: cursorSvg('<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><circle cx="8" cy="8" r="4" fill="#ffffff" stroke="#111111" stroke-width="1.5"/></svg>', 8, 8) },
    ring: { label: 'Ring', value: cursorSvg('<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20"><circle cx="10" cy="10" r="7" fill="none" stroke="#ffffff" stroke-width="2"/><circle cx="10" cy="10" r="7" fill="none" stroke="#111111" stroke-opacity="0.4" stroke-width="3.5"/><circle cx="10" cy="10" r="1.5" fill="#ffffff"/></svg>', 10, 10) }
  };

  Rk.feature({
    id: 'site.customCursor',
    category: 'site',
    name: 'Custom cursor',
    description: 'Swaps your mouse cursor for an arrow, crosshair, dot or ring, with an optional trail.',
    default: false,
    options: [
      { key: 'style', label: 'Cursor', type: 'select', choices: Object.entries(cursorStyles).map(([key, style]) => [key, style.label]), default: 'arrow' },
      { key: 'trail', label: 'Cursor trail', type: 'toggle', default: false },
      { key: 'trailColor', label: 'Trail color', type: 'color', default: '#9db8ff' }
    ],
    css: ctx => {
      const style = cursorStyles[ctx.option('style')] || cursorStyles.arrow;
      return `
        html,
        body,
        body *:not(input, textarea, [contenteditable="true"]) {
          cursor: ${style.value}, auto !important;
        }
        .rk-site-trail {
          position: fixed;
          inset: 0;
          width: 100%;
          height: 100%;
          z-index: 2147483646;
          pointer-events: none;
        }
      `;
    },
    run(ctx) {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
      const points = [];
      let canvas = null;
      let context = null;
      let frame = 0;
      const resize = () => {
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.round(window.innerWidth * ratio);
        canvas.height = Math.round(window.innerHeight * ratio);
        context.setTransform(ratio, 0, 0, ratio, 0, 0);
      };
      const draw = now => {
        frame = 0;
        context.clearRect(0, 0, window.innerWidth, window.innerHeight);
        while (points.length && now - points[0].time > 260) points.shift();
        if (points.length < 2) return;
        context.strokeStyle = ctx.option('trailColor');
        context.lineCap = 'round';
        for (let i = 1; i < points.length; i += 1) {
          const fade = 1 - (now - points[i].time) / 260;
          context.globalAlpha = Math.max(fade, 0) * 0.8;
          context.lineWidth = 1 + fade * 4;
          context.beginPath();
          context.moveTo(points[i - 1].x, points[i - 1].y);
          context.lineTo(points[i].x, points[i].y);
          context.stroke();
        }
        context.globalAlpha = 1;
        frame = requestAnimationFrame(draw);
      };
      const track = event => {
        points.push({ x: event.clientX, y: event.clientY, time: performance.now() });
        if (points.length > 40) points.shift();
        if (!frame) frame = requestAnimationFrame(draw);
      };
      const sync = () => {
        const active = Rk.isEnabled(ctx.id) && ctx.option('trail') && !reduce.matches;
        if (active && !canvas) {
          canvas = el('canvas', { class: 'rk-site-trail', 'aria-hidden': 'true' });
          context = canvas.getContext('2d');
          document.body.append(canvas);
          resize();
          window.addEventListener('resize', resize);
          document.addEventListener('pointermove', track, { passive: true });
        } else if (!active && canvas) {
          cancelAnimationFrame(frame);
          frame = 0;
          points.length = 0;
          canvas.remove();
          canvas = null;
          window.removeEventListener('resize', resize);
          document.removeEventListener('pointermove', track);
        }
      };
      Rk.waitFor('body').then(() => {
        sync();
        Rk.onSettings(sync);
        reduce.addEventListener('change', sync);
      });
    }
  });

  Rk.feature({
    id: 'site.glassCards',
    category: 'site',
    name: 'Glass cards',
    description: 'Makes cards and sections see-through with a frosted blur so background themes show through. Works with the dark theme.',
    default: false,
    css: `
      html body.dark-theme :is(.section-content, .rk-section, .rk-card) {
        background-color: rgba(20, 22, 28, 0.55) !important;
        -webkit-backdrop-filter: blur(14px) saturate(1.2);
        backdrop-filter: blur(14px) saturate(1.2);
        border: 1px solid rgba(255, 255, 255, 0.06);
      }
    `
  });

  Rk.feature({
    id: 'site.pageTransitions',
    category: 'site',
    name: 'Page transitions',
    description: 'Fades the page content in softly when you open or switch pages.',
    default: false,
    css: `
      .rk-site-enter {
        animation: rk-site-fade-in 0.28s cubic-bezier(0.2, 0.7, 0.2, 1) backwards;
      }
      @keyframes rk-site-fade-in {
        from {
          opacity: 0;
        }
      }
      @media (prefers-reduced-motion: reduce) {
        .rk-site-enter {
          animation: none;
        }
      }
    `,
    run(ctx) {
      const fade = node => {
        if (!Rk.isEnabled(ctx.id)) return;
        node.classList.remove('rk-site-enter');
        void node.offsetWidth;
        node.classList.add('rk-site-enter');
        node.addEventListener('animationend', () => node.classList.remove('rk-site-enter'), { once: true });
      };
      Rk.observe('#container-main', fade);
      Rk.onNavigate(() => {
        const main = document.getElementById('container-main');
        if (main) fade(main);
      });
    }
  });

  const themePresets = {
    space: { label: 'Space', accent: '#7c8cff', font: null, background: 'space', effect: null, sounds: 'scifi', cursor: 'ring' },
    csgo: { label: 'CS:GO', accent: '#de9b35', font: 'system', background: 'midnight', effect: null, sounds: 'csgo', cursor: 'crosshair' },
    cozy: { label: 'Cozy', accent: '#f4a261', font: 'rounded', background: 'sunset', effect: 'fireflies', sounds: 'chill', cursor: null },
    ocean: { label: 'Ocean', accent: '#38bdf8', font: null, background: 'ocean', effect: 'particles', sounds: 'droplet', cursor: null },
    synthwave: { label: 'Synthwave', accent: '#ff40a0', font: null, background: 'synthwave', effect: null, sounds: 'retro', cursor: 'dot' },
    winter: { label: 'Winter', accent: '#9db8ff', font: null, background: 'midnight', effect: 'snow', sounds: 'glass', cursor: null },
    sakura: { label: 'Sakura', accent: '#f472b6', font: 'rounded', background: 'sakura', effect: 'sakura', sounds: 'bubble', cursor: null },
    inferno: { label: 'Inferno', accent: '#f97316', font: null, background: 'ember', effect: 'embers', sounds: 'laser', cursor: 'crosshair' },
    minimal: { label: 'Minimal', accent: null, font: null, background: null, effect: null, sounds: 'minimal', cursor: null }
  };

  Rk.feature({
    id: 'site.themePresets',
    category: 'site',
    name: 'Theme presets',
    description: 'Sets the accent color, font, background, effects, sounds and cursor in one go. Pick a preset to apply it, then tweak any of those features after.',
    default: false,
    options: [
      { key: 'preset', label: 'Preset', type: 'select', choices: Object.entries(themePresets).map(([key, preset]) => [key, preset.label]), default: 'space' }
    ],
    run(ctx) {
      const setFeature = (id, key, value) => {
        if (value == null) {
          Rk.setEnabled(id, false);
          return;
        }
        Rk.setOption(id, key, value);
        Rk.setEnabled(id, true);
      };
      const check = () => {
        if (!Rk.isEnabled(ctx.id)) {
          if (Rk.store.get('site.themePresets', null) !== null) Rk.store.set('site.themePresets', null);
          return;
        }
        const key = ctx.option('preset');
        const preset = themePresets[key];
        if (!preset || Rk.store.get('site.themePresets', null) === key) return;
        Rk.store.set('site.themePresets', key);
        if (preset.background) {
          Rk.setOption('site.forceTheme', 'theme', 'dark');
          Rk.setEnabled('site.forceTheme', true);
        }
        setFeature('site.accentColor', 'color', preset.accent);
        setFeature('site.fontChoice', 'font', preset.font);
        setFeature('site.backgroundTheme', 'theme', preset.background);
        setFeature('site.ambientEffects', 'effect', preset.effect);
        setFeature('site.uiSounds', 'pack', preset.sounds);
        setFeature('site.customCursor', 'style', preset.cursor);
        Rk.setEnabled('site.glassCards', Boolean(preset.background));
      };
      check();
      Rk.onSettings(check);
    }
  });

  const privacyRows = [
    ['whoCanSeeMyOnlineStatus', 'Online Status', 'eye'],
    ['whoCanJoinMeInExperiences', 'Experience Status', 'play'],
    ['privateServerPrivacy', 'Private Server Privacy', 'lock'],
    ['whoCanSeeMyInventory', 'Inventory Privacy', 'box']
  ];

  const privacyLabels = {
    All: 'Everyone',
    AllUsers: 'Everyone',
    FriendsFollowingAndFollowers: 'Friends, following and followers',
    FriendsAndFollowing: 'Friends and following',
    Friends: 'Friends',
    TrustedFriends: 'Trusted friends',
    Followers: 'Followers',
    Following: 'Following',
    Default: 'Default',
    NoOne: 'No one'
  };

  Rk.feature({
    id: 'site.privacyMenu',
    category: 'site',
    name: 'Privacy menu in header',
    description: 'Adds a lock button to the top bar to change who can see your online status, join you, use your private servers and see your inventory.',
    default: false,
    css: `
      .rk-privacy-menu { width: 390px; max-width: calc(100vw - 16px); padding: 6px 4px; }
      .rk-privacy-title { padding: 6px 12px 10px; font-size: 13px; font-weight: 600; color: var(--rk-muted); }
      .rk-privacy-row { display: flex; align-items: center; gap: 10px; padding: 8px 12px; }
      .rk-privacy-row > .rk-icon { flex: none; color: var(--rk-muted); }
      .rk-privacy-label { flex: 1; min-width: 0; overflow: hidden; font-size: 15px; font-weight: 600; color: var(--rk-text-strong); white-space: nowrap; text-overflow: ellipsis; }
      .rk-privacy-row .rk-select { flex: none; max-width: 150px; height: 34px; }
      .rk-privacy-row[aria-busy="true"] .rk-select { opacity: 0.5; pointer-events: none; }
      .rk-privacy-empty { padding: 12px; font-size: 13px; color: var(--rk-muted); }
    `,
    run(ctx) {
      const url = 'https://apis.roblox.com/user-settings-api/v1/user-settings';
      let close = null;
      const rowFor = (key, label, iconName, setting) => {
        const choices = (Array.isArray(setting.options) ? setting.options : [])
          .map(entry => entry && entry.option && typeof entry.option.optionValue === 'string' ? { value: entry.option.optionValue, open: entry.requirement === undefined || entry.requirement === 'SelfUpdateSetting' } : null)
          .filter(choice => choice && (choice.open || choice.value === setting.currentValue));
        if (!choices.length || typeof setting.currentValue !== 'string') return null;
        let current = setting.currentValue;
        const row = el('div', { class: 'rk-privacy-row' }, icon(iconName, 18), el('span', { class: 'rk-privacy-label' }, label));
        const picker = ui.select(choices.map(choice => [choice.value, privacyLabels[choice.value] || choice.value]), current, async next => {
          row.setAttribute('aria-busy', 'true');
          try {
            await Rk.api.post(url, { [key]: next });
            current = next;
            ui.toast(`${label} set to ${privacyLabels[next] || next}`, { tone: 'success' });
          } catch {
            picker.value = current;
            ui.toast(`Could not change ${label.toLowerCase()}`, { tone: 'danger' });
          }
          row.removeAttribute('aria-busy');
        });
        row.append(picker);
        return row;
      };
      const open = async anchor => {
        if (close) {
          close();
          return;
        }
        const menu = el('div', { class: 'rk-menu rk-privacy-menu', role: 'dialog', 'aria-label': 'Privacy settings' }, el('div', { class: 'rk-privacy-empty' }, ui.spinner(16)));
        const onDown = event => {
          if (!menu.contains(event.target) && !anchor.contains(event.target)) close();
        };
        const onKey = event => {
          if (event.key === 'Escape') close();
        };
        close = () => {
          document.removeEventListener('mousedown', onDown, true);
          document.removeEventListener('keydown', onKey, true);
          menu.classList.remove('rk-menu-open');
          setTimeout(() => menu.remove(), 180);
          close = null;
        };
        document.addEventListener('mousedown', onDown, true);
        document.addEventListener('keydown', onKey, true);
        const place = () => {
          const rect = anchor.getBoundingClientRect();
          menu.style.top = `${Math.round(rect.bottom + window.scrollY + 6)}px`;
          menu.style.left = `${Math.max(8, Math.round(rect.right + window.scrollX - menu.offsetWidth))}px`;
        };
        document.body.append(menu);
        place();
        requestAnimationFrame(() => menu.classList.add('rk-menu-open'));
        const settings = await Rk.api.get(`${url}/settings-and-options`).catch(() => null);
        if (!menu.isConnected) return;
        const rows = settings && typeof settings === 'object'
          ? privacyRows.map(([key, label, iconName]) => (settings[key] && typeof settings[key] === 'object' ? rowFor(key, label, iconName, settings[key]) : null)).filter(Boolean)
          : [];
        menu.replaceChildren(el('div', { class: 'rk-privacy-title' }, 'Privacy Settings'), ...(rows.length ? rows : [el('div', { class: 'rk-privacy-empty' }, 'Could not load your privacy settings')]));
        place();
      };
      const button = ui.tip(el('a', { class: 'rk-nav-button', href: '/my/account#!/privacy', role: 'button', 'data-rk-tip-pos': 'below' }, icon('lock', 22)), 'Privacy Settings');
      button.addEventListener('click', event => {
        event.preventDefault();
        open(button);
      });
      const item = el('li', { class: 'navbar-icon-item rk-nav-item rk-privacy-nav' }, button);
      Rk.onSettings(() => {
        const on = Rk.isEnabled(ctx.id);
        item.classList.toggle('rk-hidden', !on);
        if (!on && close) close();
      });
      Rk.observe('ul.navbar-right', navbar => {
        if (navbar.contains(item)) return;
        const bell = [...navbar.children].find(node => node.querySelector('#navbar-notifications, .notification-stream-icon, [class*="notification"]'));
        const robux = [...navbar.children].find(node => node.id === 'navbar-robux' || node.querySelector('#navbar-robux'));
        if (bell) bell.before(item);
        else if (robux) robux.before(item);
        else navbar.append(item);
      });
    }
  });

  Rk.feature({
    id: 'site.peopleSearch',
    category: 'site',
    name: 'Person in header search',
    description: 'When what you type in the top search bar is someone\'s exact username, shows that person at the top of the search menu. Click to open their profile.',
    default: false,
    css: `
      .rk-people-hit {
        list-style: none;
        border-bottom: 1px solid var(--rk-border);
        animation: rk-fade var(--rk-fast) ease both;
      }
      .dropdown-menu > .rk-people-hit > a.rk-people-hit-link {
        display: flex !important;
        align-items: center !important;
        gap: 10px;
        height: auto !important;
        min-height: 38px;
        padding: 6px 12px !important;
        color: var(--rk-text) !important;
        text-decoration: none !important;
        white-space: nowrap;
        transition: background-color var(--rk-fast) ease;
      }
      .dropdown-menu > .rk-people-hit > a.rk-people-hit-link:hover {
        background: var(--rk-hover) !important;
      }
      .rk-people-hit .rk-thumb {
        flex: none;
        width: 24px !important;
        height: 24px !important;
        box-shadow: 0 0 0 2px var(--rk-accent);
      }
      .rk-people-hit-name {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        min-width: 0;
        overflow: hidden;
        font-size: 14px;
        font-weight: 700;
        color: var(--rk-accent);
        text-overflow: ellipsis;
      }
      .rk-people-hit-user {
        overflow: hidden;
        font-size: 14px;
        color: var(--rk-muted);
        text-overflow: ellipsis;
      }
    `,
    run(ctx) {
      const found = new Map();
      let hit = null;
      let timer = 0;
      let request = 0;
      const clear = () => {
        request += 1;
        clearTimeout(timer);
        if (hit) hit.remove();
        hit = null;
      };
      const show = (input, user) => {
        const box = input.closest('#navbar-universal-search, .navbar-search') || input.closest('form') || input.parentElement;
        const menu = box && (box.querySelector('ul.dropdown-menu') || (box.parentElement && box.parentElement.querySelector('ul.dropdown-menu')));
        if (!menu) return;
        if (hit) hit.remove();
        hit = el('li', { class: 'rk-people-hit', role: 'presentation' },
          el('a', { class: 'rk-people-hit-link', role: 'menuitem', href: `/users/${user.id}/profile`, onpointerdown: event => event.preventDefault() },
            ui.thumb(Rk.thumb('AvatarHeadShot', user.id, '150x150'), { size: 24, round: true }),
            el('span', { class: 'rk-people-hit-name' }, user.displayName, user.verified ? ui.verified({ size: 14 }) : null),
            el('span', { class: 'rk-people-hit-user' }, `@${user.name}`)
          )
        );
        menu.prepend(hit);
      };
      const lookup = async (input, text) => {
        const key = text.toLowerCase();
        const token = ++request;
        if (!found.has(key)) {
          const json = await Rk.api.post('https://users.roblox.com/v1/usernames/users', { usernames: [text], excludeBannedUsers: true }).catch(() => null);
          const user = json && Array.isArray(json.data) ? json.data.find(item => item && Number.isSafeInteger(item.id) && typeof item.name === 'string') : null;
          found.set(key, user ? { id: user.id, name: user.name, displayName: typeof user.displayName === 'string' && user.displayName ? user.displayName : user.name, verified: user.hasVerifiedBadge === true } : null);
          if (found.size > 100) found.delete(found.keys().next().value);
        }
        if (token !== request || document.activeElement !== input || input.value.trim().toLowerCase() !== key) return;
        const user = found.get(key);
        if (user) show(input, user);
      };
      Rk.observe('#navbar-search-input, #navbar-universal-search input, .navbar-search input', input => {
        input.addEventListener('input', () => {
          clear();
          const text = input.value.trim();
          if (!Rk.isEnabled(ctx.id) || !/^[A-Za-z0-9_]{3,20}$/.test(text)) return;
          timer = setTimeout(() => lookup(input, text), 250);
        });
        input.addEventListener('focus', () => {
          const text = input.value.trim();
          if (Rk.isEnabled(ctx.id) && /^[A-Za-z0-9_]{3,20}$/.test(text)) lookup(input, text);
        });
      });
      Rk.onSettings(() => {
        if (!Rk.isEnabled(ctx.id)) clear();
      });
    }
  });

  Rk.feature({
    id: 'site.friendsSidebar',
    category: 'site',
    name: 'Friends sidebar',
    description: 'Adds a slim panel on the right edge of every page with your online friends, what they are playing and a Join button.',
    default: false,
    css: `
      .rk-fside {
        position: fixed;
        top: 72px;
        right: 0;
        bottom: 88px;
        z-index: 2147480000;
        display: flex;
        align-items: flex-start;
        font-family: var(--rk-font);
        pointer-events: none;
      }
      .rk-fside-toggle {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        margin-top: 8px;
        padding: 10px 6px;
        border: 1px solid var(--rk-border);
        border-right: 0;
        border-radius: var(--rk-radius) 0 0 var(--rk-radius);
        background: var(--rk-bg);
        color: var(--rk-text-strong);
        font-size: 12px;
        font-weight: 700;
        box-shadow: var(--rk-shadow);
        cursor: pointer;
        pointer-events: auto;
        transition: background-color var(--rk-fast) ease;
      }
      .rk-fside-toggle:hover {
        background: var(--rk-surface);
      }
      .rk-fside-body {
        display: flex;
        flex-direction: column;
        width: 0;
        height: 100%;
        overflow: hidden;
        border: 1px solid transparent;
        border-right: 0;
        border-radius: var(--rk-radius-l) 0 0 var(--rk-radius-l);
        background: var(--rk-bg);
        box-shadow: var(--rk-shadow);
        opacity: 0;
        pointer-events: auto;
        transition: width var(--rk-med) var(--rk-ease), opacity var(--rk-med) ease;
      }
      .rk-fside-open .rk-fside-body {
        width: 260px;
        border-color: var(--rk-border);
        opacity: 1;
      }
      .rk-fside-head {
        flex: none;
        padding: 12px 14px 8px;
        font-size: 14px;
        font-weight: 700;
        color: var(--rk-text-strong);
        white-space: nowrap;
      }
      .rk-fside-list {
        flex: 1;
        min-height: 0;
        overflow-y: auto;
        overscroll-behavior: contain;
        padding: 0 6px 8px;
        scrollbar-width: thin;
      }
      .rk-fside-row {
        display: flex;
        align-items: center;
        gap: 10px;
        width: 248px;
        box-sizing: border-box;
        padding: 6px 8px;
        border-radius: var(--rk-radius);
        transition: background-color var(--rk-fast) ease;
      }
      .rk-fside-row:hover {
        background: var(--rk-hover);
      }
      .rk-fside-face {
        position: relative;
        flex: none;
        display: inline-flex;
      }
      .rk-fside-dot {
        position: absolute;
        right: 0;
        bottom: 0;
        width: 10px;
        height: 10px;
        box-sizing: border-box;
        border: 2px solid var(--rk-bg);
        border-radius: 50%;
      }
      .rk-fside-dot[data-state="online"] { background: #00a2ff; }
      .rk-fside-dot[data-state="game"] { background: #02b757; }
      .rk-fside-dot[data-state="studio"] { background: #f68802; }
      .rk-fside-text {
        display: flex;
        flex-direction: column;
        flex: 1;
        min-width: 0;
      }
      .rk-fside-name {
        overflow: hidden;
        font-size: 13px;
        font-weight: 600;
        color: var(--rk-text-strong) !important;
        text-decoration: none !important;
        white-space: nowrap;
        text-overflow: ellipsis;
      }
      .rk-fside-status {
        overflow: hidden;
        font-size: 12px;
        color: var(--rk-muted);
        white-space: nowrap;
        text-overflow: ellipsis;
      }
      .rk-fside-status[data-state="game"] { color: #02b757; }
      .rk-fside-status[data-state="studio"] { color: #f68802; }
      .rk-fside-empty {
        padding: 8px 10px;
        font-size: 13px;
        color: var(--rk-muted);
        white-space: nowrap;
      }
      @media (max-width: 760px) {
        .rk-fside {
          display: none;
        }
      }
    `,
    async run(ctx) {
      const me = await Rk.me();
      if (!me) return;
      const states = ['offline', 'online', 'game', 'studio'];
      const list = el('div', { class: 'rk-fside-list' }, el('div', { class: 'rk-fside-empty' }, ui.spinner(16)));
      const count = el('span');
      const toggle = el('button', { type: 'button', class: 'rk-fside-toggle', 'aria-label': 'Show online friends', title: 'Online friends' }, icon('users', 18), count);
      const panel = el('aside', { class: 'rk-fside', 'aria-label': 'Online friends' }, toggle, el('div', { class: 'rk-fside-body' }, el('div', { class: 'rk-fside-head' }, 'Friends online'), list));
      const setOpen = open => {
        panel.classList.toggle('rk-fside-open', open);
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      };
      setOpen(Rk.store.get('friends.sidebarOpen', false) === true);
      toggle.addEventListener('click', () => {
        const open = !panel.classList.contains('rk-fside-open');
        setOpen(open);
        Rk.store.set('friends.sidebarOpen', open);
      });
      Rk.domReady.then(() => document.body.append(panel));

      const loadFriends = async () => {
        const ids = [];
        let cursor = '';
        for (let page = 0; page < 20; page += 1) {
          const json = await Rk.api.get(`https://friends.roblox.com/v1/users/${me.id}/friends/find?limit=50${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`).catch(() => null);
          const items = json && (Array.isArray(json.PageItems) ? json.PageItems : Array.isArray(json.data) ? json.data : null);
          if (!items) break;
          for (const item of items) {
            const id = Number(item && item.id);
            if (Rk.isId(id)) ids.push(id);
          }
          cursor = json.NextCursor || json.nextPageCursor || '';
          if (!cursor) break;
        }
        if (!ids.length) {
          const json = await Rk.api.get(`https://friends.roblox.com/v1/users/${me.id}/friends`).catch(() => null);
          for (const item of json && Array.isArray(json.data) ? json.data : []) {
            const id = Number(item && item.id);
            if (Rk.isId(id)) ids.push(id);
          }
        }
        return [...new Set(ids)];
      };
      const friends = loadFriends();

      const join = (id, entry) => {
        const placeId = Number(entry.rootPlaceId || entry.placeId);
        if (typeof entry.gameId === 'string' && entry.gameId && Rk.isId(placeId)) Rk.launch.server(placeId, entry.gameId);
        else Rk.launch.follow(id);
      };

      const refresh = async () => {
        if (!Rk.isEnabled(ctx.id) || document.visibilityState !== 'visible') return;
        const ids = await friends;
        const presence = ids.length ? await Rk.api.presence(ids).catch(() => null) : new Map();
        if (!presence) return;
        const order = { game: 0, studio: 1, online: 2 };
        const online = ids
          .map(id => ({ id, entry: presence.get(id) }))
          .filter(item => item.entry && Number(item.entry.userPresenceType) > 0)
          .map(item => ({ ...item, state: states[Number(item.entry.userPresenceType)] || 'online' }));
        const users = online.length ? await Rk.api.users(online.map(item => item.id)).catch(() => new Map()) : new Map();
        online.sort((a, b) => order[a.state] - order[b.state] || String((users.get(a.id) || {}).displayName || '').localeCompare(String((users.get(b.id) || {}).displayName || '')));
        count.textContent = String(online.length);
        if (!online.length) {
          list.replaceChildren(el('div', { class: 'rk-fside-empty' }, 'No friends online right now'));
          return;
        }
        list.replaceChildren(...online.map(({ id, entry, state }) => {
          const user = users.get(id) || {};
          const name = String(user.displayName || user.name || `User ${id}`);
          const where = typeof entry.lastLocation === 'string' && entry.lastLocation ? entry.lastLocation : '';
          const status = { online: 'Online', game: where || 'In game', studio: where ? `Studio: ${where}` : 'In Studio' }[state];
          const canJoin = state === 'game' && Rk.isId(Number(entry.rootPlaceId || entry.placeId));
          return el('div', { class: 'rk-fside-row' },
            el('a', { class: 'rk-fside-face', href: `/users/${id}/profile` },
              ui.thumb(Rk.thumb('AvatarHeadShot', id, '150x150'), { size: 36, round: true }),
              el('span', { class: 'rk-fside-dot', dataset: { state } })
            ),
            el('div', { class: 'rk-fside-text' },
              el('a', { class: 'rk-fside-name', href: `/users/${id}/profile`, title: user.name ? `@${user.name}` : name }, name),
              el('span', { class: 'rk-fside-status', dataset: { state }, title: status }, status)
            ),
            canJoin ? ui.button('Join', { variant: 'primary', onClick: () => join(id, entry) }) : null
          );
        }));
      };

      let timer = 0;
      const schedule = () => {
        clearInterval(timer);
        timer = document.visibilityState === 'visible' && Rk.isEnabled(ctx.id) ? setInterval(refresh, 60000) : 0;
      };
      document.addEventListener('visibilitychange', () => {
        schedule();
        refresh();
      });
      let wasOn = true;
      Rk.onSettings(() => {
        const on = Rk.isEnabled(ctx.id);
        panel.classList.toggle('rk-hidden', !on);
        if (on === wasOn) return;
        wasOn = on;
        schedule();
        if (on) refresh();
      });
      schedule();
      refresh();
    }
  });

  Rk.feature({
    id: 'site.fontSmoothing',
    category: 'site',
    name: 'Font smoothing',
    description: 'Renders text with smoother, thinner font edges.',
    default: false,
    css: `
      body {
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }
    `
  });

  Rk.feature({
    id: 'site.tabularNumbers',
    category: 'site',
    name: 'Tabular numbers',
    description: 'Lines up digits in Robux amounts and stats so they are easier to compare.',
    default: false,
    css: `
      .text-robux,
      .text-robux-lg,
      .text-robux-tile,
      #nav-robux-amount,
      .rk-robux,
      .rk-stat-value,
      .rk-table {
        font-variant-numeric: tabular-nums;
      }
    `
  });
})();
