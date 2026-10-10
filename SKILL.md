---
name: adaptive-persona-voice-agent
description: Run, demo, test and extend the IndiaMART Adaptive Persona Voice Agent — a Sarvam-powered seller-success voice agent that builds a persona per seller (by GLID), adapts language, voice, pace and style live during a call, and writes validated learnings back to the seller's JSON/Markdown profile. Use when asked to start or demo the agent, call a seller, add sellers or behavioural signals, tune the persona/voices/reply style, or verify the agent's behaviour.
---

# Adaptive Persona Voice Agent — Skill

## What this skill covers

The agent calls IndiaMART sellers (in the browser) and talks to each one the way *that* seller prefers:

| Capability | Example trigger | Result |
|---|---|---|
| Language switch / mirroring | "Tamil mein baat karo", or the seller simply speaks Bengali | Next reply in that language (11 Indian languages) |
| Voice gender switch | "Aadmi ki aawaaz mein baat kijiye", "I want to talk to a female" | Female ⇄ male voice; verbs switch gender ("करता/करती हूँ") |
| Different voice, same gender | "Aapki awaaz achhi nahi lag rahi" | Neha → Priya → Simran…; the new voice introduces itself |
| Pace & length | "Thoda dheere", "short mein bataiye", "time nahi hai" | Slow / fast pace, concise answers |
| Busy / callback | "Abhi busy hoon, shaam 6 baje call karna" | Callback time saved as *best time to call* |
| Profile questions | "Mera GLID aur mobile number kya hai?" | Read out exactly from the record, digit by digit |
| App help | "BuyLeads kam aa rahe hain" | Guidance from the IndiaMART seller-app knowledge base |
| Meeting & pitch | "Kal 5 baje free hoon" | Meeting booked → paid-plan benefits |
| Off-topic | "Aaj mausam kaisa hai?" | Polite refusal (IndiaMART topics only) |
| End call | "Call cut kar dijiye" | One-line thank-you, call ends |

After every call, observations are validated (`learnPreference`) and saved, so the **next call starts with the learned persona**.

## Prerequisites

- Node.js 20+, Chrome or Edge (microphone), headphones recommended.
- `.env.local` with `SARVAM_API_KEY=…` (copy from `.env.example`). Without it the app falls back to browser speech and template replies.

## Procedure 1 — Run the agent

```bash
npm install
npm run build
npm start            # http://localhost:3000
```

Use `npm run dev` only while editing code (first request per route compiles slowly).

## Procedure 2 — Demo a call

1. Open **Overview** → search a GLID, e.g. `6601433` (Komal) or `90000004` (Gurpreet Singh, prefers Punjabi + male voice).
2. Open the **Persona** tab: confirm language, voice, tone, pace and their reasons/evidence.
3. Click **Call seller → Start call** and allow the microphone.
4. Speak as the seller using the triggers in the table above; watch the **Persona** side panel flash "Updated" for each change and the **Adaptations** tab log *previous → new, why*.
5. Say "call cut kar dijiye" (or press **End Call**). Review **Post-call processing**: fields updated, reasons, rejected proposals.
6. Click **Call again** and confirm the new call opens with the learned persona.

## Procedure 3 — Verify behaviour without a microphone

Drive the REST API from a Node script (Node handles Hindi text safely; Windows shells may not):

```js
const B = "http://localhost:3000";
const post = (u, json) => fetch(B + u, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(json ?? {}) }).then((r) => r.json());
const { interaction } = await post("/api/calls", { glid: "6601433", mode: "web" });
console.log((await post(`/api/calls/${interaction.id}/start`)).reply.text);
for (const text of ["Haan ji, main Komal bol rahi hoon", "Aadmi ki aawaaz mein baat kijiye", "Call cut kar dijiye"]) {
  const r = await post(`/api/calls/${interaction.id}/turn`, { text });
  console.log(r.signals.map((s) => s.type), r.reply.voice, r.reply.text, r.reply.endCall ? "[END]" : "");
}
await post(`/api/calls/${interaction.id}/end`, { reason: "operator" });
```

Expected: identity → feedback question; `voice_gender` signal and `voice.gender === "male"` with a masculine intro; `end_call` with a short goodbye. Test against a **copy** of `data/` (`DATA_DIR`) on another port so real profiles are not changed.

## Procedure 4 — Extend the agent

| Goal | Where | Steps |
|---|---|---|
| New behavioural signal | `src/lib/types.ts`, `signals.ts`, `adaptation.ts`, `agent.ts`, `calls.ts` | Add the `SignalType` → detect it (English + Hinglish + Devanagari variants, negation-aware) → map to persona overrides in `changesFor` → fixed reply in `composeReply` if exactness matters → persist via `SIGNAL_TO_FIELDS` |
| New / edited seller | `src/lib/seed-data.ts` | Add to `DEMO_REGISTRY` (numeric GLID, `isDemo`), optional `SEED_LEARNINGS`; merged into existing data on next start |
| IndiaMART knowledge | `src/lib/knowledge.ts` | Add a `KnowledgeTopic` with keywords; no invented plan numbers or prices |
| Voices | `src/lib/languages.ts` | Reorder `VOICE_ROSTER` (first = default); speakers must be valid Bulbul v3 names |
| Reply length / speed | `src/lib/agent.ts`, `src/components/voice.ts` | `LEN_WORDS`, `MAX_SENTENCES`, `MAX_TOKENS`; end-of-turn `silenceMs` |
| Wording rules | `src/lib/grammar.ts` | Plan/brand names, gender agreement, filler rationing — applied to every agent turn |

Always finish with `npm run typecheck` and a scripted test call (Procedure 3).

## Guardrails (must hold after any change)

- GLID is the identity key end-to-end; never mix sellers.
- Raw mobile numbers are only spoken to the seller who asks; masked everywhere else; never sent to the LLM.
- The agent is "IndiaMART's seller help assistant" — never "AI bot", never claims to be human.
- Never fabricate call status, prices, plan names or statistics; browser calls are labelled as such (not PSTN).
- Preferences change only through `learnPreference` (evidence-based, manual overrides protected, change-logged).
- Only the seller ends the call; escalation only when the seller is frustrated or the issue is urgent/recurring.

## Reference

- Full documentation: `README.md`
- Engineering guide for AI assistants: `CLAUDE.md`
- Per-seller output: `data/sellers/<GLID>.json` and `.md`; calls: `data/interactions/<id>.json`
