import type { APIRoute } from "astro";
import { getCatalogProducts } from "../../lib/sheets";

export const prerender = false;

interface ItemSolicitado {
  id: string;
  cantidad: number;
}

function esItemValido(value: unknown): value is ItemSolicitado {
  if (typeof value !== "object" || value === null) return false;
  const { id, cantidad } = value as Record<string, unknown>;
  return (
    typeof id === "string" &&
    id.trim() !== "" &&
    typeof cantidad === "number" &&
    Number.isFinite(cantidad) &&
    cantidad > 0
  );
}

export const POST: APIRoute = async ({ request }) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("JSON inválido", 400);
  }

  const items = (body as Record<string, unknown>)?.items;
  if (!Array.isArray(items) || items.length === 0 || !items.every(esItemValido)) {
    return jsonError("Se espera { items: [{ id, cantidad }] }", 400);
  }

  try {
    const productos = await getCatalogProducts();
    const stockPorId = new Map(productos.map((p) => [p.id, p.stock]));

    const resultado = (items as ItemSolicitado[]).map(({ id }) => ({
      id,
      stockDisponible: stockPorId.get(id) ?? 0,
    }));

    return new Response(JSON.stringify({ items: resultado }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error desconocido";
    return jsonError(`No se pudo verificar el stock: ${message}`, 502);
  }
};

function jsonError(error: string, status: number) {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
