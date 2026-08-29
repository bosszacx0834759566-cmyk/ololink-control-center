// Single mission clock shared by the 3D and 2D views.
let accumulated = 0;
let scale = 1;
let last = typeof performance !== "undefined" ? performance.now() : 0;

if (typeof window !== "undefined") {
  const tick = (now: number) => {
    accumulated += ((now - last) / 1000) * scale;
    last = now;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/** Mission-elapsed seconds, honoring the current time-scale multiplier. */
export function missionTime(nextScale: number): number {
  scale = nextScale;
  return accumulated;
}
