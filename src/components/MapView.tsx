"use client";

import { useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { divIcon } from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Inmueble } from "@/lib/inmuebles";

const MAR_DEL_PLATA_CENTER: [number, number] = [-38.005, -57.55];

const AnyMapContainer = MapContainer as any;
const AnyTileLayer = TileLayer as any;
const AnyMarker = Marker as any;

function getColorForPricePerM2(
  value: number | null,
  min: number | null,
  max: number | null
): string {
  if (value == null || !Number.isFinite(value)) return "#9ca3af";

  const hasRange =
    min != null &&
    max != null &&
    Number.isFinite(min) &&
    Number.isFinite(max) &&
    max > min;

  if (!hasRange) {
    if (value < 600) return "#22c55e";
    if (value < 900) return "#eab308";
    if (value < 1200) return "#f97316";
    return "#ef4444";
  }

  const clamped = Math.min(Math.max(value, min as number), max as number);
  const t = (clamped - (min as number)) / ((max as number) - (min as number));

  const green = { r: 34, g: 197, b: 94 };
  const yellow = { r: 234, g: 179, b: 8 };
  const red = { r: 239, g: 68, b: 68 };

  let from;
  let to;
  let localT;

  if (t <= 0.5) {
    // De verde a amarillo en la primera mitad del rango
    from = green;
    to = yellow;
    localT = t / 0.5;
  } else {
    // De amarillo a rojo en la segunda mitad del rango
    from = yellow;
    to = red;
    localT = (t - 0.5) / 0.5;
  }

  const r = Math.round(from.r + (to.r - from.r) * localT);
  const g = Math.round(from.g + (to.g - from.g) * localT);
  const b = Math.round(from.b + (to.b - from.b) * localT);

  return `rgb(${r}, ${g}, ${b})`;
}

function createMarkerIcon(
  pricePerM2: number | null,
  baseColor: string,
  inHighlightRange: boolean,
  isActive: boolean
) {
  const highlightClasses = isActive
    ? "ring-2 ring-red-500 shadow-red-500/40 scale-[1.1]"
    : inHighlightRange
    ? "ring-2 ring-emerald-400 shadow-emerald-500/40 scale-[1.05]"
    : "ring-1 ring-zinc-900/50";

  return divIcon({
    html: `
      <div class="group relative select-none">
        <div class="inline-flex items-center justify-center rounded-full bg-zinc-950/50 ${highlightClasses} shadow-xl p-0 border border-zinc-800/20 backdrop-blur">
          <span class="inline-block h-4 w-4 rounded-full" style="background:${baseColor}"></span>
        </div>
      </div>
    `,
    className: "",
    iconSize: [20, 20],
    iconAnchor: [10, 0],
  });
}

type PricePerM2Range = { min: number; max: number };

type MapViewProps = {
  inmuebles: Inmueble[];
  pricePerM2Min?: number | null;
  pricePerM2Max?: number | null;
  highlightPricePerM2Range?: PricePerM2Range | null;
};

export function MapView({
  inmuebles,
  pricePerM2Min,
  pricePerM2Max,
  highlightPricePerM2Range,
}: MapViewProps) {
  const [activeId, setActiveId] = useState<number | null>(null);

  const active =
    activeId != null ? inmuebles.find((i) => i.id === activeId) ?? null : null;

  const priceValues = inmuebles
    .map((i) => i.pricePerM2)
    .filter((v): v is number => v != null && Number.isFinite(v));

  const dynamicMin =
    pricePerM2Min != null && Number.isFinite(pricePerM2Min)
      ? pricePerM2Min
      : priceValues.length > 0
      ? Math.min(...priceValues)
      : null;

  const dynamicMax =
    pricePerM2Max != null && Number.isFinite(pricePerM2Max)
      ? pricePerM2Max
      : priceValues.length > 0
      ? Math.max(...priceValues)
      : null;

  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl border border-zinc-200 bg-zinc-950/90 shadow-xl">
      <AnyMapContainer
        center={MAR_DEL_PLATA_CENTER}
        zoom={12}
        className="h-full w-full"
        scrollWheelZoom
      >
        <AnyTileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {inmuebles.map((i) => {
          const value = i.pricePerM2;
          const inHighlightRange =
            value != null &&
            Number.isFinite(value) &&
            highlightPricePerM2Range != null &&
            value >= highlightPricePerM2Range.min &&
            value < highlightPricePerM2Range.max;

          const baseColor = getColorForPricePerM2(
            i.pricePerM2,
            dynamicMin,
            dynamicMax
          );

          const markerIcon = createMarkerIcon(
            i.pricePerM2 ?? null,
            baseColor,
            inHighlightRange,
            activeId === i.id
          );

          return (
            <AnyMarker
              key={i.id}
              position={[i.lat, i.lng]}
              icon={markerIcon}
              eventHandlers={{
                click: () => setActiveId(i.id),
              }}
            />
          );
        })}

        {active && (
          <Popup
            position={[active.lat, active.lng]}
            eventHandlers={{
              remove: () => setActiveId(null),
            }}
          >
            <div className="w-100 max-w-xs rounded-lg bg-zinc-950/95 p-3 shadow-xl ring-1 ring-zinc-800">
              <div className="space-y-1">
                <div className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">
                  {active.barrio ?? "Sin barrio"}
                </div>
                <div className="text-sm font-semibold leading-snug text-zinc-50">
                  {active.calle} {active.numero}
                </div>
              </div>

              <div className="mt-3 space-y-3 text-[11px] text-zinc-300">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="text-[11px] font-medium text-zinc-400">
                      Precio
                    </div>
                    <div className="text-base font-semibold text-zinc-50">
                      {active.priceUsd.toLocaleString("es-AR")}{" "}
                      <span className="text-[11px] font-medium text-zinc-400">
                        USD
                      </span>
                    </div>
                  </div>
                  <div className="space-y-0.5 text-right">
                    <div className="text-[11px] font-medium text-zinc-400">
                      Precio / m² (ponderado)
                    </div>
                    <div className="text-sm font-semibold text-emerald-400">
                      {active.pricePerM2 ? (
                        <>
                          {active.pricePerM2.toLocaleString("es-AR", {
                            maximumFractionDigits: 0,
                          })}{" "}
                          <span className="text-[10px] font-medium text-emerald-300/80">
                            usd/m2
                          </span>
                        </>
                      ) : (
                        "Sin datos"
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 border-t border-zinc-800 pt-2">
                  <div className="space-y-0.5">
                    <div className="text-[10px] font-medium text-zinc-500">
                      Sup. cubierta
                    </div>
                    <div className="font-semibold text-zinc-50">
                      {active.areaCubiertaM2 ? (
                        <>
                          {active.areaCubiertaM2.toFixed(0)}{" "}
                          <span className="text-[10px] font-medium text-zinc-400">
                            m²
                          </span>
                        </>
                      ) : (
                        "—"
                      )}
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-[10px] font-medium text-zinc-500">
                      Sup. terreno
                    </div>
                    <div className="font-semibold text-zinc-50">
                      {active.areaTerrenoM2 ? (
                        <>
                          {active.areaTerrenoM2.toFixed(0)}{" "}
                          <span className="text-[10px] font-medium text-zinc-400">
                            m²
                          </span>
                        </>
                      ) : (
                        "—"
                      )}
                    </div>
                  </div>
                  <div className="space-y-0.5 text-right">
                    <div className="text-[10px] font-medium text-zinc-500">
                      m² ponderados
                    </div>
                    <div className="font-semibold text-zinc-50">
                      {active.areaM2 ? (
                        <>
                          {active.areaM2.toFixed(0)}{" "}
                          <span className="text-[10px] font-medium text-zinc-400">
                            m²
                          </span>
                        </>
                      ) : (
                        "—"
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="inline-flex items-center gap-1 rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-100">
                    <span>Ambientes</span>
                    <span className="font-semibold">
                      {active.ambientes != null ? active.ambientes : "—"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Popup>
        )}
      </AnyMapContainer>
    </div>
  );
}
