import axios from "axios";
import { beforeAll, describe, expect, it } from "vitest";
import { sha256 } from "hono/utils/crypto";

const BASE_URL =
  (typeof process.env.API_BASE_URL === "string" &&
    process.env.API_BASE_URL.trim()) ||
  "http://127.0.0.1:3000";

const client = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 10000,
  validateStatus: () => true,
});

const post = (endpoint, payload) => client.post(endpoint, payload);
const get = (endpoint, opts) => client.get(endpoint, opts);

describe.sequential("POST /api/exchange", () => {
  beforeAll(async () => {
    expect(() => new URL(BASE_URL)).not.toThrow();
    const res = await get("/");
    expect(res.status).toBe(200);
  });

  it("名刺交換ができる（QR有効）", { timeout: 30000 }, async () => {
    const passA = await sha256("passA");
    const passB = await sha256("passB");

    const usernameA = `ex_a_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const usernameB = `ex_b_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    const r1 = await post("/api/register", {
      username: usernameA,
      password_hash: passA,
    });
    expect(r1.status).toBe(200);
    expect(r1.data?.id).toBeTruthy();
    const idA = r1.data.id;

    const r2 = await post("/api/register", {
      username: usernameB,
      password_hash: passB,
    });
    expect(r2.status).toBe(200);
    expect(r2.data?.id).toBeTruthy();
    const idB = r2.data.id;

    // user A の QR を生成
    const qrRes = await post("/api/qr", { id: idA, password_hash: passA });
    expect(qrRes.status).toBe(200);
    expect(qrRes.data?.qr).toBeTruthy();
    const qr = qrRes.data.qr;

    // user B が QR を使って交換
    const exRes = await post("/api/exchange", {
      id: idB,
      password_hash: passB,
      qr,
    });
    expect(exRes.status).toBe(200);
    expect(exRes.data?.success).toBe(true);

    // 両者の friends にお互いがいること
    const accA = await get(
      `/api/account?id=${encodeURIComponent(idA)}&password_hash=${encodeURIComponent(passA)}`,
    );
    expect(accA.status).toBe(200);
    expect(Array.isArray(accA.data?.friends)).toBe(true);
    expect(accA.data.friends.some((f) => f.id === idB)).toBe(true);

    const accB = await get(
      `/api/account?id=${encodeURIComponent(idB)}&password_hash=${encodeURIComponent(passB)}`,
    );
    expect(accB.status).toBe(200);
    expect(Array.isArray(accB.data?.friends)).toBe(true);
    expect(accB.data.friends.some((f) => f.id === idA)).toBe(true);
  });
});
