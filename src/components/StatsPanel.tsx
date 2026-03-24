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
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-white/5 pb-4">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Resumen estadístico
          </div>
          <div className="text-3xl font-bold leading-tight text-white mt-1">
            {total.toLocaleString()} <span className="text-sm font-medium text-slate-500">propiedades</span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1 rounded-xl bg-white/[0.03] p-4 border border-white/5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Promedio m²
          </div>
          <div className="text-xl font-bold text-white">
            {avgPricePerM2 ? (
              <>
                {avgPricePerM2.toLocaleString("es-AR", {
                  maximumFractionDigits: 0,
                })}{" "}
                <span className="text-xs font-medium text-slate-500">usd/m²</span>
              </>
            ) : "—"}
          </div>
          {medianPricePerM2 && (
            <div className="text-[10px] font-medium text-slate-500">
              MEDIANA: <span className="text-slate-300 font-bold">{medianPricePerM2.toLocaleString("es-AR", { maximumFractionDigits: 0 })}</span>
            </div>
          )}
        </div>

        <div className="space-y-1 rounded-xl bg-white/[0.03] p-4 border border-white/5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Val. Promedio
          </div>
          <div className="text-xl font-bold text-white">
            {avgPrice ? (
              <>
                {avgPrice.toLocaleString("es-AR", {
                  maximumFractionDigits: 0,
                })}{" "}
                <span className="text-xs font-medium text-slate-500">USD</span>
              </>
            ) : "—"}
          </div>
        </div>
      </div>
    </section>
  );
}
