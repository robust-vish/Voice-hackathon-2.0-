import { handle, json } from "@/lib/api";
import { LANGUAGES } from "@/lib/languages";
import { llmModel, sarvamConfigured, sarvamProbe, sttModel, ttsModel } from "@/lib/sarvam";
import { DATA_DIR } from "@/lib/store";
import { allProviders } from "@/lib/telephony";
import { PROFILE_SCHEMA_VERSION } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return handle(async () => {
    const probe = new URL(req.url).searchParams.get("probe") === "1";
    const sarvam = probe ? await sarvamProbe() : { ok: sarvamConfigured(), detail: sarvamConfigured() ? "API key present (not probed)." : "SARVAM_API_KEY not set." };
    return json({
      voiceProvider: { name: "Sarvam AI", configured: sarvamConfigured(), status: sarvam, ttsModel: ttsModel(), sttModel: sttModel() },
      llm: { name: "Sarvam chat completions", configured: sarvamConfigured() && process.env.DISABLE_LLM !== "1", model: llmModel(), fallback: "Deterministic plan-driven templates (English/Hindi, translated via Sarvam when available)" },
      callModes: allProviders(),
      storage: { provider: "Local filesystem (JSON + Markdown per seller)", path: DATA_DIR.replace(process.cwd(), ".") },
      demoMode: true,
      supportedLanguages: LANGUAGES.map((l) => ({ code: l.code, name: l.name, native: l.native })),
      profileSchemaVersion: PROFILE_SCHEMA_VERSION,
    });
  });
}
