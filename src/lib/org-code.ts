// Plan codes end up in URLs (/plan/ACME2026/...), get typed by staff on phones,
// and are read aloud — so they're limited to letters, digits, "-" and "_",
// 3-24 characters. Anything else (spaces, slashes, "#", emoji) either breaks
// the links built from the raw code or is easy to mistype.
export const ORG_CODE_HTML_PATTERN = "[A-Za-z0-9][A-Za-z0-9_\\-]{2,23}";
export const ORG_CODE_HINT = "3–24 letters, numbers, dashes, or underscores — no spaces.";

const ORG_CODE_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{2,23}$/;

export function validateOrgCode(raw: string): string | null {
  return ORG_CODE_RE.test(raw.trim()) ? null : `Plan code must be ${ORG_CODE_HINT}`;
}

export function validateOrgName(raw: string): string | null {
  const name = raw.trim();
  if (!name) return "Enter an organization name.";
  if (name.length > 100) return "Organization name must be 100 characters or fewer.";
  return null;
}
