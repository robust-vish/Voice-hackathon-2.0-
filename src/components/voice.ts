"use client";

// Browser-side voice I/O for the Web Voice Call.
//  - Speaking: Sarvam Bulbul TTS (via /api/tts), synthesised sentence-by-sentence and
//    played as a gap-less queue so the agent starts talking ~0.5 s after a reply arrives.
//    Falls back to the browser's speechSynthesis when Sarvam isn't configured.
//  - Listening: one always-open mic pipeline with voice-activity detection. Each
//    utterance is captured with a short pre-roll, encoded as 16 kHz mono WAV (a format
//    Sarvam STT always accepts) and handed to the caller. Supports barge-in.

import type { LanguageCode, VoiceGender } from "@/lib/types";

export type Engine = "sarvam" | "browser";

// ======================= Speaking =======================
// Sarvam audio is decoded and scheduled on one Web Audio clock, so sentences play
// back-to-back with no gaps; leading/trailing silence of each clip is trimmed.

export interface Speech {
  done: Promise<{ engine: Engine; detail: string; interrupted: boolean }>;
  cancel: () => void;
}

let active: { cancel: () => void } | null = null;
let playCtx: AudioContext | null = null;
let scheduled: AudioBufferSourceNode[] = [];
let playheadEnd = 0; // AudioContext time when everything scheduled so far finishes

function ctx(): AudioContext {
  if (!playCtx || playCtx.state === "closed") playCtx = new AudioContext();
  if (playCtx.state === "suspended") void playCtx.resume();
  return playCtx;
}

/** Call from a click handler so the browser allows audio playback. */
export function unlockAudio() {
  ctx();
}

function stopScheduled() {
  for (const s of scheduled) { try { s.stop(); } catch { /* already stopped */ } }
  scheduled = [];
  playheadEnd = 0;
}

export function stopSpeaking() {
  active?.cancel();
  active = null;
  stopScheduled();
  if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
}

/** Splits text into speakable chunks: a short first chunk (fast start), then larger ones. */
export function splitSentences(text: string): string[] {
  const parts = (text.replace(/\s+/g, " ").trim().match(/[^.!?।॥\n]+[.!?।॥]*\s*/g) ?? [text]).map((x) => x.trim()).filter(Boolean);
  const out: string[] = [];
  for (const p of parts) {
    const prev = out[out.length - 1];
    const limit = out.length <= 1 ? 120 : 320; // keep the first chunk short so audio starts quickly
    if (prev && (prev.length < 20 || p.length < 12 || (out.length > 1 && prev.length + p.length < limit))) out[out.length - 1] = `${prev} ${p}`;
    else out.push(p);
  }
  return out.flatMap((s) => (s.length <= 450 ? [s] : s.match(/.{1,450}(\s|$)/g) ?? [s]));
}

async function fetchTts(text: string, lang: LanguageCode, gender: VoiceGender, pace: number, signal?: AbortSignal) {
  const res = await fetch("/api/tts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, language: lang, gender, pace }), signal });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `TTS ${res.status}`);
  return data as { audioBase64: string; mime: string; speaker: string; model: string };
}

async function decode(b64: string): Promise<AudioBuffer> {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return trimSilence(await ctx().decodeAudioData(bytes.buffer));
}

/** Removes leading/trailing silence (keeps a short natural pause). */
function trimSilence(buf: AudioBuffer, lead = 0.04, tail = 0.12): AudioBuffer {
  const d = buf.getChannelData(0);
  const th = 0.01;
  let s = 0;
  let e = d.length - 1;
  while (s < e && Math.abs(d[s]) < th) s++;
  while (e > s && Math.abs(d[e]) < th) e--;
  s = Math.max(0, s - Math.floor(lead * buf.sampleRate));
  e = Math.min(d.length - 1, e + Math.floor(tail * buf.sampleRate));
  if (e - s < buf.sampleRate * 0.05 || (s === 0 && e === d.length - 1)) return buf;
  const out = ctx().createBuffer(buf.numberOfChannels, e - s + 1, buf.sampleRate);
  for (let c = 0; c < buf.numberOfChannels; c++) out.copyToChannel(buf.getChannelData(c).subarray(s, e + 1), c);
  return out;
}

/** Schedules a buffer right after whatever is already queued; resolves when it finishes. */
function schedule(buf: AudioBuffer, isCancelled: () => boolean): Promise<void> {
  return new Promise((resolve) => {
    if (isCancelled()) return resolve();
    const c = ctx();
    const src = c.createBufferSource();
    src.buffer = buf;
    src.connect(c.destination);
    const at = Math.max(c.currentTime + 0.01, playheadEnd);
    src.start(at);
    playheadEnd = at + buf.duration;
    scheduled.push(src);
    src.onended = () => { scheduled = scheduled.filter((x) => x !== src); resolve(); };
  });
}

// ---- Natural acknowledgement fillers ("जी…", "अच्छा…") played while the agent thinks ----

const FILLER_WORDS: Record<LanguageCode, string[]> = {
  "hi-IN": ["जी।", "अच्छा।", "हाँ जी।"],
  "en-IN": ["Okay.", "Right.", "Mm, okay."],
  "bn-IN": ["আচ্ছা।", "হ্যাঁ।"],
  "ta-IN": ["சரி.", "ஆமா."],
  "te-IN": ["సరే.", "అలాగే."],
  "gu-IN": ["હા.", "અચ્છા."],
  "kn-IN": ["ಸರಿ.", "ಹೌದು."],
  "ml-IN": ["ശരി.", "ആ, ശരി."],
  "mr-IN": ["हो.", "बरं."],
  "pa-IN": ["ਜੀ।", "ਅੱਛਾ।"],
  "od-IN": ["ହଁ।", "ଆଚ୍ଛା।"],
};
const fillerCache = new Map<string, Promise<AudioBuffer[]>>();

/** Pre-synthesises filler clips for a language/voice so they can play instantly. */
export function prefetchFillers(lang: LanguageCode, gender: VoiceGender, pace: number) {
  const key = `${lang}|${gender}`;
  if (fillerCache.has(key)) return;
  const p = Promise.all(FILLER_WORDS[lang].map(async (w) => decode((await fetchTts(w, lang, gender, pace)).audioBase64))).catch(() => []);
  fillerCache.set(key, p);
}

let fillerTurn = 0;
/** Plays a short acknowledgement if one is ready. Returns true if it played. */
export async function playFiller(lang: LanguageCode, gender: VoiceGender): Promise<boolean> {
  const clips = await fillerCache.get(`${lang}|${gender}`);
  if (!clips?.length) return false;
  void schedule(clips[fillerTurn++ % clips.length], () => false);
  return true;
}

// ---- Browser speech fallback ----

const FEMALE_HINTS = /female|woman|heera|kalpana|swara|neerja|lekha|veena|priya|aditi|raveena|zira|samantha/i;
const MALE_HINTS = /\bmale|\bman\b|hemant|ravi|madhur|prabhat|rishi|david|mark/i;

function pickBrowserVoice(lang: string, gender: VoiceGender): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  const base = lang.split("-")[0];
  const matches = voices.filter((v) => v.lang.replace("_", "-").toLowerCase().startsWith(base));
  const pool = matches.length ? matches : voices.filter((v) => v.lang.toLowerCase().startsWith("en-in"));
  const gendered = pool.find((v) => (gender === "male" ? MALE_HINTS.test(v.name) && !/female/i.test(v.name) : FEMALE_HINTS.test(v.name)));
  return gendered ?? pool[0] ?? null;
}

function speakBrowser(text: string, lang: LanguageCode, gender: VoiceGender, pace: number): Speech {
  let cancelled = false;
  const done = new Promise<{ engine: Engine; detail: string; interrupted: boolean }>((resolve) => {
    if (!("speechSynthesis" in window)) return resolve({ engine: "browser", detail: "speechSynthesis unavailable", interrupted: false });
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    const v = pickBrowserVoice(lang, gender);
    if (v) u.voice = v;
    u.pitch = gender === "male" ? 0.7 : 1.15; // keep gender audible if the OS has one voice
    u.rate = pace;
    u.onend = () => resolve({ engine: "browser", detail: v ? v.name : "default voice", interrupted: cancelled });
    u.onerror = () => resolve({ engine: "browser", detail: "speech error", interrupted: cancelled });
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  });
  return { done, cancel: () => { cancelled = true; window.speechSynthesis.cancel(); } };
}

/**
 * Speaks text. With Sarvam: every chunk is synthesised in parallel, decoded, and scheduled
 * gap-lessly in order. A filler that is still playing is allowed to finish first.
 */
export function speak(text: string, lang: LanguageCode, gender: VoiceGender, pace: number, engine: Engine): Speech {
  active?.cancel();
  active = null;
  if (engine === "browser") {
    stopScheduled();
    const s = speakBrowser(text, lang, gender, pace);
    active = s;
    return s;
  }
  const ctrl = new AbortController();
  let cancelled = false;
  const cancel = () => { cancelled = true; ctrl.abort(); stopScheduled(); };
  active = { cancel };

  const done = (async () => {
    const chunks = splitSentences(text);
    // Start synthesis of every chunk now (max 3 in flight); decode as they arrive.
    let inFlight = 0;
    const queue: (() => void)[] = [];
    const limit = <T,>(fn: () => Promise<T>) => new Promise<T>((resolve, reject) => {
      const run = () => { inFlight++; fn().then(resolve, reject).finally(() => { inFlight--; queue.shift()?.(); }); };
      if (inFlight < 3) run(); else queue.push(run);
    });
    let detail = "";
    const jobs = chunks.map((s) => limit(async () => {
      const a = await fetchTts(s, lang, gender, pace, ctrl.signal);
      detail = `${a.model} · ${a.speaker}`;
      return decode(a.audioBase64);
    }));
    try {
      let last: Promise<void> = Promise.resolve();
      for (const job of jobs) {
        const buf = await job;
        if (cancelled) break;
        last = schedule(buf, () => cancelled);
      }
      await last;
      return { engine: "sarvam" as Engine, detail, interrupted: cancelled };
    } catch (e) {
      if (cancelled) return { engine: "sarvam" as Engine, detail, interrupted: true };
      // Sarvam failed mid-way: say the text with the browser voice instead of going silent.
      stopScheduled();
      const fb = speakBrowser(text, lang, gender, pace);
      active = fb;
      const r = await fb.done;
      return { ...r, detail: `Sarvam TTS failed (${(e as Error).message}); browser voice used` };
    }
  })();
  return { done, cancel };
}

// ======================= Listening =======================

export interface MicCallbacks {
  onUtterance: (wav: Blob, durationMs: number) => void;
  onLevel?: (level: number, speaking: boolean) => void;
  onBargeIn?: () => void;
}

const TARGET_RATE = 16000;

function encodeWav(chunks: Float32Array[], inRate: number): Blob {
  let length = 0;
  for (const c of chunks) length += c.length;
  const input = new Float32Array(length);
  let off = 0;
  for (const c of chunks) { input.set(c, off); off += c.length; }
  // downsample (box filter) to 16 kHz
  const ratio = inRate / TARGET_RATE;
  const outLen = Math.floor(input.length / ratio);
  const pcm = new Int16Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const start = Math.floor(i * ratio);
    const end = Math.min(input.length, Math.floor((i + 1) * ratio));
    let sum = 0;
    for (let j = start; j < end; j++) sum += input[j];
    const v = Math.max(-1, Math.min(1, sum / Math.max(1, end - start)));
    pcm[i] = v < 0 ? v * 0x8000 : v * 0x7fff;
  }
  const buf = new ArrayBuffer(44 + pcm.length * 2);
  const dv = new DataView(buf);
  const w = (o: number, s: string) => { for (let i = 0; i < s.length; i++) dv.setUint8(o + i, s.charCodeAt(i)); };
  w(0, "RIFF"); dv.setUint32(4, 36 + pcm.length * 2, true); w(8, "WAVE"); w(12, "fmt ");
  dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
  dv.setUint32(24, TARGET_RATE, true); dv.setUint32(28, TARGET_RATE * 2, true);
  dv.setUint16(32, 2, true); dv.setUint16(34, 16, true); w(36, "data"); dv.setUint32(40, pcm.length * 2, true);
  new Int16Array(buf, 44).set(pcm);
  return new Blob([buf], { type: "audio/wav" });
}

/**
 * Always-open microphone with voice-activity detection.
 *  arm()    -> the next utterance (speech followed by `silenceMs` of quiet) is emitted
 *  disarm() -> ignore speech (while the agent is thinking)
 *  bargeIn  -> while disarmed and the agent is speaking, loud sustained speech fires onBargeIn
 */
export class MicSession {
  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private node: ScriptProcessorNode | null = null;
  private src: MediaStreamAudioSourceNode | null = null;
  private armed = false;
  private inSpeech = false;
  private speechFrames = 0;
  private loudFrames = 0;
  private lastVoice = 0;
  private speechStart = 0;
  private chunks: Float32Array[] = [];
  private preRoll: Float32Array[] = [];
  private noiseFloor = 0.004;
  agentSpeaking = false;
  bargeIn = true;
  silenceMs = 750;

  constructor(private cb: MicCallbacks) {}

  async open() {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 } });
    this.ctx = new AudioContext();
    if (this.ctx.state === "suspended") await this.ctx.resume();
    this.src = this.ctx.createMediaStreamSource(this.stream);
    this.node = this.ctx.createScriptProcessor(2048, 1, 1);
    const frameMs = (2048 / this.ctx.sampleRate) * 1000;
    const preRollFrames = Math.ceil(400 / frameMs);
    this.node.onaudioprocess = (e) => {
      const data = new Float32Array(e.inputBuffer.getChannelData(0));
      let sum = 0;
      for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
      const rms = Math.sqrt(sum / data.length);
      const now = performance.now();
      const threshold = Math.max(0.012, this.noiseFloor * 3);
      const speaking = rms > threshold;
      if (!speaking && !this.inSpeech) this.noiseFloor = this.noiseFloor * 0.97 + rms * 0.03;
      this.cb.onLevel?.(Math.min(1, rms * 10), speaking);

      // Barge-in: seller talks over the agent (needs clearly louder, sustained speech).
      if (this.agentSpeaking && !this.armed) {
        this.loudFrames = rms > Math.max(0.04, this.noiseFloor * 6) ? this.loudFrames + 1 : 0;
        if (this.bargeIn && this.loudFrames * frameMs > 280) { this.loudFrames = 0; this.cb.onBargeIn?.(); }
      }

      this.preRoll.push(data);
      if (this.preRoll.length > preRollFrames) this.preRoll.shift();
      if (!this.armed) return;

      if (!this.inSpeech) {
        this.speechFrames = speaking ? this.speechFrames + 1 : 0;
        if (this.speechFrames * frameMs >= 90) {
          this.inSpeech = true;
          this.speechStart = now;
          this.lastVoice = now;
          this.chunks = [...this.preRoll];
        }
        return;
      }
      this.chunks.push(data);
      if (speaking) this.lastVoice = now;
      const dur = now - this.speechStart;
      if (now - this.lastVoice > this.silenceMs || dur > 30000) this.flush(dur);
    };
    this.src.connect(this.node);
    this.node.connect(this.ctx.destination); // required for onaudioprocess to fire; outputs silence
  }

  private flush(dur: number) {
    const chunks = this.chunks;
    this.chunks = [];
    this.inSpeech = false;
    this.speechFrames = 0;
    if (dur < 350 || !this.ctx) return; // ignore clicks / coughs
    this.armed = false;
    this.cb.onUtterance(encodeWav(chunks, this.ctx.sampleRate), dur);
  }

  /** Force-finish the current utterance (e.g. "Done speaking" button). */
  finishNow() {
    if (this.inSpeech) this.flush(performance.now() - this.speechStart);
  }

  arm(includePreRoll = false) {
    this.armed = true;
    this.inSpeech = includePreRoll;
    this.speechFrames = 0;
    if (includePreRoll) { this.speechStart = performance.now(); this.lastVoice = performance.now(); this.chunks = [...this.preRoll]; }
  }

  disarm() {
    this.armed = false;
    this.inSpeech = false;
    this.chunks = [];
  }

  get isArmed() { return this.armed; }
  get isCapturing() { return this.inSpeech; }

  close() {
    this.disarm();
    this.node?.disconnect();
    this.src?.disconnect();
    this.stream?.getTracks().forEach((t) => t.stop());
    this.ctx?.close().catch(() => {});
    this.node = null; this.src = null; this.stream = null; this.ctx = null;
  }
}

// ---------- Browser SpeechRecognition fallback (no Sarvam key) ----------

export function browserRecognitionAvailable(): boolean {
  return typeof window !== "undefined" && !!((window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition || (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition);
}

interface SpeechRecognitionLike {
  lang: string; interimResults: boolean; maxAlternatives: number;
  onresult: (e: { results: { [i: number]: { [j: number]: { transcript: string } } } }) => void;
  onerror: (e: { error: string }) => void;
  onend: () => void;
  start: () => void; stop: () => void; abort: () => void;
}

export function browserListen(lang: LanguageCode, onResult: (text: string | null, error?: string) => void): { stop: () => void; cancel: () => void } {
  const W = window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike };
  const Ctor = W.SpeechRecognition ?? W.webkitSpeechRecognition;
  if (!Ctor) { onResult(null, "Speech recognition is not available in this browser — type the seller's reply instead."); return { stop() {}, cancel() {} }; }
  const rec = new Ctor();
  rec.lang = lang;
  rec.interimResults = false;
  rec.maxAlternatives = 1;
  let done = false;
  let cancelled = false;
  rec.onresult = (e) => { if (done || cancelled) return; done = true; onResult(e.results[0]?.[0]?.transcript || null); };
  rec.onerror = (e) => { if (!done && !cancelled) { done = true; onResult(null, e.error === "no-speech" ? undefined : `Recognition error: ${e.error}`); } };
  rec.onend = () => { if (!done && !cancelled) { done = true; onResult(null); } };
  rec.start();
  return { stop: () => rec.stop(), cancel: () => { cancelled = true; rec.abort(); } };
}
