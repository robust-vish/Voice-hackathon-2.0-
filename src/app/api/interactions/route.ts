import { handle, json } from "@/lib/api";
import { normalizeGlid } from "@/lib/profile";
import { listInteractions } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return handle(() => {
    const url = new URL(req.url);
    const glid = url.searchParams.get("glid");
    let items = listInteractions();
    if (glid) items = items.filter((i) => i.glid === normalizeGlid(glid));
    return json({
      items: items.map((i) => ({
        id: i.id, glid: i.glid, sellerName: i.sellerName, mode: i.mode, status: i.status, createdAt: i.createdAt,
        durationSec: i.durationSec ?? null, initialPersona: i.initialPersona.summary, outcome: i.outcome ?? null,
        adaptations: i.switchLog.length, postCall: i.postCall.status,
        profileUpdates: i.postCall.summary ? i.postCall.summary.updates.length + i.postCall.summary.memoryAdded.length : 0,
      })),
    });
  });
}
