import { useEffect, useMemo, useRef, useState } from "react";
import type { Inmueble } from "@/lib/inmuebles";

type InmueblePopupContentProps = {
  inmueble: Inmueble;
  carouselImages: string[];
};

export function InmueblePopupContent({
  inmueble,
  carouselImages,
}: InmueblePopupContentProps) {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [transitionToIndex, setTransitionToIndex] = useState<number | null>(
    null,
  );
  const [transitionDirection, setTransitionDirection] = useState<
    "next" | "prev" | null
  >(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [animateTrack, setAnimateTrack] = useState(false);
  const [loadedByUrl, setLoadedByUrl] = useState<Record<string, boolean>>({});
  const inflightRef = useRef<Set<string>>(new Set());

  const markLoaded = (url: string) => {
    setLoadedByUrl((prev) => (prev[url] ? prev : { ...prev, [url]: true }));
  };

  const ensurePreloaded = (url: string) => {
    if (!url) return Promise.resolve();
    if (loadedByUrl[url]) return Promise.resolve();
    if (inflightRef.current.has(url)) return Promise.resolve();

    inflightRef.current.add(url);
    return new Promise<void>((resolve) => {
      const img = new Image();
      img.onload = () => {
        inflightRef.current.delete(url);
        markLoaded(url);
        resolve();
      };
      img.onerror = () => {
        inflightRef.current.delete(url);
        markLoaded(url);
        resolve();
      };
      img.src = url;
    });
  };

  useEffect(() => {
    setActiveImageIndex(0);
    setTransitionToIndex(null);
    setTransitionDirection(null);
    setIsTransitioning(false);
    setAnimateTrack(false);
    setLoadedByUrl({});
    inflightRef.current = new Set();
  }, [carouselImages]);

  useEffect(() => {
    if (carouselImages.length === 0) return;
    for (const url of carouselImages) {
      void ensurePreloaded(url);
    }
  }, [carouselImages]);

  useEffect(() => {
    if (!isTransitioning) return;
    if (transitionToIndex == null || transitionDirection == null) return;

    let raf1 = 0;
    let raf2 = 0;

    raf1 = window.requestAnimationFrame(() => {
      raf2 = window.requestAnimationFrame(() => {
        setAnimateTrack(true);
      });
    });

    return () => {
      if (raf1) window.cancelAnimationFrame(raf1);
      if (raf2) window.cancelAnimationFrame(raf2);
    };
  }, [isTransitioning, transitionDirection, transitionToIndex]);

  const carouselImage = useMemo(() => {
    if (carouselImages.length === 0) return null;
    const idx = Math.min(activeImageIndex, carouselImages.length - 1);
    return carouselImages[idx] ?? null;
  }, [activeImageIndex, carouselImages]);

  const handlePrevImage = () => {
    if (carouselImages.length <= 1) return;
    if (isTransitioning) return;

    const nextIndex =
      activeImageIndex <= 0 ? carouselImages.length - 1 : activeImageIndex - 1;
    const nextUrl = carouselImages[nextIndex];
    if (nextUrl && !loadedByUrl[nextUrl]) {
      void ensurePreloaded(nextUrl).then(() => {
        setTransitionDirection("prev");
        setTransitionToIndex(nextIndex);
        setIsTransitioning(true);
        setAnimateTrack(false);
      });
      return;
    }
    setTransitionDirection("prev");
    setTransitionToIndex(nextIndex);
    setIsTransitioning(true);
    setAnimateTrack(false);
  };

  const handleNextImage = () => {
    if (carouselImages.length <= 1) return;
    if (isTransitioning) return;

    const nextIndex =
      activeImageIndex >= carouselImages.length - 1 ? 0 : activeImageIndex + 1;
    const nextUrl = carouselImages[nextIndex];
    if (nextUrl && !loadedByUrl[nextUrl]) {
      void ensurePreloaded(nextUrl).then(() => {
        setTransitionDirection("next");
        setTransitionToIndex(nextIndex);
        setIsTransitioning(true);
        setAnimateTrack(false);
      });
      return;
    }
    setTransitionDirection("next");
    setTransitionToIndex(nextIndex);
    setIsTransitioning(true);
    setAnimateTrack(false);
  };

  const transitionToImage =
    transitionToIndex != null
      ? (carouselImages[transitionToIndex] ?? null)
      : null;

  const finishTransition = () => {
    if (transitionToIndex == null) return;
    setActiveImageIndex(transitionToIndex);
    setTransitionToIndex(null);
    setTransitionDirection(null);
    setIsTransitioning(false);
    setAnimateTrack(false);
  };

  useEffect(() => {
    if (!isTransitioning) return;
    if (transitionToIndex == null) return;
    const t = window.setTimeout(() => {
      finishTransition();
    }, 450);
    return () => window.clearTimeout(t);
  }, [isTransitioning, transitionToIndex]);

  return (
    <div className="w-100 max-w-xs rounded-lg bg-zinc-950/95 p-3 shadow-xl ring-1 ring-zinc-800">
      {carouselImage && (
        <div className="mb-3 overflow-hidden rounded-md border border-zinc-800/60">
          <div className="relative">
            <div className="relative h-32 w-full overflow-hidden">
              {transitionToImage && transitionDirection ? (
                <div
                  className={`absolute inset-0 flex w-[200%] ${animateTrack ? "transition-transform duration-300 ease-in-out" : ""}`}
                  style={{
                    transform:
                      transitionDirection === "next"
                        ? animateTrack
                          ? "translateX(-50%)"
                          : "translateX(0%)"
                        : animateTrack
                          ? "translateX(0%)"
                          : "translateX(-50%)",
                  }}
                  onTransitionEnd={() => finishTransition()}
                >
                  {transitionDirection === "next" ? (
                    <>
                      <img
                        src={carouselImage}
                        alt={inmueble.title}
                        className="h-32 w-1/2 object-cover bg-zinc-900"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        onLoad={() => markLoaded(carouselImage)}
                      />
                      <img
                        src={transitionToImage}
                        alt={inmueble.title}
                        className="h-32 w-1/2 object-cover bg-zinc-900"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        onLoad={() => markLoaded(transitionToImage)}
                      />
                    </>
                  ) : (
                    <>
                      <img
                        src={transitionToImage}
                        alt={inmueble.title}
                        className="h-32 w-1/2 object-cover bg-zinc-900"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        onLoad={() => markLoaded(transitionToImage)}
                      />
                      <img
                        src={carouselImage}
                        alt={inmueble.title}
                        className="h-32 w-1/2 object-cover bg-zinc-900"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        onLoad={() => markLoaded(carouselImage)}
                      />
                    </>
                  )}
                </div>
              ) : (
                <img
                  src={carouselImage}
                  alt={inmueble.title}
                  className="h-32 w-full object-cover bg-zinc-900"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  onLoad={() => markLoaded(carouselImage)}
                />
              )}
            </div>

            {carouselImages.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handlePrevImage();
                  }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full border border-zinc-700/60 bg-zinc-950/70 px-2 py-1 text-xs font-semibold text-zinc-100 backdrop-blur hover:bg-zinc-900/80"
                  aria-label="Foto anterior"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleNextImage();
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full border border-zinc-700/60 bg-zinc-950/70 px-2 py-1 text-xs font-semibold text-zinc-100 backdrop-blur hover:bg-zinc-900/80"
                  aria-label="Foto siguiente"
                >
                  ›
                </button>

                <div className="absolute bottom-2 right-2 rounded-full border border-zinc-700/60 bg-zinc-950/70 px-2 py-0.5 text-[10px] font-medium text-zinc-100 backdrop-blur">
                  {activeImageIndex + 1}/{carouselImages.length}
                </div>
              </>
            )}
          </div>
        </div>
      )}
      <div className="space-y-1">
        <div className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">
          {inmueble.barrio ?? "Sin barrio"}
        </div>
        <div className="text-sm font-semibold leading-snug text-zinc-50">
          {inmueble.calle} {inmueble.numero}
        </div>
        <a
          href={inmueble.publicUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex text-[11px] font-medium text-sky-300 hover:text-sky-200"
        >
          Ver publicación
        </a>
      </div>

      <div className="mt-3 space-y-3 text-[11px] text-zinc-300">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-0.5">
            <div className="text-[11px] font-medium text-zinc-400">Precio</div>
            <div className="text-base font-semibold text-zinc-50">
              {inmueble.priceUsd.toLocaleString("es-AR")}{" "}
              <span className="text-[11px] font-medium text-zinc-400">USD</span>
            </div>
          </div>
          <div className="space-y-0.5 text-right">
            <div className="text-[11px] font-medium text-zinc-400">
              Precio / m² (ponderado)
            </div>
            <div className="text-sm font-semibold text-emerald-400">
              {inmueble.pricePerM2 ? (
                <>
                  {inmueble.pricePerM2.toLocaleString("es-AR", {
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
              {inmueble.areaCubiertaM2 ? (
                <>
                  {inmueble.areaCubiertaM2.toFixed(0)}{" "}
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
              {inmueble.areaTerrenoM2 ? (
                <>
                  {inmueble.areaTerrenoM2.toFixed(0)}{" "}
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
              {inmueble.areaM2 ? (
                <>
                  {inmueble.areaM2.toFixed(0)}{" "}
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
              {inmueble.ambientes != null ? inmueble.ambientes : "—"}
            </span>
          </div>

          <div className="text-[10px] font-medium text-zinc-500">
            ID {inmueble.id}
          </div>
        </div>
      </div>
    </div>
  );
}
