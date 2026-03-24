import { useEffect, useMemo, useRef, useState } from "react";
import type { Inmueble } from "@/lib/inmuebles";
import { Building2, Trees } from "lucide-react";

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
  
  const ageInDays = useMemo(() => {
    const date = inmueble.lastUpdate ?? inmueble.createdAt;
    if (!date) return null;
    const refDate = date instanceof Date ? date : new Date(date as unknown as string);
    if (isNaN(refDate.getTime())) return null;
    const diff = new Date().getTime() - refDate.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }, [inmueble.createdAt, inmueble.lastUpdate]);

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
  }, [inmueble.id]);

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
    if (carouselImages.length === 0) return "";
    const idx = Math.min(activeImageIndex, carouselImages.length - 1);
    return carouselImages[idx] || "";
  }, [activeImageIndex, carouselImages]);

  const handlePrevImage = () => {
    if (carouselImages.length <= 1) return;
    if (isTransitioning) return;

    const currentId = inmueble.id;
    const nextIndex =
      activeImageIndex <= 0 ? carouselImages.length - 1 : activeImageIndex - 1;
    const nextUrl = carouselImages[nextIndex];
    if (nextUrl && !loadedByUrl[nextUrl]) {
      void ensurePreloaded(nextUrl).then(() => {
        if (inmueble.id !== currentId) return;
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

    const currentId = inmueble.id;
    const nextIndex =
      activeImageIndex >= carouselImages.length - 1 ? 0 : activeImageIndex + 1;
    const nextUrl = carouselImages[nextIndex];
    if (nextUrl && !loadedByUrl[nextUrl]) {
      void ensurePreloaded(nextUrl).then(() => {
        if (inmueble.id !== currentId) return;
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
      ? (carouselImages[transitionToIndex] || "")
      : "";

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
    <div className="w-72 max-w-[calc(100vw-40px)] rounded-2xl bg-slate-950/90 p-4 shadow-2xl backdrop-blur-2xl border border-white/10">
      {carouselImages.length > 0 && (
        <div className="mb-4 overflow-hidden rounded-xl border border-white/5 bg-slate-900/40 shadow-inner">
          <div className="relative">
            <div
              className="absolute left-3 top-3 z-10 flex items-center justify-center rounded-xl border border-white/10 bg-slate-950/60 p-1.5 backdrop-blur-md shadow-lg transition-transform hover:scale-110"
              title={
                inmueble.source === "robles" ? "Origen: Los Robles" : "Origen: Mardelinmueble"
              }
            >
              {inmueble.source === "robles" ? (
                <Trees className="h-4 w-4 text-indigo-400" strokeWidth={2.5} />
              ) : (
                <Building2 className="h-4 w-4 text-indigo-400" strokeWidth={2.5} />
              )}
            </div>

            {ageInDays != null && ageInDays <= 30 && (
              <div className="absolute right-3 top-3 z-10 flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-500/80 px-2 py-0.5 text-[9px] font-bold text-white backdrop-blur-md shadow-lg animate-pulse">
                <span className="h-1.5 w-1.5 rounded-full bg-white"></span>
                {ageInDays === 0 ? "HOY" : ageInDays <= 7 ? "NUEVO" : "RECIENTE"}
              </div>
            )}
            
            <div className="relative h-40 w-full overflow-hidden">
              {transitionToImage && transitionDirection ? (
                <div
                  className={`absolute inset-0 flex w-[200%] ${animateTrack ? "transition-transform duration-450 ease-[cubic-bezier(0.4,0,0.2,1)]" : ""}`}
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
                        className="h-40 w-1/2 object-cover"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />
                      <img
                        src={transitionToImage}
                        alt={inmueble.title}
                        className="h-40 w-1/2 object-cover"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />
                    </>
                  ) : (
                    <>
                      <img
                        src={transitionToImage}
                        alt={inmueble.title}
                        className="h-40 w-1/2 object-cover"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />
                      <img
                        src={carouselImage}
                        alt={inmueble.title}
                        className="h-40 w-1/2 object-cover"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />
                    </>
                  )}
                </div>
              ) : (
                <img
                  src={carouselImage}
                  alt={inmueble.title}
                  className="h-40 w-full object-cover"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
              )}
            </div>

            {carouselImages.length > 1 && (
              <>
                <div className="absolute inset-y-0 left-0 flex items-center p-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handlePrevImage();
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-950/40 text-white backdrop-blur hover:bg-slate-950/60 active:scale-95 transition-all"
                  >
                    ‹
                  </button>
                </div>
                <div className="absolute inset-y-0 right-0 flex items-center p-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleNextImage();
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-950/40 text-white backdrop-blur hover:bg-slate-950/60 active:scale-95 transition-all"
                  >
                    ›
                  </button>
                </div>

                <div className="absolute bottom-3 right-3 rounded-lg bg-slate-950/60 px-2 py-1 text-[10px] font-bold text-white backdrop-blur border border-white/10">
                  {activeImageIndex + 1}/{carouselImages.length}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">
            {inmueble.barrio ?? "Ubicación desconocida"}
          </div>
          <h3 className="text-base font-bold text-white leading-tight mt-0.5">
            {inmueble.calle} {inmueble.numero}
          </h3>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Precio</span>
            <div className="text-xl font-bold text-white">
              {inmueble.priceUsd.toLocaleString("es-AR")}
              <span className="text-xs font-medium text-slate-500 ml-1">USD</span>
            </div>
          </div>
          <div className="space-y-0.5 text-right">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Valor M²</span>
            <div className="text-sm font-bold text-indigo-400">
              {inmueble.pricePerM2 ? (
                <>
                  {inmueble.pricePerM2.toLocaleString("es-AR", {
                    maximumFractionDigits: 0,
                  })}
                  <span className="text-[10px] ml-0.5">usd/m²</span>
                </>
              ) : (
                "N/A"
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 border-t border-white/10 pt-3">
          <div className="text-center">
            <div className="text-[9px] font-bold text-slate-500 uppercase">Cubierta</div>
            <div className="text-xs font-bold text-slate-200">
              {inmueble.areaCubiertaM2 ? `${inmueble.areaCubiertaM2.toFixed(0)}m²` : "—"}
            </div>
          </div>
          <div className="text-center">
            <div className="text-[9px] font-bold text-slate-500 uppercase">Terreno</div>
            <div className="text-xs font-bold text-slate-200">
              {inmueble.areaTerrenoM2 ? `${inmueble.areaTerrenoM2.toFixed(0)}m²` : "—"}
            </div>
          </div>
          <div className="text-center">
            <div className="text-[9px] font-bold text-slate-500 uppercase">Amb.</div>
            <div className="text-xs font-bold text-slate-200">
              {inmueble.ambientes ?? "—"}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <a
            href={inmueble.publicUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1"
          >
            Ver catálogo 
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          </a>
          
          <div className="flex flex-col items-end gap-1">
            <span className={`text-[9px] font-bold uppercase tracking-tight px-1.5 py-0.5 rounded-md ${
              ageInDays != null && ageInDays <= 7 
                ? "bg-emerald-500/20 text-emerald-400" 
                : ageInDays != null && ageInDays <= 30 
                  ? "bg-indigo-500/20 text-indigo-400"
                  : "bg-slate-500/20 text-slate-500"
            }`}>
              {ageInDays != null 
                ? (ageInDays === 0 ? "Hoy" : `${ageInDays} ${ageInDays === 1 ? 'día' : 'días'}`)
                : "—"}
            </span>
            <div className="text-[8px] font-medium text-slate-600">
              #{inmueble.id}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
