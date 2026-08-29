import { useCallback, useEffect, useRef } from "react";
import earthMap from "../assets/earth-map.jpg";
import { ASSETS_BY_KIND, geoAt, type Asset, type AssetKind } from "../lib/constellation";
import { KIND_COLOR, useMission } from "../lib/mission-store";
import { missionTime } from "../lib/mission-time";

const MIN_ZOOM = 1;
const MAX_ZOOM = 22;
const KIND_SIZE: Record<AssetKind, number> = { leo: 2.6, haps: 3, drone: 2.4, gs: 3.2 };

interface ViewState {
  zoom: number;
  x: number;
  y: number;
}

export default function Map2D() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const view = useRef<ViewState>({ zoom: 1, x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number } | null>(null);
  const mission = useMission();
  const missionRef = useRef(mission);
  missionRef.current = mission;
  const imgRef = useRef<HTMLImageElement | null>(null);
  const hitsRef = useRef<Array<{ id: string; x: number; y: number }>>([]);

  // Base map: 2:1 equirectangular, matching the 3D globe texture.
  useEffect(() => {
    const img = new Image();
    img.src = earthMap;
    img.onload = () => {
      imgRef.current = img;
    };
  }, []);

  const layout = useCallback(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return null;
    const w = wrap.clientWidth;
    const h = wrap.clientHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
    }
    // Fit a 2:1 map inside the viewport at zoom 1.
    const baseW = Math.min(w, h * 2);
    return { w, h, dpr, baseW, baseH: baseW / 2 };
  }, []);

  // Focus requests from search / sidebar.
  useEffect(() => {
    const f = mission.focus;
    const l = layout();
    if (!f || !l) return;
    const v = view.current;
    v.zoom = Math.max(v.zoom, 6);
    const mapW = l.baseW * v.zoom;
    const px = ((f.lon + 180) / 360) * mapW;
    const py = ((90 - f.lat) / 180) * (mapW / 2);
    v.x = l.w / 2 - px;
    v.y = l.h / 2 - py;
  }, [mission.focus?.token, layout]);

  useEffect(() => {
    let raf = 0;
    const draw = () => {
      raf = requestAnimationFrame(draw);
      const l = layout();
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!l || !canvas || !ctx) return;
      const { layers, selected, settings } = missionRef.current;
      const v = view.current;
      const mapW = l.baseW * v.zoom;
      const mapH = mapW / 2;
      // Center the map when it is smaller than the viewport.
      const ox = v.x + (l.w - l.baseW) / 2;
      const oy = v.y + (l.h - l.baseH) / 2;

      ctx.setTransform(l.dpr, 0, 0, l.dpr, 0, 0);
      ctx.clearRect(0, 0, l.w, l.h);
      ctx.fillStyle = "#05080f";
      ctx.fillRect(0, 0, l.w, l.h);

      if (imgRef.current) ctx.drawImage(imgRef.current, ox, oy, mapW, mapH);

      // Graticule
      ctx.strokeStyle = "rgba(90,170,220,0.13)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let lon = -180; lon <= 180; lon += 30) {
        const x = ox + ((lon + 180) / 360) * mapW;
        ctx.moveTo(x, oy);
        ctx.lineTo(x, oy + mapH);
      }
      for (let lat = -90; lat <= 90; lat += 30) {
        const y = oy + ((90 - lat) / 180) * mapH;
        ctx.moveTo(ox, y);
        ctx.lineTo(ox + mapW, y);
      }
      ctx.stroke();

      const t = missionTime(settings.timeScale);
      const project = (lat: number, lon: number) => ({
        x: ox + ((lon + 180) / 360) * mapW,
        y: oy + ((90 - lat) / 180) * mapH,
      });

      // Cluster links HAPS -> Drone -> GS
      if (settings.showClusterLinks) {
        ctx.strokeStyle = "rgba(77,224,192,0.35)";
        ctx.beginPath();
        for (let c = 0; c < 50; c++) {
          const chain = [
            ASSETS_BY_KIND.haps[c],
            ASSETS_BY_KIND.drone[c],
            ASSETS_BY_KIND.gs[c],
          ].filter(Boolean) as Asset[];
          chain.forEach((a, i) => {
            const g = geoAt(a, t);
            const p = project(g.lat, g.lon);
            if (i === 0) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
          });
        }
        ctx.stroke();
      }

      const hits: Array<{ id: string; x: number; y: number }> = [];
      (Object.keys(KIND_SIZE) as AssetKind[]).forEach((kind) => {
        if (!layers[kind]) return;
        ctx.fillStyle = KIND_COLOR[kind];
        const size = KIND_SIZE[kind] * Math.min(1.8, 0.9 + v.zoom * 0.08);
        for (const a of ASSETS_BY_KIND[kind]) {
          const g = geoAt(a, t);
          const p = project(g.lat, g.lon);
          if (p.x < -20 || p.x > l.w + 20 || p.y < -20 || p.y > l.h + 20) continue;
          ctx.beginPath();
          if (kind === "gs") ctx.rect(p.x - size / 2, p.y - size / 2, size, size);
          else ctx.arc(p.x, p.y, size / 2, 0, Math.PI * 2);
          ctx.fill();
          hits.push({ id: a.id, x: p.x, y: p.y });
          if (settings.showLabels && v.zoom > 5) {
            ctx.fillStyle = "rgba(220,235,245,0.75)";
            ctx.font = "9px ui-monospace, monospace";
            ctx.fillText(a.id, p.x + 5, p.y + 3);
            ctx.fillStyle = KIND_COLOR[kind];
          }
          if (a.id === selected) {
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(p.x, p.y, size * 2.2, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = "#e8f4ff";
            ctx.font = "11px ui-monospace, monospace";
            ctx.fillText(a.id, p.x + size * 2.6, p.y - size * 2);
            ctx.fillStyle = KIND_COLOR[kind];
          }
        }
      });
      hitsRef.current = hits;
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [layout]);

  // Non-passive wheel zoom anchored at the cursor.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const l = layout();
      if (!l) return;
      const rect = el.getBoundingClientRect();
      const px = e.clientX - rect.left - (l.w - l.baseW) / 2;
      const py = e.clientY - rect.top - (l.h - l.baseH) / 2;
      const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
      const v = view.current;
      const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, v.zoom * Math.exp(-dy * 0.0015)));
      const k = next / v.zoom;
      v.x = px - (px - v.x) * k;
      v.y = py - (py - v.y) * k;
      v.zoom = next;
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [layout]);

  return (
    <div
      ref={wrapRef}
      className="relative h-full w-full cursor-grab touch-none overflow-hidden bg-background active:cursor-grabbing"
      onPointerDown={(e) => {
        (e.target as Element).setPointerCapture?.(e.pointerId);
        drag.current = { x: e.clientX, y: e.clientY };
      }}
      onPointerMove={(e) => {
        if (!drag.current) return;
        view.current.x += e.clientX - drag.current.x;
        view.current.y += e.clientY - drag.current.y;
        drag.current = { x: e.clientX, y: e.clientY };
      }}
      onPointerUp={(e) => {
        const start = drag.current;
        drag.current = null;
        if (!start) return;
        const rect = wrapRef.current!.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        let best: { id: string; d: number } | null = null;
        for (const h of hitsRef.current) {
          const d = (h.x - mx) ** 2 + (h.y - my) ** 2;
          if (d < 100 && (!best || d < best.d)) best = { id: h.id, d };
        }
        mission.select(best ? best.id : null);
      }}
    >
      <canvas ref={canvasRef} className="block h-full w-full" />
      <div className="pointer-events-none absolute bottom-3 left-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        Equirectangular · WGS84 · drag to pan · scroll to zoom
      </div>
    </div>
  );
}
