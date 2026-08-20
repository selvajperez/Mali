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
