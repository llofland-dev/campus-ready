// Read-only demo-readiness check for a plan (default BRIDGEWAY). Run it before every demo:
//
//   npm run demo-check                       (BRIDGEWAY on the live site)
//   npm run demo-check -- MAPLERIDGE
//   npm run demo-check -- BRIDGEWAY --url https://campus-ready.vercel.app
//
// 1. Audits the plan's content in the database: no ACTIVE incident (a red banner would show on every
//    staff phone), placeholders, other organizations' names, real-looking phone numbers or email
//    addresses, empty pages, missing logo / Facility Admin passphrase.
// 2. Signs in as an ordinary staff user (the plan must have no staff password) and opens every screen
//    a staff member can reach on the deployed site, flagging errors.
//
// It never changes anything: only GET requests, plus the staff sign-in that just sets a cookie.
// Needs .env.local (loaded by `npm run demo-check`). Prints no secrets.

import { createClient } from "@supabase/supabase-js";

const args = process.argv.slice(2);
const positional = args.filter((a, i) => !a.startsWith("--") && !(i > 0 && args[i - 1] === "--url"));
const CODE = (positional[0] ?? "BRIDGEWAY").toUpperCase();
const urlIdx = args.indexOf("--url");
const BASE = (urlIdx >= 0 ? args[urlIdx + 1] : "https://campusready.emergencyprepsolutions.org").replace(/\/$/, "");
const { NEXT_PUBLIC_SUPABASE_URL: DB_URL, SUPABASE_SERVICE_ROLE_KEY: SERVICE } = process.env;
if (!DB_URL || !SERVICE) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY — run this with `npm run demo-check` so .env.local is loaded.");
  process.exit(2);
}
const db = createClient(DB_URL, SERVICE);
const rows = async (q) => {
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data ?? [];
};

// ---------------------------------------------------------------- 1. content audit
const [org] = await rows(db.from("organizations").select("id,name,org_code,active,logo_path,access_password_hash,admin_password_hash").eq("org_code", CODE));
if (!org) {
  console.error(`No organization with plan code ${CODE}.`);
  process.exit(2);
}
const id = org.id;
const [sections, pages, contacts, checklists, items, forms, incidents] = await Promise.all([
  rows(db.from("plan_sections").select("id,title,category").eq("org_id", id)),
  rows(db.from("plan_pages").select("id,section_id,title,body").eq("org_id", id)),
  rows(db.from("contacts").select("name,role_title,phone,email").eq("org_id", id)),
  rows(db.from("checklists").select("id,title,description").eq("org_id", id)),
  rows(db.from("checklist_items").select("checklist_id,text").eq("org_id", id)),
  rows(db.from("forms").select("title,recipient_email,fields").eq("org_id", id)),
  rows(db.from("incidents").select("name,status,started_at").eq("org_id", id).order("started_at", { ascending: false })),
]);

console.log(`${org.org_code} "${org.name}" — ${sections.length} sections, ${pages.length} pages, ${contacts.length} contacts, ${checklists.length} checklists (${items.length} items), ${forms.length} form(s), ${incidents.length} past/present incident(s)`);

const problems = [];
const warn = (m) => problems.push(m);
if (!org.active) warn("the organization is suspended (active = false): staff would be refused");
if (org.access_password_hash) warn("a staff password is set — the crawl below cannot sign in without it (and demo attendees would need it)");
if (!org.admin_password_hash) warn("no Facility Admin passphrase is set — the admin part of the demo cannot be shown");
if (!org.logo_path) warn("no logo");
for (const i of incidents.filter((i) => i.status === "active")) warn(`incident "${i.name}" is ACTIVE — a red banner shows on every staff phone; close it first`);

const otherNames = /maple\s*ridge|MAPLERIDGE/i;
const draftMarkers = /lorem ipsum|\bTODO\b|\bTBD\b|FIXME|\[\s*insert/i;
const studentNames = /student name|full name of student/i;
const texts = [
  ...pages.map((p) => [`page "${p.title}"`, `${p.title}\n${p.body}`]),
  ...contacts.map((c) => [`contact "${c.name}"`, [c.name, c.role_title, c.email].join(" ")]),
  ...checklists.map((c) => [`checklist "${c.title}"`, `${c.title} ${c.description ?? ""}`]),
  ...items.map((i) => ["a checklist item", i.text]),
  ...forms.map((f) => [`form "${f.title}"`, JSON.stringify(f)]),
];
for (const [where, t] of texts) {
  if (otherNames.test(t) && CODE !== "MAPLERIDGE") warn(`${where} mentions Maple Ridge (the other demo school)`);
  if (draftMarkers.test(t)) warn(`${where} contains a draft marker ("${t.match(draftMarkers)[0]}")`);
  if (studentNames.test(t)) warn(`${where} asks for student names (contradicts the Privacy Policy)`);
}
const emergencyNumbers = /^\D*(911|1[-\s.]?800[-\s.]?222[-\s.]?1222|988)\D*$/; // real, correct, and should be there
for (const c of contacts) {
  if (!c.phone && !c.email) warn(`contact "${c.name}" has no phone and no email`);
  if (c.phone && !emergencyNumbers.test(c.phone) && !/555[-\s.]?01\d\d|555[-\s.]?02\d\d/.test(c.phone)) warn(`contact "${c.name}": ${c.phone} does not look fictional (555-01xx/02xx) — a demo tap could ring a real person`);
  if (c.email && !/example\.|\.example|\.test$/i.test(c.email)) warn(`contact "${c.name}": ${c.email} is not an example.* address — "Mail to" could reach a real inbox`);
}
for (const f of forms) if (f.recipient_email && !/example/i.test(f.recipient_email)) warn(`form "${f.title}" sends to ${f.recipient_email}, not an example.* address`);
for (const p of pages) if (p.body.trim().length < 40) warn(`page "${p.title}" is nearly empty`);
const fillIn = /\bFill in\b[^\n|]*|(?:^|[\n|] ?)Enter (?:the|your) [^\n|]*/; // case-sensitive: not "re-enter the building"
for (const p of pages) if (fillIn.test(p.body)) warn(`page "${p.title}" has a fill-in-the-blank line ("${p.body.match(fillIn)[0].trim()}")`);
for (const s of sections) if (!pages.some((p) => p.section_id === s.id)) warn(`section "${s.title}" has no pages`);
for (const c of checklists) if (!items.some((i) => i.checklist_id === c.id)) warn(`checklist "${c.title}" has no items`);

console.log(`\nCONTENT: ${problems.length ? `${problems.length} thing(s) to look at` : "nothing to flag"}`);
for (const p of problems) console.log(`  ! ${p}`);

// ---------------------------------------------------------------- 2. live walk-through
console.log(`\nWALK-THROUGH on ${BASE} as an ordinary staff user`);
const jar = new Map();
const store = (res) => {
  for (const line of res.headers.getSetCookie?.() ?? []) {
    const [pair, ...attrs] = line.split(";");
    const i = pair.indexOf("=");
    const name = pair.slice(0, i).trim(), value = pair.slice(i + 1).trim();
    if (!value || attrs.some((a) => /max-age=0/i.test(a))) jar.delete(name);
    else jar.set(name, value);
  }
};
const req = async (path, init = {}) => {
  const h = new Headers(init.headers);
  if (jar.size) h.set("Cookie", [...jar].map(([k, v]) => `${k}=${v}`).join("; "));
  const res = await fetch(BASE + path, { ...init, headers: h, redirect: "manual" });
  store(res);
  return res;
};
const login = await req("/api/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: CODE, password: "" }) });
let bad = 0;
if (login.status !== 200) {
  console.log(`  staff sign-in refused (HTTP ${login.status}) — is a staff password set? Skipping the walk-through.`);
  bad++;
} else {
  const seen = new Set();
  const queue = [`/plan/${CODE}`];
  let ok = 0, phones = 0;
  const failing = [];
  const errorPage = /Application error|This page couldn.t load|Internal Server Error|Unhandled Runtime Error|a server-side exception has occurred/i;
  while (queue.length && seen.size < 150) {
    const path = queue.shift();
    if (seen.has(path)) continue;
    seen.add(path);
    const res = await req(path);
    const loc = res.headers.get("location");
    const html = res.status === 200 ? (await res.text()).replace(/<script[\s\S]*?<\/script>/g, "") : "";
    if (res.status >= 400 || errorPage.test(html)) failing.push(`${path} → HTTP ${res.status}`);
    else ok++;
    phones += (html.match(/href="tel:/g) ?? []).length;
    if (loc && loc.startsWith(`/plan/${CODE}`)) queue.push(loc);
    for (const m of html.matchAll(new RegExp(`href="(/plan/${CODE}[^"#?]*)"`, "g"))) queue.push(m[1]);
  }
  console.log(`  ${ok} screens opened fine, ${failing.length} failed, ${phones} tap-to-dial phone links seen`);
  for (const f of failing) console.log(`  ! ${f}`);
  bad += failing.length;
}
console.log("\nPublic pages:");
for (const p of [`/status/${CODE}`, `/status/${CODE}/glossary`, "/support", "/privacy", "/terms", "/admin/login"]) {
  const res = await fetch(BASE + p, { redirect: "manual" });
  console.log(`  ${res.status < 400 ? "ok " : "BAD"} ${res.status} ${p}`);
  if (res.status >= 400) bad++;
}
console.log(`\n${problems.length || bad ? "Look at the items marked ! above before the demo." : "Ready to demo."}`);
process.exit(bad ? 1 : 0);
