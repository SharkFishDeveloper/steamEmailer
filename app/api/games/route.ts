import { NextRequest } from "next/server";
import { redis } from "@/lib/redis";
import {corsHeaders, handleOptions, jsonResponse} from "@/lib/cors"
import { Game } from "@/types";
// Handle CORS preflight
export async function OPTIONS() {
  return handleOptions();
}

/* ============================================================
   GET /api/games — List all tracked games
============================================================ */
export async function GET() {
  const keys = await redis.keys("game:*");
  const games = await Promise.all(keys.map((k) => redis.get<Game>(k)));
  return jsonResponse(games.filter(Boolean));
}

/* ============================================================
   POST /api/games — Add a new game
============================================================ */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { url, targetPrice } = body as { url?: string; targetPrice?: number };

  if (!url || !targetPrice) {
    return jsonResponse({ error: "URL and targetPrice required" }, 400);
  }

  const match = url.match(/store\.steampowered\.com\/(app|sub)\/(\d+)/);
  if (!match) {
    return jsonResponse({ error: "Invalid Steam URL" }, 400);
  }

  const type = match[1] as "app" | "sub";
  const id = match[2];

  const apiUrl =
    type === "sub"
      ? `https://store.steampowered.com/api/packagedetails?packageids=${id}&cc=IN`
      : `https://store.steampowered.com/api/appdetails?appids=${id}&cc=IN`;

  const response = await fetch(apiUrl);
  const data = await response.json();
  const item = data[id];

  if (!item?.success) {
    return jsonResponse({ error: "Steam fetch failed" }, 400);
  }

  const name: string = item.data.name;
  const game: Game = { name, type, id, targetPrice: Number(targetPrice) };
  await redis.set(`game:${id}`, game);

  return jsonResponse({ message: "Game added", name, id, type, targetPrice });
}

/* ============================================================
   DELETE /api/games — Remove a game by url or id
============================================================ */
export async function DELETE(req: NextRequest) {
  const body = await req.json();
  const { url, id } = body as { url?: string; id?: string };

  let gameId = id;

  if (url) {
    const match = url.match(/store\.steampowered\.com\/(app|sub)\/(\d+)/);
    if (!match) return jsonResponse({ error: "Invalid Steam URL" }, 400);
    gameId = match[2];
  }

  if (!gameId) return jsonResponse({ error: "Provide url or id" }, 400);

  await redis.del(`game:${gameId}`);
  await redis.del(`price_history:${gameId}`);
  await redis.del(`last_email_sent:${gameId}`);

  return jsonResponse({ message: "Game removed", id: gameId });
}