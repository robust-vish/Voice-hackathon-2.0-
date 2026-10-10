import { handle, json } from "@/lib/api";
import { ensureSeeded } from "@/lib/store";

export const dynamic = "force-dynamic";

/** Restores the synthetic demo dataset (deletes demo profiles + interactions). */
export async function POST() {
  return handle(() => {
    ensureSeeded(true);
    return json({ ok: true });
  });
}
