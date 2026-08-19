export type StockStatus = "Agotado" | "Últimas unidades" | "Disponible";

export function getStockStatus(stock: number): StockStatus {
  if (stock <= 0) return "Agotado";
  if (stock <= 2) return "Últimas unidades";
  return "Disponible";
}
