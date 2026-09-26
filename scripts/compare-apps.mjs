// Lists how this app's code differs from its sibling app (Campus Ready <-> Playbook), so an
// improvement made in one can be spotted and ported to the other. See docs/CROSS_APP_SYNC.md.
//
// Usage:  node scripts/compare-apps.mjs                 (finds the sibling folder itself)
//         node scripts/compare-apps.mjs --other ../playbook --ref main
//
// It compares TRACKED files only (never .env or node_modules) and ignores line-ending differences.
// Small diffs are usually branding ("Playbook admin" vs "Campus Ready admin"); read the larger ones.
// "only here" / "only there" files are usually product-specific (seed scripts, the parent status
// page) — but glance at them: a new shared component would show up there too.

import { execFileSync } from "node:child_process";
import path from "node:path";

const args = process.argv.slice(2);
const opt = (n) => (args.includes(n) ? args[args.indexOf(n) + 1] : undefined);
const here = path.resolve(".");
const isCampusReady = path.basename(here) === "campus-ready";
const other = path.resolve(opt("--other") ?? (isCampusReady ? "../playbook" : "../campus-ready"));
// Compare against the sibling's DEPLOY branch, not whatever it happens to have checked out.
const ref = opt("--ref") ?? (isCampusReady ? "main" : "master");

const git = (cwd, a) => execFileSync("git", a, { cwd, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
const normalise = (s) => s.replace(/\r\n/g, "\n");
const SCOPE = ["src", "public", "supabase", "scripts", "docs", ".github", "package.json", "next.config.ts"];
const BINARY = /\.(png|jpe?g|webp|ico|gif|pdf|woff2?)$/i;

const mine = git(here, ["ls-files", "--", ...SCOPE]).split("\n").filter((f) => f && !BINARY.test(f));
const theirs = git(other, ["ls-tree", "-r", "--name-only", ref, "--", ...SCOPE]).split("\n").filter((f) => f && !BINARY.test(f));
const theirSet = new Set(theirs);
const mineSet = new Set(mine);

const differ = [];
for (const f of mine.filter((f) => theirSet.has(f))) {
  let mineText, theirText;
  try {
    mineText = normalise(execFileSync("git", ["show", `:${f}`], { cwd: here, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }));
    theirText = normalise(git(other, ["show", `${ref}:${f}`]));
  } catch {
    continue;
  }
  if (mineText === theirText) continue;
  const a = mineText.split("\n");
  const b = theirText.split("\n");
  const bSet = new Set(b);
  const aSet = new Set(a);
  differ.push({ f, changed: a.filter((l) => !bSet.has(l)).length + b.filter((l) => !aSet.has(l)).length });
}
differ.sort((x, y) => x.changed - y.changed);

console.log(`Comparing this app (${path.basename(here)}, committed files) with ${path.basename(other)} @ ${ref}\n`);
console.log(`DIFFERENT (${differ.length}) — fewest changed lines first; tiny ones are usually branding:`);
for (const d of differ) console.log(`  ${String(d.changed).padStart(4)}  ${d.f}`);
console.log(`\nONLY HERE (${mine.filter((f) => !theirSet.has(f)).length}):`);
for (const f of mine.filter((f) => !theirSet.has(f))) console.log(`        ${f}`);
console.log(`\nONLY IN ${path.basename(other).toUpperCase()} (${theirs.filter((f) => !mineSet.has(f)).length}):`);
for (const f of theirs.filter((f) => !mineSet.has(f))) console.log(`        ${f}`);
