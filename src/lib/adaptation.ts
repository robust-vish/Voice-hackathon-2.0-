import { languageName } from "./languages";
import { makeId } from "./profile";
import { withOverride } from "./persona";
import type { Interaction, PersonaDimensionKey, Signal, SwitchLogEntry, Turn } from "./types";

interface Change { key: PersonaDimensionKey; value: string; reason: string }

function changesFor(s: Signal): Change[] {
  switch (s.type) {
    case "language_switch":
      return [{ key: "language", value: s.value!, reason: `Seller explicitly asked to continue in ${languageName(s.value!)}.` }];
    case "voice_gender":
      return [{ key: "voiceGender", value: s.value!, reason: `Seller asked to hear a ${s.value} voice.` }];
    case "shorter":
      return [
        { key: "responseLength", value: "concise", reason: "Seller asked the agent to get to the point." },
        { key: "explanationDetail", value: "low", reason: "Short answers need minimal explanation." },
      ];
    case "more_detail":
      return [
        { key: "responseLength", value: "detailed", reason: "Seller asked for a fuller explanation." },
        { key: "explanationDetail", value: "high", reason: "Seller wants to understand the details." },
      ];
    case "slower":
      return [{ key: "pace", value: "slow", reason: "Seller asked the agent to speak slower." }];
    case "faster":
      return [{ key: "pace", value: "fast", reason: "Seller asked the agent to speak faster." }];
    case "formal":
      return [{ key: "formality", value: "formal", reason: "Seller expects a formal, respectful tone." }];
    case "informal":
      return [{ key: "formality", value: "informal", reason: "Seller is speaking casually; mirror a friendlier register for this call." }];
    case "frustration":
      return [
        { key: "tone", value: "empathetic", reason: "Seller sounds frustrated; acknowledge it and keep things light." },
        { key: "objectionHandling", value: "brief-and-move-on", reason: "Avoid arguing with a frustrated seller." },
      ];
    case "busy":
      return [{ key: "responseLength", value: "concise", reason: "Seller is busy; keep it very short and offer a callback." }];
    case "urgent":
      return [
        { key: "tone", value: "empathetic", reason: "Seller wants a quick fix — acknowledge the urgency and be reassuring." },
        { key: "responseLength", value: "concise", reason: "Urgent problem: skip the small talk, give the fix or the next step." },
      ];
    case "hurry":
      return [
        { key: "pace", value: "fast", reason: "Seller has little time — speak faster." },
        { key: "responseLength", value: "concise", reason: "Seller has little time — go straight to the point." },
        { key: "explanationDetail", value: "low", reason: "No time for explanations; only the essentials." },
      ];
    default:
      return [];
  }
}

const PLAN_SIGNALS: Partial<Record<Signal["type"], (s: Signal) => { next: string; reason: string }>> = {
  busy: () => ({ next: "Offer a callback and close quickly", reason: "Seller said they are busy right now." }),
  callback_time: (s) => ({ next: `Schedule callback: ${s.value}`, reason: "Seller told us when they prefer to be called." }),
  not_interested: () => ({ next: "Close politely, no further pitch", reason: "Seller said they are not interested." }),
  end_call: () => ({ next: "Close the call", reason: "Seller is ending the call." }),
  off_topic: () => ({ next: "Politely decline; steer back to IndiaMART", reason: "Agent only helps with IndiaMART-related topics." }),
  issue: () => ({ next: "Help with app guidance", reason: "Seller reported a problem with IndiaMART." }),
};

/** Applies detected signals to the live interaction: call-scoped overrides + switch log. */
export function applySignals(interaction: Interaction, signals: Signal[], turn: Turn): SwitchLogEntry[] {
  const entries: SwitchLogEntry[] = [];
  const at = new Date().toISOString();
  for (const s of signals) {
    for (const c of changesFor(s)) {
      const previous = String(interaction.currentPersona[c.key].value);
      if (previous === c.value) continue;
      interaction.currentPersona = withOverride(interaction.currentPersona, c.key, c.value, c.reason);
      interaction.overrides[c.key] = c.value;
      entries.push({
        id: makeId("SW"), at, turnId: turn.id, signalType: s.type, signal: s.label, quote: s.quote,
        dimension: c.key,
        previous: c.key === "language" ? languageName(previous) : previous,
        next: c.key === "language" ? languageName(c.value) : c.value,
        reason: c.reason,
        scope: s.persistentCandidate ? "persistent-candidate" : "temporary",
      });
    }
    const plan = PLAN_SIGNALS[s.type]?.(s);
    if (plan) {
      const previous = interaction.plan.steps[Math.min(interaction.planStep, interaction.plan.steps.length - 1)].title;
      entries.push({ id: makeId("SW"), at, turnId: turn.id, signalType: s.type, signal: s.label, quote: s.quote, dimension: "plan", previous, next: plan.next, reason: plan.reason, scope: s.persistentCandidate ? "persistent-candidate" : "temporary" });
      if (s.type === "callback_time") interaction.callbackRequested = s.value;
    }
  }
  interaction.switchLog.push(...entries);
  return entries;
}
