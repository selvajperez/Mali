import type { APIRoute } from "astro";
import { appendProduct } from "../../lib/sheetsWrite";
import { isValidCategory } from "../../lib/categories";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("JSON inválido", 400);
  }

  const { producto, precio, categoria, stock, fotoUrl } = body as Record<string, unknown>;

  if (
    typeof producto !== "string" || !producto.trim() ||
    !isValidCategory(categoria) ||
    typeof fotoUrl !== "string" || !fotoUrl.trim() ||
    typeof precio !== "number" || !Number.isFinite(precio) || precio < 0 ||
    typeof stock !== "number" || !Number.isFinite(stock) || stock < 0
  ) {
    return jsonError("Datos del producto incompletos o inválidos", 400);
  }

  try {
    const id = await appendProduct({ producto, precio, categoria, stock, fotoUrl });
    return new Response(JSON.stringify({ id }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error desconocido";
    return jsonError(`No se pudo guardar el producto: ${message}`, 502);
  }
};

function jsonError(error: string, status: number) {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
