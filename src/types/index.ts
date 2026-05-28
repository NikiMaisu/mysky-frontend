// Backend DTO mirrors. Real types are filled in alongside backend phases:
// - phase 2: User, LoginRequest, AuthResponse (done)
// - phase 3: Material, Fixture, BlindsRailing, HvacCutout, Worker, Team
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
