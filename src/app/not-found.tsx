import Link from "next/link";
import { BRAND } from "@/lib/palette";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-6 text-center dark:bg-black">
      <h1 className="text-xl font-semibold text-[#00274c] dark:text-white">Page not found</h1>
      <p className="mt-2 max-w-xs text-sm text-zinc-500">
        That page doesn&apos;t exist or has been moved. If you followed a link from your organization,
        double-check it or ask them for the current one.
      </p>
      <Link
        href="/"
        className={`mt-6 rounded-full px-6 py-3 text-sm font-medium text-white transition-colors ${BRAND.button} ${BRAND.buttonHover}`}
      >
        Back to start
      </Link>
    </div>
  );
}
