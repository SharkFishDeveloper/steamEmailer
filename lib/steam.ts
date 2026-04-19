import {Game, PriceData} from "../types/index"


export async function fetchCurrentPrice(game: Game): Promise<PriceData | null> {
  try {
    const url =
      game.type === "sub"
        ? `https://store.steampowered.com/api/packagedetails?packageids=${game.id}&cc=IN`
        : `https://store.steampowered.com/api/appdetails?appids=${game.id}&cc=IN`;

    const res = await fetch(url, {
      headers: { "Cache-Control": "no-cache" },
      next: { revalidate: 0 }, // Next.js: always fresh
    });

    const data = await res.json();
    const item = data[game.id];

    if (!item?.success) return null;

    const priceInfo =
      game.type === "sub" ? item.data.price : item.data.price_overview;

    if (!priceInfo) return null;

    return {
      price: priceInfo.final / 100,
      discount: priceInfo.discount_percent ?? 0,
    };
  } catch (err) {
    console.error("Steam fetch error:", err);
    return null;
  }
}