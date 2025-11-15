"use client";

import type { BarrioStats } from "@/lib/inmuebles";
import { useMemo, useState } from "react";

export type SidebarFiltersProps = {
  barrios: BarrioStats[];
  onSelectionChange: (selectedBarrios: string[]) => void;
};

export function SidebarFilters({
  barrios,
  onSelectionChange,
}: SidebarFiltersProps) {
  const [selected, setSelected] = useState<string[]>([]);

  const topBarrios = useMemo(() => {
    return barrios.slice(0, 25);
  }, [barrios]);

  const handleToggle = (barrio: string) => {
    setSelected((prev) => {
      const exists = prev.includes(barrio);
      const next = exists
        ? prev.filter((b) => b !== barrio)
        : [...prev, barrio];
      onSelectionChange(next);
      return next;
    });
  };

  const handleClear = () => {
    setSelected([]);
    onSelectionChange([]);
  };

  return (
    <aside className="flex h-full flex-col rounded-3xl border border-zinc-200 bg-white/80 p-4 shadow-xl backdrop-blur-xl dark:bg-zinc-900/80">
      <header className="mb-4 space-y-1">
        <h1 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Mapa de valor m²
        </h1>
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          Filtrá por barrio para ver el precio promedio por metro cuadrado.
        </p>
      </header>

      <div className="mb-3 flex items-center justify-between gap-2 text-xs">
        <span className="font-medium text-zinc-700 dark:text-zinc-200">
          {barrios.length} barrios
        </span>
        <button
          type="button"
          onClick={handleClear}
          className="rounded-full border border-zinc-200 px-3 py-1 text-[11px] font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          Limpiar filtros
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pr-1 text-xs">
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
          Barrios por precio promedio m²
        </div>
        <ul className="space-y-1.5">
          {topBarrios.map((b) => {
            const isActive = selected.includes(b.barrio);
            return (
              <li key={b.barrio}>
                <button
                  type="button"
                  onClick={() => handleToggle(b.barrio)}
                  className={`flex w-full items-center justify-between rounded-2xl px-3 py-2 text-left transition ${
                    isActive
                      ? "bg-zinc-900 text-zinc-50 shadow-sm dark:bg-zinc-50 dark:text-zinc-900"
                      : "bg-zinc-100/70 text-zinc-800 hover:bg-zinc-200/80 dark:bg-zinc-800/70 dark:text-zinc-100 dark:hover:bg-zinc-700/80"
                  }`}
                >
                  <div>
                    <div className="text-[11px] font-semibold leading-tight">
                      {b.barrio}
                    </div>
                    <div className="text-[10px] text-zinc-600 dark:text-zinc-300">
                      {b.avgPricePerM2
                        ? `US$ ${b.avgPricePerM2.toFixed(0)} / m²`
                        : "Sin datos m²"}
                    </div>
                  </div>
                  <div className="text-[10px] font-medium text-zinc-500 dark:text-zinc-300">
                    {b.count} inm.
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <footer className="mt-3 border-t border-dashed border-zinc-200 pt-3 text-[10px] text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
        <div className="font-semibold">Leyenda m² (color):</div>
        <div>
          ● &lt; 600: verde · 600-900: amarillo · 900-1200: naranja · &gt; 1200:
          rojo
        </div>
      </footer>
    </aside>
  );
}
