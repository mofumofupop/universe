import axios from 'axios';
import { test, expect } from 'vitest';

const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000';
const ID = 'e327de37-1fb2-4954-a2c5-0d3be6cbba70';
const PASSWORD_HASH = '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08';

test('POST /api/qr returns qr string', { timeout: 20000 }, async () => {
  const res = await axios.post(`${API_BASE}/api/qr`, {
    id: ID,
    password_hash: PASSWORD_HASH,
  }, { timeout: 10000 });

  expect(res.status).toBe(200);
  expect(res.data).toBeTypeOf('object');
  expect(res.data.success).toBe(true);
  expect(typeof res.data.qr).toBe('string');
  expect(res.data.qr.length).toBeGreaterThan(0);
});
