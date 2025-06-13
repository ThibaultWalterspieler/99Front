const PI2 = Math.PI * 2.0;

const lerp = (start, end, amt) => (1 - amt) * start + amt * end;
const invLerp = (x, y, a) => clamp((a - x) / (y - x));
const damp = (start, end, amt, dt = 1) => lerp(start, end, 1 - Math.exp(Math.log(1 - amt) * dt));
const round = (t) => Math.round(t * 100) / 100;

/**
 * Wrap an angle between 0 and 2*PI
 * @param a the angle to wrap
 * @returns
 */
function normalizeAngle(a) {
  while (a >= PI2) a -= PI2;
  while (a < 0.0) a += PI2;
  return a;
}

/**
 * Avoid 360 wrap around when update an angle. Usefull when angle value is smoothed
 * Eg : if angle is 350 and dest is 10, return 370 (this function use radians though)
 * @param angle the initial angle in radians
 * @param dest the destination angle in radians
 * @returns the destination angle, eventually modified to avoid 360 wrap around
 */
function normalizeDeltaAngle(angle, dest) {
  let d0 = dest - angle;
  const d1 = d0 - PI2;
  const d2 = d0 + PI2;

  if (Math.abs(d1) < Math.abs(d0)) {
    d0 = d1;
  }
  if (Math.abs(d2) < Math.abs(d0)) {
    d0 = d2;
  }

  return angle + d0;
}

export { lerp, damp, invLerp, round, normalizeAngle, normalizeDeltaAngle };
