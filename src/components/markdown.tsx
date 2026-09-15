import ReactMarkdown, { defaultUrlTransform, type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

// react-markdown's default URL sanitizer only allows a handful of schemes
// (http, https, mailto, ...) and silently drops anything else — including
// tel:, which linkifyPhones below relies on to make phone numbers dialable.
function urlTransform(url: string): string {
  if (url.startsWith("tel:")) return url;
  return defaultUrlTransform(url);
}

// Styled to match the app's existing typography — used for plan_pages.body,
// which admins author as Markdown in a plain textarea (no WYSIWYG editor).
const components: Components = {
  h1: (props) => <h2 className="mt-4 text-lg font-semibold first:mt-0" {...props} />,
  h2: (props) => <h3 className="mt-4 text-base font-semibold first:mt-0" {...props} />,
  h3: (props) => <h4 className="mt-3 text-sm font-semibold uppercase tracking-wide text-zinc-500 first:mt-0" {...props} />,
  h4: (props) => <h5 className="mt-3 text-sm font-semibold first:mt-0" {...props} />,
  p: (props) => <p className="mt-3 text-[15px] leading-relaxed first:mt-0" {...props} />,
  ul: (props) => <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[15px] leading-relaxed first:mt-0" {...props} />,
  ol: (props) => <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-[15px] leading-relaxed first:mt-0" {...props} />,
  li: (props) => <li {...props} />,
  strong: (props) => <strong className="font-semibold" {...props} />,
  em: (props) => <em className="italic" {...props} />,
  a: (props) => <a className="underline" {...props} />,
  table: (props) => (
    <div className="mt-3 overflow-x-auto first:mt-0">
      <table className="w-full min-w-[480px] border-collapse text-sm" {...props} />
    </div>
  ),
  thead: (props) => <thead className="bg-black/5 dark:bg-white/10" {...props} />,
  th: (props) => (
    <th className="border border-black/10 px-2 py-1.5 text-left font-semibold dark:border-white/10" {...props} />
  ),
  td: (props) => <td className="border border-black/10 px-2 py-1.5 align-top dark:border-white/10" {...props} />,
};

// Turns a bare phone number (e.g. in a POTS-lines table cell) into a
// tap-to-dial markdown link before parsing — page bodies are authored as
// plain Markdown with no way to add tel: links by hand, so this makes every
// NANP-formatted number in any page body dialable automatically.
const PHONE_PATTERN = /\b(\d{3})-(\d{3})-(\d{4})\b/g;

function linkifyPhones(text: string): string {
  return text.replace(PHONE_PATTERN, (match, area, exchange, line) => `[${match}](tel:${area}${exchange}${line})`);
}

export function Markdown({ children }: { children: string }) {
  return (
    <div className="text-zinc-800 dark:text-zinc-200">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components} urlTransform={urlTransform}>
        {linkifyPhones(children)}
      </ReactMarkdown>
    </div>
  );
}
