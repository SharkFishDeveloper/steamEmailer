import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { PriceData, PriceHistoryEntry } from "@/types";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const raw = await redis.zrange(
    `price_history:${id}`,
    0,
    -1,
    { withScores: true }
  );

  console.log("🟥 RAW HISTORY:", raw);

  const formatted: PriceHistoryEntry[] = [];

  for (let i = 0; i < raw.length; i += 2) {
    const member = raw[i];      // data
    const score = raw[i + 1];   // timestamp

    const parsed = safeParse(member);
    if (!parsed) continue;

    const { t, ...rest } = parsed;

    formatted.push({
      ...rest,
      time: Number(score ?? t),
    });
  }

  console.log("🟩 FORMATTED HISTORY:", formatted);

  return NextResponse.json(formatted);
}

/* =========================
   Safe parser
========================= */
export function safeParse(
  member: unknown
): (PriceData & { t?: number }) | null {
  try {
    if (!member) return null;

    if (typeof member === "string") {
      const parsed = JSON.parse(member);
      return parsed ?? null;
    }

    if (typeof member === "object") {
      return member as any;
    }

    return null;
  } catch (e) {
    console.error("❌ JSON parse failed:", member);
    return null;
  }
}