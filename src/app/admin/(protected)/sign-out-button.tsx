"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleSignOut}
      className="rounded-md border border-black/10 px-3 py-1.5 text-sm text-zinc-700 transition-colors hover:bg-black/[.04] dark:border-white/10 dark:text-zinc-300 dark:hover:bg-white/[.06]"
    >
      Sign out
    </button>
  );
}
