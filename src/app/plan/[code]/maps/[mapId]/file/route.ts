import { getVerifiedOrg } from "@/lib/eop-org";
import { createAdminClient } from "@/lib/supabase/admin";
import { clientKey, recordHit, tooManyRequests } from "@/lib/rate-limit";
import { isUuid } from "@/lib/api-utils";
import { MAP_BUCKET, MAP_TYPES } from "@/lib/plan-maps";

// The one way a map file leaves storage. The bucket is private, so this route is the gate: it only answers
// someone who has entered this plan (the same signed session as every plan page), and only for a map that
// belongs to that plan. It lives under /plan/ on purpose — that is what lets the offline service worker
// save the file with the rest of the plan.
export async function GET(request: Request, { params }: { params: Promise<{ code: string; mapId: string }> }) {
  const { code, mapId } = await params;

  const org = await getVerifiedOrg(code);
  if (!org) return new Response("Not authorized", { status: 403 });
  if (!isUuid(mapId)) return new Response("Not found", { status: 404 });

  // Abuse guard, not a normal-use limit.
  const limited = await recordHit("read:map", `${org.id}:${clientKey(request)}`, 600, 15 * 60);
  if (limited.blocked) return tooManyRequests(limited.retryAfterSeconds);

  const admin = createAdminClient();
  const { data: map } = await admin
    .from("plan_maps")
    .select("title, file_path, content_type")
    .eq("id", mapId)
    .eq("org_id", org.id)
    .maybeSingle<{ title: string; file_path: string; content_type: string }>();
  if (!map) return new Response("Not found", { status: 404 });

  // Defence in depth: whatever the table says, only ever serve the file types maps are allowed to be.
  const type = MAP_TYPES[map.content_type];
  if (!type) return new Response("Unsupported file type", { status: 415 });

  const { data: blob, error } = await admin.storage.from(MAP_BUCKET).download(map.file_path);
  if (error || !blob) return new Response("Not found", { status: 404 });

  const safeName = `${map.title.replace(/[^A-Za-z0-9._ -]+/g, "").trim().slice(0, 80) || "map"}.${type.ext}`;
  return new Response(blob.stream(), {
    headers: {
      "Content-Type": map.content_type,
      "Content-Length": String(blob.size),
      "Content-Disposition": `inline; filename="${safeName}"`,
      "X-Content-Type-Options": "nosniff",
      // Never shared between people or stored by a proxy; the browser (and the offline service worker)
      // keeps its own copy and re-checks on each visit.
      "Cache-Control": "private, no-cache",
    },
  });
}
