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

type Wallet = { userId: string; balance: number };
type Tx = { txId?: string; type?: string; amount?: number; createdAt?: string; sk?: string };

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

  const healthUrl = useMemo(() => (apiBase ? safeJoin(apiBase, "/v1/health") : ""), [apiBase]);
  const walletUrl = useMemo(() => (apiBase ? safeJoin(apiBase, "/v1/wallet") : ""), [apiBase]);
  const topupUrl = useMemo(() => (apiBase ? safeJoin(apiBase, "/v1/wallet/topup") : ""), [apiBase]);
  const txUrl = useMemo(
    () => (apiBase ? safeJoin(apiBase, "/v1/transactions?limit=10") : ""),
    [apiBase]
  );

  // -----------------------------
  // Health check state
  // -----------------------------
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

  // -----------------------------
  // Wallet UI state
  // -----------------------------
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [amount, setAmount] = useState<string>("500");
  const [busy, setBusy] = useState(false);
  const [walletErr, setWalletErr] = useState<string>("");

  const loadWallet = useCallback(async () => {
    if (!walletUrl) return;
    setWalletErr("");
    const res = await fetch(walletUrl, { cache: "no-store" });
    if (!res.ok) throw new Error(`wallet: HTTP ${res.status}`);
    const data = (await res.json()) as Wallet;
    setWallet(data);
  }, [walletUrl]);

  const loadTxs = useCallback(async () => {
    if (!txUrl) return;
    setWalletErr("");
    const res = await fetch(txUrl, { cache: "no-store" });
    if (!res.ok) throw new Error(`transactions: HTTP ${res.status}`);
    const data = await res.json();
    setTxs((data?.items ?? []) as Tx[]);
  }, [txUrl]);

  const refreshWalletArea = useCallback(async () => {
    try {
      await Promise.all([loadWallet(), loadTxs()]);
    } catch (e: any) {
      setWalletErr(e?.message ?? "Failed to load wallet data");
    }
  }, [loadWallet, loadTxs]);

  useEffect(() => {
    if (!apiBase) return;
    void refreshWalletArea();
  }, [apiBase, refreshWalletArea]);

  const doTopUp = useCallback(async () => {
    if (!topupUrl) {
      setWalletErr("Missing API base URL");
      return;
    }

    const n = parseInt(amount, 10);
    if (!Number.isFinite(n) || n <= 0) {
      setWalletErr("Amount must be a positive integer.");
      return;
    }

    setBusy(true);
    setWalletErr("");
    try {
      const res = await fetch(topupUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: n }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`topup: HTTP ${res.status}${text ? ` – ${text}` : ""}`);
      }

      await refreshWalletArea();
    } catch (e: any) {
      setWalletErr(e?.message ?? "TopUp failed");
    } finally {
      setBusy(false);
    }
  }, [amount, topupUrl, refreshWalletArea]);

  const fmtMoney = (v?: number) =>
    typeof v === "number" ? v.toLocaleString("hu-HU") : "—";

  const fmtTime = (iso?: string) => {
    if (!iso) return "—";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleString();
  };

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

          {/* Health panel */}
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

          {/* Wallet + Transactions panel */}
          <div className="mt-6 rounded-2xl border border-black/[.08] bg-white p-5 shadow-sm dark:border-white/[.145] dark:bg-black">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                  Wallet (demo-user)
                </span>
                <span className="inline-flex items-center rounded-full bg-zinc-100 px-3 py-1 text-sm text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
                  Balance: <b className="ml-1">{fmtMoney(wallet?.balance)}</b>
                </span>
              </div>

              <button
                onClick={() => void refreshWalletArea()}
                className="inline-flex h-10 items-center justify-center rounded-full border border-solid border-black/[.08] px-4 text-sm font-medium text-zinc-950 transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:text-zinc-50 dark:hover:bg-[#1a1a1a]"
                type="button"
              >
                Refresh wallet
              </button>
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
              <input
                className="h-10 w-full rounded-full border border-black/[.08] px-4 text-sm outline-none dark:border-white/[.145] dark:bg-black"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="TopUp amount"
                inputMode="numeric"
              />
              <button
                onClick={() => void doTopUp()}
                disabled={busy}
                className="h-10 rounded-full bg-zinc-900 px-5 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-black"
                type="button"
              >
                {busy ? "Processing…" : "Top Up"}
              </button>
            </div>

            {walletErr && (
              <p className="mt-3 text-sm leading-6 text-red-700 dark:text-red-300">
                {walletErr}
              </p>
            )}

            <div className="mt-5">
              <div className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Latest transactions
              </div>
              <ul className="mt-2 space-y-2">
                {txs.map((t, idx) => {
                  const key = t.txId ?? t.sk ?? String(idx);
                  return (
                    <li
                      key={key}
                      className="flex flex-col gap-1 rounded-xl border border-black/[.06] px-4 py-2 text-sm dark:border-white/[.12] sm:flex-row sm:items-center sm:justify-between"
                    >
                      <span className="text-zinc-800 dark:text-zinc-200">
                        {t.type ?? "—"}
                      </span>
                      <span className="text-zinc-600 dark:text-zinc-400">
                        {fmtTime(t.createdAt)}
                      </span>
                      <span className="font-medium text-zinc-900 dark:text-zinc-50">
                        {typeof t.amount === "number" ? `+${fmtMoney(t.amount)}` : "—"}
                      </span>
                    </li>
                  );
                })}
                {txs.length === 0 && (
                  <li className="text-sm text-zinc-600 dark:text-zinc-400">
                    No transactions yet.
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
          <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
            Peak Wallet demo
          </h1>
          <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            Minimal full-stack reference: <b>NestJS (Lambda)</b> +{" "}
            <b>API Gateway</b> + <b>DynamoDB</b> + <b>Next.js</b> on Amplify.
          </p>
        </div>

        <div className="flex flex-col gap-4 text-base font-medium sm:flex-row">
          <a
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-foreground px-5 text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc] md:w-[158px]"
            href="https://github.com/Barnabas932/peak-wallet"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub Repo
          </a>
          <a
            className="flex h-12 w-full items-center justify-center rounded-full border border-solid border-black/[.08] px-5 transition-colors hover:border-transparent hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a] md:w-[158px]"
            href="https://nextjs.org/docs"
            target="_blank"
            rel="noopener noreferrer"
          >
            Next.js Docs
          </a>
        </div>
      </main>
    </div>
  );
}
