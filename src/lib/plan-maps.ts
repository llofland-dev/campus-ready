// Shared facts about map uploads, used by the admin uploader, the staff pages and the file route so
// they can never disagree about what a map may be.

export const MAP_BUCKET = "org-maps";

// 10 MB, matching the bucket's own limit (supabase/migrations/20261013090000_plan_maps.sql). The
// bucket enforces it for real; checking here too just gives the admin a clear message before upload.
export const MAX_MAP_BYTES = 10 * 1024 * 1024;

// Images and PDFs only. No SVG: an SVG file can carry script, and these files are shown inside the app.
export const MAP_TYPES: Record<string, { ext: string; label: string }> = {
  "image/png": { ext: "png", label: "Image" },
  "image/jpeg": { ext: "jpg", label: "Image" },
  "image/webp": { ext: "webp", label: "Image" },
  "application/pdf": { ext: "pdf", label: "PDF" },
};

export const MAP_ACCEPT = Object.keys(MAP_TYPES).join(",");

export function isPdf(contentType: string): boolean {
  return contentType === "application/pdf";
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
