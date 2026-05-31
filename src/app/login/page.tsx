"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api";

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFormFallback />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginFormFallback() {
  return (
    <div className="ms-auth">
      <p className="muted" style={{ fontSize: 13 }}>Loading…</p>
    </div>
  );
}

function BrandMark() {
  return (
    <span className="ms-brand-mark" aria-hidden>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M3 8 Q12 4 21 8 L21 18 L3 18 Z" stroke="white" strokeWidth="1.7" strokeLinejoin="round" />
        <path d="M3 8 Q12 11 21 8" stroke="white" strokeWidth="1.4" opacity="0.7" />
      </svg>
    </span>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login({ email, password });
      const redirect = params.get("redirect") ?? "/";
      router.replace(redirect);
      router.refresh();
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        setError("Invalid email or password.");
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="ms-auth">
      <form onSubmit={onSubmit} className="ms-card ms-auth-card">
        <div className="ms-auth-head">
          <div className="ms-brand">
            <BrandMark />
            <span className="ms-brand-name">MySky</span>
          </div>
          <div className="ms-auth-title">Sign in</div>
          <div className="ms-auth-sub">Internal scheduling for stretch ceiling crews</div>
        </div>

        <div className="ms-field">
          <span className="ms-label">Email</span>
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="ms-input"
          />
        </div>

        <div className="ms-field">
          <span className="ms-label">Password</span>
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="ms-input"
          />
        </div>

        {error && <p className="ms-banner error" style={{ marginBottom: 14 }}>{error}</p>}

        <button type="submit" disabled={submitting} className="ms-btn primary" style={{ width: "100%", justifyContent: "center" }}>
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
