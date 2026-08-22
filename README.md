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

```
GITHUB_TOKEN=ghp_xxx npm run create-store
```

El script pide únicamente los datos que cambian entre comercios (nombre,
color, WhatsApp, Instagram, logo, categorías, moneda), crea un repositorio
nuevo a partir de este (usando la funcionalidad
["Template repository"](https://docs.github.com/es/repositories/creating-and-managing-repositories/creating-a-repository-from-a-template)
de GitHub) y aplica ahí — **solo ahí, nunca en este repo** — `storeConfig.ts`,
el nombre en `package.json` y un `README.md` propio con el checklist
pendiente (Google Sheets, Cloudinary, Vercel).

Requisitos antes de correrlo:
- Este repositorio marcado como "Template repository" en Settings de GitHub.
- Una variable de entorno `GITHUB_TOKEN` (personal access token con permiso
  `repo`) — nunca se pide por prompt ni se imprime en la salida.

Ver [`scripts/create-store.mjs`](./scripts/create-store.mjs) para el detalle.
La Fase 2 (todavía no implementada) automatiza además la creación del
proyecto en Vercel y la carga de sus variables de entorno.

## Desarrollo de la plantilla

```
npm install
npm run dev      # servidor local
npm run test     # tests unitarios (node:test, sin dependencias nuevas)
npm run build    # build de producción
```

Ver `.env.example` para las variables de entorno necesarias (Google Sheets,
Cloudinary). Ninguna credencial real va en el repositorio.
