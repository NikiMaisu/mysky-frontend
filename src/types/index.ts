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
  email: string;
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

export interface GraniteConfig {
  pricePerMeter: number;
  timePerMeterMinutes: number;
}

export interface Worker {
  id: number;
  name: string;
  email: string;
  active: boolean;
}

export interface Team {
  id: number;
  name: string;
  active: boolean;
  members: Worker[];
}
