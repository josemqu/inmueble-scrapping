"use client";

import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import type { Inmueble } from "@/lib/inmuebles";

const BUCKET_SIZE = 100; // USD/m²

function buildBuckets(values: number[]) {
  if (values.length === 0)
    return { categories: [] as string[], data: [] as number[] };

  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);

  const start = Math.max(0, Math.floor(minValue / BUCKET_SIZE) * BUCKET_SIZE);
  const end = Math.ceil(maxValue / BUCKET_SIZE) * BUCKET_SIZE;

  const categories: string[] = [];
  const ranges: { min: number; max: number }[] = [];

  for (let v = start; v < end; v += BUCKET_SIZE) {
    const min = v;
    const max = v + BUCKET_SIZE;
    categories.push(`${min}–${max}`);
    ranges.push({ min, max });
  }

  const data = ranges.map((r, index) => {
    const count = values.filter((v) => {
      // Primer bucket incluye el límite inferior, todos son [min, max)
      if (index === 0) return v >= r.min && v < r.max;
      return v >= r.min && v < r.max;
    }).length;
    return count;
  });

  return { categories, data };
}

export function PricePerM2Histogram({ inmuebles }: { inmuebles: Inmueble[] }) {
  const values = inmuebles
    .map((i) => i.pricePerM2)
    .filter((v): v is number => v != null && Number.isFinite(v));

  const total = values.length;

  const { categories, data } = buildBuckets(values);

  if (total === 0 || categories.length === 0) {
    return (
      <section className="rounded-xl border border-zinc-200 bg-white/80 p-4 text-xs shadow-xl backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-900/80 md:p-5">
        <header className="border-b border-zinc-200 pb-3 dark:border-zinc-800">
          <div className="flex items-baseline justify-between gap-3">
            <div>
              <h2 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                Histograma precio / m²
              </h2>
              <p className="mt-0.5 text-[10px] text-zinc-500 dark:text-zinc-400">
                Aún no hay suficientes datos de precio por metro cuadrado.
              </p>
            </div>
          </div>
        </header>
      </section>
    );
  }

  const options: Highcharts.Options = {
    chart: {
      type: "column",
      backgroundColor: "transparent",
      height: 260,
    },
    title: { text: undefined },
    xAxis: {
      categories,
      title: { text: "Precio por m² (USD)" },
      labels: {
        style: {
          color: "#a1a1aa",
          fontSize: "10px",
        },
      },
    },
    yAxis: {
      min: 0,
      title: { text: "Cantidad de inmuebles" },
      labels: {
        style: {
          color: "#a1a1aa",
          fontSize: "10px",
        },
      },
      gridLineColor: "#27272a",
    },
    legend: { enabled: false },
    tooltip: {
      shared: false,
      pointFormat: "<b>{point.y}</b> inmuebles",
    },
    series: [
      {
        type: "column",
        name: "Inmuebles",
        data,
        color: "#22c55e",
        borderWidth: 1,
        borderColor: "#aaffaa",
        borderRadius: 1,
      },
    ],
    credits: { enabled: false },
  };

  return (
    <section className="rounded-xl border border-zinc-200 bg-white/80 p-4 text-xs shadow-xl backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-900/80 md:p-5">
      <header className="border-b border-zinc-200 pb-3 dark:border-zinc-800">
        <div className="flex items-baseline justify-between gap-3">
          <div>
            <h2 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
              Histograma precio / m²
            </h2>
          </div>
          <div className="text-[10px] text-zinc-500 dark:text-zinc-400">
            {total.toLocaleString()} con datos m²
          </div>
        </div>
      </header>

      <div className="mt-4">
        <HighchartsReact highcharts={Highcharts} options={options} />
      </div>

      <footer className="mt-3 text-[10px] text-zinc-500 dark:text-zinc-400">
        Basado en el valor ponderado del m² (área cubierta + descubierta).
      </footer>
    </section>
  );
}
