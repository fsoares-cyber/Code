import assert from "node:assert/strict";
import { test } from "node:test";
import { round2, round6, roundToLotAndMultiple } from "./rounding";

test("roundToLotAndMultiple: exemplo do briefing — 1.100 com mínimo 1.000 e múltiplo 250 -> 1.250", () => {
  assert.equal(roundToLotAndMultiple(1100, 1000, 250), 1250);
});

test("roundToLotAndMultiple: necessidade abaixo do lote mínimo compra o lote mínimo", () => {
  assert.equal(roundToLotAndMultiple(900, 1000, 250), 1000);
});

test("roundToLotAndMultiple: necessidade exatamente no lote mínimo não soma múltiplo", () => {
  assert.equal(roundToLotAndMultiple(1000, 1000, 250), 1000);
});

test("roundToLotAndMultiple: necessidade exatamente em um múltiplo acima do mínimo não arredonda para cima", () => {
  assert.equal(roundToLotAndMultiple(1250, 1000, 250), 1250);
});

test("roundToLotAndMultiple: necessidade zero ou negativa não compra nada", () => {
  assert.equal(roundToLotAndMultiple(0, 1000, 250), 0);
  assert.equal(roundToLotAndMultiple(-5, 1000, 250), 0);
});

test("roundToLotAndMultiple: múltiplo 1 (ou não informado) arredonda só pelo lote mínimo", () => {
  assert.equal(roundToLotAndMultiple(5.1, 5, 1), 6);
  assert.equal(roundToLotAndMultiple(5.1, 5, 0), 6);
});

test("round2 arredonda para duas casas decimais", () => {
  assert.equal(round2(12.5055), 12.51);
  assert.equal(round2(0.1 + 0.2), 0.3);
});

test("round6 evita ruído de ponto flutuante em quantidades", () => {
  assert.equal(round6(0.1 + 0.2), 0.3);
});
