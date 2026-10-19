// One-off migration of profiles, friendships and icons from Supabase to D1 + R2.
//
// Usage (from backend/):
//   node --env-file=.env.migrate scripts/migrate-from-supabase.mjs [--remote|--local] [--dry-run]
//
// .env.migrate must define SUPABASE_URL and SUPABASE_ANON_KEY (same values the Vercel backend used).
// The generated SQL wipes and refills D1, so it can be re-run for the final sync at cutover.
// QR codes are short-lived and are not migrated.

import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const target = process.argv.includes("--remote") ? "--remote" : "--local";
const dryRun = process.argv.includes("--dry-run");
const { SUPABASE_URL, SUPABASE_ANON_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("SUPABASE_URL and SUPABASE_ANON_KEY are required");
}

const OUT_DIR = join(".wrangler", "migration");
const ICON_BUCKET = "universe-icons";
const PAGE_SIZE = 1000;
const ICON_SIZE = 256;

const wrangler = (args) => {
  const res = spawnSync("pnpm", ["exec", "wrangler", ...args], { stdio: "inherit", shell: true });
  if (res.status !== 0) throw new Error(`wrangler ${args.join(" ")} failed`);
};

const fetchAllProfiles = async () => {
  const rows = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=*&order=id`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        range: `${from}-${from + PAGE_SIZE - 1}`,
      },
    });
    if (!res.ok) throw new Error(`profiles fetch failed: ${res.status} ${await res.text()}`);
    const page = await res.json();
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
};

const sql = (v) => (v === null || v === undefined ? "NULL" : `'${String(v).replaceAll("'", "''")}'`);
const toIso = (v) => (v ? new Date(v).toISOString() : new Date().toISOString());

const profiles = await fetchAllProfiles();
const ids = new Set(profiles.map((p) => p.id));
console.log(`profiles: ${profiles.length}`);

mkdirSync(join(OUT_DIR, "icons"), { recursive: true });
const iconVersion = Date.now();
const statements = ["DELETE FROM qrs;", "DELETE FROM friendships;", "DELETE FROM profiles;"];
const friendRows = [];
const skippedFriends = [];
const downloadedIconIds = [];

for (const p of profiles) {
  let iconUrl = null;
  if (p.icon_url) {
    const res = await fetch(p.icon_url);
    if (res.ok) {
      // Some early uploads are larger than the current 256px icon size
      const icon = await sharp(Buffer.from(await res.arrayBuffer()))
        .resize(ICON_SIZE, ICON_SIZE, { fit: "cover" })
        .png()
        .toBuffer();
      writeFileSync(join(OUT_DIR, "icons", `${p.id}.png`), icon);
      iconUrl = `/icons/${p.id}.png?v=${iconVersion}`;
      downloadedIconIds.push(p.id);
    } else {
      console.warn(`icon download failed for ${p.username}: ${res.status}`);
    }
  }

  const socialLinks = Array.isArray(p.social_links) ? p.social_links : [];
  statements.push(
    `INSERT INTO profiles (id, username, name, affiliation, icon_url, social_links, password_hash, created_at) VALUES (${[
      p.id,
      p.username,
      p.name,
      p.affiliation,
      iconUrl,
      JSON.stringify(socialLinks),
      p.password_hash,
      toIso(p.created_at),
    ]
      .map(sql)
      .join(", ")});`,
  );

  // Preserve the original array order through created_at
  const base = Date.parse(toIso(p.created_at));
  (Array.isArray(p.friends) ? p.friends : []).forEach((f, i) => {
    if (!f?.id || !ids.has(f.id) || f.id === p.id) {
      skippedFriends.push({ user: p.username, friend: f });
      return;
    }
    friendRows.push({ user_id: p.id, friend_id: f.id, created_at: new Date(base + i).toISOString() });
  });
}

// Profiles must exist before friendships reference them
for (const f of friendRows) {
  statements.push(
    `INSERT OR IGNORE INTO friendships (user_id, friend_id, created_at) VALUES (${sql(f.user_id)}, ${sql(f.friend_id)}, ${sql(f.created_at)});`,
  );
}

const seedPath = join(OUT_DIR, "seed.sql");
writeFileSync(seedPath, statements.join("\n") + "\n");
console.log(`friendships: ${friendRows.length}, skipped: ${skippedFriends.length}`);
if (skippedFriends.length) console.log(JSON.stringify(skippedFriends, null, 2));
console.log(`wrote ${seedPath}`);

if (dryRun) process.exit(0);

wrangler(["d1", "execute", "universe", target, "--file", seedPath, "--yes"]);
for (const id of downloadedIconIds) {
  const file = join(OUT_DIR, "icons", `${id}.png`);
  wrangler(["r2", "object", "put", `${ICON_BUCKET}/${id}.png`, "--file", file, "--content-type", "image/png", target]);
}
console.log("done");
