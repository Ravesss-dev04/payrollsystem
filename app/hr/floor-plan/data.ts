export type Zone = {
  id: string;
  name: string;
  color: string;
  accent: string;
  x: number;
  y: number;
  width: number;
  height: number;
  capacity: number;
  occupied: number;
  columns: number;
};
export type Employee = {
  id: string;
  name: string;
  role: string;
  department: string;
};
export type Asset = {
  id: string;
  type: string;
  employeeId: string;
  lastSeen: string;
};
export type Desk = {
  id: string;
  zoneId: string;
  floorId: string;
  x: number;
  y: number;
  type: string;
  employeeId: string | null;
};
export const zones: Zone[] = [
  {
    id: "operations",
    name: "Operations",
    color: "#e7effc",
    accent: "#f16d91",
    x: 18,
    y: 210,
    width: 222,
    height: 225,
    capacity: 36,
    occupied: 32,
    columns: 6,
  },
  {
    id: "engineering",
    name: "Engineering",
    color: "#eee8fa",
    accent: "#9852e8",
    x: 290,
    y: 215,
    width: 225,
    height: 220,
    capacity: 32,
    occupied: 28,
    columns: 8,
  },
  {
    id: "marketing",
    name: "Marketing",
    color: "#f5eafa",
    accent: "#31ba80",
    x: 250,
    y: 18,
    width: 200,
    height: 155,
    capacity: 20,
    occupied: 16,
    columns: 5,
  },
  {
    id: "sales",
    name: "Sales",
    color: "#e5effb",
    accent: "#f6a936",
    x: 458,
    y: 18,
    width: 190,
    height: 155,
    capacity: 16,
    occupied: 12,
    columns: 4,
  },
  {
    id: "hr",
    name: "HR & Admin",
    color: "#fff1d8",
    accent: "#b77aef",
    x: 525,
    y: 218,
    width: 123,
    height: 190,
    capacity: 12,
    occupied: 8,
    columns: 3,
  },
  {
    id: "collaboration",
    name: "Collaboration",
    color: "#f9eaf7",
    accent: "#ad52e4",
    x: 18,
    y: 18,
    width: 175,
    height: 155,
    capacity: 8,
    occupied: 8,
    columns: 4,
  },
  {
    id: "shared",
    name: "Shared Area",
    color: "#f0f2f9",
    accent: "#8491af",
    x: 525,
    y: 420,
    width: 123,
    height: 125,
    capacity: 4,
    occupied: 0,
    columns: 4,
  },
];
const firstNames = [
  "Liam",
  "Olivia",
  "Noah",
  "Ava",
  "Ethan",
  "Mia",
  "Lucas",
  "Amelia",
  "Mason",
  "Isabella",
  "James",
  "Charlotte",
  "Daniel",
  "Harper",
  "Henry",
  "Grace",
];
const lastNames = [
  "Carter",
  "Bennett",
  "Parker",
  "Mitchell",
  "Foster",
  "Brooks",
  "Hayes",
  "Morgan",
  "Turner",
  "Reed",
  "Collins",
  "Ward",
];
export const employees: Employee[] = Array.from({ length: 116 }, (_, i) => ({
  id: `EMP-${10023 + i}`,
  name:
    i === 0
      ? "Sophia Reynolds"
      : `${firstNames[i % firstNames.length]} ${lastNames[Math.floor(i / firstNames.length) % lastNames.length]} ${i + 1}`,
  role: i === 0 ? "Operations Lead" : "Team Member",
  department: i === 0 ? "Operations" : "WorkPulse",
}));
export const assets: Asset[] = [
  {
    id: "LP-8421",
    type: "Laptop",
    employeeId: "EMP-10023",
    lastSeen: "2 min ago (demo)",
  },
  {
    id: "MN-3017",
    type: "Monitor",
    employeeId: "EMP-10023",
    lastSeen: "2 min ago (demo)",
  },
];
let employeeIndex = 0;
let deskIndex = 0;
export const initialDesks: Desk[] = zones.flatMap((zone) =>
  Array.from({ length: zone.capacity }, (_, i) => {
    const index = deskIndex++;
    const employeeId = i < zone.occupied ? employees[employeeIndex++].id : null;
    const rows = Math.ceil(zone.capacity / zone.columns);
    return {
      id: index === 0 ? "D-308" : `D-${309 + index - 1}`,
      zoneId: zone.id,
      floorId: "hq3",
      x:
        zone.x +
        18 +
        ((i % zone.columns) * (zone.width - 36)) /
          Math.max(zone.columns - 1, 1),
      y:
        zone.y +
        60 +
        (Math.floor(i / zone.columns) * (zone.height - 78)) /
          Math.max(rows - 1, 1),
      type: "Standard",
      employeeId,
    };
  }),
);
