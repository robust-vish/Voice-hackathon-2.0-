"use client";

import { useEffect, useState } from "react";
import { Badge, Button, Card, ErrorBox, Spinner } from "@/components/ui";
import { api } from "@/lib/client";

interface Config {
  voiceProvider: { name: string; configured: boolean; status: { ok: boolean; detail: string }; ttsModel: string; sttModel: string };
  llm: { name: string; configured: boolean; model: string; fallback: string };
  callModes: { mode: string; label: string; available: boolean; detail: string; outboundPstn: boolean }[];
  storage: { provider: string; path: string };
  demoMode: boolean;
  supportedLanguages: { code: string; name: string; native: string }[];
  profileSchemaVersion: number;
}

export default function ConfigPage() {
  const [c, setC] = useState<Config | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [probing, setProbing] = useState(false);
  const [resetState, setResetState] = useState<"idle" | "confirm" | "busy" | "done">("idle");

  const load = (probe = false) => {
    setError(null);
    if (probe) setProbing(true);
    api<Config>(`/api/config${probe ? "?probe=1" : ""}`).then(setC).catch((e) => setError(e.message)).finally(() => setProbing(false));
  };
  useEffect(() => load(), []);

  const reset = async () => {
    setResetState("busy");
    try {
      await api("/api/admin/reset", { method: "POST" });
      setResetState("done");
    } catch (e) {
      setError((e as Error).message);
      setResetState("idle");
    }
  };

  if (error) return <ErrorBox message={error} onRetry={() => load()} />;
  if (!c) return <Spinner />;
  const ok = (b: boolean, yes = "Configured", no = "Not configured") => <Badge tone={b ? "green" : "amber"}>{b ? yes : no}</Badge>;

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold">Configuration</h1>
      <p className="text-sm text-gray-600">Secrets are read from <code>.env.local</code> on the server and are never sent to the browser.</p>
      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Voice provider" action={<Button variant="secondary" onClick={() => load(true)} disabled={probing}>{probing ? "Testing…" : "Test connection"}</Button>}>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt>{c.voiceProvider.name}</dt><dd>{ok(c.voiceProvider.configured)}</dd></div>
            <div className="text-xs text-gray-600">{c.voiceProvider.status.detail}</div>
            <div className="flex justify-between"><dt>TTS model</dt><dd className="font-mono text-xs">{c.voiceProvider.ttsModel}</dd></div>
            <div className="flex justify-between"><dt>STT model</dt><dd className="font-mono text-xs">{c.voiceProvider.sttModel}</dd></div>
          </dl>
        </Card>
        <Card title="LLM integration">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt>{c.llm.name}</dt><dd>{ok(c.llm.configured)}</dd></div>
            <div className="flex justify-between"><dt>Model</dt><dd className="font-mono text-xs">{c.llm.model}</dd></div>
            <div className="text-xs text-gray-600">Fallback: {c.llm.fallback}</div>
          </dl>
        </Card>
        <Card title="Calling capability" className="md:col-span-2">
          <ul className="space-y-2 text-sm">
            {c.callModes.map((m) => (
              <li key={m.mode} className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-gray-200 p-2">
                <div><div className="font-medium">{m.label}</div><div className="text-xs text-gray-600">{m.detail}</div></div>
                {ok(m.available, "Available", "Unavailable")}
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Storage & schema">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt>Storage provider</dt><dd className="text-right text-xs">{c.storage.provider}</dd></div>
            <div className="flex justify-between"><dt>Data path</dt><dd className="font-mono text-xs">{c.storage.path}</dd></div>
            <div className="flex justify-between"><dt>Profile schema version</dt><dd>{c.profileSchemaVersion}</dd></div>
            <div className="flex justify-between"><dt>Demo mode</dt><dd>{ok(c.demoMode, "On (synthetic sellers)", "Off")}</dd></div>
          </dl>
        </Card>
        <Card title="Supported languages">
          <div className="flex flex-wrap gap-1.5">{c.supportedLanguages.map((l) => <Badge key={l.code}>{l.name} · {l.native}</Badge>)}</div>
          <p className="mt-2 text-xs text-gray-500">Sellers can switch to any of these mid-call by asking (e.g. “Tamil mein baat karo”, “speak in Bengali”), or simply by speaking it.</p>
        </Card>
        <Card title="Demo data" className="md:col-span-2">
          <p className="text-sm text-gray-600">Restore the synthetic demo sellers and delete all recorded demo interactions.</p>
          <div className="mt-3 flex items-center gap-2">
            {resetState === "confirm" ? (
              <><span className="text-sm">This deletes all interactions and learned changes. Continue?</span><Button variant="danger" onClick={reset}>Yes, reset</Button><Button variant="secondary" onClick={() => setResetState("idle")}>Cancel</Button></>
            ) : (
              <Button variant="secondary" onClick={() => setResetState("confirm")} disabled={resetState === "busy"}>{resetState === "busy" ? "Resetting…" : "Reset demo data"}</Button>
            )}
            {resetState === "done" && <span role="status" className="text-sm text-emerald-700">Demo data restored.</span>}
          </div>
        </Card>
      </div>
    </div>
  );
}
