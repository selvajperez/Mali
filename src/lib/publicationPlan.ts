import { formatMoney, type Currency } from "./currencies";

export const MAX_PRODUCTOS_PUBLICACION = 10;
export const MAX_PRODUCTOS_POR_PLACA = 5;

export interface PublicationProduct {
  id: string;
  producto: string;
  precio: number;
  moneda: Currency;
  fotoUrl: string;
}

// 1 → una placa con 1 producto. 2-5 → una placa. 6-10 → dos placas,
// repartidas lo más parejo posible (nunca más de 5 por placa):
// 6→3+3, 7→4+3, 8→4+4, 9→5+4, 10→5+5.
export function planPlacas<T>(productos: T[]): T[][] {
  const n = productos.length;
  if (n === 0) return [];
  if (n <= MAX_PRODUCTOS_POR_PLACA) return [productos];

  const primera = Math.ceil(n / 2);
  return [productos.slice(0, primera), productos.slice(primera)];
}

export interface PublicationTextConfig {
  titulo: string;
  fraseFinal: string;
  hashtags?: string[];
}

export function buildSuggestedText(
  productos: PublicationProduct[],
  config: PublicationTextConfig
): string {
  const lineas = productos.map(
    (p) => `• ${p.producto} — ${formatMoney(p.precio, p.moneda)}`
  );

  const partes = [config.titulo, "", "Ya disponibles:", "", ...lineas, "", config.fraseFinal];

  if (config.hashtags && config.hashtags.length > 0) {
    const hashtags = config.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ");
    partes.push("", hashtags);
  }

  return partes.join("\n");
}
