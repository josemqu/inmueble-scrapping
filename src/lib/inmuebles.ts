// Domain models and helpers for Mar del Plata real estate API

export type RawInmueble = {
  id: number;
  titulo: string;
  descripcion: string;
  latitud: number | null;
  longitud: number | null;
  precio: string;
  moneda: number;
  barrio_nombre: string | null;
  casa_sup_cubierta?: string | null;
  casa_sup_terreno?: string | null;
};

export type Inmueble = {
  id: number;
  title: string;
  lat: number;
  lng: number;
  priceUsd: number;
  areaM2: number | null;
  pricePerM2: number | null;
  barrio: string | null;
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

  const areaCandidates = [supCubierta, supTerreno].filter(
    (v) => Number.isFinite(v) && v > 0
  ) as number[];

  const areaM2 = areaCandidates.length > 0 ? areaCandidates[0] : null;
  const pricePerM2 = areaM2 && areaM2 > 0 ? priceUsd / areaM2 : null;

  return {
    id: raw.id,
    title: raw.titulo,
    lat: raw.latitud,
    lng: raw.longitud,
    priceUsd,
    areaM2,
    pricePerM2,
    barrio: raw.barrio_nombre ?? null,
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
