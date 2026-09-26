// Post-deploy smoke test for the live Campus Ready site.
//
// Creates a throwaway organization and admin login, exercises the features
// that have broken (or nearly broken) before, reads Vercel's error log, and
// ALWAYS deletes everything it created. Uses only synthetic data — never
// touches a real organization.
//
// Usage:   npm run smoke
//          npm run smoke -- --url https://some-preview.vercel.app --no-logs
// Needs:   .env.local with NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
//          SUPABASE_SERVICE_ROLE_KEY (the service-role key creates and deletes the
//          throwaway data). See docs/SMOKE_TEST.md.

import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { execSync } from "node:child_process";
import { makeDocx, makeXlsx, makeTextPdf, makeNoTextPdf, XLSX_ROWS } from "./fixtures.mjs";

const args = process.argv.slice(2);
const opt = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
const BASE = (opt("--url") ?? process.env.SMOKE_BASE_URL ?? "https://campus-ready.vercel.app").replace(/\/$/, "");
const IS_PRODUCTION_HOST = /(campus-ready.vercel.app|emergencyprepsolutions.org)$/.test(new URL(BASE).hostname);
const CHECK_LOGS = !args.includes("--no-logs") && IS_PRODUCTION_HOST;
// Every address real people reach the app on. Supabase must allow password-reset links to
// return to each of them. Keep the old vercel.app address here even after it starts
// redirecting to the custom domain, so links from older emails still work.
const PRODUCTION_ORIGINS = [...new Set([BASE, "https://campus-ready.vercel.app", "https://campusready.emergencyprepsolutions.org"])].filter((o) => IS_PRODUCTION_HOST && new URL(o).protocol === "https:");

const { NEXT_PUBLIC_SUPABASE_URL: DB_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY: ANON, SUPABASE_SERVICE_ROLE_KEY: SERVICE } = process.env;

// Check the three settings BEFORE using them, and name the one that is wrong.
// A malformed URL secret once got past a plain "is it empty?" guard and failed
// much later with "Invalid supabaseUrl", without saying which setting or why.
// These values are secrets: this reports what is wrong, never the value.
const jwtRole = (v) => {
  try {
    return JSON.parse(Buffer.from(v.split(".")[1], "base64url").toString()).role;
  } catch {
    return null;
  }
};
const SETTINGS = [
  { env: "NEXT_PUBLIC_SUPABASE_URL", secret: "SMOKE_SUPABASE_URL", value: DB_URL, kind: "url" },
  { env: "NEXT_PUBLIC_SUPABASE_ANON_KEY", secret: "SMOKE_SUPABASE_ANON_KEY", value: ANON, kind: "anon" },
  { env: "SUPABASE_SERVICE_ROLE_KEY", secret: "SMOKE_SUPABASE_SERVICE_ROLE_KEY", value: SERVICE, kind: "service" },
];
function whatIsWrong({ value, kind }) {
  if (!value) return "is missing or empty";
  if (value !== value.trim()) return "has a space or line break at the start or end";
  if (/^["']|["']$/.test(value)) return "is wrapped in quote marks — paste only the value, without quotes";
  if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(value)) return "starts with NAME= — paste only what comes AFTER the = sign";
  if (/\s/.test(value)) return "contains a space or line break in the middle";
  if (kind === "url") {
    try {
      return new URL(value).protocol === "https:" ? null : "must start with https://";
    } catch {
      return "is not a web address (expected https://<project>.supabase.co)";
    }
  }
  if (value.length < 20) return "is too short to be a key";
  if (kind === "anon" && (/^sb_secret_/.test(value) || jwtRole(value) === "service_role")) return "holds the SECRET (service-role) key — the anon/publishable key belongs here";
  if (kind === "service" && (/^sb_publishable_/.test(value) || jwtRole(value) === "anon")) return "holds the publishable (anon) key — the secret/service-role key belongs here";
  return null;
}
const badSettings = SETTINGS.map((s) => [s, whatIsWrong(s)]).filter(([, why]) => why);
if (badSettings.length) {
  console.error("The smoke test cannot start — fix these Supabase settings (values are not shown because they are secrets):");
  for (const [s, why] of badSettings) console.error(`  - ${s.env} (GitHub repository secret ${s.secret}) ${why}`);
  console.error("Locally, run `npm run smoke` so .env.local is loaded; in GitHub Actions, the SMOKE_* repository secrets are used (see .github/workflows/smoke.yml).");
  process.exit(2);
}

// ---------------------------------------------------------------------------
// tiny test harness
// ---------------------------------------------------------------------------
const results = [];
let section = "";
const group = (name) => {
  section = name;
  console.log(`\n${name}`);
};
function check(name, ok, detail = "") {
  results.push({ section, name, ok });
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${!ok && detail ? `\n          -> ${detail}` : ""}`);
  return ok;
}
const note = (text) => console.log(`  note  ${text}`);

const rnd = () => Math.random().toString(36).slice(2, 10);
const strip = (html) => html.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<style[\s\S]*?<\/style>/g, "");
const has = (text, needle) => (needle instanceof RegExp ? needle.test(text) : text.includes(needle));
const count = (text, re) => (text.match(re) || []).length;

// A browser-like cookie jar: keeps what the site sets, drops what it clears.
class Session {
  constructor() {
    this.cookies = new Map();
  }
  header() {
    return [...this.cookies].map(([k, v]) => `${k}=${v}`).join("; ");
  }
  store(res) {
    for (const line of res.headers.getSetCookie?.() ?? []) {
      const [pair, ...attrs] = line.split(";");
      const i = pair.indexOf("=");
      const name = pair.slice(0, i).trim();
      const value = pair.slice(i + 1).trim();
      if (value === "" || attrs.some((a) => /max-age=0/i.test(a))) this.cookies.delete(name);
      else this.cookies.set(name, value);
    }
  }
  async req(path, init = {}) {
    const headers = new Headers(init.headers);
    if (this.cookies.size) headers.set("Cookie", this.header());
    const res = await fetch(BASE + path, { ...init, headers, redirect: "manual" });
    this.store(res);
    return res;
  }
  post(path, body) {
    return this.req(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  }
  async page(path) {
    const res = await this.req(path);
    return { status: res.status, location: res.headers.get("location") ?? "", html: strip(await res.text()) };
  }
  async upload(path, fileName, buffer, targetType) {
    const form = new FormData();
    form.append("file", new File([buffer], fileName));
    form.append("targetType", targetType);
    const res = await this.req(path, { method: "POST", body: form });
    const text = await res.text();
    let json = {};
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text.slice(0, 120) };
    }
    return { status: res.status, ...json };
  }
}

const svc = createClient(DB_URL, SERVICE);
const startedAt = Date.now();
const fx = { code: `ZZSMOKE${rnd().toUpperCase().slice(0, 4)}`, email: `zz-smoke-${rnd()}@example.com`, password: `Sm-${rnd()}${rnd()}`, staffPw: `staff-${rnd()}`, adminPw: `admin-${rnd()}` };

// ---------------------------------------------------------------------------
// housekeeping: leftovers from an earlier run that crashed hard
// ---------------------------------------------------------------------------
async function removeStaleLeftovers() {
  const cutoff = Date.now() - 60 * 60 * 1000;
  const { data: users } = await svc.auth.admin.listUsers({ perPage: 200 });
  for (const u of users?.users ?? []) {
    if (!/^zz-smoke-/.test(u.email ?? "") || new Date(u.created_at).getTime() > cutoff) continue;
    await svc.from("profiles").update({ org_id: null }).eq("id", u.id);
    await svc.auth.admin.deleteUser(u.id);
    note(`removed leftover test login ${u.email}`);
  }
  const { data: orgs } = await svc.from("organizations").select("id,org_code,created_at").like("org_code", "ZZSMOKE%");
  for (const o of orgs ?? []) {
    if (new Date(o.created_at).getTime() > cutoff) continue;
    await svc.from("profiles").update({ org_id: null }).eq("org_id", o.id);
    await svc.from("organizations").delete().eq("id", o.id);
    note(`removed leftover test organization ${o.org_code}`);
  }
}

async function teardown() {
  if (fx.userId) await svc.from("profiles").update({ org_id: null }).eq("id", fx.userId);
  if (fx.orgId) await svc.from("organizations").delete().eq("id", fx.orgId);
  if (fx.userId) await svc.auth.admin.deleteUser(fx.userId);
  const { count: left } = await svc.from("organizations").select("id", { count: "exact", head: true }).like("org_code", "ZZSMOKE%").eq("id", fx.orgId ?? "00000000-0000-0000-0000-000000000000");
  console.log(`\nCleanup: throwaway organization and login deleted (rows left: ${left ?? 0}).`);
}

// ---------------------------------------------------------------------------
// the checks
// ---------------------------------------------------------------------------
async function run() {
  console.log(`Smoke test against ${BASE}`);
  console.log(`Throwaway data goes to Supabase project ${new URL(DB_URL).hostname} and is deleted at the end.`);
  await removeStaleLeftovers();

  const visitor = new Session();

  group("1. Site basics");
  for (const path of ["/menu", "/code", "/offline.html", "/manifest.webmanifest", "/privacy", "/terms"]) {
    const r = await visitor.page(path);
    check(`${path} loads`, r.status === 200, `HTTP ${r.status}`);
  }
  const sw = await visitor.page("/sw.js");
  check("service worker file is served with the offline-plan sync", sw.status === 200 && sw.html.includes("sync-plan"));

  group("2. Self-service sign-up is closed");
  const signup = await visitor.page("/admin/signup");
  check("/admin/signup redirects to sign-in", signup.status === 307 && signup.location.endsWith("/admin/login"), `HTTP ${signup.status} -> ${signup.location}`);
  const login = await visitor.page("/admin/login");
  check("sign-in page has no 'Set up your plan' link", !login.html.includes("Set up your plan"));
  check("sign-in page still offers 'Forgot password?'", login.html.includes("Forgot password"));

  group("3. Create the throwaway organization");
  const { data: created, error: userErr } = await svc.auth.admin.createUser({ email: fx.email, password: fx.password, email_confirm: true });
  if (userErr) throw new Error(`could not create test login: ${userErr.message}`);
  fx.userId = created.user.id;
  let captured = [];
  const ssr = createServerClient(DB_URL, ANON, { cookies: { getAll: () => [], setAll: (list) => (captured = list) } });
  const { data: signedIn, error: signErr } = await ssr.auth.signInWithPassword({ email: fx.email, password: fx.password });
  if (signErr) throw new Error(`test login could not sign in: ${signErr.message}`);
  const authed = createClient(DB_URL, ANON, { global: { headers: { Authorization: `Bearer ${signedIn.session.access_token}` } } });
  let r = await authed.rpc("eop_create_org_for_self", { p_name: "ZZ Smoke Test School", p_org_code: fx.code });
  if (r.error) throw new Error(`create org: ${r.error.message}`);
  fx.orgId = r.data;
  for (const [fn, pw] of [["eop_set_org_password", fx.staffPw], ["eop_set_org_admin_password", fx.adminPw]]) {
    r = await authed.rpc(fn, { p_password: pw });
    if (r.error) throw new Error(`${fn}: ${r.error.message}`);
  }
  for (const [key, home] of [["normal", null], ["ics", "ics"]]) {
    const c = await svc.from("checklists").insert({ org_id: fx.orgId, title: `ZZ ${key} checklist`, home_category: home, sort_order: 0 }).select("id").single();
    const it = await svc.from("checklist_items").insert({ org_id: fx.orgId, checklist_id: c.data.id, text: `ZZ ${key} item`, sort_order: 0 }).select("id").single();
    fx[`${key}Checklist`] = c.data.id;
    fx[`${key}Item`] = it.data.id;
  }
  const contact = await svc.from("contacts").insert({ org_id: fx.orgId, name: "ZZ Smoke Contact", phone: "555-010-0000", sort_order: 0 }).select("id").single();
  fx.contactId = contact.data.id;
  check("throwaway organization, passwords, checklists and contact created", Boolean(fx.orgId && fx.normalChecklist && fx.icsChecklist && fx.contactId));

  const admin = new Session();
  for (const c of captured) admin.cookies.set(c.name, c.value);
  const staff = new Session();

  group("4. Staff sign-in and the User / Admin split");
  check("plan gate asks a fresh visitor for the password", (await visitor.page(`/plan/${fx.code}`)).html.includes("Enter the plan password"));
  check("blank password refused", (await visitor.post("/api/verify", { code: fx.code, password: "" })).status === 401);
  check("wrong password refused", (await visitor.post("/api/verify", { code: fx.code, password: "wrong-password" })).status === 401);
  check("staff password accepted", (await staff.post("/api/verify", { code: fx.code, password: fx.staffPw })).status === 200);
  let home = await staff.page(`/plan/${fx.code}`);
  check("home shows 'Access level' and the unlock link at User level", home.html.includes("Access level") && home.html.includes("Unlock admin access"));
  check("Incident Management tile hidden from User level", !home.html.includes("Incident Management"));
  const eventBody = (checklistId, itemId) => ({ checklistId, itemId, action: "checked" });
  check("User can tick a normal checklist item", (await staff.post("/api/checklist-event", eventBody(fx.normalChecklist, fx.normalItem))).status === 200);
  check("User is refused on an admin-only checklist item", (await staff.post("/api/checklist-event", eventBody(fx.icsChecklist, fx.icsItem))).status === 403);
  const userCat = await staff.req(`/plan/${fx.code}/categories/ics`);
  check("User is redirected away from the admin-only category", userCat.status === 307 && (userCat.headers.get("location") ?? "").endsWith(`/plan/${fx.code}`));
  const userIm = await staff.req(`/plan/${fx.code}/incident-management`);
  check("User cannot open the Incident Management screen", userIm.status === 307 && (userIm.headers.get("location") ?? "").endsWith(`/plan/${fx.code}`));
  check("User cannot post incident actions (server-side)", (await staff.post("/api/incident-action", { action: "start", name: "ZZ smoke" })).status === 403);
  check("User cannot edit contacts (server-side)", (await staff.post("/api/staff-update-contact", { contactId: fx.contactId, phone: "1" })).status === 403);
  const before = staff.header();
  check("wrong admin passphrase refused", (await staff.post("/api/verify", { code: fx.code, password: "nope-nope", requireAdmin: true })).status === 401);
  check("staff password refused as admin passphrase", (await staff.post("/api/verify", { code: fx.code, password: fx.staffPw, requireAdmin: true })).status === 401);
  check("failed unlocks leave the session untouched", staff.header() === before);
  check("correct admin passphrase unlocks", (await staff.post("/api/verify", { code: fx.code, password: fx.adminPw, requireAdmin: true })).status === 200);
  home = await staff.page(`/plan/${fx.code}`);
  check("home now shows Facility admin and the Incident Management tile", home.html.includes("Facility admin") && home.html.includes("Incident Management"));
  const adminCat = await staff.req(`/plan/${fx.code}/categories/ics`);
  check("Admin is sent from the admin-only category to Incident Management", adminCat.status === 307 && (adminCat.headers.get("location") ?? "").endsWith("/incident-management"), `HTTP ${adminCat.status} -> ${adminCat.headers.get("location")}`);
  check("Admin can open the Incident Management screen", (await staff.req(`/plan/${fx.code}/incident-management`)).status === 200);
  check("Admin can tick an admin-only item", (await staff.post("/api/checklist-event", eventBody(fx.icsChecklist, fx.icsItem))).status === 200);
  check("Admin can edit contacts", (await staff.post("/api/staff-update-contact", { contactId: fx.contactId, phone: "555-010-0001" })).status === 200);
  check("sign-out endpoint works", (await staff.post("/api/signout", {})).status === 200);
  check("after sign-out the password gate is back", (await staff.page(`/plan/${fx.code}`)).html.includes("Enter the plan password"));
  const direct = new Session();
  check("admin passphrase alone works at the gate", (await direct.post("/api/verify", { code: fx.code, password: fx.adminPw })).status === 200);

  group("5. Document import (Word, Excel, PDF) on the live site");
  const IMPORT = "/api/admin/import-document";
  const docx = await makeDocx();
  const xlsx = await makeXlsx();
  const pdf = makeTextPdf();
  check("import refuses a visitor who isn't logged in", (await visitor.upload(IMPORT, "x.docx", docx, "section")).status === 403);

  const dSec = await admin.upload(IMPORT, "guide.docx", docx, "section");
  check("Word: imports as a section", dSec.status === 200, dSec.error ?? `HTTP ${dSec.status}`);
  const dPages = dSec.draft?.pages ?? [];
  check("Word: text before the first heading kept, headings split pages", JSON.stringify(dPages.map((p) => p.title)) === JSON.stringify(["Overview", "Scope", "Details", "Contacts"]), dPages.map((p) => p.title).join(", "));
  check("Word: picture dropped with a note (no base64 bloat)", (dSec.draft?.notes ?? []).some((n) => /picture/.test(n)) && !JSON.stringify(dSec.draft ?? {}).includes("data:image"));
  check("Word: table converted", dPages.some((p) => p.body.includes("| Department | Number |")));
  const dChk = await admin.upload(IMPORT, "guide.docx", docx, "checklist");
  check("Word: imports as a checklist", dChk.status === 200 && (dChk.draft?.items?.length ?? 0) >= 2, dChk.error ?? "");

  const xSec = await admin.upload(IMPORT, "contacts.xlsx", xlsx, "section");
  check("Excel: imports as a section", xSec.status === 200, xSec.error ?? `HTTP ${xSec.status}`);
  const xPages = xSec.draft?.pages ?? [];
  const wantParts = Math.ceil(XLSX_ROWS / 40);
  check(`Excel: ${XLSX_ROWS} rows split into ${wantParts} pages`, xPages.length === wantParts && /part 1 of/.test(xPages[0]?.title ?? ""), xPages.map((p) => p.title).join(", "));
  check("Excel: merged banner appears once, then a real header row", count(xPages[0]?.body ?? "", /SMOKE TEST BANNER/g) === 1 && (xPages[0]?.body ?? "").includes("| Department | Phone | Coverage | Updated |"));
  check("Excel: number formats kept (phone, percent, date)", /\(301\) 555-0101/.test(xPages[0]?.body ?? "") && /\b1%/.test(xPages[0]?.body ?? "") && /\d{1,2}\/\d{1,2}\/2026/.test(xPages[0]?.body ?? ""));
  check("Excel: hidden sheet not imported", !JSON.stringify(xSec.draft ?? {}).includes("HIDDEN-SHEET-MARKER"));
  check("Excel: admin told the sheet was split", (xSec.draft?.notes ?? []).some((n) => /split/.test(n)));
  const xChk = await admin.upload(IMPORT, "contacts.xlsx", xlsx, "checklist");
  check("Excel: imports as a checklist with every data row", xChk.status === 200 && (xChk.draft?.items?.length ?? 0) >= XLSX_ROWS && !JSON.stringify(xChk.draft ?? {}).includes("HIDDEN-SHEET-MARKER"), xChk.error ?? "");

  const pSec = await admin.upload(IMPORT, "policy.pdf", pdf, "section");
  check("PDF: imports as a section (the path that crashed production)", pSec.status === 200, pSec.error ?? `HTTP ${pSec.status}`);
  const pBody = pSec.draft?.pages?.map((p) => p.body).join("\n") ?? "";
  check("PDF: headings, list and joined paragraph rebuilt", /^#{1,3} Smoke Test Policy/m.test(pBody) && /^#{2,3} Purpose/m.test(pBody) && pBody.includes("- Notify the Administrator on Call") && pBody.includes("live site. It wraps onto a second line"), pBody.slice(0, 200));
  check("PDF: admin warned that layout was reconstructed", (pSec.draft?.notes ?? []).some((n) => /rebuilt/.test(n)));
  const pChk = await admin.upload(IMPORT, "policy.pdf", pdf, "checklist");
  check("PDF: imports as a checklist", pChk.status === 200 && (pChk.draft?.items ?? []).some((i) => i.includes("Notify the Administrator on Call")), pChk.error ?? "");
  const noText = await admin.upload(IMPORT, "scan.pdf", makeNoTextPdf(), "section");
  check("PDF with no text is refused with a clear message", noText.status === 422 && /no selectable text/.test(noText.error ?? ""), `${noText.status} ${noText.error}`);
  check("oversized file refused with a clear message", (await admin.upload(IMPORT, "big.docx", Buffer.alloc(Math.floor(4.6 * 1024 * 1024), 1), "section")).status === 413);
  const badType = await admin.upload(IMPORT, "notes.txt", Buffer.from("hello"), "section");
  check("unsupported file type refused clearly", badType.status === 400 && /docx, \.xlsx, and \.pdf/.test(badType.error ?? ""), `${badType.status} ${badType.error}`);

  group("6. Imported content renders for staff");
  const viewer = new Session();
  await viewer.post("/api/verify", { code: fx.code, password: fx.staffPw });
  let order = 10;
  async function publish(draft) {
    const sec = await svc.from("plan_sections").insert({ org_id: fx.orgId, title: draft.title, category: "protocols", sort_order: order++ }).select("id").single();
    const pages = await svc
      .from("plan_pages")
      .insert(draft.pages.map((p, i) => ({ org_id: fx.orgId, section_id: sec.data.id, title: p.title, body: p.body, sort_order: i + 1 })))
      .select("id,title,body,sort_order")
      .order("sort_order");
    return { sectionId: sec.data.id, pages: pages.data ?? [] };
  }
  const shown = async (pub, index) => viewer.page(`/plan/${fx.code}/sections/${pub.sectionId}/pages/${pub.pages[index].id}`);

  if (dSec.draft) {
    const pub = await publish(dSec.draft);
    check("Word section lists in the app", (await viewer.page(`/plan/${fx.code}/sections/${pub.sectionId}`)).status === 200);
    const details = await shown(pub, 2);
    check("Word: table shows as a table", details.status === 200 && has(details.html, "<table"));
    check("Word: both phone numbers are tap-to-dial", has(details.html, 'href="tel:3015550142"') && has(details.html, 'href="tel:2405550188"'));
    check("Word: link kept", has(details.html, 'href="https://example.com"'));
  }
  if (xSec.draft) {
    const pub = await publish(xSec.draft);
    const first = await shown(pub, 0);
    check("Excel: first page renders as a table with its part title", first.status === 200 && has(first.html, "<table") && has(first.html, "part 1 of"));
    check("Excel: last page renders", (await shown(pub, pub.pages.length - 1)).status === 200);
  }
  if (pSec.draft) {
    const pub = await publish(pSec.draft);
    const page = await shown(pub, 0);
    check("PDF: headings and list render", page.status === 200 && has(page.html, /<h[2-5]/) && has(page.html, "<li"));
    check("PDF: phone number is tap-to-dial", has(page.html, 'href="tel:3015550142"'));
  }
  if (dChk.draft) {
    const c = await svc.from("checklists").insert({ org_id: fx.orgId, title: dChk.draft.title, sort_order: 90 }).select("id").single();
    await svc.from("checklist_items").insert(dChk.draft.items.map((text, i) => ({ org_id: fx.orgId, checklist_id: c.data.id, text, sort_order: i + 1 })));
    const cp = await viewer.page(`/plan/${fx.code}/checklists/${c.data.id}`);
    check("imported checklist opens with every item as a checkbox", cp.status === 200 && count(cp.html, /type="checkbox"/g) >= dChk.draft.items.length, `${count(cp.html, /type="checkbox"/g)} boxes`);
  }

  // Password reset depends on settings that live in the Supabase dashboard, not in this code, so a
  // wrong value there breaks it silently: reset emails once sent people to http://localhost:3000
  // because the Site URL was never changed and no production address was on the allow-list. This
  // group asks Supabase (no email is sent) and follows a reset token end to end.
  group("7. Password reset and Supabase redirect settings");
  const resetPage = await visitor.page("/admin/reset-password?token_hash=smoke&type=recovery");
  check("reset-password page loads for a token link", resetPage.status === 200 && resetPage.html.includes("Set a new password"), `HTTP ${resetPage.status}`);
  check("forgot-password page loads", (await visitor.page("/admin/forgot-password")).status === 200);

  const redirectOf = async (redirectTo) => {
    const { data, error } = await svc.auth.admin.generateLink({ type: "recovery", email: fx.email, options: { redirectTo } });
    if (error) return { error: error.message };
    return { redirect: new URL(data.properties.action_link).searchParams.get("redirect_to"), token: data.properties.hashed_token };
  };
  if (PRODUCTION_ORIGINS.length) {
    for (const origin of PRODUCTION_ORIGINS) {
      const want = `${origin}/admin/reset-password`;
      const got = await redirectOf(want);
      check(`Supabase allows reset links back to ${origin}`, got.redirect === want, got.error ?? `Supabase sent ${got.redirect ?? "nothing"} instead — add ${origin}/** under Authentication -> URL Configuration -> Redirect URLs`);
    }
    // A made-up address must be REFUSED; otherwise the checks above prove nothing (an "allow
    // everything" setting would pass them). When refused, Supabase falls back to its Site URL.
    const fake = await redirectOf("https://not-allowed.example.invalid/admin/reset-password");
    check("Supabase refuses a made-up reset address (so the allow-list is real)", Boolean(fake.redirect) && !fake.redirect.includes("not-allowed.example.invalid"), fake.error ?? `it allowed ${fake.redirect}`);
    let siteOrigin = "";
    try {
      siteOrigin = new URL(fake.redirect).origin;
    } catch {}
    check("Supabase Site URL is a production https address, not localhost", PRODUCTION_ORIGINS.includes(siteOrigin), `Site URL is ${siteOrigin || "unreadable"} — set it under Authentication -> URL Configuration (the reset email template builds its link from it)`);
  } else {
    note("redirect-allow-list checks skipped: they only apply to a production address");
  }

  // One reset token, followed the way the page follows it: redeem it once, set a password, sign in.
  const fresh = await redirectOf(`${PRODUCTION_ORIGINS[0] ?? BASE}/admin/reset-password`);
  const solo = () => createClient(DB_URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
  const redeemer = solo();
  const redeemed = fresh.token ? await redeemer.auth.verifyOtp({ token_hash: fresh.token, type: "recovery" }) : { error: { message: fresh.error } };
  check("a reset token can be redeemed", !redeemed.error && Boolean(redeemed.data?.session), redeemed.error?.message ?? "");
  const newPassword = `Sm-${rnd()}${rnd()}`;
  const changed = await redeemer.auth.updateUser({ password: newPassword });
  check("the new password can be set with it", !changed.error, changed.error?.message ?? "");
  const again = fresh.token ? await solo().auth.verifyOtp({ token_hash: fresh.token, type: "recovery" }) : { error: null };
  check("the same reset token is refused the second time", Boolean(again.error), "a used reset link still worked");
  const signedInAgain = await solo().auth.signInWithPassword({ email: fx.email, password: newPassword });
  check("the login signs in with the new password", !signedInAgain.error, signedInAgain.error?.message ?? "");

  if (CHECK_LOGS) {
    group("8. Vercel server log");
    const minutes = Math.ceil((Date.now() - startedAt) / 60000) + 1;
    try {
      const out = execSync(`npx --yes vercel@59.14.0 logs --status-code 500 --since ${minutes}m -n 20`, { encoding: "utf8", timeout: 120000, stdio: ["ignore", "pipe", "pipe"] });
      const errors = out.split("\n").filter((l) => /^\d\d:\d\d:\d\d/.test(l));
      check(`no server errors (HTTP 500) in the last ${minutes} minute(s)`, errors.length === 0, errors.slice(0, 2).join(" | "));
    } catch (e) {
      note(`Vercel log check skipped (${String(e.message).split("\n")[0]}) — is the Vercel CLI signed in on this machine?`);
    }
  }
}

let crashed = false;
try {
  await run();
} catch (e) {
  crashed = true;
  console.error(`\nSMOKE TEST STOPPED EARLY: ${e.message}`);
} finally {
  try {
    await teardown();
  } catch (e) {
    console.error(`\nCLEANUP FAILED — remove ZZSMOKE data by hand: ${e.message}`);
    crashed = true;
  }
}

const failed = results.filter((x) => !x.ok);
console.log(`\n${results.length - failed.length} of ${results.length} checks passed.`);
if (failed.length) {
  console.log("Failed:");
  for (const f of failed) console.log(`  - [${f.section}] ${f.name}`);
}
process.exit(failed.length || crashed ? 1 : 0);
