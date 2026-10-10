"use client";

import Link from "next/link";
import { AlertTriangle, Loader2, Inbox } from "lucide-react";
import type { ReactNode } from "react";

export function Card({ children, className = "", title, action }: { children: ReactNode; className?: string; title?: ReactNode; action?: ReactNode }) {
  return (
    <section className={`rounded-xl border border-gray-200 bg-white shadow-sm ${className}`}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
          {action}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

const TONES: Record<string, string> = {
  gray: "bg-gray-100 text-gray-700 ring-gray-200",
  red: "bg-brand-50 text-brand-700 ring-brand-200",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  amber: "bg-amber-50 text-amber-800 ring-amber-200",
  blue: "bg-sky-50 text-sky-700 ring-sky-200",
  violet: "bg-violet-50 text-violet-700 ring-violet-200",
};

export function Badge({ children, tone = "gray", className = "" }: { children: ReactNode; tone?: keyof typeof TONES | string; className?: string }) {
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${TONES[tone] ?? TONES.gray} ${className}`}>{children}</span>;
}

export function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "Established" || status === "Completed" || status === "done" ? "green" :
    status === "Provisional" || status === "Preparing" || status === "Ending" || status === "processing" ? "amber" :
    status === "In Progress" || status === "Connected" || status === "Initiating" ? "blue" :
    status === "Failed" || status === "failed" ? "red" :
    status === "New" || status === "Registry only" ? "violet" : "gray";
  return <Badge tone={tone}>{status}</Badge>;
}

export function ModeBadge({ mode }: { mode: string }) {
  if (mode === "simulated") return <Badge tone="amber">Simulated</Badge>;
  if (mode === "web") return <Badge tone="blue">Web voice (not PSTN)</Badge>;
  return <Badge tone="green">Phone (PSTN)</Badge>;
}

export function Spinner({ label = "Loading…" }: { label?: string }) {
  return (
    <div role="status" className="flex items-center gap-2 text-sm text-gray-500">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> {label}
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex items-start gap-3 rounded-lg border border-brand-200 bg-brand-50 p-3 text-sm text-brand-700">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div className="flex-1">{message}</div>
      {onRetry && <button onClick={onRetry} className="rounded-md bg-white px-2 py-1 text-xs font-medium ring-1 ring-brand-200 hover:bg-brand-100">Retry</button>}
    </div>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-gray-200 p-8 text-center text-sm text-gray-500">
      <Inbox className="h-6 w-6 text-gray-400" aria-hidden />
      <div className="font-medium text-gray-700">{title}</div>
      {children}
    </div>
  );
}

type BtnProps = { children: ReactNode; onClick?: () => void; disabled?: boolean; variant?: "primary" | "secondary" | "ghost" | "danger"; className?: string; type?: "button" | "submit"; title?: string; "aria-label"?: string };

const VARIANTS = {
  primary: "bg-brand-600 text-white hover:bg-brand-700 disabled:bg-brand-200",
  secondary: "bg-white text-gray-800 ring-1 ring-gray-300 hover:bg-gray-50 disabled:text-gray-400",
  ghost: "text-gray-700 hover:bg-gray-100 disabled:text-gray-300",
  danger: "bg-gray-900 text-white hover:bg-black disabled:bg-gray-300",
};

export function Button({ children, onClick, disabled, variant = "primary", className = "", type = "button", ...rest }: BtnProps) {
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed ${VARIANTS[variant]} ${className}`} {...rest}>
      {children}
    </button>
  );
}

export function LinkButton({ href, children, variant = "secondary", className = "" }: { href: string; children: ReactNode; variant?: keyof typeof VARIANTS; className?: string }) {
  return (
    <Link href={href} className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition ${VARIANTS[variant]} ${className}`}>
      {children}
    </Link>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs uppercase tracking-wide text-gray-500">{label}</dt>
      <dd className="mt-0.5 truncate text-sm text-gray-900">{children}</dd>
    </div>
  );
}

export function DemoNotice() {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
      <strong>Demo data:</strong> all sellers, GLIDs, catalogs and counts shown here are synthetic demonstration data, not real IndiaMART sellers or business metrics.
    </div>
  );
}

export function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  return (
    <div className="flex items-center gap-2" aria-label={`Confidence ${value}`}>
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-gray-100">
        <div className={`h-full ${pct >= 75 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-gray-400"}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs tabular-nums text-gray-600">{value.toFixed(2)}</span>
    </div>
  );
}
