import { fail, handle, json } from "@/lib/api";
import { generatePersona, generatePlan } from "@/lib/persona";
import { GLID_HINT, isValidGlid, normalizeGlid } from "@/lib/profile";
import { getOrInitProfile, listInteractions } from "@/lib/store";
import { summarizeProfile } from "@/lib/summaries";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ glid: string }> }) {
  return handle(async () => {
    const raw = decodeURIComponent((await params).glid);
    const glid = normalizeGlid(raw);
    if (!isValidGlid(glid)) return fail(`Invalid GLID. ${GLID_HINT}`, 400);
    const found = getOrInitProfile(glid);
    if (!found) return fail(`No seller with GLID ${glid} exists in the seller registry.`, 404, { glid });
    const persona = generatePersona(found.profile);
    const active = listInteractions().find((i) => i.glid === glid && ["Preparing", "Initiating", "Ringing", "Connected", "In Progress", "Ending"].includes(i.status));
    return json({
      glid,
      initialised: found.initialised,
      summary: summarizeProfile(found.profile),
      profile: found.profile,
      persona,
      plan: generatePlan(found.profile, persona),
      activeInteraction: active ? { id: active.id, status: active.status, overrides: active.overrides, currentPersona: active.currentPersona } : null,
    });
  });
}
