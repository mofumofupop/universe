// Clients send a PBKDF2-stretched key (see frontend/src/lib/password.ts). Storing only its
// SHA-256 means a leaked row cannot be replayed as a credential, while each check stays
// far below the 10 ms CPU limit.
const STORED_PREFIX = "v2$";

const sha256Hex = async (value: string) => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
};

export const toStoredHash = async (clientKey: string) => {
  return STORED_PREFIX + (await sha256Hex(clientKey));
};

export const verifyPassword = async (clientKey: string, stored: string) => {
  const expected = new TextEncoder().encode(stored);
  const actual = new TextEncoder().encode(await toStoredHash(clientKey));
  return (
    expected.byteLength === actual.byteLength &&
    crypto.subtle.timingSafeEqual(expected, actual)
  );
};
