import { fail, handle, json } from "@/lib/api";
import { isLanguageCode } from "@/lib/languages";
import { sarvamConfigured, sarvamTts } from "@/lib/sarvam";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return handle(async () => {
    if (!sarvamConfigured()) return fail("Sarvam TTS not configured", 503, { fallback: "browser" });
    const body = (await req.json().catch(() => ({}))) as { text?: string; language?: string; gender?: string; pace?: number };
    const text = (body.text ?? "").trim();
    if (!text) return fail("text is required", 400);
    if (!isLanguageCode(body.language)) return fail("Unsupported language", 400);
    const gender = body.gender === "male" ? "male" : "female";
    const pace = typeof body.pace === "number" ? Math.min(2, Math.max(0.5, body.pace)) : 1;
    const r = await sarvamTts(text, body.language, gender, pace);
    return json(r);
  });
}
