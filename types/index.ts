export type AlertReason = "target_reached" | "price_dropped";

export type EmailGame = {
  id: string;
  name: string;
  type: "app" | "sub";
  targetPrice: number;
  currentPrice: number;
  discount: number;
  previousPrice?: number;
  reasons: AlertReason[];
};

export interface Game {
  id: string;
  name: string;
  type: "app" | "sub";
  targetPrice: number;
}

export interface PriceData {
  price: number;
  discount: number;
}

export interface PriceHistoryEntry extends PriceData {
  time: number;
}

export interface AlertItem {
  game: Game;
  currentPrice: number;
  discount: number;
  previousPrice: number | null;
  reasons: AlertReason[];
}