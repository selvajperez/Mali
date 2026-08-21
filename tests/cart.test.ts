import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildWhatsAppMessage,
  calcularTotalesPorMoneda,
  contarUnidades,
  type CartItem,
} from "../src/lib/cart.ts";

function item(overrides: Partial<CartItem>): CartItem {
  return {
    id: "MUT001",
    nombre: "Producto",
    precio: 10000,
    fotoUrl: "https://example.com/foto.jpg",
    cantidad: 1,
    moneda: "ARS",
    ...overrides,
  };
}

// A) pedido dentro del stock: sin advertencia
test("sin advertencia cuando la cantidad pedida entra en el stock", () => {
  const carrito = [item({ id: "MUT001", cantidad: 2 })];
  const mensaje = buildWhatsAppMessage(carrito, { MUT001: 5 });
  assert.match(mensaje, /- 2 x Producto/);
  assert.doesNotMatch(mensaje, /⚠/);
});

// B) pedido superior al stock: advertencia con cantidad faltante
test("advertencia cuando la cantidad pedida supera el stock", () => {
  const carrito = [item({ id: "MUT001", nombre: "Producto A", cantidad: 5 })];
  const mensaje = buildWhatsAppMessage(carrito, { MUT001: 2 });
  assert.match(mensaje, /- 5 x Producto A/);
  assert.match(mensaje, /⚠ Stock disponible: 2 — faltan 3 unidades/);
});

// C) varios productos, uno con faltante y otro sin faltante
test("solo advierte sobre el producto que tiene faltante", () => {
  const carrito = [
    item({ id: "A", nombre: "Con stock", cantidad: 1 }),
    item({ id: "B", nombre: "Sin stock suficiente", cantidad: 4 }),
  ];
  const mensaje = buildWhatsAppMessage(carrito, { A: 3, B: 1 });
  const lineas = mensaje.split("\n");
  const idxA = lineas.findIndex((l) => l.includes("Con stock"));
  const idxB = lineas.findIndex((l) => l.includes("Sin stock suficiente"));
  assert.doesNotMatch(lineas[idxA + 1] ?? "", /⚠/);
  assert.match(lineas[idxB + 1] ?? "", /⚠ Stock disponible: 1 — faltan 3 unidades/);
});

// D) dos productos con faltante: cada uno informado por separado
test("informa el faltante de cada producto por separado", () => {
  const carrito = [
    item({ id: "A", nombre: "Producto A", cantidad: 5 }),
    item({ id: "B", nombre: "Producto B", cantidad: 3 }),
  ];
  const mensaje = buildWhatsAppMessage(carrito, { A: 2, B: 1 });
  assert.match(mensaje, /⚠ Stock disponible: 2 — faltan 3 unidades/);
  assert.match(mensaje, /⚠ Stock disponible: 1 — faltan 2 unidades/);
  assert.equal((mensaje.match(/⚠/g) ?? []).length, 2);
});

// E) carrito mixto ARS + USD: totales separados, sin conversión
test("mantiene totales separados por moneda en carrito mixto", () => {
  const carrito = [
    item({ id: "A", nombre: "Producto ARS", precio: 10000, cantidad: 2, moneda: "ARS" }),
    item({ id: "B", nombre: "Producto USD", precio: 50, cantidad: 3, moneda: "USD" }),
  ];
  const totales = calcularTotalesPorMoneda(carrito);
  assert.deepEqual(
    totales,
    [
      { moneda: "ARS", total: 20000 },
      { moneda: "USD", total: 150 },
    ]
  );
  const mensaje = buildWhatsAppMessage(carrito);
  assert.match(mensaje, /Total ARS: \$ 20\.000/);
  assert.match(mensaje, /Total USD: USD 150/);
});

// F) producto agotado (stock 0): faltante = cantidad pedida completa
test("stock 0 muestra faltante igual a la cantidad pedida", () => {
  const carrito = [item({ id: "MUT001", nombre: "Agotado", cantidad: 3 })];
  const mensaje = buildWhatsAppMessage(carrito, { MUT001: 0 });
  assert.match(mensaje, /⚠ Stock disponible: 0 — faltan 3 unidades/);
});

// 6) los totales representan la cantidad solicitada, no la disponible
test("el total usa la cantidad solicitada aunque falte stock", () => {
  const carrito = [item({ id: "A", nombre: "Producto A", precio: 10000, cantidad: 5 })];
  const totales = calcularTotalesPorMoneda(carrito);
  assert.deepEqual(totales, [{ moneda: "ARS", total: 50000 }]);
});

test("sin mapa de stock no agrega advertencias (compatibilidad)", () => {
  const carrito = [item({ id: "MUT001", cantidad: 999 })];
  const mensaje = buildWhatsAppMessage(carrito);
  assert.doesNotMatch(mensaje, /⚠/);
});

test("usa singular cuando falta exactamente una unidad", () => {
  const carrito = [item({ id: "MUT001", nombre: "Gato Yogui", cantidad: 2 })];
  const mensaje = buildWhatsAppMessage(carrito, { MUT001: 1 });
  assert.match(mensaje, /⚠ Stock disponible: 1 — faltan 1 unidad$/m);
  assert.doesNotMatch(mensaje, /unidades/);
});

test("contarUnidades suma todas las cantidades del carrito", () => {
  const carrito = [item({ cantidad: 2 }), item({ id: "B", cantidad: 3 })];
  assert.equal(contarUnidades(carrito), 5);
});
