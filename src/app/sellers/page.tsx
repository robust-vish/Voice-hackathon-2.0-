"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { SellerRow } from "@/components/SellerCard";
import { Button, Card, Empty, ErrorBox, PageHeader, Spinner } from "@/components/ui";
import { api } from "@/lib/client";
import { LANGUAGES } from "@/lib/languages";
import type { SellerSummary } from "@/lib/summaries";

interface ListResp { total: number; page: number; pageSize: number; items: SellerSummary[] }

export default function SellerExplorer() {
  const [q, setQ] = useState("");
  const [language, setLanguage] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ListResp | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = () => {
    setLoading(true);
    setError(null);
    const p = new URLSearchParams({ q, language, status, page: String(page), pageSize: "12" });
    api<ListResp>(`/api/sellers?${p}`)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, language, status, page]);

  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const sel = "rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500";

  return (
    <div>
      <PageHeader title="Sellers" subtitle={data ? `${data.total} seller${data.total === 1 ? "" : "s"}` : " "} />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
          <input aria-label="Search by GLID or name" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search by GLID or name" className={`${sel} w-full pl-9`} />
        </div>
        <select aria-label="Language" value={language} onChange={(e) => { setLanguage(e.target.value); setPage(1); }} className={sel}>
          <option value="">All languages</option>
          {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
        </select>
        <select aria-label="Profile status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className={sel}>
          <option value="">All statuses</option>
          {["New", "Provisional", "Established", "Registry only"].map((s) => <option key={s}>{s}</option>)}
        </select>
        {loading && <Spinner label="" />}
      </div>

      {error && <ErrorBox message={error} onRetry={load} />}
      <Card padded={false}>
        <div className="hidden items-center gap-4 border-b border-gray-100 px-5 py-2.5 text-[11px] font-medium uppercase tracking-wide text-gray-400 lg:flex">
          <span className="flex-1">Seller</span><span className="flex-[1.2]">BuyLead categories</span><span className="w-24">Status</span><span className="w-28">Last call</span><span className="w-[92px]" />
        </div>
        <div className="divide-y divide-gray-100">
          {data?.items.map((s) => <SellerRow key={s.glid} s={s} />)}
        </div>
        {data && data.items.length === 0 && <div className="p-5"><Empty title="No sellers match" /></div>}
      </Card>
      {data && pages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3">
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
          <span className="text-sm text-gray-500">Page {page} of {pages}</span>
          <Button variant="secondary" size="sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      )}
    </div>
  );
}
