// Mirrors frontend/src/lib/password.ts and backend/src/lib/password.ts for offline migrations.
import { webcrypto as crypto } from "node:crypto";

const PBKDF2_ITERATIONS = 600_000;
const SALT_PREFIX = "universe.mfmf.moe:";
export const STORED_PREFIX = "v2$";

const toHex = (buffer) => Buffer.from(buffer).toString("hex");

export const derivePasswordKey = async (legacyHash, username) => {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(legacyHash), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: new TextEncoder().encode(SALT_PREFIX + username), iterations: PBKDF2_ITERATIONS },
    key,
    256,
  );
  return toHex(bits);
};

export const toStoredHash = async (clientKey) => {
  return STORED_PREFIX + toHex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(clientKey)));
};

/** Converts a pre-PBKDF2 stored value (SHA-256 of the password) into the current stored format. */
export const upgradeLegacyStoredHash = async (legacyHash, username) => {
  return toStoredHash(await derivePasswordKey(legacyHash, username));
};
