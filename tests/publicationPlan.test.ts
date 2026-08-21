import { test } from "node:test";
import assert from "node:assert/strict";
import {
  planPlacas,
  buildSuggestedText,
  MAX_PRODUCTOS_PUBLICACION,
  type PublicationProduct,
} from "../src/lib/publicationPlan.ts";

function producto(overrides: Partial<PublicationProduct>): PublicationProduct {
  return {
    id: "MUT001",
    producto: "Producto",
    precio: 1000,
    moneda: "ARS",
    fotoUrl: "https://example.com/foto.jpg",
    ...overrides,
  };
}

function productos(n: number): PublicationProduct[] {
  return Array.from({ length: n }, (_, i) => producto({ id: `P${i}`, producto: `Producto ${i}` }));
}

test("MAX_PRODUCTOS_PUBLICACION es 10", () => {
  assert.equal(MAX_PRODUCTOS_PUBLICACION, 10);
});

test("0 productos no genera placas", () => {
  assert.deepEqual(planPlacas(productos(0)), []);
});

test("1 producto -> una placa con 1 producto", () => {
  const grupos = planPlacas(productos(1));
  assert.equal(grupos.length, 1);
  assert.equal(grupos[0].length, 1);
});

for (const n of [2, 3, 4, 5]) {
  test(`${n} productos -> una sola placa con los ${n}`, () => {
    const grupos = planPlacas(productos(n));
    assert.equal(grupos.length, 1);
    assert.equal(grupos[0].length, n);
  });
}

test("6 productos -> dos placas 3 + 3", () => {
  const grupos = planPlacas(productos(6));
  assert.deepEqual(grupos.map((g) => g.length), [3, 3]);
});

test("7 productos -> dos placas 4 + 3", () => {
  const grupos = planPlacas(productos(7));
  assert.deepEqual(grupos.map((g) => g.length), [4, 3]);
});

test("8 productos -> dos placas 4 + 4", () => {
  const grupos = planPlacas(productos(8));
  assert.deepEqual(grupos.map((g) => g.length), [4, 4]);
});

test("9 productos -> dos placas 5 + 4", () => {
  const grupos = planPlacas(productos(9));
  assert.deepEqual(grupos.map((g) => g.length), [5, 4]);
});

test("10 productos -> dos placas 5 + 5", () => {
  const grupos = planPlacas(productos(10));
  assert.deepEqual(grupos.map((g) => g.length), [5, 5]);
});

test("cada placa nunca supera 5 productos, de 1 a 10", () => {
  for (let n = 1; n <= 10; n++) {
    const grupos = planPlacas(productos(n));
    for (const grupo of grupos) {
      assert.ok(grupo.length <= 5, `placa con ${grupo.length} productos (n=${n})`);
    }
    assert.equal(
      grupos.reduce((total, g) => total + g.length, 0),
      n
    );
  }
});

test("las placas no repiten ni pierden productos (10 -> ids completos)", () => {
  const original = productos(10);
  const grupos = planPlacas(original);
  const idsResultado = grupos.flat().map((p) => p.id);
  assert.deepEqual(idsResultado, original.map((p) => p.id));
});

test("texto sugerido: incluye titulo, productos con moneda correcta y frase final", () => {
  const seleccion = [
    producto({ id: "A", producto: "Bebe", precio: 258, moneda: "USD" }),
    producto({ id: "B", producto: "Lady", precio: 352, moneda: "ARS" }),
  ];
  const texto = buildSuggestedText(seleccion, {
    titulo: "✨ Novedades",
    fraseFinal: "📦 Consultanos disponibilidad.\n📲 Pedidos por WhatsApp.",
  });

  assert.match(texto, /^✨ Novedades/);
  assert.match(texto, /• Bebe — USD 258/);
  assert.match(texto, /• Lady — \$ 352/);
  assert.match(texto, /📦 Consultanos disponibilidad\.\n📲 Pedidos por WhatsApp\.$/);
});

test("texto sugerido: no convierte ni mezcla ARS y USD", () => {
  const seleccion = [
    producto({ id: "A", producto: "Producto ARS", precio: 25000, moneda: "ARS" }),
    producto({ id: "B", producto: "Producto USD", precio: 50, moneda: "USD" }),
  ];
  const texto = buildSuggestedText(seleccion, { titulo: "Novedades", fraseFinal: "Cierre" });

  assert.match(texto, /\$ 25\.000/);
  assert.match(texto, /USD 50/);
  assert.doesNotMatch(texto, /\$ 25050|USD 25050/);
});

test("texto sugerido: agrega hashtags al final cuando se pasan", () => {
  const texto = buildSuggestedText([producto({})], {
    titulo: "Novedades",
    fraseFinal: "Cierre",
    hashtags: ["oferta", "#promo"],
  });
  assert.match(texto, /#oferta #promo$/);
});

test("texto sugerido: sin hashtags no agrega linea extra", () => {
  const texto = buildSuggestedText([producto({})], { titulo: "Novedades", fraseFinal: "Cierre" });
  assert.doesNotMatch(texto, /#/);
});
