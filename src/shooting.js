// Pure weapon, hit-testing and combo logic. Graphics and side effects live in game.js.
export function weaponForLevel(level) {
  const tier = Math.max(0, Math.min(5, Math.floor(Number(level) || 0)));
  if (tier >= 4) return { name: 'NEON BLASTER', maxHits: 3, spread: 27, aimAssist: 12, color: '#8dffec', tier: 2 };
  if (tier >= 2) return { name: 'SCATTERGUN', maxHits: 2, spread: 14, aimAssist: 12, color: '#ffe35b', tier: 1 };
  return { name: 'POP GUN', maxHits: 1, spread: 0, aimAssist: 12, color: '#ff596c', tier: 0 };
}

// Compare the tap with the sprite's approximate *visible* elliptical footprint.
// This avoids the old 95px blanket radius and gives larger fish a larger target.
export function pickShotTargets(fishes, x, y, weapon) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return [];
  const hits = [];
  for (const fish of fishes) {
    if (fish.shot) continue;
    const size = Number(fish.size);
    if (!Number.isFinite(size) || size <= 0) continue;
    const rx = size * 1.55 * 1.24 + weapon.aimAssist + weapon.spread;
    const ry = size * 1.55 * .69 + weapon.aimAssist * .6 + weapon.spread * .7;
    const dx = (x - fish.x) / rx, dy = (y - fish.y) / ry;
    const distance = dx * dx + dy * dy;
    if (distance <= 1) hits.push({ fish, distance });
  }
  return hits.sort((a, b) => a.distance - b.distance)
    .slice(0, weapon.maxHits).map(hit => hit.fish);
}

export function nextCombo(previous, lastHit, now, hits) {
  if (!hits) return { count: 0, multiplier: 1, lastHit: -Infinity };
  const continued = Number.isFinite(lastHit) && now - lastHit <= 2.4 && now >= lastHit;
  const count = continued ? previous + 1 : 1;
  return { count, multiplier: Math.min(4, count), lastHit: now };
}
export function shotPayout(value, multiplier) {
  return Math.max(0, Math.round(Math.max(0, Number(value) || 0) * Math.max(1, multiplier)));
}
