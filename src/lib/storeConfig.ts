import type { Currency } from "./currencies";

// --- Identidad ---

export const STORE_NAME = "Mali";

// Territorio "Tallo": musgo como color de marca y coral reservado para
// detalles mínimos. El crema y el carbón sostienen una estética fresca,
// delicada y editorial.
export const BRAND_COLOR = "#53624A";
export const BRAND_COLOR_DARK = "#3F4B38";

export const STORE_LOGO_URL =
  "https://res.cloudinary.com/srxrmckc/image/upload/v1787867613/mali-lockup-principal-musgo-tienda-de-flores.svg";

// Mali se presenta como marca independiente.
export const PARENT_BRAND_MARK_URL = "";

// --- Estilo visual (tipografía y fondo) ---
// Opcionales por tienda. Estos defaults reproducen el look actual del
// template (fuente del sistema, fondo gris claro) — no cambian nada para
// un comercio que no las toque.

// Cormorant Garamond aporta el gesto editorial en títulos y DM Sans mantiene
// el catálogo limpio y legible en textos, precios y controles.
export const FONT_HEADING = "'Cormorant Garamond', Georgia, serif";
export const FONT_BODY = "'DM Sans', Arial, sans-serif";

export const BACKGROUND_COLOR = "#F6F1E7";

// Acentos secundarios opcionales (etiquetas/chips), superficie de tarjetas y
// texto/bordes secundarios. Defaults = los grises neutros que ya usaba el
// template — ningún comercio existente cambia visualmente sin tocar esto.
export const ACCENT_COLOR = "#D96B5F";
export const SURFACE_COLOR = "#FBF8F1";
export const SECONDARY_TEXT_COLOR = "#65705E";
export const TEXT_COLOR = "#252521";

// URL de Google Fonts a cargar (opcional). Vacío = no se agrega ningún
// <link> extra al <head>; se usan las fuentes ya instaladas del sistema.
export const GOOGLE_FONTS_URL =
  "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600&family=DM+Sans:wght@400;500;600&display=swap";

// --- Contacto ---

// Formato internacional, solo dígitos (sin "+", espacios ni guiones).
export const WHATSAPP_PHONE = "5491133076423";

// Vacíos = no se muestra el link correspondiente en el catálogo.
export const INSTAGRAM_URL = "";
export const FACEBOOK_URL = "";

// --- Catálogo ---

export const CATEGORIES = [
  "Clásicos",
  "Silvestres",
  "Especiales",
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
// Categoría "" = sin default: el campo Categoría queda visible también en
// Carga rápida para que el comerciante la elija a mano (no hay una que sirva
// de "cajón de sastre" entre las categorías actuales).
export const QUICK_ADD_DEFAULT_CATEGORY: (typeof CATEGORIES)[number] | "" = "";
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
