"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { BarrioStats, Inmueble, InmueblesResponse } from "@/lib/inmuebles";
import { StatsPanel } from "@/components/StatsPanel";
import { PricePerM2Histogram } from "@/components/PricePerM2Histogram";

const MapView = dynamic(
  () => import("@/components/MapView").then((m) => m.MapView),
  { ssr: false }
);

type State = {
  inmuebles: Inmueble[];
  barrios: BarrioStats[];
  loading: boolean;
  error: string | null;
  pricePerM2Min: number | null;
  pricePerM2Max: number | null;
  priceTotalMin: number | null;
  priceTotalMax: number | null;
  areaTerrenoMin: number | null;
  areaTerrenoMax: number | null;
};

type HistogramRange = { min: number; max: number };

const FILTER_STORAGE_KEY = "inmueble-filters-v1";
const FILTERS_OPEN_STORAGE_KEY = "inmueble-filters-open-v1";

const initialState: State = {
  inmuebles: [],
  barrios: [],
  loading: true,
  error: null,
  pricePerM2Min: null,
  pricePerM2Max: null,
  priceTotalMin: null,
  priceTotalMax: null,
  areaTerrenoMin: null,
  areaTerrenoMax: null,
};

export default function Home() {
  const [state, setState] = useState<State>(initialState);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [histogramSelectedRange, setHistogramSelectedRange] =
    useState<HistogramRange | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch("/api/inmuebles");
        if (!res.ok) {
          throw new Error("Error al cargar datos");
        }
        const json: InmueblesResponse = await res.json();
        if (cancelled) return;
        setState((prev) => ({
          ...prev,
          inmuebles: json.inmuebles,
          barrios: json.barrios,
          loading: false,
          error: null,
        }));
      } catch (e) {
        if (cancelled) return;
        setState((prev) => ({
          ...prev,
          loading: false,
          error: "No se pudieron cargar los inmuebles.",
        }));
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const rawFilters = window.localStorage.getItem(FILTER_STORAGE_KEY);
      if (rawFilters) {
        const parsed = JSON.parse(rawFilters) as Partial<State>;
        setState((prev) => ({
          ...prev,
          pricePerM2Min: parsed.pricePerM2Min ?? prev.pricePerM2Min,
          pricePerM2Max: parsed.pricePerM2Max ?? prev.pricePerM2Max,
          priceTotalMin: parsed.priceTotalMin ?? prev.priceTotalMin,
          priceTotalMax: parsed.priceTotalMax ?? prev.priceTotalMax,
          areaTerrenoMin: parsed.areaTerrenoMin ?? prev.areaTerrenoMin,
          areaTerrenoMax: parsed.areaTerrenoMax ?? prev.areaTerrenoMax,
        }));
      }

      const rawOpen = window.localStorage.getItem(FILTERS_OPEN_STORAGE_KEY);
      if (rawOpen != null) {
        setFiltersOpen(rawOpen === "1");
      }
    } catch {
      // ignore localStorage errors
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const toPersist = {
        pricePerM2Min: state.pricePerM2Min,
        pricePerM2Max: state.pricePerM2Max,
        priceTotalMin: state.priceTotalMin,
        priceTotalMax: state.priceTotalMax,
        areaTerrenoMin: state.areaTerrenoMin,
        areaTerrenoMax: state.areaTerrenoMax,
      };

      window.localStorage.setItem(
        FILTER_STORAGE_KEY,
        JSON.stringify(toPersist)
      );
      window.localStorage.setItem(
        FILTERS_OPEN_STORAGE_KEY,
        filtersOpen ? "1" : "0"
      );
    } catch {
      // ignore localStorage errors
    }
  }, [
    state.pricePerM2Min,
    state.pricePerM2Max,
    state.priceTotalMin,
    state.priceTotalMax,
    state.areaTerrenoMin,
    state.areaTerrenoMax,
    filtersOpen,
  ]);

  const filteredInmuebles =
    state.pricePerM2Min == null &&
    state.pricePerM2Max == null &&
    state.priceTotalMin == null &&
    state.priceTotalMax == null &&
    state.areaTerrenoMin == null &&
    state.areaTerrenoMax == null
      ? state.inmuebles
      : state.inmuebles.filter((i) => {
          if (i.pricePerM2 == null || !Number.isFinite(i.pricePerM2)) {
            if (state.pricePerM2Min != null || state.pricePerM2Max != null) {
              return false;
            }
          }

          if (
            state.pricePerM2Min != null &&
            (i.pricePerM2 == null || i.pricePerM2 < state.pricePerM2Min)
          ) {
            return false;
          }

          if (
            state.pricePerM2Max != null &&
            (i.pricePerM2 == null || i.pricePerM2 > state.pricePerM2Max)
          ) {
            return false;
          }

          if (state.priceTotalMin != null && i.priceUsd < state.priceTotalMin) {
            return false;
          }

          if (state.priceTotalMax != null && i.priceUsd > state.priceTotalMax) {
            return false;
          }

          if (state.areaTerrenoMin != null || state.areaTerrenoMax != null) {
            if (i.areaTerrenoM2 == null || !Number.isFinite(i.areaTerrenoM2)) {
              return false;
            }

            if (
              state.areaTerrenoMin != null &&
              i.areaTerrenoM2 < state.areaTerrenoMin
            ) {
              return false;
            }

            if (
              state.areaTerrenoMax != null &&
              i.areaTerrenoM2 > state.areaTerrenoMax
            ) {
              return false;
            }
          }

          return true;
        });

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-zinc-50">
      <main className="flex min-h-screen flex-1 flex-col gap-3 px-4 py-3 md:px-6 md:py-4">
        <header className="flex flex-col gap-1">
          <div className="space-y-1">
            <h1 className="text-lg font-semibold tracking-tight md:text-xl">
              Análisis de valor m² · Mar del Plata
            </h1>
            <p className="max-w-xl text-[11px] text-zinc-500 md:text-xs">
              Datos en tiempo real desde la API de Mar del Inmueble. Explorá
              cómo varía el precio por metro cuadrado según el barrio.
            </p>
          </div>
        </header>

        <section className="grid flex-1 grid-cols-1 gap-4 md:grid-cols-[minmax(280px,360px)_minmax(0,1fr)]">
          <div className="flex flex-col gap-3">
            <StatsPanel inmuebles={state.inmuebles} barrios={state.barrios} />
            <PricePerM2Histogram
              inmuebles={filteredInmuebles}
              selectedRange={histogramSelectedRange}
              onBucketClick={(range) => setHistogramSelectedRange(range)}
            />
          </div>

          <div className="relative z-0 h-full min-h-[320px]">
            <div className="pointer-events-none absolute inset-0 z-[9999] flex items-start justify-end p-3 md:p-4">
              <div className="pointer-events-auto flex flex-col items-end gap-2">
                <button
                  type="button"
                  className="rounded-full border border-zinc-700 bg-zinc-900/80 px-3 py-1 text-[10px] font-medium text-zinc-200 shadow-md hover:border-emerald-400 hover:text-emerald-300"
                  onClick={() => setFiltersOpen((prev) => !prev)}
                >
                  {filtersOpen ? "Ocultar filtros" : "Mostrar filtros"}
                </button>

                {filtersOpen && (
                  <div className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-950/90 p-3 text-[11px] text-zinc-300 shadow-xl backdrop-blur">
                    <div className="flex flex-col gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                          Filtro precio / m²
                        </span>
                        <input
                          type="number"
                          inputMode="decimal"
                          placeholder="Mín"
                          className="w-20 rounded-full border border-zinc-700 bg-zinc-900 px-2 py-1 text-[11px] text-zinc-100 outline-none focus:border-emerald-400"
                          value={state.pricePerM2Min ?? ""}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            setState((prev) => ({
                              ...prev,
                              pricePerM2Min: Number.isNaN(v) ? null : v,
                            }));
                          }}
                        />
                        <span>–</span>
                        <input
                          type="number"
                          inputMode="decimal"
                          placeholder="Máx"
                          className="w-20 rounded-full border border-zinc-700 bg-zinc-900 px-2 py-1 text-[11px] text-zinc-100 outline-none focus:border-emerald-400"
                          value={state.pricePerM2Max ?? ""}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            setState((prev) => ({
                              ...prev,
                              pricePerM2Max: Number.isNaN(v) ? null : v,
                            }));
                          }}
                        />
                        <button
                          type="button"
                          className="rounded-full border border-zinc-700 px-3 py-1 text-[10px] font-medium text-zinc-300 hover:border-zinc-400 hover:text-zinc-100"
                          onClick={() =>
                            setState((prev) => ({
                              ...prev,
                              pricePerM2Min: null,
                              pricePerM2Max: null,
                            }))
                          }
                        >
                          Limpiar
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                          Sup. terreno (m²)
                        </span>
                        <input
                          type="number"
                          inputMode="decimal"
                          placeholder="Mín"
                          className="w-24 rounded-full border border-zinc-700 bg-zinc-900 px-2 py-1 text-[11px] text-zinc-100 outline-none focus:border-emerald-400"
                          value={state.areaTerrenoMin ?? ""}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            setState((prev) => ({
                              ...prev,
                              areaTerrenoMin: Number.isNaN(v) ? null : v,
                            }));
                          }}
                        />
                        <span>–</span>
                        <input
                          type="number"
                          inputMode="decimal"
                          placeholder="Máx"
                          className="w-24 rounded-full border border-zinc-700 bg-zinc-900 px-2 py-1 text-[11px] text-zinc-100 outline-none focus:border-emerald-400"
                          value={state.areaTerrenoMax ?? ""}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            setState((prev) => ({
                              ...prev,
                              areaTerrenoMax: Number.isNaN(v) ? null : v,
                            }));
                          }}
                        />
                        <button
                          type="button"
                          className="rounded-full border border-zinc-700 px-3 py-1 text-[10px] font-medium text-zinc-300 hover:border-zinc-400 hover:text-zinc-100"
                          onClick={() =>
                            setState((prev) => ({
                              ...prev,
                              areaTerrenoMin: null,
                              areaTerrenoMax: null,
                            }))
                          }
                        >
                          Limpiar
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                          Precio total
                        </span>
                        <input
                          type="number"
                          inputMode="decimal"
                          placeholder="Mín"
                          className="w-24 rounded-full border border-zinc-700 bg-zinc-900 px-2 py-1 text-[11px] text-zinc-100 outline-none focus:border-emerald-400"
                          value={state.priceTotalMin ?? ""}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            setState((prev) => ({
                              ...prev,
                              priceTotalMin: Number.isNaN(v) ? null : v,
                            }));
                          }}
                        />
                        <span>–</span>
                        <input
                          type="number"
                          inputMode="decimal"
                          placeholder="Máx"
                          className="w-24 rounded-full border border-zinc-700 bg-zinc-900 px-2 py-1 text-[11px] text-zinc-100 outline-none focus:border-emerald-400"
                          value={state.priceTotalMax ?? ""}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            setState((prev) => ({
                              ...prev,
                              priceTotalMax: Number.isNaN(v) ? null : v,
                            }));
                          }}
                        />
                        <button
                          type="button"
                          className="rounded-full border border-zinc-700 px-3 py-1 text-[10px] font-medium text-zinc-300 hover:border-zinc-400 hover:text-zinc-100"
                          onClick={() =>
                            setState((prev) => ({
                              ...prev,
                              priceTotalMin: null,
                              priceTotalMax: null,
                            }))
                          }
                        >
                          Limpiar
                        </button>
                      </div>

                      <div>
                        {state.loading && <span>Cargando inmuebles…</span>}
                        {!state.loading && state.error && (
                          <span className="text-amber-400">{state.error}</span>
                        )}
                        {!state.loading && !state.error && (
                          <span>
                            {state.inmuebles.length.toLocaleString()} inmuebles
                            cargados
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <MapView
              inmuebles={filteredInmuebles}
              pricePerM2Min={state.pricePerM2Min}
              pricePerM2Max={state.pricePerM2Max}
              highlightPricePerM2Range={histogramSelectedRange}
            />
          </div>
        </section>
      </main>
    </div>
  );
}
