import assert from "node:assert/strict";
import { test } from "node:test";
import { hashPassword, signToken, verifyPassword, verifyToken } from "./auth";

test("hashPassword/verifyPassword: senha correta valida, senha errada não", async () => {
  const hash = await hashPassword("minha-senha-forte");
  assert.equal(await verifyPassword("minha-senha-forte", hash), true);
  assert.equal(await verifyPassword("senha-errada", hash), false);
});

test("signToken/verifyToken: round-trip preserva o payload", () => {
  const token = signToken({ sub: "user-1", email: "a@b.com", role: "ADMIN" });
  const payload = verifyToken(token);
  assert.equal(payload.sub, "user-1");
  assert.equal(payload.email, "a@b.com");
  assert.equal(payload.role, "ADMIN");
});

test("verifyToken: token adulterado é rejeitado", () => {
  const token = signToken({ sub: "user-1", email: "a@b.com", role: "USER" });
  const tampered = token.slice(0, -2) + "xx";
  assert.throws(() => verifyToken(tampered));
});
