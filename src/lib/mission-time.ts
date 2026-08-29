// Single mission clock shared by the 3D and 2D views.
const EPOCH = Date.now();
let accumulated = 0;
let lastReal = EPOCH;
let lastScale = 1;

/** Mission-elapsed seconds, honoring the current time-scale multiplier. */
export function missionTime(scale: number): number {
  const now = Date.now();
  accumulated += ((now - lastReal) / 1000) * lastScale;
  lastReal = now;
  lastScale = scale;
  return accumulated;
}
