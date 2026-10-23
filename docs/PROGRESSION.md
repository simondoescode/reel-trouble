# v0.5 — Captain's Records and tougher progression

## What changed

The opening **350 m** and first reel upgrade remain accessible. After that, buying the next line requires reaching a specified fraction of the current line's maximum depth, starting at **72%** and gradually rising to **84%**. Buying coins or cosmetic upgrades alone cannot bypass the skill trial. Advanced line prices have increased, while the first upgrade stays **$65**.

**Grandfathering:** previous reel levels are retained. Old saved depth records are recognised through the existing expedition history. No historical coins, tools, species IDs, Daily Dive data or Bellwraith outcomes are reset. New personal records and medals are stored in an optional `career` object in the existing `reel-trouble-save-v1` save.

From **More → Captain's Records**, players can see:

- Six career ranks that require *both* depth achievement and fish successfully shot, with the last rank requiring a Bellwraith victory.
- Best lifetime dive depth, largest successful shooting haul, highest combo and largest round payout.
- Persistent records of Golden Fish shot and Bellwraith victories.
- Six mastery medals, each paying a modest bonus **once**, and the exact next-reel depth requirement.

After completing the main story chapters, repeatable Skipper bounties now require **12, 18, 24, 30 ... up to 60** additional catches, rather than 12 every time. Each step offers only a modest reward increase. Existing bounty counts remain intact.

## Balance and compatibility

Starter fish density and the protected first 180 m are unchanged. Normal shooting still has unlimited ammo. No paywall, in-app purchase or forced online account is introduced. Equipment purchased in v0.4, personal fish collections and previously unlocked chapters are retained.

Run `npm run check` for the career/reel and bounty tests and `npm run mobile:smoke` for touch navigation, cast flow and saved progression. Version `0.5.0` uses offline cache revision `38`.
