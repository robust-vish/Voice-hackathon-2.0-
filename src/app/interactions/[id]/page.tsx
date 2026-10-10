"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { Badge, Card, ErrorBox, LinkButton, ModeBadge, Spinner, StatusBadge } from "@/components/ui";
import { api, fmtDuration, fmtTime } from "@/lib/client";
import { languageName } from "@/lib/languages";
import type { Interaction } from "@/lib/types";

export default function InteractionDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [i, setI] = useState<Interaction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = () => api<{ interaction: Interaction }>(`/api/calls/${id}`).then((r) => setI(r.interaction)).catch((e) => setError(e.message));
  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) return <div className="space-y-3"><LinkButton href="/interactions" variant="ghost">← Call History</LinkButton><ErrorBox message={error} onRetry={load} /></div>;
  if (!i) return <Spinner />;
  const s = i.postCall.summary;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/interactions" className="text-xs text-gray-500 hover:underline">← Call History</Link>
          <h1 className="text-xl font-bold">Interaction <span className="font-mono">{i.id}</span></h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
            <ModeBadge mode={i.mode} /><StatusBadge status={i.status} />
            <span>· {fmtTime(i.createdAt)} · {fmtDuration(i.durationSec)} · {i.outcome ?? "—"}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <LinkButton href={`/sellers/${i.glid}`}>Seller {i.glid}</LinkButton>
          <LinkButton href={`/call/${i.glid}`} variant="primary">Call again</LinkButton>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card title="Transcript / conversation events" className="lg:col-span-3">
          <ol className="space-y-2">
            {i.turns.map((t) => (
              <li key={t.id} className="text-sm">
                <div className="flex flex-wrap items-center gap-1.5 text-xs text-gray-500">
                  <span className={`font-semibold ${t.speaker === "agent" ? "text-brand-700" : "text-gray-800"}`}>{t.speaker === "agent" ? "Agent" : "Seller"}</span>
                  <span>{fmtTime(t.at)}</span><span>· {languageName(t.language)}</span>
                  {t.voice && <span>· {t.voice.gender} voice ({t.voice.speaker})</span>}
                  {t.signals?.map((x) => <Badge key={x} tone="red">{x.replace("_", " ")}</Badge>)}
                </div>
                <div className="whitespace-pre-wrap">{t.text}</div>
              </li>
            ))}
          </ol>
        </Card>
        <div className="space-y-4 lg:col-span-2">
          <Card title={`Persona-switch log (${i.switchLog.length})`}>
            <ol className="space-y-2 text-xs">
              {i.switchLog.map((w) => (
                <li key={w.id} className="rounded-lg border border-gray-200 p-2">
                  <div className="flex justify-between"><strong>{w.dimension}</strong><Badge tone={w.scope === "temporary" ? "gray" : "violet"}>{w.scope}</Badge></div>
                  <div>{w.previous} → <strong>{w.next}</strong></div>
                  <div className="text-gray-600">{w.signal} — {w.reason}</div>
                </li>
              ))}
              {i.switchLog.length === 0 && <li className="text-gray-500">No adaptations.</li>}
            </ol>
          </Card>
          <Card title="Initial persona">
            <p className="text-sm">{i.initialPersona.summary}</p>
            <p className="mt-2 text-xs text-gray-500">Generated from profile version {fmtTime(i.profileVersionAt)}</p>
          </Card>
          <Card title={<span className="flex items-center gap-2">Profile changes <StatusBadge status={i.postCall.status} /></span>}>
            {i.postCall.status === "failed" && <ErrorBox message={i.postCall.error ?? "failed"} />}
            {s ? (
              <ul className="space-y-1.5 text-xs">
                {s.updates.map((u, k) => <li key={k}><strong>{u.field}</strong>: {u.from} → {u.to}<div className="text-gray-600">{u.reason}</div></li>)}
                {s.memoryAdded.map((m) => <li key={m}>Remembered: {m}</li>)}
                {s.rejected.map((u, k) => <li key={`r${k}`} className="text-gray-500">Not applied — {u.field}: {u.to}. {u.reason}</li>)}
                {s.updates.length + s.memoryAdded.length === 0 && <li className="text-gray-500">No profile changes.</li>}
              </ul>
            ) : <p className="text-xs text-gray-500">No post-call summary.</p>}
          </Card>
        </div>
      </div>
    </div>
  );
}
