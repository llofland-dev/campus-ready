import { createClient } from "@/lib/supabase/server";
import type { PlanMap, Profile } from "@/lib/supabase/types";
import { MAP_BUCKET, isPdf } from "@/lib/plan-maps";
import { MapsEditor } from "./maps-editor";

export default async function AdminMapsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, org_id, role, display_name, created_at")
    .eq("id", user.id)
    .maybeSingle<Profile>();
  if (!profile?.org_id) return null;

  const { data: maps, error } = await supabase
    .from("plan_maps")
    .select("id, org_id, title, description, category, file_path, content_type, file_size, sort_order, created_at")
    .eq("org_id", profile.org_id)
    .order("sort_order")
    .returns<PlanMap[]>();

  // Short-lived preview links for the image thumbnails. The bucket is private, so these are the only way
  // this page can show a picture; they expire on their own and are never given to staff.
  const imagePaths = (maps ?? []).filter((m) => !isPdf(m.content_type)).map((m) => m.file_path);
  const previews: Record<string, string> = {};
  if (imagePaths.length > 0) {
    const { data: signed } = await supabase.storage.from(MAP_BUCKET).createSignedUrls(imagePaths, 3600);
    for (const entry of signed ?? []) {
      if (entry.path && entry.signedUrl) previews[entry.path] = entry.signedUrl;
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-black dark:text-zinc-50">Maps</h2>
        <p className="text-sm text-zinc-500">
          Floor plans, campus maps and evacuation routes. Staff see them on the Maps tile once you add the first
          one. Only people who have entered your plan can open them.
        </p>
      </div>

      {error ? (
        <p className="rounded-lg border border-amber-400 bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          Maps isn&apos;t switched on for this account yet. Please contact support.
        </p>
      ) : (
        <MapsEditor orgId={profile.org_id} maps={maps ?? []} previews={previews} />
      )}
    </div>
  );
}
