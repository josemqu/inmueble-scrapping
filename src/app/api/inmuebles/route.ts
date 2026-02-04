import { NextResponse } from "next/server";
import {
  Inmueble,
  InmueblesResponse,
  RawInmueble,
  aggregateByBarrio,
  mapRawToInmueble,
} from "@/lib/inmuebles";

const BASE_URL = "https://api.mardelinmueble.com/v3/mardelinmueble/inmuebles/";

export async function GET() {
  const searchParams = new URLSearchParams({
    page: "1",
    items_x_page: "600",
    id_tipo_operacion: "1",
    id_tipo_inmueble: "1",
    id_ciudad: "1",
  });

  const url = `${BASE_URL}?${searchParams.toString()}`;

  try {
    const res = await fetch(url, {
      // Cache a bit on the server to avoid hitting the API on every request
      // while still keeping it relatively fresh.
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Error al consultar la API externa" },
        { status: 502 },
      );
    }

    const json = (await res.json()) as {
      success: boolean;
      inmuebles: RawInmueble[];
      total: number;
    };

    if (!json.success || !Array.isArray(json.inmuebles)) {
      return NextResponse.json(
        { error: "Respuesta inesperada de la API externa" },
        { status: 502 },
      );
    }

    const processed: Inmueble[] = [];

    for (const raw of json.inmuebles) {
      const mapped = mapRawToInmueble(raw);
      if (mapped) {
        processed.push(mapped);
      }
    }

    const barrios = aggregateByBarrio(processed);

    const payload: InmueblesResponse = {
      inmuebles: processed,
      barrios,
    };

    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    console.error("Error fetching inmuebles:", error);
    return NextResponse.json(
      { error: "Error inesperado consultando la API" },
      { status: 500 },
    );
  }
}
