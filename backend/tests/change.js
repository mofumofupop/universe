import axios from "axios";
import { beforeAll, describe, expect, it } from "vitest";

import { sha256 } from "hono/utils/crypto";

const BASE_URL =
  (typeof process.env.API_BASE_URL === "string" &&
    process.env.API_BASE_URL.trim()) ||
  "http://127.0.0.1:3000";
const ENDPOINT = "/api/change";

const client = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 10_000,
  validateStatus: () => true,
});

const postChange = async (payload) => {
  return client.post(ENDPOINT, payload);
};

describe.sequential("POST /api/change", () => {
  beforeAll(async () => {
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

  it("ユーザー情報を更新できる (200)", { timeout: 20_000 }, async () => {
    const username = `chg${Math.floor(Math.random() * 100000)}`;

    // register first
    const pass = await sha256("test");
    const reg = await client.post("/api/register", {
      username,
      password_hash: pass,
      social_links: ["https://example.com"],
    });
    expect(reg.status, JSON.stringify(reg.data)).toBe(200);

    const id = reg.data.id;

    const res = await postChange({ id, password_hash: pass, name: "新しい名前" });
    expect(res.status, JSON.stringify(res.data)).toBe(200);
    expect(res.data?.success).toBe(true);
  });

  it("認証失敗なら 401 を返す", { timeout: 20_000 }, async () => {
    const username = `auth${Math.floor(Math.random() * 100000)}`;
    const pass = await sha256("test");
    const reg = await client.post("/api/register", {
      username,
      password_hash: pass,
      social_links: ["https://example.com"],
    });
    expect(reg.status, JSON.stringify(reg.data)).toBe(200);

    const id = reg.data.id;

    const res = await postChange({ id, password_hash: "wronghash", name: "x" });
    expect(res.status, JSON.stringify(res.data)).toBe(401);
    expect(res.data?.success).toBe(false);
  });

  it("username を変更しようとすると 400 を返す", { timeout: 20_000 }, async () => {
    const u1 = `u1${Math.floor(Math.random() * 100000)}`;
    const pass = await sha256("test");

    const r1 = await client.post("/api/register", { username: u1, password_hash: pass, social_links: ["https://example.com"] });
    expect(r1.status, JSON.stringify(r1.data)).toBe(200);

    const res = await postChange({ id: r1.data.id, password_hash: pass, username: "newname" });
    expect(res.status, JSON.stringify(res.data)).toBe(400);
    expect(res.data?.success).toBe(false);
  });

  it("更新データが無いと 400 を返す", { timeout: 20_000 }, async () => {
    const username = `nodata${Math.floor(Math.random() * 100000)}`;
    const pass = await sha256("test");
    const reg = await client.post("/api/register", {
      username,
      password_hash: pass,
      social_links: ["https://example.com"],
    });
    expect(reg.status, JSON.stringify(reg.data)).toBe(200);

    const res = await postChange({ id: reg.data.id, password_hash: pass });
    expect(res.status, JSON.stringify(res.data)).toBe(400);
    expect(res.data?.success).toBe(false);
  });
});
