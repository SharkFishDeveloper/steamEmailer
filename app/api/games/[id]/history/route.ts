import { NextRequest } from "next/server";
import { redis } from "@/lib/redis";
import { handleOptions, jsonResponse } from "@/lib/cors";
import { PriceData, PriceHistoryEntry } from "@/types";

export async function OPTIONS() {
  return handleOptions();
}
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const raw = await redis.zrange<{ member: string; score: number }[]>(
    `price_history:${id}`,
    0,
    -1,
    { withScores: true }
  );

  const formatted: PriceHistoryEntry[] = raw.map((entry) => {
    const { t, ...rest }: PriceData & { t?: number } =
      typeof entry.member === "string"
        ? JSON.parse(entry.member)
        : entry.member;

    return {
      ...rest,
      time: Number(entry.score ?? t),
    };
  });

  return jsonResponse(formatted);
}