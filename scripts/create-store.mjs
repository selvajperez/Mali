#!/usr/bin/env node
// Crea una tienda MUTE nueva a partir de este repositorio (usado como
// "Template repository" de GitHub). Este script NUNCA debe modificar,
// commitear ni pushear nada en el propio repo template: todo lo que hace
// pasa dentro de un clon temporal del repositorio NUEVO, que se descarta al
// terminar. Ver README.md para el detalle de la regla.

import { createInterface } from "node:readline/promises";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, rmSync, appendFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const TEMPLATE_ROOT = process.cwd();
const NOMBRE_TEMPLATE_ESPERADO = "mute-upload-test";

// Modo no interactivo (GitHub Actions u otro entorno sin TTY): los 8
// parámetros se leen de variables de entorno en vez de prompts, usando
// exactamente las mismas funciones de transformar/validar. GitHub Actions
// siempre define GITHUB_ACTIONS=true; el chequeo de isTTY es un fallback
// para cualquier otro entorno sin terminal interactiva.
const modoNoInteractivo = process.env.GITHUB_ACTIONS === "true" || !process.stdin.isTTY;

// `secrets`: strings que nunca deben aparecer en un mensaje de error (p.ej.
// el token embebido en la URL de clone/push). git a veces repite la URL
// completa en sus propios mensajes de fatal/error, así que se redacta acá.
function sh(cmd, args, { secrets = [], ...opts } = {}) {
  const redactar = (texto) => secrets.reduce((t, s) => (s ? t.split(s).join("***") : t), texto);
  const res = spawnSync(cmd, args, { encoding: "utf8", ...opts });
  if (res.status !== 0) {
    const detalle = redactar((res.stderr || res.stdout || "").trim());
    const comando = redactar(`${cmd} ${args.join(" ")}`);
    throw new Error(`Falló "${comando}"${detalle ? `:\n${detalle}` : ""}`);
  }
  return redactar((res.stdout || "").trim());
}

function parseGitHubRemote(url) {
  const match = url.match(/github\.com[:/]([^/]+)\/(.+?)(\.git)?$/);
  if (!match) throw new Error(`No se pudo interpretar como remote de GitHub: ${url}`);
  return { owner: match[1], repo: match[2] };
}

function slugify(texto) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

function oscurecer(hex, factor = 0.2) {
  const n = parseInt(hex.slice(1), 16);
  const canal = (shift) => Math.round((((n >> shift) & 255) * (1 - factor)));
  const hex2 = (c) => c.toString(16).padStart(2, "0");
  return `#${hex2(canal(16))}${hex2(canal(8))}${hex2(canal(0))}`;
}

async function githubApi(token, apiPath, { method = "GET", body } = {}) {
  const res = await fetch(`https://api.github.com${apiPath}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res;
}

// --- Parche de storeConfig.ts (solo dentro del clon del repo nuevo) ---

function setConst(source, name, value, typeAnnotation) {
  const pattern = new RegExp(
    `export const ${name}${typeAnnotation ? `:\\s*${typeAnnotation}` : ""}\\s*=\\s*.+?;`
  );
  if (!pattern.test(source)) {
    throw new Error(
      `No se encontró "export const ${name}" en storeConfig.ts del repo nuevo. ` +
        "El archivo puede haber cambiado de forma incompatible con este script."
    );
  }
  const literal = JSON.stringify(value);
  const replacement = typeAnnotation
    ? `export const ${name}: ${typeAnnotation} = ${literal};`
    : `export const ${name} = ${literal};`;
  return source.replace(pattern, replacement);
}

function setCategories(source, categorias) {
  const pattern = /export const CATEGORIES = \[[\s\S]*?\] as const;/;
  if (!pattern.test(source)) {
    throw new Error(
      'No se encontró "export const CATEGORIES" en storeConfig.ts del repo nuevo. ' +
        "El archivo puede haber cambiado de forma incompatible con este script."
    );
  }
  const items = categorias.map((c) => `  ${JSON.stringify(c)},`).join("\n");
  return source.replace(pattern, `export const CATEGORIES = [\n${items}\n] as const;`);
}

function generarStoreReadme({ nombre, templateOwner, templateRepo, color, colorOscuro, whatsapp, instagram, logo, categorias, moneda }) {
  return `# ${nombre}

Tienda creada a partir de la plantilla [${templateOwner}/${templateRepo}](https://github.com/${templateOwner}/${templateRepo}).

## Antes de poner esto en producción

- [ ] Crear la hoja de Google Sheets del catálogo (columnas: \`id, Producto, Precio, Categoria, Stock, Foto URL, Activo, Moneda\`) y publicarla como CSV (Archivo → Compartir → Publicar en la web → CSV).
- [ ] Crear una Service Account de Google, compartirle la hoja, y cargar las credenciales en \`.env\` local y en Vercel (ver \`.env.example\`) — **nunca** en el repositorio.
- [ ] Crear/verificar la cuenta de Cloudinary y el upload preset sin firmar; cargar \`PUBLIC_CLOUDINARY_CLOUD_NAME\` y \`PUBLIC_CLOUDINARY_UPLOAD_PRESET\`.
- [ ] Crear el proyecto en Vercel, vincular este repositorio y cargar todas las variables de \`.env.example\`.
- [ ] (Opcional) Configurar dominio propio en Vercel.

## Parámetros aplicados por create-store

- Nombre: ${nombre}
- Color principal: ${color} (oscuro derivado: ${colorOscuro})
- WhatsApp: ${whatsapp}
- Instagram: ${instagram || "(no configurado)"}
- Logo: ${logo || "(no configurado; se muestra el nombre como texto)"}
- Categorías: ${categorias.join(", ")}
- Moneda por defecto: ${moneda}

El resto de \`src/lib/storeConfig.ts\` (mensajes de pedido, publicaciones, medios de pago, etc.) quedó con los defaults del template — se edita a mano si hace falta.

## Desarrollo

\`\`\`
npm install
npm run dev
\`\`\`

Ver \`.env.example\` para las variables de entorno necesarias.
`;
}

// --- Prompts ---

// Se crea recién al arrancar main(), nunca al importar el módulo (así los
// tests unitarios pueden importar las funciones puras sin abrir stdin).
let rl;

async function ask(pregunta, { default: def } = {}) {
  const sufijo = def ? ` [${def}]` : "";
  const respuesta = (await rl.question(`${pregunta}${sufijo}: `)).trim();
  return respuesta || def || "";
}

async function askValidado(pregunta, { default: def, validar, transformar } = {}) {
  for (;;) {
    const cruda = await ask(pregunta, { default: def });
    const valor = transformar ? transformar(cruda) : cruda;
    const error = validar ? validar(valor) : null;
    if (!error) return valor;
    console.log(`  ⚠ ${error}`);
  }
}

// Resuelve un parámetro desde el prompt interactivo o, en modo no
// interactivo, desde la variable de entorno indicada — reutilizando las
// mismas funciones transformar/validar en los dos casos.
async function resolverCampo(envVar, pregunta, opts = {}) {
  if (!modoNoInteractivo) return askValidado(pregunta, opts);

  // "||" (no "??"): un input de GitHub Actions sin completar llega como
  // string vacío, no como undefined — tiene que activar el default igual
  // que dejar el prompt interactivo en blanco.
  const cruda = process.env[envVar] || opts.default || "";
  const valor = opts.transformar ? opts.transformar(cruda) : cruda;
  const error = opts.validar ? opts.validar(valor) : null;
  if (error) throw new Error(`${envVar}="${cruda}" inválido: ${error}`);
  return valor;
}

// En GitHub Actions, además de la consola, deja el resumen en la pestaña
// "Summary" del run (no falla el proceso si no está disponible).
function escribirResumenActions(markdown) {
  const ruta = process.env.GITHUB_STEP_SUMMARY;
  if (!ruta) return;
  try {
    appendFileSync(ruta, markdown + "\n");
  } catch {
    // no bloquea el resto del script
  }
}

async function main() {
  if (!modoNoInteractivo) {
    rl = createInterface({ input: process.stdin, output: process.stdout });
  }
  console.log(`=== Crear nueva tienda MUTE ${modoNoInteractivo ? "(modo no interactivo)" : ""} ===\n`);

  // --- Pre-requisito: token de GitHub, antes de pedir nada más ---
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    console.error(
      "Falta la variable de entorno GITHUB_TOKEN (personal access token con permiso 'repo').\n" +
        "Local: definila y volvé a correr, ej. GITHUB_TOKEN=ghp_xxx npm run create-store\n" +
        "GitHub Actions: falta mapear el secret MUTE_GITHUB_TOKEN a GITHUB_TOKEN en el workflow."
    );
    process.exitCode = 1;
    rl?.close();
    return;
  }

  const originUrl = sh("git", ["-C", TEMPLATE_ROOT, "remote", "get-url", "origin"]);
  const { owner: templateOwner, repo: templateRepo } = parseGitHubRemote(originUrl);

  if (templateRepo !== NOMBRE_TEMPLATE_ESPERADO) {
    throw new Error(
      `Este script está pensado para correr sobre el template "${NOMBRE_TEMPLATE_ESPERADO}", ` +
        `pero el repo actual es "${templateOwner}/${templateRepo}". Abortando.`
    );
  }

  // --- Parámetros: solo los acordados ---
  const nombre = await resolverCampo("STORE_NAME", "Nombre del comercio", {
    validar: (v) => (v ? null : "No puede estar vacío."),
  });

  const slug = await resolverCampo("STORE_SLUG", "Slug / nombre del repositorio", {
    default: slugify(nombre),
    validar: (v) =>
      /^[A-Za-z0-9._-]{1,100}$/.test(v)
        ? null
        : "Solo letras, números, guiones y puntos (sin espacios).",
  });

  const color = await resolverCampo("STORE_COLOR", "Color principal (hex)", {
    default: "#1a7a3c",
    transformar: (v) => (v.startsWith("#") ? v : `#${v}`),
    validar: (v) => (/^#[0-9a-fA-F]{6}$/.test(v) ? null : "Formato esperado: #RRGGBB."),
  });

  const whatsapp = await resolverCampo(
    "STORE_WHATSAPP",
    "WhatsApp (solo dígitos, formato internacional, ej 5491122334455)",
    {
      transformar: (v) => v.replace(/[^\d]/g, ""),
      validar: (v) => (/^\d{8,15}$/.test(v) ? null : "Deben ser entre 8 y 15 dígitos."),
    }
  );

  const instagram = await resolverCampo("STORE_INSTAGRAM", "Instagram (URL completa, opcional)", {
    default: "",
    validar: (v) => (!v || /^https?:\/\//i.test(v) ? null : "Tiene que empezar con http:// o https://, o dejarlo vacío."),
  });

  const logo = await resolverCampo("STORE_LOGO", "URL del logo (opcional)", {
    default: "",
    validar: (v) => (!v || /^https?:\/\//i.test(v) ? null : "Tiene que empezar con http:// o https://, o dejarlo vacío."),
  });

  const categorias = await resolverCampo("STORE_CATEGORIES", "Categorías del catálogo (separadas por coma)", {
    default: "Hogar, Cocina, Belleza, Tecnología, Accesorios, Textil, Otros",
    transformar: (v) => v.split(",").map((c) => c.trim()).filter(Boolean),
    validar: (v) => (v.length > 0 ? null : "Tiene que haber al menos una categoría."),
  });

  const moneda = await resolverCampo("STORE_CURRENCY", "Moneda por defecto (ARS/USD)", {
    default: "ARS",
    transformar: (v) => v.toUpperCase(),
    validar: (v) => (v === "ARS" || v === "USD" ? null : 'Tiene que ser "ARS" o "USD".'),
  });

  const colorOscuro = oscurecer(color);

  // --- Confirmación ---
  console.log("\n--- Resumen ---");
  console.log(`Nombre:      ${nombre}`);
  console.log(`Repositorio: ${templateOwner}/${slug}`);
  console.log(`Color:       ${color} (oscuro: ${colorOscuro})`);
  console.log(`WhatsApp:    ${whatsapp}`);
  console.log(`Instagram:   ${instagram || "(no configurado)"}`);
  console.log(`Logo:        ${logo || "(no configurado)"}`);
  console.log(`Categorías:  ${categorias.join(", ")}`);
  console.log(`Moneda:      ${moneda}`);
  console.log("");

  if (modoNoInteractivo) {
    console.log(
      "Modo no interactivo: los parámetros ya fueron validados y confirmados al lanzar el workflow. Continuando automáticamente...\n"
    );
  } else {
    const confirmacion = await ask(`Se creará la tienda "${nombre}" en el repositorio "${templateOwner}/${slug}" con estos parámetros. ¿Continuar? S/N`, {
      default: "N",
    });
    if (!/^s(i|í)?$/i.test(confirmacion)) {
      console.log("Cancelado. No se hizo ninguna operación remota.");
      rl.close();
      return;
    }
    rl.close();
  }

  // --- Validaciones remotas (antes de crear nada) ---
  console.log("\nVerificando repositorio template y disponibilidad del nombre...");

  const templateInfoRes = await githubApi(token, `/repos/${templateOwner}/${templateRepo}`);
  if (!templateInfoRes.ok) {
    throw new Error(
      `No se pudo leer ${templateOwner}/${templateRepo} desde la API de GitHub (HTTP ${templateInfoRes.status}). ` +
        "Revisá el token y sus permisos."
    );
  }
  const templateInfo = await templateInfoRes.json();
  if (!templateInfo.is_template) {
    throw new Error(
      `"${templateOwner}/${templateRepo}" todavía no está marcado como "Template repository" en GitHub.\n` +
        `Activalo en https://github.com/${templateOwner}/${templateRepo}/settings (checkbox "Template repository") y volvé a correr el script.`
    );
  }

  const destinoRes = await githubApi(token, `/repos/${templateOwner}/${slug}`);
  if (destinoRes.status === 200) {
    throw new Error(`Ya existe un repositorio en https://github.com/${templateOwner}/${slug} — elegí otro slug.`);
  }
  if (destinoRes.status !== 404) {
    throw new Error(`No se pudo verificar si "${templateOwner}/${slug}" existe (HTTP ${destinoRes.status}).`);
  }

  // --- Crear el repo nuevo desde el template ---
  console.log(`Creando "${templateOwner}/${slug}" desde el template...`);
  const generarRes = await githubApi(token, `/repos/${templateOwner}/${templateRepo}/generate`, {
    method: "POST",
    body: {
      owner: templateOwner,
      name: slug,
      description: `Tienda MUTE: ${nombre}`,
      private: true,
      include_all_branches: false,
    },
  });

  let nuevoRepo;
  let creadoViaGenerate = true;

  if (generarRes.status === 201) {
    nuevoRepo = await generarRes.json();
  } else if (generarRes.status === 403) {
    // Algunos tokens (p.ej. fine-grained PAT, aunque tengan Administration +
    // Contents en "All repositories") no tienen acceso al endpoint
    // "generate" — es una limitación conocida de la API de GitHub, no un
    // permiso que falte configurar. Fallback: creamos un repo vacío y
    // copiamos el contenido del template nosotros mismos vía git.
    console.log('El endpoint "generate" no está disponible para este token (HTTP 403). Usando fallback: crear repo vacío + copiar el template vía git...');
    creadoViaGenerate = false;

    const ownerInfoRes = await githubApi(token, `/users/${templateOwner}`);
    const ownerInfo = ownerInfoRes.ok ? await ownerInfoRes.json() : null;
    const crearRepoPath = ownerInfo?.type === "Organization" ? `/orgs/${templateOwner}/repos` : "/user/repos";

    const crearRes = await githubApi(token, crearRepoPath, {
      method: "POST",
      body: { name: slug, description: `Tienda MUTE: ${nombre}`, private: true },
    });
    if (crearRes.status !== 201) {
      const cuerpo = await crearRes.text();
      throw new Error(`No se pudo crear el repositorio (HTTP ${crearRes.status}): ${cuerpo}`);
    }
    nuevoRepo = await crearRes.json();
  } else {
    const cuerpo = await generarRes.text();
    throw new Error(`No se pudo crear el repositorio (HTTP ${generarRes.status}): ${cuerpo}`);
  }

  console.log(`Repositorio creado: ${nuevoRepo.html_url}`);

  // A partir de acá el repo YA existe en GitHub. Si algo de lo que sigue
  // falla, el catch de abajo deja bien claro que hay que revisar/borrar
  // ese repo a mano en vez de perder ese dato en un error genérico.
  try {
    await personalizarRepoNuevo(creadoViaGenerate);
  } catch (err) {
    throw new Error(
      `El repositorio ya se creó en ${nuevoRepo.html_url}, pero falló la personalización: ${err.message}\n` +
        "Corregilo a mano (cloná ese repo y aplicá los cambios) o borralo desde GitHub y volvé a correr el script."
    );
  }

  async function personalizarRepoNuevo(creadoViaGenerate) {
    // --- Obtener el contenido a un directorio temporal (nunca tocamos el template) ---
    const tmpDir = mkdtempSync(path.join(tmpdir(), "mute-store-"));
    const cloneUrlNuevo = `https://x-access-token:${token}@github.com/${templateOwner}/${slug}.git`;

    if (creadoViaGenerate) {
      // "/generate" devuelve 201 antes de que GitHub termine de copiar el
      // contenido del template: un clone inmediato puede "funcionar" pero
      // traer el repo todavía vacío. Reintentamos hasta ver el archivo que
      // sabemos que tiene que estar, no solo hasta que el clone no tire error.
      console.log("Clonando el repositorio nuevo (puede tardar unos segundos mientras GitHub termina de generarlo)...");
      let listo = false;
      for (let intento = 1; intento <= 10 && !listo; intento++) {
        rmSync(tmpDir, { recursive: true, force: true });
        try {
          sh("git", ["clone", "--depth", "1", cloneUrlNuevo, tmpDir], { secrets: [token] });
          listo = existsSync(path.join(tmpDir, "src/lib/storeConfig.ts"));
        } catch {
          listo = false;
        }
        if (!listo) {
          if (intento === 10) {
            throw new Error(
              "El repositorio se creó pero, después de varios intentos, GitHub todavía no terminó de copiar el contenido del template. Esperá un momento y volvé a intentar la personalización a mano."
            );
          }
          await new Promise((r) => setTimeout(r, 2000));
        }
      }
    } else {
      // Fallback sin "/generate": el repo nuevo está vacío. Clonamos el
      // CONTENIDO del template, le sacamos el historial de git y apuntamos
      // un remote nuevo hacia el repo recién creado.
      const cloneUrlTemplate = `https://x-access-token:${token}@github.com/${templateOwner}/${templateRepo}.git`;
      console.log("Clonando el contenido del template para copiarlo al repositorio nuevo (fallback sin 'generate')...");
      sh("git", ["clone", "--depth", "1", cloneUrlTemplate, tmpDir], { secrets: [token] });
      rmSync(path.join(tmpDir, ".git"), { recursive: true, force: true });
      sh("git", ["-C", tmpDir, "init", "-b", "main"], { secrets: [token] });
      sh("git", ["-C", tmpDir, "remote", "add", "origin", cloneUrlNuevo], { secrets: [token] });
    }

    // Guardia de seguridad: origin tiene que apuntar al repo NUEVO, jamás al template.
    // (Redactamos el token: esta URL lo lleva embebido en el userinfo.)
    const remoteClonado = sh("git", ["-C", tmpDir, "remote", "get-url", "origin"], { secrets: [token] });
    const parsedClonado = parseGitHubRemote(remoteClonado);
    if (parsedClonado.owner === templateOwner && parsedClonado.repo === templateRepo) {
      throw new Error("Guardia de seguridad: el clon apunta al repositorio template. Abortando sin commitear nada.");
    }

    // --- Aplicar los cambios SOLO en el clon del repo nuevo ---
    const storeConfigPath = path.join(tmpDir, "src/lib/storeConfig.ts");
    let storeConfig = readFileSync(storeConfigPath, "utf8");
    storeConfig = setConst(storeConfig, "STORE_NAME", nombre);
    storeConfig = setConst(storeConfig, "BRAND_COLOR", color);
    storeConfig = setConst(storeConfig, "BRAND_COLOR_DARK", colorOscuro);
    storeConfig = setConst(storeConfig, "STORE_LOGO_URL", logo);
    storeConfig = setConst(storeConfig, "WHATSAPP_PHONE", whatsapp);
    storeConfig = setConst(storeConfig, "INSTAGRAM_URL", instagram);
    storeConfig = setConst(storeConfig, "DEFAULT_CURRENCY", moneda, "Currency");
    storeConfig = setCategories(storeConfig, categorias);
    writeFileSync(storeConfigPath, storeConfig);

    const packageJsonPath = path.join(tmpDir, "package.json");
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
    packageJson.name = slug;
    writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + "\n");

    const readmePath = path.join(tmpDir, "README.md");
    writeFileSync(
      readmePath,
      generarStoreReadme({
        nombre,
        templateOwner,
        templateRepo,
        color,
        colorOscuro,
        whatsapp,
        instagram,
        logo,
        categorias,
        moneda,
      })
    );

    // --- Commit + push, exclusivamente en el clon del repo nuevo ---
    if (creadoViaGenerate) {
      // El repo ya tenía el resto del contenido con su propio historial:
      // solo commiteamos los 3 archivos que tocamos.
      sh("git", ["-C", tmpDir, "add", "src/lib/storeConfig.ts", "package.json", "README.md"], {
        secrets: [token],
      });
      sh(
        "git",
        [
          "-C",
          tmpDir,
          "-c",
          "user.email=create-store@local",
          "-c",
          "user.name=MUTE create-store",
          "commit",
          "-m",
          `Configurar tienda: ${nombre}`,
        ],
        { secrets: [token] }
      );
      sh("git", ["-C", tmpDir, "push", "origin", "HEAD"], { secrets: [token] });
    } else {
      // Repo vacío: el commit inicial tiene que llevar TODO el árbol del
      // template (no solo los 3 archivos tocados), y el push crea "main".
      sh("git", ["-C", tmpDir, "add", "-A"], { secrets: [token] });
      sh(
        "git",
        [
          "-C",
          tmpDir,
          "-c",
          "user.email=create-store@local",
          "-c",
          "user.name=MUTE create-store",
          "commit",
          "-m",
          `Tienda inicial: ${nombre} (desde ${templateOwner}/${templateRepo})`,
        ],
        { secrets: [token] }
      );
      sh("git", ["-C", tmpDir, "push", "origin", "HEAD:main"], { secrets: [token] });
    }

    rmSync(tmpDir, { recursive: true, force: true });
  }

  // --- Resumen final ---
  console.log("\n=== Listo ===");
  console.log(`Nombre de tienda: ${nombre}`);
  console.log(`Repositorio:      ${nuevoRepo.html_url}`);
  console.log("Parámetros aplicados:");
  console.log(`  - Color: ${color} (oscuro: ${colorOscuro})`);
  console.log(`  - WhatsApp: ${whatsapp}`);
  console.log(`  - Instagram: ${instagram || "(no configurado)"}`);
  console.log(`  - Logo: ${logo || "(no configurado)"}`);
  console.log(`  - Categorías: ${categorias.join(", ")}`);
  console.log(`  - Moneda: ${moneda}`);
  console.log("\nChecklist pendiente (manual):");
  console.log("  [ ] Google Sheet del catálogo + publicarla como CSV");
  console.log("  [ ] Credenciales de la Service Account de Google");
  console.log("  [ ] Cuenta/preset de Cloudinary");
  console.log("  [ ] Proyecto en Vercel + variables de entorno + deploy");
  console.log("  [ ] Dominio propio (opcional)");

  escribirResumenActions(
    [
      "## Tienda creada",
      "",
      `- **Nombre:** ${nombre}`,
      `- **Repositorio:** ${nuevoRepo.html_url}`,
      "",
      "### Parámetros aplicados",
      "",
      `- Color: ${color} (oscuro: ${colorOscuro})`,
      `- WhatsApp: ${whatsapp}`,
      `- Instagram: ${instagram || "(no configurado)"}`,
      `- Logo: ${logo || "(no configurado)"}`,
      `- Categorías: ${categorias.join(", ")}`,
      `- Moneda: ${moneda}`,
      "",
      "### Checklist pendiente",
      "",
      "- [ ] Google Sheet del catálogo + publicarla como CSV",
      "- [ ] Credenciales de la Service Account de Google",
      "- [ ] Cuenta/preset de Cloudinary",
      "- [ ] Proyecto en Vercel + variables de entorno + deploy",
      "- [ ] Dominio propio (opcional)",
    ].join("\n")
  );
}

const esEjecucionDirecta = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (esEjecucionDirecta) {
  main().catch((err) => {
    console.error(`\n✕ ${err.message}`);
    process.exitCode = 1;
  });
}

// Exportadas solo para tests unitarios (tests/createStore.test.ts); no afecta
// la ejecución normal vía "npm run create-store".
export { slugify, oscurecer, parseGitHubRemote, setConst, setCategories };
