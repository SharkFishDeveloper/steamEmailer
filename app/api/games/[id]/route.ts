import { NextRequest } from "next/server";
import { redis } from "@/lib/redis";
import { fetchCurrentPrice } from "@/lib/steam";
import { handleOptions, jsonResponse } from "@/lib/cors";
import { Game, PriceData } from "@/types";

export async function OPTIONS() {
  return handleOptions();
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  const game = await redis.get<Game>(`game:${id}`);
  if (!game) return jsonResponse({ error: "Game not found" }, 404);

  const priceData = await fetchCurrentPrice(game);
  if (!priceData) return jsonResponse({ error: "Price fetch failed" }, 400);

  const raw = await redis.zrange<string[]>(`price_history:${id}`, 0, -1, {
    withScores: true,
  });

  const parsed: PriceData[] = raw.map((entry) => {
    const member = (entry as any).member ?? entry;
    return typeof member === "string" ? JSON.parse(member) : member;
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