// Domain models and helpers for Mar del Plata real estate API

export type RawInmueble = {
  id: number;
  titulo: string;
  descripcion: string;
  latitud: number | null;
  longitud: number | null;
  precio: string;
  moneda: number;
  calle: string | null;
  numero: number | null;
  barrio_nombre: string | null;
  imagen_principal?: string | null;
  casa_sup_cubierta?: string | null;
  casa_sup_terreno?: string | null;
  casa_ambientes?: number | null;
  fecha_creacion?: string | null;
  last_update?: string | null;
};

export type Inmueble = {
  id: number;
  title: string;
  lat: number;
  lng: number;
  priceUsd: number;
  coverImageUrl: string | null;
  // Raw areas
  areaCubiertaM2: number | null;
  areaTerrenoM2: number | null;
  // Weighted area used for pricePerM2 calculations
  areaM2: number | null;
  pricePerM2: number | null;
  barrio: string | null;
  calle: string | null;
  numero: number | null;
  ambientes: number | null;
  createdAt: Date | null;
  lastUpdate: Date | null;
};

export type BarrioStats = {
  barrio: string;
  count: number;
  avgPricePerM2: number | null;
};

export type InmueblesResponse = {
  inmuebles: Inmueble[];
  barrios: BarrioStats[];
};

const USD_CURRENCY_ID = 2;

function toProperCase(value: string | null): string | null {
  if (!value) return value;

  return value
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}

export function mapRawToInmueble(raw: RawInmueble): Inmueble | null {
  if (raw.latitud == null || raw.longitud == null) {
    return null;
  }

  const price = parseFloat(raw.precio ?? "0");
  if (!Number.isFinite(price) || price <= 0) {
    return null;
  }

  // API currency: 2 appears to be USD; others could be added later if needed
  const priceUsd = raw.moneda === USD_CURRENCY_ID ? price : price;

  const supCubierta = raw.casa_sup_cubierta
    ? parseFloat(raw.casa_sup_cubierta)
    : NaN;
  const supTerreno = raw.casa_sup_terreno
    ? parseFloat(raw.casa_sup_terreno)
    : NaN;

  const hasCubierta = Number.isFinite(supCubierta) && supCubierta > 0;
  const hasTerreno = Number.isFinite(supTerreno) && supTerreno > 0;

  // Weighted "equivalent" area:
  // - covered m² at full weight
  // - uncovered m² (terrain - covered) at a lower weight
  let areaM2: number | null = null;
  if (hasCubierta || hasTerreno) {
    const cubierta = hasCubierta ? supCubierta : 0;
    const terrenoTotal = hasTerreno ? supTerreno : 0;
    const descubierta = Math.max(terrenoTotal - cubierta, 0);

    const pesoCubierta = 1.0;
    const pesoDescubierta = 0.3;

    const equivalente = pesoCubierta * cubierta + pesoDescubierta * descubierta;

    areaM2 = equivalente > 0 ? equivalente : null;
  } else {
    areaM2 = null;
  }

  const pricePerM2 =
    hasCubierta && areaM2 && areaM2 > 30 ? priceUsd / areaM2 : null;

  const createdAt = raw.fecha_creacion ? new Date(raw.fecha_creacion) : null;
  const lastUpdate = raw.last_update ? new Date(raw.last_update) : null;

  const coverImageUrl = raw.imagen_principal
    ? `https://api.mardelinmueble.com/uploads/inmuebles/thumbnails/${raw.imagen_principal}`
    : null;

  return {
    id: raw.id,
    title: raw.titulo,
    lat: raw.latitud,
    lng: raw.longitud,
    priceUsd,
    coverImageUrl,
    areaCubiertaM2: hasCubierta ? supCubierta : null,
    areaTerrenoM2: hasTerreno ? supTerreno : null,
    areaM2,
    pricePerM2,
    barrio: raw.barrio_nombre ?? null,
    calle: toProperCase(raw.calle ?? null),
    numero: raw.numero ?? null,
    ambientes:
      typeof raw.casa_ambientes === "number" &&
      Number.isFinite(raw.casa_ambientes)
        ? raw.casa_ambientes
        : null,
    createdAt,
    lastUpdate,
  };
}

export function aggregateByBarrio(inmuebles: Inmueble[]): BarrioStats[] {
  const byBarrio = new Map<
    string,
    { sum: number; countWithM2: number; countTotal: number }
  >();

  for (const i of inmuebles) {
    const barrioKey = i.barrio?.trim() || "Sin barrio";
    const entry = byBarrio.get(barrioKey) || {
      sum: 0,
      countWithM2: 0,
      countTotal: 0,
    };

    entry.countTotal += 1;
    if (i.pricePerM2 != null && Number.isFinite(i.pricePerM2)) {
      entry.sum += i.pricePerM2;
      entry.countWithM2 += 1;
    }

    byBarrio.set(barrioKey, entry);
  }

  const result: BarrioStats[] = [];
  for (const [barrio, stats] of byBarrio.entries()) {
    result.push({
      barrio,
      count: stats.countTotal,
      avgPricePerM2:
        stats.countWithM2 > 0 ? stats.sum / stats.countWithM2 : null,
    });
  }

  // Sort by avg price descending, nulls last
  result.sort((a, b) => {
    if (a.avgPricePerM2 == null && b.avgPricePerM2 == null) return 0;
    if (a.avgPricePerM2 == null) return 1;
    if (b.avgPricePerM2 == null) return -1;
    return b.avgPricePerM2 - a.avgPricePerM2;
  });

  return result;
}
