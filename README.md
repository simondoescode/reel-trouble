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
4. Tap airborne fish to shoot them and collect money.
5. Visit **UPGRADE GEAR** to buy longer line, wider hook, and extra shots.

### Controls and input settings

On first launch on a touch-screen phone, the game opens **Settings** to ask whether to use **Touch** or **Tilt** steering. You can change this later using **Settings** on the main menu.

- **Tilt:** Select **Tilt** and allow motion access if requested (iOS Safari requires a tap to grant permission). Hold the phone comfortably to set neutral; tilt sideways to steer during descent/ascent. Tap **Recenter Tilt** to reset the neutral position. Only works where device orientation events are supported and permitted.
- **Touch:** Drag horizontally on the screen while fishing. Dragging remains available as a fallback even when tilt is selected.
- **Shooting:** Tap the flying fish; tilt does not aim.
- **Desktop:** Left/right arrow keys or A/D to steer; Space or Enter to cast.

Input preference is stored locally as `reel-trouble-input-v1`. HTTPS is required for orientation events (GitHub Pages serves HTTPS). Portrait orientation is recommended on mobile.

## Code

- `index.html` — HTML canvas and Vite entry; direct-source fallback for branch publishing
- `src/game.js` — gameplay, animations, touch/tilt input, settings, upgrades, audio, saved progress
- `src/tilt.js` — tested tilt axis and speed mapping
- `src/styles.css` — responsive mobile layout
- `vite.config.js` — GitHub Pages base path
- `test/` — static smoke tests
- `.github/workflows/deploy.yml` — test, build and Pages deployment

Six fish types use original, hand-authored pixel sprites and limited colour palettes. The ocean, boat, hook, UI and shooting sky use blocky geometry, with nearest-neighbour scaling from a low-resolution canvas. This is original retro arcade art, not assets extracted from another game. No third-party runtime libraries, ads, analytics or external API calls. Player progress is saved locally under `reel-trouble-save-v1` and falls back to existing `deep-end-save-v1` data from the same browser origin.

## Status

Playable web prototype with one complete fishing loop, six fish types, three upgrade tracks and local saved progress. Android packaging is a separate future task; the project has not been converted to an installable APK.