"use client";

import { useActionState } from "react";
import type { Localized } from "@/lib/localized";
import type { FieldDef } from "@/server/services/collections";
import type { ActionState } from "@/server/services/admin-helpers";
import { saveItemAction } from "@/app/(admin)/admin/(panel)/content/[kind]/actions";
import { Feedback, LocalizedField, MediaPicker, SubmitButton, type MediaOption } from "./fields";

export function CollectionForm({
  kind,
  fields,
  item,
  media,
}: {
  kind: string;
  fields: FieldDef[];
  item?: Record<string, unknown> & { id: string; status: string };
  media: MediaOption[];
}) {
  const [state, action] = useActionState<ActionState, FormData>(saveItemAction, {});
  const v = (name: string) => item?.[name];

  return (
    <form action={action} className="grid gap-4 md:grid-cols-2">
      <input type="hidden" name="kind" value={kind} />
      {item && <input type="hidden" name="id" value={item.id} />}
      {fields.map((f) => {
        const id = `${item?.id ?? "new"}-${f.name}`;
        switch (f.type) {
          case "localized":
            return (
              <div key={f.name} className={f.multiline ? "md:col-span-2" : ""}>
                <LocalizedField name={f.name} label={f.label} value={v(f.name) as Localized | undefined} multiline={f.multiline} maxLength={f.max} hint={f.hint} />
              </div>
            );
          case "select":
            return (
              <div key={f.name}>
                <label className="a-label" htmlFor={id}>{f.label}</label>
                <select id={id} name={f.name} defaultValue={(v(f.name) as string) ?? f.options[0].value} className="a-input">
                  {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            );
          case "media":
            return (
              <div key={f.name} className="md:col-span-2">
                <MediaPicker name={f.name} label={f.label} media={media} value={(v(f.name) as string) ?? null} />
              </div>
            );
          default:
            return (
              <div key={f.name}>
                <label className="a-label" htmlFor={id}>{f.label}</label>
                <input
                  id={id}
                  name={f.name}
                  type={f.type === "int" ? "number" : f.type === "url" ? "url" : f.type === "date" ? "date" : "text"}
                  required={"required" in f && f.required}
                  maxLength={"max" in f && f.type === "text" ? f.max : undefined}
                  min={f.type === "int" ? f.min : undefined}
                  max={f.type === "int" ? f.max : undefined}
                  defaultValue={(v(f.name) as string | number | null) ?? ""}
                  className="a-input"
                />
                {"hint" in f && f.hint && <p className="mt-1 text-xs text-stone">{f.hint}</p>}
              </div>
            );
        }
      })}
      <div>
        <label className="a-label" htmlFor={`${item?.id ?? "new"}-status`}>Visibilité</label>
        <select id={`${item?.id ?? "new"}-status`} name="status" defaultValue={item?.status ?? (kind === "testimonials" ? "inactive" : "active")} className="a-input">
          <option value="active">Visible</option>
          <option value="inactive">Masqué</option>
        </select>
      </div>
      <div className="flex flex-wrap items-center gap-3 md:col-span-2">
        <SubmitButton>{item ? "Enregistrer" : "Ajouter"}</SubmitButton>
        <Feedback state={state} />
      </div>
    </form>
  );
}
