import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { Game } from "@/types";

/* ============================================================
   GET /api/games — List all tracked games
============================================================ */
export async function GET() {
  const keys = await redis.keys("game:*");

  const games = await Promise.all(
    keys.map(async (key) => {
      const game = await redis.get<Game>(key);

      if (!game) return null;

      // Old entry missing imageUrl
      if (!game.imageUrl) {
        const imageUrl =
          game.type === "app"
            ? `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.id}/header.jpg`
            : null;

        const updatedGame: Game = {
          ...game,
          imageUrl,
        };

        // Update Redis automatically
        await redis.set(key, updatedGame);

        return updatedGame;
      }

      return game;
    })
  );

  return NextResponse.json(games.filter(Boolean));
}

/* ============================================================
   POST /api/games — Add a new game
============================================================ */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { url, targetPrice } = body as {
      url?: string;
      targetPrice?: number;
    };

    if (!url || targetPrice == null) {
      return NextResponse.json(
        { error: "URL and targetPrice required" },
        { status: 400 }
      );
    }

    const match = url.match(/store\.steampowered\.com\/(app|sub)\/(\d+)/);

    if (!match) {
      return NextResponse.json(
        { error: "Invalid Steam URL" },
        { status: 400 }
      );
    }

    const type = match[1] as "app" | "sub";
    const id = match[2];

    const apiUrl =
      type === "sub"
        ? `https://store.steampowered.com/api/packagedetails?packageids=${id}&cc=IN`
        : `https://store.steampowered.com/api/appdetails?appids=${id}&cc=IN`;

    const response = await fetch(apiUrl);

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch Steam API" },
        { status: 500 }
      );
    }

    const data = await response.json();
    const item = data[id];

    if (!item?.success || !item?.data) {
      return NextResponse.json(
        { error: "Steam fetch failed" },
        { status: 400 }
      );
    }

    const name: string = item.data.name;

    // Steam image
    const imageUrl =
      type === "app"
        ? `https://cdn.cloudflare.steamstatic.com/steam/apps/${id}/header.jpg`
        : item.data?.header_image || null;
    console.log(imageUrl)
    const game: Game = {
      id,
      name,
      type,
      targetPrice: Number(targetPrice),
      imageUrl,
    };

    await redis.set(`game:${id}`, game);

    return NextResponse.json({
      message: "Game added",
      game,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/* ============================================================
   DELETE /api/games — Remove a game by url or id
============================================================ */
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();

    const { url, id } = body as {
      url?: string;
      id?: string;
    };

    let gameId = id;

    if (url) {
      const match = url.match(/store\.steampowered\.com\/(app|sub)\/(\d+)/);

      if (!match) {
        return NextResponse.json(
          { error: "Invalid Steam URL" },
          { status: 400 }
        );
      }

      gameId = match[2];
    }

    if (!gameId) {
      return NextResponse.json(
        { error: "Provide url or id" },
        { status: 400 }
      );
    }

    await redis.del(`game:${gameId}`);
    await redis.del(`price_history:${gameId}`);
    await redis.del(`last_email_sent:${gameId}`);

    return NextResponse.json({
      message: "Game removed",
      id: gameId,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}