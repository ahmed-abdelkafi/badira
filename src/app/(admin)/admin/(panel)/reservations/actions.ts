"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { clientIp, requireAdmin } from "@/server/auth/dal";
import { addReservationNote, changeReservationStatus, logWhatsAppOpened, ReservationError } from "@/server/services/reservations";
import { reservationStatuses } from "@/lib/reservation-status";

export type ActionResult = { ok: boolean; error?: string; message?: string };

const statusSchema = z.object({
  id: z.uuid(),
  to: z.enum(reservationStatuses),
  message: z.string().max(4000).optional(),
});

export async function changeStatusAction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const user = await requireAdmin("reservations.manage");
  const parsed = statusSchema.safeParse({
    id: form.get("id"),
    to: form.get("to"),
    message: form.get("message") ?? undefined,
  });
  if (!parsed.success) return { ok: false, error: "Requête invalide." };
  try {
    const res = await changeReservationStatus({
      actorId: user.id,
      reservationId: parsed.data.id,
      to: parsed.data.to,
      message: parsed.data.message,
      ip: await clientIp(),
    });
    revalidatePath(`/admin/reservations/${parsed.data.id}`);
    revalidatePath("/admin/reservations");
    void res;
    return { ok: true, message: "Statut mis à jour. Informez le client par WhatsApp (panneau à droite)." };
  } catch (err) {
    if (err instanceof ReservationError && err.code === "invalid_transition")
      return { ok: false, error: "Ce changement de statut n’est pas autorisé depuis le statut actuel (la demande a peut-être été traitée entre-temps)." };
    if (err instanceof ReservationError && err.code === "not_found") return { ok: false, error: "Réservation introuvable." };
    throw err;
  }
}

export async function addNoteAction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const user = await requireAdmin("reservations.manage");
  const id = z.uuid().safeParse(form.get("id"));
  const body = String(form.get("body") ?? "").trim();
  if (!id.success || !body) return { ok: false, error: "Note vide." };
  await addReservationNote(user.id, id.data, body);
  revalidatePath(`/admin/reservations/${id.data}`);
  return { ok: true };
}

/** Logs that a WhatsApp click-to-chat conversation was OPENED (delivery is not observable). */
export async function logWhatsAppAction(reservationId: string, template: string, locale: string): Promise<void> {
  const user = await requireAdmin("reservations.manage");
  const id = z.uuid().parse(reservationId);
  const tpl = z.enum(["accept", "decline", "general", "custom"]).parse(template);
  const loc = z.enum(["fr", "en", "ar"]).parse(locale);
  await logWhatsAppOpened(user.id, id, tpl, loc);
  revalidatePath(`/admin/reservations/${id}`);
}
