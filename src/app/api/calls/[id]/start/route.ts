import { handle, json } from "@/lib/api";
import { startCall } from "@/lib/calls";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => json(await startCall((await params).id)));
}
