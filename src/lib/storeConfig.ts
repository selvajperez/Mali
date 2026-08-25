import type { Currency } from "./currencies";

// --- Identidad ---

export const STORE_NAME = "MUTE";

export const BRAND_COLOR = "#1a7a3c";
export const BRAND_COLOR_DARK = "#14602f";

// Vacío = se muestra STORE_NAME como texto (comportamiento actual). Con un
// valor, el header muestra esa imagen en su lugar.
export const STORE_LOGO_URL = "";

// --- Estilo visual (tipografía y fondo) ---
// Opcionales por tienda. Estos defaults reproducen el look actual del
// template (fuente del sistema, fondo gris claro) — no cambian nada para
// un comercio que no las toque.

// Tipografía de títulos/marca (header, h1) vs. cuerpo (todo lo demás:
// productos, precios, controles, formularios). Mismo default = sin efecto.
export const FONT_HEADING = "system-ui, sans-serif";
export const FONT_BODY = "system-ui, sans-serif";

export const BACKGROUND_COLOR = "#fafafa";

// Acentos secundarios opcionales (etiquetas/chips), superficie de tarjetas y
// texto/bordes secundarios. Defaults = los grises neutros que ya usaba el
// template — ningún comercio existente cambia visualmente sin tocar esto.
export const ACCENT_COLOR = "#444444";
export const SURFACE_COLOR = "#ffffff";
export const SECONDARY_TEXT_COLOR = "#888888";

// URL de Google Fonts a cargar (opcional). Vacío = no se agrega ningún
// <link> extra al <head>; se usan las fuentes ya instaladas del sistema.
export const GOOGLE_FONTS_URL = "";

// --- Contacto ---

// Formato internacional, solo dígitos (sin "+", espacios ni guiones).
export const WHATSAPP_PHONE = "5491159657132";

// Vacíos = no se muestra el link correspondiente en el catálogo.
export const INSTAGRAM_URL = "";
export const FACEBOOK_URL = "";

// --- Catálogo ---

export const CATEGORIES = [
  "Hogar",
  "Cocina",
  "Belleza",
  "Tecnología",
  "Accesorios",
  "Textil",
  "Otros",
] as const;

// Usada como fallback cuando un producto no tiene moneda válida (filas
// viejas de Sheets, carritos guardados antes de sumar moneda, etc.).
export const DEFAULT_CURRENCY: Currency = "ARS";

export const EMPTY_CATALOG_TEXT = "Todavía no hay productos publicados.";
export const NO_RESULTS_TEXT = "No encontramos productos que coincidan.";

// --- Pedidos (mensaje de WhatsApp del carrito) ---

export const ORDER_GREETING = "Hola, quiero hacer este pedido:";
export const ORDER_CLOSING = "Quedo a la espera de confirmación de disponibilidad.";

// Vacíos = no se agrega esa línea al mensaje (comportamiento actual).
export const DELIVERY_INFO = "";
export const PICKUP_INFO = "";

// --- Publicaciones para redes ---
// Texto sugerido para "Preparar publicación". Editable por el comerciante
// antes de compartir; estas son solo las piezas por defecto.

export const PUBLICATION_TITLE = "✨ Novedades";
export const PUBLICATION_CLOSING = "📦 Consultanos disponibilidad.\n📲 Pedidos por WhatsApp.";
export const PUBLICATION_HASHTAGS: string[] = [];

// --- Alta de productos ---

// Prefijo de los ids generados al publicar (ej. "MUT123456").
export const PRODUCT_ID_PREFIX = "MUT";

// Valores automáticos del modo "Carga rápida" del admin (categoría y stock;
// la moneda usa DEFAULT_CURRENCY de arriba). Cada tienda define los suyos.
export const QUICK_ADD_DEFAULT_CATEGORY: (typeof CATEGORIES)[number] = "Otros";
export const QUICK_ADD_DEFAULT_STOCK = 1;

// --- Medios de pago ---
// Solo informativos: no hay cobro online ni pasarela de pago. Se muestran en
// el catálogo los que tengan activo:true; el resto queda listo para activar
// sin tocar código.

export interface MedioPagoEfectivo {
  tipo: "efectivo";
  activo: boolean;
  nota?: string;
}

export interface MedioPagoTransferencia {
  tipo: "transferencia";
  activo: boolean;
  alias?: string;
  cbu?: string;
  titular?: string;
}

export interface MedioPagoMercadoPago {
  tipo: "mercadoPago";
  activo: boolean;
  alias?: string;
  link?: string;
}

export interface MedioPagoTarjeta {
  tipo: "tarjeta";
  activo: boolean;
  nota?: string;
}

export interface MedioPagoContraEntrega {
  tipo: "contraEntrega";
  activo: boolean;
  nota?: string;
}

export interface MedioPagoOtro {
  tipo: "otro";
  activo: boolean;
  nombre: string;
  descripcion?: string;
}

export type MedioPago =
  | MedioPagoEfectivo
  | MedioPagoTransferencia
  | MedioPagoMercadoPago
  | MedioPagoTarjeta
  | MedioPagoContraEntrega
  | MedioPagoOtro;

// Vacío por defecto: no se muestra la sección "Medios de pago" hasta que se
// configure al menos uno (comportamiento actual, sin cambios visibles).
export const PAYMENT_METHODS: MedioPago[] = [];
