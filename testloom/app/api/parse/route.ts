import { NextResponse } from "next/server";
import { z } from "zod";
import { parseRequirement, ParserError } from "@/lib/parser";

const RequestSchema = z.object({
  featureRequest: z
    .string()
    .min(1, "featureRequest must not be empty")
    .max(2000),
});

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON" },
      { status: 400 },
    );
  }

  const parsed = RequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid request",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  try {
    const checks = await parseRequirement(
      parsed.data.featureRequest,
    );

    return NextResponse.json(
      { checks },
      { status: 200 },
    );
  } catch (err) {
    if (err instanceof ParserError) {
      return NextResponse.json(
        {
          error:
            "Could not generate acceptance checks from that request. Please try rephrasing.",
        },
        { status: 422 },
      );
    }

    console.error("[/api/parse] Unexpected error:", err);

    return NextResponse.json(
      {
        error: "Could not generate checks. Please try again.",
      },
      { status: 500 },
    );
  }
}