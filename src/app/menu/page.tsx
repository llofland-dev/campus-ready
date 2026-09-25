import Link from "next/link";
import { ChecklistIcon, ChevronRightIcon, ContactsIcon } from "@/components/icons";
import { BRAND } from "@/lib/palette";

export default function MenuPage() {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-black">
      <header className={`${BRAND.header} safe-top-5 px-4 py-5 text-white`}>
        <h1 className="mx-auto max-w-sm text-xl font-semibold">Campus Ready</h1>
      </header>

      <div className="mx-auto w-full max-w-sm flex-1 px-4 py-8">
        <div className="space-y-2">
          <Link
            href="/code"
            className="flex min-h-16 items-center justify-between gap-3 rounded-xl bg-white px-4 py-3 shadow-sm transition-colors hover:bg-black/[0.02] dark:bg-zinc-950 dark:hover:bg-white/[0.03]"
          >
            <span className="flex items-center gap-3">
              <ContactsIcon className="h-5 w-5 text-zinc-500" />
              <span>
                <span className="block font-medium text-black dark:text-zinc-50">View My Plan</span>
                <span className="block text-xs text-zinc-500">Enter your organization&apos;s plan code</span>
              </span>
            </span>
            <ChevronRightIcon className="h-5 w-5 shrink-0 text-zinc-400" />
          </Link>

          <Link
            href="/admin/login"
            className="flex min-h-16 items-center justify-between gap-3 rounded-xl bg-white px-4 py-3 shadow-sm transition-colors hover:bg-black/[0.02] dark:bg-zinc-950 dark:hover:bg-white/[0.03]"
          >
            <span className="flex items-center gap-3">
              <ChecklistIcon className="h-5 w-5 text-zinc-500" />
              <span>
                <span className="block font-medium text-black dark:text-zinc-50">Admin Sign In</span>
                <span className="block text-xs text-zinc-500">Manage your organization&apos;s plan content</span>
              </span>
            </span>
            <ChevronRightIcon className="h-5 w-5 shrink-0 text-zinc-400" />
          </Link>
        </div>
      </div>
    </div>
  );
}
