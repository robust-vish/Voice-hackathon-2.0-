import { handle, json } from "@/lib/api";
import { normalizeGlid } from "@/lib/profile";
import { listProfiles, listRegistry } from "@/lib/store";
import { summarizeProfile, summarizeRegistry } from "@/lib/summaries";

export const dynamic = "force-dynamic";

// Server-side search + filtering + pagination over profiles and registry-only sellers.
export async function GET(req: Request) {
  return handle(() => {
    const url = new URL(req.url);
    const q = (url.searchParams.get("q") ?? "").trim();
    const language = url.searchParams.get("language") ?? "";
    const status = url.searchParams.get("status") ?? "";
    const category = (url.searchParams.get("category") ?? "").toLowerCase();
    const page = Math.max(1, Number(url.searchParams.get("page") ?? 1) || 1);
    const pageSize = Math.min(50, Math.max(1, Number(url.searchParams.get("pageSize") ?? 12) || 12));

    const profiles = listProfiles();
    const have = new Set(profiles.map((p) => p.glid));
    let all = [...profiles.map(summarizeProfile), ...listRegistry().filter((e) => !have.has(e.glid)).map(summarizeRegistry)];

    if (q) {
      const g = normalizeGlid(q);
      const ql = q.toLowerCase();
      all = all.filter((s) => s.glid.includes(g) || s.displayName.toLowerCase().includes(ql) || (s.contactPerson ?? "").toLowerCase().includes(ql));
    }
    if (language) all = all.filter((s) => s.preferredLanguage === language);
    if (status) all = all.filter((s) => s.status === status);
    if (category) all = all.filter((s) => s.category.toLowerCase().includes(category));
    all.sort((a, b) => Number(a.isDemo) - Number(b.isDemo) || Number(a.glid) - Number(b.glid));

    const total = all.length;
    return json({ total, page, pageSize, items: all.slice((page - 1) * pageSize, page * pageSize) });
  });
}
