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

  const medianPricePerM2 =
    validM2.length > 0
      ? (() => {
          const sorted = [...validM2]
            .map((i) => i.pricePerM2 ?? 0)
            .sort((a, b) => a - b);
          const mid = Math.floor(sorted.length - 1) / 2;
          const lower = sorted[Math.floor(mid)];
          const upper = sorted[Math.ceil(mid)];
          return (lower + upper) / 2;
        })()
      : null;

  const avgPrice =
    total > 0
      ? inmuebles.reduce((acc, i) => acc + i.priceUsd, 0) / total
      : null;

  const barriosWithData = barrios.filter((b) => b.avgPricePerM2 != null);
  const barriosConDatos = barriosWithData.length;

  const topBarrio =
    barriosWithData.length > 0
      ? [...barriosWithData].sort(
          (a, b) => (b.avgPricePerM2 ?? 0) - (a.avgPricePerM2 ?? 0)
        )[0]
      : null;

  const bottomBarrio =
    barriosWithData.length > 0
      ? [...barriosWithData].sort(
          (a, b) => (a.avgPricePerM2 ?? 0) - (b.avgPricePerM2 ?? 0)
        )[0]
      : null;

  return (
    <section className="rounded-xl border border-zinc-200 bg-white/80 p-4 text-xs shadow-xl backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-900/80 md:p-5">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-zinc-200 pb-3 dark:border-zinc-800">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
            Total de inmuebles analizados
          </div>
          <div className="text-2xl font-semibold leading-tight text-zinc-900 dark:text-zinc-50">
            {total.toLocaleString()}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-[11px] text-zinc-500">
          <span className="inline-flex items-center gap-1 rounded-full border border-zinc-300 px-2 py-0.5 dark:border-zinc-700">
            {barriosConDatos.toLocaleString()} barrios con datos de m²
          </span>
          {validM2.length > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-2 py-0.5 text-emerald-300">
              {validM2.length.toLocaleString()} inmuebles con precio por m²
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="space-y-1 rounded-xl bg-zinc-50/80 p-3 dark:bg-zinc-900/80">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
            Promedio m² (global)
          </div>
          <div className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            {avgPricePerM2 ? (
              <>
                {avgPricePerM2.toLocaleString("es-AR", {
                  maximumFractionDigits: 0,
                })}{" "}
                <span className="text-[10px] font-medium text-zinc-500">
                  usd/m2
                </span>
              </>
            ) : (
              "Sin datos"
            )}
          </div>
          {medianPricePerM2 && (
            <div className="text-[11px] text-zinc-500">
              Mediana:{" "}
              <span className="font-medium text-zinc-800 dark:text-zinc-100">
                {medianPricePerM2.toLocaleString("es-AR", {
                  maximumFractionDigits: 0,
                })}{" "}
                <span className="text-[10px] font-medium text-zinc-500">
                  usd/m2
                </span>
              </span>
            </div>
          )}
        </div>

        <div className="space-y-1 rounded-xl bg-zinc-50/80 p-3 dark:bg-zinc-900/80">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
            Precio total promedio
          </div>
          <div className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            {avgPrice ? (
              <>
                {avgPrice.toLocaleString("es-AR", {
                  maximumFractionDigits: 0,
                })}{" "}
                <span className="text-[11px] font-medium text-zinc-500">
                  USD
                </span>
              </>
            ) : (
              "Sin datos"
            )}
          </div>
        </div>

        {false && (
          <div className="space-y-1 rounded-xl bg-zinc-50/80 p-3 dark:bg-zinc-900/80">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
              Rangos por barrio
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
