import { NextRequest } from "next/server";
import { redis } from "@/lib/redis";
import { handleOptions, jsonResponse } from "@/lib/cors";
import { PriceData, PriceHistoryEntry } from "@/types";

export async function OPTIONS() {
  return handleOptions();
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  const raw = await redis.zrange<string[]>(`price_history:${id}`, 0, -1, {
    withScores: true,
  });

  const formatted: PriceHistoryEntry[] = raw.map((entry) => {
    const member = (entry as any).member ?? entry;
    const { t, ...rest }: PriceData & { t?: number } =
      typeof member === "string" ? JSON.parse(member) : member;
    return {
      ...rest,
      time: Number((entry as any).score ?? t),
    };
  });

  return jsonResponse(formatted);
}