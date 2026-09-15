// Minimal hand-rolled icon set for the staff-facing UI — avoids pulling in
// an icon library dependency for ~8 glyphs.
type IconProps = { className?: string };

const base = "stroke-current fill-none";

export function ChevronLeftIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <path className={base} d="M15 6l-6 6 6 6" />
    </svg>
  );
}

export function ChevronRightIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <path className={base} d="M9 6l6 6-6 6" />
    </svg>
  );
}

export function PhoneIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path
        className={base}
        d="M4 5c0-1 1-2 2-2h2l2 5-2 1.5a11 11 0 0 0 5 5L14.5 13l5 2v2c0 1-1 2-2 2C10.5 19 4 12.5 4 5Z"
      />
    </svg>
  );
}

export function MailIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect className={base} x="3" y="5" width="18" height="14" rx="2" />
      <path className={base} d="m4 7 8 6 8-6" />
    </svg>
  );
}

export function HomeIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path className={base} d="M4 11 12 4l8 7" />
      <path className={base} d="M6 10v9a1 1 0 0 0 1 1h3v-6h4v6h3a1 1 0 0 0 1-1v-9" />
    </svg>
  );
}

export function ContactsIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle className={base} cx="12" cy="8" r="3.2" />
      <path className={base} d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" />
    </svg>
  );
}

export function FormsIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect className={base} x="5" y="3" width="14" height="18" rx="2" />
      <path className={base} d="M8 8h8M8 12h8M8 16h5" />
    </svg>
  );
}

export function ChecklistIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path className={base} d="m4 6 1.5 1.5L8 5" />
      <path className={base} d="M11 6h9" />
      <path className={base} d="m4 12 1.5 1.5L8 11" />
      <path className={base} d="M11 12h9" />
      <path className={base} d="m4 18 1.5 1.5L8 17" />
      <path className={base} d="M11 18h9" />
    </svg>
  );
}

export function SearchIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle className={base} cx="10.5" cy="10.5" r="6.5" />
      <path className={base} d="m20 20-4.3-4.3" />
    </svg>
  );
}

export function AlertIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path className={base} d="M12 3 2 20h20L12 3Z" />
      <path className={base} d="M12 10v4" />
      <path className={base} d="M12 17h.01" />
    </svg>
  );
}

export function SitemapIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect className={base} x="9" y="3" width="6" height="4" rx="1" />
      <rect className={base} x="3" y="17" width="6" height="4" rx="1" />
      <rect className={base} x="15" y="17" width="6" height="4" rx="1" />
      <path className={base} d="M12 7v4M12 11H6v6M12 11h6v6" />
    </svg>
  );
}

export function ClipboardIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect className={base} x="6" y="4" width="12" height="17" rx="2" />
      <rect className={base} x="9" y="2.5" width="6" height="3" rx="1" />
      <path className={base} d="M9 11h6M9 15h4" />
    </svg>
  );
}
