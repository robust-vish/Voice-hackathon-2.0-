"use client";

import { useEffect, useState } from "react";
import { SellerCard } from "@/components/SellerCard";
import { Button, DemoNotice, Empty, ErrorBox, Spinner } from "@/components/ui";
import { api } from "@/lib/client";
import { LANGUAGES } from "@/lib/languages";
import type { SellerSummary } from "@/lib/summaries";

interface ListResp { total: number; page: number; pageSize: number; items: SellerSummary[] }

export default function SellerExplorer() {
  const [q, setQ] = useState("");
  const [language, setLanguage] = useState("");
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ListResp | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = () => {
    setLoading(true);
    setError(null);
    const p = new URLSearchParams({ q, language, status, category, page: String(page), pageSize: "9" });
    api<ListResp>(`/api/sellers?${p}`)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, language, status, category, page]);

  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const sel = "rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm";

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold">Seller Explorer</h1>
      <DemoNotice />
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-gray-200 bg-white p-3">
        <label className="flex flex-col text-xs text-gray-600">GLID / name
          <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="DEMO_GLID_00…" className={`${sel} w-56`} />
        </label>
        <label className="flex flex-col text-xs text-gray-600">Language
          <select value={language} onChange={(e) => { setLanguage(e.target.value); setPage(1); }} className={sel}>
            <option value="">All</option>
            {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
          </select>
        </label>
        <label className="flex flex-col text-xs text-gray-600">Profile status
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className={sel}>
            <option value="">All</option>
            {["New", "Provisional", "Established", "Registry only"].map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
        <label className="flex flex-col text-xs text-gray-600">Category
          <input value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }} placeholder="e.g. steel" className={`${sel} w-40`} />
        </label>
        {loading && <Spinner label="Searching…" />}
        {data && <span className="ml-auto text-xs text-gray-500">{data.total} seller(s)</span>}
      </div>

      {error && <ErrorBox message={error} onRetry={load} />}
      {data && data.items.length === 0 && <Empty title="No sellers match these filters" />}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data?.items.map((s) => <SellerCard key={s.glid} s={s} />)}
      </div>
      {data && pages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
          <span className="text-sm text-gray-600">Page {page} of {pages}</span>
          <Button variant="secondary" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      )}
    </div>
  );
}
