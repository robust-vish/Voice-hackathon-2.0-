"use client";

import Link from "next/link";
import { use, useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, Phone } from "lucide-react";
import { Markdown } from "@/components/Markdown";
import { PersonaGrid } from "@/components/PersonaGrid";
import { Badge, Button, Card, ErrorBox, LinkButton, Spinner, StatusBadge } from "@/components/ui";
import { useSeller } from "@/components/useSeller";
import { api, fmtTime } from "@/lib/client";
import { languageName } from "@/lib/languages";
import { ALLOWED_VALUES, PREF_LABEL, PREF_ORDER } from "@/lib/prefs-meta";
import type { PreferenceKey } from "@/lib/types";

function ManualEdit({ glid, onSaved }: { glid: string; onSaved: () => void }) {
  const [field, setField] = useState<PreferenceKey>("responseLength");
  const [value, setValue] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const options = field === "bestTimeToCall" ? null : ALLOWED_VALUES[field];
  useEffect(() => setValue(options ? options[0] : ""), [field]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await api(`/api/sellers/${glid}/persona`, { method: "PATCH", json: { field, value, note } });
      setMsg({ ok: true, text: `Saved ${PREF_LABEL[field]} = ${value} as a manual override.` });
      setNote("");
      onSaved();
    } catch (err) {
      setMsg({ ok: false, text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };
  const cls = "rounded-lg border border-gray-300 px-2 py-1.5 text-sm";
  return (
    <form onSubmit={submit} className="space-y-3">
      <p className="text-xs text-gray-600">Manual edits are validated and stored with source <Badge tone="violet">manual</Badge>. They are never presented as learned from conversations, and later calls will not silently overwrite them.</p>
      <div className="flex flex-wrap gap-2">
        <label className="flex flex-col text-xs text-gray-600">Field
          <select className={cls} value={field} onChange={(e) => setField(e.target.value as PreferenceKey)}>
            {PREF_ORDER.map((k) => <option key={k} value={k}>{PREF_LABEL[k]}</option>)}
          </select>
        </label>
        <label className="flex flex-col text-xs text-gray-600">Value
          {options ? (
            <select className={cls} value={value} onChange={(e) => setValue(e.target.value)}>
              {options.map((o) => <option key={o} value={o}>{field === "language" ? languageName(o) : o}</option>)}
            </select>
          ) : (
            <input className={cls} value={value} maxLength={60} onChange={(e) => setValue(e.target.value)} placeholder="e.g. after 4 PM" />
          )}
        </label>
        <label className="flex min-w-[220px] flex-1 flex-col text-xs text-gray-600">Reason (required)
          <input className={cls} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Seller told the account manager by email" />
        </label>
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={busy || !note.trim() || !value.trim()}>{busy ? "Saving…" : "Save manual override"}</Button>
        {msg && <span role="status" className={`text-sm ${msg.ok ? "text-emerald-700" : "text-brand-700"}`}>{msg.text}</span>}
      </div>
    </form>
  );
}

export default function PersonaInspector({ params }: { params: Promise<{ glid: string }> }) {
  const { glid } = use(params);
  const { data, error, loading, reload } = useSeller(glid);
  const [md, setMd] = useState<string | null>(null);
  const [mdErr, setMdErr] = useState<string | null>(null);

  const loadMd = () => api<string>(`/api/sellers/${glid}/markdown`).then(setMd).catch((e) => setMdErr(e.message));
  useEffect(() => { if (data) loadMd(); }, [data?.profile.updatedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading && !data) return <Spinner label="Fetching latest profile…" />;
  if (error) return <div className="space-y-3"><LinkButton href="/search" variant="ghost"><ArrowLeft className="h-4 w-4" />Back</LinkButton><ErrorBox message={error.status === 404 ? `No seller with GLID ${glid.toUpperCase()}.` : error.message} onRetry={reload} /></div>;
  if (!data) return null;
  const p = data.profile;
  const active = data.activeInteraction;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href={`/sellers/${p.glid}`} className="text-xs text-gray-500 hover:underline">← {p.displayName}</Link>
          <h1 className="text-xl font-bold">Persona Inspector</h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600"><span className="font-mono">{p.glid}</span><StatusBadge status={p.status} /><span>· created {fmtTime(p.createdAt)} · updated {fmtTime(p.updatedAt)}</span></div>
        </div>
        <LinkButton href={`/call/${p.glid}`} variant="primary"><Phone className="h-4 w-4" />Call Seller</LinkButton>
      </div>

      <Card title="Current persona (generated from the stored profile)">
        <p className="mb-3 text-sm text-gray-700">{data.persona.summary}</p>
        <PersonaGrid persona={data.persona} />
        <div className="mt-3 rounded-lg border border-gray-200 p-3 text-sm">
          <div className="text-xs uppercase tracking-wide text-gray-500">Best time to call</div>
          <div className="font-semibold">{p.preferences.bestTimeToCall.value}</div>
          <div className="text-xs text-gray-600">{p.preferences.bestTimeToCall.reason}</div>
        </div>
      </Card>

      {active && (
        <Card title={<span className="flex items-center gap-2">Active call overrides <StatusBadge status={active.status} /></span>} action={<Link className="text-xs font-medium text-brand-700 underline" href={`/call/${p.glid}`}>Open call</Link>}>
          {Object.keys(active.overrides).length === 0 ? <p className="text-sm text-gray-500">No overrides yet in call {active.id}.</p> : (
            <ul className="text-sm">{Object.entries(active.overrides).map(([k, v]) => <li key={k}><strong>{PREF_LABEL[k as PreferenceKey]}</strong>: {k === "language" ? languageName(v!) : v} <span className="text-xs text-gray-500">(this call only until post-call validation)</span></li>)}</ul>
          )}
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Conversation plan for the next call">
          <p className="text-sm font-medium">{data.plan.objective}</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">{data.plan.steps.map((s) => <li key={s.id}><strong>{s.title}:</strong> {s.goal}</li>)}</ol>
          <div className="mt-3 text-xs text-gray-600"><strong>Talking points:</strong> {data.plan.talkingPoints.join(" · ")}</div>
          <div className="mt-1 text-xs text-gray-600"><strong>Avoid:</strong> {data.plan.avoid.join(" · ")}</div>
        </Card>
        <Card title="Manual persona edit">
          <ManualEdit glid={p.glid} onSaved={reload} />
        </Card>
      </div>

      <Card title={<span id="markdown">Generated Markdown profile</span>} action={<span className="font-mono text-xs text-gray-500">data/sellers/{p.glid}.md</span>}>
        {mdErr && <ErrorBox message={mdErr} onRetry={loadMd} />}
        {!md && !mdErr && <Spinner />}
        {md && <Markdown source={md} />}
      </Card>
    </div>
  );
}
