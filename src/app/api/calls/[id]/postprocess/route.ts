import { fail, handle, json } from "@/lib/api";
import { getCall, runPostCall } from "@/lib/calls";

export const dynamic = "force-dynamic";

/** Safe retry of post-call processing (idempotent once it has succeeded). */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const id = (await params).id;
    const i = getCall(id);
    if (!["Completed", "Cancelled", "Failed"].includes(i.status)) return fail("Call has not ended yet", 409);
    return json({ interaction: await runPostCall(id) });
  });
}
