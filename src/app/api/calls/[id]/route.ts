import { handle, json } from "@/lib/api";
import { getCall } from "@/lib/calls";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => json({ interaction: getCall((await params).id) }));
}
