import { NextResponse } from "next/server";
import {
  Inmueble,
  InmueblesResponse,
  RawInmueble,
  aggregateByBarrio,
  mapRawToInmueble,
  RoblesInmueble,
  mapRoblesToInmueble,
} from "@/lib/inmuebles";

const BASE_URL = "https://api.mardelinmueble.com/v3/mardelinmueble/inmuebles/";
const ROBLES_URL = "https://roblescasascampos.com/propiedades/catalogo";

export async function GET(request: Request) {
  const { searchParams: urlParams } = new URL(request.url);
  const idTipoOperacion = urlParams.get("id_tipo_operacion") ?? "1";
  const idTipoInmueble = urlParams.get("id_tipo_inmueble") ?? "1";
  const idCiudad = urlParams.get("id_ciudad") ?? "1";

  const searchParams = new URLSearchParams({
    page: "1",
    items_x_page: "600",
    id_tipo_operacion: idTipoOperacion,
    id_tipo_inmueble: idTipoInmueble,
    id_ciudad: idCiudad,
  });

  const url = `${BASE_URL}?${searchParams.toString()}`;

  try {
    const mardelPromise = fetch(url, {
      cache: "no-store",
    }).catch((e) => {
      console.error("Error fetching Mardel:", e);
      return null;
    });

    const roblesPromise = fetch(ROBLES_URL, {
      headers: {
        Accept: "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
      cache: "no-store",
    }).catch((e) => {
      console.error("Error fetching Robles:", e);
      return null;
    });

    const [resMardel, resRobles] = await Promise.all([mardelPromise, roblesPromise]);

    if ((!resMardel || !resMardel.ok) && (!resRobles || !resRobles.ok)) {
      return NextResponse.json(
        { error: "Error al consultar las APIs externas" },
        { status: 502 },
      );
    }

    const processed: Inmueble[] = [];

    if (resMardel && resMardel.ok) {
      try {
        const json = (await resMardel.json()) as {
          success: boolean;
          inmuebles: RawInmueble[];
          total: number;
        };

        if (json.success && Array.isArray(json.inmuebles)) {
          for (const raw of json.inmuebles) {
            const mapped = mapRawToInmueble(raw);
            if (mapped) {
              processed.push(mapped);
            }
          }
        }
      } catch (e) {
        console.error("Error parsing Mardel:", e);
      }
    }

    // Include Robles only if user selects Mar del Plata and is Venta
    if (resRobles && resRobles.ok && idCiudad === "1" && idTipoOperacion === "1") {
      try {
        const json = (await resRobles.json()) as {
          success: boolean;
          data: RoblesInmueble[];
        };

        if (json.success && Array.isArray(json.data)) {
          for (const raw of json.data) {
            const mapped = mapRoblesToInmueble(raw);
            if (mapped) {
              const typeName = (raw.property_type?.name || "").toLowerCase();
              let mappedType = "other";
              if (typeName.includes("casa") || typeName.includes("chalet")) mappedType = "1";
              else if (typeName.includes("departamento") || typeName.includes("depto")) mappedType = "2";
              else if (typeName.includes("local") || typeName.includes("galpón")) mappedType = "3";
              else if (typeName.includes("terreno") || typeName.includes("lote")) mappedType = "4";
              else if (typeName.includes("quinta")) mappedType = "5";
              else if (typeName.includes("cochera")) mappedType = "6";

              if (mappedType !== "other" && idTipoInmueble === mappedType) {
                processed.push(mapped);
              }
            }
          }
        }
      } catch (e) {
        console.error("Error parsing Robles:", e);
      }
    }

    const barrios = aggregateByBarrio(processed);

    const payload: InmueblesResponse = {
      inmuebles: processed,
      barrios,
    };

    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    console.error("Error fetching inmuebles global:", error);
    return NextResponse.json(
      { error: "Error inesperado consultando la API" },
      { status: 500 },
    );
  }
}
