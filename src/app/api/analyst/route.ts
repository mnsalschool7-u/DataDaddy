import { NextResponse } from "next/server";
import { z } from "zod";
import { deterministicAnswer, type AnalystAnswer } from "@/lib/analyst/deterministic";
import type { AnalystContext } from "@/lib/analyst/context";

const Body = z.object({
  question: z.string().min(1).max(500),
  context: z.custom<AnalystContext>(),
});

/**
 * DataDaddy Intelligence endpoint.
 * - Always computes a deterministic, grounded answer from the supplied context.
 * - If an LLM key is configured, it asks the model to phrase a grounded answer,
 *   constrained to the supplied numbers, and falls back to deterministic on error.
 */
export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", issues: parsed.error.issues }, { status: 400 });
  }
  const { question, context } = parsed.data;

  const deterministic = deterministicAnswer(question, context);

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(deterministic satisfies AnalystAnswer);
  }

  try {
    const baseUrl = process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1";
    const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
    const system =
      "You are DataDaddy Intelligence, an infrastructure-siting analyst. You MUST ground every statement in the provided JSON context. Never invent grid headroom, permits, electricity rates, rent changes, or environmental impacts. If a value is listed as unknown, say it is unknown. Respond ONLY with JSON matching the schema {conclusion, supportingNumbers[], geographicEvidence[], regulatory[], uncertainty[], inputsToChange[]}.";
    const user = `Question: ${question}\n\nContext JSON:\n${JSON.stringify(context)}\n\nBaseline deterministic answer to refine (do not contradict its numbers):\n${JSON.stringify(deterministic)}`;

    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
    if (!res.ok) throw new Error(`LLM HTTP ${res.status}`);
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    const parsedAnswer = JSON.parse(content) as Partial<AnalystAnswer>;
    return NextResponse.json({
      ...deterministic,
      ...parsedAnswer,
      mode: "llm",
    } satisfies AnalystAnswer);
  } catch {
    // graceful degradation
    return NextResponse.json(deterministic satisfies AnalystAnswer);
  }
}
