import { sarvamConfigured } from "./sarvam";
import type { CallMode } from "./types";

// Provider adapters. The persona engine never talks to a provider directly, so a
// real outbound PSTN integration (e.g. Exotel / Twilio bridged to Sarvam STT/TTS)
// can be added here without touching persona, adaptation or profile code.

export interface ProviderStatus {
  mode: CallMode;
  id: string;
  label: string;
  available: boolean;
  detail: string;
  outboundPstn: boolean;
}

export function providerStatus(mode: CallMode): ProviderStatus {
  switch (mode) {
    case "simulated":
      return { mode, id: "simulator", label: "Simulated call (scripted seller)", available: true, outboundPstn: false, detail: "Deterministic scripted seller; runs the real persona, adaptation and profile-update services. No phone call is placed." };
    case "web":
      return {
        mode, id: sarvamConfigured() ? "web+sarvam" : "web+browser-speech", label: "Web voice call (browser microphone)", available: true, outboundPstn: false,
        detail: sarvamConfigured()
          ? "Operator's browser mic plays the seller. Speech → Sarvam STT, replies → Sarvam Bulbul TTS. Not a PSTN phone call."
          : "Operator's browser mic plays the seller using the browser's built-in speech engines (Sarvam key not set). Not a PSTN phone call.",
      };
    case "pstn": {
      const p = (process.env.TELEPHONY_PROVIDER ?? "none").toLowerCase();
      if (p === "none" || !p) {
        return { mode, id: "none", label: "Outbound phone call (PSTN)", available: false, outboundPstn: false, detail: "No telephony provider configured (TELEPHONY_PROVIDER=none). Creating a Sarvam agent does not by itself provide outbound PSTN calling; an approved telephony provider and PNS-mapped caller ID are required." };
      }
      return { mode, id: p, label: `Outbound phone call via ${p}`, available: false, outboundPstn: false, detail: `TELEPHONY_PROVIDER=${p} is set, but the ${p} adapter is not implemented in this build. Real calls stay disabled.` };
    }
  }
}

export function allProviders(): ProviderStatus[] {
  return (["web", "simulated", "pstn"] as CallMode[]).map(providerStatus);
}
