import axios from "axios";
import { test, expect } from "vitest";
import { sha256 } from "hono/utils/crypto";

const API_BASE = process.env.API_BASE_URL || "http://localhost:3000";

test("POST /api/qr returns qr string", { timeout: 20000 }, async () => {
  // 1) 仮アカウントを作成
  const passwordPlain = "test";
  const password_hash = await sha256(passwordPlain);
  const username = `test_user_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

  const regRes = await axios.post(
    `${API_BASE}/api/register`,
    { username, password_hash },
    { timeout: 10000, validateStatus: () => true },
  );

  expect(regRes.status, JSON.stringify(regRes.data)).toBe(200);
  expect(regRes.data?.success).toBe(true);
  const id = regRes.data?.id;
  expect(typeof id).toBe("string");

  // 2) 取得した id で QR を要求
  const res = await axios.post(
    `${API_BASE}/api/qr`,
    {
      id,
      password_hash,
    },
    { timeout: 10000, validateStatus: () => true },
  );

  expect(res.status, JSON.stringify(res.data)).toBe(200);
  expect(res.data).toBeTypeOf("object");
  expect(res.data.success).toBe(true);
  expect(typeof res.data.qr).toBe("string");
  expect(res.data.qr.length).toBeGreaterThan(0);
});
