// Adds three fictional sample maps to a demo school: a campus map, a floor plan and a PDF evacuation and
// reunification plan, drawn by scripts/demo-maps/make_demo_maps.py. They are invented ("Sample School") and
// carry a © notice in the picture itself.
// Needs the maps migration (supabase/migrations/20261013090000_plan_maps.sql) to have been run first.
// Safe to re-run: maps that already exist (by title) are skipped.
//
// The school code is REQUIRED on purpose: the demo schools hold real prospect data, so nothing should ever be
// written to one by accident. Only run this against a school Larry has confirmed.
//
// Usage: node --env-file=.env.local scripts/seed-demo-maps.mjs <SCHOOL_CODE>
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const here = path.dirname(fileURLToPath(import.meta.url));

const MAPS = [
  {
    title: "Campus Map",
    category: "Whole campus",
    description: "Buildings, entrances, bus loop and assembly points",
    file: "campus-map.png",
    type: "image/png",
  },
  {
    title: "Main Building Floor Plan",
    category: "Main Building",
    description: "Exits, offices and AED locations",
    file: "main-building-floor-plan.png",
    type: "image/png",
  },
  {
    title: "Evacuation and Reunification",
    category: "Main Building",
    description: "Which way out, where to gather, and where families check in",
    file: "evacuation-and-reunification.pdf",
    type: "application/pdf",
  },
];

const EXT = { "image/png": "png", "application/pdf": "pdf" };

const orgCode = (process.argv[2] ?? "").toUpperCase();
if (!orgCode) {
  console.error("Give the school code to load the sample maps into, e.g.  node --env-file=.env.local scripts/seed-demo-maps.mjs MAPLERIDGE");
  process.exit(1);
}
const { data: org, error: orgError } = await supabase
  .from("organizations")
  .select("id, name, org_code")
  .eq("org_code", orgCode)
  .single();
if (orgError) throw orgError;
console.log(`Target: ${org.name} (${org.org_code}) ${org.id}`);

const { data: existing, error: existingError } = await supabase
  .from("plan_maps")
  .select("title, sort_order")
  .eq("org_id", org.id);
if (existingError) throw new Error(`${existingError.message} — has the maps migration been run?`);
const have = new Set(existing.map((m) => m.title));
let sort = Math.max(0, ...existing.map((m) => m.sort_order ?? 0)) + 1;

const created = [];
for (const map of MAPS) {
  if (have.has(map.title)) {
    console.log(`skip (already there): ${map.title}`);
    continue;
  }
  const bytes = await readFile(path.join(here, "demo-maps", map.file));
  const objectPath = `${org.id}/${randomUUID()}.${EXT[map.type]}`;
  const { error: uploadError } = await supabase.storage.from("org-maps").upload(objectPath, bytes, { contentType: map.type });
  if (uploadError) throw uploadError;
  const { data: row, error } = await supabase
    .from("plan_maps")
    .insert({
      org_id: org.id,
      title: map.title,
      description: map.description,
      category: map.category,
      file_path: objectPath,
      content_type: map.type,
      file_size: bytes.length,
      sort_order: sort++,
    })
    .select("id")
    .single();
  if (error) {
    await supabase.storage.from("org-maps").remove([objectPath]);
    throw error;
  }
  created.push(row.id);
  console.log(`added: ${map.title} (${Math.round(bytes.length / 1024)} KB) ${row.id}`);
}
console.log(`\nCreated ${created.length} map(s).`);
if (created.length) console.log("Map ids (to undo, delete these from plan_maps and their files from the org-maps bucket):\n" + created.join("\n"));
