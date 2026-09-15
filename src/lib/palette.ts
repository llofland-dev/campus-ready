// Row/header colors for the staff-facing "flip-chart" UI.
//
// Tailwind's build-time scanner needs each class name as a complete literal
// string somewhere in source — it doesn't execute JS, so
// `` `bg-[${NAVY}]` `` would never generate a stylesheet rule. Every
// Tailwind class below is written out in full for that reason; NAVY/MAIZE
// are only for non-Tailwind uses (raw inline styles, JS logic).
export interface PaletteColor {
  key: string;
  label: string;
  row: string; // pastel row background
  rowHover: string;
  button: string; // solid accent used for the row's arrow button and the header bar
  buttonText: string;
}

// Brand palette: Michigan Wolverine navy + maize.
export const NAVY = "#00274c";
export const MAIZE = "#FFCB05";

// Named so a plan_sections.color_key can pick one deliberately (e.g. a real
// hospital Code's conventional color) instead of relying on auto-cycling —
// see colorForSection below. Order also doubles as the auto-cycle sequence
// for sections/forms/checklists with no explicit color — IMPORTANT: only
// ever append new entries at the end, never reorder or insert, or every
// existing auto-colored row silently shifts to a different color.
export const PALETTE: PaletteColor[] = [
  { key: "pink", label: "Pink", row: "bg-rose-100", rowHover: "hover:bg-rose-200", button: "bg-rose-500", buttonText: "text-white" },
  { key: "gray", label: "Silver/Gray", row: "bg-slate-200", rowHover: "hover:bg-slate-300", button: "bg-slate-500", buttonText: "text-white" },
  { key: "green", label: "Green", row: "bg-green-100", rowHover: "hover:bg-green-200", button: "bg-green-600", buttonText: "text-white" },
  { key: "orange", label: "Orange", row: "bg-amber-100", rowHover: "hover:bg-amber-200", button: "bg-amber-500", buttonText: "text-white" },
  { key: "blue", label: "Blue", row: "bg-blue-100", rowHover: "hover:bg-blue-200", button: "bg-blue-600", buttonText: "text-white" },
  { key: "purple", label: "Purple", row: "bg-violet-100", rowHover: "hover:bg-violet-200", button: "bg-violet-600", buttonText: "text-white" },
  {
    key: "gold",
    label: "Gold",
    row: "bg-yellow-100",
    rowHover: "hover:bg-yellow-200",
    button: "bg-[#FFCB05]",
    buttonText: "text-[#00274c]",
  },
  { key: "teal", label: "Teal", row: "bg-teal-100", rowHover: "hover:bg-teal-200", button: "bg-teal-600", buttonText: "text-white" },
  // Added later for real hospital Code colors — appended, not inserted, so
  // the 8 slots above keep producing the same auto-cycled color they always
  // have for any section that doesn't set an explicit color_key.
  { key: "red", label: "Red", row: "bg-red-100", rowHover: "hover:bg-red-200", button: "bg-red-600", buttonText: "text-white" },
  {
    key: "white",
    label: "White",
    row: "bg-white border border-zinc-300",
    rowHover: "hover:bg-zinc-50",
    button: "bg-zinc-800",
    buttonText: "text-white",
  },
  { key: "yellow", label: "Yellow", row: "bg-yellow-50 border border-yellow-300", rowHover: "hover:bg-yellow-100", button: "bg-yellow-400", buttonText: "text-black" },
];

const PALETTE_BY_KEY = new Map(PALETTE.map((c) => [c.key, c]));

export const BRAND = {
  header: "bg-[#00274c]",
  button: "bg-[#00274c]",
  buttonHover: "hover:bg-[#001a35]",
  focusBorder: "focus:border-[#00274c]",
  accent: "accent-[#00274c]",
};

// For lists with no real-world color convention (Forms, Checklists): cycle
// through the palette purely by position.
export function colorForIndex(index: number): PaletteColor {
  return PALETTE[((index % PALETTE.length) + PALETTE.length) % PALETTE.length];
}

// For plan_sections: honor an explicit color_key (e.g. a hospital Code's
// conventional color) when set and recognized, else fall back to
// auto-cycling by position — same behavior as before color_key existed.
export function colorForSection(section: { color_key: string | null }, index: number): PaletteColor {
  if (section.color_key) {
    const named = PALETTE_BY_KEY.get(section.color_key);
    if (named) return named;
  }
  return colorForIndex(index);
}
