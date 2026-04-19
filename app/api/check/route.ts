import { handleOptions, jsonResponse } from "@/lib/cors";
import { redis } from "@/lib/redis";
import { fetchCurrentPrice } from "@/lib/steam";
import { storePriceHistory } from "@/lib/storePriceHistory";
import { sendEmail } from "@/lib/sendEmail";
import { AlertItem, AlertReason, EmailGame, Game } from "@/types";

export async function OPTIONS() {
  return handleOptions();
}

const EMAIL_COOLDOWN_MS = 5 * 24 * 60 * 60 * 1000; // 5 days

export async function GET() {
  const keys = await redis.keys("game:*");
  const games = (
    await Promise.all(keys.map((k) => redis.get<Game>(k)))
  ).filter(Boolean) as Game[];

  if (games.length === 0) {
    return jsonResponse({ checked: 0, alerts: [] });
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY!;
  const ALERT_EMAIL = process.env.ALERT_EMAIL!;
  const now = Date.now();

  const alertsRaw = await Promise.all(
    games.map(async (game): Promise<AlertItem | null> => {
      try {
        const priceData = await fetchCurrentPrice(game);
        if (!priceData) return null;

        const { previousPrice } = await storePriceHistory(
          game,
          priceData.price,
          priceData.discount
        );

        const hitTarget = priceData.price <= game.targetPrice;
        const priceDrop =
          previousPrice !== null && priceData.price < previousPrice;

        if (!hitTarget && !priceDrop) return null;

        const lastSent = await redis.get<number>(`last_email_sent:${game.id}`);
        if (lastSent && now - lastSent <= EMAIL_COOLDOWN_MS) return null;

        const reasons: AlertReason[] = [];
        if (hitTarget) reasons.push("target_reached");
        if (priceDrop) reasons.push("price_dropped");

        return {
          game,
          currentPrice: priceData.price,
          discount: priceData.discount,
          previousPrice,
          reasons,
        };
      } catch (err) {
        console.error(`Error processing game ${game.id}:`, err);
        return null;
      }
    })
  );

  const alerts = alertsRaw.filter(Boolean) as AlertItem[];

  if (alerts.length > 0) {
    const emailPayload: EmailGame[] = alerts.map((a) => ({
      ...a.game,
      currentPrice: a.currentPrice,
      discount: a.discount,
      previousPrice: a.previousPrice ?? undefined,
      reasons: a.reasons,
    }));

    const sent = await sendEmail(emailPayload, RESEND_API_KEY, ALERT_EMAIL);

    if (sent) {
      await Promise.all(
        alerts.map((a) => redis.set(`last_email_sent:${a.game.id}`, now))
      );
    }
  }

  return jsonResponse({
    checked: games.length,
    alerts: alerts.map((a) => ({
      id: a.game.id,
      name: a.game.name,
      currentPrice: a.currentPrice,
      previousPrice: a.previousPrice,
      reasons: a.reasons,
    })),
  });
}