import { parseCsv } from "./csv";
import { getStockStatus, type StockStatus } from "./stockStatus";
import { isValidCurrency, type Currency } from "./currencies";
import { DEFAULT_CURRENCY } from "./storeConfig";

export interface CatalogProduct {
  id: string;
  producto: string;
  precio: number;
  categoria: string;
  fotoUrl: string;
  estado: StockStatus;
  moneda: Currency;
  stock: number;
}

const COLUMNS = ["id", "producto", "precio", "categoria", "stock", "fotoUrl", "activo", "moneda"] as const;

export async function getCatalogProducts(): Promise<CatalogProduct[]> {
  const csvUrl = import.meta.env.SHEETS_CSV_URL;
  if (!csvUrl) {
    throw new Error("Falta la variable de entorno SHEETS_CSV_URL");
  }

  const response = await fetch(csvUrl);
  if (!response.ok) {
    throw new Error(`No se pudo leer el catálogo (HTTP ${response.status})`);
  }

  const text = await response.text();
  const rows = parseCsv(text);
  const [, ...dataRows] = rows; // descarta encabezado

  return dataRows
    .map((cells) => {
      const record: Record<string, string> = {};
      COLUMNS.forEach((key, i) => {
        record[key] = (cells[i] ?? "").trim();
      });
      return record;
    })
    .filter((record) => record.activo.toLowerCase() === "sí" || record.activo.toLowerCase() === "si")
    .map((record) => {
      const monedaRaw = record.moneda.toUpperCase();
      const stock = Number(record.stock) || 0;
      return {
        id: record.id,
        producto: record.producto,
        precio: Number(record.precio) || 0,
        categoria: record.categoria,
        fotoUrl: record.fotoUrl,
        estado: getStockStatus(stock),
        // Productos viejos no tienen esta columna (o vino invalida): default.
        moneda: isValidCurrency(monedaRaw) ? monedaRaw : DEFAULT_CURRENCY,
        stock,
      };
    });
}
