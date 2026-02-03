"use client";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function Home() {
  const [lPer100km, setLPer100km] = useState("");
  const [result, setResult] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
   const [history, setHistory] = useState([]);
   const [historyLoading, setHistoryLoading] = useState(false);
   const [historyError, setHistoryError] = useState(null);

  async function loadHistory() {
    if (!supabase) return;

    try {
      setHistoryLoading(true);
      setHistoryError(null);

      const { data, error } = await supabase
        .from("conversions")
        .select("id, created_at, litres_per_100km, mpg_uk, mpg_us")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading history:", error);
        setHistoryError("Could not load history.");
        return;
      }

      setHistory(data ?? []);
    } finally {
      setHistoryLoading(false);
    }
  }

  useEffect(() => {
    loadHistory();
  }, []);

  async function convert() {
    const value = parseFloat(lPer100km);
    if (isNaN(value) || value <= 0) {
      setResult(null);
      setSaveError(null);
      return;
    }

    const mpgUK = 282.481 / value;
    const mpgUS = 235.215 / value;

    const newResult = {
      uk: mpgUK.toFixed(2),
      us: mpgUS.toFixed(2),
    };

    setResult(newResult);
    setSaveError(null);

    if (!supabase) {
      // Supabase not configured – skip saving silently
      return;
    }

    try {
      setSaving(true);
      const { error } = await supabase.from("conversions").insert({
        litres_per_100km: value,
        mpg_uk: parseFloat(newResult.uk),
        mpg_us: parseFloat(newResult.us),
      });

      if (error) {
        console.error("Error saving conversion:", error);
        setSaveError("Could not save to history.");
      }
      await loadHistory();
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-blue-950 text-slate-50">
      <div className="mx-auto max-w-xl px-6 py-16">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">
            Fuel Consumption Converter
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Convert L/100km into UK and US MPG.
          </p>
        </header>

        <section className="rounded-2xl bg-yellow-50 p-6 shadow-sm ring-1 ring-yellow-100 text-slate-900">
          <label className="block text-sm font-medium text-slate-700">
            Litres per 100 km
            <input
              type="number"
              step="0.1"
              inputMode="decimal"
              value={lPer100km}
              onChange={(e) => setLPer100km(e.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm outline-none ring-0 placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              placeholder="e.g. 6.5"
            />
          </label>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={convert}
              disabled={saving}
              className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-300 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {saving ? "Converting..." : "Convert"}
            </button>

            <button
              type="button"
              onClick={() => {
                setLPer100km("");
                setResult(null);
              }}
              className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              Reset
            </button>
          </div>

          {result && (
            <div className="mt-6 space-y-3">
              <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <dl className="grid gap-2">
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="text-sm text-slate-600">UK MPG</dt>
                    <dd className="text-lg font-semibold tabular-nums text-slate-900">
                      {result.uk}
                    </dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="text-sm text-slate-600">US MPG</dt>
                    <dd className="text-lg font-semibold tabular-nums text-slate-900">
                      {result.us}
                    </dd>
                  </div>
                </dl>
              </div>

              {saveError && (
                <p className="text-sm text-red-600">{saveError}</p>
              )}
            </div>
          )}
        </section>

        <section className="mt-10">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Recent conversions
          </h2>

          {!supabase && (
            <p className="mt-2 text-sm text-slate-500">
              Configure Supabase to start recording history.
            </p>
          )}

          {supabase && (
            <div className="mt-3 rounded-2xl bg-yellow-50 p-4 shadow-sm ring-1 ring-yellow-100 text-slate-900">
              {historyLoading ? (
                <p className="text-sm text-slate-500">Loading history…</p>
              ) : historyError ? (
                <p className="text-sm text-red-600">{historyError}</p>
              ) : history.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No conversions stored yet. Do a conversion to see it here.
                </p>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-3 gap-4 border-b border-slate-100 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <span>L/100 km</span>
                    <span>MPG (UK / US)</span>
                    <span className="text-right">Date / time</span>
                  </div>

                  <div className="max-h-60 overflow-y-auto pr-1">
                    <ul className="divide-y divide-slate-100 text-sm">
                      {history.map((item) => (
                        <li
                          key={item.id}
                          className="grid grid-cols-3 items-center gap-4 py-2 odd:bg-sky-50 even:bg-rose-50"
                        >
                          <div className="font-medium text-slate-900">
                            {item.litres_per_100km}
                          </div>
                          <div className="text-xs text-slate-700">
                            <div>UK: {item.mpg_uk}</div>
                            <div>US: {item.mpg_us}</div>
                          </div>
                          <div className="text-right text-xs text-slate-500">
                            {new Date(item.created_at).toLocaleString()}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
