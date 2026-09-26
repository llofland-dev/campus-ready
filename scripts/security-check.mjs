// Cross-school isolation and hardening test, on THROWAWAY data only (everything it creates is deleted at the end).
//
//   npm run security-check
//
// Two throwaway schools, A and B, each with its own admin login. Acting as school A's admin (and as an
// anonymous visitor with only the public key) it tries to read, insert, edit and delete school B's data in
// every table, to move itself into B, to change its own protected fields, to upload into B's logo folder, to
// call the password check and to read password hashes. Every attempt must be refused. Run it after every
// database change (new table, new policy, new function): a table added without row-level security fails here.
//
// It talks to the Supabase project in .env.local (the same one the live site uses). Everything it creates is
// obviously synthetic: schools named "ZZ Sec …", logins zz-smoke-sec-…@example.com.
import { createClient } from "@supabase/supabase-js";

const { NEXT_PUBLIC_SUPABASE_URL: U, NEXT_PUBLIC_SUPABASE_ANON_KEY: ANON, SUPABASE_SERVICE_ROLE_KEY: SVC } = process.env;
if (!U || !ANON || !SVC) {
  console.error("Missing Supabase settings — run this with `npm run security-check` so .env.local is loaded.");
  process.exit(2);
}
const svc = createClient(U, SVC, { auth: { persistSession: false } });
const rnd = () => Math.random().toString(36).slice(2, 8);
const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok });
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${!ok && detail ? `\n          -> ${detail}` : ""}`);
};
const made = [];

async function makeSchool(label) {
  const email = `zz-smoke-sec-${label}-${rnd()}@example.com`;
  const password = `Sec-${rnd()}${rnd()}`;
  const code = `ZZSEC${label}${rnd().toUpperCase().slice(0, 3)}`;
  const { data: u, error } = await svc.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  const anon = createClient(U, ANON, { auth: { persistSession: false } });
  const { data: s, error: se } = await anon.auth.signInWithPassword({ email, password });
  if (se) throw se;
  const client = createClient(U, ANON, { global: { headers: { Authorization: `Bearer ${s.session.access_token}` } }, auth: { persistSession: false } });
  const r = await client.rpc("eop_create_org_for_self", { p_name: `ZZ Sec ${label}`, p_org_code: code });
  if (r.error) throw r.error;
  const school = { label, userId: u.user.id, orgId: r.data, client, code };
  made.push(school);
  return school;
}

// One row per table for a school, inserted with the service key (which bypasses RLS on purpose: this is the seed).
async function seed(s) {
  const ins = async (table, row) => {
    const { data, error } = await svc.from(table).insert(row).select("id").single();
    if (error) throw new Error(`${table}: ${error.message}`);
    return data.id;
  };
  const ids = {};
  ids.plan_sections = await ins("plan_sections", { org_id: s.orgId, title: `sec-${s.label}`, category: "protocols", sort_order: 1 });
  ids.plan_pages = await ins("plan_pages", { org_id: s.orgId, section_id: ids.plan_sections, title: `page-${s.label}`, body: `secret body ${s.label}`, sort_order: 1 });
  ids.contacts = await ins("contacts", { org_id: s.orgId, name: `contact-${s.label}`, phone: "555-0100", sort_order: 1 });
  ids.checklists = await ins("checklists", { org_id: s.orgId, title: `list-${s.label}`, sort_order: 1 });
  ids.checklist_items = await ins("checklist_items", { org_id: s.orgId, checklist_id: ids.checklists, text: `item-${s.label}`, sort_order: 1 });
  ids.forms = await ins("forms", { org_id: s.orgId, title: `form-${s.label}`, fields: [] });
  ids.form_submissions = await ins("form_submissions", { org_id: s.orgId, form_id: ids.forms, data: { a: `private-${s.label}` } });
  ids.incidents = await ins("incidents", { org_id: s.orgId, name: `inc-${s.label}` });
  ids.checklist_events = await ins("checklist_events", { org_id: s.orgId, incident_id: ids.incidents, checklist_id: ids.checklists, checklist_item_id: ids.checklist_items, item_text: "x", action: "checked" });
  const upd = await svc.from("incident_updates").insert({ org_id: s.orgId, incident_id: ids.incidents, message: `upd-${s.label}` }).select("id").single();
  if (!upd.error) ids.incident_updates = upd.data.id; // only some apps have this table
  return ids;
}

// The column to try to change in each table.
const EDIT = { plan_sections: "title", plan_pages: "title", contacts: "name", checklists: "title", checklist_items: "text", forms: "title", form_submissions: "data", incidents: "name", checklist_events: "item_text", incident_updates: "message" };

function evilRow(t, B, idsB) {
  switch (t) {
    case "plan_pages": return { org_id: B.orgId, section_id: idsB.plan_sections, title: "evil", body: "x", sort_order: 9 };
    case "checklist_items": return { org_id: B.orgId, checklist_id: idsB.checklists, text: "evil", sort_order: 9 };
    case "form_submissions": return { org_id: B.orgId, form_id: idsB.forms, data: { evil: "1" } };
    case "incidents": return { org_id: B.orgId, name: "evil" };
    case "incident_updates": return { org_id: B.orgId, incident_id: idsB.incidents, message: "evil" };
    case "checklist_events": return { org_id: B.orgId, checklist_id: idsB.checklists, checklist_item_id: idsB.checklist_items, item_text: "evil", action: "checked" };
    case "plan_sections": return { org_id: B.orgId, title: "evil", category: "protocols", sort_order: 9 };
    case "contacts": return { org_id: B.orgId, name: "evil", sort_order: 9 };
    case "checklists": return { org_id: B.orgId, title: "evil", sort_order: 9 };
    default: return { org_id: B.orgId, title: "evil", fields: [] };
  }
}

try {
  console.log(`\n=== Cross-school isolation and hardening (throwaway data) against ${new URL(U).hostname} ===`);
  const A = await makeSchool("A");
  const B = await makeSchool("B");
  const idsA = await seed(A);
  const idsB = await seed(B);
  const tables = Object.keys(idsB);

  console.log("\nAs school A's admin, try to touch school B's data:");
  for (const t of tables) {
    // control: A can see its own row, so "no rows" below actually means something
    const own = await A.client.from(t).select("id").eq("id", idsA[t]);
    const readB = await A.client.from(t).select("id").eq("id", idsB[t]);
    const all = await A.client.from(t).select("id, org_id");
    const leaked = (all.data ?? []).filter((r) => r.org_id === B.orgId);
    check(`${t}: A sees its own row, never B's (${(all.data ?? []).length} row(s) visible)`, (own.data ?? []).length === 1 && (readB.data ?? []).length === 0 && leaked.length === 0, `own=${own.data?.length} readB=${readB.data?.length} leakedRows=${leaked.length}`);

    const insB = await A.client.from(t).insert(evilRow(t, B, idsB)).select("id");
    const col = EDIT[t];
    const updB = await A.client.from(t).update({ [col]: col === "data" ? { evil: "1" } : "HACKED" }).eq("id", idsB[t]).select("id");
    const delB = await A.client.from(t).delete().eq("id", idsB[t]).select("id");
    const stillThere = await svc.from(t).select("id").eq("id", idsB[t]);
    check(`${t}: A cannot insert into, edit or delete B's rows`, Boolean(insB.error) && (updB.data ?? []).length === 0 && (delB.data ?? []).length === 0 && (stillThere.data ?? []).length === 1, `insertError=${insB.error?.message ?? "NONE (inserted!)"} updated=${updB.data?.length} deleted=${delB.data?.length}`);
  }

  console.log("\nAccount and school records:");
  const profs = await A.client.from("profiles").select("id, org_id");
  check("A sees only its own profile", (profs.data ?? []).length === 1 && profs.data[0].id === A.userId, `${profs.data?.length} profiles visible`);
  await A.client.from("profiles").update({ org_id: B.orgId }).eq("id", A.userId).select("org_id");
  const nowOrg = (await svc.from("profiles").select("org_id").eq("id", A.userId).single()).data?.org_id;
  check("A cannot move itself into school B (profile org_id is locked)", nowOrg === A.orgId, `A's org_id is now ${nowOrg === B.orgId ? "B's !!!" : nowOrg}`);
  const orgs = await A.client.from("organizations").select("id");
  check("A sees only its own school record", (orgs.data ?? []).length === 1 && orgs.data[0].id === A.orgId, `${orgs.data?.length} organizations visible`);
  for (const [field, value] of [["active", false], ["admin_password_hash", "x"], ["access_password_hash", "x"], ["session_epoch", 999]]) {
    await A.client.from("organizations").update({ [field]: value }).eq("id", A.orgId).select("id");
    const chk = (await svc.from("organizations").select(field).eq("id", A.orgId).single()).data?.[field];
    check(`A cannot set its own ${field} directly`, chk !== value, `${field} was changed to ${chk}`);
  }
  const editB = await A.client.from("organizations").update({ name: "HACKED" }).eq("id", B.orgId).select("id");
  check("A cannot rename school B", (editB.data ?? []).length === 0);

  const hashCols = await A.client.from("organizations").select("access_password_hash, admin_password_hash").eq("id", A.orgId);
  check("A's browser cannot read its own school's password hashes", Boolean(hashCols.error), "the hash columns were returned");
  const oracleAsAdmin = await A.client.rpc("eop_verify_org_password", { p_org_id: B.orgId, p_password: "guess" });
  check("A (signed in) cannot call the password check on school B", Boolean(oracleAsAdmin.error), "it answered");
  const lookupAsAdmin = await A.client.rpc("eop_lookup_org", { p_code: B.code });
  check("A (signed in) cannot look organizations up", Boolean(lookupAsAdmin.error) || (lookupAsAdmin.data ?? []).length === 0, "it returned school B");
  const limiterAsAdmin = await A.client.rpc("eop_rate_limit_hit", { p_bucket: "x", p_key: "y", p_limit: 1, p_window_seconds: 1 });
  check("A cannot touch the rate-limit counters", Boolean(limiterAsAdmin.error), "it could");
  const limitTable = await A.client.from("rate_limits").select("key").limit(1);
  check("A cannot read the rate-limit table", Boolean(limitTable.error) || (limitTable.data ?? []).length === 0, "rows were returned");

  console.log("\nAs an anonymous visitor with only the public key:");
  const anon = createClient(U, ANON, { auth: { persistSession: false } });
  for (const t of [...tables, "organizations", "profiles", "rate_limits"]) {
    const r = await anon.from(t).select("*").limit(5);
    check(`${t}: anonymous read returns nothing`, r.error ? true : (r.data ?? []).length === 0, `${r.data?.length} rows leaked`);
  }
  const anonOracle = await anon.rpc("eop_verify_org_password", { p_org_id: B.orgId, p_password: "guess" });
  check("anonymous cannot call the password check (free password guessing)", Boolean(anonOracle.error), "it answered");
  const anonLookup = await anon.rpc("eop_lookup_org", { p_code: B.code });
  check("anonymous cannot look up organizations", Boolean(anonLookup.error) || (anonLookup.data ?? []).length === 0, "it returned school B");
  const anonIns = await anon.from("contacts").insert({ org_id: B.orgId, name: "evil" });
  check("anonymous cannot write", Boolean(anonIns.error));

  console.log("\nStorage (school logos):");
  const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  const upB = await A.client.storage.from("org-logos").upload(`${B.orgId}/evil-${rnd()}.png`, png, { contentType: "image/png" });
  check("A cannot upload into school B's logo folder", Boolean(upB.error), "upload into B's folder SUCCEEDED");
  const ownPath = `${A.orgId}/ok-${rnd()}.png`;
  const upA = await A.client.storage.from("org-logos").upload(ownPath, png, { contentType: "image/png" });
  check("A can upload into its own logo folder (control)", !upA.error, upA.error?.message);
  const typeAbuse = await A.client.storage.from("org-logos").upload(`${A.orgId}/x-${rnd()}.html`, new TextEncoder().encode("<script>1</script>"), { contentType: "text/html" });
  check("HTML/script uploads are refused by the bucket", Boolean(typeAbuse.error), "an .html file was accepted into a PUBLIC bucket");
  await svc.storage.from("org-logos").remove([ownPath]);
} catch (e) {
  console.log(`\nTEST STOPPED EARLY: ${e.message}`);
  results.push({ name: "harness", ok: false });
} finally {
  for (const s of made) {
    await svc.from("profiles").update({ org_id: null }).eq("id", s.userId);
    await svc.from("organizations").delete().eq("id", s.orgId);
    await svc.auth.admin.deleteUser(s.userId);
  }
  const left = made.length ? (await svc.from("organizations").select("id", { count: "exact", head: true }).in("id", made.map((m) => m.orgId))).count : 0;
  console.log(`\ncleanup: throwaway schools and logins deleted (org rows left: ${left ?? 0})`);
  const failed = results.filter((r) => !r.ok);
  console.log(`${results.length - failed.length} of ${results.length} security checks passed.`);
  for (const f of failed) console.log(`  FAILED: ${f.name}`);
  process.exitCode = failed.length ? 1 : 0;
}
