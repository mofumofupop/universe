import axios from "axios";
import { beforeAll, describe, expect, it } from "vitest";

import { sha256 } from "hono/utils/crypto";

const BASE_URL =
  (typeof process.env.API_BASE_URL === "string" &&
    process.env.API_BASE_URL.trim()) ||
  "http://127.0.0.1:3000";
const ENDPOINT = "/api/register";

const client = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 10_000,
  // 400/409もレスポンスとして受け取る
  validateStatus: () => true,
});

const postRegister = async (payload) => {
  return client.post(ENDPOINT, payload);
};

describe.sequential("POST /api/register", () => {
  beforeAll(async () => {
    // BASE_URL が不正だと axios が "Invalid URL" を投げるので、先に分かりやすく落とす
    expect(
      () => new URL(BASE_URL),
      `BASE_URL が不正です: ${JSON.stringify(BASE_URL)}`,
    ).not.toThrow();

    const res = await client.get("/", {
      timeout: 5_000,
      validateStatus: () => true,
    });

    expect(
      res.status,
      "疎通確認に失敗しました。別ターミナルで `npm run dev` を起動し、API_BASE_URL が正しいか確認してください。",
    ).toBe(200);
  });

  it(
    "登録できる (200) & password_hash を返さない",
    { timeout: 20_000 },
    async () => {
      const username = `testuser${Math.floor(Math.random() * 1000)}`;

      const res = await postRegister({
        username,
        name: "テストユーザー",
        affiliation: "Local",
        social_links: ["https://example.com"],
        password_hash: await sha256("test"),
      });

      expect(res.status, JSON.stringify(res.data)).toBe(200);
      expect(res.data?.success).toBe(true);
      expect(typeof res.data?.id).toBe("string");
      expect(res.data?.id?.length).toBeGreaterThan(0);
      expect(res.data?.username).toBe(username);
      expect(res.data).not.toHaveProperty("password_hash");
    },
  );

  it("必須不足なら 400 を返す", { timeout: 20_000 }, async () => {
    const res = await postRegister({});

    expect(res.status, JSON.stringify(res.data)).toBe(400);
    expect(res.data?.success).toBe(false);
    expect(typeof res.data?.message).toBe("string");
  });

  it("username が 15文字を超えると 400 を返す", { timeout: 20_000 }, async () => {
    const res = await postRegister({
      username: "a".repeat(16),
      password_hash: await sha256("test"),
    });

    expect(res.status, JSON.stringify(res.data)).toBe(400);
    expect(res.data?.success).toBe(false);
    expect(typeof res.data?.message).toBe("string");
  });

  it("username が 15文字ちょうどなら登録できる (200)", { timeout: 20_000 }, async () => {
    // generate a 15-char username composed of allowed chars
    let username = "";
    while (username.length < 15) {
      username += Math.random().toString(36).slice(2);
    }
    username = username.slice(0, 15);

    const res = await postRegister({
      username,
      password_hash: await sha256("test"),
      social_links: ["https://example.com"],
    });

    expect(res.status, JSON.stringify(res.data)).toBe(200);
    expect(res.data?.success).toBe(true);
  });

  it("username が重複なら 409 を返す", { timeout: 20_000 }, async () => {
    const username = `dup${Math.floor(Math.random() * 100000)}`;

    const first = await postRegister({
      username,
      password_hash: await sha256("test"),
    });
    expect(first.status, JSON.stringify(first.data)).toBe(200);

    const second = await postRegister({
      username,
      password_hash: await sha256("test"),
    });
    expect(second.status, JSON.stringify(second.data)).toBe(409);
    expect(second.data?.success).toBe(false);
    expect(typeof second.data?.message).toBe("string");
  });
});
