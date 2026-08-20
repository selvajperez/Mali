import { google } from "googleapis";

export interface NewProduct {
  producto: string;
  precio: number;
  categoria: string;
  stock: number;
  fotoUrl: string;
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

function getSheetsClient() {
  const email = import.meta.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawPrivateKey = import.meta.env.GOOGLE_PRIVATE_KEY;
  const sheetId = import.meta.env.GOOGLE_SHEET_ID;

  if (!email || !rawPrivateKey || !sheetId) {
    throw new Error(
      "Faltan variables de entorno de Google (GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, GOOGLE_SHEET_ID)"
    );
  }

  const privateKey = normalizePrivateKey(rawPrivateKey);

  const auth = new google.auth.JWT({
    email,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  return { sheets: google.sheets({ version: "v4", auth }), sheetId };
}

function generateId(): string {
  return `MUT${Date.now().toString().slice(-6)}`;
}

export async function appendProduct(product: NewProduct): Promise<string> {
  const { sheets, sheetId } = getSheetsClient();
  const id = generateId();

  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: "A:G",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [
        [id, product.producto, product.precio, product.categoria, product.stock, product.fotoUrl, "sí"],
      ],
    },
  });

  return id;
}
