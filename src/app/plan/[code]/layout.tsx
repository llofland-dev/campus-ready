import { getVerifiedOrg } from "@/lib/eop-org";
import { PlanToolbar } from "./plan-toolbar";

export default async function PlanLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const org = await getVerifiedOrg(code);

  if (!org) {
    // Pre-verification gate screens render full-bleed with no toolbar.
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-zinc-50 pb-24 dark:bg-black">
      {children}
      <PlanToolbar code={code} />
    </div>
  );
}
