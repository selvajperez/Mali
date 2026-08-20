import type { APIRoute } from "astro";
import { setProductActivo, updateProductFields } from "../../../lib/sheetsWrite";
import { isValidCategory } from "../../../lib/categories";

export const prerender = false;

export const PATCH: APIRoute = async ({ params, request }) => {
  const id = params.id;
  if (!id) {
    return jsonError("Falta el id del producto", 400);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("JSON inválido", 400);
  }

  const data = body as Record<string, unknown>;
  const keys = Object.keys(data);

  try {
    if (keys.length === 1 && typeof data.activo === "boolean") {
      await setProductActivo(id, data.activo);
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { producto, precio, categoria, stock } = data;

    if (
      typeof producto !== "string" || !producto.trim() ||
      !isValidCategory(categoria) ||
      typeof precio !== "number" || !Number.isFinite(precio) || precio < 0 ||
      typeof stock !== "number" || !Number.isFinite(stock) || stock < 0
    ) {
      return jsonError("Datos del producto incompletos o inválidos", 400);
    }

    await updateProductFields(id, { producto, precio, categoria, stock });
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error desconocido";
    const notFound = message.includes("no encontrado");
    return jsonError(message, notFound ? 404 : 502);
  }
};

function jsonError(error: string, status: number) {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
