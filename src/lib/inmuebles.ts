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
  publicUrl: string;
  coverImageUrl: string | null;
  galleryUrls?: string[];
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
  source: "mardelinmueble" | "robles";
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

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function normalizePathSegment(value: string): string {
  return slugify(value);
}

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
  const t = (raw.titulo || "").toLowerCase();
  if (t.includes("vendid") || t.includes("reservad")) return null;

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

  const rawAny = raw as unknown as {
    tipo_operacion?: string | null;
    tipo_inmueble?: string | null;
    id_tipo_operacion?: number | null;
    id_tipo_inmueble?: number | null;
  };

  const operacion = rawAny.tipo_operacion
    ? normalizePathSegment(rawAny.tipo_operacion)
    : rawAny.id_tipo_operacion === 1
      ? "venta"
      : "venta";

  const tipo = rawAny.tipo_inmueble
    ? normalizePathSegment(rawAny.tipo_inmueble)
    : rawAny.id_tipo_inmueble === 1
      ? "casa"
      : "casa";

  const titleSlug = slugify(raw.titulo);

  return {
    id: raw.id,
    title: raw.titulo,
    lat: raw.latitud,
    lng: raw.longitud,
    priceUsd,
    publicUrl: `https://mardelinmueble.com/inmueble/${operacion}/${tipo}/${titleSlug}/${raw.id}`,
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
    source: "mardelinmueble",
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

// ----------------------------------------------------
// Integración con Robles Casas & Campos (Tokko Broker)
// ----------------------------------------------------

export type RoblesInmueble = {
  id: string | number;
  publication_title: string;
  description: string;
  address: string;
  room_amount: number;
  bathroom_amount: number;
  surface: string;
  is_starred_on_web: boolean;
  web_price: boolean;
  slug: string;
  geo_lat: string | number;
  geo_long: string | number;
  property_type?: { id: string; name: string };
  location?: {
    id: string;
    name: string;
    full_location: string;
    short_location: string;
  };
  operations?: {
    price: string | number;
    currency: string;
    type: string;
    operation_type_id: number;
  }[];
  gallery?: {
    image_url: string;
    thumb_url: string;
    is_front_cover: boolean;
    order: number;
    type: string;
  }[];
};

export function mapRoblesToInmueble(raw: RoblesInmueble): Inmueble | null {
  const t = (raw.publication_title || "").toLowerCase();
  if (t.includes("vendid") || t.includes("reservad")) return null;

  const latStr = String(raw.geo_lat || "");
  const lngStr = String(raw.geo_long || "");
  const lat = parseFloat(latStr);
  const lng = parseFloat(lngStr);

  if (!latStr || !lngStr || isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) {
    return null;
  }

  const op = raw.operations?.[0];
  if (!op) return null;

  // Filtrar si no es Venta
  const isVenta = op.operation_type_id === 1 || op.type?.toLowerCase() === "venta";
  if (!isVenta) return null;

  // Si no es USD, por ahora ignoramos si es venta en pesos o no es comparable (se podrían agregar validaciones)
  if (op.currency !== "USD") return null;

  const price = typeof op.price === "string" ? parseFloat(op.price) : op.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const surface = parseFloat(String(raw.surface || ""));
  const areaM2 = Number.isFinite(surface) && surface > 0 ? surface : null;

  let pricePerM2 = null;
  if (areaM2 && areaM2 > 30) {
    pricePerM2 = price / areaM2;
  }

  let coverImg = null;
  let galleryUrls: string[] = [];
  if (raw.gallery && raw.gallery.length > 0) {
    const front = raw.gallery.find((g) => g.is_front_cover);
    coverImg = front ? front.image_url : raw.gallery[0].image_url;
    
    galleryUrls = [...raw.gallery]
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map((g) => g.image_url);
  }

  const numericId = typeof raw.id === "string" ? parseInt(raw.id, 10) : raw.id;
  // Offset ID para no colisionar con Mardel Inmueble
  const finalId = Number.isFinite(numericId) ? 800000000 + numericId : 800000000 + Math.floor(Math.random() * 1000000);

  // Heurística de antigüedad basada en ID de Tokko Broker (aprox 7.8M es Marzo 2025)
  // Usamos una tasa aproximada de 10000 IDs por día para que 7.5M sea aprox 1 mes atrás
  let estimatedDate = null;
  if (numericId && Number.isFinite(numericId)) {
    const baselineId = 7886539;
    const baselineDate = new Date("2025-03-24").getTime();
    const diff = baselineId - numericId;
    // Si el ID es mayor al baseline, asumimos hoy
    // Usamos una tasa mayor para no ser tan castigadores con los IDs ligeramente menores
    const daysOffset = Math.max(0, diff / 10000);
    estimatedDate = new Date(baselineDate - daysOffset * 24 * 60 * 60 * 1000);
  }

  // Extraer calle y número si es posible (formato "Nombre 1234")
  let calle = raw.address || null;
  let numero: number | null = null;
  if (calle && calle.includes(" ")) {
    const parts = calle.trim().split(" ");
    const lastPart = parts[parts.length - 1];
    const n = parseInt(lastPart, 10);
    if (!isNaN(n) && n > 0 && n < 20000) { // Un filtro básico para no capturar años o cosas raras
      numero = n;
      calle = parts.slice(0, parts.length - 1).join(" ");
    }
  }

  return {
    id: finalId,
    title: raw.publication_title || "",
    lat,
    lng,
    priceUsd: price,
    publicUrl: `https://roblescasascampos.com/propiedades/${raw.slug || ""}`,
    coverImageUrl: coverImg,
    galleryUrls,
    areaCubiertaM2: areaM2,
    areaTerrenoM2: areaM2, // Normalizamos para que pasen los filtros de superficie
    areaM2,
    pricePerM2,
    barrio: raw.location?.name || null,
    calle: toProperCase(calle),
    numero,
    ambientes: raw.room_amount || null,
    createdAt: estimatedDate,
    lastUpdate: estimatedDate,
    source: "robles",
  };
}
