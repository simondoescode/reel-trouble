// Deterministic sky-flight simulation in world pixels and seconds.
// Keep world positions independent of the animated camera and screen-space hit testing.
export const SHOOT_WATERLINE = 644;
export const AIR_GRAVITY = 355;
export const AIR_DRAG = 0.18;
export const SHOOT_SURFACE_INSET = 12;
const WIDTH = 420;
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const finite = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const unit = random => clamp(finite(random(), .5), 0, 1);

export function makeAirborneCatch(catchData, index, total, random = Math.random, options = {}) {
  const between = (low, high) => low + unit(random) * (high - low);
  const lane = total > 1 ? index / (total - 1) * 2 - 1 : 0;
  const size = clamp(finite(catchData.size, 18), 10, 60);
  const mass = clamp((size - 12) / 46, 0, 1);
  const reelFactor = clamp(finite(options.reelSpeed, 205) / 205, .75, 1.25);
  const originX = clamp(finite(options.x, WIDTH / 2), 58, WIDTH - 58);
  // Every target starts beside the hook; the fan-out develops through velocity.
  const x = clamp(originX + lane * 12 + between(-7, 7), 36, WIDTH - 36);
  const vy = -between(650, 780) * reelFactor * (1 - .21 * mass);
  const desiredVx = lane * between(48, 67) + between(-19, 19);
  // Limit travel over the entire estimated flight rather than ricocheting off walls.
  const flightTime = 2 * Math.abs(vy) / AIR_GRAVITY;
  const travelFactor = -Math.expm1(-AIR_DRAG * flightTime) / AIR_DRAG;
  const vx = clamp(desiredVx, (36 - x) / travelFactor, (WIDTH - 36 - x) / travelFactor);
  return {
    kind: catchData.kind, value: catchData.value, size, mass,
    x, y: SHOOT_WATERLINE + 9, vx, vy, angle: between(-.24, .24),
    spin: between(-2.5, 2.5) * (1.18 - mass * .52),
    phase: index,
    // All fish erupt as one catch, with a little variation rather than a long queue.
    launchDelay: between(0, .07),
    launched: false, shot: false, lost: false
  };
}

// Analytic integration prevents different frame rates from producing different trajectories.
// Returns true once, on downward impact with the sea.
export function stepAirborneCatch(fish, dt, waterline = SHOOT_WATERLINE) {
  if (fish.shot || fish.lost || !Number.isFinite(dt) || dt <= 0) return false;
  let elapsed = dt;
  if (!fish.launched) {
    const wait = Math.max(0, finite(fish.launchDelay, 0));
    fish.launchDelay = Math.max(0, wait - dt);
    if (fish.launchDelay > 0) return false;
    fish.launched = true;
    elapsed = Math.max(0, dt - wait);
  }
  if (elapsed <= 0) return false;
  const decay = Math.exp(-AIR_DRAG * elapsed);
  fish.x += fish.vx * (-Math.expm1(-AIR_DRAG * elapsed) / AIR_DRAG);
  fish.vx *= decay;
  fish.y += fish.vy * elapsed + AIR_GRAVITY * elapsed * elapsed / 2;
  fish.vy += AIR_GRAVITY * elapsed;
  fish.angle += fish.spin * elapsed;
  if (fish.vy > 0 && fish.y >= waterline - SHOOT_SURFACE_INSET) {
    fish.y = waterline - SHOOT_SURFACE_INSET;
    fish.lost = true;
    return true;
  }
  return false;
}

// ScreenY = worldY - cameraOffset. Starts at 452 to line up the previous
// reel scene's water surface (192), then follows the ascending school.
export function targetSkyCamera(fishes, focusY = 348) {
  const active = fishes.filter(f => f.launched && !f.shot && !f.lost);
  if (!active.length) return 0;
  const heights = active.map(f => f.y).sort((a, b) => a - b);
  const median = heights[Math.floor((heights.length - 1) / 2)];
  const highest = heights[0];
  const lowest = heights[heights.length - 1];
  const focus = highest * .28 + median * .52 + lowest * .2;
  return clamp(focus - focusY, -455, 0);
}

export function stepSkyCamera(current, target, dt, launching = false) {
  if (!Number.isFinite(dt) || dt <= 0) return current;
  const response = launching ? 7.5 : 3.8;
  const amount = -Math.expm1(-response * dt);
  return current + (clamp(target, -455, 0) - current) * amount;
}
export const skyScreenY = (worldY, cameraOffset) => worldY - cameraOffset;
export const allCatchResolved = fishes => fishes.every(fish => fish.shot || fish.lost);
