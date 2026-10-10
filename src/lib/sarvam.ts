import type { LanguageCode, VoiceGender } from "./types";
import { isSpeakerFor, speakerFor } from "./languages";

// Thin client for Sarvam AI REST APIs (https://docs.sarvam.ai).
// The API key never leaves the server.

const BASE = "https://api.sarvam.ai";

export const sarvamKey = () => process.env.SARVAM_API_KEY?.trim() || "";
export const sarvamConfigured = () => sarvamKey().length > 0;
export const ttsModel = () => process.env.SARVAM_TTS_MODEL?.trim() || "bulbul:v3";
export const sttModel = () => process.env.SARVAM_STT_MODEL?.trim() || "saaras:v3";
export const llmModel = () => process.env.SARVAM_LLM_MODEL?.trim() || "sarvam-105b";
export const ttsTemperature = () => {
  const t = Number(process.env.SARVAM_TTS_TEMPERATURE);
  return Number.isFinite(t) && t > 0 && t <= 1 ? t : 0.75;
};

function headers(json = true): Record<string, string> {
  const h: Record<string, string> = { "api-subscription-key": sarvamKey() };
  if (json) h["Content-Type"] = "application/json";
  return h;
}

async function errorText(res: Response) {
  const t = await res.text().catch(() => "");
  return `Sarvam ${res.status}: ${t.slice(0, 300)}`;
}

export async function sarvamTts(text: string, language: LanguageCode, gender: VoiceGender, pace = 1.0, voice?: string): Promise<{ audioBase64: string; mime: string; model: string; speaker: string }> {
  const model = ttsModel();
  const speaker = isSpeakerFor(gender, voice) ? voice : speakerFor(model, gender);
  const res = await fetch(`${BASE}/text-to-speech`, {
    method: "POST",
    headers: headers(),
    // temperature (v3): higher = more expressive, livelier intonation. 0.6 is Sarvam's default.
    body: JSON.stringify({ text: text.slice(0, 2400), target_language_code: language, speaker, model, pace, temperature: ttsTemperature(), speech_sample_rate: 24000, output_audio_codec: "mp3" }),
  });
  if (!res.ok) throw new Error(await errorText(res));
  const data = (await res.json()) as { audios?: string[] };
  if (!data.audios?.length) throw new Error("Sarvam TTS returned no audio");
  return { audioBase64: data.audios.join(""), mime: "audio/mpeg", model, speaker };
}

const STT_MIME: Record<string, string> = { wav: "audio/wav", mp3: "audio/mpeg", webm: "audio/webm", ogg: "audio/ogg", m4a: "audio/mp4", aac: "audio/aac" };

export async function sarvamStt(input: Blob, filename: string): Promise<{ transcript: string; languageCode: string | null; probability: number | null }> {
  // Sarvam rejects MIME types with parameters (e.g. "audio/webm;codecs=opus"): re-wrap with a plain type.
  const ext = filename.split(".").pop()?.toLowerCase() ?? "wav";
  const audio = new Blob([await input.arrayBuffer()], { type: STT_MIME[ext] ?? (input.type.split(";")[0] || "audio/wav") });
  const send = async (model?: string) => {
    const fd = new FormData();
    fd.append("file", audio, filename);
    if (model) fd.append("model", model);
    fd.append("language_code", "unknown");
    // codemix keeps English words in Latin script ("male voice में बोलिए"), which matches how
    // Indian sellers actually talk and keeps signal detection reliable.
    if (model?.startsWith("saaras:v3")) fd.append("mode", "codemix");
    const res = await fetch(`${BASE}/speech-to-text`, { method: "POST", headers: headers(false), body: fd });
    if (!res.ok) throw new Error(await errorText(res));
    return (await res.json()) as { transcript?: string; language_code?: string | null; language_probability?: number | null };
  };
  let data;
  try {
    data = await send(sttModel());
  } catch {
    data = await send(undefined); // provider default model
  }
  return { transcript: data.transcript ?? "", languageCode: data.language_code ?? null, probability: data.language_probability ?? null };
}

export async function sarvamTranslate(input: string, source: LanguageCode | "auto", target: LanguageCode, gender: VoiceGender): Promise<string> {
  if (source === target) return input;
  const res = await fetch(`${BASE}/translate`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      input: input.slice(0, 990),
      source_language_code: source,
      target_language_code: target,
      model: "mayura:v1",
      mode: "modern-colloquial",
      speaker_gender: gender === "male" ? "Male" : "Female",
    }),
  });
  if (!res.ok) throw new Error(await errorText(res));
  const data = (await res.json()) as { translated_text?: string };
  return data.translated_text ?? input;
}

export interface ChatMessage { role: "system" | "user" | "assistant"; content: string }

export async function sarvamChat(messages: ChatMessage[], maxTokens = 400, temperature = 0.4, json = false): Promise<string> {
  try {
    return await sarvamChatOnce(messages, maxTokens, temperature, json);
  } catch (e) {
    const msg = (e as Error).message;
    if (json && /response_format/i.test(msg)) return sarvamChatOnce(messages, maxTokens, temperature, false);
    if (!/no text/.test(msg)) throw e;
    return await sarvamChatOnce(messages, maxTokens * 2, temperature, json); // one retry with a bigger budget
  }
}

async function sarvamChatOnce(messages: ChatMessage[], maxTokens: number, temperature: number, json: boolean): Promise<string> {
  // Reasoning is OFF by default: hidden reasoning can consume the whole token budget
  // (finish_reason=length, empty content) and adds seconds of latency mid-call.
  const effort = process.env.SARVAM_LLM_REASONING?.trim().toLowerCase();
  const body: Record<string, unknown> = {
    model: llmModel(), messages, temperature, max_tokens: maxTokens,
    reasoning_effort: effort && effort !== "off" ? effort : null,
  };
  if (json) body.response_format = { type: "json_object" };
  const res = await fetch(`${BASE}/v1/chat/completions`, {
    method: "POST",
    headers: { ...headers(), Authorization: `Bearer ${sarvamKey()}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await errorText(res));
  const data = (await res.json()) as { choices?: { finish_reason?: string; message?: { content?: string | null; reasoning_content?: string | null } }[] };
  const choice = data.choices?.[0];
  const text = (choice?.message?.content ?? "").replace(/<think>[\s\S]*?<\/think>/g, "").trim();
  if (!text) throw new Error(`LLM returned no text (finish_reason=${choice?.finish_reason}, reasoning chars=${choice?.message?.reasoning_content?.length ?? 0})`);
  return text;
}

/** Lightweight connectivity probe used by the Configuration page. */
export async function sarvamProbe(): Promise<{ ok: boolean; detail: string }> {
  if (!sarvamConfigured()) return { ok: false, detail: "SARVAM_API_KEY not set — running in Simulated / browser-speech mode." };
  try {
    await sarvamTranslate("Hello", "en-IN", "hi-IN", "female");
    return { ok: true, detail: "Connected (translate probe succeeded)." };
  } catch (e) {
    return { ok: false, detail: (e as Error).message };
  }
}
