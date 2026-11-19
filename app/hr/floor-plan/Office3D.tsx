"use client";
/* OrbitControls exposes imperative camera operations through a forwarded ref. */
/* eslint-disable react-hooks/refs */

import { Component, useEffect, useRef, type ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { zones, type Desk } from "./data";

type Props = {
  desks: Desk[];
  selected: string | null;
  hovered: string | null;
  zone: string | null;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  onZone: (id: string) => void;
  onAnchor: (point: { x: number; y: number } | null) => void;
  onFailure: () => void;
};
const point = (x: number, y: number): [number, number, number] => [
  (x - 335) / 45,
  0,
  (y - 280) / 45,
];
function Box({
  position,
  size,
  color,
  opacity = 1,
}: {
  position: [number, number, number];
  size: [number, number, number];
  color: string;
  opacity?: number;
}) {
  return (
    <mesh position={position}>
      <boxGeometry args={size} />
      <meshStandardMaterial
        color={color}
        transparent={opacity < 1}
        opacity={opacity}
      />
    </mesh>
  );
}
function Workstation({
  desk,
  active,
  hovered,
  onSelect,
  onHover,
}: {
  desk: Desk;
  active: boolean;
  hovered: boolean;
  onSelect: Props["onSelect"];
  onHover: Props["onHover"];
}) {
  const [x, , z] = point(desk.x, desk.y);
  return (
    <group
      position={[x, 0, z]}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = "pointer";
        onHover(desk.id);
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        document.body.style.cursor = "";
        onHover(null);
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(desk.id);
      }}
    >
      {(active || hovered) && (
        <Box
          position={[0, 0.025, 0]}
          size={[0.62, 0.035, 0.58]}
          color={active ? "#7c3aed" : "#c4b5fd"}
        />
      )}
      <Box position={[0, 0.31, 0]} size={[0.53, 0.055, 0.32]} color="#e5d8c5" />
      <Box
        position={[-0.21, 0.15, 0]}
        size={[0.035, 0.3, 0.25]}
        color="#b8b4b6"
      />
      <Box
        position={[0.21, 0.15, 0]}
        size={[0.035, 0.3, 0.25]}
        color="#b8b4b6"
      />
      <Box
        position={[0, 0.39, -0.09]}
        size={[0.035, 0.14, 0.035]}
        color="#777985"
      />
      <Box
        position={[0, 0.49, -0.1]}
        size={[0.25, 0.17, 0.035]}
        color="#303544"
      />
      <Box
        position={[0, 0.345, 0.06]}
        size={[0.23, 0.01, 0.075]}
        color="#b4b5bb"
      />
      <Box
        position={[0, 0.17, 0.31]}
        size={[0.19, 0.055, 0.18]}
        color="#555765"
      />
      <Box
        position={[0, 0.27, 0.39]}
        size={[0.19, 0.2, 0.045]}
        color="#666874"
      />
      <mesh position={[0.2, 0.36, -0.09]}>
        <sphereGeometry args={[0.035, 8, 6]} />
        <meshStandardMaterial color={desk.employeeId ? "#16a34a" : "#9ca3af"} />
      </mesh>
      <mesh position={[0, 0.3, 0]} visible={false}>
        <boxGeometry args={[0.65, 0.65, 0.7]} />
        <meshBasicMaterial />
      </mesh>
    </group>
  );
}
function CameraRig({
  zone,
  selected,
  desks,
  hovered,
  onAnchor,
  controlsRef,
}: {
  zone: string | null;
  selected: string | null;
  desks: Desk[];
  hovered: string | null;
  onAnchor: Props["onAnchor"];
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
}) {
  const { camera, size, invalidate } = useThree();
  const lastFocus = useRef<string | null>(null);
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    const focus = selected
      ? desks.find((d) => d.id === selected)
      : zones.find((z) => z.id === zone);
    const key = selected ? `desk:${selected}` : zone ? `zone:${zone}` : "floor";
    if (key === lastFocus.current) return;
    lastFocus.current = key;
    const x = focus
      ? "width" in focus
        ? focus.x + focus.width / 2
        : focus.x
      : 335;
    const y = focus
      ? "height" in focus
        ? focus.y + focus.height / 2
        : focus.y
      : 280;
    const [tx, , tz] = point(x, y);
    const delta = new THREE.Vector3(tx, 0, tz).sub(controls.target);
    camera.position.add(delta);
    controls.target.set(tx, 0, tz);
    controls.update();
    invalidate();
  }, [zone, selected, desks, camera, controlsRef, invalidate]);
  const last = useRef("");
  useFrame(() => {
    const d = desks.find((item) => item.id === hovered);
    if (!d) {
      if (last.current) {
        last.current = "";
        onAnchor(null);
      }
      return;
    }
    const [x, , z] = point(d.x, d.y);
    const v = new THREE.Vector3(x, 0.65, z).project(camera);
    const px = Math.round((v.x * 0.5 + 0.5) * size.width);
    const py = Math.round((-v.y * 0.5 + 0.5) * size.height);
    const key = `${px},${py}`;
    if (key !== last.current) {
      last.current = key;
      onAnchor({ x: px, y: py });
    }
  });
  return null;
}
function Scene(
  props: Props & { controlsRef: React.RefObject<OrbitControlsImpl | null> },
) {
  return (
    <>
      <color attach="background" args={["#f4f3f8"]} />
      <ambientLight intensity={1.7} />
      <directionalLight position={[5, 12, 7]} intensity={2.3} />
      <Box
        position={[0, -0.12, 0]}
        size={[14.9, 0.24, 12.45]}
        color="#d6d3dc"
      />
      {zones.map((z) => {
        const [x, , y] = point(z.x + z.width / 2, z.y + z.height / 2);
        return (
          <group key={z.id}>
            <mesh
              position={[x, 0.015, y]}
              onClick={(e) => {
                e.stopPropagation();
                props.onZone(z.id);
              }}
            >
              <boxGeometry args={[z.width / 45, 0.035, z.height / 45]} />
              <meshStandardMaterial
                color={z.color}
                transparent
                opacity={props.zone && props.zone !== z.id ? 0.45 : 1}
              />
            </mesh>
            <Box
              position={[x, 0.28, y - z.height / 90]}
              size={[z.width / 45, 0.55, 0.06]}
              color={props.zone === z.id ? "#aa8ad7" : "#cfc7dc"}
            />
          </group>
        );
      })}
      <Box position={[0, 0.5, -6.2]} size={[14.9, 1, 0.1]} color="#e7e3e6" />
      <Box position={[-7.43, 0.5, 0]} size={[0.1, 1, 12.4]} color="#e7e3e6" />
      <Box position={[-4.7, 0.3, 4.8]} size={[2, 0.12, 0.7]} color="#dbc8af" />
      <Box
        position={[-4.7, 0.15, 4.8]}
        size={[0.14, 0.3, 0.5]}
        color="#a7a2a6"
      />
      <Box
        position={[1.1, 0.4, 4.75]}
        size={[1.6, 0.8, 0.45]}
        color="#d6c2ad"
      />
      <Box
        position={[1.1, 0.83, 4.75]}
        size={[1.8, 0.08, 0.6]}
        color="#f2e7d6"
      />
      {[
        [-6.6, -5.1],
        [6.6, -5.1],
        [-6.5, 5.4],
        [6.6, 5.4],
      ].map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 0.15, 0]}>
            <cylinderGeometry args={[0.12, 0.09, 0.3, 8]} />
            <meshStandardMaterial color="#ded9cf" />
          </mesh>
          <mesh position={[0, 0.42, 0]}>
            <dodecahedronGeometry args={[0.24, 0]} />
            <meshStandardMaterial color="#6b9f72" />
          </mesh>
        </group>
      ))}
      {props.desks.map((d) => (
        <Workstation
          key={d.id}
          desk={d}
          active={d.id === props.selected}
          hovered={d.id === props.hovered}
          onSelect={props.onSelect}
          onHover={props.onHover}
        />
      ))}
      <OrbitControls
        ref={props.controlsRef}
        makeDefault
        enableDamping={false}
        minPolarAngle={Math.PI / 5}
        maxPolarAngle={Math.PI / 2.35}
        minAzimuthAngle={-Math.PI / 2}
        maxAzimuthAngle={Math.PI / 2}
        minZoom={25}
        maxZoom={130}
      />
      <CameraRig {...props} />
    </>
  );
}
class SceneBoundary extends Component<
  { onFailure: () => void; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onFailure();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}
export default function Office3D(props: Props) {
  const controls = useRef<OrbitControlsImpl | null>(null);
  return (
    <div
      className="relative h-[560px] w-full overflow-hidden rounded-xl bg-[#f4f3f8]"
      onPointerLeave={() => props.onHover(null)}
    >
      <SceneBoundary onFailure={props.onFailure}>
        <Canvas
          orthographic
          camera={{ position: [15, 18, 18], zoom: 38, near: 0.1, far: 100 }}
          dpr={[1, 1.5]}
          frameloop="demand"
          fallback={<div>WebGL is unavailable. Please use the 2D view.</div>}
          onCreated={({ gl }) => {
            gl.domElement.addEventListener(
              "webglcontextlost",
              props.onFailure,
              { once: true },
            );
          }}
        >
          <Scene {...props} controlsRef={controls} />
        </Canvas>
      </SceneBoundary>
      <div className="absolute bottom-3 right-3 flex gap-1 rounded-lg bg-white p-1 text-xs shadow-md">
        {[
          ["+", 1.2],
          ["−", 1 / 1.2],
        ].map(([label, factor]) => (
          <button
            key={label}
            className="rounded px-3 py-2 text-violet-700 hover:bg-violet-50"
            aria-label={label === "+" ? "Zoom in" : "Zoom out"}
            onClick={() => {
              const c = controls.current;
              if (!c) return;
              c.object.zoom = Math.max(
                25,
                Math.min(130, c.object.zoom * Number(factor)),
              );
              c.object.updateProjectionMatrix();
              c.update();
            }}
          >
            {label}
          </button>
        ))}
        <button
          className="rounded px-3 py-2 text-violet-700 hover:bg-violet-50"
          onClick={() => controls.current?.reset()}
        >
          Fit floor
        </button>
      </div>
    </div>
  );
}
