import "server-only";
import { db, schema } from "@/server/db";

export type AuditEntry = {
  actorId: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  meta?: Record<string, unknown>;
  ip?: string | null;
};

/** Build the INSERT (for use inside a batch). Never put secrets, codes or passwords in `meta`. */
export function auditInsert(entry: AuditEntry) {
  return db()
    .insert(schema.auditLogs)
    .values({
      actorId: entry.actorId,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      meta: entry.meta ?? {},
      ip: entry.ip ?? null,
    });
}

export async function audit(entry: AuditEntry): Promise<void> {
  await auditInsert(entry);
}
