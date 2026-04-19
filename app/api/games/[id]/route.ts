import { jsonResponse } from "@/lib/cors";
import { redis } from "@/lib/redis";
import { fetchCurrentPrice } from "@/lib/steam";
import { Game, PriceData } from "@/types";
import { NextRequest } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const game = await redis.get<Game>(`game:${id}`);
  if (!game) return jsonResponse({ error: "Game not found" }, 404);

  const priceData = await fetchCurrentPrice(game);
  if (!priceData) return jsonResponse({ error: "Price fetch failed" }, 400);

  const raw = await redis.zrange<{ member: string; score: number }[]>(
    `price_history:${id}`,
    0,
    -1,
    { withScores: true }
  );

  const parsed: PriceData[] = raw.map((entry) => {
    return typeof entry.member === "string"
      ? JSON.parse(entry.member)
      : entry.member;
  });

  const lowest =
    parsed.length > 0
      ? Math.min(...parsed.map((p) => p.price))
      : priceData.price;

  return jsonResponse({
    ...game,
    currentPrice: priceData.price,
    discount: priceData.discount,
    lowestPrice: lowest,
  });
}