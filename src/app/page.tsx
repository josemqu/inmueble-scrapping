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
  maxAgeDays: number | null;
  idTipoOperacion: string;
  idTipoInmueble: string;
  selectedSource: string;
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
  maxAgeDays: null,
  idTipoOperacion: "1",
  idTipoInmueble: "1",
  selectedSource: "all",
};

export default function Home() {
  const [state, setState] = useState<State>(initialState);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [mobilePanel, setMobilePanel] = useState<"none" | "filters" | "stats">("none");
  const [histogramSelectedRange, setHistogramSelectedRange] =
    useState<HistogramRange | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setState((prev) => ({ ...prev, loading: true }));
      try {
        const query = new URLSearchParams({
          id_tipo_operacion: state.idTipoOperacion,
          id_tipo_inmueble: state.idTipoInmueble,
          id_ciudad: "1", // Hardcoded a Mar del Plata
        });
        const res = await fetch(`/api/inmuebles?${query.toString()}`);
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
  }, [state.idTipoOperacion, state.idTipoInmueble]);

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
          maxAgeDays: parsed.maxAgeDays ?? prev.maxAgeDays,
          idTipoOperacion: parsed.idTipoOperacion ?? prev.idTipoOperacion,
          idTipoInmueble: parsed.idTipoInmueble ?? prev.idTipoInmueble,
          selectedSource: parsed.selectedSource ?? prev.selectedSource,
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
        maxAgeDays: state.maxAgeDays,
        idTipoOperacion: state.idTipoOperacion,
        idTipoInmueble: state.idTipoInmueble,
        selectedSource: state.selectedSource,
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
    state.maxAgeDays,
    state.idTipoOperacion,
    state.idTipoInmueble,
    state.selectedSource,
    filtersOpen,
  ]);

  const filteredInmuebles =
    state.pricePerM2Min == null &&
    state.pricePerM2Max == null &&
    state.priceTotalMin == null &&
    state.priceTotalMax == null &&
    state.areaTerrenoMin == null &&
    state.areaTerrenoMax == null &&
    state.maxAgeDays == null &&
    state.selectedSource === "all"
      ? state.inmuebles
      : state.inmuebles.filter((i) => {
          if (state.selectedSource !== "all" && i.source !== state.selectedSource) {
            return false;
          }

          if (state.maxAgeDays != null && state.maxAgeDays > 0) {
            const referenceDate = i.lastUpdate ?? i.createdAt;
            // Si no hay fecha, no aplicamos el filtro de antigüedad a este inmueble
            if (referenceDate) {
              const refDateObj =
                referenceDate instanceof Date
                  ? referenceDate
                  : new Date(referenceDate as unknown as string);

              // Si la fecha no es válida, no aplicamos el filtro de antigüedad
              if (!Number.isNaN(refDateObj.getTime())) {
                const now = new Date();
                const cutoff = new Date(
                  now.getTime() - state.maxAgeDays * 24 * 60 * 60 * 1000
                );

                if (refDateObj < cutoff) {
                  return false;
                }
              }
            }
          }

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



  const cityName = "Mar del Plata";

  const hasFiltersActive =
    state.pricePerM2Min != null ||
    state.pricePerM2Max != null ||
    state.areaTerrenoMin != null ||
    state.areaTerrenoMax != null ||
    state.priceTotalMin != null ||
    state.priceTotalMax != null ||
    state.maxAgeDays != null ||
    state.selectedSource !== "all";

  const renderFiltersContent = () => (
    <div className="flex flex-col gap-4">
      {/* City & Type Grid */}
      <div className="grid grid-cols-2 gap-3">
        <select
          className="h-11 w-full rounded-xl border border-white/10 bg-slate-800/40 px-4 text-xs font-medium text-slate-200 outline-none backdrop-blur-md transition-colors focus:border-indigo-400 focus:bg-slate-800/60"
          value={state.selectedSource}
          onChange={(e) =>
            setState((prev) => ({ ...prev, selectedSource: e.target.value }))
          }
        >
          <option value="all">Todos los Orígenes</option>
          <option value="robles">Los Robles</option>
          <option value="mardelinmueble">MardelInmueble</option>
        </select>

        <select
          className="h-11 w-full rounded-xl border border-white/10 bg-slate-800/40 px-4 text-xs font-medium text-slate-200 outline-none backdrop-blur-md transition-colors focus:border-indigo-400 focus:bg-slate-800/60"
          value={state.idTipoOperacion}
          onChange={(e) =>
            setState((prev) => ({
              ...prev,
              idTipoOperacion: e.target.value,
            }))
          }
        >
          <option value="1">Venta</option>
          <option value="2">Alquiler</option>
          <option value="3">Temporal</option>
        </select>
      </div>

      <select
        className="h-11 w-full rounded-xl border border-white/10 bg-slate-800/40 px-4 text-xs font-medium text-slate-200 outline-none backdrop-blur-md transition-colors focus:border-indigo-400 focus:bg-slate-800/60"
        value={state.idTipoInmueble}
        onChange={(e) =>
          setState((prev) => ({
            ...prev,
            idTipoInmueble: e.target.value,
          }))
        }
      >
        <option value="1">Casas</option>
        <option value="2">Departamentos</option>
        <option value="3">Locales</option>
        <option value="4">Terrenos</option>
        <option value="5">Quintas</option>
        <option value="6">Cocheras</option>
      </select>

      <div className="mt-2 flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Val / M² (USD)
            </span>
            {(state.pricePerM2Min != null || state.pricePerM2Max != null) && (
              <button 
                onClick={() => setState(prev => ({ ...prev, pricePerM2Min: null, pricePerM2Max: null }))}
                className="text-[9px] font-bold text-indigo-400 uppercase tracking-tighter"
              > Limpiar </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              placeholder="Mín"
              className="h-10 w-full min-w-0 flex-1 rounded-xl border border-white/5 bg-slate-950/40 px-3 text-xs text-slate-100 outline-none transition-colors focus:border-indigo-400"
              value={state.pricePerM2Min ?? ""}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                setState((prev) => ({
                  ...prev,
                  pricePerM2Min: Number.isNaN(v) ? null : v,
                }));
              }}
            />
            <span className="text-slate-500">-</span>
            <input
              type="number"
              placeholder="Máx"
              className="h-10 w-full min-w-0 flex-1 rounded-xl border border-white/5 bg-slate-950/40 px-3 text-xs text-slate-100 outline-none transition-colors focus:border-indigo-400"
              value={state.pricePerM2Max ?? ""}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                setState((prev) => ({
                  ...prev,
                  pricePerM2Max: Number.isNaN(v) ? null : v,
                }));
              }}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Sup. (M²)
            </span>
            {(state.areaTerrenoMin != null || state.areaTerrenoMax != null) && (
              <button 
                onClick={() => setState(prev => ({ ...prev, areaTerrenoMin: null, areaTerrenoMax: null }))}
                className="text-[9px] font-bold text-indigo-400 uppercase tracking-tighter"
              > Limpiar </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              placeholder="Mín"
              className="h-10 w-full min-w-0 flex-1 rounded-xl border border-white/5 bg-slate-950/40 px-3 text-xs text-slate-100 outline-none transition-colors focus:border-indigo-400"
              value={state.areaTerrenoMin ?? ""}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                setState((prev) => ({
                  ...prev,
                  areaTerrenoMin: Number.isNaN(v) ? null : v,
                }));
              }}
            />
            <span className="text-slate-500">-</span>
            <input
              type="number"
              placeholder="Máx"
              className="h-10 w-full min-w-0 flex-1 rounded-xl border border-white/5 bg-slate-950/40 px-3 text-xs text-slate-100 outline-none transition-colors focus:border-indigo-400"
              value={state.areaTerrenoMax ?? ""}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                setState((prev) => ({
                  ...prev,
                  areaTerrenoMax: Number.isNaN(v) ? null : v,
                }));
              }}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Total USD
            </span>
            {(state.priceTotalMin != null || state.priceTotalMax != null) && (
              <button 
                onClick={() => setState(prev => ({ ...prev, priceTotalMin: null, priceTotalMax: null }))}
                className="text-[9px] font-bold text-indigo-400 uppercase tracking-tighter"
              > Limpiar </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              placeholder="Mín"
              className="h-10 w-full min-w-0 flex-1 rounded-xl border border-white/5 bg-slate-950/40 px-3 text-xs text-slate-100 outline-none transition-colors focus:border-indigo-400"
              value={state.priceTotalMin ?? ""}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                setState((prev) => ({
                  ...prev,
                  priceTotalMin: Number.isNaN(v) ? null : v,
                }));
              }}
            />
            <span className="text-slate-500">-</span>
            <input
              type="number"
              placeholder="Máx"
              className="h-10 w-full min-w-0 flex-1 rounded-xl border border-white/5 bg-slate-950/40 px-3 text-xs text-slate-100 outline-none transition-colors focus:border-indigo-400"
              value={state.priceTotalMax ?? ""}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                setState((prev) => ({
                  ...prev,
                  priceTotalMax: Number.isNaN(v) ? null : v,
                }));
              }}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Antigüedad Máx (Días)
            </span>
            {state.maxAgeDays != null && (
              <button 
                onClick={() => setState(prev => ({ ...prev, maxAgeDays: null }))}
                className="text-[9px] font-bold text-indigo-400 uppercase tracking-tighter"
              > Limpiar </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              placeholder="Ej: 30"
              className="h-10 w-full rounded-xl border border-white/5 bg-slate-950/40 px-3 text-xs text-slate-100 outline-none transition-colors focus:border-indigo-400"
              value={state.maxAgeDays ?? ""}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                setState((prev) => ({
                  ...prev,
                  maxAgeDays: Number.isNaN(v) ? null : v,
                }));
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="relative flex h-[100dvh] w-full overflow-hidden bg-slate-950 font-sans text-slate-50 selection:bg-indigo-500/30 selection:text-white">
      {/* 1. MAP BACKGROUND */}
      <main className="absolute inset-0 z-0 h-full w-full">
        {/* Soft dark overlay for the map instead of brutalist grayscale filter */}
        <div className="absolute inset-0 bg-slate-950/20 pointer-events-none z-[1]" />
        
        <MapView
          inmuebles={filteredInmuebles}
          pricePerM2Min={state.pricePerM2Min}
          pricePerM2Max={state.pricePerM2Max}
          highlightPricePerM2Range={histogramSelectedRange}
        />
      </main>

      {/* 2. DESKTOP GLASS SIDEBAR */}
      <aside
        className={`pointer-events-auto relative z-10 m-4 hidden h-[calc(100dvh-32px)] flex-col overflow-y-auto rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-2xl shadow-2xl md:flex transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${
          filtersOpen ? "w-[400px]" : "w-0 overflow-hidden border-none mx-0 opacity-0"
        }`}
      >
        <div className="flex w-[400px] flex-col overflow-x-hidden">
          <header className="flex flex-col p-8 pb-4">
            <h1 className="text-3xl font-bold tracking-tight text-white mb-1">
              Atlas <span className="text-indigo-400">Inmuebles</span>
            </h1>
            <p className="text-xs font-medium text-slate-400">
              Analítica de mercado · {cityName}
            </p>
          </header>

          <div className="flex flex-col gap-6 px-8 pb-8">
            <div className="flex flex-col">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Filtros
                </h2>
                {hasFiltersActive && (
                  <button
                    onClick={() =>
                      setState((prev) => ({
                        ...prev,
                        pricePerM2Min: null,
                        pricePerM2Max: null,
                        areaTerrenoMin: null,
                        areaTerrenoMax: null,
                        priceTotalMin: null,
                        priceTotalMax: null,
                        maxAgeDays: null,
                        selectedSource: "all",
                      }))
                    }
                    className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    Reset
                  </button>
                )}
              </div>
              <div className="pt-2">
                {renderFiltersContent()}
              </div>
              
              <div className="mt-4 flex flex-col gap-1 text-center">
                {state.loading && <span className="text-indigo-400 text-xs font-medium animate-pulse">Cargando datos...</span>}
                {!state.loading && state.error && (
                  <span className="text-rose-400 text-xs font-medium">Error: {state.error}</span>
                )}
                {!state.loading && !state.error && (
                  <span className="text-slate-400 text-xs">
                    <strong className="text-white font-semibold text-sm mr-1">{filteredInmuebles.length.toLocaleString()}</strong>
                    resultados
                  </span>
                )}
              </div>
            </div>

            <StatsPanel inmuebles={filteredInmuebles} barrios={state.barrios} />
            
            <PricePerM2Histogram
              inmuebles={filteredInmuebles}
              selectedRange={histogramSelectedRange}
              onBucketClick={(range) => setHistogramSelectedRange(range)}
            />
          </div>
        </div>
      </aside>

      {/* FLOAT BUTTON DESKTOP */}
      <div className={`absolute top-6 z-20 hidden md:block transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${filtersOpen ? 'left-[436px]' : 'left-6'}`}>
        <button
          onClick={() => setFiltersOpen(!filtersOpen)}
          className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900/80 backdrop-blur-md border border-white/10 text-white shadow-xl hover:bg-indigo-500 hover:border-indigo-400 transition-all font-medium"
        >
          {filtersOpen ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
          )}
        </button>
      </div>

      {/* 3. MOBILE: GLASS HUD */}
      <div className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-between md:hidden">
        {/* Top Header Block */}
        <div className="pointer-events-none absolute top-0 left-0 right-0 z-20 flex justify-center p-4 pt-12">
          <header className="pointer-events-auto flex items-center gap-4 rounded-2xl border border-white/10 bg-slate-900/60 px-5 py-3 backdrop-blur-2xl shadow-2xl ring-1 ring-white/10 transition-all hover:bg-slate-900/80">
            <div className="flex flex-col">
              <h1 className="text-base font-extrabold tracking-tight text-white flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]"></span>
                Atlas <span className="text-indigo-400 font-bold">Inmuebles</span>
              </h1>
              <div className="flex items-center gap-2">
                <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-slate-500">
                  {cityName}
                </p>
                <div className="h-1 w-1 rounded-full bg-slate-700"></div>
                <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-slate-400">
                  <span className="text-white">{filteredInmuebles.length}</span> Inmuebles
                </p>
              </div>
            </div>
          </header>
        </div>

        {/* Mobile Floating Action Buttons */}
        <div className="pointer-events-auto absolute bottom-10 right-6 flex flex-col gap-4">
          <button
            onClick={() => setMobilePanel(mobilePanel === "stats" ? "none" : "stats")}
            className="flex h-14 w-14 items-center justify-center rounded-xl bg-slate-800/90 backdrop-blur-xl border border-white/10 text-white shadow-2xl transition-all active:scale-90"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
          </button>
          
          <button
            onClick={() => setMobilePanel(mobilePanel === "filters" ? "none" : "filters")}
            className="flex h-14 w-14 items-center justify-center rounded-xl bg-indigo-500 text-white shadow-2xl shadow-indigo-500/40 transition-all active:scale-90 border border-indigo-400"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
          </button>
        </div>
      </div>

      {/* 4. MOBILE: BOTTOM DRAWER (Glass) */}
      <div 
        className={`pointer-events-none absolute inset-0 z-30 bg-slate-950/60 transition-opacity duration-300 md:hidden ${mobilePanel !== "none" ? "opacity-100 pointer-events-auto backdrop-blur-md" : "opacity-0"}`}
        onClick={() => setMobilePanel("none")}
      />
      <div 
        className={`pointer-events-auto absolute inset-x-0 bottom-0 z-40 transform transition-transform duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] md:hidden ${mobilePanel !== "none" ? "translate-y-0" : "translate-y-[105%]"}`}
      >
        <div className="relative flex max-h-[85dvh] w-full flex-col bg-slate-900/90 backdrop-blur-2xl rounded-t-2xl border-t border-white/10 shadow-2xl pb-safe overscroll-behavior-contain translate-z-0">
          {/* Handle indicator for mobile */}
          <div className="absolute left-1/2 top-2 h-1 w-10 -translate-x-1/2 rounded-full bg-white/20" />

          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 p-5 mt-4">
            <h2 className="text-lg font-bold text-white">
              {mobilePanel === "filters" ? "Filtros" : "Análisis de Datos"}
            </h2>
            <button
              onClick={() => setMobilePanel("none")}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 pb-10 overscroll-contain">
            <div className="flex flex-col gap-6">
              {mobilePanel === "filters" && renderFiltersContent()}
              
              {mobilePanel === "stats" && (
                <div className="flex flex-col gap-8">
                  <StatsPanel inmuebles={filteredInmuebles} barrios={state.barrios} />
                  <PricePerM2Histogram
                    inmuebles={filteredInmuebles}
                    selectedRange={histogramSelectedRange}
                    onBucketClick={(range) => setHistogramSelectedRange(range)}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
