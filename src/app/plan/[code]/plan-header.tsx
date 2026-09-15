import Link from "next/link";
import { ChevronLeftIcon } from "@/components/icons";
import { BRAND } from "@/lib/palette";

export function PlanHeader({
  title,
  backHref,
  color = BRAND.header,
  logoUrl,
}: {
  title: string;
  backHref?: string;
  color?: string;
  logoUrl?: string | null;
}) {
  return (
    <header className={`${color} px-4 py-4 text-white shadow-sm`}>
      <div className="mx-auto flex max-w-lg items-center gap-2">
        {backHref && (
          <Link href={backHref} aria-label="Back" className="-ml-1 shrink-0 rounded-full p-1 hover:bg-white/10">
            <ChevronLeftIcon className="h-6 w-6" />
          </Link>
        )}
        {logoUrl && (
          // Org-uploaded logo: an arbitrary external URL only known at
          // runtime, so a plain <img> avoids needing next/image's
          // build-time remote-domain allowlist.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="" className="h-7 w-7 shrink-0 rounded bg-white object-contain p-0.5" />
        )}
        <h1 className="truncate text-lg font-semibold">{title}</h1>
      </div>
    </header>
  );
}
