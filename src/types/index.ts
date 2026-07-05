// Backend DTO mirrors.
// - phase 2: User, LoginRequest, AuthResponse (done)
// - phase 3: Material, Fixture, Addon, GraniteConfig, Worker, Team (done)
// - phase 4: Order, OrderLineItem, OrderStatus

export type Role = "ADMIN" | "WORKER";

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
}

export interface LoginRequest {
  identifier: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  accessTokenExpiresInSeconds: number;
  refreshToken: string;
  refreshTokenExpiresInSeconds: number;
  user: User;
}

export interface Material {
  id: number;
  name: string;
  pricePerM2: number;
  timePerM2Minutes: number;
  active: boolean;
}

export type FixtureUnit = "PER_UNIT" | "PER_METER";

export interface Fixture {
  id: number;
  name: string;
  unit: FixtureUnit;
  cost: number;
  installTimeMinutes: number;
  active: boolean;
}

export type AddonCategory = "BLINDS_RAILING" | "HVAC_CUTOUT" | "OTHER";

export interface Addon {
  id: number;
  name: string;
  category: AddonCategory;
  cost: number;
  installTimeMinutes: number;
  active: boolean;
}

export interface Worker {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  active: boolean;
}

export interface WorkSchedule {
  days: boolean[]; // [0]=Mon … [6]=Sun
  start: string; // "HH:mm"
  end: string; // "HH:mm"
}

export interface Team {
  id: number;
  name: string;
  active: boolean;
  schedule: WorkSchedule | null; // per-team override; null = inherit global
  members: Worker[];
}

export type TimeUnit = "MINUTES" | "HOURS" | "DAYS";

export type OrderStatus = "QUOTED" | "SCHEDULED" | "IN_PROGRESS" | "DONE" | "CANCELLED";

export interface OrderFixtureLine {
  fixtureId: number | null;
  name: string;
  unit: FixtureUnit;
  unitCost: number;
  unitTimeMinutes: number;
  quantity: number;
  lineCost: number;
  lineTimeMinutes: number;
}

export interface OrderAddonLine {
  addonId: number | null;
  name: string;
  category: AddonCategory;
  unitCost: number;
  unitTimeMinutes: number;
  quantity: number;
  lineCost: number;
  lineTimeMinutes: number;
}

export interface OrderMaterialLine {
  materialId: number | null;
  name: string;
  unitPricePerM2: number;
  unitTimeMinutes: number;
  squareMeters: number;
  lineCost: number;
  lineTimeMinutes: number;
}

export interface Order {
  id: number;
  orderNumber: number;
  clientName: string;
  clientPhone: string | null;
  address: string | null;
  startAt: string;
  finishAt: string;
  teamId: number | null;
  teamName: string | null;
  materials: OrderMaterialLine[];
  graniteEnabled: boolean;
  perimeter: number | null;
  granitePricePerMeter: number | null;
  graniteTimePerMeterMinutes: number | null;
  flatAddedMinutes: number;
  totalMinutes: number;
  totalCost: number;
  finishOverridden: boolean;
  status: OrderStatus;
  notes: string | null;
  fixtures: OrderFixtureLine[];
  addons: OrderAddonLine[];
}

export interface CalendarOrder {
  id: number;
  orderNumber: number;
  clientName: string;
  address: string | null;
  teamId: number | null;
  teamName: string | null;
  startAt: string;
  finishAt: string;
  status: OrderStatus;
  totalMinutes: number;
}

export interface TeamRef {
  id: number;
  name: string;
}

export interface DayAvailability {
  date: string; // YYYY-MM-DD (Tbilisi)
  freeTeams: TeamRef[];
  busyTeams: TeamRef[];
}

export interface OrderRequest {
  orderNumber?: number | null;
  clientName: string;
  clientPhone?: string;
  address?: string;
  startAt: string;
  finishAt?: string | null;
  teamId?: number | null;
  materials: { materialId: number; squareMeters: number }[];
  graniteEnabled: boolean;
  perimeter?: number | null;
  flatAddedValue?: number;
  flatAddedUnit?: TimeUnit;
  finishOverridden?: boolean;
  status?: OrderStatus;
  notes?: string;
  fixtures: { fixtureId: number; quantity: number }[];
  addons: { addonId: number; quantity: number }[];
}
