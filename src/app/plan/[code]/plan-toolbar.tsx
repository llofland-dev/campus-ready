"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChecklistIcon, ContactsIcon, FormsIcon, HomeIcon } from "@/components/icons";
import { BRAND } from "@/lib/palette";

export function PlanToolbar({ code }: { code: string }) {
  const pathname = usePathname();

  const items = [
    { href: `/plan/${code}`, label: "Home", icon: HomeIcon, exact: true },
    { href: `/plan/${code}/contacts`, label: "Contacts", icon: ContactsIcon, exact: false },
    { href: `/plan/${code}/forms`, label: "Forms", icon: FormsIcon, exact: false },
    { href: `/plan/${code}/checklists`, label: "Checklists", icon: ChecklistIcon, exact: false },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 flex justify-center pb-[max(env(safe-area-inset-bottom),1rem)]">
      <div className="flex items-center gap-1 rounded-full border border-black/10 bg-white/95 px-2 py-2 shadow-lg backdrop-blur dark:border-white/10 dark:bg-zinc-900/95">
        {items.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              className={`flex flex-col items-center gap-0.5 rounded-full px-4 py-1.5 text-[10px] font-medium transition-colors ${
                active
                  ? `${BRAND.button} text-white`
                  : "text-zinc-600 hover:bg-black/5 dark:text-zinc-300 dark:hover:bg-white/10"
              }`}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
