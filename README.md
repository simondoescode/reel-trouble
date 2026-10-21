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

## The endless ocean

Reel Trouble's underwater world uses **original regions and depth boundaries**, with
procedural scenery and fish/hazard chunks generated near the hook. All depths
below are in metres; the internal game world uses 3 pixels per metre.

| Region | Depth |
| --- | --- |
| Sunskip Shelf | 0–259m |
| Bluewander | 260–639m |
| Kelp Knuckles | 640–1,229m |
| The Hush | 1,230–2,159m |
| Lantern Rift | 2,160–3,849m |
| Blackglass Drop | 3,850–6,699m |
| The Unmarked | 6,700m onwards |

The seven regions blend seamlessly rather than resetting the scene. Parallax
geography and ambient particles are generated in world space; fish and hazards
stream deterministically in 720-pixel chunks while collected fish remain
caught when revisiting a chunk. The renderer has no artificial seafloor.

There are now **15 reel tiers** (including the starter reel) with progressively
larger depth gains, and **six lantern states** (including no lantern). Existing
save slots, currencies, achievements and the indices of the original 14 fish
remain compatible. Deep-sea light gradually fades, with upgraded lanterns
expanding visibility around the hook.

### Rare life and underwater secrets

The deep-water species **Hushwisp**, **Riftglimmer**, and **Blackglass Lurker**
now have separate hand-designed pixel silhouettes, animated organs and different
forms rather than a recoloured generic fish. Rare distant megafauna shapes can
appear behind the scenery.

Each expedition can contain uncommon, deterministic relics such as a
**Whistleshell**, **Lumen Nest**, or **Unmarked Cipher**. Steer the hook close
to collect them, earn bonus cash, and uncover a new secret. Relics are recorded
once per cast and retained if the scenery streams out of view. A discovery
notification and result-screen count track the rewards. The compact mobile
guidance automatically fades after the dive begins.

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


## White text and sharp rendering overhaul

All game UI labels and controls now use solid white, bold 900-weight lettering on dark navy surfaces. The core problem was a 210×390 intermediate buffer that reduced a 12px label to six raster pixels before enlarging it. The game now renders its UI and retro fish art together at the full 420×780 logical resolution, then presents at the original high-DPI canvas resolution; the old half-resolution rendering has been removed. Bright colours remain as button borders, fish colours and background accents, not text. The fish encyclopedia uses one wide card per row, four entries per page instead of two cramped columns, with larger 17–21px labels. Menus, HUD, results, shop, badges, fish details and settings have higher minimum font sizes, shortened hints and outlined white text.


## Brand assets

The title screen now displays an original transparent **Reel Trouble** illustrated wordmark with fish, hook, and waves, replacing the plain canvas lettering. A fallback title remains available until the asset has loaded. The favicon uses a simplified fish-and-hook badge in ICO/PNG; the home-screen PWA icon has 192px/512px square versions, a separate padded 512px maskable icon for Android, and a 180px Apple touch icon. All assets are optimized, bundled with Vite, and precached for offline use. The PWA cache version has been bumped so installed devices receive the new branding.

The canonical brand asset paths are **`assets/title-logo.webp`** for the illustrated title screen and **`icons/`** for all six favicon/home-screen/PWA images. Duplicate icons previously uploaded into `assets/` were removed; references in the manifest, HTML, Vite build and offline service worker use only these canonical paths.


## Underwater gradient and fish contrast

Diving and reeling now show a continuous 17-stop vertical water gradient blended through the reef, kelp and twilight trench using world depth; the previous horizontal 35-pixel colour bars are removed. Biome palettes are cooler, muted and darker than the fish. Light rays, edge scenery and a soft vignette add depth without cluttering the fish area; floating specks are fewer and more transparent. Each pixel fish receives a crisp dark silhouette around its original vivid artwork. Fish movement, collision boxes, catches and shooting are unchanged. PWA cache updated to v9 for installed users.


## Animated title screen & improved app installation

The main menu uses a new procedural ocean illustration: smoothly shaded deep-sea gradients, gentle surface waves, soft caustics and light rays, a moving school and independent fish, slow bubbles, sea plants framing the outer edges, floating illustrated logo and a subtle highlight on the main CAST LINE button. Decorative elements remain behind high-contrast dark UI panels and bold white labels. In low-effects mode all motion is frozen and particle counts fall.

An INSTALL APP shortcut is now visible on the title screen where the game is not installed. The existing native browser install prompt is used when available; if not, a dedicated help screen provides platform-specific steps for Android Chrome, iOS Safari and desktop browsers, with a COPY GAME LINK option for players opening the site from in-app browsers. Service-worker registration is also resilient to running after the page load event, and resolves its URL relative to the HTML document rather than the Vite asset bundle. Browser installation cannot be forced: users may need to open the game in Chrome or Safari before using the browser's install/home-screen command. Cache v10 refreshes the installed shell.

## Natural fish flight and cinematic shooting

During the shooting phase, fish burst out of the water in a short staggered sequence. Each one follows a gravity-driven arc with a little spin, reaches an apex and falls back into the sea. Fish that splash down **escape permanently** for that round; they cannot be shot or paid out once they hit the water. Splash particles, ripples and a descending water sound mark each escape, and the results show the number lost to the sea. The round concludes after all fish have either been shot or splashed down (or the shooting timer expires). No invisible water bounce or infinite airborne fish.

Weapon tiers now have distinct, bolder projectile effects and muzzle flashes. Hits produce colourful impact bursts, shock rings and flying gold coins; chain combos intensify them. When the **last remaining fish** is shot, a short slow-motion finishing celebration triggers with a large coin explosion, dramatic screen shake and an original finisher jingle. Existing reduced-effects settings suppress screen shake and slow motion, while keeping the same fish physics and shot payouts. Ammo remains unlimited.

The flight rules live in `src/airborne.js` and are covered by `test/airborne.test.mjs`, including gravity, staggered launches, one-time splash-downs and round completion. Shots ignore fish that have not launched or have already escaped.

## Modern arcade title and phase transition overhaul

The main title is now a neon-framed arcade attract screen: the original logo has a stronger glow and sparkles, a streamlined three-step DIVE / REEL / BLAST sequence explains the loop, and the primary CAST LINE control sits above the smaller navigation and persistent wallet/best-score cards. Panels and buttons use rounded gradient-backed chrome with sharp high-contrast white text.

Each cast now has a short, original animated full-screen stage card for **DIVE IN**, **REEL IT IN**, **LOCK & LOAD**, and **CAST COMPLETE**. During these transitions, the game freezes fish physics and round timers, so players don't lose any fishing or shooting time. Backgrounding and pausing freeze the cards too. Reduced Effects disables the interstitial animation entirely and preserves immediate play. The transition timings and configurations live in `src/arcade-ui.js` with unit tests.

The results screen has a count-up payout, stronger hierarchy, neon reward card, and a more prominent FISH AGAIN button. The pause screen has been redesigned to match, while retaining its controls. All original gameplay systems, progression and save data are unchanged. PWA cache v12 includes the new module for offline play.

## Relaxed pacing and deeper dives

Diving and reeling move at a more manageable pace, shooting gives you 16 seconds instead of 12, and the chiptune beat is slightly slower without losing its arcade rhythm. Full-screen transitions between dive/reel/shoot/results have been switched off in favour of uninterrupted play.

Fish population has been thinned from approximately one per 43 depth units to one per 74, the first fish appear around 295 depth units instead of 155, large sardine schools are less common, and descending collisions have a smaller hit area. The first 360 units of a dive cannot abruptly reverse into reeling from fish contact. Deeper biome fish remain available to catch on the way back up.


## Blank-screen recovery (October 2026)

A faulty light-upgrade edit produced an unterminated JavaScript string and appended a duplicate tail after the game entry point. Browsers could display a blank canvas because the entire module failed parsing. The malformed gadget button was restored, the duplicated 16KB block was removed, and tests now detect duplicated lifecycle functions and incomplete game source. The PWA cache was incremented to v15; app progress stays in localStorage.


### First-frame and offline-cache recovery

A lightweight loading overlay is visible until the canvas completes its first render. If the game fails to start or remains blank for over six seconds, a **Refresh game files** button appears. This unregisters the Reel Trouble service worker, deletes only game-specific offline caches, and reloads the page without deleting your saved coins, upgrades or collection. Offline cache v16 fetches the repaired game shell.

## v0.2 — Feel-Good Update

- Ocean density now 3–5 fish per chunk instead of 4–6. A smaller swept hitbox makes diving fairer, and a close pass earns a $5 once-per-fish near-miss reward. Ascent keeps the generous hook reach; the protected first 180m remains.
- Eleven individual hand-pixelled surface fish silhouettes, distinct from the existing speciality deep and giant artwork. No species IDs are renumbered.
- DIVE / REEL / SHOOT / RESULTS have short translucent captions that **never** pause steering, physics or timers. Reduced Effects disables the cue overlay.
- The seven depth regions each have an effect: Sunskip's quick central current, Bluewander cross-current, Kelp Knuckles outer drag, The Hush sonar pulses, Lantern Rift's moving glow/catch lane, Blackglass timed pressure surges, and The Unmarked reversing drift. The region announcement explains the mechanic.
- Optional **Daily Dive** via More → Captain's Cabin uses a shared UTC-date seed, a share code, and device-local daily attempt and personal-best records. This is not an online leaderboard or a standardized-equipment tournament. Campaign saves still use `reel-trouble-save-v1`; daily records use a separate `reel-trouble-daily-v1` entry.
