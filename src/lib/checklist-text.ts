// A section-divider row within a checklist, not a checkable step — an admin
// marks one by starting the item's text with the literal word "SECTION" in
// caps (e.g. "SECTION 1 — FOUNDATION"). Deliberately text-based rather than a
// schema column: no migration needed, and it's typeable from the existing
// "add item" field both in the admin editor and (implicitly) anywhere else
// that creates checklist_items rows.
export function isChecklistHeader(text: string): boolean {
  return /^SECTION\b/.test(text);
}
