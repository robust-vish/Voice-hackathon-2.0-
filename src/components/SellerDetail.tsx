"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, Building2, MapPin, Phone, Smartphone } from "lucide-react";
import { Markdown } from "./Markdown";
import { PersonaGrid } from "./PersonaGrid";
import { Avatar, Badge, Button, Card, Chip, Empty, ErrorBox, Field, LinkButton, ModeBadge, Spinner, StatusBadge, Tabs } from "./ui";
import { useSeller } from "./useSeller";
import { api, fmtTime } from "@/lib/client";
import { languageName } from "@/lib/languages";
import { ALLOWED_VALUES, PREF_LABEL, PREF_ORDER } from "@/lib/prefs-meta";
import type { PreferenceKey } from "@/lib/types";

export type SellerTab = "overview" | "persona" | "buyleads" | "files";

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
  const cls = "rounded-lg border border-gray-200 px-2.5 py-2 text-sm";
  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <select aria-label="Field" className={cls} value={field} onChange={(e) => setField(e.target.value as PreferenceKey)}>
          {PREF_ORDER.map((k) => <option key={k} value={k}>{PREF_LABEL[k]}</option>)}
        </select>
        {options ? (
          <select aria-label="Value" className={cls} value={value} onChange={(e) => setValue(e.target.value)}>
            {options.map((o) => <option key={o} value={o}>{field === "language" ? languageName(o) : o}</option>)}
          </select>
        ) : (
          <input aria-label="Value" className={cls} value={value} maxLength={60} onChange={(e) => setValue(e.target.value)} placeholder="e.g. after 4 PM" />
        )}
        <input aria-label="Reason" className={`${cls} min-w-[220px] flex-1`} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reason (required)" />
        <Button type="submit" disabled={busy || !note.trim() || !value.trim()}>{busy ? "Saving…" : "Save"}</Button>
      </div>
      {msg && <p role="status" className={`text-sm ${msg.ok ? "text-emerald-700" : "text-brand-700"}`}>{msg.text}</p>}
      <p className="text-xs text-gray-500">Saved as a <Badge tone="violet">manual</Badge> override — never presented as learned, and calls won't silently overwrite it.</p>
    </form>
  );
}

export function SellerDetail({ glid, initialTab = "overview" }: { glid: string; initialTab?: SellerTab }) {
  const { data, error, loading, reload } = useSeller(glid);
  const [tab, setTab] = useState<SellerTab>(initialTab);
  const [md, setMd] = useState<string | null>(null);
  const [showJson, setShowJson] = useState(false);

  useEffect(() => {
    if (tab === "files" && data) api<string>(`/api/sellers/${glid}/markdown`).then(setMd).catch(() => setMd(null));
  }, [tab, data?.profile.updatedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading && !data) return <Spinner label={`Loading ${glid}…`} />;
  if (error) return (
    <div className="space-y-3">
      <LinkButton href="/sellers" variant="ghost"><ArrowLeft className="h-4 w-4" />Sellers</LinkButton>
      <ErrorBox message={error.status === 404 ? `No seller with GLID ${glid} exists in the registry.` : error.message} onRetry={error.status === 404 ? undefined : reload} />
    </div>
  );
  if (!data) return null;
  const p = data.profile;
  const cats = p.leadCategories ?? [];
  const leads = p.buyLeads ?? [];
  const title = p.contactPerson ?? p.displayName;

  return (
    <div className="space-y-6">
      <Link href="/sellers" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800"><ArrowLeft className="h-4 w-4" />Sellers</Link>

      {/* Header */}
      <div className="flex flex-wrap items-center gap-4">
        <Avatar name={title} seed={p.glid} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900">{title}</h1>
            <StatusBadge status={p.status} />
            {p.isDemo && <Badge>Demo</Badge>}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
            <span className="font-mono">GLID {p.glid}</span>
            {p.companyName && <span className="inline-flex items-center gap-1"><Building2 className="h-3.5 w-3.5" />{p.companyName}</span>}
            {(p.location ?? p.city) && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{p.location ?? p.city}</span>}
            {p.contact.mobileMasked && <span className="inline-flex items-center gap-1"><Smartphone className="h-3.5 w-3.5" />{p.contact.mobileMasked}</span>}
          </div>
        </div>
        <LinkButton href={`/call/${p.glid}`} variant="primary"><Phone className="h-4 w-4" />Call seller</LinkButton>
      </div>
      {data.initialised && <div className="rounded-xl bg-sky-50 px-4 py-2 text-sm text-sky-800">New profile created from registry details.</div>}

      <Tabs<SellerTab>
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "overview", label: "Overview" },
          { id: "persona", label: "Persona" },
          { id: "buyleads", label: "BuyLeads", count: cats.length || leads.length || undefined },
          { id: "files", label: "Files" },
        ]}
      />

      {tab === "overview" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Card title={cats.length ? "BuyLead categories" : "Deals in"}>
              <div className="flex flex-wrap gap-2">
                {(cats.length ? cats.map((c) => c.name) : p.dealsIn ?? []).map((n) => <Chip key={n}>{n}</Chip>)}
                {!cats.length && !p.dealsIn?.length && <span className="text-sm text-gray-500">Not known yet.</span>}
              </div>
            </Card>
            <Card title="What they've told us">
              {p.memory.length === 0 ? <p className="text-sm text-gray-500">Nothing yet — notes from calls appear here.</p> : (
                <ul className="space-y-3">
                  {p.memory.slice().reverse().slice(0, 6).map((m) => (
                    <li key={m.id} className="text-sm">
                      <div className="text-gray-900">{m.fact}</div>
                      <div className="mt-0.5 text-xs text-gray-400">{m.category} · {fmtTime(m.at)}</div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            {p.catalog.length > 0 && (
              <Card title={`Catalog · ${p.catalog.length}`}>
                <ul className="divide-y divide-gray-100 text-sm">
                  {p.catalog.map((c) => (
                    <li key={c.productId} className="flex items-center justify-between gap-3 py-2">
                      <span>{c.name}</span>
                      {c.price != null ? <span className="tabular-nums text-gray-700">₹{c.price}/{c.unit ?? "unit"}</span> : <Badge tone="red">Price missing</Badge>}
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </div>
          <div className="space-y-6">
            <Card title="Details">
              <dl className="grid grid-cols-2 gap-4">
                <Field label="Language">{languageName(p.preferences.language.value)}</Field>
                <Field label="Agent voice">{p.preferences.voiceGender.value}</Field>
                <Field label="Calls">{p.interactionCount}</Field>
                <Field label="Last call">{fmtTime(p.lastInteractionAt)}</Field>
                <Field label="Membership">{p.membership?.replace(" (demo)", "") ?? "—"}</Field>
                <Field label="Updated">{fmtTime(p.updatedAt)}</Field>
              </dl>
            </Card>
            <Card title="Recent calls">
              {p.history.length === 0 ? <p className="text-sm text-gray-500">No calls yet.</p> : (
                <ul className="space-y-3">
                  {p.history.slice().reverse().slice(0, 5).map((h) => (
                    <li key={h.interactionId} className="text-sm">
                      <div className="flex items-center gap-2"><ModeBadge mode={h.mode} /><span className="text-xs text-gray-400">{fmtTime(h.at)}</span></div>
                      {h.interactionId.startsWith("SEED_") ? <div className="mt-0.5 text-gray-700">{h.outcome}</div> : <Link href={`/interactions/${h.interactionId}`} className="mt-0.5 block text-gray-700 hover:underline">{h.outcome}</Link>}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>
      )}

      {tab === "persona" && (
        <div className="space-y-6">
          <Card title="How the agent will talk to this seller">
            <p className="mb-4 text-sm text-gray-600">{data.persona.summary}</p>
            <PersonaGrid persona={data.persona} />
          </Card>
          <div className="grid gap-6 lg:grid-cols-2">
            <Card title="Call plan">
              <ol className="space-y-2 text-sm">
                {data.plan.steps.map((s, k) => (
                  <li key={s.id} className="flex gap-3"><span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-gray-100 text-[11px] font-semibold text-gray-600">{k + 1}</span><span><span className="font-medium">{s.title}.</span> <span className="text-gray-600">{s.goal}</span></span></li>
                ))}
              </ol>
            </Card>
            <Card title="Manual override">
              <ManualEdit glid={p.glid} onSaved={reload} />
            </Card>
          </div>
        </div>
      )}

      {tab === "buyleads" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card title="Categories consumed">
            {cats.length === 0 ? <Empty title="No categories on record" /> : (
              <ul className="divide-y divide-gray-100 text-sm">
                {cats.map((c) => (
                  <li key={c.mcatId} className="flex items-center justify-between py-2"><span>{c.name}</span><span className="font-mono text-xs text-gray-400">MCAT {c.mcatId}</span></li>
                ))}
              </ul>
            )}
          </Card>
          <Card title="BuyLeads">
            <p className="mb-3 text-xs text-gray-500">Each BuyLead is identified by its offer ID and expires once it's consumed.</p>
            {leads.length === 0 ? <Empty title="No individual BuyLeads on record" /> : (
              <ul className="divide-y divide-gray-100 text-sm">
                {leads.map((b) => (
                  <li key={b.offerId} className="flex items-start justify-between gap-3 py-2.5">
                    <div><div className="text-gray-900">{b.title}</div><div className="font-mono text-xs text-gray-400">Offer ID {b.offerId}</div></div>
                    {b.status === "active" ? <Badge tone="green">Active</Badge> : <Badge>Expired · consumed {b.consumedAt ? fmtTime(b.consumedAt) : ""}</Badge>}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}

      {tab === "files" && (
        <div className="space-y-6">
          <Card title="Markdown profile" action={<span className="font-mono text-xs text-gray-400">data/sellers/{p.glid}.md</span>}>
            {md ? <Markdown source={md} /> : <Spinner />}
          </Card>
          <Card title="JSON profile" action={<button className="text-xs font-medium text-brand-700 hover:underline" onClick={() => setShowJson((s) => !s)}>{showJson ? "Hide" : "Show"}</button>}>
            <p className="text-xs text-gray-500">Stored at <code>data/sellers/{p.glid}.json</code> · schema v{p.schemaVersion}. Mobile numbers are stored masked only.</p>
            {showJson && <pre className="mt-3 max-h-[480px] overflow-auto rounded-xl bg-gray-950 p-4 text-xs text-gray-100">{JSON.stringify(p, null, 2)}</pre>}
          </Card>
          <Card title="Change log">
            <ul className="space-y-2 text-sm">
              {p.changeLog.slice().reverse().slice(0, 25).map((c, k) => (
                <li key={k}>
                  <span className="font-medium">{PREF_LABEL[c.field as PreferenceKey] ?? c.field}</span>: {c.from} → <strong>{c.to}</strong> <Badge tone={c.source === "manual" ? "violet" : c.source === "learned" ? "green" : "gray"}>{c.source}</Badge>
                  <div className="text-xs text-gray-500">{fmtTime(c.at)} · {c.reason}</div>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}
    </div>
  );
}
