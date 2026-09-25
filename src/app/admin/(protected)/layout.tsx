import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import type { Organization, Profile } from "@/lib/supabase/types";
import { AdminNav } from "./admin-nav";
import { SignOutButton } from "./sign-out-button";
import { CreateOrgForm } from "./create-org-form";
import { DeleteAccountPanel } from "./delete-account-panel";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
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

  const org = profile?.org_id
    ? (
        await supabase
          .from("organizations")
          .select("id, name, org_code, logo_path, active, created_at")
          .eq("id", profile.org_id)
          .maybeSingle<Organization>()
      ).data
    : null;

  const orgLogoUrl = org?.logo_path
    ? supabase.storage.from("org-logos").getPublicUrl(org.logo_path).data.publicUrl
    : null;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <header className="safe-top-4 flex items-center justify-between border-b border-black/10 px-6 py-4 dark:border-white/10">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-white p-1">
            {orgLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={orgLogoUrl} alt={org?.name ?? ""} className="h-9 w-9 object-contain" />
            ) : (
              <Image src="/logo.png" alt="Emergency Preparedness Solutions" width={36} height={37} />
            )}
          </div>
          <div>
            <h1 className="text-lg font-semibold text-black dark:text-zinc-50">Campus Ready admin</h1>
            <p className="text-sm text-zinc-500">
              {profile?.display_name || user.email} · {org ? org.name : "No organization yet"}
            </p>
          </div>
        </div>
        <SignOutButton />
      </header>

      {org && org.active !== false && <AdminNav />}

      <main className="mx-auto max-w-3xl px-6 py-8">
        {org && org.active === false ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
            <p className="font-medium">This organization&apos;s access has been suspended.</p>
            <p className="mt-1">Contact Emergency Preparedness Solutions to restore access.</p>
          </div>
        ) : org ? (
          children
        ) : (
          <CreateOrgForm
            pendingName={typeof user.user_metadata?.pending_org_name === "string" ? user.user_metadata.pending_org_name : undefined}
            pendingCode={typeof user.user_metadata?.pending_org_code === "string" ? user.user_metadata.pending_org_code : undefined}
          />
        )}
      </main>

      <DeleteAccountPanel orgCode={org?.org_code ?? null} />
    </div>
  );
}
