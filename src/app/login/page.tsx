"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth";
import { useLang } from "@/lib/i18n";
import { LanguageToggle } from "@/components/LanguageToggle";
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
  const { t } = useLang();
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
        setError(t("login.invalid"));
      } else {
        setError(t("common.somethingWrong"));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="ms-auth">
      <form onSubmit={onSubmit} className="ms-card ms-auth-card">
        <div className="ms-auth-head">
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
            <LanguageToggle />
          </div>
          <div className="ms-brand">
            <BrandMark />
            <span className="ms-brand-name">MySky</span>
          </div>
          <div className="ms-auth-title">{t("login.title")}</div>
          <div className="ms-auth-sub">{t("brand.sub")}</div>
        </div>

        <div className="ms-field">
          <span className="ms-label">{t("login.email")}</span>
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
          <span className="ms-label">{t("login.password")}</span>
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
          {submitting ? t("login.signingIn") : t("login.title")}
        </button>
      </form>
    </div>
  );
}
