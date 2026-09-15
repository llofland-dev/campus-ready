"use client";

import { useEffect, useState } from "react";
import type { EopForm, FormField } from "@/lib/supabase/types";
import { BRAND } from "@/lib/palette";

// Groups consecutive checkbox fields into one block, so a run of related
// checkboxes (e.g. everything under a "Notifications" section) renders as
// one side-by-side grid instead of each stacking as its own full-width row.
// Every other field type stays its own single-field block, unchanged.
type FormBlock = { kind: "checkbox-group"; fields: FormField[] } | { kind: "field"; field: FormField };

function toBlocks(fields: FormField[]): FormBlock[] {
  const blocks: FormBlock[] = [];
  for (const field of fields) {
    const last = blocks[blocks.length - 1];
    if (field.type === "checkbox" && last?.kind === "checkbox-group") {
      last.fields.push(field);
    } else if (field.type === "checkbox") {
      blocks.push({ kind: "checkbox-group", fields: [field] });
    } else {
      blocks.push({ kind: "field", field });
    }
  }
  return blocks;
}

function nowLocalDateTime() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export function FormFiller({ form }: { form: EopForm }) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [sent, setSent] = useState(false);

  // Datetime fields default to "now" so a report filed in the moment needs
  // no extra input, but the value is a plain editable field — filing a
  // report for something that happened earlier just means changing it.
  // Deferred to a microtask (client-only, post-hydration) rather than a
  // useState initializer, since computing "now" during the initial render
  // would run on the server too and could mismatch the client's clock on
  // hydration.
  useEffect(() => {
    Promise.resolve().then(() => {
      setValues((v) => {
        const next = { ...v };
        let changed = false;
        for (const field of form.fields) {
          if (field.type === "datetime" && next[field.id] === undefined) {
            next[field.id] = nowLocalDateTime();
            changed = true;
          }
        }
        return changed ? next : v;
      });
    });
    // Only ever run once on mount — this seeds defaults, it isn't meant to
    // re-sync if `form` were to change identity later.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setValue(id: string, value: string) {
    setValues((v) => ({ ...v, [id]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Save first — a misconfigured or missing mail app on someone's device
    // shouldn't mean the submission is just gone. Best-effort: if this fails
    // (network blip), the person can still send the email itself, so this
    // isn't allowed to block the mailto: attempt below.
    try {
      await fetch("/api/form-submission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formId: form.id, data: values }),
      });
    } catch {
      // Swallowed — the mailto: below is still attempted regardless.
    }

    const body = form.fields
      .map((field) => {
        // Section headers carry no value of their own — keep them in the
        // emailed body as a plain heading line so the grouping (e.g. which
        // checkboxes are "Notifications" vs "Resources") survives in the
        // plain-text email, not just the on-screen form.
        if (field.type === "section") return `\n${field.label.toUpperCase()}`;
        const value = values[field.id];
        const display = field.type === "checkbox" ? (value ? "Yes" : "No") : value || "(blank)";
        return `${field.label}: ${display}`;
      })
      .join("\n");

    const subject = encodeURIComponent(form.title);
    const mailBody = encodeURIComponent(body);
    // mailto: natively accepts a comma-separated list, so multiple
    // recipients need no special handling here — just store them that way.
    const to = form.recipient_email ?? "";

    window.location.href = `mailto:${to}?subject=${subject}&body=${mailBody}`;
    setSent(true);
  }

  const blocks = toBlocks(form.fields);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {blocks.map((block, blockIndex) => {
        if (block.kind === "checkbox-group") {
          return (
            <div key={block.fields[0].id} className="grid grid-cols-2 gap-x-4 gap-y-2">
              {block.fields.map((field) => (
                <label
                  key={field.id}
                  htmlFor={field.id}
                  className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300"
                >
                  <input
                    id={field.id}
                    type="checkbox"
                    checked={values[field.id] === "on"}
                    onChange={(e) => setValue(field.id, e.target.checked ? "on" : "")}
                    className="h-5 w-5 shrink-0"
                  />
                  <span>
                    {field.label}
                    {field.required && " *"}
                  </span>
                </label>
              ))}
            </div>
          );
        }

        const field = block.field;

        if (field.type === "section") {
          return (
            <h2
              key={field.id}
              className={`border-t border-black/10 pt-4 text-base font-semibold text-zinc-900 dark:border-white/10 dark:text-zinc-50 ${blockIndex === 0 ? "border-t-0 pt-0" : ""}`}
            >
              {field.label}
            </h2>
          );
        }

        return (
          <div key={field.id} className="space-y-1">
            <label
              htmlFor={field.id}
              className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              {field.label}
              {field.required && " *"}
            </label>

            {field.type === "select" ? (
              <select
                id={field.id}
                required={field.required}
                value={values[field.id] ?? ""}
                onChange={(e) => setValue(field.id, e.target.value)}
                className={`w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-base outline-none dark:border-white/10 dark:bg-zinc-950 ${BRAND.focusBorder}`}
              >
                <option value="" disabled>
                  Select…
                </option>
                {(field.options ?? []).map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            ) : field.type === "textarea" ? (
              <textarea
                id={field.id}
                required={field.required}
                rows={4}
                value={values[field.id] ?? ""}
                onChange={(e) => setValue(field.id, e.target.value)}
                className={`w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-base outline-none dark:border-white/10 dark:bg-zinc-950 ${BRAND.focusBorder}`}
              />
            ) : (
              <input
                id={field.id}
                type={field.type === "phone" ? "tel" : field.type === "datetime" ? "datetime-local" : field.type}
                required={field.required}
                value={values[field.id] ?? ""}
                onChange={(e) => setValue(field.id, e.target.value)}
                className={`w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-base outline-none dark:border-white/10 dark:bg-zinc-950 ${BRAND.focusBorder}`}
              />
            )}
          </div>
        );
      })}

      {form.fields.length === 0 && (
        <p className="text-sm text-zinc-500">This form has no fields yet.</p>
      )}

      <button
        type="submit"
        className={`w-full rounded-full px-4 py-3 text-base font-medium text-white transition-colors ${BRAND.button} ${BRAND.buttonHover}`}
      >
        Email this form
      </button>

      {sent && (
        <p className="text-sm text-zinc-500">
          Your email app should have opened with this form filled in — send it from there.
        </p>
      )}
    </form>
  );
}
