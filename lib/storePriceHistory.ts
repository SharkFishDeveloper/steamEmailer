import { redis } from "./redis";
import { Game, PriceData } from "@/types";

export const TWO_YEARS_MS = 2 * 365 * 24 * 60 * 60 * 1000;

export async function storePriceHistory(
  game: Game,
  price: number,
  discount: number
): Promise<{ previousPrice: number | null }> {
  const key = `price_history:${game.id}`;
  const now = Date.now();

  const lastEntries = await redis.zrange<string[]>(key, -1, -1, {
    withScores: true,
  });

  let previousPrice: number | null = null;

  if (lastEntries.length > 0) {
    const raw = (lastEntries[0] as any).member ?? lastEntries[0];
    const parsed: PriceData =
      typeof raw === "string" ? JSON.parse(raw) : raw;
    previousPrice = parsed.price;
  }

  await redis.zadd(key, {
    score: now,
    member: JSON.stringify({ price, discount, t: now }),
  });

  await redis.zremrangebyscore(key, 0, now - TWO_YEARS_MS);

  return { previousPrice };
}