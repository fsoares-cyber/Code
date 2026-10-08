import assert from "node:assert/strict";
import { test } from "node:test";
import { formatDocument, isValidCNPJ, isValidCPF, isValidDocument, onlyDigits } from "./documentValidation";

test("onlyDigits remove tudo que não é número", () => {
  assert.equal(onlyDigits("111.444.777-35"), "11144477735");
});

test("isValidCPF: aceita CPF de teste conhecido, rejeita dígito verificador errado", () => {
  assert.equal(isValidCPF("111.444.777-35"), true);
  assert.equal(isValidCPF("111.444.777-36"), false);
});

test("isValidCPF: rejeita todos os dígitos iguais e tamanho errado", () => {
  assert.equal(isValidCPF("111.111.111-11"), false);
  assert.equal(isValidCPF("123456789"), false);
});

test("isValidCNPJ: aceita CNPJ de teste conhecido, rejeita dígito verificador errado", () => {
  assert.equal(isValidCNPJ("11.222.333/0001-81"), true);
  assert.equal(isValidCNPJ("11.222.333/0001-82"), false);
});

test("isValidCNPJ: rejeita todos os dígitos iguais e tamanho errado", () => {
  assert.equal(isValidCNPJ("11.111.111/1111-11"), false);
  assert.equal(isValidCNPJ("123456789"), false);
});

test("isValidDocument: escolhe o validador certo conforme o tipo de pessoa", () => {
  assert.equal(isValidDocument("111.444.777-35", "FISICA"), true);
  assert.equal(isValidDocument("111.444.777-35", "JURIDICA"), false);
  assert.equal(isValidDocument("11.222.333/0001-81", "JURIDICA"), true);
});

test("formatDocument: aplica a máscara certa conforme o tipo de pessoa", () => {
  assert.equal(formatDocument("11144477735", "FISICA"), "111.444.777-35");
  assert.equal(formatDocument("11222333000181", "JURIDICA"), "11.222.333/0001-81");
});
