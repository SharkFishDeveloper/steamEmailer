import { redis } from "@/lib/redis";
import { fetchCurrentPrice } from "@/lib/steam";
import { Game, PriceData } from "@/types";
import { NextRequest, NextResponse } from "next/server";

/* ============================================================
   Safe parser (handles bad Redis data)
============================================================ */
function safeParse(member: unknown): (PriceData & { t?: number }) | null {
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
  } catch (err) {
    console.error("❌ JSON parse failed:", member);
    return null;
  }
}

/* ============================================================
   GET /api/games/[id]
============================================================ */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  /* =========================
     Get game
  ========================= */
  const game = await redis.get<Game>(`game:${id}`);
  if (!game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  /* =========================
     Fetch current price
  ========================= */
  const priceData = await fetchCurrentPrice(game);
  if (!priceData) {
    return NextResponse.json(
      { error: "Price fetch failed" },
      { status: 400 }
    );
  }

  /* =========================
     Get price history (RAW)
  ========================= */
  const raw = await redis.zrange(
    `price_history:${id}`,
    0,
    -1,
    { withScores: true }
  );

  console.log("🟥 RAW REDIS:", raw);

  /* =========================
     Parse Redis data (PAIR FIX)
  ========================= */
  const parsed: PriceData[] = [];

  for (let i = 0; i < raw.length; i += 2) {
    const member = raw[i];      // JSON or object
    const score = raw[i + 1];   // timestamp

    const parsedMember = safeParse(member);

    if (!parsedMember) {
      console.warn("⚠️ Skipping invalid entry:", member);
      continue;
    }

    parsed.push({
      ...parsedMember,
      //@ts-ignore
      time: Number(score ?? parsedMember.t),
    });
  }

  console.log("🟩 PARSED HISTORY:", parsed);

  /* =========================
     Compute lowest price
  ========================= */
  const lowest =
    parsed.length > 0
      ? Math.min(...parsed.map((p) => p.price))
      : priceData.price;

  /* =========================
     Final response
  ========================= */
  const response = {
    ...game,
    currentPrice: priceData.price,
    discount: priceData.discount,
    lowestPrice: lowest,
    history: parsed, // 🔥 THIS FIXES YOUR FRONTEND
  };

  console.log("📦 RESPONSE:", response);

  return NextResponse.json(response);
}