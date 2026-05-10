"use client";

import { useEffect, useState } from "react";

type ScrapeRun = {
  id: string;
  started_at: string;
  completed_at: string | null;
  cards_updated: number;
  status: "running" | "completed" | "failed";
  errors: string[] | null;
};

function duration(start: string, end: string | null) {
  const ms = (end ? new Date(end) : new Date()).getTime() - new Date(start).getTime();
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${m}m ${s}s`;
}

function fmt(iso: string) {
  return new Date(iso).toLocaleString("it-IT");
}

export default function MarketStatusPage() {
  const [runs, setRuns] = useState<ScrapeRun[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch("/api/market/scrape-runs");
    if (res.ok) setRuns(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
    // auto-refresh ogni 10s se c'è un run attivo
    const id = setInterval(() => {
      if (runs.some((r) => r.status === "running")) load();
    }, 10000);
    return () => clearInterval(id);
  }, [runs]);

  const latest = runs[0];

  return (
    <main className="min-h-screen bg-gray-950 text-white p-8">
      <h1 className="text-2xl font-bold mb-6">Market Scrape Status</h1>

      {loading && <p className="text-gray-400">Caricamento...</p>}

      {latest && (
        <div className="mb-8 p-5 rounded-xl border border-gray-800 bg-gray-900">
          <div className="flex items-center gap-3 mb-3">
            <span
              className={`w-3 h-3 rounded-full ${
                latest.status === "running"
                  ? "bg-yellow-400 animate-pulse"
                  : latest.status === "completed"
                  ? "bg-green-400"
                  : "bg-red-400"
              }`}
            />
            <span className="font-semibold text-lg capitalize">{latest.status}</span>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm text-gray-300">
            <div>
              <p className="text-gray-500">Avviato</p>
              <p>{fmt(latest.started_at)}</p>
            </div>
            <div>
              <p className="text-gray-500">Completato</p>
              <p>{latest.completed_at ? fmt(latest.completed_at) : "—"}</p>
            </div>
            <div>
              <p className="text-gray-500">Durata</p>
              <p>{duration(latest.started_at, latest.completed_at)}</p>
            </div>
            <div>
              <p className="text-gray-500">Carte aggiornate</p>
              <p className="text-white font-bold">{latest.cards_updated.toLocaleString()}</p>
            </div>
          </div>
          {latest.errors && latest.errors.length > 0 && (
            <details className="mt-4">
              <summary className="text-red-400 cursor-pointer text-sm">
                {latest.errors.length} errori
              </summary>
              <ul className="mt-2 text-xs text-red-300 space-y-1 max-h-40 overflow-y-auto">
                {latest.errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      <h2 className="text-lg font-semibold mb-3 text-gray-400">Storico run</h2>
      <div className="space-y-2">
        {runs.slice(1).map((r) => (
          <div
            key={r.id}
            className="flex items-center gap-4 p-3 rounded-lg bg-gray-900 border border-gray-800 text-sm"
          >
            <span
              className={`w-2 h-2 rounded-full flex-shrink-0 ${
                r.status === "completed" ? "bg-green-400" : "bg-red-400"
              }`}
            />
            <span className="text-gray-400">{fmt(r.started_at)}</span>
            <span className="text-white">{r.cards_updated.toLocaleString()} carte</span>
            <span className="text-gray-500">{duration(r.started_at, r.completed_at)}</span>
            {r.errors && (
              <span className="text-red-400">{r.errors.length} err</span>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={load}
        className="mt-6 px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm transition-colors"
      >
        Aggiorna
      </button>
    </main>
  );
}
