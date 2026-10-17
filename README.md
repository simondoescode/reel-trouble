# Reel Trouble 🎣

A small original, touch-friendly, portrait arcade fishing game. Dodge fish while your line sinks, catch them on the way up, then shoot the airborne catch to earn cash for upgrades.

The prototype was previously named **Deep End**. The code and procedural graphics are original; no assets, code, or APK from *Ridiculous Fishing* are included.

## Play

Open `index.html` in a modern browser. No dependencies, compilation, or network calls are required.

For local development, serve the folder with any static server:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000/`.

## Controls and gameplay

1. Choose **CAST LINE** to start diving.
2. Drag side-to-side to avoid fish during descent; a collision or max depth starts the ascent.
3. Drag into fish on the ascent to catch them.
4. Tap the airborne fish to shoot them and collect money.
5. Visit **UPGRADE GEAR** to buy longer line, wider hook, and extra shots.

Desktop: arrow keys / A-D to steer; Space or Enter to cast. The prototype works best in portrait orientation, including mobile browsers.

## Repository structure

- `index.html` — canvas and page setup
- `styles.css` — responsive canvas layout
- `game.js` — gameplay, animations, input, upgrades, audio and saved progress

The six fish are drawn procedurally on canvas. The game does not include third-party libraries, ads, analytics, or external requests. Progress is stored locally in the browser under `reel-trouble-save-v1`; existing `deep-end-save-v1` data can be migrated automatically on load when present on the same origin.

## Status

Early playable prototype with one complete fishing loop, six fish types, three upgrade tracks and locally saved progress. This repository contains the **web game only**; an installable Android APK has not been built or tested here.
