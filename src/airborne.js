// Small, deterministic shooting-phase flight model. Units are canvas pixels/seconds.
export const SHOOT_WATERLINE = 644;
export const AIR_GRAVITY = 420;
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

export function makeAirborneCatch(catchData, index, total, random=Math.random) {
  const between = (low, high) => low + clamp(Number(random()) || 0, 0, 1) * (high - low);
  const lane = total > 1 ? index / (total - 1) - .5 : 0;
  return {
    kind: catchData.kind, value: catchData.value,
    x: clamp(210 + lane * 280 + between(-15, 15), 50, 370),
    y: SHOOT_WATERLINE + 15,
    vx: clamp(lane * 70 + between(-68, 68), -125, 125),
    vy: -between(460, 590),
    angle: between(-.2, .2),
    spin: between(-1.35, 1.35),
    phase: index, launchDelay: index * .14 + between(0, .04),
    launched: false, shot: false, lost: false
  };
}

// Returns true exactly on the frame the fish splashes down.
// Fish launch in a staggered sequence, and never bounce off an invisible water floor.
export function stepAirborneCatch(fish, dt, waterline=SHOOT_WATERLINE) {
  if (fish.shot || fish.lost || !Number.isFinite(dt) || dt <= 0) return false;
  let remaining = dt;
  if (!fish.launched) {
    const delay = Math.max(0, fish.launchDelay);
    fish.launchDelay = Math.max(0, delay - dt);
    if (fish.launchDelay > 0) return false;
    fish.launched = true;
    remaining = Math.max(0, dt - delay);
  }
  fish.x += fish.vx * remaining;
  fish.y += fish.vy * remaining + AIR_GRAVITY * remaining * remaining / 2;
  fish.vy += AIR_GRAVITY * remaining;
  fish.angle += fish.spin * remaining;
  // Keep airborne targets on-screen, with a gentle side-wall ricochet.
  if (fish.x < 38 || fish.x > 382) {
    fish.x = clamp(fish.x, 38, 382);
    fish.vx *= -.65;
    fish.spin *= -.8;
  }
  if (fish.vy > 0 && fish.y >= waterline - 12) {
    fish.y = waterline - 12;
    fish.lost = true;
    return true;
  }
  return false;
}

export function allCatchResolved(fishes) {
  return fishes.every(fish => fish.shot || fish.lost);
}
