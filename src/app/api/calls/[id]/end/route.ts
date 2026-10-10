import { handle, json } from "@/lib/api";
import { endCall } from "@/lib/calls";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const body = (await req.json().catch(() => ({}))) as { reason?: "operator" | "agent" | "provider" };
    return json({ interaction: await endCall((await params).id, body.reason ?? "operator") });
  });
}
