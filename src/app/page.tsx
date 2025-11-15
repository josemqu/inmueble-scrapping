"use client";

import { useEffect, useMemo, useState } from "react";
import type { BarrioStats, Inmueble, InmueblesResponse } from "@/lib/inmuebles";
import { MapView } from "@/components/MapView";
import { SidebarFilters } from "@/components/SidebarFilters";
import { StatsPanel } from "@/components/StatsPanel";

type State = {
  inmuebles: Inmueble[];
  barrios: BarrioStats[];
  selectedBarrios: string[];
  loading: boolean;
  error: string | null;
};

const initialState: State = {
  inmuebles: [],
  barrios: [],
  selectedBarrios: [],
  loading: true,
  error: null,
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

  const filteredInmuebles = useMemo(() => {
    if (!state.selectedBarrios.length) return state.inmuebles;
    const set = new Set(state.selectedBarrios);
    return state.inmuebles.filter((i) =>
      i.barrio ? set.has(i.barrio) : set.has("Sin barrio")
    );
  }, [state.inmuebles, state.selectedBarrios]);

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-zinc-50">
      <main className="flex min-h-screen flex-1 flex-col gap-4 px-4 py-4 md:px-6 md:py-6">
        <header className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight md:text-2xl">
              Análisis de valor m² · Mar del Plata
            </h1>
            <p className="mt-1 max-w-xl text-xs text-zinc-400 md:text-sm">
              Datos en tiempo real desde la API de Mar del Inmueble. Explorá
              cómo varía el precio por metro cuadrado según el barrio.
            </p>
          </div>
          <div className="text-[11px] text-zinc-400">
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
        </header>

        <section className="grid flex-1 grid-cols-1 gap-4 md:grid-cols-[minmax(260px,320px)_minmax(0,1fr)]">
          <div className="flex flex-col gap-3">
            <SidebarFilters
              barrios={state.barrios}
              onSelectionChange={(selectedBarrios) =>
                setState((prev) => ({ ...prev, selectedBarrios }))
              }
            />
            <StatsPanel inmuebles={filteredInmuebles} barrios={state.barrios} />
          </div>

          <div className="h-[420px] md:h-auto">
            <MapView inmuebles={filteredInmuebles} />
          </div>
        </section>
      </main>
    </div>
  );
}
