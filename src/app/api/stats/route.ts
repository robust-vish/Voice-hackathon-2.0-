import { handle, json } from "@/lib/api";
import { sarvamConfigured } from "@/lib/sarvam";
import { getMetrics, listInteractions, listProfiles, listRegistry } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  return handle(() => {
    const profiles = listProfiles();
    const registry = listRegistry();
    const glids = new Set([...profiles.map((p) => p.glid), ...registry.map((r) => r.glid)]);
    const interactions = listInteractions();
    const completed = interactions.filter((i) => i.status === "Completed");
    return json({
      dataLabel: "Synthetic demonstration data — not real IndiaMART business metrics.",
      totalSellers: glids.size,
      profiles: profiles.length,
      completedInteractions: completed.length,
      personasGenerated: getMetrics().personasGenerated,
      adaptationEvents: interactions.reduce((n, i) => n + i.switchLog.length, 0),
      profilesUpdatedAfterCalls: interactions.filter((i) => i.postCall.status === "done" && (i.postCall.summary?.updates.length ?? 0) + (i.postCall.summary?.memoryAdded.length ?? 0) > 0).length,
      sarvam: sarvamConfigured() ? "configured" : "not-configured",
      operatingMode: sarvamConfigured() ? "Live voice (web) + Simulated" : "Simulated (browser speech for web calls)",
      recent: interactions.slice(0, 8).map((i) => ({
        id: i.id, glid: i.glid, sellerName: i.sellerName, mode: i.mode, status: i.status, createdAt: i.createdAt,
        outcome: i.outcome ?? null, adaptations: i.switchLog.length, postCall: i.postCall.status,
      })),
    });
  });
}
