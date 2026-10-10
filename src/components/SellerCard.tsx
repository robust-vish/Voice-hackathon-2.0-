"use client";

import Link from "next/link";
import { useState } from "react";
import { MapPin, MoreHorizontal, Phone } from "lucide-react";
import type { SellerSummary } from "@/lib/summaries";
import { fmtTime } from "@/lib/client";
import { Avatar, Badge, Chip, LinkButton, StatusBadge } from "./ui";

export function sellerLabel(s: { displayName: string; contactPerson?: string; companyName?: string }) {
  return s.contactPerson ?? s.displayName;
}

/** Compact list row used on Overview, Sellers and Search. */
export function SellerRow({ s, compact = false }: { s: SellerSummary; compact?: boolean }) {
  const [menu, setMenu] = useState(false);
  const cats = s.leadCategories.length ? s.leadCategories : s.dealsIn;
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5 transition hover:bg-gray-50/70">
      <Link href={`/sellers/${s.glid}`} className="flex min-w-0 flex-1 items-center gap-3">
        <Avatar name={s.contactPerson ?? s.displayName} seed={s.glid} />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold text-gray-900">{sellerLabel(s)}</span>
            {s.isDemo && <Badge>Demo</Badge>}
          </div>
          <div className="flex flex-wrap items-center gap-x-2 text-xs text-gray-500">
            <span className="font-mono">{s.glid}</span>
            {s.companyName && <span>· {s.companyName}</span>}
            {s.location && <span className="inline-flex items-center gap-0.5">· <MapPin className="h-3 w-3" aria-hidden />{s.location}</span>}
          </div>
        </div>
      </Link>
      {!compact && (
        <div className="hidden min-w-0 flex-[1.2] flex-wrap gap-1.5 md:flex">
          {cats.slice(0, 3).map((c) => <Chip key={c}>{c}</Chip>)}
          {cats.length > 3 && <span className="text-xs text-gray-400">+{cats.length - 3}</span>}
        </div>
      )}
      {!compact && <div className="hidden w-24 lg:block"><StatusBadge status={s.status} /></div>}
      {!compact && <div className="hidden w-28 text-xs text-gray-500 lg:block">{s.lastInteractionAt ? fmtTime(s.lastInteractionAt) : "No calls yet"}</div>}
      <div className="relative flex items-center gap-1">
        <LinkButton href={`/call/${s.glid}`} variant="primary" size="sm"><Phone className="h-3.5 w-3.5" aria-hidden />Call</LinkButton>
        {!compact && (
          <>
            <button aria-label="More actions" aria-expanded={menu} onClick={() => setMenu((m) => !m)} onBlur={() => setTimeout(() => setMenu(false), 150)}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"><MoreHorizontal className="h-4 w-4" /></button>
            {menu && (
              <div className="absolute right-0 top-9 z-20 w-40 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 text-sm shadow-lg">
                <Link className="block px-3 py-2 hover:bg-gray-50" href={`/sellers/${s.glid}`}>View profile</Link>
                <Link className="block px-3 py-2 hover:bg-gray-50" href={`/sellers/${s.glid}/persona`}>View persona</Link>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/** Kept for the search result page. */
export function SellerCard({ s }: { s: SellerSummary; detailed?: boolean }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200/70 bg-white">
      <SellerRow s={s} />
    </div>
  );
}
