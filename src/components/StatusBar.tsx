import { useEffect, useState } from "react";
import { ASSETS, ASSETS_BY_KIND, geoAt, KIND_LABEL } from "../lib/constellation";
import { KIND_COLOR, useMission } from "../lib/mission-store";
import { missionTime } from "../lib/mission-time";

export default function StatusBar() {
  const { selected, settings, view } = useMission();
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 250);
    return () => clearInterval(id);
  }, []);

  const asset = selected ? ASSETS.find((a) => a.id === selected) : null;
  const t = missionTime(settings.timeScale);
  const g = asset ? geoAt(asset, t) : null;
  const met = new Date(t * 1000).toISOString().substring(11, 19);

  return (
    <footer className="flex shrink-0 items-center gap-5 overflow-x-auto border-t border-border bg-card px-4 py-1.5 font-mono text-[10px] text-muted-foreground">
      <span className="uppercase tracking-widest">MET {met}</span>
      <span className="uppercase tracking-widest">{settings.timeScale}x</span>
      <span className="uppercase tracking-widest">{view.toUpperCase()} VIEW</span>
      <span className="h-3 w-px bg-border" />
      {(["leo", "haps", "drone", "gs"] as const).map((k) => (
        <span key={k} className="flex items-center gap-1.5">
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: KIND_COLOR[k] }}
          />
          {KIND_LABEL[k]}s {ASSETS_BY_KIND[k].length}
        </span>
      ))}
      <span className="h-3 w-px bg-border" />
      {asset && g ? (
        <span className="text-foreground">
          {asset.id} · {asset.clusterName} · LAT {g.lat.toFixed(2)}° LON {g.lon.toFixed(2)}° ·
          ALT {g.altitudeKm.toFixed(1)} km · {asset.status.toUpperCase()}
        </span>
      ) : (
        <span>No asset selected</span>
      )}
    </footer>
  );
}
