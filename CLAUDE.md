# CLAUDE.md

Guidance for Claude Code (and other AI coding assistants) working in this repository.

## Project in one paragraph

**Adaptive Persona Voice Agent** — an IndiaMART seller-success voice agent built for the IndiaMART Voice AI Hackathon 2.0. A Next.js dashboard lets an operator search a seller by **GLID**, inspect the seller's **persona**, and start a **browser voice call**. During the call the agent adapts live (language, voice gender/speaker, pace, length, tone) from deterministic signal detection; after the call it validates what it learned and writes it back to the seller's **JSON + Markdown profile**. Speech, voices, translation and replies use **Sarvam AI** (Saaras STT, Bulbul TTS, Mayura translate, sarvam-105b chat).

## Commands

```bash
npm install
npm run dev          # dev server on :3000 (slow first compile per route)
npm run build        # production build (use for demos)
npm start            # serve the build on :3000
npm run typecheck    # tsc --noEmit — must pass before you finish
```

There is no unit-test framework. Verify changes with `npm run typecheck`, then an **isolated test server** (see *Testing*). The user usually runs the main server on :3000 themselves — **do not start, stop or rebuild it** unless asked.

## Tech stack

- Next.js 15 (App Router; `params`/`searchParams` are Promises → `use(params)`), React 19, TypeScript **5.x** (pinned; do not upgrade to TS 7), Tailwind CSS **4** (`@tailwindcss/postcss`, theme tokens in `src/app/globals.css`), lucide-react icons, Plus Jakarta Sans via `next/font`.
- No database: file storage under `DATA_DIR` (default `./data`).
- `next.config.mjs` honours `NEXT_DIST_DIR` (used for isolated test builds).

## Architecture map

| File | Responsibility |
|---|---|
| `src/lib/types.ts` | Domain model: `SellerProfile`, `Persona`, `Interaction`, `Signal`, `SwitchLogEntry`, `CALL_STAGES` |
| `src/lib/seed-data.ts` | Seller registry seed: 4 real sellers + 6 demo sellers (`90000001`–`90000006`) and their synthetic prior learnings |
| `src/lib/store.ts` | File store. `ensureSeeded()` seeds once; `syncIdentities()` non-destructively merges new seed sellers / names into existing data |
| `src/lib/profile.ts` | `profileFromRegistry`, `learnPreference` (evidence-based validator), `computeStatus`, `profileToMarkdown`, `maskMobile` |
| `src/lib/persona.ts` | `generatePersona`, `withOverride`, `withSpeaker`, `speakerForSeller`, `generatePlan` |
| `src/lib/signals.ts` | `detectSignals(text, lang, currentGender)` — all behavioural signals; negation-aware `requestedGender` |
| `src/lib/adaptation.ts` | `applySignals` — signal → call-scoped persona override + switch-log entry |
| `src/lib/agent.ts` | `composeReply` — ordered pipeline: end/not-interested → profile query → callback → voice change → LLM → templates; LLM prompt; post-filters |
| `src/lib/grammar.ts` | `polishAgentText` (brand & plan names, "help assistant" wording, gender-correct first-person verbs), `tameFillers` |
| `src/lib/knowledge.ts` | IndiaMART seller-app knowledge base injected into the LLM prompt + quick tips for templates |
| `src/lib/calls.ts` | Call lifecycle: `prepareCall` → `startCall` → `sellerTurn` → `endCall` → `runPostCall` |
| `src/lib/languages.ts` | 11 languages, `VOICE_ROSTER`, `speakerFor`, `nextSpeaker`, script detection |
| `src/lib/sarvam.ts` | Sarvam REST client: `sarvamTts`, `sarvamStt`, `sarvamTranslate`, `sarvamChat` |
| `src/components/voice.ts` | Browser audio: `MicSession` (VAD, 400 ms pre-roll, `silenceMs` end-of-turn), WAV encoding, gapless TTS playback, filler clips |
| `src/app/call/[glid]/page.tsx` | Call screen: one-click Start call, transcript, live persona / adaptations / plan |

## Invariants — do not break these

1. **GLID is the identity key** everywhere (numeric, 4–12 digits; `normalizeGlid` / `isValidGlid`). Never load one seller's persona while calling another.
2. **Raw mobile numbers never leave the registry**, except when the seller asks for *their own* number (`profileAnswer` in `agent.ts`). Profiles/API/UI use `maskMobile`. LLM history masks digit runs (`[number]`).
3. **Every agent turn goes through `polishAgentText`** (in `calls.ts › agentTurn`). Keep brand (`IndiaMART`) and plan names (`IM Leader`, `IM Star`, `Maximiser`, `TrustSEAL`) in English in every language.
4. **The agent is "IndiaMART's seller help assistant"** — never "AI bot/assistant", and never claims to be human.
5. **Gender agreement:** first-person verbs must match the *current* voice (male "करता हूँ / समझ गया", female "करती हूँ / समझ गई").
6. **Only the seller ends the call** (`end_call`, `not_interested` signals). "Call cut kar dijiye" → short goodbye, `endCall: true`.
7. **No repeats:** never re-ask an unanswered question (`beatAfter`, `dropRepeatedSentences`); replies capped by `capLength` (2 sentences; 4 when detailed).
8. **Learning is evidence-based** — use `learnPreference`; never write preferences directly. Manual overrides are protected; every change gets a `changeLog` entry.
9. **Escalation** to the senior team only when `escalationAllowed()` (frustration/urgency or recurring complaint), at most once per call.
10. **Never fabricate** call status, transcripts, prices, plan names or BuyLead counts. The call is a *browser* call — don't label it a phone (PSTN) call.

## Common tasks

**Add a behavioural signal** — add the type to `SignalType` (`types.ts`) → detect it in `detectSignals` (`signals.ts`, cover English + Hinglish + Devanagari) → map it to persona changes in `changesFor` / `PLAN_SIGNALS` (`adaptation.ts`) → handle the reply in `composeReply` if it needs a fixed line → if it should persist, add it to `SIGNAL_TO_FIELDS` (`calls.ts`).

**Add or edit a seller** — edit `DEMO_REGISTRY` (and optionally `SEED_LEARNINGS`) in `seed-data.ts`. New GLIDs are merged into existing data on next start; do **not** bump `SEED_VERSION` unless a full reset is intended (it wipes profiles and calls).

**Add IndiaMART knowledge** — add a `KnowledgeTopic` in `knowledge.ts` (keywords drive retrieval). Don't quote per-plan BuyLead counts or prices.

**Change voices** — `VOICE_ROSTER` in `languages.ts` (first entry = default). Valid Bulbul v3 speakers are listed in `BULBUL_V3`.

**Tune reply length / latency** — `LEN_WORDS`, `MAX_SENTENCES`, `MAX_TOKENS` in `agent.ts`; end-of-turn silence `silenceMs` in `components/voice.ts`.

## Testing

Run an isolated server on a **copy** of the data so the user's server and data are untouched:

```powershell
$tmp = "$env:TEMP\va-test"; Copy-Item -Recurse data $tmp
$env:NEXT_DIST_DIR = ".next-test"; npx next build
$env:NEXT_DIST_DIR = ".next-test"; $env:DATA_DIR = $tmp; npx next start -p 3001   # background
```

Drive calls through the API with a small **Node script** (`POST /api/calls` → `/start` → `/turn` → `/end`) and print the replies. Afterwards stop the server and delete `.next-test` and the temp data.

## Gotchas

- **Windows shell + Devanagari:** bash/curl mangles non-ASCII bodies and heredocs strip backslashes — send Hindi test input from Node scripts, and edit regexes with the Edit tool (or `String.raw`).
- **Sarvam STT** rejects MIME types with parameters (`audio/webm;codecs=opus`): the client sends 16 kHz WAV; the server re-wraps blobs with a plain type.
- **Sarvam chat:** keep `reasoning_effort: null` (hidden reasoning can eat the token budget and return empty text); use `response_format: json_object`; `bulbul:v2` and `sarvam-30b` are deprecated.
- **STT spellings:** speech-to-text writes English words in Devanagari ("मेल वॉइस") and Hindi words many ways ("aawaj/awaaz") — add variants to the word lists, and note "फीमेल" contains "मेल" (it is scrubbed before male detection).
- `/api/admin/reset` and changing `SEED_VERSION` **delete** profiles and interactions.
- Serverless hosts (Vercel): set `DATA_DIR=/tmp/voice-agent-data` **and** connect Upstash Redis (`KV_REST_API_URL`/`KV_REST_API_TOKEN`). `/tmp` is per-instance, so without the shared store calls fail with "Interaction not found". `src/lib/sync.ts` hydrates in `handle()` before each API request and flushes after; every JSON write must go through `writeJsonAtomic` so it is marked dirty.

## Code style

- Match the surrounding code: concise TypeScript, small pure helpers, short comments explaining *why*.
- Client components start with `"use client"`; API routes use `handle()` / `json()` / `fail()` from `src/lib/api.ts` and `export const dynamic = "force-dynamic"`.
- UI uses the components in `src/components/ui.tsx` (`Card`, `Button`, `Badge`, `Tabs`…) and the `press` / `lift` / `animate-fade-up` utilities from `globals.css`.
- Never commit `.env.local` or print API keys.
