import { formatMoney } from "./currencies";
import type { PublicationProduct } from "./publicationPlan";

export interface Branding {
  storeName: string;
  brandColor: string;
}

const OUTPUT_WIDTH = 1080;
const OUTPUT_HEIGHT = 1350;

// Solo para slots chicos (grilla de 2-5 productos): le pedimos a Cloudinary
// una versión ya redimensionada en vez de bajar la foto de 1024x1280 completa
// y reescalarla nosotros. No toca ni reemplaza la foto original guardada;
// si la URL no matchea el patrón esperado de Cloudinary, se usa tal cual.
function urlMiniatura(fotoUrl: string, ancho: number, alto: number): string {
  const marcador = "/upload/";
  const idx = fotoUrl.indexOf(marcador);
  if (idx === -1 || !fotoUrl.includes("res.cloudinary.com")) return fotoUrl;
  const inicio = idx + marcador.length;
  return `${fotoUrl.slice(0, inicio)}c_fill,w_${ancho},h_${alto},q_auto,f_auto/${fotoUrl.slice(inicio)}`;
}

function cargarImagen(url: string, nombreProducto: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () =>
      reject(
        new Error(
          `No se pudo cargar la foto de "${nombreProducto}". Revisá la imagen o desmarcá ese producto e intentá nuevamente.`
        )
      );
    img.src = url;
  });
}

// Dibuja como "object-fit: cover" (Canvas no lo tiene nativo).
function dibujarCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  dx: number,
  dy: number,
  dWidth: number,
  dHeight: number
) {
  const escala = Math.max(dWidth / img.naturalWidth, dHeight / img.naturalHeight);
  const sWidth = dWidth / escala;
  const sHeight = dHeight / escala;
  const sx = (img.naturalWidth - sWidth) / 2;
  const sy = (img.naturalHeight - sHeight) / 2;
  ctx.drawImage(img, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight);
}

// Reduce el tamaño de fuente hasta que el texto entre en maxWidth; si ni al
// tamaño mínimo entra, trunca con "…". Devuelve el texto final a dibujar.
function ajustarTexto(
  ctx: CanvasRenderingContext2D,
  texto: string,
  maxWidth: number,
  peso: string,
  tamanoMax: number,
  tamanoMin: number
): { texto: string; tamano: number } {
  let tamano = tamanoMax;
  const fuente = (t: number) => `${peso} ${t}px system-ui, -apple-system, sans-serif`;

  ctx.font = fuente(tamano);
  while (tamano > tamanoMin && ctx.measureText(texto).width > maxWidth) {
    tamano -= 2;
    ctx.font = fuente(tamano);
  }

  let final = texto;
  if (ctx.measureText(final).width > maxWidth) {
    while (final.length > 1 && ctx.measureText(final + "…").width > maxWidth) {
      final = final.slice(0, -1);
    }
    final = final + "…";
  }

  return { texto: final, tamano };
}

function crearLienzo(): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement("canvas");
  canvas.width = OUTPUT_WIDTH;
  canvas.height = OUTPUT_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo crear el lienzo de composición.");
  return { canvas, ctx };
}

function canvasABlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("No se pudo generar la imagen de la publicación."))),
      "image/jpeg",
      0.9
    );
  });
}

function dibujarChipMarca(ctx: CanvasRenderingContext2D, branding: Branding) {
  const texto = branding.storeName;
  ctx.font = "700 34px system-ui, -apple-system, sans-serif";
  const anchoTexto = ctx.measureText(texto).width;
  const paddingX = 22;
  const alto = 56;
  const ancho = anchoTexto + paddingX * 2;
  const x = 32;
  const y = 32;
  const radio = alto / 2;

  ctx.fillStyle = branding.brandColor;
  ctx.beginPath();
  ctx.moveTo(x + radio, y);
  ctx.arcTo(x + ancho, y, x + ancho, y + alto, radio);
  ctx.arcTo(x + ancho, y + alto, x, y + alto, radio);
  ctx.arcTo(x, y + alto, x, y, radio);
  ctx.arcTo(x, y, x + ancho, y, radio);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#fff";
  ctx.textBaseline = "middle";
  ctx.fillText(texto, x + paddingX, y + alto / 2 + 2);
}

async function generarPlacaUnica(producto: PublicationProduct, branding: Branding): Promise<Blob> {
  const { canvas, ctx } = crearLienzo();

  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT);

  const img = await cargarImagen(producto.fotoUrl, producto.producto);
  dibujarCover(ctx, img, 0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT);

  const gradiente = ctx.createLinearGradient(0, OUTPUT_HEIGHT * 0.5, 0, OUTPUT_HEIGHT);
  gradiente.addColorStop(0, "rgba(0,0,0,0)");
  gradiente.addColorStop(1, "rgba(0,0,0,0.8)");
  ctx.fillStyle = gradiente;
  ctx.fillRect(0, OUTPUT_HEIGHT * 0.5, OUTPUT_WIDTH, OUTPUT_HEIGHT * 0.5);

  dibujarChipMarca(ctx, branding);

  const margenX = 48;
  const maxAnchoTexto = OUTPUT_WIDTH - margenX * 2;

  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#fff";
  const nombre = ajustarTexto(ctx, producto.producto, maxAnchoTexto, "700", 64, 36);
  ctx.font = `700 ${nombre.tamano}px system-ui, -apple-system, sans-serif`;
  ctx.fillText(nombre.texto, margenX, OUTPUT_HEIGHT - 150);

  const precioTexto = formatMoney(producto.precio, producto.moneda);
  const precio = ajustarTexto(ctx, precioTexto, maxAnchoTexto, "800", 84, 48);
  ctx.font = `800 ${precio.tamano}px system-ui, -apple-system, sans-serif`;
  ctx.fillText(precio.texto, margenX, OUTPUT_HEIGHT - 70);

  return canvasABlob(canvas);
}

async function generarPlacaLista(productos: PublicationProduct[], branding: Branding): Promise<Blob> {
  const { canvas, ctx } = crearLienzo();

  ctx.fillStyle = "#fafafa";
  ctx.fillRect(0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT);

  dibujarChipMarca(ctx, branding);

  ctx.fillStyle = "#111";
  ctx.textBaseline = "alphabetic";
  ctx.font = "700 44px system-ui, -apple-system, sans-serif";
  ctx.fillText("Novedades", 32, 168);

  const inicioLista = 210;
  const alturaDisponible = OUTPUT_HEIGHT - inicioLista - 32;
  const filas = productos.length;
  const altoFila = alturaDisponible / filas;
  const margenX = 32;
  const fotoLado = Math.min(altoFila - 24, 240);
  const anchoTextoMax = OUTPUT_WIDTH - margenX * 2 - fotoLado - 32;

  // Fotos cargadas de a una (no todas en paralelo): en dispositivos de gama
  // media el pico de memoria importa más que el tiempo total de espera.
  for (let i = 0; i < productos.length; i++) {
    const producto = productos[i];
    const yFila = inicioLista + i * altoFila;

    if (i > 0) {
      ctx.strokeStyle = "#e5e5e5";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(margenX, yFila);
      ctx.lineTo(OUTPUT_WIDTH - margenX, yFila);
      ctx.stroke();
    }

    const fotoY = yFila + (altoFila - fotoLado) / 2;
    const img = await cargarImagen(
      urlMiniatura(producto.fotoUrl, fotoLado * 2, fotoLado * 2),
      producto.producto
    );

    ctx.save();
    ctx.beginPath();
    const radio = 20;
    ctx.moveTo(margenX + radio, fotoY);
    ctx.arcTo(margenX + fotoLado, fotoY, margenX + fotoLado, fotoY + fotoLado, radio);
    ctx.arcTo(margenX + fotoLado, fotoY + fotoLado, margenX, fotoY + fotoLado, radio);
    ctx.arcTo(margenX, fotoY + fotoLado, margenX, fotoY, radio);
    ctx.arcTo(margenX, fotoY, margenX + fotoLado, fotoY, radio);
    ctx.closePath();
    ctx.clip();
    dibujarCover(ctx, img, margenX, fotoY, fotoLado, fotoLado);
    ctx.restore();

    const xTexto = margenX + fotoLado + 32;
    const nombre = ajustarTexto(ctx, producto.producto, anchoTextoMax, "700", 40, 26);
    ctx.fillStyle = "#111";
    ctx.font = `700 ${nombre.tamano}px system-ui, -apple-system, sans-serif`;
    ctx.fillText(nombre.texto, xTexto, yFila + altoFila / 2 - 6);

    const precioTexto = formatMoney(producto.precio, producto.moneda);
    const precio = ajustarTexto(ctx, precioTexto, anchoTextoMax, "800", 44, 28);
    ctx.fillStyle = branding.brandColor;
    ctx.font = `800 ${precio.tamano}px system-ui, -apple-system, sans-serif`;
    ctx.fillText(precio.texto, xTexto, yFila + altoFila / 2 + 44);
  }

  return canvasABlob(canvas);
}

export async function generarPlaca(productos: PublicationProduct[], branding: Branding): Promise<Blob> {
  if (productos.length === 0) {
    throw new Error("No hay productos para generar la publicación.");
  }
  if (productos.length === 1) {
    return generarPlacaUnica(productos[0], branding);
  }
  return generarPlacaLista(productos, branding);
}
