import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import Sidebar from "../components/Sidebar";
import Map2D from "../components/Map2D";
import StatusBar from "../components/StatusBar";
import { MissionContext, type MissionState, type MissionSettings } from "../lib/mission-store";
import type { AssetKind } from "../lib/constellation";

const Globe3D = lazy(() => import("../components/Globe3D"));

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "OloLink Mission Control — LEO, HAPS & Relay Network" },
      {
        name: "description",
        content:
          "Aerospace-grade mission control for the OloLink network: 250 LEO satellites, HAPS platforms, relay drones and ground stations on a synchronized 3D globe and 2D world map.",
      },
      { property: "og:title", content: "OloLink Mission Control" },
      {
        property: "og:description",
        content:
          "Synchronized 3D globe and 2D map tracking LEO satellites, HAPS, relay drones and ground stations in real time.",
      },
    ],
  }),
  component: MissionControl,
});

function MissionControl() {
  const [view, setView] = useState<"3d" | "2d">("3d");
  const [selected, select] = useState<string | null>(null);
  const [focus, setFocus] = useState<MissionState["focus"]>(null);
  const [layers, setLayers] = useState<Record<AssetKind, boolean>>({
    leo: true,
    haps: true,
    drone: true,
    gs: true,
  });
  const [settings, setSettingsState] = useState<MissionSettings>({
    timeScale: 60,
    showLabels: true,
    showOrbits: true,
    showClusterLinks: true,
  });
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const value = useMemo<MissionState>(
    () => ({
      view,
      setView,
      layers,
      toggleLayer: (k) => setLayers((l) => ({ ...l, [k]: !l[k] })),
      selected,
      select,
      focus,
      focusOn: (lat, lon) => setFocus({ lat, lon, token: Date.now() }),
      settings,
      setSettings: (s) => setSettingsState((prev) => ({ ...prev, ...s })),
    }),
    [view, layers, selected, focus, settings],
  );

  return (
    <MissionContext.Provider value={value}>
      <main className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
        <Sidebar />
        <section className="relative flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-border bg-card px-4 py-2">
            <div className="flex items-baseline gap-3">
              <h1 className="font-mono text-[13px] font-semibold uppercase tracking-[0.3em] text-foreground">
                OloLink
              </h1>
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Mission Control · Phase 1
              </span>
            </div>
            <div className="flex overflow-hidden rounded border border-border">
              {(["3d", "2d"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`px-3 py-1 font-mono text-[10px] uppercase tracking-widest transition-colors ${
                    view === v
                      ? "bg-primary/25 text-foreground"
                      : "text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </header>
          <div className="relative min-h-0 flex-1">
            {mounted &&
              (view === "3d" ? (
                <Suspense
                  fallback={
                    <div className="flex h-full items-center justify-center font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                      Initializing orbital scene…
                    </div>
                  }
                >
                  <Globe3D />
                </Suspense>
              ) : (
                <Map2D />
              ))}
          </div>
          <StatusBar />
        </section>
      </main>
    </MissionContext.Provider>
  );
}
