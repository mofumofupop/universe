// One-off upgrade of D1 rows still holding the pre-PBKDF2 password format (SHA-256 of the password).
//
// Usage (from backend/): node scripts/upgrade-password-hashes.mjs [--remote|--local] [--dry-run]
//
// Run right after deploying the Worker that expects the `v2$` format; until then those users cannot sign in.
// Each UPDATE matches the old value, so re-running is safe.

import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { STORED_PREFIX, upgradeLegacyStoredHash } from "./password.mjs";

const target = process.argv.includes("--remote") ? "--remote" : "--local";
const dryRun = process.argv.includes("--dry-run");
const OUT_DIR = join(".wrangler", "migration");

const wrangler = (args, capture = false) => {
  const res = spawnSync("pnpm", ["exec", "wrangler", ...args], {
    shell: true,
    encoding: "utf8",
    stdio: capture ? ["ignore", "pipe", "inherit"] : "inherit",
  });
  if (res.status !== 0) throw new Error(`wrangler ${args.join(" ")} failed`);
  return res.stdout;
};

const sql = (v) => `'${String(v).replaceAll("'", "''")}'`;

const out = wrangler(
  [
    "d1",
    "execute",
    "universe",
    target,
    "--json",
    "--command",
    `"SELECT id, username, password_hash FROM profiles WHERE password_hash NOT LIKE '${STORED_PREFIX}%'"`,
  ],
  true,
);
const rows = JSON.parse(out.slice(out.indexOf("[")))[0].results;
console.log(`legacy rows: ${rows.length}`);
if (rows.length === 0) process.exit(0);

const statements = [];
for (const r of rows) {
  const upgraded = await upgradeLegacyStoredHash(r.password_hash, r.username);
  statements.push(
    `UPDATE profiles SET password_hash = ${sql(upgraded)} WHERE id = ${sql(r.id)} AND password_hash = ${sql(r.password_hash)};`,
  );
}

mkdirSync(OUT_DIR, { recursive: true });
const file = join(OUT_DIR, "upgrade-passwords.sql");
writeFileSync(file, statements.join("\n") + "\n");
console.log(`wrote ${file}`);

if (!dryRun) wrangler(["d1", "execute", "universe", target, "--file", file, "--yes"]);
