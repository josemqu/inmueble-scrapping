import { NextResponse } from "next/server";

const BASE_URL = "https://api.mardelinmueble.com/v3/mardelinmueble/inmuebles/";

export async function GET(
  _request: Request,
  context: { params: { id: string } | Promise<{ id: string }> },
) {
  const params = await context.params;
  const { id } = params;

  const url = `${BASE_URL}${encodeURIComponent(id)}`;

  try {
    const res = await fetch(url, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "User-Agent": "inmueble-scrapping/1.0",
      },
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return NextResponse.json(
        {
          error: "Error al consultar la API externa",
          upstreamStatus: res.status,
          upstreamBody: text.slice(0, 500),
        },
        { status: 502 },
      );
    }

    const json = (await res.json()) as {
      success: boolean;
      inmueble?: { id: number; imagen_principal?: string | null };
      imagenes?: { nombre: string }[];
    };

    if (!json.success) {
      return NextResponse.json(
        { error: "Respuesta inesperada de la API externa" },
        { status: 502 },
      );
    }

    const names = (json.imagenes ?? [])
      .map((img) => img?.nombre)
      .filter(
        (name): name is string => typeof name === "string" && name.length > 0,
      );

    const coverName = json.inmueble?.imagen_principal ?? null;
    const dedupedNames = [coverName, ...names].filter(
      (name): name is string => typeof name === "string" && name.length > 0,
    );

    const images = Array.from(new Set(dedupedNames)).map(
      (name) =>
        `https://api.mardelinmueble.com/uploads/inmuebles/thumbnails/${name}`,
    );

    return NextResponse.json(
      {
        id: json.inmueble?.id ?? Number(id),
        images,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching inmueble detail:", error);
    return NextResponse.json(
      { error: "Error inesperado consultando la API" },
      { status: 500 },
    );
  }
}
