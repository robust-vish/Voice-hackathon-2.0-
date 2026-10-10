"use client";

import { Eye, FileText, Phone } from "lucide-react";
import type { SellerSummary } from "@/lib/summaries";
import { languageName } from "@/lib/languages";
import { fmtTime } from "@/lib/client";
import { Badge, Field, LinkButton, StatusBadge } from "./ui";

export function SellerActions({ glid }: { glid: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      <LinkButton href={`/sellers/${glid}/persona`}><Eye className="h-4 w-4" aria-hidden />View Persona</LinkButton>
      <LinkButton href={`/sellers/${glid}`}><FileText className="h-4 w-4" aria-hidden />View Profile</LinkButton>
      <LinkButton href={`/call/${glid}`} variant="primary"><Phone className="h-4 w-4" aria-hidden />Call Seller</LinkButton>
    </div>
  );
}

export function SellerCard({ s, detailed = false }: { s: SellerSummary; detailed?: boolean }) {
  return (
    <article className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-gray-900">{s.displayName}</h3>
          <div className="font-mono text-xs text-gray-500">{s.glid}</div>
        </div>
        <div className="flex gap-1.5">
          {s.isDemo && <Badge tone="amber">Demo</Badge>}
          <StatusBadge status={s.status} />
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-3">
        <Field label="Category">{s.category}</Field>
        <Field label="Preferred language">{languageName(s.preferredLanguage)}</Field>
        <Field label="Interactions">{s.interactionCount}</Field>
        <Field label="Last interaction">{fmtTime(s.lastInteractionAt)}</Field>
        {detailed && (
          <>
            <Field label="Contact person">{s.contactPerson ?? "—"}</Field>
            <Field label="Location">{[s.city, s.state].filter(Boolean).join(", ") || "—"}</Field>
            <Field label="Membership">{s.membership ?? "—"}</Field>
            <Field label="Catalog products">{s.catalogCount}</Field>
            <Field label="PNS mapping">{s.pnsMapped ? "Mapped" : "Not mapped"}</Field>
            <Field label="Last profile update">{fmtTime(s.updatedAt)}</Field>
          </>
        )}
      </dl>
      <p className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-700"><span className="font-semibold">Persona: </span>{s.personaSummary}</p>
      <SellerActions glid={s.glid} />
    </article>
  );
}
