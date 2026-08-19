import { google } from "googleapis";

export interface NewProduct {
  producto: string;
  precio: number;
  categoria: string;
  stock: number;
  fotoUrl: string;
}

function getSheetsClient() {
  const email = import.meta.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = import.meta.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const sheetId = import.meta.env.GOOGLE_SHEET_ID;

  if (!email || !privateKey || !sheetId) {
    throw new Error(
      "Faltan variables de entorno de Google (GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, GOOGLE_SHEET_ID)"
    );
  }

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
