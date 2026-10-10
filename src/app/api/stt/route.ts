import { fail, handle, json } from "@/lib/api";
import { sarvamConfigured, sarvamStt } from "@/lib/sarvam";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return handle(async () => {
    if (!sarvamConfigured()) return fail("Sarvam STT not configured", 503, { fallback: "browser" });
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof Blob) || file.size === 0) return fail("Audio file is required", 400);
    if (file.size > 10 * 1024 * 1024) return fail("Audio too large", 413);
    const name = (file as File).name || "speech.wav";
    return json(await sarvamStt(file, name));
  }, { sync: false });
}

// GET is only used to pre-compile this route in dev so the first real request is fast.
export async function GET() {
  return json({ ok: true });
}
