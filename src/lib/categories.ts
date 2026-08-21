import { CATEGORIES } from "./storeConfig";

export { CATEGORIES };

export type Category = (typeof CATEGORIES)[number];

export function isValidCategory(value: unknown): value is Category {
  return typeof value === "string" && (CATEGORIES as readonly string[]).includes(value);
}
