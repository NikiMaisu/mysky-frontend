"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

export default function Home() {
  const router = useRouter();
  const { user, loading, logout } = useAuth();

  if (loading) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-sm text-zinc-500">Loading…</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-sm text-zinc-500">Not signed in.</p>
      </main>
    );
  }

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-12">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Welcome, {user.name}
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          Signed in as {user.email} ({user.role.toLowerCase()})
        </p>
      </div>
      <button
        type="button"
        onClick={handleLogout}
        className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
      >
        Sign out
      </button>
    </main>
  );
}
