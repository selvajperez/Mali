export const CATEGORIES = [
  "Hogar",
  "Cocina",
  "Belleza",
  "Tecnología",
  "Accesorios",
  "Textil",
  "Otros",
] as const;

export type Category = (typeof CATEGORIES)[number];

export function isValidCategory(value: unknown): value is Category {
  return typeof value === "string" && (CATEGORIES as readonly string[]).includes(value);
}
