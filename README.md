# Adaptive Persona Voice Agent — IndiaMART Voice AI Hackathon

This is a voice agent that changes its personality to suit each seller. It keeps a JSON and a Markdown profile for every seller, keyed by **GLID**. During a call the seller can ask for any of 11 Indian languages or for a male or female voice, and the agent switches straight away. When the call ends, the agent checks what it learned and writes the changes back to the seller's profile.

> The registry has 4 **real sellers** (6601433, 7349419, 37627888, 218447291 — mobiles stored masked) and 2 **demo sellers** (90000001, 90000002). Keep `src/lib/seed-data.ts` and `data/` private.

## Run it

```bash
cd voice-agent
npm install
cp .env.example .env.local   # add SARVAM_API_KEY for Sarvam voices/STT/LLM/translation (optional)
npm run dev                  # http://localhost:3000  (development)

# For demos (much faster, no on-demand compilation):
npm run build
npm start                    # http://localhost:3000
```

Voice tips: use Chrome/Edge, allow the microphone, and prefer headphones so the agent's voice isn't picked up by the mic (or untick "Allow interrupting the agent").

The app works without any API key:

- **Web voice** calls use the browser's built-in speech engines. Chrome or Edge is recommended.
- Agent lines in languages other than Hindi and English are only translated when Sarvam is configured. Without it, those lines fall back to English text, and the UI says so.

## Demo script (about 3 minutes)

1. On the Overview page, search **`90000001` (demo seller)** and click **View Persona**. The persona shows Hindi, a female voice and concise answers, each with its reason, evidence and confidence.
2. Click **Call Seller**, then **Start call**. The pre-call checks (GLID, profile, PNS mapping, persona, interaction ID, provider) run silently and the call connects straight away; they're only shown if one fails.
3. Speak as the seller. Try:
   - "short mein bataiye", so response length and explanation detail change
   - "Gujarati mein baat kijiye", so the agent's language and TTS voice switch mid-call
   - "I don't like your voice, I want to talk to a male", so "Neha" (female) becomes "Rahul" (male); "aapki awaaz achhi nahi" switches to another voice of the same gender
   - "I'm busy, call me after 6 pm", which is saved as the best time to call
   - "call cut kar dijiye", which ends the call
   You can also just start speaking Bengali; the agent mirrors the language.
4. Post-call processing then shows each profile field that changed and why. `data/sellers/<GLID>.json` and its `.md` file are regenerated.
5. Click **Call again**. The new call opens with the learned language, voice and style. One contrary request doesn't overwrite a preference backed by several earlier observations — learning is evidence-based rather than a blind overwrite.

## Architecture

```
src/lib/
  types.ts        domain model (SellerProfile, Persona, Interaction, SwitchLog…)
  store.ts        file storage: data/sellers/<GLID>.json + .md, data/interactions/<id>.json
  profile.ts      profile creation, evidence-based learnPreference() validator, Markdown generator
  persona.ts      persona + conversation plan generation from a profile
  signals.ts      deterministic signal detection (EN / Hinglish / Devanagari / native scripts)
  adaptation.ts   signal → call-scoped persona override + switch-log entry (prev → next, why, scope)
  agent.ts        reply composer: Sarvam LLM (persona-constrained) or plan-driven templates
  calls.ts        call lifecycle: prepare → start → turns → end → post-call profile update
  sarvam.ts       Sarvam REST: TTS (Bulbul), STT (Saaras), translate (Mayura), chat completions
  telephony.ts    provider adapters (simulated / web / PSTN stub)
src/components/voice.ts   browser mic + voice-activity detection → STT, TTS playback
src/app/…                 dashboard pages + API routes
```

**Learning rules.** An explicit request ("Tamil mein baat karo") replaces a default or metadata value right away. An inferred signal needs 2 observations. A learned value only changes when the new evidence is at least as strong as the old. Manual overrides only change when the seller says "always" or "hamesha". Each update records its source, confidence, observation count, evidence quotes and a change-log entry.

**IndiaMART concepts used:**

- **GLID**: the seller's identity key.
- **Catalog** items with **offer IDs**: missing prices drive the conversation plan.
- **BuyLead** preferences.
- **PNS** (Preferred Number Service): the pre-call contact-mapping check. The number is always masked.
- **Lead Manager**: mentioned in talking points.

**Phone calls (PSTN).** Real outbound phone calls are not wired in. Creating a Sarvam agent does not by itself provide outbound phone calling. The `telephony.ts` adapter is the place to add an Exotel or Twilio bridge without touching the persona engine. Until then, calls run as clearly labelled browser (web voice) calls.
