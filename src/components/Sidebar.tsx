import { useMemo, useState } from "react";
import {
  Satellite,
  Wind,
  Plane,
  RadioTower,
  Search,
  Globe2,
  Settings as SettingsIcon,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  ASSETS,
  ASSETS_BY_KIND,
  geoAt,
  KIND_LABEL,
  type Asset,
  type AssetKind,
} from "../lib/constellation";
import { KIND_COLOR, useMission, type PanelKey } from "../lib/mission-store";
import { missionTime } from "../lib/mission-time";

const NAV: Array<{ key: PanelKey; label: string; icon: typeof Satellite }> = [
  { key: "leo", label: "LEO", icon: Satellite },
  { key: "haps", label: "HAPS", icon: Wind },
  { key: "drone", label: "Drones", icon: Plane },
  { key: "gs", label: "Ground Stations", icon: RadioTower },
  { key: "search", label: "Search", icon: Search },
  { key: "world", label: "World View", icon: Globe2 },
  { key: "settings", label: "Settings", icon: SettingsIcon },
];

const STATUS_CLASS = {
  nominal: "text-[--color-status-ok]",
  standby: "text-[--color-status-warn]",
  degraded: "text-[--color-status-bad]",
} as const;

function AssetRow({ asset }: { asset: Asset }) {
  const { selected, select, focusOn, settings } = useMission();
  const g = geoAt(asset, missionTime(settings.timeScale));
  const active = selected === asset.id;
  return (
    <button
      onClick={() => {
        select(asset.id);
        focusOn(g.lat, g.lon);
      }}
      className={`flex w-full items-center gap-2 rounded border px-2 py-1.5 text-left font-mono text-[11px] transition-colors ${
        active
          ? "border-primary/70 bg-primary/15 text-foreground"
          : "border-transparent text-muted-foreground hover:border-border hover:bg-secondary"
      }`}
    >
      <span
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: KIND_COLOR[asset.kind] }}
      />
      <span className="w-[68px] shrink-0 text-foreground">{asset.id}</span>
      <span className="flex-1 truncate">{asset.clusterName}</span>
      <span className={`shrink-0 ${STATUS_CLASS[asset.status]}`}>
        {asset.status.slice(0, 3).toUpperCase()}
      </span>
    </button>
  );
}

function LayerPanel({ kind }: { kind: AssetKind }) {
  const { layers, toggleLayer } = useMission();
  const list = ASSETS_BY_KIND[kind];
  return (
    <div className="flex h-full flex-col">
      <PanelHeader title={`${KIND_LABEL[kind]}s`} subtitle={`${list.length} assets tracked`}>
        <button
          onClick={() => toggleLayer(kind)}
          className="rounded border border-border p-1 text-muted-foreground hover:text-foreground"
          aria-label="Toggle layer visibility"
        >
          {layers[kind] ? <Eye size={13} /> : <EyeOff size={13} />}
        </button>
      </PanelHeader>
      <div className="flex-1 space-y-0.5 overflow-y-auto p-2">
        {list.map((a) => (
          <AssetRow key={a.id} asset={a} />
        ))}
      </div>
    </div>
  );
}

function PanelHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
      <div>
        <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-foreground">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {children}
    </div>
  );
}

function SearchPanel() {
  const [q, setQ] = useState("");
  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    return ASSETS.filter(
      (a) => a.id.toLowerCase().includes(s) || a.clusterName.toLowerCase().includes(s),
    ).slice(0, 120);
  }, [q]);
  return (
    <div className="flex h-full flex-col">
      <PanelHeader title="Search" subtitle="ID or operational cluster" />
      <div className="p-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="LEO-042, HAPS-007, Anatolia…"
          className="w-full rounded border border-border bg-input px-2 py-1.5 font-mono text-[11px] text-foreground outline-none placeholder:text-muted-foreground focus:border-primary"
        />
      </div>
      <div className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-2">
        {results.map((a) => (
          <AssetRow key={a.id} asset={a} />
        ))}
        {q && results.length === 0 && (
          <p className="px-2 py-4 font-mono text-[11px] text-muted-foreground">No matches.</p>
        )}
      </div>
    </div>
  );
}

function WorldViewPanel() {
  const { view, setView, layers, toggleLayer } = useMission();
  return (
    <div className="flex h-full flex-col">
      <PanelHeader title="World View" subtitle="Shared geographic state" />
      <div className="space-y-4 p-3">
        <div className="grid grid-cols-2 gap-2">
          {(["3d", "2d"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`rounded border px-2 py-3 font-mono text-[11px] uppercase tracking-widest transition-colors ${
                view === v
                  ? "border-primary bg-primary/20 text-foreground"
                  : "border-border text-muted-foreground hover:bg-secondary"
              }`}
            >
              {v === "3d" ? "3D Globe" : "2D Map"}
            </button>
          ))}
        </div>
        <div>
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Layers
          </p>
          <div className="space-y-1">
            {(["leo", "haps", "drone", "gs"] as AssetKind[]).map((k) => (
              <button
                key={k}
                onClick={() => toggleLayer(k)}
                className="flex w-full items-center gap-2 rounded border border-border px-2 py-1.5 font-mono text-[11px] hover:bg-secondary"
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: KIND_COLOR[k], opacity: layers[k] ? 1 : 0.25 }}
                />
                <span className={layers[k] ? "text-foreground" : "text-muted-foreground"}>
                  {KIND_LABEL[k]}s
                </span>
                <span className="ml-auto text-muted-foreground">
                  {ASSETS_BY_KIND[k].length}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsPanel() {
  const { settings, setSettings } = useMission();
  const toggles: Array<[keyof typeof settings, string]> = [
    ["showLabels", "Asset labels (2D, zoom > 5x)"],
    ["showOrbits", "Orbital plane rings"],
    ["showClusterLinks", "Cluster hierarchy links"],
  ];
  return (
    <div className="flex h-full flex-col">
      <PanelHeader title="Settings" subtitle="Display & simulation" />
      <div className="space-y-4 p-3">
        <div>
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Time scale
          </p>
          <div className="grid grid-cols-4 gap-1">
            {[1, 10, 60, 240].map((s) => (
              <button
                key={s}
                onClick={() => setSettings({ timeScale: s })}
                className={`rounded border px-1 py-1.5 font-mono text-[10px] ${
                  settings.timeScale === s
                    ? "border-primary bg-primary/20 text-foreground"
                    : "border-border text-muted-foreground hover:bg-secondary"
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-1">
          {toggles.map(([key, label]) => (
            <button
              key={key}
              onClick={() => setSettings({ [key]: !settings[key] } as never)}
              className="flex w-full items-center justify-between rounded border border-border px-2 py-1.5 font-mono text-[11px] text-muted-foreground hover:bg-secondary"
            >
              <span>{label}</span>
              <span
                className={`h-2 w-2 rounded-full ${
                  settings[key] ? "bg-[--color-status-ok]" : "bg-border"
                }`}
              />
            </button>
          ))}
        </div>
        <p className="font-mono text-[10px] leading-relaxed text-muted-foreground">
          Sub-orbital layers (HAPS 18–20 km, drones 2–5 km below) are altitude-exaggerated in
          3D for legibility; geographic positions remain exact and identical in both views.
        </p>
      </div>
    </div>
  );
}

export default function Sidebar() {
  const [panel, setPanel] = useState<PanelKey>("world");
  const { view, setView } = useMission();

  return (
    <aside className="flex h-full shrink-0 border-r border-border bg-card">
      <nav className="flex w-[58px] shrink-0 flex-col items-center gap-1 border-r border-border py-3">
        <div className="mb-3 flex h-7 w-7 items-center justify-center rounded bg-primary/20 font-mono text-[10px] font-bold text-primary">
          OL
        </div>
        {NAV.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            title={label}
            onClick={() => {
              setPanel(key);
              if (key === "world") setView(view === "3d" ? "3d" : "2d");
            }}
            className={`flex h-10 w-10 items-center justify-center rounded transition-colors ${
              panel === key
                ? "bg-primary/20 text-primary"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            <Icon size={16} />
          </button>
        ))}
      </nav>
      <div className="w-[268px] overflow-hidden">
        {panel === "search" ? (
          <SearchPanel />
        ) : panel === "world" ? (
          <WorldViewPanel />
        ) : panel === "settings" ? (
          <SettingsPanel />
        ) : (
          <LayerPanel kind={panel as AssetKind} />
        )}
      </div>
    </aside>
  );
}
