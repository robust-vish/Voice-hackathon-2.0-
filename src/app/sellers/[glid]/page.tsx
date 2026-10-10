"use client";

import Link from "next/link";
import { use, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { SellerActions } from "@/components/SellerCard";
import { Badge, Card, Empty, ErrorBox, Field, LinkButton, ModeBadge, Spinner, StatusBadge } from "@/components/ui";
import { useSeller } from "@/components/useSeller";
import { fmtTime } from "@/lib/client";
import { languageName } from "@/lib/languages";

export default function SellerProfilePage({ params }: { params: Promise<{ glid: string }> }) {
  const { glid } = use(params);
  const { data, error, loading, reload } = useSeller(glid);
  const [showJson, setShowJson] = useState(false);

  if (loading && !data) return <Spinner label={`Loading ${glid}…`} />;
  if (error) return (
    <div className="space-y-3">
      <LinkButton href="/search" variant="ghost"><ArrowLeft className="h-4 w-4" />Back to search</LinkButton>
      <ErrorBox message={error.status === 404 ? `No seller with GLID ${glid.toUpperCase()} exists in the registry.` : error.message} onRetry={error.status === 404 ? undefined : reload} />
    </div>
  );
  if (!data) return null;
  const p = data.profile;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/sellers" className="text-xs text-gray-500 hover:underline">← Seller Explorer</Link>
          <h1 className="text-xl font-bold">{p.displayName}</h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
            <span className="font-mono">{p.glid}</span><StatusBadge status={p.status} />{p.isDemo && <Badge tone="amber">Synthetic demo seller</Badge>}
          </div>
        </div>
        <SellerActions glid={p.glid} />
      </div>
      {data.initialised && <div className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-800">Provisional profile initialised from registry metadata.</div>}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Seller details" className="lg:col-span-2">
          <dl className="grid grid-cols-2 gap-4 md:grid-cols-3">
            <Field label="Contact person">{p.contactPerson ?? "—"}</Field>
            <Field label="Category">{p.category}</Field>
            <Field label="Location">{[p.city, p.state].filter(Boolean).join(", ") || "—"}</Field>
            <Field label="Membership">{p.membership ?? "—"}</Field>
            <Field label="TrustSEAL">{p.trustSeal ? "Yes" : "No"}</Field>
            <Field label="GST">{p.gstVerified ? "Verified" : "Not verified"}</Field>
            <Field label="PNS mapping">{p.contact.pnsMapped ? `Mapped · ${p.contact.pnsNumberMasked ?? "masked"}` : "Not mapped"}</Field>
            <Field label="Preferred language">{languageName(p.preferences.language.value)}</Field>
            <Field label="Secondary language">{p.secondaryLanguage ? languageName(p.secondaryLanguage) : "—"}</Field>
            <Field label="Interactions">{p.interactionCount}</Field>
            <Field label="Last interaction">{fmtTime(p.lastInteractionAt)}</Field>
            <Field label="Profile updated">{fmtTime(p.updatedAt)}</Field>
          </dl>
        </Card>
        <Card title="Behaviour">
          <p className="text-sm text-gray-700">{p.behaviour.summary}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">{p.behaviour.traits.map((t) => <Badge key={t} tone="violet">{t}</Badge>)}</div>
          <p className="mt-3 text-xs text-gray-500">Persona: {data.persona.summary}</p>
        </Card>
      </div>

      <Card title={`Catalog (${p.catalog.length} products)`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-gray-500"><tr><th className="py-1.5 pr-3">Offer ID</th><th className="pr-3">Product</th><th className="pr-3">Price</th><th className="pr-3">MOQ</th><th>Specs</th></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {p.catalog.map((c) => (
                <tr key={c.offerId}>
                  <td className="py-2 pr-3 font-mono text-xs">{c.offerId}</td>
                  <td className="pr-3">{c.name}</td>
                  <td className="pr-3">{c.price != null ? `₹${c.price}/${c.unit ?? "unit"}` : <Badge tone="red">Missing</Badge>}</td>
                  <td className="pr-3">{c.moq ?? "—"}</td>
                  <td className="text-xs text-gray-500">{c.specs ? Object.entries(c.specs).map(([k, v]) => `${k}: ${v}`).join(" · ") : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {p.buyLeadInterests.length > 0 && <p className="mt-3 text-xs text-gray-600"><strong>BuyLead interests:</strong> {p.buyLeadInterests.join(" · ")}</p>}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="What the seller has told us">
          {p.memory.length === 0 ? <Empty title="Nothing recorded yet" /> : (
            <ul className="space-y-2 text-sm">
              {p.memory.slice().reverse().map((m) => (
                <li key={m.id} className="rounded-lg bg-gray-50 p-2">
                  <div className="flex items-center gap-2"><Badge>{m.category}</Badge><span className="text-xs text-gray-500">{fmtTime(m.at)} · {m.source}</span></div>
                  <div className="mt-1">{m.fact}</div>
                  {m.quote && <div className="mt-0.5 text-xs italic text-gray-500">“{m.quote}”</div>}
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Interaction history">
          {p.history.length === 0 ? <Empty title="No calls yet" /> : (
            <ul className="divide-y divide-gray-100 text-sm">
              {p.history.slice().reverse().map((h) => (
                <li key={h.interactionId} className="flex flex-wrap items-center gap-2 py-2">
                  {h.interactionId.startsWith("SEED_") ? <span className="font-mono text-xs text-gray-500">{h.interactionId}</span> : <Link className="font-mono text-xs text-brand-700 underline" href={`/interactions/${h.interactionId}`}>{h.interactionId}</Link>}
                  <ModeBadge mode={h.mode} />
                  <span className="text-xs text-gray-500">{fmtTime(h.at)}</span>
                  <span className="w-full text-xs text-gray-700">{h.outcome} · {h.adaptations} adaptations · {h.languagesUsed.map(languageName).join(", ")}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card title="Profile change log">
        <ul className="space-y-1.5 text-sm">
          {p.changeLog.slice().reverse().slice(0, 30).map((c, idx) => (
            <li key={idx} className="flex flex-wrap gap-x-2">
              <span className="text-xs text-gray-500">{fmtTime(c.at)}</span>
              <span className="font-medium">{c.field}</span>
              <span>{c.from} → <strong>{c.to}</strong></span>
              <Badge tone={c.source === "manual" ? "violet" : c.source === "learned" ? "green" : "gray"}>{c.source}</Badge>
              <span className="w-full text-xs text-gray-600">{c.reason}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Raw profile files" action={<div className="flex gap-2"><button className="text-xs font-medium text-brand-700 underline" onClick={() => setShowJson((s) => !s)}>{showJson ? "Hide" : "Show"} JSON</button><Link className="text-xs font-medium text-brand-700 underline" href={`/sellers/${p.glid}/persona#markdown`}>Markdown</Link></div>}>
        <p className="text-xs text-gray-500">Stored at <code>data/sellers/{p.glid}.json</code> and <code>data/sellers/{p.glid}.md</code> (schema v{p.schemaVersion}).</p>
        {showJson && <pre className="mt-3 max-h-[480px] overflow-auto rounded-lg bg-gray-900 p-3 text-xs text-gray-100">{JSON.stringify(p, null, 2)}</pre>}
      </Card>
    </div>
  );
}
