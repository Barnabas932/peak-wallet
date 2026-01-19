"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";

type HealthResponse = {
  status?: string;
  ok?: boolean;
  message?: string;
};

type StatusState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ok"; data: HealthResponse; ms: number }
  | { kind: "error"; error: string };

function safeJoin(base: string, path: string) {
  const b = base.replace(/\/+$/, "");
  const p = path.replace(/^\/+/, "");
  return `${b}/${p}`;
}

export default function Home() {
  const apiBase = useMemo(
    () => (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").trim(),
    []
  );

  const healthUrl = useMemo(() => {
    if (!apiBase) return "";
    return safeJoin(apiBase, "/v1/health");
  }, [apiBase]);

  const [state, setState] = useState<StatusState>({ kind: "idle" });
  const [lastChecked, setLastChecked] = useState<string>("");

  const checkHealth = useCallback(async () => {
    if (!healthUrl) {
      setState({
        kind: "error",
        error:
          "Missing NEXT_PUBLIC_API_BASE_URL. Set it in Amplify env vars (or .env.local) and redeploy.",
      });
      return;
    }

    const t0 = performance.now();
    setState({ kind: "loading" });

    try {
      const res = await fetch(healthUrl, { cache: "no-store" });
      const ms = Math.round(performance.now() - t0);

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        setState({
          kind: "error",
          error: `HTTP ${res.status} ${res.statusText}${text ? ` – ${text}` : ""}`,
        });
        setLastChecked(new Date().toLocaleString());
        return;
      }

      const data = (await res.json()) as HealthResponse;
      setState({ kind: "ok", data, ms });
      setLastChecked(new Date().toLocaleString());
    } catch (e: any) {
      setState({
        kind: "error",
        error: e?.message ?? "Network error",
      });
      setLastChecked(new Date().toLocaleString());
    }
  }, [healthUrl]);

  useEffect(() => {
    // auto-check on page load
    void checkHealth();
  }, [checkHealth]);

  const statusBadge = (() => {
    if (state.kind === "loading") {
      return (
        <span className="inline-flex items-center rounded-full bg-zinc-100 px-3 py-1 text-sm text-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
          Checking…
        </span>
      );
    }
    if (state.kind === "ok") {
      const label =
        state.data.status ?? (state.data.ok ? "ok" : "ok (no status field)");
      return (
        <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
          ✅ Backend: {label} · {state.ms}ms
        </span>
      );
    }
    if (state.kind === "error") {
      return (
        <span className="inline-flex items-center rounded-full bg-red-100 px-3 py-1 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
          ❌ Backend error
        </span>
      );
    }
    return (
      <span className="inline-flex items-center rounded-full bg-zinc-100 px-3 py-1 text-sm text-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
        Idle
      </span>
    );
  })();

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between bg-white py-32 px-16 dark:bg-black sm:items-start">
        <div className="w-full">
          <Image
            className="dark:invert"
            src="/next.svg"
            alt="Next.js logo"
            width={100}
            height={20}
            priority
          />

          {/* ✅ Added: Backend status panel */}
          <div className="mt-6 rounded-2xl border border-black/[.08] bg-white p-5 shadow-sm dark:border-white/[.145] dark:bg-black">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                  Live API status
                </span>
                {statusBadge}
              </div>

              <button
                onClick={checkHealth}
                className="inline-flex h-10 items-center justify-center rounded-full border border-solid border-black/[.08] px-4 text-sm font-medium text-zinc-950 transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:text-zinc-50 dark:hover:bg-[#1a1a1a]"
                type="button"
              >
                Refresh
              </button>
            </div>

            {state.kind === "error" && (
              <p className="mt-3 text-sm leading-6 text-red-700 dark:text-red-300">
                {state.error}
              </p>
            )}

            <div className="mt-4 space-y-1 text-xs text-zinc-600 dark:text-zinc-400">
              <div>
                <span className="font-medium text-zinc-800 dark:text-zinc-200">
                  API base:
                </span>{" "}
                {apiBase || "(not set)"}
              </div>
              <div>
                <span className="font-medium text-zinc-800 dark:text-zinc-200">
                  Health URL:
                </span>{" "}
                {healthUrl || "(not available)"}
              </div>
              <div>
                <span className="font-medium text-zinc-800 dark:text-zinc-200">
                  Last checked:
                </span>{" "}
                {lastChecked || "(not yet)"}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
          <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
            To get started, edit the page.tsx file.
          </h1>
          <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            Looking for a starting point or more instructions? Head over to{" "}
            <a
              href="https://vercel.com/templates?framework=next.js&utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
              className="font-medium text-zinc-950 dark:text-zinc-50"
            >
              Templates
            </a>{" "}
            or the{" "}
            <a
              href="https://nextjs.org/learn?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
              className="font-medium text-zinc-950 dark:text-zinc-50"
            >
              Learning
            </a>{" "}
            center.
          </p>
        </div>

        <div className="flex flex-col gap-4 text-base font-medium sm:flex-row">
          <a
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-foreground px-5 text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc] md:w-[158px]"
            href="https://vercel.com/new?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Image
              className="dark:invert"
              src="/vercel.svg"
              alt="Vercel logomark"
              width={16}
              height={16}
            />
            Deploy Now
          </a>
          <a
            className="flex h-12 w-full items-center justify-center rounded-full border border-solid border-black/[.08] px-5 transition-colors hover:border-transparent hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a] md:w-[158px]"
            href="https://nextjs.org/docs?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
            target="_blank"
            rel="noopener noreferrer"
          >
            Documentation
          </a>
        </div>
      </main>
    </div>
  );
}
