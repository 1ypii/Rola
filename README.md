# Rola

Rola is a browser extension that adds features to the Roblox website, styled to match it in both light and dark theme. Everything shows up inside the normal Roblox pages, and every feature can be turned on or off from the Rola settings panel.

Rola is not made by roblox. and isnt connected to it either.

## Install

**Chrome Web Store** Use the store link in this repository's About section. Store installs update automatically.

**Load it yourself** (Chrome, Edge, Brave and other Chromium browsers):

1. Download this repository as a zip and extract it, or clone it.
2. Open `chrome://extensions` (or `edge://extensions`, `brave://extensions`).
3. Turn on **Developer mode** in the top right.
4. Click **Load unpacked** and pick the extracted folder, the one that contains `manifest.json`.

To update a manual install, replace the files and click the reload button on Rola in the extensions page.

## Using it

Open the settings panel in any of these ways:

- the sliders button in the Roblox header
- **Rola settings** in the Roblox settings menu
- `Alt+K`
- the Rola icon in your browser toolbar

Settings have a search box, categories, per feature options, and export, import and reset buttons. About 130 features are on by default and the rest are opt in.

## What it adds

**Site and navigation (55).** Ad hiding, an exact Robux balance, a Robux to cash estimate, header shortcuts, sidebar cleanup, hide or collapse the sidebar, wider layouts, accent color, fonts, pure black dark theme, rounded thumbnails, back to top and more.

**Experiences (46).** Exact stats, like ratio, last update, badge ownership, progress and rarity, owned passes, creator details, more from the creator, friends playing, places in the experience with live player counts, notes, pins, history and a floating play bar.

**Servers (30).** A server browser with player avatars, sorting, filters, capacity, fps and the players' average ping. It also has quick join buttons (smallest, best ping, random, busiest), join by job ID or username, saved servers, friends' servers, auto refresh and slot alerts.

**Profiles and social (45).** Account details, past usernames, exact friend and follower counts, mutual friends, presence with a join button, communities, created experiences, Roblox badges, outfit cost, private notes and nicknames. Friends pages get search, online filters and best friends. Communities get details, roles, allies and member growth. Verified users, communities and creators show a verified badge.

**Avatar and marketplace (36).** Item details, ownership, bundle savings, stock, sale timers, price history, a wishlist with price changes, recently viewed items and quick view. The avatar editor gets body colors, scales, wearing list, emotes, outfits, export, and accessory adjustment for position, rotation and size that saves to your avatar.

**Trading and inventory (33).** Item values from Rolimons on cards, profiles and inventories, plus demand and trend. Item pages get price and volume charts and resale stats. There is a trade inspector with gains and losses, a trade calculator, transaction summaries, CSV exports and optional trade alerts.

**Home and discovery (29).** Home rows for pinned games, recently viewed, updated games, friends playing and shortcuts. Sponsored and chosen rows can be hidden, cards can peek with a quick summary, and search gets presence and friend tags.

**Tools (27).** A quick search palette, keyboard shortcuts, streamer mode, focus mode, screenshot mode, quick notes, a Robux converter, a data manager, link cleaning, suspicious link warnings and optional desktop alerts.

## Keyboard shortcuts

| Shortcut | Action | On by default |
| --- | --- | --- |
| `Alt+K` | Open Rola settings | Yes |
| `Ctrl+K` / `Cmd+K` | Quick search | Yes |
| `/` | Focus the Roblox search box | Yes |
| `Shift+?` | Show every shortcut you have turned on | Yes |
| `Alt+R` | Robux converter | Yes |
| `Alt+D` | Data manager | Yes |
| `G` then a letter | Go to home, avatar, friends, trades, inventory, messages, profile or settings | No |
| `P` | Play the experience you are viewing | No |
| `Alt+C` / `Alt+I` | Copy a clean page link / the page ID | No |
| `Alt+N` / `Alt+O` | Quick notes / all notes | No |
| `Alt+S` | Turn streamer mode on or off | Yes |
| `Alt+H` / `Alt+F` | Screenshot mode / focus mode | No |

## Privacy

- Rola does not collect, sell or send your data anywhere. Settings, notes, pins and history are saved in your browser only.
- It reads data from Roblox's own APIs, signed in as you, the same way the Roblox website does.
- Item values come from the public Rolimons API (`api.rolimons.com`). That request sends no account information.
- It never reads your Roblox login cookie.
- Everything it does on its own is read only. The only changes it makes to your account are the ones you trigger yourself: saving accessory adjustments, and the join buttons, which start the Roblox client like the website does.
- No remote code. Everything that runs is in this repository.

**Permissions:**

- `storage` saves your settings and data locally.
- `alarms` and `notifications` are only used if you turn on desktop alerts.
- `downloads` is used by the save image buttons.
- Host access to `roblox.com` lets Rola read Roblox's APIs, and to `api.rolimons.com` for item values.

## Project layout

```
manifest.json        extension manifest
background.js        service worker: item values, desktop alerts, downloads
page.js              runs in the page to start the Roblox client
core.js              shared runtime: settings, page watching, Roblox API helpers, UI kit
settings.js          the settings panel and header button
styles.css           shared styles for light and dark theme
features/*.js        the features, one file per category
icons/               extension icons
.github/workflows/   publishes each push to the Chrome Web Store
```

Each feature is registered with `Rk.feature({ id, category, name, description, default, pages, options, css, run })`. Features only use the core helpers and the `--rk-*` CSS variables, so they follow the Roblox theme.

## Publishing

Every push to `main` builds a zip, gives it a new version number and submits it to the Chrome Web Store through `.github/workflows/publish.yml`. It needs three repository secrets:

- `CWS_SERVICE_ACCOUNT`: the JSON key of a Google Cloud service account that has been added to the Chrome Web Store publisher
- `CWS_PUBLISHER_ID`
- `CWS_EXTENSION_ID`

Forks do not have these secrets, so the workflow only publishes from this repository.

## License

MIT, see [LICENSE](LICENSE).
