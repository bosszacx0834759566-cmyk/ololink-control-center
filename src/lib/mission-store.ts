import { createContext, useContext } from "react";
import type { AssetKind } from "./constellation";

export type PanelKey =
  | "leo"
  | "haps"
  | "drone"
  | "gs"
  | "search"
  | "world"
  | "settings";

export interface MissionSettings {
  timeScale: number;
  showLabels: boolean;
  showOrbits: boolean;
  showClusterLinks: boolean;
}

export interface MissionState {
  view: "3d" | "2d";
  setView: (v: "3d" | "2d") => void;
  layers: Record<AssetKind, boolean>;
  toggleLayer: (k: AssetKind) => void;
  selected: string | null;
  select: (id: string | null) => void;
  focus: { lat: number; lon: number; token: number } | null;
  focusOn: (lat: number, lon: number) => void;
  settings: MissionSettings;
  setSettings: (s: Partial<MissionSettings>) => void;
}

export const MissionContext = createContext<MissionState | null>(null);

export function useMission(): MissionState {
  const ctx = useContext(MissionContext);
  if (!ctx) throw new Error("useMission must be used inside MissionContext");
  return ctx;
}

export const KIND_COLOR: Record<AssetKind, string> = {
  leo: "#5ad2ff",
  haps: "#7cf6b0",
  drone: "#ffc65c",
  gs: "#ff7a6b",
};
