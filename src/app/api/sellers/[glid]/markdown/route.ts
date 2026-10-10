import { fail, handle } from "@/lib/api";
import { isValidGlid, normalizeGlid } from "@/lib/profile";
import { getProfileMarkdown } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ glid: string }> }) {
  return handle(async () => {
    const glid = normalizeGlid(decodeURIComponent((await params).glid));
    if (!isValidGlid(glid)) return fail("Invalid GLID", 400);
    const md = getProfileMarkdown(glid);
    if (md == null) return fail("Profile not found", 404);
    return new Response(md, { headers: { "Content-Type": "text/markdown; charset=utf-8", "Cache-Control": "no-store" } });
  });
}
