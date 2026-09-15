"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Reached when a signed-in admin has no org yet — normally only a brief gap
// right after sign-up (see admin/signup/page.tsx: if email confirmation was
// pending, the org-creation RPC couldn't run yet since it requires an
// authenticated session). Same RPC, just triggered here instead, so there's
// always a way to finish setup after confirming.
export function CreateOrgForm({
  pendingName,
  pendingCode,
}: {
  pendingName?: string;
  pendingCode?: string;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [name, setName] = useState(pendingName ?? "");
  const [code, setCode] = useState(pendingCode ?? "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.rpc("eop_create_org_for_self", {
      p_name: name.trim(),
      p_org_code: code.trim().toUpperCase(),
    });

    setLoading(false);

    if (error) {
      setError(error.message.includes("duplicate") ? "That plan code is already taken — try another." : error.message);
      return;
    }

    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-sm space-y-4 rounded-lg border border-black/10 bg-white p-6 dark:border-white/10 dark:bg-zinc-950"
    >
      <div>
        <h2 className="text-base font-semibold text-black dark:text-zinc-50">
          Finish setting up your organization
        </h2>
        <p className="text-sm text-zinc-500">Your account is confirmed — just needs an org.</p>
      </div>

      <div className="space-y-1">
        <label htmlFor="create-org-name" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Organization name
        </label>
        <input
          id="create-org-name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-md border border-black/10 bg-transparent px-3 py-2 text-sm outline-none focus:border-black/30 dark:border-white/10 dark:focus:border-white/30"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="create-org-code" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Plan code
        </label>
        <input
          id="create-org-code"
          required
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="e.g. ACME2026"
          className="w-full rounded-md border border-black/10 bg-transparent px-3 py-2 text-sm uppercase outline-none focus:border-black/30 dark:border-white/10 dark:focus:border-white/30"
        />
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
      >
        {loading ? "Creating..." : "Create organization"}
      </button>
    </form>
  );
}
