import axios from "axios";
import FormData from "form-data";
import fs from "fs";
import path from "path";
import { beforeAll, describe, expect, it } from "vitest";
import { sha256 } from "hono/utils/crypto";

const BASE_URL = process.env.API_BASE_URL?.trim() || "http://127.0.0.1:3000";
const client = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  validateStatus: () => true,
});

describe("POST /api/icon", () => {
  beforeAll(() => {
    expect(() => new URL(BASE_URL)).not.toThrow();
  });

  it(
    "uploads icon via multipart and returns icon_url",
    { timeout: 20000 },
    async () => {
      const passwordHash = await sha256("iconPass");
      const username = `icon_user_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

      const reg = await client.post("/api/register", {
        username,
        password_hash: passwordHash,
      });
      expect(reg.status).toBe(200);
      const id = reg.data?.id;
      expect(typeof id).toBe("string");

      // prefer test image files under tests/img/
      const imgDir = path.join(process.cwd(), "tests", "img");
      const pngPath = path.join(imgDir, "icon.png");
      const jpgPath = path.join(imgDir, "icon.jpg");
      let filePath;
      if (fs.existsSync(pngPath)) filePath = pngPath;
      else if (fs.existsSync(jpgPath)) filePath = jpgPath;
      else
        throw new Error(
          "No test image found at tests/img/icon.png or tests/img/icon.jpg",
        );

      const buffer = fs.readFileSync(filePath);
      const form = new FormData();
      form.append("id", id);
      form.append("password_hash", passwordHash);
      const ext = path.extname(filePath).toLowerCase();
      const contentType =
        ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : "image/png";
      form.append("icon", buffer, {
        filename: path.basename(filePath),
        contentType,
      });

      const headers = form.getHeaders();
      const res = await client.post("/api/icon", form, {
        headers,
        maxBodyLength: Infinity,
      });

      if (res.status !== 200) {
        // helpful debug output when CI or local server returns error
        // eslint-disable-next-line no-console
        console.error("POST /api/icon failed", {
          status: res.status,
          data: res.data,
        });
      }

      expect(res.status).toBe(200);
      expect(res.data?.success).toBe(true);
      expect(typeof res.data?.icon_url).toBe("string");

      const acc = await client.get(
        `/api/account?id=${encodeURIComponent(id)}&password_hash=${encodeURIComponent(passwordHash)}`,
      );
      expect(acc.status).toBe(200);
      expect(typeof acc.data?.icon_url).toBe("string");

      // upload another icon (simulate update) — should succeed and still provide icon_url
      const buffer2 = buffer; // reuse same buffer if only one test image available
      const form2 = new FormData();
      form2.append("id", id);
      form2.append("password_hash", passwordHash);
      form2.append("icon", buffer2, {
        filename: `icon2${path.extname(filePath)}`,
        contentType,
      });

      const res2 = await client.post("/api/icon", form2, {
        headers: form2.getHeaders(),
        maxBodyLength: Infinity,
      });

      expect(res2.status).toBe(200);
      expect(res2.data?.success).toBe(true);
      expect(typeof res2.data?.icon_url).toBe("string");

      // verify account endpoint still returns an icon_url
      const acc2 = await client.get(
        `/api/account?id=${encodeURIComponent(id)}&password_hash=${encodeURIComponent(passwordHash)}`,
      );
      expect(acc2.status).toBe(200);
      expect(typeof acc2.data?.icon_url).toBe("string");
    },
  );
});
