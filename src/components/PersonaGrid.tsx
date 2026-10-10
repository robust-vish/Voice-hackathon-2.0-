"use client";

import { languageName } from "@/lib/languages";
import { PREF_LABEL } from "@/lib/prefs-meta";
import type { Persona, PersonaDimension, PersonaDimensionKey } from "@/lib/types";
import { Badge, ConfidenceBar } from "./ui";

export const PERSONA_KEYS: PersonaDimensionKey[] = [
  "language", "languageStyle", "voiceGender", "tone", "formality", "pace", "responseLength", "explanationDetail", "openingStyle", "objectionHandling",
];

const SOURCE_TONE: Record<string, string> = { learned: "green", manual: "violet", metadata: "blue", default: "gray", "call-override": "red" };

export function fmtValue(key: string, v: string) {
  return key === "language" ? `${languageName(v)} (${v})` : v;
}

export function PersonaGrid({ persona, compact = false, highlight }: { persona: Persona; compact?: boolean; highlight?: Partial<Record<PersonaDimensionKey, string>> }) {
  return (
    <div className={`grid gap-3 ${compact ? "grid-cols-1 sm:grid-cols-2" : "md:grid-cols-2"}`}>
      {PERSONA_KEYS.map((k) => {
        const d = persona[k] as PersonaDimension;
        const overridden = highlight && highlight[k] !== undefined;
        return (
          <div key={k} className={`rounded-lg border p-3 ${overridden ? "border-brand-300 bg-brand-50" : "border-gray-200 bg-white"}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs uppercase tracking-wide text-gray-500">{PREF_LABEL[k]}</div>
              <Badge tone={SOURCE_TONE[d.source] ?? "gray"}>{d.source === "call-override" ? "this call only" : d.source}</Badge>
            </div>
            <div className="mt-1 font-semibold text-gray-900">
              {fmtValue(k, d.value)}
              {k === "voiceGender" && <span className="ml-1 text-xs font-normal text-gray-500">— agent “{persona.agentName}”, speaker {persona.voiceSpeaker}</span>}
            </div>
            {!compact && <p className="mt-1 text-xs text-gray-600"><span className="font-medium">Reason:</span> {d.reason}</p>}
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-500">
              <ConfidenceBar value={d.confidence} />
              <span>Evidence: {d.evidenceCount} observation{d.evidenceCount === 1 ? "" : "s"}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
