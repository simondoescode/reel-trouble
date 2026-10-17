# Reel Trouble 🎣

A mobile-friendly arcade fishing game built with vanilla JavaScript and Vite. Avoid fish while diving, catch them on the way up, then shoot the airborne catch to earn money for upgrades.

The prototype was previously named **Deep End**. The game code and procedural graphics are original; no assets, code, or APK from *Ridiculous Fishing* are included.

## Play online

**https://simondoescode.github.io/reel-trouble/**

For the optimised Vite build, set **Settings → Pages → Build and deployment → Source: GitHub Actions**. Pages also supports a legacy "Deploy from a branch" source: `index.html` intentionally references the plain JavaScript and CSS with relative paths so the game can run in that mode too. Pick **GitHub Actions** to avoid competing deployments.

## Develop locally

Requires Node.js 22.12 or newer.

```bash
npm install
npm run dev
```

Visit the local address Vite prints (for this repository the base path is `/reel-trouble/`). Changes reload automatically.

## Production build

```bash
npm run check
npm run build
npm run preview
```

Vite bundles the JavaScript and CSS into `dist/`. The configured base path (`/reel-trouble/`) ensures assets load properly when hosted at GitHub Pages.

The workflow `.github/workflows/deploy.yml` builds and deploys `dist/` whenever a commit lands on `main`. You can also run it manually from the Actions tab. No pull requests are required. The source HTML works as a fallback for legacy branch-based Pages, but the supported deployment setting is **GitHub Actions** so the production bundle is what visitors receive.

## Play

1. Choose **CAST LINE** to start diving.
2. Drag side-to-side to avoid fish during descent; a collision or max depth starts the ascent.
3. Drag into fish on the ascent to catch them.
4. **Tap directly on airborne fish** to fire the pixel-art gun. Shots are unlimited during the timed shooting phase; misses break your combo. Chain successful hits within 2.4 seconds for up to **4× earnings**. Gun upgrades unlock a two-target **Scattergun** at level 2 and a three-target **Neon Blaster** at level 4, while intermediate upgrade levels improve aiming forgiveness.
5. Visit **UPGRADE GEAR** to buy longer line, wider hook, and improved weapons or aiming.

### Controls and input settings

On first launch on a touch-screen phone, the game opens **Settings** to ask whether to use **Touch** or **Tilt** steering. You can change this later using **Settings** on the main menu.

- **Tilt:** Select **Tilt** and allow motion access if requested (iOS Safari requires a tap to grant permission). Hold the phone comfortably to set neutral; tilt sideways to steer during descent/ascent. Tap **Recenter Tilt** to reset the neutral position. Only works where device orientation events are supported and permitted.
- **Touch:** Drag horizontally on the screen while fishing. Dragging remains available as a fallback even when tilt is selected.
- **Shooting:** Tap a flying fish to aim and fire; tilt does not aim. The visible gun tracks your last touch, recoils and flashes, and briefly draws bright bullet trails. Ammo is unlimited, so you can keep firing until the shooting timer expires or all fish are hit.
- **Desktop:** Left/right arrow keys or A/D to steer; Space or Enter to cast.

Input preference is stored locally as `reel-trouble-input-v1`. HTTPS is required for orientation events (GitHub Pages serves HTTPS). Portrait orientation is recommended on mobile.

## Code

- `index.html` — HTML canvas and Vite entry; direct-source fallback for branch publishing
- `src/game.js` — gameplay, animations, touch/tilt input, settings, upgrades, audio, saved progress
- `src/tilt.js` — tested tilt axis and speed mapping
- `src/shooting.js` — pure gun tier, hit detection and combo scoring rules
- `src/collection.js` — species collection, saved statistics and one-time achievement rewards
- `src/styles.css` — responsive mobile layout
- `vite.config.js` — GitHub Pages base path
- `test/` — static smoke tests
- `.github/workflows/deploy.yml` — test, build and Pages deployment

Fourteen fish types use original, hand-authored pixel sprites and vibrant, distinct colour palettes. The ocean includes layered cyan/teal bands, animated pixel caustics, coral silhouettes and bright bubble glints. The shooting sequence uses a saturated magenta-to-gold sunset, with colourful hit particles and stronger pixel UI highlights. The ocean, boat, hook, UI and shooting sky use blocky geometry, with nearest-neighbour scaling from a low-resolution canvas. This is original retro arcade art, not assets extracted from another game. No third-party runtime libraries, ads, analytics or external API calls. Player progress is saved locally under `reel-trouble-save-v1` and falls back to existing `deep-end-save-v1` data from the same browser origin.

## Status

Playable web prototype with one complete fishing loop, fourteen fish types, three ocean biomes, jellyfish hazards, three upgrade tracks and local saved progress. Android packaging is a separate future task; the project has not been converted to an installable APK.

## Mobile release polish

- **Install** using **Settings → Install App** on supported Android browsers. On iOS, use **Share → Add to Home Screen** (the Settings screen gives instructions). Standalone mode launches without browser chrome.
- **Offline** is supported after the first successful visit while online: the service worker caches the playable HTML, JS, CSS and icon files under the `/reel-trouble/` scope. A newly installed or updated app needs one online visit to fill the cache.
- **Pause/resume:** tap **II** while fishing or shooting, or press **P**/**Escape** on desktop. Switching tabs or backgrounding the phone automatically pauses the round. Tap **Resume** when ready.
- **Settings:** turn sound on/off and toggle reduced animations. Reduced effects also cap rendering to approximately 30 FPS for battery saving; the default respects the phone's reduced-motion preference.
- **Display:** safe-area spacing for notches/home indicators, and a landscape reminder on small phones with a **Play anyway** option. All gameplay controls remain available.
- **Build:** the Vite config copies root `manifest.webmanifest`, `sw.js` and both icons to `dist/` while supporting the raw-branch fallback. The workflow validates the production PWA assets.

This is an installable web app, **not** an Android APK or native App Store release.


## Game feel and audio

Reel Trouble now includes an **original procedural chiptune soundtrack** with different musical patterns for menu screens, underwater fishing and the shooting phase. The underwater ambience uses quiet filtered surf noise and bubble chirps. All sound is generated using the browser's Web Audio API: **no external audio downloads or third-party samples**.

Sound effects are distinct for casting and splashes, hooking fish, reeling, shots, impacts, combo streaks, upgrades and round results. There is a new **Chiptune On/Off** setting separate from the existing **Sound FX On/Off** setting; both preferences are saved locally. Browsers require a tap/key press before sound starts. Pausing or backgrounding the game quiets the soundtrack and surf.

Visual feedback includes animated pixel-water droplets on casts and transitions, swim bobbing and moving fins/tails for fish, a little reeling angler on the rocking boat, catch flashes and brighter impact moments. Reduced Effects continues to limit particles and motion.


## Ocean Expansion v1

The ocean is now divided into three **world-depth-based environments**. The HUD reports internal depth in metres (6 pixels per metre); graphics blend gradually over about 50 metres either side of biome boundaries.

| Zone | Internal depth | Display depth | Features |
| --- | --- | --- | --- |
| Sunlit Reef | 0–449 | 0–74 m | Bright coral, clownfish, pufferfish and schooling sardines |
| Kelp Forest | 450–1079 | 75–179 m | Swaying kelp, fast tuna, lionfish, jellyfish |
| Twilight Trench | 1080+ | 180 m+ | Dark blue water, luminous crystals, lanternfish, anglerfish, rarer catches |

**Eight new fish:** Clownfish ($22), Pufferfish ($46), Sardine ($12), Lionfish ($74), Tuna ($88), Lanternfish ($110), Anglerfish ($170) and exceptionally rare Golden Fish ($500). These join the original six species; earlier saves and upgrade levels are unchanged. The Golden Fish can appear from 90m down, with roughly a 1.2% chance per eligible spawn slot, and becomes especially lucrative with the gun combo multiplier.

Fish now have per-species swim styles (cruising, zigzagging, schooling, drifting, dashing and bioluminescent effects). Jellyfish are distinct non-collectible hazards: touching one on descent prematurely ends your descent **without awarding a free fish**, while a sting on ascent briefly slows reeling. Your fish collection and wallet are safe.

The depths of the kelp forest and twilight trench are reached naturally by upgrading the existing longer fishing line. Biome colour transitions and foreground silhouettes are anchored to the ocean world, while the animated UI shows the player's current biome. Offline asset caches are versioned so the new game code is picked up after an online refresh.


## Fish Encyclopedia & Achievements (Collection Update v1)

The **Fish Encyclopedia** is accessible from the main menu and from round results. There are **14 collectible species** in two pages: unknown fish display as shadow silhouettes with hidden details; once caught, tapping a species opens a detailed fish file with its rarity, habitat, base payout, catches, successful shots, money earned from shooting and best combo. The main menu displays your collection completion percentage and unlocked badge count.

**Each newly discovered species earns a one-time $35 reward.** The **Badges** tab includes nine persistent achievements with one-time cash bonuses for discovering 1, 5, 10 or 14 species, hooking 10 or 50 fish, achieving a 4× shooting combo, hooking a Golden Fish and earning $2500 from shot fish. Discovery and badge rewards count toward the round's cash but do not inflate shooting earnings statistics. Rewards are granted at the milestone, never by repeatedly opening a screen.

Collection data is embedded inside the existing `reel-trouble-save-v1` save, and old saves migrate automatically without changing cash, upgrades or best score. Past catches cannot be reconstructed from the old save, so only newly caught fish appear in the encyclopedia. Offline assets now include the collection module and the cache is versioned for this update.


## Bright palette and mobile readability

The ocean environments, menu background and shooting sunset use brighter cyan, teal, sapphire and violet colours. High-contrast dark UI panels carry light cream, mint and yellow text. Buttons use consistently dark labels on brighter surfaces. Canvas text now has a 12px minimum, bold sans-serif letters, dark outlines for light text and width-constrained truncation to avoid tiny overflowing labels. The biome and gameplay HUD has larger labels. The offline PWA cache is versioned to update installed devices.


## Haptic rumble

Phones with browser vibration support now provide short, distinctive tactile feedback for casting, catches, legendary fish, jellyfish stings, hits, combos, misses and equipment upgrades. This uses the standard browser `navigator.vibrate()` API; no external assets, native application or extra permission prompt is required. The game must have been interacted with before vibration can start. A minimum delay between pulses avoids excessive buzzing.

**Settings → Feedback → Rumble** lets you turn haptics on or off independently of sound and music. The preference is saved on the device, and the default respects your reduced-motion system preference. Pausing or putting the app in the background cancels active vibrations. Where vibration is unavailable, Settings displays **Rumble N/A** and gameplay continues as normal. Browser support varies: Android browsers commonly support vibration, while iOS Safari generally does not expose the standard Vibration API. Device silent/vibration settings may also override it.

The PWA cache version is incremented to ensure installed copies load the haptic module.
