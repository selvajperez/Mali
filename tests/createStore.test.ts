import { test } from "node:test";
import assert from "node:assert/strict";
import {
  slugify,
  oscurecer,
  parseGitHubRemote,
  setConst,
  setCategories,
} from "../scripts/create-store.mjs";

test("slugify: nombre con acentos, mayúsculas y espacios", () => {
  assert.equal(slugify("Proyecto Jardín"), "proyecto-jardin");
});

test("slugify: colapsa separadores y recorta guiones en los bordes", () => {
  assert.equal(slugify("  Café & Deco!! "), "cafe-deco");
});

test("oscurecer: devuelve un hex válido más oscuro que el original", () => {
  const oscuro = oscurecer("#1a7a3c");
  assert.match(oscuro, /^#[0-9a-f]{6}$/);
  const canal = (hex: string, i: number) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
  for (let i = 0; i < 3; i++) {
    assert.ok(canal(oscuro, i) <= canal("#1a7a3c", i));
  }
});

test("parseGitHubRemote: formato https", () => {
  assert.deepEqual(parseGitHubRemote("https://github.com/selvajperez/mute-upload-test.git"), {
    owner: "selvajperez",
    repo: "mute-upload-test",
  });
});

test("parseGitHubRemote: formato https con token embebido", () => {
  assert.deepEqual(
    parseGitHubRemote("https://x-access-token:ghp_xxx@github.com/acme/tienda-jardin.git"),
    { owner: "acme", repo: "tienda-jardin" }
  );
});

test("parseGitHubRemote: formato ssh", () => {
  assert.deepEqual(parseGitHubRemote("git@github.com:selvajperez/mute-upload-test.git"), {
    owner: "selvajperez",
    repo: "mute-upload-test",
  });
});

test("parseGitHubRemote: url invalida tira error", () => {
  assert.throws(() => parseGitHubRemote("https://example.com/no-es-github"));
});

const STORE_CONFIG_DE_PRUEBA = `import type { Currency } from "./currencies";

export const STORE_NAME = "MUTE";

export const BRAND_COLOR = "#1a7a3c";
export const BRAND_COLOR_DARK = "#14602f";

export const STORE_LOGO_URL = "";

export const WHATSAPP_PHONE = "5491159657132";

export const INSTAGRAM_URL = "";
export const FACEBOOK_URL = "";

export const CATEGORIES = [
  "Hogar",
  "Cocina",
] as const;

export const DEFAULT_CURRENCY: Currency = "ARS";
`;

test("setConst: reemplaza un const simple y preserva el resto del archivo", () => {
  const resultado = setConst(STORE_CONFIG_DE_PRUEBA, "STORE_NAME", "Proyecto Jardín");
  assert.match(resultado, /export const STORE_NAME = "Proyecto Jardín";/);
  assert.match(resultado, /export const FACEBOOK_URL = "";/); // no tocado
});

test("setConst: respeta la anotación de tipo (DEFAULT_CURRENCY: Currency)", () => {
  const resultado = setConst(STORE_CONFIG_DE_PRUEBA, "DEFAULT_CURRENCY", "USD", "Currency");
  assert.match(resultado, /export const DEFAULT_CURRENCY: Currency = "USD";/);
});

test("setConst: escapa comillas/backslashes vía JSON.stringify (sin inyectar código)", () => {
  const resultado = setConst(STORE_CONFIG_DE_PRUEBA, "STORE_NAME", 'Casa "La Única"');
  assert.match(resultado, /export const STORE_NAME = "Casa \\"La Única\\"";/);
});

test("setConst: tira error claro si la constante no existe", () => {
  assert.throws(
    () => setConst(STORE_CONFIG_DE_PRUEBA, "NO_EXISTE", "x"),
    /No se encontró "export const NO_EXISTE"/
  );
});

test("setCategories: reemplaza el array completo", () => {
  const resultado = setCategories(STORE_CONFIG_DE_PRUEBA, ["Plantas", "Macetas", "Deco"]);
  assert.match(resultado, /export const CATEGORIES = \[\n  "Plantas",\n  "Macetas",\n  "Deco",\n\] as const;/);
  assert.doesNotMatch(resultado, /"Hogar"/);
});

test("setCategories: tira error claro si no encuentra el array", () => {
  assert.throws(
    () => setCategories("export const OTRA_COSA = 1;", ["Plantas"]),
    /No se encontró "export const CATEGORIES"/
  );
});
