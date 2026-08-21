import { CURRENCIES, formatMoney, type Currency } from "./currencies";

export { formatMoney };

export interface CartItem {
  id: string;
  nombre: string;
  precio: number;
  fotoUrl: string;
  cantidad: number;
  moneda: Currency;
}

export function contarUnidades(items: CartItem[]): number {
  return items.reduce((total, item) => total + item.cantidad, 0);
}

export interface TotalPorMoneda {
  moneda: Currency;
  total: number;
}

export function calcularTotalesPorMoneda(items: CartItem[]): TotalPorMoneda[] {
  const totales = new Map<Currency, number>();
  for (const item of items) {
    totales.set(item.moneda, (totales.get(item.moneda) ?? 0) + item.precio * item.cantidad);
  }
  return CURRENCIES.filter((moneda) => totales.has(moneda)).map((moneda) => ({
    moneda,
    total: totales.get(moneda) ?? 0,
  }));
}

export type StockPorId = Map<string, number> | Record<string, number>;

function stockDisponiblePara(id: string, stockPorId?: StockPorId): number | undefined {
  if (!stockPorId) return undefined;
  return stockPorId instanceof Map ? stockPorId.get(id) : stockPorId[id];
}

export interface MensajesPedido {
  saludo?: string;
  cierre?: string;
  infoEnvio?: string;
  infoRetiro?: string;
}

const SALUDO_DEFAULT = "Hola, quiero hacer este pedido:";
const CIERRE_DEFAULT = "Quedo a la espera de confirmación de disponibilidad.";

export function buildWhatsAppMessage(
  items: CartItem[],
  stockPorId?: StockPorId,
  mensajes?: MensajesPedido
): string {
  const lineas = items.flatMap((item) => {
    const linea = `- ${item.cantidad} x ${item.nombre} — ${formatMoney(item.precio, item.moneda)} c/u`;
    const disponible = stockDisponiblePara(item.id, stockPorId);

    if (disponible === undefined || item.cantidad <= disponible) {
      return [linea];
    }

    const faltan = item.cantidad - disponible;
    const unidad = faltan === 1 ? "unidad" : "unidades";
    return [linea, `  ⚠ Stock disponible: ${disponible} — faltan ${faltan} ${unidad}`];
  });

  const totales = calcularTotalesPorMoneda(items);
  const lineasTotal = totales.map(({ moneda, total }) => {
    const etiqueta = totales.length > 1 ? `Total ${moneda}` : "Total";
    return `${etiqueta}: ${formatMoney(total, moneda)}`;
  });

  const lineasCierre = [mensajes?.cierre ?? CIERRE_DEFAULT];
  if (mensajes?.infoEnvio) lineasCierre.push(mensajes.infoEnvio);
  if (mensajes?.infoRetiro) lineasCierre.push(mensajes.infoRetiro);

  return [
    mensajes?.saludo ?? SALUDO_DEFAULT,
    "",
    ...lineas,
    "",
    ...lineasTotal,
    "",
    ...lineasCierre,
  ].join("\n");
}

export function buildWhatsAppUrl(phone: string, message: string): string {
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
