"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Organization } from "@/lib/supabase/types";

export function OrgSettingsPanel({ org }: { org: Organization }) {
  const router = useRouter();
  const supabase = createClient();

  const [name, setName] = useState(org.name);
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const currentLogoUrl = org.logo_path
    ? supabase.storage.from("org-logos").getPublicUrl(org.logo_path).data.publicUrl
    : null;

  const [password, setPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);

  const [adminPassword, setAdminPassword] = useState("");
  const [savingAdminPassword, setSavingAdminPassword] = useState(false);
  const [adminPasswordError, setAdminPasswordError] = useState<string | null>(null);
  const [adminPasswordMessage, setAdminPasswordMessage] = useState<string | null>(null);

  const [loginPassword, setLoginPassword] = useState("");
  const [savingLoginPassword, setSavingLoginPassword] = useState(false);
  const [loginPasswordError, setLoginPasswordError] = useState<string | null>(null);
  const [loginPasswordMessage, setLoginPasswordMessage] = useState<string | null>(null);

  const fieldClass =
    "w-full rounded-md border border-black/10 bg-transparent px-3 py-2 text-sm outline-none focus:border-black/30 dark:border-white/10 dark:focus:border-white/30";

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    setSavingName(true);
    setNameError(null);

    const { error } = await supabase.from("organizations").update({ name }).eq("id", org.id);

    setSavingName(false);

    if (error) {
      setNameError(error.message);
      return;
    }

    router.refresh();
  }

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploadingLogo(true);
    setLogoError(null);

    const ext = file.name.split(".").pop() || "png";
    // A unique filename per upload (rather than a fixed name + overwrite)
    // means the public URL changes whenever the logo changes, so every
    // screen picks up the new image immediately instead of serving a
    // browser-cached copy of the old one at the same URL.
    const path = `${org.id}/logo-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("org-logos")
      .upload(path, file, { contentType: file.type });

    if (uploadError) {
      setUploadingLogo(false);
      setLogoError(uploadError.message);
      return;
    }

    const { error } = await supabase.from("organizations").update({ logo_path: path }).eq("id", org.id);

    setUploadingLogo(false);
    if (error) return setLogoError(error.message);
    router.refresh();
  }

  async function handleSetPassword(e: React.FormEvent) {
    e.preventDefault();
    setSavingPassword(true);
    setPasswordError(null);
    setPasswordMessage(null);

    const { error } = await supabase.rpc("eop_set_org_password", { p_password: password || null });

    setSavingPassword(false);

    if (error) {
      setPasswordError(error.message);
      return;
    }

    setPassword("");
    setPasswordMessage(password ? "Password updated." : "Password removed — anyone with the code can view.");
  }

  async function handleSetAdminPassword(e: React.FormEvent) {
    e.preventDefault();
    setSavingAdminPassword(true);
    setAdminPasswordError(null);
    setAdminPasswordMessage(null);

    const { error } = await supabase.rpc("eop_set_org_admin_password", { p_password: adminPassword || null });

    setSavingAdminPassword(false);

    if (error) {
      setAdminPasswordError(error.message);
      return;
    }

    setAdminPassword("");
    setAdminPasswordMessage(
      adminPassword ? "Facility Admin passphrase updated." : "Facility Admin passphrase removed."
    );
  }

  async function handleChangeLoginPassword(e: React.FormEvent) {
    e.preventDefault();
    setSavingLoginPassword(true);
    setLoginPasswordError(null);
    setLoginPasswordMessage(null);

    const { error } = await supabase.auth.updateUser({ password: loginPassword });

    setSavingLoginPassword(false);

    if (error) {
      setLoginPasswordError(error.message);
      return;
    }

    setLoginPassword("");
    setLoginPasswordMessage("Your login password has been updated.");
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-zinc-950">
        <h3 className="mb-1 text-sm font-medium text-zinc-600 dark:text-zinc-400">Your login</h3>
        <p className="mb-3 text-sm text-zinc-500">
          The password for this admin account (not the staff-facing passwords below).
        </p>
        <form onSubmit={handleChangeLoginPassword} className="flex flex-wrap items-end gap-3">
          <div className="flex-1 space-y-1">
            <label htmlFor="login-password" className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              New password
            </label>
            <input
              id="login-password"
              type="password"
              required
              minLength={8}
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              className={fieldClass}
            />
          </div>
          <button
            type="submit"
            disabled={savingLoginPassword}
            className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
          >
            {savingLoginPassword ? "Saving..." : "Update"}
          </button>
        </form>
        {loginPasswordError && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{loginPasswordError}</p>}
        {loginPasswordMessage && <p className="mt-2 text-sm text-zinc-500">{loginPasswordMessage}</p>}
      </section>

      <section className="rounded-lg border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-zinc-950">
        <h3 className="mb-3 text-sm font-medium text-zinc-600 dark:text-zinc-400">Organization</h3>
        <form onSubmit={handleSaveName} className="flex flex-wrap items-end gap-3">
          <div className="flex-1 space-y-1">
            <label htmlFor="org-name" className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Name
            </label>
            <input id="org-name" value={name} onChange={(e) => setName(e.target.value)} className={fieldClass} />
          </div>
          <div className="space-y-1">
            <span className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">Plan code</span>
            <p className="rounded-md border border-black/10 px-3 py-2 text-sm text-zinc-500 dark:border-white/10">
              {org.org_code}
            </p>
          </div>
          <button
            type="submit"
            disabled={savingName}
            className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
          >
            {savingName ? "Saving..." : "Save"}
          </button>
        </form>
        {nameError && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{nameError}</p>}
      </section>

      <section className="rounded-lg border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-zinc-950">
        <h3 className="mb-1 text-sm font-medium text-zinc-600 dark:text-zinc-400">Logo</h3>
        <p className="mb-3 text-sm text-zinc-500">
          Shown across your staff-facing screens and this admin dashboard, in place of the default
          logo.
        </p>
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-dashed border-black/10 bg-white dark:border-white/10 dark:bg-zinc-950">
            {currentLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={currentLogoUrl} alt={org.name} className="h-full w-full object-contain p-1" />
            ) : (
              <span className="text-xs text-zinc-400">None</span>
            )}
          </div>
          <label className="cursor-pointer rounded-md border border-black/10 px-4 py-2 text-sm font-medium hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10">
            {uploadingLogo ? "Uploading..." : currentLogoUrl ? "Replace logo" : "Upload logo"}
            <input
              type="file"
              accept="image/*"
              onChange={handleLogoChange}
              disabled={uploadingLogo}
              className="hidden"
            />
          </label>
        </div>
        {logoError && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{logoError}</p>}
      </section>

      <section className="rounded-lg border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-zinc-950">
        <h3 className="mb-1 text-sm font-medium text-zinc-600 dark:text-zinc-400">Staff password</h3>
        <p className="mb-3 text-sm text-zinc-500">
          Optional second factor for general staff — needed after entering your plan code. Leave
          blank and save to remove password protection entirely.
        </p>
        <form onSubmit={handleSetPassword} className="flex flex-wrap items-end gap-3">
          <div className="flex-1 space-y-1">
            <label htmlFor="org-password" className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              New password
            </label>
            <input
              id="org-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Leave blank to remove"
              className={fieldClass}
            />
          </div>
          <button
            type="submit"
            disabled={savingPassword}
            className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
          >
            {savingPassword ? "Saving..." : "Update"}
          </button>
        </form>
        {passwordError && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{passwordError}</p>}
        {passwordMessage && <p className="mt-2 text-sm text-zinc-500">{passwordMessage}</p>}
      </section>

      <section className="rounded-lg border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-zinc-950">
        <h3 className="mb-1 text-sm font-medium text-zinc-600 dark:text-zinc-400">Facility Admin passphrase</h3>
        <p className="mb-3 text-sm text-zinc-500">
          A separate, elevated passphrase for whoever you designate as your facility&apos;s on-the-ground
          admin (e.g. your Emergency Manager). Entering it at the plan code screen unlocks Incident
          Command/Job Action Sheet content and the ability to update contact phone numbers and
          emails — nothing else. No account or login required, same as the staff password above.
        </p>
        <form onSubmit={handleSetAdminPassword} className="flex flex-wrap items-end gap-3">
          <div className="flex-1 space-y-1">
            <label htmlFor="org-admin-password" className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              New passphrase
            </label>
            <input
              id="org-admin-password"
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              placeholder="Leave blank to remove"
              className={fieldClass}
            />
          </div>
          <button
            type="submit"
            disabled={savingAdminPassword}
            className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
          >
            {savingAdminPassword ? "Saving..." : "Update"}
          </button>
        </form>
        {adminPasswordError && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{adminPasswordError}</p>}
        {adminPasswordMessage && <p className="mt-2 text-sm text-zinc-500">{adminPasswordMessage}</p>}
      </section>
    </div>
  );
}
