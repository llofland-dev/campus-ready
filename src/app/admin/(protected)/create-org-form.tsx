"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ORG_CODE_HINT, ORG_CODE_HTML_PATTERN, validateOrgCode, validateOrgName } from "@/lib/org-code";

// Reached when a signed-in admin has no org yet — the first sign-in of an
// account the developer created for a new customer (self-service sign-up is
// closed; see docs/CUSTOMER_ONBOARDING.md). The org-creation RPC requires an
// authenticated session, so it runs here, after that first sign-in.
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

    const problem = validateOrgName(name) ?? validateOrgCode(code);
    if (problem) {
      setError(problem);
      return;
    }

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
          pattern={ORG_CODE_HTML_PATTERN}
          title={ORG_CODE_HINT}
          maxLength={24}
          placeholder="e.g. ACME2026"
          className="w-full rounded-md border border-black/10 bg-transparent px-3 py-2 text-sm uppercase outline-none focus:border-black/30 dark:border-white/10 dark:focus:border-white/30"
        />
        <p className="text-xs text-zinc-500">{ORG_CODE_HINT}</p>
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
