# Reel Trouble v0.4 — Equipment That Changes How You Play

Visit **Gear Shop → New Tech** to browse the scrollable Outfitter. It contains functional gear separate from the existing cosmetic Boat Yard and normal levelled reel, hook and gun purchases.

| Item | Cost | Gameplay effect |
| --- | ---: | --- |
| Echo Finder | $420 | Tap **Sonar Ping** on the fishing HUD to highlight fish, hazards, echo gates and relics through darkness for 4.5 seconds; 18-second cooldown. |
| Current Fins | $350 | Equip a specialist hook with 30% more responsive steering. |
| Wide Arc | $575 | Equip a specialist hook with a 20 px wider catch sweep on ascent. |
| Ghost Tip | $850 | Equip a specialist hook that bypasses the first fish collision of a dive without consuming an existing Blast Charge. |
| Keel Stabiliser | $980 | Permanent visible boat fitting that reduces drift and jellyfish slowdown. |
| Power Winch | $1,250 | Permanent visible boat fitting that reels the line 22% faster. |

Only one specialist hook can be selected at a time; previously purchased hooks can be equipped again for free, including the default Bare Hook. Sonar and both boat fittings are permanently available once bought, and the two boat upgrades stack. Paint jobs and pennants in the original Boat Yard remain vanity-only.

Existing saves are preserved. The normal reel-trouble-save-v1 record simply gains a backward-compatible optional equipment field. Daily Dive procedural seeds, saved catches, previous upgrades, and the Bellwraith quest are unaffected. The offline service worker uses cache revision 37.

Testing: run npm run check for unit and source assertions; run npm run mobile:smoke for touch purchases, swipe scrolling, the sonar HUD, a complete Daily Dive and deep-encounter checks.
