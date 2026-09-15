"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const sections = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/plan", label: "Plan content" },
  { href: "/admin/contacts", label: "Contacts" },
  { href: "/admin/forms", label: "Forms" },
  { href: "/admin/checklists", label: "Checklists" },
  { href: "/admin/incidents", label: "Incidents" },
  { href: "/admin/import", label: "Import from Word" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="overflow-x-auto border-b border-black/10 px-6 py-2 dark:border-white/10">
      <div className="flex w-max gap-x-4 text-sm sm:w-auto sm:flex-wrap sm:gap-y-1">
        {sections.map((s) => {
          const active = s.href === "/admin" ? pathname === "/admin" : pathname.startsWith(s.href);
          return (
            <Link
              key={s.href}
              href={s.href}
              className={
                active
                  ? "shrink-0 font-medium text-black dark:text-zinc-50"
                  : "shrink-0 text-zinc-500 hover:underline"
              }
            >
              {s.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
