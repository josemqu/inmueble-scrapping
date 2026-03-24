"use client";

import { useEffect, useState, useMemo } from "react";
import type { ComponentType } from "react";
import { MapContainer, TileLayer, Marker, Popup, ZoomControl, useMap } from "react-leaflet";
import { divIcon } from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Inmueble } from "@/lib/inmuebles";
import { InmueblePopupContent } from "@/components/InmueblePopupContent";

const MAR_DEL_PLATA_CENTER: [number, number] = [-38.005, -57.55];

const AnyMapContainer = MapContainer as unknown as ComponentType<
  Record<string, unknown>
>;
const AnyTileLayer = TileLayer as unknown as ComponentType<
  Record<string, unknown>
>;
const AnyMarker = Marker as unknown as ComponentType<Record<string, unknown>>;

function getColorForPricePerM2(
  value: number | null,
  min: number | null,
  max: number | null,
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
  isActive: boolean,
) {
  const highlightClasses = isActive
    ? "ring-4 ring-indigo-500/50 shadow-[0_0_20px_rgba(99,102,241,0.4)] scale-110 z-50"
    : inHighlightRange
      ? "ring-2 ring-emerald-400/60 shadow-[0_0_12px_rgba(52,211,153,0.3)] scale-105"
      : "ring-1 ring-white/20";

  return divIcon({
    html: `
      <div class="group relative select-none">
        <div class="inline-flex items-center justify-center rounded-full bg-slate-950/60 ${highlightClasses} shadow-2xl p-0.5 border border-white/10 backdrop-blur-sm">
          <span class="inline-block h-3.5 w-3.5 rounded-full" style="background:${baseColor}"></span>
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

function LocateMeControl({ position }: { position: [number, number] }) {
  const map = useMap();

  return (
    <div className="leaflet-bottom leaflet-left pointer-events-auto mb-4 ml-4">
      <button
        onClick={() => map.flyTo(position, 15)}
        className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 border border-white/20 text-white shadow-lg backdrop-blur-md transition-all hover:bg-slate-800 hover:scale-105 active:scale-95"
        title="Centrar en mi ubicación"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v3" />
          <path d="M12 19v3" />
          <path d="M22 12h-3" />
          <path d="M5 12H2" />
        </svg>
      </button>
    </div>
  );
}

export function MapView({
  inmuebles,
  pricePerM2Min,
  pricePerM2Max,
  highlightPricePerM2Range,
}: MapViewProps) {
  const [activeId, setActiveId] = useState<number | null>(null);
  const [activeImages, setActiveImages] = useState<string[] | null>(null);
  const [userPosition, setUserPosition] = useState<[number, number] | null>(null);

  const activate = (inmueble: Inmueble) => {
    if (activeId === inmueble.id) return;
    setActiveId(inmueble.id);
    setActiveImages(inmueble.galleryUrls && inmueble.galleryUrls.length > 0 ? inmueble.galleryUrls : null);
  };

  const deactivate = () => {
    setActiveId(null);
    setActiveImages(null);
  };

  const active =
    activeId != null
      ? (inmuebles.find((i) => i.id === activeId) ?? null)
      : null;

  useEffect(() => {
    let cancelled = false;

    if (activeId == null) {
      return;
    }

    const load = async () => {
      try {
        const res = await fetch(`/api/inmuebles/${activeId}`);
        if (!res.ok) return;
        const json = (await res.json()) as { images?: string[] };
        if (cancelled) return;
        const imgs = Array.isArray(json.images) ? json.images : [];
        setActiveImages(imgs);
      } catch {
        // ignore
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [activeId]);

  useEffect(() => {
    if (!navigator.geolocation) return;

    const watcher = navigator.geolocation.watchPosition(
      (position) => {
        setUserPosition([position.coords.latitude, position.coords.longitude]);
      },
      (error) => {
        console.error("Error getting location:", error);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 5000,
      }
    );

    return () => navigator.geolocation.clearWatch(watcher);
  }, []);

  const userLocationIcon = useMemo(() => {
    return divIcon({
      html: `
        <div class="relative">
          <div class="absolute -inset-4 rounded-full bg-blue-500/20 animate-pulse"></div>
          <div class="absolute -inset-2 rounded-full bg-blue-500/40 animate-ping"></div>
          <div class="relative flex h-4 w-4 rounded-full border-2 border-white bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.6)]"></div>
        </div>
      `,
      className: "",
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });
  }, []);

  const carouselImages = useMemo(() => {
    const base = 
      activeImages && activeImages.length > 0
        ? activeImages
        : active?.galleryUrls && active.galleryUrls.length > 0
          ? active.galleryUrls
          : active?.coverImageUrl
            ? [active.coverImageUrl]
            : [];
    return base.filter((url): url is string => !!url && typeof url === "string" && url.trim().length > 0);
  }, [activeImages, active?.galleryUrls, active?.coverImageUrl]);

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
    <div className="relative h-full w-full overflow-hidden bg-slate-950">
      <AnyMapContainer
        center={MAR_DEL_PLATA_CENTER}
        zoom={12}
        className="h-full w-full leaflet-tile-color-filter"
        scrollWheelZoom
        zoomControl={false}
      >
        <ZoomControl position="bottomright" />
        <AnyTileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {userPosition && <LocateMeControl position={userPosition} />}

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
            dynamicMax,
          );

          const markerIcon = createMarkerIcon(
            i.pricePerM2 ?? null,
            baseColor,
            inHighlightRange,
            activeId === i.id,
          );

          return (
            <AnyMarker
              key={i.id}
              position={[i.lat, i.lng]}
              icon={markerIcon}
              eventHandlers={{
                click: () => activate(i),
              }}
            />
          );
        })}

        {userPosition && (
          <AnyMarker
            position={userPosition}
            icon={userLocationIcon}
            zIndexOffset={1000}
          />
        )}

        {active && (
          <Popup
            position={[active.lat, active.lng]}
            eventHandlers={{
              remove: () => deactivate(),
            }}
          >
            <div className="popup-content-animate">
              <InmueblePopupContent
                inmueble={active}
                carouselImages={carouselImages}
              />
            </div>
          </Popup>
        )}
      </AnyMapContainer>
    </div>
  );
}
