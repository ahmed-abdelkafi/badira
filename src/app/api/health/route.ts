import { sql } from "drizzle-orm";
import { db } from "@/server/db";

/** Liveness/readiness probe for the hosting platform (no sensitive data). */
export async function GET() {
  try {
    await db().run(sql`select 1`);
    return Response.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ status: "degraded" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
