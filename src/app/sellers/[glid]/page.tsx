"use client";

import { use } from "react";
import { SellerDetail } from "@/components/SellerDetail";

export default function SellerProfilePage({ params }: { params: Promise<{ glid: string }> }) {
  const { glid } = use(params);
  return <SellerDetail glid={glid} />;
}
