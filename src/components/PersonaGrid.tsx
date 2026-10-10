"use client";

import { useEffect, useRef, useState, type ComponentType } from "react";
import { AlignLeft, BookOpen, Gauge, Hand, Handshake, Languages, MessageSquareText, Mic, Smile, UserRound } from "lucide-react";
import { languageName } from "@/lib/languages";
import { ALLOWED_VALUES, PREF_LABEL } from "@/lib/prefs-meta";
import type { Persona, PersonaDimension, PersonaDimensionKey } from "@/lib/types";

export const PERSONA_KEYS: PersonaDimensionKey[] = [
  "language", "languageStyle", "voiceGender", "tone", "formality", "pace", "responseLength", "explanationDetail", "openingStyle", "objectionHandling",
];

// Grouped so the panel reads as three short lists instead of ten equal cards.
const GROUPS: { title: string; keys: PersonaDimensionKey[] }[] = [
  { title: "Voice & language", keys: ["language", "languageStyle", "voiceGender"] },
  { title: "Speaking style", keys: ["tone", "formality", "pace"] },
  { title: "Answers", keys: ["responseLength", "explanationDetail", "openingStyle", "objectionHandling"] },
];

const ICON: Record<PersonaDimensionKey, ComponentType<{ className?: string }>> = {
  language: Languages, languageStyle: MessageSquareText, voiceGender: Mic, tone: Smile, formality: UserRound,
  pace: Gauge, responseLength: AlignLeft, explanationDetail: BookOpen, openingStyle: Hand, objectionHandling: Handshake,
};

// Dimensions with a small, ordered set of values render as a segmented scale.
const SCALE_KEYS: PersonaDimensionKey[] = ["voiceGender", "formality", "pace", "responseLength", "explanationDetail"];

const NICE: Record<string, string> = {
  "code-mixed": "Code-mixed", native: "Pure", "english-heavy": "English-heavy",
  "greeting-first": "Greeting first", relationship: "Relationship", direct: "Direct",
  "acknowledge-and-reassure": "Acknowledge & reassure", "data-backed": "Data-backed", "brief-and-move-on": "Brief & move on",
  low: "Low", medium: "Medium", high: "High", concise: "Short", balanced: "Balanced", detailed: "Detailed",
  slow: "Slow", normal: "Normal", fast: "Fast", formal: "Formal (aap)", informal: "Informal",
  female: "Female", male: "Male", warm: "Warm", professional: "Professional", empathetic: "Empathetic",
};

const SOURCE: Record<string, { label: string; dot: string; text: string }> = {
  "call-override": { label: "Changed this call", dot: "bg-brand-500", text: "text-brand-700" },
  learned: { label: "Learned", dot: "bg-emerald-500", text: "text-emerald-700" },
  manual: { label: "Set manually", dot: "bg-violet-500", text: "text-violet-700" },
  metadata: { label: "From profile", dot: "bg-sky-500", text: "text-sky-700" },
  default: { label: "Default", dot: "bg-gray-300", text: "text-gray-500" },
};

export function fmtValue(key: string, v: string) {
  if (key === "language") return languageName(v);
  return NICE[v] ?? v;
}

function Confidence({ value }: { value: number }) {
  const filled = Math.round(value * 5);
  return (
    <span className="inline-flex gap-0.5" title={`Confidence ${Math.round(value * 100)}%`} aria-label={`Confidence ${Math.round(value * 100)}%`}>
      {[0, 1, 2, 3, 4].map((i) => <span key={i} className={`h-1.5 w-2.5 rounded-full ${i < filled ? "bg-gray-700" : "bg-gray-200"}`} />)}
    </span>
  );
}

function Pointer({ k, d, persona, was, flash, showReason }: { k: PersonaDimensionKey; d: PersonaDimension; persona: Persona; was?: string; flash: boolean; showReason: boolean }) {
  const Icon = ICON[k];
  const src = SOURCE[d.source] ?? SOURCE.default;
  const changed = d.source === "call-override";
  const scale = SCALE_KEYS.includes(k) ? (ALLOWED_VALUES[k as keyof typeof ALLOWED_VALUES] as readonly string[]) : null;
  return (
    <li className={`flex gap-3 rounded-xl px-3 py-2.5 transition-colors duration-700 ${flash ? "bg-amber-50 ring-1 ring-amber-200" : changed ? "bg-brand-50/60" : ""}`} title={d.reason}>
      <span className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg ${changed ? "bg-brand-100 text-brand-700" : "bg-gray-100 text-gray-500"}`}><Icon className="h-4 w-4" /></span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <span className="flex min-w-0 flex-wrap items-center gap-x-2 text-xs text-gray-500">
            {PREF_LABEL[k]}
            {d.source !== "default" && <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${src.text}`}><span className={`h-1.5 w-1.5 rounded-full ${src.dot}`} />{src.label}</span>}
          </span>
          <Confidence value={d.confidence} />
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          {scale ? (
            <span className="inline-flex rounded-lg bg-gray-100 p-0.5">
              {scale.map((o) => (
                <span key={o} className={`rounded-md px-2.5 py-0.5 text-xs ${o === d.value ? "bg-white font-semibold text-gray-900 shadow-sm ring-1 ring-gray-200" : "text-gray-400"}`}>{fmtValue(k, o)}</span>
              ))}
            </span>
          ) : (
            <span className="text-sm font-semibold text-gray-900">{fmtValue(k, d.value)}</span>
          )}
          {k === "voiceGender" && <span className="text-xs text-gray-500">“{persona.agentName}”</span>}
          {was && was !== d.value && <span className="text-xs text-gray-400">was <span className="line-through">{fmtValue(k, was)}</span></span>}
          {flash && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800">Updated</span>}
        </div>
        {showReason && <p className="mt-1 text-xs leading-relaxed text-gray-500">{d.reason}</p>}
      </div>
    </li>
  );
}

/** One-line summary chips: language · voice · tone · pace · length. */
export function PersonaAtAGlance({ persona }: { persona: Persona }) {
  const chips = [
    languageName(persona.language.value),
    `${fmtValue("voiceGender", persona.voiceGender.value)} voice · ${persona.agentName}`,
    fmtValue("tone", persona.tone.value),
    `${fmtValue("pace", persona.pace.value)} pace`,
    `${fmtValue("responseLength", persona.responseLength.value)} answers`,
  ];
  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map((c) => <span key={c} className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">{c}</span>)}
    </div>
  );
}

/**
 * The agent's persona as clear "pointers" (language, voice, tone, pace…).
 * Values that change while the panel is open flash "Updated"; values changed during the
 * current call show what they were before (`baseline`).
 */
export function PersonaGrid({ persona, baseline, compact = false }: { persona: Persona; baseline?: Persona; compact?: boolean }) {
  const [showReason, setShowReason] = useState(false);
  const [flash, setFlash] = useState<Set<PersonaDimensionKey>>(new Set());
  const prev = useRef<Persona | null>(null);

  useEffect(() => {
    const before = prev.current;
    prev.current = persona;
    if (!before || before.glid !== persona.glid) return;
    const changed = PERSONA_KEYS.filter((k) => before[k].value !== persona[k].value);
    if (!changed.length) return;
    setFlash(new Set(changed));
    const t = setTimeout(() => setFlash(new Set()), 4000);
    return () => clearTimeout(t);
  }, [persona]);

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-gray-500">
        <span className="flex flex-wrap items-center gap-3">
          {(["call-override", "learned", "manual", "metadata"] as const).map((s) => (
            <span key={s} className="inline-flex items-center gap-1"><span className={`h-1.5 w-1.5 rounded-full ${SOURCE[s].dot}`} />{SOURCE[s].label}</span>
          ))}
          {!compact && <span className="text-gray-400">· untagged = default · bars = confidence</span>}
        </span>
        <button type="button" className="font-medium text-gray-600 hover:text-gray-900 hover:underline" onClick={() => setShowReason((v) => !v)}>
          {showReason ? "Hide reasons" : "Why?"}
        </button>
      </div>
      <div className={`grid gap-x-6 gap-y-4 ${compact ? "grid-cols-1" : "lg:grid-cols-3"}`}>
        {GROUPS.map((g) => (
          <section key={g.title}>
            <h3 className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">{g.title}</h3>
            <ul className="space-y-0.5">
              {g.keys.map((k) => (
                <Pointer key={k} k={k} d={persona[k] as PersonaDimension} persona={persona} was={baseline?.[k].value} flash={flash.has(k)} showReason={showReason} />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
