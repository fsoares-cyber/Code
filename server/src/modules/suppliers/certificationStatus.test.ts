import assert from "node:assert/strict";
import { test } from "node:test";
import { certificationStatus, isSupplierRegular } from "./certificationStatus";

const now = new Date("2026-01-01T00:00:00Z");

function daysFromNow(days: number): Date {
  const d = new Date(now);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

test("certificationStatus: mais de 90 dias para vencer é válido", () => {
  assert.equal(certificationStatus(daysFromNow(120), now), "VALIDO");
});

test("certificationStatus: 90 dias ou menos para vencer é 'vence em breve'", () => {
  assert.equal(certificationStatus(daysFromNow(90), now), "VENCE_EM_BREVE");
  assert.equal(certificationStatus(daysFromNow(30), now), "VENCE_EM_BREVE");
  assert.equal(certificationStatus(daysFromNow(1), now), "VENCE_EM_BREVE");
});

test("certificationStatus: data no passado é vencido", () => {
  assert.equal(certificationStatus(daysFromNow(-1), now), "VENCIDO");
  assert.equal(certificationStatus(daysFromNow(-90), now), "VENCIDO");
});

test("isSupplierRegular: qualificado com certificados válidos é regular", () => {
  const regular = isSupplierRegular(
    [{ expiryDate: daysFromNow(120), isCurrent: true }],
    "QUALIFICADO",
    now,
  );
  assert.equal(regular, true);
});

test("isSupplierRegular: não qualificado é irregular mesmo com certificados válidos", () => {
  const regular = isSupplierRegular(
    [{ expiryDate: daysFromNow(120), isCurrent: true }],
    "EM_QUALIFICACAO",
    now,
  );
  assert.equal(regular, false);
});

test("isSupplierRegular: qualificado mas com certificado vencido é irregular", () => {
  const regular = isSupplierRegular(
    [{ expiryDate: daysFromNow(-1), isCurrent: true }],
    "QUALIFICADO",
    now,
  );
  assert.equal(regular, false);
});

test("isSupplierRegular: certificado vencido mas não-atual (substituído) não bloqueia", () => {
  const regular = isSupplierRegular(
    [
      { expiryDate: daysFromNow(-1), isCurrent: false },
      { expiryDate: daysFromNow(120), isCurrent: true },
    ],
    "QUALIFICADO",
    now,
  );
  assert.equal(regular, true);
});
