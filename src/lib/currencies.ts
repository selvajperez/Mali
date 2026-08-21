export const CURRENCIES = ["ARS", "USD"] as const;

export type Currency = (typeof CURRENCIES)[number];

export function isValidCurrency(value: unknown): value is Currency {
  return typeof value === "string" && (CURRENCIES as readonly string[]).includes(value);
}

export function formatMoney(precio: number, moneda: Currency): string {
  const monto = precio.toLocaleString("es-AR");
  return moneda === "USD" ? `USD ${monto}` : `$ ${monto}`;
}
