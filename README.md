# MUTE — Catálogo Express (plantilla base)

Este repositorio es la **plantilla base** de MUTE: catálogo + admin + carrito +
pedido por WhatsApp + publicaciones para redes, pensado para pequeños
comercios que venden por WhatsApp/Instagram/Facebook.

**Este repo NO se personaliza para ningún comercio.** Todo lo específico de
una tienda (nombre, color, WhatsApp, categorías, moneda, etc.) vive en
[`src/lib/storeConfig.ts`](./src/lib/storeConfig.ts) — para crear una tienda
nueva se genera un repositorio aparte con ese archivo ya completado, nunca se
edita este.

## Crear una tienda nueva

El script pide únicamente los datos que cambian entre comercios (nombre,
color, WhatsApp, Instagram, logo, categorías, moneda), crea un repositorio
nuevo a partir de este (usando la funcionalidad
["Template repository"](https://docs.github.com/es/repositories/creating-and-managing-repositories/creating-a-repository-from-a-template)
de GitHub) y aplica ahí — **solo ahí, nunca en este repo** — `storeConfig.ts`,
el nombre en `package.json` y un `README.md` propio con el checklist
pendiente (Google Sheets, Cloudinary, Vercel).

Requisitos antes de correrlo (cualquiera de las dos formas):
- Este repositorio marcado como "Template repository" en Settings de GitHub.
- Un personal access token de GitHub con permiso para crear repositorios
  (ver más abajo por qué un token restringido a este repo no alcanza).

**Opción 1 — desde GitHub Actions (sin PC local, sin clonar nada):**
pestaña *Actions* → *Crear nueva tienda MUTE* → *Run workflow*, completar el
formulario. El token se lee del secret `MUTE_GITHUB_TOKEN` — nunca se pide
por pantalla ni se imprime en los logs. Ver
[`.github/workflows/create-store.yml`](./.github/workflows/create-store.yml).

**Opción 2 — local:**
```
GITHUB_TOKEN=ghp_xxx npm run create-store
```

Las dos opciones corren exactamente el mismo
[`scripts/create-store.mjs`](./scripts/create-store.mjs): localmente pide
los datos por prompt; en GitHub Actions los toma de variables de entorno
(`STORE_NAME`, `STORE_SLUG`, `STORE_COLOR`, `STORE_WHATSAPP`,
`STORE_INSTAGRAM`, `STORE_LOGO`, `STORE_CATEGORIES`, `STORE_CURRENCY`) sin
abrir prompts. La Fase 2 (todavía no implementada) automatiza además la
creación del proyecto en Vercel y la carga de sus variables de entorno.

## Desarrollo de la plantilla

```
npm install
npm run dev      # servidor local
npm run test     # tests unitarios (node:test, sin dependencias nuevas)
npm run build    # build de producción
```

Ver `.env.example` para las variables de entorno necesarias (Google Sheets,
Cloudinary). Ninguna credencial real va en el repositorio.
