// Pure steering helpers for orientation sensor input.
export function tiltAxis(beta, gamma, rotation = 0) {
  const angle = ((rotation % 360) + 360) % 360;
  if (angle === 90) return Number.isFinite(beta) ? beta : null;
  if (angle === 270) return Number.isFinite(beta) ? -beta : null;
  if (angle === 180) return Number.isFinite(gamma) ? -gamma : null;
  return Number.isFinite(gamma) ? gamma : null;
}

export function tiltVelocity(angle, neutral = 0) {
  if (!Number.isFinite(angle) || !Number.isFinite(neutral)) return 0;
  const delta = angle - neutral;
  const excess = Math.max(0, Math.abs(delta) - 3);
  return Math.sign(delta) * Math.min(excess / 27, 1) * 350;
}
