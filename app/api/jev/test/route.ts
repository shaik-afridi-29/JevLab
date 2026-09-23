import { NextResponse } from "next/server";
import { callJevApi } from "@/lib/jev/client";

export async function GET() {
  const apiKey = process.env.TYPESAFE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ connected: false, reason: "missing_key" });
  }
  try {
    const { response, latencyMs } = await callJevApi(
      {
        model: "jev-latest",
        state: "Connection check.",
        questions: { ok: { type: "noul", instructions: "Is this a connection check?" } },
      },
      apiKey
    );
    return NextResponse.json({ connected: true, model: response.model, latencyMs });
  } catch (err) {
    const e = err as { message?: string; status?: number };
    return NextResponse.json({ connected: false, reason: e?.message ?? "failed", status: e?.status ?? 500 });
  }
}
