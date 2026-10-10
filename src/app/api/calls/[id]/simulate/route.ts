import { handle, json } from "@/lib/api";
import { simulateNext } from "@/lib/calls";

export const dynamic = "force-dynamic";

/** Advances the deterministic simulated seller by one utterance (runs the real turn pipeline). */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => json(await simulateNext((await params).id)));
}
