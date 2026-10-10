import { handle, json } from "@/lib/api";
import { sellerTurn } from "@/lib/calls";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const body = (await req.json().catch(() => ({}))) as { text?: string; languageCode?: string | null; probability?: number | null; fillerSpoken?: boolean };
    return json(await sellerTurn((await params).id, body.text ?? "", { languageCode: body.languageCode, probability: body.probability, fillerSpoken: body.fillerSpoken === true }));
  });
}
