import { NextRequest, NextResponse } from "next/server";
import { callJevApi } from "@/lib/jev/client";
import { mockJevResponse } from "@/lib/demo";
import type { JevApiRequest } from "@/lib/jev/types";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<JevApiRequest> & { demo?: boolean };
    if (body.demo) {
      const mockReq = {
        model: body.model || "demo-jev-mock",
        state: body.state ?? "",
        questions: body.questions ?? {},
      } as JevApiRequest;
      const response = mockJevResponse(mockReq);
      return NextResponse.json({ ...response, usage: response.usage, _meta: { demo: true, latencyMs: 120, status: 200 } });
    }

    const apiKey = process.env.TYPESAFE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing TYPESAFE_API_KEY on the server. Add it to .env and restart." },
        { status: 500 }
      );
    }
    if (!body.questions || Object.keys(body.questions).length === 0) {
      return NextResponse.json({ error: "At least one question is required." }, { status: 400 });
    }
    const jevReq: JevApiRequest = {
      model: body.model || "jev-latest",
      state: body.state ?? "",
      questions: body.questions,
    };
    const { response, latencyMs, status } = await callJevApi(jevReq, apiKey);
    return NextResponse.json({ ...response, _meta: { demo: false, latencyMs, status } });
  } catch (err) {
    const e = err as { message?: string; status?: number; body?: unknown };
    const status = typeof e?.status === "number" ? e.status : 502;
    return NextResponse.json(
      { error: e?.message ?? "Jev request failed", detail: e?.body ?? null },
      { status }
    );
  }
}
