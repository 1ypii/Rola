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

  Rk.feature({
    id: 'site.uiSounds',
    category: 'site',
    name: 'Hover and click sounds',
    description: 'Plays a short sound when you hover or click buttons and links. Pick a sound pack from the list.',
    default: false,
    options: [
      { key: 'pack', label: 'Sound pack', type: 'select', choices: Object.entries(soundPacks).map(([key, pack]) => [key, pack.label]), default: 'csgo' },
      { key: 'hover', label: 'Play on hover', type: 'toggle', default: true },
      { key: 'click', label: 'Play on click', type: 'toggle', default: true },
      { key: 'volume', label: 'Volume', type: 'number', min: 0, max: 100, step: 5, default: 50 }
    ],
    run(ctx) {
      const targets = 'a[href], button, summary, select, label, [role="button"], [role="tab"], [role="menuitem"], [role="option"], [role="checkbox"], [role="switch"], input[type="checkbox"], input[type="radio"], input[type="submit"]';
      let audio = null;
      let noise = null;
      let hovered = null;
      let lastHover = 0;
      const play = kind => {
        const pack = soundPacks[ctx.option('pack')] || soundPacks.csgo;
        const volume = Math.min(Math.max(Number(ctx.option('volume')) || 0, 0), 100) / 100;
        if (!volume) return;
        if (!audio) {
          audio = new AudioContext();
          noise = audio.createBuffer(1, audio.sampleRate, audio.sampleRate);
          const samples = noise.getChannelData(0);
          for (let i = 0; i < samples.length; i += 1) samples[i] = Math.random() * 2 - 1;
        }
        if (audio.state === 'suspended') audio.resume().catch(() => {});
        const start = audio.currentTime + 0.005;
        for (const part of pack[kind]) {
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
            filter.frequency.value = part.freq;
            source.connect(filter).connect(gain);
          } else {
            source = audio.createOscillator();
            source.type = part.wave;
            source.frequency.setValueAtTime(part.from, at);
            if (part.to) source.frequency.exponentialRampToValueAtTime(part.to, at + part.length);
            source.connect(gain);
          }
          source.addEventListener('ended', () => gain.disconnect(), { once: true });
          source.start(at);
          source.stop(at + part.length + 0.02);
        }
      };
      document.addEventListener('pointerover', event => {
        if (event.pointerType !== 'mouse' || !Rk.isEnabled(ctx.id) || !ctx.option('hover')) return;
        const target = event.target instanceof Element ? event.target.closest(targets) : null;
        if (target === hovered) return;
        hovered = target;
        if (!target || !navigator.userActivation.hasBeenActive) return;
        const now = performance.now();
        if (now - lastHover < 45) return;
        lastHover = now;
        play('hover');
      }, true);
      document.addEventListener('pointerdown', event => {
        if (event.button !== 0 || !Rk.isEnabled(ctx.id) || !ctx.option('click')) return;
        if (event.target instanceof Element && event.target.closest(targets)) play('click');
      }, true);
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
