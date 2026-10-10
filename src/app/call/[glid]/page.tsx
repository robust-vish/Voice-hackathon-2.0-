"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import {
  AlertTriangle, ArrowRight, Bot, CheckCircle2, CircleDashed, Headphones, Loader2, Mic, MicOff, Phone, PhoneOff,
  Play, RotateCcw, Send, SkipForward, User, Volume2, VolumeX, XCircle,
} from "lucide-react";
import { PersonaGrid } from "@/components/PersonaGrid";
import { Badge, Button, Card, Empty, ErrorBox, LinkButton, ModeBadge, Spinner, StatusBadge } from "@/components/ui";
import { useSeller } from "@/components/useSeller";
import { browserListen, browserRecognitionAvailable, MicSession, playFiller, prefetchFillers, speak, stopSpeaking, unlockAudio, type Engine, type Speech } from "@/components/voice";
import { api, ApiError, fmtDuration, fmtTime } from "@/lib/client";
import { languageName } from "@/lib/languages";
import type { AgentReply, CallMode, Interaction, PrecallCheck, Signal } from "@/lib/types";

type Reply = AgentReply & { ttsPace: number };
interface TurnResp { interaction: Interaction; reply: Reply; signals?: Signal[]; scenario?: { cursor: number; total: number } }
interface ConfigResp { voiceProvider: { configured: boolean }; callModes: { mode: CallMode; available: boolean; detail: string; label: string }[] }

const LIVE = ["Connected", "In Progress"];

type Phase = "idle" | "listening" | "hearing" | "transcribing" | "thinking" | "speaking";

const PHASE_LABEL: Record<Phase, string> = {
  idle: "Mic paused",
  listening: "Listening — go ahead and speak",
  hearing: "Hearing you…",
  transcribing: "Transcribing…",
  thinking: "Agent is thinking…",
  speaking: "Agent speaking — talk to interrupt",
};

function CheckIcon({ s }: { s: PrecallCheck["status"] }) {
  if (s === "ok") return <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-label="ok" />;
  if (s === "warn") return <AlertTriangle className="h-4 w-4 text-amber-600" aria-label="warning" />;
  return <XCircle className="h-4 w-4 text-brand-600" aria-label="failed" />;
}

export default function CallPage({ params }: { params: Promise<{ glid: string }> }) {
  const { glid: rawGlid } = use(params);
  const { data: seller, error: sellerErr, loading: sellerLoading, reload: reloadSeller } = useSeller(rawGlid);
  const [config, setConfig] = useState<ConfigResp | null>(null);
  const [mode, setMode] = useState<CallMode>("web");
  const [interaction, setInteraction] = useState<Interaction | null>(null);
  const [checks, setChecks] = useState<PrecallCheck[] | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhaseState] = useState<Phase>("idle");
  const [level, setLevel] = useState(0);
  const [autoListen, setAutoListen] = useState(true);
  const [bargeIn, setBargeIn] = useState(true);
  const [fillers, setFillers] = useState(true);
  const [liveSeller, setLiveSeller] = useState<string | null>(null);
  const [playAudio, setPlayAudio] = useState(true);
  const [simAuto, setSimAuto] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [typed, setTyped] = useState("");
  const [voiceInfo, setVoiceInfo] = useState<string>("");
  const [scenario, setScenario] = useState<{ cursor: number; total: number } | null>(null);

  const iRef = useRef<Interaction | null>(null);
  const busyRef = useRef(false);
  const micRef = useRef<MicSession | null>(null);
  const speechRef = useRef<Speech | null>(null);
  const browserRecRef = useRef<{ stop: () => void; cancel: () => void } | null>(null);
  const phaseRef = useRef<Phase>("idle");
  const levelRef = useRef(0);
  const transcriptBox = useRef<HTMLDivElement>(null);
  const transcriptCard = useRef<HTMLDivElement>(null);
  const fillersRef = useRef(fillers);
  fillersRef.current = fillers;
  const engine: Engine = config?.voiceProvider.configured ? "sarvam" : "browser";
  const speaking = phase === "speaking";
  const setPhase = (p: Phase) => { phaseRef.current = p; setPhaseState(p); };

  useEffect(() => { iRef.current = interaction; }, [interaction]);
  useEffect(() => { api<ConfigResp>("/api/config").then(setConfig).catch(() => setConfig(null)); }, []);
  // Keep the newest message in view: scroll the transcript box (not the page) to the bottom.
  useEffect(() => {
    const el = transcriptBox.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [interaction?.turns.length, liveSeller, phase]);
  // When the call goes live, bring the transcript to the front of the screen.
  const liveNow = interaction?.status === "In Progress";
  useEffect(() => {
    if (liveNow) transcriptCard.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [liveNow]);
  useEffect(() => { if (micRef.current) micRef.current.bargeIn = bargeIn; }, [bargeIn]);
  // Pre-compile the voice routes (dev mode) so the first real turn isn't slowed by compilation.
  useEffect(() => { for (const u of ["/api/stt", "/api/tts", "/api/calls/WARMUP/turn"]) fetch(u).catch(() => {}); }, []);
  useEffect(() => () => releaseVoice(), []); // eslint-disable-line react-hooks/exhaustive-deps

  // Resume an active interaction for this GLID if one exists.
  useEffect(() => {
    if (seller?.activeInteraction && !interaction) {
      api<{ interaction: Interaction }>(`/api/calls/${seller.activeInteraction.id}`).then((r) => {
        setInteraction(r.interaction);
        setChecks(r.interaction.checks);
        setMode(r.interaction.mode);
      }).catch(() => {});
    }
  }, [seller?.activeInteraction]); // eslint-disable-line react-hooks/exhaustive-deps

  const isLive = !!interaction && LIVE.includes(interaction.status);
  const ended = !!interaction && ["Completed", "Cancelled", "Failed"].includes(interaction.status);

  // ---------------- voice pipeline ----------------
  // web call loop:  agent speaks -> mic armed (listening) -> seller speaks (hearing) -> pause
  //   -> WAV -> Sarvam STT (transcribing) -> /turn (thinking) -> agent speaks …  Seller can barge in.

  function releaseVoice() {
    browserRecRef.current?.cancel();
    browserRecRef.current = null;
    micRef.current?.close();
    micRef.current = null;
    speechRef.current?.cancel();
    speechRef.current = null;
    stopSpeaking();
    setLevel(0);
  }

  const listenNext = useCallback(() => {
    const cur = iRef.current;
    if (!cur || cur.mode !== "web" || !LIVE.includes(cur.status)) return setPhase("idle");
    if (micRef.current) {
      micRef.current.arm();
      setPhase("listening");
      return;
    }
    if (engine === "browser" && !browserRecRef.current) {
      setPhase("listening");
      browserRecRef.current = browserListen(cur.currentPersona.language.value, (text, err) => {
        browserRecRef.current = null;
        if (err) setError(err);
        if (text) void sendRef.current(text);
        else setPhase("idle");
      });
    }
  }, [engine]); // eslint-disable-line react-hooks/exhaustive-deps

  const finish = useCallback(async (reason: "operator" | "agent") => {
    const cur = iRef.current;
    if (!cur) return;
    releaseVoice();
    setPhase("idle");
    setConfirmEnd(false);
    setSimAuto(false);
    setPending("Ending call & updating profile…");
    try {
      const r = await api<{ interaction: Interaction }>(`/api/calls/${cur.id}/end`, { method: "POST", json: { reason } });
      iRef.current = r.interaction;
      setInteraction(r.interaction);
      reloadSeller();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending(null);
    }
  }, [reloadSeller]); // eslint-disable-line react-hooks/exhaustive-deps

  const deliver = useCallback(async (r: TurnResp) => {
    iRef.current = r.interaction;
    setInteraction(r.interaction);
    setLiveSeller(null);
    if (r.scenario) setScenario(r.scenario);
    if (engine === "sarvam" && r.interaction.mode === "web") prefetchFillers(r.reply.language, r.reply.voice.gender, r.reply.ttsPace);
    let interrupted = false;
    if (r.interaction.mode === "web" || playAudio) {
      setPhase("speaking");
      const mic = micRef.current;
      if (mic) { mic.disarm(); mic.agentSpeaking = true; }
      const s = speak(r.reply.text, r.reply.language, r.reply.voice.gender, r.reply.ttsPace, engine);
      speechRef.current = s;
      const v = await s.done;
      if (speechRef.current === s) speechRef.current = null;
      if (mic) mic.agentSpeaking = false;
      interrupted = v.interrupted;
      setVoiceInfo(`${v.engine === "sarvam" ? "Sarvam" : "Browser"} · ${languageName(r.reply.language)} · ${r.reply.voice.gender} · ${v.detail}`);
    }
    if (interrupted) return; // barge-in / end call already took over
    if (r.reply.endCall) return finish("agent");
    if (r.interaction.mode === "web" && autoRef.current) listenNext();
    else setPhase("idle");
  }, [engine, playAudio, finish, listenNext]);

  const sendSeller = useCallback(async (text: string, stt?: { languageCode?: string | null; probability?: number | null; fillerSpoken?: boolean }) => {
    const cur = iRef.current;
    if (!cur || busyRef.current) return;
    busyRef.current = true;
    micRef.current?.disarm();
    setLiveSeller(text); // show what the seller said immediately
    setPhase("thinking");
    setError(null);
    try {
      const r = await api<TurnResp>(`/api/calls/${cur.id}/turn`, { method: "POST", json: { text, ...stt } });
      busyRef.current = false;
      await deliver(r);
    } catch (e) {
      setError((e as Error).message);
      setLiveSeller(null);
      busyRef.current = false;
      listenNext(); // keep the conversation going
    } finally {
      busyRef.current = false;
    }
  }, [deliver, listenNext]);

  const handleUtterance = async (wav: Blob) => {
    setPhase("transcribing");
    setLiveSeller("…");
    const cur = iRef.current;
    // A quick, natural "जी…" right away so there is no dead air while we transcribe + think.
    const fillerPromise = fillersRef.current && cur && engine === "sarvam"
      ? playFiller(cur.currentPersona.language.value, cur.currentPersona.voiceGender.value)
      : Promise.resolve(false);
    try {
      const fd = new FormData();
      fd.append("file", wav, "speech.wav");
      const res = await fetch("/api/stt", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `STT ${res.status}`);
      const text = (data.transcript ?? "").trim();
      if (!text) { setLiveSeller(null); return listenRef.current(); } // silence / noise: keep listening
      await sendRef.current(text, { languageCode: data.languageCode, probability: data.probability, fillerSpoken: await fillerPromise });
    } catch (e) {
      setError(`Transcription failed: ${(e as Error).message}`);
      setLiveSeller(null);
      listenRef.current();
    }
  };

  const interruptAgent = () => {
    speechRef.current?.cancel();
    stopSpeaking();
    const mic = micRef.current;
    if (mic) { mic.agentSpeaking = false; mic.arm(true); setPhase("hearing"); }
    else listenNext();
  };

  const simulateStep = useCallback(async () => {
    const cur = iRef.current;
    if (!cur || busyRef.current || !LIVE.includes(cur.status)) return;
    busyRef.current = true;
    setPending("Simulated seller is replying…");
    setError(null);
    try {
      const r = await api<TurnResp>(`/api/calls/${cur.id}/simulate`, { method: "POST" });
      setPending(null);
      busyRef.current = false;
      await deliver(r);
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) await finish("operator");
      else setError((e as Error).message);
    } finally {
      busyRef.current = false;
      setPending(null);
    }
  }, [deliver, finish]);

  // Mic callbacks are bound once; route them through refs to always hit the latest closures.
  const sendRef = useRef(sendSeller);
  sendRef.current = sendSeller;
  const listenRef = useRef(listenNext);
  listenRef.current = listenNext;
  const utterRef = useRef(handleUtterance);
  utterRef.current = handleUtterance;
  const bargeRef = useRef(interruptAgent);
  bargeRef.current = interruptAgent;
  const autoRef = useRef(autoListen);
  autoRef.current = autoListen;

  // Auto-run the simulated scenario.
  useEffect(() => {
    if (!simAuto || !isLive || interaction?.mode !== "simulated" || pending || speaking) return;
    const t = setTimeout(() => void simulateStep(), 900);
    return () => clearTimeout(t);
  }, [simAuto, isLive, interaction?.mode, interaction?.turns.length, pending, speaking, simulateStep]);

  const prepare = async () => {
    if (busyRef.current || !seller) return;
    busyRef.current = true;
    setError(null);
    setScenario(null);
    setInteraction(null);
    setChecks(null);
    setPending("Running pre-call checks…");
    try {
      const r = await api<{ interaction: Interaction; checks: PrecallCheck[] }>("/api/calls", { method: "POST", json: { glid: seller.glid, mode } });
      setChecks(r.checks);
      setInteraction(r.interaction);
    } catch (e) {
      const err = e as ApiError;
      setChecks((err.body?.checks as PrecallCheck[]) ?? null);
      if (err.status === 409 && err.body?.existing) {
        const r = await api<{ interaction: Interaction }>(`/api/calls/${err.body.existing}`);
        setInteraction(r.interaction);
        setChecks(r.interaction.checks);
        setMode(r.interaction.mode);
        setError("An active call already exists for this seller — resumed it instead of starting a duplicate.");
      } else setError(err.message);
    } finally {
      busyRef.current = false;
      setPending(null);
    }
  };

  const openMic = async () => {
    if (micRef.current) return true;
    const mic = new MicSession({
      onUtterance: (wav) => void utterRef.current(wav),
      onLevel: (l) => {
        if (Math.abs(l - levelRef.current) > 0.04) { levelRef.current = l; setLevel(l); }
        if (micRef.current?.isCapturing && phaseRef.current === "listening") setPhase("hearing");
      },
      onBargeIn: () => bargeRef.current(),
    });
    try {
      await mic.open();
      mic.bargeIn = bargeIn;
      micRef.current = mic;
      return true;
    } catch (e) {
      setError(`Microphone unavailable (${(e as Error).message}). Allow mic access in the address bar, or type the seller's replies below.`);
      return false;
    }
  };

  const start = async () => {
    const cur = iRef.current;
    if (!cur || busyRef.current) return;
    unlockAudio(); // inside the click, so the browser allows the agent's audio
    busyRef.current = true;
    setPending("Connecting…");
    if (engine === "sarvam") prefetchFillers(cur.currentPersona.language.value, cur.currentPersona.voiceGender.value, 1.15);
    if (cur.mode === "web") {
      if (engine === "sarvam") await openMic();
      else if (!browserRecognitionAvailable()) setError("This browser has no speech recognition — type the seller's replies in the box below (Chrome or Edge recommended).");
    }
    try {
      const r = await api<TurnResp>(`/api/calls/${cur.id}/start`, { method: "POST" });
      setPending(null);
      busyRef.current = false;
      await deliver(r);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      busyRef.current = false;
      setPending(null);
    }
  };

  const retryPostCall = async () => {
    const cur = iRef.current;
    if (!cur) return;
    setPending("Retrying post-call processing…");
    try {
      const r = await api<{ interaction: Interaction }>(`/api/calls/${cur.id}/postprocess`, { method: "POST" });
      setInteraction(r.interaction);
      reloadSeller();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending(null);
    }
  };

  const submitTyped = (e: FormEvent) => {
    e.preventDefault();
    const t = typed.trim();
    if (!t) return;
    browserRecRef.current?.cancel();
    browserRecRef.current = null;
    speechRef.current?.cancel();
    setTyped("");
    void sendSeller(t);
  };

  // ---------------- render ----------------

  if (sellerLoading && !seller) return <Spinner label="Validating GLID and fetching the latest profile…" />;
  if (sellerErr) return (
    <div className="space-y-3">
      <LinkButton href="/search" variant="ghost">← Back to search</LinkButton>
      <ErrorBox message={sellerErr.status === 404 ? `Cannot call: no seller with GLID ${rawGlid.toUpperCase()} exists.` : sellerErr.message} onRetry={reloadSeller} />
    </div>
  );
  if (!seller) return null;
  const p = seller.profile;
  const persona = interaction?.currentPersona ?? seller.persona;
  const plan = interaction?.plan ?? seller.plan;
  const pstn = config?.callModes.find((m) => m.mode === "pstn");
  const summary = interaction?.postCall.summary;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4">
        <div className="min-w-0">
          <Link href={`/sellers/${p.glid}`} className="text-xs text-gray-500 hover:underline">← {p.displayName}</Link>
          <h1 className="flex flex-wrap items-center gap-2 text-xl font-bold"><Phone className="h-5 w-5 text-brand-600" aria-hidden />Call Seller</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-700">
            <span className="font-mono font-semibold">{p.glid}</span>
            <span>· {p.displayName} · {p.category}</span>
            <Badge tone={p.contact.pnsMapped ? "green" : "amber"}>PNS {p.contact.pnsMapped ? `mapped ${p.contact.pnsNumberMasked ?? ""}` : "not mapped"}</Badge>
            {p.isDemo && <Badge tone="amber">Synthetic seller</Badge>}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 text-right text-xs text-gray-600">
          {interaction ? (
            <>
              <div className="flex items-center gap-2"><ModeBadge mode={interaction.mode} /><StatusBadge status={interaction.status} /></div>
              <div>Interaction <span className="font-mono">{interaction.id}</span></div>
              <div>Provider: <span className="font-mono">{interaction.provider}</span></div>
            </>
          ) : <span>No call in progress</span>}
        </div>
      </div>

      {error && <ErrorBox message={error} />}
      {pending && <div className="flex items-center gap-2 text-sm text-gray-600"><Loader2 className="h-4 w-4 animate-spin" aria-hidden />{pending}</div>}

      <div className="grid gap-4 lg:grid-cols-5">
        {/* Left: call surface */}
        <div className="space-y-4 lg:col-span-3">
          {(!interaction || ended) && !summary && (
            <Card title="Start a call">
              <fieldset className="space-y-2" disabled={!!pending}>
                <legend className="sr-only">Call mode</legend>
                {([
                  { m: "web" as CallMode, title: "Web voice call (browser microphone)", desc: config?.voiceProvider.configured ? "You play the seller using your mic. Real speech recognition + Sarvam voices; language and voice gender switch live. Not a phone call." : "You play the seller using your mic and the browser's speech engines (add SARVAM_API_KEY for Sarvam voices). Not a phone call." },
                  { m: "simulated" as CallMode, title: "Simulated call (scripted seller)", desc: "Deterministic seller script runs through the real persona, adaptation and profile-update services. Clearly labelled Simulated." },
                ]).map((o) => (
                  <label key={o.m} className={`flex cursor-pointer gap-3 rounded-lg border p-3 ${mode === o.m ? "border-brand-500 bg-brand-50" : "border-gray-200"}`}>
                    <input type="radio" name="mode" className="mt-1 accent-brand-600" checked={mode === o.m} onChange={() => setMode(o.m)} />
                    <span><span className="block text-sm font-semibold">{o.title}</span><span className="block text-xs text-gray-600">{o.desc}</span></span>
                  </label>
                ))}
                <div className="flex gap-3 rounded-lg border border-dashed border-gray-200 p-3 opacity-70">
                  <input type="radio" disabled className="mt-1" aria-label="Phone call (disabled)" />
                  <span><span className="block text-sm font-semibold">Outbound phone call (PSTN) — unavailable</span><span className="block text-xs text-gray-600">{pstn?.detail ?? "Telephony provider not configured."}</span></span>
                </div>
              </fieldset>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button onClick={prepare} disabled={!!pending}><Phone className="h-4 w-4" aria-hidden />Prepare call</Button>
              </div>
            </Card>
          )}

          {checks && (!interaction || interaction.status === "Preparing") && (
            <Card title="Pre-call preparation">
              <ul className="space-y-2">
                {checks.map((c) => (
                  <li key={c.id} className="flex items-start gap-2 text-sm">
                    <CheckIcon s={c.status} />
                    <div><div className="font-medium">{c.label}</div><div className="text-xs text-gray-600">{c.detail}</div></div>
                  </li>
                ))}
              </ul>
              {interaction?.status === "Preparing" && (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Button onClick={start} disabled={!!pending}><Play className="h-4 w-4" aria-hidden />{interaction.mode === "simulated" ? "Start simulated call" : "Start web voice call"}</Button>
                  <Button variant="secondary" onClick={() => finish("operator")} disabled={!!pending}>Cancel</Button>
                  <span className="text-xs text-gray-500">Persona bound to <span className="font-mono">{interaction.glid}</span>.</span>
                </div>
              )}
            </Card>
          )}

          {interaction && interaction.status !== "Preparing" && (
            <div ref={transcriptCard} className="scroll-mt-24">
            <Card
              title={<span className="flex items-center gap-2">Live transcript {interaction.mode === "simulated" && <Badge tone="amber">Simulated — not a phone call</Badge>}{interaction.mode === "web" && <Badge tone="blue">Browser audio — not PSTN</Badge>}</span>}
              action={isLive && (confirmEnd ? (
                <div className="flex items-center gap-2 text-xs"><span>End this call?</span><Button variant="danger" onClick={() => finish("operator")}>Yes, end</Button><Button variant="secondary" onClick={() => setConfirmEnd(false)}>No</Button></div>
              ) : <Button variant="danger" onClick={() => setConfirmEnd(true)} disabled={!!pending && pending.startsWith("Ending")}><PhoneOff className="h-4 w-4" aria-hidden />End Call</Button>)}
            >
              <div ref={transcriptBox} className="h-[min(52vh,520px)] space-y-3 overflow-y-auto scroll-smooth pr-1" aria-live="polite">
                {interaction.turns.length === 0 && <Empty title="No conversation yet" />}
                {interaction.turns.map((t) => (
                  <div key={t.id} className={`flex gap-2 ${t.speaker === "seller" ? "flex-row-reverse" : ""}`}>
                    <div className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${t.speaker === "agent" ? "bg-brand-600 text-white" : "bg-gray-200 text-gray-700"}`}>
                      {t.speaker === "agent" ? <Bot className="h-4 w-4" aria-hidden /> : <User className="h-4 w-4" aria-hidden />}
                    </div>
                    <div className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${t.speaker === "agent" ? "bg-brand-50 text-gray-900" : "bg-gray-100 text-gray-900"}`}>
                      <div className="mb-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-gray-500">
                        <span className="font-semibold">{t.speaker === "agent" ? `Agent${t.voice ? ` · ${t.voice.gender === "female" ? "♀" : "♂"} ${t.voice.speaker}` : ""}` : "Seller"}</span>
                        <span>· {languageName(t.language)}</span>
                        {t.translatedFrom === "untranslated" && <Badge tone="amber">English fallback</Badge>}
                        {t.signals?.map((s) => <Badge key={s} tone="red">{s.replace("_", " ")}</Badge>)}
                      </div>
                      <div className="whitespace-pre-wrap">{t.text}</div>
                    </div>
                  </div>
                ))}
                {/* Live bubbles: the seller's words appear as soon as they are heard / transcribed */}
                {isLive && (phase === "hearing" || liveSeller) && (
                  <div className="flex flex-row-reverse gap-2">
                    <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700"><Mic className="h-4 w-4" aria-hidden /></div>
                    <div className="max-w-[80%] rounded-xl bg-emerald-50 px-3 py-2 text-sm text-gray-900 ring-1 ring-emerald-200">
                      <div className="mb-0.5 text-[11px] font-semibold text-emerald-700">{phase === "hearing" ? "You're speaking…" : liveSeller === "…" ? "Transcribing…" : "Seller"}</div>
                      <div className="whitespace-pre-wrap">{phase === "hearing" ? <span className="inline-flex gap-1">{[0, 1, 2].map((d) => <span key={d} className="h-2 w-2 animate-bounce rounded-full bg-emerald-500" style={{ animationDelay: `${d * 120}ms` }} />)}</span> : liveSeller}</div>
                    </div>
                  </div>
                )}
                {isLive && phase === "thinking" && (
                  <div className="flex gap-2">
                    <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-600 text-white"><Bot className="h-4 w-4" aria-hidden /></div>
                    <div className="rounded-xl bg-brand-50 px-3 py-2"><span className="inline-flex gap-1">{[0, 1, 2].map((d) => <span key={d} className="h-2 w-2 animate-bounce rounded-full bg-brand-500" style={{ animationDelay: `${d * 120}ms` }} />)}</span></div>
                  </div>
                )}
              </div>

              {isLive && interaction.mode === "web" && (
                <div className="mt-4 space-y-3 border-t border-gray-100 pt-3">
                  <div className={`flex flex-wrap items-center gap-3 rounded-lg px-3 py-2 ${phase === "listening" || phase === "hearing" ? "bg-emerald-50" : phase === "speaking" ? "bg-brand-50" : "bg-gray-50"}`}>
                    <div className="flex items-center gap-2 text-sm font-medium" role="status" aria-live="polite">
                      {phase === "speaking" && <Volume2 className="h-5 w-5 animate-pulse text-brand-600" aria-hidden />}
                      {(phase === "listening" || phase === "hearing") && <span className="relative inline-block h-3 w-3 text-emerald-500"><span className="pulse-ring absolute inset-0 rounded-full" /><span className="absolute inset-0 rounded-full bg-emerald-600" /></span>}
                      {(phase === "transcribing" || phase === "thinking") && <Loader2 className="h-5 w-5 animate-spin text-gray-500" aria-hidden />}
                      {phase === "idle" && <MicOff className="h-5 w-5 text-gray-400" aria-hidden />}
                      {PHASE_LABEL[phase]}
                    </div>
                    {micRef.current && <div className="h-2 w-28 overflow-hidden rounded bg-white ring-1 ring-gray-200" aria-label="Mic level"><div className={`h-full transition-all ${phase === "hearing" ? "bg-emerald-500" : "bg-gray-300"}`} style={{ width: `${Math.round(level * 100)}%` }} /></div>}
                    <div className="ml-auto flex gap-2">
                      {phase === "speaking" && <Button variant="secondary" onClick={interruptAgent}><Mic className="h-4 w-4" aria-hidden />Interrupt</Button>}
                      {phase === "hearing" && <Button variant="secondary" onClick={() => { micRef.current?.finishNow(); browserRecRef.current?.stop(); }}><MicOff className="h-4 w-4" aria-hidden />Done speaking</Button>}
                      {phase === "idle" && <Button onClick={listenNext}><Mic className="h-4 w-4" aria-hidden />Speak as seller</Button>}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-4 text-xs text-gray-600">
                    <label className="flex items-center gap-1.5"><input type="checkbox" className="accent-brand-600" checked={autoListen} onChange={(e) => setAutoListen(e.target.checked)} />Hands-free (listen automatically after the agent speaks)</label>
                    {micRef.current && <label className="flex items-center gap-1.5"><input type="checkbox" className="accent-brand-600" checked={bargeIn} onChange={(e) => setBargeIn(e.target.checked)} />Allow interrupting the agent (turn off if it interrupts itself — or use headphones)</label>}
                    {engine === "sarvam" && <label className="flex items-center gap-1.5"><input type="checkbox" className="accent-brand-600" checked={fillers} onChange={(e) => setFillers(e.target.checked)} />Natural acknowledgements (“जी…”, “अच्छा…”) while thinking</label>}
                    <span>{engine === "sarvam" ? "Sarvam STT · auto language detect" : `Browser speech · ${languageName(interaction.currentPersona.language.value)}`}</span>
                  </div>
                  <form onSubmit={submitTyped} className="flex gap-2">
                    <label htmlFor="typed" className="sr-only">Type the seller&apos;s reply</label>
                    <input id="typed" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder='Or type as the seller, e.g. "Tamil mein baat karo" / "male voice please"' className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm" disabled={!!pending} />
                    <Button type="submit" disabled={!!pending || !typed.trim()}><Send className="h-4 w-4" aria-hidden />Send</Button>
                  </form>
                </div>
              )}

              {isLive && interaction.mode === "simulated" && (
                <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-gray-100 pt-3">
                  <Button onClick={() => void simulateStep()} disabled={!!pending || speaking || simAuto}><SkipForward className="h-4 w-4" aria-hidden />Next seller line</Button>
                  <label className="flex items-center gap-1.5 text-xs text-gray-600"><input type="checkbox" className="accent-brand-600" checked={simAuto} onChange={(e) => setSimAuto(e.target.checked)} />Auto-run scenario</label>
                  <label className="flex items-center gap-1.5 text-xs text-gray-600"><input type="checkbox" className="accent-brand-600" checked={playAudio} onChange={(e) => setPlayAudio(e.target.checked)} />{playAudio ? <Volume2 className="h-3.5 w-3.5" aria-hidden /> : <VolumeX className="h-3.5 w-3.5" aria-hidden />}Play agent voice</label>
                  {scenario && <span className="text-xs text-gray-500">Scenario line {scenario.cursor}/{scenario.total}</span>}
                  {speaking && <span className="flex items-center gap-1 text-xs text-brand-700"><Volume2 className="h-4 w-4 animate-pulse" aria-hidden />Agent speaking…</span>}
                </div>
              )}
              {voiceInfo && <p className="mt-2 text-[11px] text-gray-500"><Headphones className="mr-1 inline h-3 w-3" aria-hidden />Last voice: {voiceInfo}</p>}
              {interaction.engineNotes.length > 0 && <p className="mt-1 text-[11px] text-amber-700">{interaction.engineNotes.join(" ")}</p>}
            </Card>
            </div>
          )}

          {ended && (
            <Card title={<span className="flex items-center gap-2">Post-call processing <StatusBadge status={interaction.postCall.status} /></span>}>
              {interaction.postCall.status === "processing" && <Spinner label="Extracting observations and updating profile…" />}
              {interaction.postCall.status === "failed" && <ErrorBox message={`Profile update failed: ${interaction.postCall.error}. The profile was not changed.`} onRetry={retryPostCall} />}
              {interaction.postCall.status === "not-started" && <p className="text-sm text-gray-600">{interaction.status === "Cancelled" ? "Call ended before the seller spoke — nothing to learn, profile unchanged." : "Not processed yet."}</p>}
              {summary && (
                <div className="space-y-4 text-sm">
                  <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    <div><dt className="text-xs text-gray-500">Interaction</dt><dd className="font-mono text-xs">{summary.interactionId}</dd></div>
                    <div><dt className="text-xs text-gray-500">Duration</dt><dd>{fmtDuration(summary.durationSec)}</dd></div>
                    <div><dt className="text-xs text-gray-500">Outcome</dt><dd>{summary.outcome}</dd></div>
                    <div><dt className="text-xs text-gray-500">Adaptations</dt><dd>{summary.adaptations}</dd></div>
                  </dl>
                  <div><div className="text-xs text-gray-500">Initial persona</div><div>{summary.initialPersonaSummary}</div></div>
                  <div>
                    <div className="mb-1 font-semibold">Fields updated in the persistent profile</div>
                    {summary.updates.length === 0 ? <p className="text-gray-500">No persistent changes.</p> : (
                      <ul className="space-y-1.5">{summary.updates.map((u, k) => <li key={k} className="rounded-lg bg-emerald-50 p-2"><strong>{u.field}</strong>: {u.from} → <strong>{u.to}</strong><div className="text-xs text-gray-600">{u.reason}</div></li>)}</ul>
                    )}
                  </div>
                  {summary.rejected.length > 0 && (
                    <div><div className="mb-1 font-semibold">Proposed updates not applied (validation)</div>
                      <ul className="space-y-1.5">{summary.rejected.map((u, k) => <li key={k} className="rounded-lg bg-gray-50 p-2"><strong>{u.field}</strong>: {u.from} ↛ {u.to}<div className="text-xs text-gray-600">{u.reason}</div></li>)}</ul></div>
                  )}
                  {summary.memoryAdded.length > 0 && <div><div className="mb-1 font-semibold">New facts remembered</div><ul className="list-disc pl-5">{summary.memoryAdded.map((m) => <li key={m}>{m}</li>)}</ul></div>}
                  <details><summary className="cursor-pointer text-xs font-medium text-gray-600">Observations ({summary.observations.length})</summary><ul className="mt-1 list-disc pl-5 text-xs text-gray-600">{summary.observations.map((o, k) => <li key={k}>{o}</li>)}</ul></details>
                  <p className="text-xs text-gray-500">Profile updated at {fmtTime(summary.profileUpdatedAt)} — JSON and Markdown regenerated.</p>
                </div>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                <Button onClick={prepare} disabled={!!pending}><RotateCcw className="h-4 w-4" aria-hidden />Call again (uses updated profile)</Button>
                <LinkButton href={`/sellers/${p.glid}/persona`}>View updated persona <ArrowRight className="h-4 w-4" aria-hidden /></LinkButton>
                <LinkButton href={`/interactions/${interaction.id}`}>Interaction details</LinkButton>
              </div>
            </Card>
          )}
        </div>

        {/* Right: persona + adaptation */}
        <div className="space-y-4 lg:col-span-2">
          {interaction?.lastSignal && isLive && (
            <div className="rounded-xl border border-brand-200 bg-brand-50 p-3 text-sm">
              <div className="text-xs font-semibold uppercase tracking-wide text-brand-700">Current detected signal</div>
              <div className="mt-1 font-medium">{interaction.lastSignal.label}</div>
              <div className="text-xs text-gray-600">“{interaction.lastSignal.quote}” · {interaction.lastSignal.explicit ? "explicit request" : "inferred"} · confidence {interaction.lastSignal.confidence}</div>
            </div>
          )}

          {interaction && interaction.status !== "Preparing" && (
            <Card title="Call notes">
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-2"><dt className="text-gray-500">Stage</dt><dd className="font-medium capitalize">{interaction.stage ?? "—"}</dd></div>
                <div className="flex justify-between gap-2"><dt className="text-gray-500">Meeting</dt><dd className="text-right font-medium">{interaction.meetingTime ?? "not booked yet"}</dd></div>
                <div>
                  <dt className="text-gray-500">Issues raised ({interaction.issues?.length ?? 0})</dt>
                  {(interaction.issues ?? []).map((x, k) => {
                    const esc = (interaction.escalations ?? []).some((e) => e.issue === x.issue);
                    return <dd key={k} className="mt-1 rounded-md bg-gray-50 px-2 py-1 text-xs">{x.issue} {esc && <Badge tone="red">escalated</Badge>}</dd>;
                  })}
                  {(interaction.escalations ?? []).filter((e) => !(interaction.issues ?? []).some((x) => x.issue === e.issue)).map((e, k) => <dd key={`e${k}`} className="mt-1 rounded-md bg-gray-50 px-2 py-1 text-xs">{e.issue} <Badge tone="red">escalated</Badge></dd>)}
                </div>
              </dl>
            </Card>
          )}

          <Card title={<span className="flex items-center gap-2">Adaptation history <Badge tone="red">{interaction?.switchLog.length ?? 0}</Badge></span>}>
            {!interaction || interaction.switchLog.length === 0 ? <p className="text-sm text-gray-500">No adaptations yet. Try asking for another language, a {persona.voiceGender.value === "female" ? "male" : "female"} voice, or shorter answers.</p> : (
              <ol className="space-y-2">
                {interaction.switchLog.slice().reverse().map((s) => (
                  <li key={s.id} className="rounded-lg border border-gray-200 p-2.5 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold">{s.dimension === "plan" ? "Conversation plan" : s.dimension}</span>
                      <Badge tone={s.scope === "temporary" ? "gray" : "violet"}>{s.scope === "temporary" ? "temporary" : "persistent candidate"}</Badge>
                    </div>
                    <div className="mt-1 text-xs text-gray-700"><span className="text-gray-500">Signal:</span> {s.signal}</div>
                    <div className="text-xs"><span className="text-gray-500">Change:</span> <span className="line-through decoration-gray-400">{s.previous}</span> → <strong>{s.next}</strong></div>
                    <div className="text-xs text-gray-600"><span className="text-gray-500">Why:</span> {s.reason}</div>
                    <div className="text-[11px] text-gray-400">{fmtTime(s.at)}</div>
                  </li>
                ))}
              </ol>
            )}
          </Card>

          <Card title={interaction ? "Current persona (live)" : "Persona for this call"}>
            <p className="mb-2 text-xs text-gray-600">{persona.summary}</p>
            <PersonaGrid persona={persona} compact highlight={interaction?.overrides} />
          </Card>

          <Card title="Conversation plan">
            <p className="text-xs font-medium">{plan.objective}</p>
            <ol className="mt-2 space-y-1">
              {plan.steps.map((s, idx) => {
                const cur = interaction && isLive && idx === interaction.planStep;
                const done = interaction && (idx < interaction.planStep || ended);
                return (
                  <li key={s.id} className={`flex items-start gap-2 rounded-md px-2 py-1 text-xs ${cur ? "bg-brand-50 font-semibold" : ""}`}>
                    {done ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-emerald-600" aria-hidden /> : <CircleDashed className="mt-0.5 h-3.5 w-3.5 text-gray-400" aria-hidden />}
                    <span><strong>{s.title}:</strong> {s.goal}</span>
                  </li>
                );
              })}
            </ol>
          </Card>

          {interaction && (
            <Card title="Call status timeline">
              <ol className="space-y-1 text-xs">
                {interaction.statusHistory.map((h, k) => <li key={k} className="flex gap-2"><span className="w-28 shrink-0 text-gray-500">{fmtTime(h.at)}</span><StatusBadge status={h.status} /><span className="text-gray-600">{h.note}</span></li>)}
              </ol>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
