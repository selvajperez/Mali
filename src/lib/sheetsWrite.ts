import { google } from "googleapis";
import { isValidCurrency, type Currency } from "./currencies";
import { DEFAULT_CURRENCY, PRODUCT_ID_PREFIX } from "./storeConfig";

export interface NewProduct {
  producto: string;
  precio: number;
  categoria: string;
  stock: number;
  fotoUrl: string;
  moneda: string;
}

function normalizePrivateKey(raw: string): string {
  let key = raw.trim();

  // Si se pegó con comillas envolventes (copiado directo del JSON), quitarlas.
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1);
  }

  // Los saltos de línea reales se pierden en algunos campos de texto de una
  // sola línea (como en Vercel); "\n" literal es la forma escapada del JSON.
  key = key.replace(/\\n/g, "\n").trim();

  if (!key.includes("BEGIN PRIVATE KEY")) {
    throw new Error(
      "GOOGLE_PRIVATE_KEY no tiene formato PEM válido (falta '-----BEGIN PRIVATE KEY-----'). " +
        "Revisá que se haya pegado el valor completo del campo private_key del JSON, sin comillas extra."
    );
  }

  return key;
}

interface ServiceAccountCredentials {
  email: string;
  privateKey: string;
}

function getCredentialsFromJsonB64(): ServiceAccountCredentials | null {
  const jsonB64 = import.meta.env.GOOGLE_SERVICE_ACCOUNT_JSON_B64;
  if (!jsonB64) return null;

  let parsed: { client_email?: string; private_key?: string };
  try {
    const decoded = Buffer.from(jsonB64.trim(), "base64").toString("utf8");
    parsed = JSON.parse(decoded);
  } catch {
    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT_JSON_B64 no se pudo decodificar. Verificá que sea el archivo .json de la Service Account codificado en base64, sin cortar."
    );
  }

  if (!parsed.client_email || !parsed.private_key) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON_B64 decodificó pero no tiene client_email/private_key.");
  }

  return { email: parsed.client_email, privateKey: parsed.private_key };
}

function getCredentialsFromSeparateVars(): ServiceAccountCredentials | null {
  const email = import.meta.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawPrivateKey = import.meta.env.GOOGLE_PRIVATE_KEY;
  if (!email || !rawPrivateKey) return null;

  return { email, privateKey: normalizePrivateKey(rawPrivateKey) };
}

function getSheetsClient() {
  const sheetId = import.meta.env.GOOGLE_SHEET_ID;
  if (!sheetId) {
    throw new Error("Falta la variable de entorno GOOGLE_SHEET_ID");
  }

  const credentials = getCredentialsFromJsonB64() ?? getCredentialsFromSeparateVars();
  if (!credentials) {
    throw new Error(
      "Faltan credenciales de Google: definí GOOGLE_SERVICE_ACCOUNT_JSON_B64 (recomendado) o " +
        "GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_PRIVATE_KEY"
    );
  }

  const auth = new google.auth.JWT({
    email: credentials.email,
    key: credentials.privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  return { sheets: google.sheets({ version: "v4", auth }), sheetId };
}

function generateId(): string {
  return `${PRODUCT_ID_PREFIX}${Date.now().toString().slice(-6)}`;
}

export async function appendProduct(product: NewProduct): Promise<string> {
  const { sheets, sheetId } = getSheetsClient();
  const id = generateId();

  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: "A:H",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [
        [id, product.producto, product.precio, product.categoria, product.stock, product.fotoUrl, "sí", product.moneda],
      ],
    },
  });

  return id;
}

export interface AdminProduct {
  id: string;
  producto: string;
  precio: number;
  categoria: string;
  stock: number;
  fotoUrl: string;
  activo: boolean;
  moneda: Currency;
}

export interface ProductEdits {
  producto: string;
  precio: number;
  categoria: string;
  stock: number;
  fotoUrl: string;
  moneda: string;
}

export async function listAllProducts(): Promise<AdminProduct[]> {
  const { sheets, sheetId } = getSheetsClient();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: "A2:H",
    valueRenderOption: "UNFORMATTED_VALUE",
  });

  const rows = response.data.values ?? [];

  return rows
    .filter((row) => (row[0] ?? "").toString().trim() !== "")
    .map((row) => {
      const activoRaw = (row[6] ?? "").toString().trim().toLowerCase();
      const monedaRaw = (row[7] ?? "").toString().trim().toUpperCase();
      return {
        id: row[0]?.toString() ?? "",
        producto: row[1]?.toString() ?? "",
        precio: Number(row[2]) || 0,
        categoria: row[3]?.toString() ?? "",
        stock: Number(row[4]) || 0,
        fotoUrl: row[5]?.toString() ?? "",
        activo: activoRaw === "sí" || activoRaw === "si",
        // Productos viejos no tienen esta columna (o vino invalida): default.
        moneda: isValidCurrency(monedaRaw) ? monedaRaw : DEFAULT_CURRENCY,
      };
    })
    .reverse();
}

async function findRowById(
  sheets: ReturnType<typeof getSheetsClient>["sheets"],
  sheetId: string,
  id: string
): Promise<number> {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: "A2:A",
  });

  const ids = response.data.values ?? [];
  const index = ids.findIndex((row) => row[0]?.toString().trim() === id);

  if (index === -1) {
    throw new Error(`Producto ${id} no encontrado`);
  }

  return index + 2; // +2: la data arranca en la fila 2 (fila 1 = encabezado)
}

export async function updateProductFields(id: string, edits: ProductEdits): Promise<void> {
  const { sheets, sheetId } = getSheetsClient();
  const row = await findRowById(sheets, sheetId, id);

  // Dos updates separados: B:F y H, dejando G (Activo) sin tocar entre medio.
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: `B${row}:F${row}`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[edits.producto, edits.precio, edits.categoria, edits.stock, edits.fotoUrl]],
    },
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: `H${row}:H${row}`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[edits.moneda]],
    },
  });
}

export async function setProductActivo(id: string, activo: boolean): Promise<void> {
  const { sheets, sheetId } = getSheetsClient();
  const row = await findRowById(sheets, sheetId, id);

  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: `G${row}:G${row}`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[activo ? "sí" : "no"]],
    },
  });
}

export interface DeleteProductsResult {
  deletedIds: string[];
  notFoundIds: string[];
}

export async function deleteProducts(ids: string[]): Promise<DeleteProductsResult> {
  const { sheets, sheetId } = getSheetsClient();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: "A2:A",
  });
  const idsEnHoja = (response.data.values ?? []).map((row) => row[0]?.toString().trim() ?? "");

  const idsUnicos = [...new Set(ids)];
  const notFoundIds: string[] = [];
  const filas: number[] = [];

  for (const id of idsUnicos) {
    const indice = idsEnHoja.findIndex((existente) => existente === id);
    if (indice === -1) {
      notFoundIds.push(id);
    } else {
      filas.push(indice + 2); // +2: fila 1 = encabezado, arrays 0-based
    }
  }

  if (filas.length === 0) {
    return { deletedIds: [], notFoundIds };
  }

  const meta = await sheets.spreadsheets.get({
    spreadsheetId: sheetId,
    fields: "sheets.properties.sheetId",
  });
  const gid = meta.data.sheets?.[0]?.properties?.sheetId;
  if (gid == null) {
    throw new Error("No se pudo determinar la hoja de cálculo a modificar");
  }

  // De abajo hacia arriba: filas más altas primero, para que cada borrado no
  // corra el índice de las filas que todavía faltan borrar.
  const filasDesc = [...filas].sort((a, b) => b - a);

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: sheetId,
    requestBody: {
      requests: filasDesc.map((fila) => ({
        deleteDimension: {
          range: {
            sheetId: gid,
            dimension: "ROWS" as const,
            startIndex: fila - 1,
            endIndex: fila,
          },
        },
      })),
    },
  });

  const deletedIds = idsUnicos.filter((id) => !notFoundIds.includes(id));
  return { deletedIds, notFoundIds };
}
