import { Canvas, useFrame, useLoader, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls, Line, Html } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import earthMap from "../assets/earth-map.jpg";
import {
  ASSETS_BY_KIND,
  geoAt,
  geoToVec3,
  sceneRadius,
  type Asset,
  type AssetKind,
} from "../lib/constellation";
import { KIND_COLOR, useMission } from "../lib/mission-store";
import { missionTime } from "../lib/mission-time";

const dummy = new THREE.Object3D();
const tmp: [number, number, number] = [0, 0, 0];

function Earth() {
  const texture = useLoader(THREE.TextureLoader, earthMap);
  useEffect(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
  }, [texture]);
  return (
    <group>
      <mesh>
        <sphereGeometry args={[1, 96, 64]} />
        <meshStandardMaterial map={texture} roughness={1} metalness={0} />
      </mesh>
      {/* atmosphere shell */}
      <mesh scale={1.035}>
        <sphereGeometry args={[1, 64, 48]} />
        <meshBasicMaterial
          color="#4fa8ff"
          transparent
          opacity={0.09}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>
      <mesh scale={1.0012}>
        <sphereGeometry args={[1, 48, 32]} />
        <meshBasicMaterial color="#2b6da8" wireframe transparent opacity={0.05} />
      </mesh>
    </group>
  );
}

const GEOM: Record<AssetKind, JSX.Element> = {
  leo: <boxGeometry args={[0.012, 0.006, 0.006]} />,
  haps: <coneGeometry args={[0.007, 0.02, 6]} />,
  drone: <boxGeometry args={[0.014, 0.002, 0.005]} />,
  gs: <cylinderGeometry args={[0.004, 0.008, 0.008, 6]} />,
};

function Layer({ kind }: { kind: AssetKind }) {
  const list = ASSETS_BY_KIND[kind];
  const ref = useRef<THREE.InstancedMesh>(null);
  const { select, selected, settings } = useMission();

  useFrame(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const t = missionTime(settings.timeScale);
    for (let i = 0; i < list.length; i++) {
      const a = list[i] as Asset;
      const g = geoAt(a, t);
      const r = sceneRadius(g.altitudeKm, kind);
      geoToVec3(g.lat, g.lon, r, tmp);
      dummy.position.set(tmp[0], tmp[1], tmp[2]);
      // Orient nadir-pointing with along-track heading.
      dummy.up.set(0, 1, 0);
      dummy.lookAt(0, 0, 0);
      dummy.rotateX(Math.PI / 2);
      const s = selected === a.id ? 2.2 : 1;
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={ref}
      args={[undefined, undefined, list.length]}
      frustumCulled={false}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        const i = e.instanceId;
        if (i != null && list[i]) select(list[i].id);
      }}
    >
      {GEOM[kind]}
      <meshStandardMaterial
        color={KIND_COLOR[kind]}
        emissive={KIND_COLOR[kind]}
        emissiveIntensity={0.7}
        roughness={0.4}
      />
    </instancedMesh>
  );
}

function OrbitRings() {
  const planes = useMemo(() => {
    const seen = new Map<number, Asset>();
    for (const a of ASSETS_BY_KIND.leo) if (!seen.has(a.cluster)) seen.set(a.cluster, a);
    return [...seen.values()].filter((a): a is Extract<Asset, { kind: "leo" }> => a.kind === "leo");
  }, []);

  return (
    <group>
      {planes.map((p) => {
        const r = 1 + p.altitudeKm / 6371;
        const pts: THREE.Vector3[] = [];
        for (let i = 0; i <= 96; i++) {
          const u = (i / 96) * Math.PI * 2;
          const v = new THREE.Vector3(Math.cos(u) * r, 0, Math.sin(u) * r);
          v.applyAxisAngle(new THREE.Vector3(1, 0, 0), p.inclination);
          v.applyAxisAngle(new THREE.Vector3(0, 1, 0), p.raan);
          pts.push(v);
        }
        return (
          <Line
            key={p.cluster}
            points={pts}
            color="#2f7ea8"
            transparent
            opacity={0.22}
            lineWidth={1}
          />
        );
      })}
    </group>
  );
}

function ClusterLinks() {
  const pts = useMemo(() => {
    const out: THREE.Vector3[] = [];
    for (let c = 0; c < 50; c++) {
      const haps = ASSETS_BY_KIND.haps[c];
      const drone = ASSETS_BY_KIND.drone[c];
      const gs = ASSETS_BY_KIND.gs[c];
      if (!haps || !drone || !gs) continue;
      for (const [a, b] of [
        [haps, drone],
        [drone, gs],
      ] as const) {
        for (const n of [a, b]) {
          const g = geoAt(n, 0);
          const v = geoToVec3(g.lat, g.lon, sceneRadius(g.altitudeKm, n.kind));
          out.push(new THREE.Vector3(v[0], v[1], v[2]));
        }
      }
    }
    return out;
  }, []);
  return (
    <lineSegments frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[new Float32Array(pts.flatMap((v) => [v.x, v.y, v.z])), 3]}
        />
      </bufferGeometry>
      <lineBasicMaterial color="#4de0c0" transparent opacity={0.35} />
    </lineSegments>
  );
}

function SelectedMarker() {
  const { selected, settings } = useMission();
  const ref = useRef<THREE.Group>(null);
  const asset = useMemo(
    () =>
      selected
        ? (Object.values(ASSETS_BY_KIND).flat().find((a) => a.id === selected) ?? null)
        : null,
    [selected],
  );
  useFrame(() => {
    if (!ref.current || !asset) return;
    const t = missionTime(settings.timeScale);
    const g = geoAt(asset, t);
    const v = geoToVec3(g.lat, g.lon, sceneRadius(g.altitudeKm, asset.kind));
    ref.current.position.set(v[0], v[1], v[2]);
    ref.current.lookAt(0, 0, 0);
  });
  if (!asset) return null;
  return (
    <group ref={ref}>
      <mesh>
        <ringGeometry args={[0.028, 0.034, 32]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.85} side={THREE.DoubleSide} />
      </mesh>
      <Html distanceFactor={2.4} style={{ pointerEvents: "none" }}>
        <div className="whitespace-nowrap rounded border border-border/80 bg-card/90 px-2 py-1 font-mono text-[10px] tracking-wide text-foreground">
          {asset.id}
        </div>
      </Html>
    </group>
  );
}

function CameraFocus() {
  const { focus } = useMission();
  const controls = useRef<any>(null);
  useEffect(() => {
    if (!focus || !controls.current) return;
    const v = geoToVec3(focus.lat, focus.lon, 2.4);
    const cam = controls.current.object as THREE.Camera;
    cam.position.set(v[0], v[1], v[2]);
    controls.current.update();
  }, [focus?.token]);
  return (
    <OrbitControls
      ref={controls}
      enablePan={false}
      minDistance={1.25}
      maxDistance={6}
      rotateSpeed={0.5}
      zoomSpeed={0.7}
      enableDamping
      dampingFactor={0.08}
    />
  );
}

function Stars() {
  const positions = useMemo(() => {
    const arr = new Float32Array(1200 * 3);
    for (let i = 0; i < 1200; i++) {
      const v = new THREE.Vector3().randomDirection().multiplyScalar(30 + Math.random() * 20);
      arr.set([v.x, v.y, v.z], i * 3);
    }
    return arr;
  }, []);
  return (
    <points frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#9fc4e0" size={0.09} sizeAttenuation transparent opacity={0.7} />
    </points>
  );
}

export default function Globe3D() {
  const { layers, select, settings } = useMission();
  return (
    <Canvas
      camera={{ position: [0, 1.2, 3.2], fov: 42 }}
      dpr={[1, 1.8]}
      gl={{ antialias: true }}
      onPointerMissed={() => select(null)}
    >
      <color attach="background" args={["#05080f"]} />
      <ambientLight intensity={0.55} />
      <directionalLight position={[5, 3, 5]} intensity={1.6} />
      <directionalLight position={[-5, -2, -4]} intensity={0.25} color="#3b6ea5" />
      <Stars />
      <Suspense fallback={null}>
        <Earth />
      </Suspense>
      {settings.showOrbits && <OrbitRings />}
      {settings.showClusterLinks && <ClusterLinks />}
      {layers.leo && <Layer kind="leo" />}
      {layers.haps && <Layer kind="haps" />}
      {layers.drone && <Layer kind="drone" />}
      {layers.gs && <Layer kind="gs" />}
      <SelectedMarker />
      <CameraFocus />
    </Canvas>
  );
}
