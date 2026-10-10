"use client";

import { use } from "react";
import { SellerDetail, type SellerTab } from "@/components/SellerDetail";

const TABS: SellerTab[] = ["overview", "persona", "buyleads", "profile"];

export default function SellerProfilePage({ params, searchParams }: { params: Promise<{ glid: string }>; searchParams: Promise<{ tab?: string }> }) {
  const { glid } = use(params);
  const { tab } = use(searchParams);
  const initialTab = TABS.includes(tab as SellerTab) ? (tab as SellerTab) : "overview";
  return <SellerDetail key={initialTab} glid={glid} initialTab={initialTab} />;
}
