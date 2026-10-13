import { notFound, redirect } from "next/navigation";
import { getVerifiedOrg } from "@/lib/eop-org";
import { createAdminClient } from "@/lib/supabase/admin";
import { isUuid } from "@/lib/api-utils";
import type { PlanMap } from "@/lib/supabase/types";
import { MAPS_COLOR } from "@/lib/palette";
import { formatBytes, isPdf } from "@/lib/plan-maps";
import { PlanHeader } from "../../plan-header";
import { MapViewer } from "./map-viewer";
import { PdfViewer } from "./pdf-viewer";

export default async function MapPage({ params }: { params: Promise<{ code: string; mapId: string }> }) {
  const { code, mapId } = await params;
  const org = await getVerifiedOrg(code);
  if (!org) redirect(`/plan/${code}`);
  if (!isUuid(mapId)) notFound();

  const admin = createAdminClient();
  const { data: map } = await admin
    .from("plan_maps")
    .select("id, org_id, title, description, category, file_path, content_type, file_size, sort_order, created_at")
    .eq("id", mapId)
    .eq("org_id", org.id)
    .maybeSingle<PlanMap>();
  if (!map) notFound();

  const fileHref = `/plan/${code}/maps/${map.id}/file`;

  return (
    <div>
      <PlanHeader title={map.title} backHref={`/plan/${code}/maps`} logoUrl={org.logoUrl} color={MAPS_COLOR.button} />

      <div className="mx-auto max-w-3xl space-y-4 p-4">
        {map.description && <p className="text-sm text-zinc-700 dark:text-zinc-300">{map.description}</p>}

        {isPdf(map.content_type) ? (
          <>
            {/* The PDF is drawn inside this page (so the header, back arrow and bottom bar stay) by PDF.js, which
                is two plain files in /public/pdfjs. Naming them here lets the browser fetch them ahead of time
                and lets the offline save find and store them (see public/sw.js). */}
            <link rel="modulepreload" href="/pdfjs/pdf.min.mjs" />
            <link rel="prefetch" href="/pdfjs/pdf.worker.min.mjs" />
            <PdfViewer src={fileHref} title={map.title} />
            <p className="text-xs text-zinc-500">PDF · {formatBytes(map.file_size)}</p>
          </>
        ) : (
          <MapViewer src={fileHref} alt={map.title} />
        )}
      </div>
    </div>
  );
}
