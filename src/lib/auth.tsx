"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import type { LoginRequest, User } from "@/types";

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (req: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children, initialUser = null }: { children: ReactNode; initialUser?: User | null }) {
  const [user, setUser] = useState<User | null>(initialUser);
  const [loading, setLoading] = useState(initialUser === null);

  const refresh = useCallback(async () => {
    try {
      const me = await apiFetch<User>("/auth/me");
      setUser(me);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        setUser(null);
      } else {
        throw e;
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialUser === null) {
      void refresh();
    }
  }, [initialUser, refresh]);

  const login = useCallback(async (req: LoginRequest) => {
    const { user: loggedIn } = await apiFetch<{ user: User }>("/auth/login", {
      method: "POST",
      body: req,
    });
    setUser(loggedIn);
  }, []);

  const logout = useCallback(async () => {
    await apiFetch<null>("/auth/logout", { method: "POST" });
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
