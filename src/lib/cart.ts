export interface CartItem {
  id: string;
  nombre: string;
  precio: number;
  fotoUrl: string;
  cantidad: number;
}

export function formatMoney(n: number): string {
  return `$${n.toLocaleString("es-AR")}`;
}

export function calcularTotal(items: CartItem[]): number {
  return items.reduce((total, item) => total + item.precio * item.cantidad, 0);
}

export function contarUnidades(items: CartItem[]): number {
  return items.reduce((total, item) => total + item.cantidad, 0);
}

export function buildWhatsAppMessage(items: CartItem[]): string {
  const lineas = items.map(
    (item) => `- ${item.cantidad} x ${item.nombre} — ${formatMoney(item.precio)} c/u`
  );

  return [
    "Hola, quiero hacer este pedido:",
    "",
    ...lineas,
    "",
    `Total: ${formatMoney(calcularTotal(items))}`,
    "",
    "Quedo a la espera de confirmación de disponibilidad.",
  ].join("\n");
}

export function buildWhatsAppUrl(phone: string, message: string): string {
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
