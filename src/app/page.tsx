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
      <main className="flex min-h-screen flex-1 flex-col gap-4 px-4 py-4 md:px-6 md:py-6">
        <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight md:text-2xl">
              Análisis de valor m² · Mar del Plata
            </h1>
            <p className="mt-1 max-w-xl text-xs text-zinc-400 md:text-sm">
              Datos en tiempo real desde la API de Mar del Inmueble. Explorá
              cómo varía el precio por metro cuadrado según el barrio.
            </p>
          </div>
          <div className="flex flex-col gap-2 text-[11px] text-zinc-400 md:items-end">
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
                  {state.inmuebles.length.toLocaleString()} inmuebles cargados
                </span>
              )}
            </div>
          </div>
        </header>

        <section className="grid flex-1 grid-cols-1 gap-4 md:grid-cols-[minmax(260px,320px)_minmax(0,1fr)]">
          <div className="flex flex-col gap-3">
            <StatsPanel inmuebles={state.inmuebles} barrios={state.barrios} />
            <PricePerM2Histogram inmuebles={filteredInmuebles} />
          </div>

          <div className="h-full min-h-[320px]">
            <MapView
              inmuebles={filteredInmuebles}
              pricePerM2Min={state.pricePerM2Min}
              pricePerM2Max={state.pricePerM2Max}
            />
          </div>
        </section>
      </main>
    </div>
  );
}
