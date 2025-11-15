import type { BarrioStats, Inmueble } from "@/lib/inmuebles";

export function StatsPanel({
  inmuebles,
  barrios,
}: {
  inmuebles: Inmueble[];
  barrios: BarrioStats[];
}) {
  const total = inmuebles.length;

  const validM2 = inmuebles.filter((i) => i.pricePerM2 != null);
  const avgPricePerM2 =
    validM2.length > 0
      ? validM2.reduce((acc, i) => acc + (i.pricePerM2 ?? 0), 0) /
        validM2.length
      : null;

  const avgPrice =
    total > 0
      ? inmuebles.reduce((acc, i) => acc + i.priceUsd, 0) / total
      : null;

  const topBarrio = barrios.find((b) => b.avgPricePerM2 != null) ?? null;
  const bottomBarrio =
    [...barrios]
      .filter((b) => b.avgPricePerM2 != null)
      .sort((a, b) => a.avgPricePerM2! - b.avgPricePerM2!)?.[0] ?? null;

  return (
    <section className="grid grid-cols-2 gap-3 rounded-3xl border border-zinc-200 bg-white/80 p-3 text-xs shadow-xl backdrop-blur-xl dark:bg-zinc-900/80 md:grid-cols-4">
      <div className="space-y-1">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
          Total inmuebles
        </div>
        <div className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          {total.toLocaleString()}
        </div>
      </div>

      <div className="space-y-1">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
          Promedio m² (global)
        </div>
        <div className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          {avgPricePerM2 ? `US$ ${avgPricePerM2.toFixed(0)} / m²` : "Sin datos"}
        </div>
      </div>

      <div className="space-y-1">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
          Precio promedio
        </div>
        <div className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          {avgPrice ? `US$ ${avgPrice.toFixed(0)}` : "Sin datos"}
        </div>
      </div>

      <div className="space-y-1">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
          Rangos por barrio
        </div>
        <div className="text-[11px] text-zinc-800 dark:text-zinc-100">
          {topBarrio && (
            <div>
              <span className="font-semibold">Más caro:</span>{" "}
              {topBarrio.barrio} ·{" "}
              {topBarrio.avgPricePerM2 &&
                `US$ ${topBarrio.avgPricePerM2.toFixed(0)} / m²`}
            </div>
          )}
          {bottomBarrio && (
            <div>
              <span className="font-semibold">Más accesible:</span>{" "}
              {bottomBarrio.barrio}{" "}
              {bottomBarrio.avgPricePerM2 &&
                `· US$ ${bottomBarrio.avgPricePerM2.toFixed(0)} / m²`}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
