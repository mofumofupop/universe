// Must stay in sync with backend/scripts/password.mjs, which upgrades stored hashes offline.
const PBKDF2_ITERATIONS = 600_000;
const SALT_PREFIX = "universe.mfmf.moe:";

const toHex = (buffer: ArrayBuffer) =>
  Array.from(new Uint8Array(buffer), (b) => b.toString(16).padStart(2, "0")).join("");

/** SHA-256 hex of the raw password: the credential format used before PBKDF2 was added. */
export async function legacyPasswordHash(password: string): Promise<string> {
  return toHex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(password)));
}

/**
 * Stretches a legacy hash with PBKDF2 salted by the immutable username.
 * The expensive work runs here because the Worker has a 10 ms CPU budget per request.
 */
export async function derivePasswordKey(legacyHash: string, username: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(legacyHash),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: new TextEncoder().encode(SALT_PREFIX + username),
      iterations: PBKDF2_ITERATIONS,
    },
    key,
    256,
  );
  return toHex(bits);
}

/** The `password_hash` value the API expects for a password typed by the user. */
export async function hashPassword(password: string, username: string): Promise<string> {
  return derivePasswordKey(await legacyPasswordHash(password), username);
}
