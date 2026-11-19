"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
const Office3D = dynamic(() => import("./Office3D"), { ssr: false, loading: () => <div className="p-8 text-sm">Loading 3D office?</div> });
import {
  LuMapPinned,
  LuMap,
  LuList,
  LuExpand,
  LuX,
  LuMonitor,
  LuLaptop,
  LuUsersRound,
  LuFolder,
  LuPlus,
  LuMinus,
  LuRotateCcw,
  LuChevronRight,
  LuSearch,
  LuCircle,
  LuArrowRightLeft,
  LuUserRoundMinus,
  LuEllipsis,
} from "react-icons/lu";
import {
  assets,
  employees,
  initialDesks,
  zones,
  type Desk,
  type Asset,
} from "./data";

const card =
  "rounded-2xl border border-[#e7e3f3] bg-white shadow-[0_4px_14px_rgba(73,45,130,.08)]";
const button =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-[#ddd5ee] bg-white px-3 py-2 text-xs font-semibold text-[#7134ca] hover:bg-violet-50 focus-visible:outline-2 focus-visible:outline-violet-600";
const pct = (n: number, total: number) =>
  total ? `${((n / total) * 100).toFixed(1)}%` : "0.0%";
function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      className="m-auto max-h-[90dvh] w-[min(94vw,480px)] overflow-y-auto rounded-2xl bg-white p-0 text-[#17152D] shadow-2xl backdrop:bg-[#17152D]/50"
    >
      <div className="p-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-bold">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded p-1 hover:bg-violet-50"
          >
            <LuX />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
export default function FloorPlanClient() {
  const [desks, setDesks] = useState<Desk[]>(initialDesks);
  const [selected, setSelected] = useState<string | null>("D-308");
  const [zone, setZone] = useState<string | null>(null);
  const [mode, setMode] = useState<"map" | "3d" | "list">("map");
  const [expanded, setExpanded] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(
    null,
  );
  const [modal, setModal] = useState<
    "assign" | "release" | "employee" | "asset" | null
  >(null);
  const [asset, setAsset] = useState<Asset | null>(null);
  const [candidate, setCandidate] = useState("");
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [query, setQuery] = useState("");
  const [hovered, setHovered] = useState<string | null>(null);
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const [spatialMode, setSpatialMode] = useState<"map" | "3d">("map");
  const [webglError, setWebglError] = useState(false);
  const positionAnchor = (p: { x: number; y: number } | null) => {
    const container = mapRef.current;
    if (!p || !container) { setAnchor(null); return; }
    const width = Math.min(256, container.clientWidth - 16);
    const x = p.x + 14 + width <= container.clientWidth - 8 ? p.x + 14 : p.x - width - 14;
    const y = p.y - 145 >= 8 ? p.y - 145 : p.y + 14;
    setAnchor({ x: Math.max(8, Math.min(container.clientWidth - width - 8, x)), y: Math.max(8, Math.min(container.clientHeight - 155, y)) });
  };
  const update2dAnchor = () => {
    const container = mapRef.current;
    const target = container?.querySelector<SVGGElement>(`[data-desk="${hovered}"]`);
    if (!container || !target) return;
    const a = target.getBoundingClientRect(); const b = container.getBoundingClientRect();
    positionAnchor({ x: a.left + a.width / 2 - b.left, y: a.top + a.height / 2 - b.top });
  };
  useEffect(() => {
    if (mode !== "map" || !hovered) return;
    const id = requestAnimationFrame(update2dAnchor);
    const observer = new ResizeObserver(update2dAnchor);
    if (mapRef.current) observer.observe(mapRef.current);
    return () => { cancelAnimationFrame(id); observer.disconnect(); };
  // Position depends on the selected SVG desk and the current map transform.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hovered, zoom, pan, mode]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [deskType, setDeskType] = useState("all");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("id");
  const [toast, setToast] = useState("");
  const desk = desks.find((d) => d.id === selected);
  const employee = employees.find((e) => e.id === desk?.employeeId);
  const assignedAssets = assets.filter(
    (a) => a.employeeId === desk?.employeeId,
  );
  const occupied = desks.filter((d) => d.employeeId).length;
  const selectedZone = zones.find((z) => z.id === zone);
  const zoneDesks = desks.filter((d) => d.zoneId === zone);
  const eligible = employees.filter(
    (e) =>
      !desks.some((d) => d.employeeId === e.id && d.id !== desk?.id) &&
      e.id !== desk?.employeeId &&
      `${e.name} ${e.id}`.toLowerCase().includes(employeeSearch.toLowerCase()),
  );
  const filtered = useMemo(
    () =>
      desks
        .filter((d) => {
          const e = employees.find((x) => x.id === d.employeeId);
          const z = zones.find((x) => x.id === d.zoneId);
          return (
            (!zone || d.zoneId === zone) &&
            (deskType === "all" || d.type === deskType) &&
            (status === "all" ||
              (status === "occupied" ? !!d.employeeId : !d.employeeId)) &&
            `${d.id} ${e?.name || ""} ${z?.name || ""} ${assets
              .filter((a) => a.employeeId === d.employeeId)
              .map((a) => a.id)
              .join(" ")}`
              .toLowerCase()
              .includes(query.toLowerCase())
          );
        })
        .sort((a, b) =>
          sort === "zone"
            ? a.zoneId.localeCompare(b.zoneId)
            : a.id.localeCompare(b.id, undefined, { numeric: true }),
        ),
    [desks, query, status, zone, sort, deskType],
  );
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const previewDesk = desks.find((d) => d.id === hovered);
  const previewEmployee = employees.find((e) => e.id === previewDesk?.employeeId);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(timer);
  }, [toast]);
  const chooseZone = (id: string) => {
    setZone(id);
    setSelected(null);
    const z = zones.find((x) => x.id === id)!;
    setZoom(1.35);
    setPan({
      x: (335 - (z.x + z.width / 2)) * 0.35,
      y: (280 - (z.y + z.height / 2)) * 0.35,
    });
  };
  const reset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setZone(null);
  };
  const openAssign = () => {
    setCandidate("");
    setEmployeeSearch("");
    setModal("assign");
  };
  const save = () => {
    if (
      !desk ||
      !candidate ||
      !employees.some((e) => e.id === candidate) ||
      desks.some((d) => d.id !== desk.id && d.employeeId === candidate)
    )
      return;
    const wasOccupied = !!desk.employeeId;
    setDesks((current) =>
      current.map((d) =>
        d.id === desk.id ? { ...d, employeeId: candidate } : d,
      ),
    );
    setModal(null);
    setToast(
      wasOccupied
        ? "Desk Reassigned — Desk assignment updated in this demo."
        : "Desk Assigned — Employee assigned successfully in this demo.",
    );
  };
  const release = () => {
    if (!desk?.employeeId) return;
    setDesks((current) =>
      current.map((d) => (d.id === desk.id ? { ...d, employeeId: null } : d)),
    );
    setModal(null);
    setToast("Desk Released — Desk is now available.");
  };
  const workspace = (
    <div
      className={`grid min-w-0 gap-3 ${expanded ? "xl:grid-cols-[190px_minmax(0,1fr)_300px]" : "xl:grid-cols-[190px_minmax(0,1fr)_300px]"}`}
    >
      <aside className="grid gap-3 sm:grid-cols-2 xl:block xl:space-y-3">
        <section className={`${card} p-4`}>
          <h2 className="text-sm font-bold">Floor Overview</h2>
          {[
            [
              <LuMonitor key="d" />,
              "Total Desks",
              desks.length,
              "bg-violet-100 text-violet-600",
            ],
            [
              <span key="o" className="h-4 w-4 rounded-full bg-green-500" />,
              "Occupied",
              `${occupied} (${pct(occupied, desks.length)})`,
              "bg-green-100 text-green-600",
            ],
            [
              <LuCircle key="a" />,
              "Available",
              `${desks.length - occupied} (${pct(desks.length - occupied, desks.length)})`,
              "bg-slate-100 text-slate-400",
            ],
          ].map(([icon, label, value, color]) => (
            <div
              key={String(label)}
              className="flex items-center gap-3 border-b border-[#f0edf7] py-3 last:border-0"
            >
              <div
                className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${color}`}
              >
                {icon}
              </div>
              <div>
                <div className="text-[11px] text-[#73718A]">{label}</div>
                <div className="text-sm font-bold">{value}</div>
              </div>
            </div>
          ))}
        </section>
        <section className={`${card} p-4`}>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold">Zones</h2>
            {zone && (
              <button onClick={reset} className="text-[10px] text-violet-600">
                Clear
              </button>
            )}
          </div>
          <div className="mt-2 max-h-80 overflow-y-auto [scrollbar-width:thin]">
            {zones.map((z) => {
              const zd = desks.filter((d) => d.zoneId === z.id);
              return (
                <button
                  key={z.id}
                  onClick={() => chooseZone(z.id)}
                  className={`flex w-full items-center gap-2 rounded-lg px-1 py-2 text-left text-xs hover:bg-violet-50 ${zone === z.id ? "bg-violet-50" : ""}`}
                >
                  <span
                    className="grid h-6 w-6 place-items-center rounded-md"
                    style={{ background: z.color, color: z.accent }}
                  >
                    <LuFolder />
                  </span>
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {z.name}
                  </span>
                  <span className="font-semibold">
                    {zd.filter((d) => d.employeeId).length} / {zd.length}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      </aside>
      <div className="min-w-0 space-y-3">
        {mode !== "list" ? (
          <>
            <div ref={mapRef} className={`${card} relative overflow-hidden p-2`}>
              {webglError && <p role="status" className="p-2 text-xs text-amber-700">3D is unavailable on this device. Showing the 2D map.</p>}
              {mode === "3d" ? <Office3D desks={desks} selected={selected} hovered={hovered} zone={zone} onSelect={setSelected} onHover={setHovered} onZone={chooseZone} onAnchor={(p) => positionAnchor(p ? { x: p.x + 8, y: p.y + 8 } : null)} onFailure={() => { setWebglError(true); setMode("map"); }} /> : <>
              <div
                className="overflow-hidden rounded-xl bg-[#fafaff]"
                style={{ touchAction: "none" }}
                onPointerDown={(e) => {
                  if ((e.target as Element).closest("[data-interactive]"))
                    return;
                  drag.current = {
                    x: e.clientX,
                    y: e.clientY,
                    px: pan.x,
                    py: pan.y,
                  };
                  e.currentTarget.setPointerCapture(e.pointerId);
                }}
                onPointerMove={(e) => {
                  if (drag.current) {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setPan({
                      x: Math.max(
                        -250,
                        Math.min(
                          250,
                          drag.current.px +
                            ((e.clientX - drag.current.x) * 670) / rect.width,
                        ),
                      ),
                      y: Math.max(
                        -220,
                        Math.min(
                          220,
                          drag.current.py +
                            ((e.clientY - drag.current.y) * 560) / rect.height,
                        ),
                      ),
                    });
                  }
                }}
                onPointerUp={() => {
                  drag.current = null;
                }}
              >
                <svg
                  viewBox="0 0 670 560"
                  className="block w-full min-w-0"
                  role="img"
                  aria-label="Interactive office floor plan. Drag to pan."
                >
                  <g
                    transform={`translate(${pan.x} ${pan.y}) translate(335 280) scale(${zoom}) translate(-335 -280)`}
                  >
                    <rect
                      x="7"
                      y="7"
                      width="656"
                      height="546"
                      rx="6"
                      fill="#fff"
                      stroke="#a9aec3"
                      strokeWidth="8"
                    />
                    {zones.map((z) => (
                      <g key={z.id} opacity={zone && zone !== z.id ? 0.45 : 1}>
                        <rect
                          data-interactive="true"
                          x={z.x}
                          y={z.y}
                          width={z.width}
                          height={z.height}
                          rx="7"
                          fill={z.color}
                          stroke={zone === z.id ? "#7c3aed" : "#c9c9db"}
                          strokeWidth={zone === z.id ? 3 : 1.5}
                          onClick={() => chooseZone(z.id)}
                          className="cursor-pointer"
                        />
                        <text
                          data-interactive="true"
                          x={z.x + z.width / 2}
                          y={z.y + 22}
                          textAnchor="middle"
                          fontSize="12"
                          fontWeight="700"
                          fill="#27243b"
                          onClick={() => chooseZone(z.id)}
                          className="cursor-pointer"
                        >
                          {z.name}
                        </text>
                        <text
                          x={z.x + z.width / 2}
                          y={z.y + 38}
                          textAnchor="middle"
                          fontSize="10"
                          fill="#55516a"
                        >
                          ({z.capacity} Desks)
                        </text>
                      </g>
                    ))}
                    <path
                      d="M 195 10 V 150 M 235 205 H 285 M 275 210 V 430 M 520 205 V 410 M 15 440 H 240 V 545 M 285 480 H 510 V 545"
                      fill="none"
                      stroke="#a9aec3"
                      strokeWidth="5"
                    />
                    <rect
                      x="30"
                      y="463"
                      width="185"
                      height="70"
                      rx="5"
                      fill="#edf1fa"
                      stroke="#afb6ca"
                      strokeWidth="3"
                    />
                    <text
                      x="122"
                      y="495"
                      textAnchor="middle"
                      fontSize="12"
                      fontWeight="700"
                    >
                      Meeting Rooms
                    </text>
                    <rect
                      x="85"
                      y="505"
                      width="75"
                      height="14"
                      rx="7"
                      fill="#d5c5f5"
                    />
                    <text
                      x="385"
                      y="475"
                      textAnchor="middle"
                      fontSize="12"
                      fontWeight="700"
                    >
                      Reception
                    </text>
                    <rect
                      x="355"
                      y="487"
                      width="65"
                      height="20"
                      rx="5"
                      fill="#e9e0fa"
                      stroke="#d7c9ed"
                    />
                    {[
                      [25, 190],
                      [215, 42],
                      [255, 380],
                      [635, 192],
                      [625, 530],
                    ].map(([x, y], i) => (
                      <g key={i}>
                        <circle cx={x} cy={y} r="12" fill="#76bd5c" />
                        <circle cx={x - 6} cy={y - 4} r="7" fill="#80ca64" />
                        <circle cx={x + 6} cy={y + 2} r="7" fill="#69b750" />
                      </g>
                    ))}
                    {desks.map((d) => {
                      const z = zones.find((x) => x.id === d.zoneId)!;
                      return (
                        <g
                          key={d.id}
                          data-interactive="true"
                          data-desk={d.id}
                          role="button"
                          tabIndex={0}
                          aria-label={`Desk ${d.id}, ${d.employeeId ? "occupied" : "available"}, ${z.name}`}
                          aria-pressed={selected === d.id}
                          onPointerEnter={() => setHovered(d.id)}
                          onPointerLeave={() => setHovered(null)}
                          onFocus={() => setHovered(d.id)}
                          onBlur={() => setHovered(null)}
                          onClick={() => setSelected(d.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setSelected(d.id);
                            }
                          }}
                          className="cursor-pointer"
                        >
                          <title>{`${d.id} — ${d.employeeId ? "Occupied" : "Available"}`}</title>
                          <rect x={d.x - 9} y={d.y - 5} width="18" height="10" rx="2" fill="#fff" stroke="#aaa3bd" />
                          <rect x={d.x - 5} y={d.y - 9} width="10" height="6" rx="1" fill="#514f69" stroke="#fff" strokeWidth=".6" />
                          <path d={`M${d.x - 3} ${d.y + 8}h6`} stroke="#77718d" strokeWidth="3" strokeLinecap="round" />
                          <circle cx={d.x + 7} cy={d.y - 7} r="2.5" fill={d.employeeId ? "#16a34a" : "#9ca3af"} stroke="white" />
                          {selected === d.id && (
                            <circle
                              cx={d.x}
                              cy={d.y}
                              r="10"
                              fill="none"
                              stroke="#8b27e8"
                              strokeWidth="3"
                            />
                          )}
                        </g>
                      );
                    })}
                  </g>
                </svg>
              </div>
              <div className="absolute bottom-4 right-4 flex gap-1 rounded-lg border border-violet-100 bg-white p-1 shadow-md">
                {([
                  [
                    <LuPlus key="plus" />,
                    () => setZoom((v) => Math.min(2.5, v + 0.25)),
                    "Zoom in",
                  ],
                  [
                    <LuMinus key="minus" />,
                    () => setZoom((v) => Math.max(1, v - 0.25)),
                    "Zoom out",
                  ],
                  [<LuRotateCcw key="reset" />, reset, "Reset view"],
                ] as [React.ReactNode, () => void, string][]).map(
                  ([icon, fn, label]) => (
                  <button
                    key={String(label)}
                    onClick={fn as () => void}
                    aria-label={String(label)}
                    className="rounded p-2 text-violet-700 hover:bg-violet-50"
                  >
                    {icon}
                  </button>
                  ),
                )}
              </div>
              </>}
              {previewDesk && anchor && (
                <div style={{ left: anchor.x, top: anchor.y, maxWidth: "calc(100% - 16px)" }} className="pointer-events-none absolute z-10 w-64 rounded-xl border border-violet-200 bg-white p-4 text-xs shadow-xl" role="status">
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-violet-100 font-bold text-violet-700">{previewEmployee ? previewEmployee.name.split(" ").map((n) => n[0]).slice(0, 2).join("") : <LuMonitor />}</span>
                    <div><b className="block text-sm">{previewEmployee?.name || `Desk ${previewDesk.id}`}</b><span className="text-[#73718A]">{previewEmployee ? `${previewEmployee.id} ? ${previewEmployee.role}` : "Available workstation"}</span></div>
                  </div>
                  <p className="mt-3 text-[#73718A]">{zones.find((z) => z.id === previewDesk.zoneId)?.name} ? Floor 3 ? {previewDesk.id}</p>
                  <p className="mt-2 font-semibold">{previewEmployee ? `Devices: ${assets.filter((a) => a.employeeId === previewEmployee.id).map((a) => a.type).join(", ") || "None"}` : "Available ? Select to assign"}</p>
                </div>
              )}
            </div>
            <div
              className={`${card} flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3 text-[11px] font-medium`}
            >
              <b>Legend</b>
              <span>? Occupied</span>
              <span>? Available</span>
              <span className="text-violet-700">? Selected Desk</span>
              <span>
                <LuMonitor className="inline" /> Device Assigned
              </span>
              <span>? Zone Boundary</span>
            </div>
          </>
        ) : (
          <section className={`${card} p-4`}>
            <h2 className="text-base font-bold">Floor Workspace Directory</h2>
            <p className="mb-4 mt-1 text-xs text-[#73718A]">Browse desks, assignments and devices across this floor.</p>
            <div className="mb-4 flex flex-wrap gap-2">
              <label className="relative min-w-[180px] flex-1">
                <LuSearch className="absolute left-3 top-3 text-slate-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search desk, employee or asset"
                  className="w-full rounded-lg border border-violet-100 py-2 pl-9 pr-3 text-xs"
                />
              </label>
              <select aria-label="Filter zone" value={zone || "all"} onChange={(e) => { setZone(e.target.value === "all" ? null : e.target.value); setPage(1); }} className="rounded-lg border border-violet-100 p-2 text-xs"><option value="all">All zones</option>{zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}</select>
              <select aria-label="Filter desk type" value={deskType} onChange={(e) => { setDeskType(e.target.value); setPage(1); }} className="rounded-lg border border-violet-100 p-2 text-xs"><option value="all">All desk types</option>{Array.from(new Set(desks.map((d) => d.type))).map((type) => <option key={type}>{type}</option>)}</select>
              <button className={button} onClick={() => { setQuery(""); setZone(null); setStatus("all"); setDeskType("all"); setPage(1); }}>Clear filters</button>
              <select
                aria-label="Filter occupancy"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="rounded-lg border border-violet-100 p-2 text-xs"
              >
                <option value="all">All statuses</option>
                <option value="occupied">Occupied</option>
                <option value="available">Available</option>
              </select>
              <select
                aria-label="Sort desks"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="rounded-lg border border-violet-100 p-2 text-xs"
              >
                <option value="id">Sort by desk</option>
                <option value="zone">Sort by zone</option>
              </select>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-xs">
                <thead className="bg-violet-50 text-[#73718A]">
                  <tr>
                    {[
                      "Desk ID",
                      "Zone",
                      "Assigned Employee",
                      "Employee Position",
                      "Assigned Devices",
                      "Occupancy",
                      "Actions",
                    ].map((h) => (
                      <th key={h} className="p-3">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((d) => (
                    <tr key={d.id} className={`border-b border-violet-50 ${selected === d.id ? "bg-violet-50" : ""}`}>
                      <td className="p-3 font-semibold">{d.id}</td>
                      <td>{zones.find((z) => z.id === d.zoneId)?.name}</td>
                      <td className="py-3">{(() => { const person = employees.find((e) => e.id === d.employeeId); return person ? <div className="flex items-center gap-2"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-violet-100 font-bold text-violet-700">{person.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}</span><span><b className="block">{person.name}</b><span className="text-[#73718A]">{person.id}</span></span></div> : <span className="text-[#73718A]">Unassigned</span>; })()}</td>
                      <td>{employees.find((e) => e.id === d.employeeId)?.role || "?"}</td>
                      <td>{assets.filter((a) => d.employeeId && a.employeeId === d.employeeId).map((a) => <span key={a.id} className="mr-1 inline-block rounded-md bg-violet-50 px-2 py-1 text-violet-700">{a.type}</span>)}</td>
                      <td><span className={`rounded-full px-2 py-1 font-semibold ${d.employeeId ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"}`}>{d.employeeId ? "Occupied" : "Available"}</span></td>
                      <td>
                        <button
                          onClick={() => { setSelected(d.id); setMode(spatialMode); setZone(d.zoneId); setZoom(1.5); setPan({ x: (335 - d.x) * 0.5, y: (280 - d.y) * 0.5 }); }}
                          className="font-semibold text-violet-700"
                        >
                          View on map
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-[#73718A]">
              <span>{filtered.length} desks ? Page {currentPage} of {pageCount}</span>
              <div className="flex items-center gap-2"><label>Rows <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} className="rounded border border-violet-100 p-1">{[10, 25, 50].map((n) => <option key={n}>{n}</option>)}</select></label><button className={button} disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Previous</button><button className={button} disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}>Next</button></div>
            </div>
          </section>
        )}
      </div>
      <aside className={`${card} min-w-0 p-4 xl:max-h-[760px] xl:overflow-y-auto ${desk ? "fixed inset-x-2 bottom-2 z-40 max-h-[55dvh] overflow-y-auto shadow-2xl sm:static sm:max-h-none sm:shadow-none xl:max-h-[760px]" : "min-h-48"}`}>
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-bold">
            {desk
              ? `Desk ${desk.id}`
              : selectedZone
                ? selectedZone.name
                : "Desk Details"}
          </h2>
          {desk && (
            <>
              <span
                className={`rounded-full px-2 py-1 text-[10px] font-semibold ${desk.employeeId ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"}`}
              >
                ? {desk.employeeId ? "Occupied" : "Available"}
              </span>
              <button
                onClick={() => setSelected(null)}
                aria-label="Close desk details"
              >
                <LuX />
              </button>
            </>
          )}
        </div>
        {desk ? (
          <>
            <div className="mt-4 border-t border-[#eeeaf5] pt-4">
              <h3 className="text-xs font-bold">Assigned Employee</h3>
              {employee ? (
                <button
                  onClick={() => setModal("employee")}
                  className="mt-3 flex w-full items-center gap-3 text-left"
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-100 text-violet-600">
                    <LuUsersRound size={20} />
                  </span>
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#f5dedb] text-xs font-bold text-[#915d62]">
                    {employee.name
                      .split(" ")
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("")}
                  </span>
                  <span className="min-w-0 flex-1">
                    <b className="block truncate text-xs">{employee.name}</b>
                    <span className="text-[10px] text-[#73718A]">
                      {employee.id} | {employee.role}
                    </span>
                  </span>
                  <LuChevronRight />
                </button>
              ) : (
                <p className="mt-3 text-xs text-[#73718A]">
                  No employee assigned.
                </p>
              )}
            </div>
            <div className="mt-4 border-t border-[#eeeaf5] pt-4">
              <h3 className="text-xs font-bold">Assigned Devices</h3>
              {assignedAssets.length ? (
                assignedAssets.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => {
                      setAsset(a);
                      setModal("asset");
                    }}
                    className="mt-3 flex w-full items-center gap-3 text-left"
                  >
                    <span className="grid h-9 w-9 place-items-center rounded-lg bg-violet-100 text-violet-600">
                      {a.type === "Laptop" ? <LuLaptop /> : <LuMonitor />}
                    </span>
                    <span className="flex-1">
                      <b className="block text-xs">
                        {a.type} ({a.id})
                      </b>
                      <span className="text-[10px] text-[#73718A]">
                        Last seen: {a.lastSeen}
                      </span>
                    </span>
                    <LuChevronRight />
                  </button>
                ))
              ) : (
                <p className="mt-3 text-xs text-[#73718A]">
                  No devices assigned to this workstation.
                </p>
              )}
            </div>
            <div className="mt-4 border-t border-[#eeeaf5] pt-4">
              <h3 className="mb-2 text-xs font-bold">Desk Details</h3>
              {[
                ["Zone", zones.find((z) => z.id === desk.zoneId)?.name],
                ["Floor", "3"],
                ["Desk Type", desk.type],
                ["Status", desk.employeeId ? "Occupied" : "Available"],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex justify-between border-b border-[#f0edf7] py-2 text-xs"
                >
                  <span className="text-[#73718A]">{label}</span>
                  <span className="font-semibold">{value}</span>
                </div>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <button onClick={openAssign} className={`${button} flex-1`}>
                <LuArrowRightLeft />
                {desk.employeeId ? "Reassign" : "Assign Employee"}
              </button>
              {desk.employeeId && (
                <button
                  onClick={() => setModal("release")}
                  className={`${button} flex-1`}
                >
                  <LuUserRoundMinus />
                  Release Desk
                </button>
              )}
              <button
                onClick={() =>
                  setToast(
                    "Select Reassign or Release Desk to manage this workstation.",
                  )
                }
                aria-label="More actions"
                className={button}
              >
                <LuEllipsis />
              </button>
            </div>
          </>
        ) : selectedZone ? (
          <div className="mt-4 border-t border-violet-50 pt-4">
            <p className="text-xs text-[#73718A]">
              {zoneDesks.length} desks ·{" "}
              {zoneDesks.filter((d) => d.employeeId).length} occupied ·{" "}
              {zoneDesks.filter((d) => !d.employeeId).length} available
            </p>
            <p className="mt-1 text-xs font-semibold">
              {pct(
                zoneDesks.filter((d) => d.employeeId).length,
                zoneDesks.length,
              )}{" "}
              occupied
            </p>
            <h3 className="mt-4 text-xs font-bold">Assigned employees</h3>
            <div className="mt-2 max-h-80 overflow-y-auto">
              {zoneDesks
                .filter((d) => d.employeeId)
                .map((d) => (
                  <button
                    key={d.id}
                    onClick={() => { setSelected(d.id); setZoom(1.5); setPan({ x: (335 - d.x) * 0.5, y: (280 - d.y) * 0.5 }); }}
                    className="flex w-full justify-between border-b border-violet-50 py-2 text-left text-xs hover:text-violet-700"
                  >
                    <span>
                      {employees.find((e) => e.id === d.employeeId)?.name}
                    </span>
                    <span>{d.id} ›</span>
                  </button>
                ))}
            </div>
          </div>
        ) : (
          <p className="mt-5 text-xs text-[#73718A]">
            Select a desk to view assignments.
          </p>
        )}
      </aside>
    </div>
  );
  return (
    <div className="mx-auto max-w-[1800px] space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[#f0e2ff] text-violet-600">
            <LuMapPinned size={29} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Interactive Floor Plan
            </h1>
            <p className="mt-1 text-xs text-[#73718A]">
              View office layout, desk occupancy, and manage employee and device
              assignments in this interactive demo.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Select floor"
            className="h-10 rounded-lg border border-[#ddd5ee] bg-white px-3 text-xs font-semibold"
          >
            <option>Headquarters – Floor 3</option>
          </select>
          <div className="flex rounded-lg border border-[#ddd5ee] bg-white p-1">
            <button
              onClick={() => { setHovered(null); setMode("map"); setSpatialMode("map"); }}
              className={`flex items-center gap-2 rounded-md px-3 py-2 text-xs font-semibold ${mode === "map" ? "bg-violet-600 text-white" : "text-[#58536d]"}`}
            >
              <LuMap />
              2D
            </button>
            <button onClick={() => { setHovered(null); const canvas = document.createElement("canvas"); if (!canvas.getContext("webgl2") && !canvas.getContext("webgl")) { setWebglError(true); setMode("map"); return; } setMode("3d"); setSpatialMode("3d"); setWebglError(false); }} className={`flex items-center gap-2 rounded-md px-3 py-2 text-xs font-semibold ${mode === "3d" ? "bg-violet-600 text-white" : "text-[#58536d]"}`}><LuMonitor /> 3D</button>
            <button
              onClick={() => { setHovered(null); setMode("list"); }}
              className={`flex items-center gap-2 rounded-md px-3 py-2 text-xs font-semibold ${mode === "list" ? "bg-violet-600 text-white" : "text-[#58536d]"}`}
            >
              <LuList />
              List
            </button>
          </div>
          <button
            onClick={() => setExpanded(true)}
            aria-label="Expand floor plan"
            className={`${button} h-10`}
          >
            <LuExpand size={17} />
          </button>
        </div>
      </div>
      {expanded ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#f7f6ff] p-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-bold">Interactive Floor Plan</h2>
              <p className="text-xs text-[#73718A]">
                Headquarters – Floor 3 · Interactive Demo
              </p>
            </div>
            <div className="flex gap-2">
              <button
                className={button}
                onClick={() => setMode(mode === "list" ? spatialMode : "list")}
              >
                {mode === "list" ? "Map" : "List"}
              </button>
              <button className={button} onClick={() => setExpanded(false)}>
                <LuX /> Exit fullscreen
              </button>
            </div>
          </div>
          {workspace}
        </div>
      ) : (
        workspace
      )}
      {toast && (
        <div
          role="status"
          className="fixed right-5 top-20 z-[70] max-w-sm rounded-xl border border-violet-100 bg-white p-4 text-sm shadow-xl"
        >
          {toast}
        </div>
      )}
      {modal === "assign" && desk && (
        <Modal
          title={desk.employeeId ? "Reassign Desk" : "Assign Employee"}
          onClose={() => setModal(null)}
        >
          <p className="mt-2 text-sm text-[#73718A]">
            Assign this workstation to another employee. Changes are local to
            this demo.
          </p>
          <p className="mt-4 rounded-lg bg-violet-50 p-3 text-xs">
            {desk.id} · {zones.find((z) => z.id === desk.zoneId)?.name}
            <br />
            Current employee: {employee?.name || "None"}
          </p>
          <label className="mt-4 block text-xs font-semibold">
            Search employees
            <input
              value={employeeSearch}
              onChange={(e) => setEmployeeSearch(e.target.value)}
              placeholder="Search by name or ID"
              className="mt-2 w-full rounded-lg border border-violet-200 p-3 font-normal"
            />
          </label>
          <label className="mt-3 block text-xs font-semibold">
            Select Employee
            <select
              value={candidate}
              onChange={(e) => setCandidate(e.target.value)}
              className="mt-2 w-full rounded-lg border border-violet-200 p-3 font-normal"
            >
              <option value="">Choose an eligible employee</option>
              {eligible.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} ({e.id})
                </option>
              ))}
            </select>
          </label>
          <div className="mt-6 flex justify-end gap-2">
            <button className={button} onClick={() => setModal(null)}>
              Cancel
            </button>
            <button
              disabled={!candidate}
              onClick={save}
              className="rounded-lg bg-violet-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-40"
            >
              Confirm {desk.employeeId ? "Reassignment" : "Assignment"}
            </button>
          </div>
        </Modal>
      )}
      {modal === "release" && desk && (
        <Modal
          title={`Release Desk ${desk.id}?`}
          onClose={() => setModal(null)}
        >
          <p className="mt-2 text-sm text-[#73718A]">
            This will remove the employee’s current desk assignment in the demo.
            Employee-issued devices remain assigned to the employee.
          </p>
          <div className="mt-4 space-y-2 rounded-lg bg-violet-50 p-3 text-xs">
            <p>Desk: {desk.id}</p>
            <p>Current employee: {employee?.name}</p>
            <p>
              Assigned devices:{" "}
              {assignedAssets.map((a) => a.id).join(", ") || "None"}
            </p>
            <p>Status: Occupied</p>
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <button className={button} onClick={() => setModal(null)}>
              Cancel
            </button>
            <button
              onClick={release}
              className="rounded-lg bg-violet-600 px-4 py-2 text-xs font-semibold text-white"
            >
              Release Desk
            </button>
          </div>
        </Modal>
      )}
      {modal === "employee" && employee && (
        <Modal title={employee.name} onClose={() => setModal(null)}>
          <div className="mt-4 space-y-3 text-sm">
            <p>Employee ID: {employee.id}</p>
            <p>Department: {zones.find((z) => z.id === desk?.zoneId)?.name}</p>
            <p>Position: {employee.role}</p>
            <p>Assigned desk: {desk?.id}</p>
            <p>
              Assigned devices:{" "}
              {assignedAssets.map((a) => a.id).join(", ") || "None"}
            </p>
          </div>
        </Modal>
      )}
      {modal === "asset" && asset && (
        <Modal title={`${asset.type} details`} onClose={() => setModal(null)}>
          <div className="mt-4 space-y-3 text-sm">
            <p>Asset ID: {asset.id}</p>
            <p>Device type: {asset.type}</p>
            <p>Assigned employee: {employee?.name}</p>
            <p>Assigned desk: {desk?.id}</p>
            <p>Status: Assigned</p>
            <p>Last seen: {asset.lastSeen}</p>
          </div>
        </Modal>
      )}
    </div>
  );
}   
