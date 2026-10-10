import { fail, handle, json } from "@/lib/api";
import { prepareCall } from "@/lib/calls";
import type { CallMode } from "@/lib/types";

export const dynamic = "force-dynamic";

/** D1 pre-call preparation: validates GLID, profile, PNS, persona, provider; creates the interaction. */
export async function POST(req: Request) {
  return handle(async () => {
    const body = (await req.json().catch(() => null)) as { glid?: string; mode?: string } | null;
    const mode = (body?.mode ?? "simulated") as CallMode;
    if (!["simulated", "web", "pstn"].includes(mode)) return fail("Unknown call mode", 400);
    const r = prepareCall(body?.glid ?? "", mode);
    if (!r.interaction) {
      const notFound = r.checks.some((c) => c.id === "profile" && c.status === "fail");
      return json({ error: r.checks.find((c) => c.status === "fail")?.detail ?? "Pre-call checks failed", checks: r.checks, existing: r.existing }, r.existing ? 409 : notFound ? 404 : 400);
    }
    return json({ interaction: r.interaction, checks: r.checks }, 201);
  });
}
