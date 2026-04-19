"use client";

import { useState } from "react";
import PriceChart from "./PriceChart";
import Stat from "./Stat";

interface Game {
  id: string;
  name: string;
  type: "app" | "sub";
  targetPrice: number;
}

interface GameDetails extends Game {
  currentPrice: number;
  discount: number;
  lowestPrice: number;
}

interface HistoryEntry {
  time: number;
  price: number;
  discount: number;
}

interface GameCardProps {
  game: Game;
  onDelete: (id: string) => void;
}

export default function GameCard({ game, onDelete }: GameCardProps) {
  const [open, setOpen] = useState(false);
  const [details, setDetails] = useState<GameDetails | null>(null);
  const [history, setHistory] = useState<HistoryEntry[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = async () => {
    if (open) {
      setOpen(false);
      return;
    }

    setOpen(true);
    if (details) return;

    setLoading(true);
    setError(null);
    try {
      const [resGame, resHistory] = await Promise.all([
        fetch(`/api/games/${game.id}`),
        fetch(`/api/games/${game.id}/history`),
      ]);

      if (!resGame.ok) {
  const text = await resGame.text(); // or .json() if you're sure
  console.log("❌ Game API failed:", {
    status: resGame.status,
    statusText: resGame.statusText,
    body: text,
  });
  throw new Error("Failed to load game data");
}

if (!resHistory.ok) {
  const text = await resHistory.text();
  console.log("❌ History API failed:", {
    status: resHistory.status,
    statusText: resHistory.statusText,
    body: text,
  });
  throw new Error("Failed to load history data");
}

      const gameData: GameDetails = await resGame.json();
      const histData: HistoryEntry[] = await resHistory.json();

      setDetails(gameData);
      setHistory(histData);
    } catch (e) {
      console.error(e);
      setError("Could not load price data.");
    } finally {
      setLoading(false);
    }
  };

  const hitTarget = details && details.currentPrice <= game.targetPrice;

  return (
    <div
      className="rounded-xl overflow-hidden mb-4 transition-all duration-300"
      style={{
        background: "#1e3347",
        border: `1px solid ${hitTarget ? "#4ade80" : "#2a475e"}`,
        boxShadow: hitTarget
          ? "0 0 0 1px #4ade8040, 0 4px 24px #4ade8015"
          : "0 2px 12px #00000030",
      }}
    >
      {/* Card Header */}
      <div className="flex items-center justify-between gap-4 p-5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <h3 className="text-base font-bold text-[#c7d5e0] leading-tight truncate">
              {game.name}
            </h3>
            {hitTarget && (
              <span className="text-[10px] bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                🎯 Target Hit
              </span>
            )}
          </div>

          <div className="flex gap-6 flex-wrap">
            <Stat label="Target" value={`₹${game.targetPrice}`} accent="#f4c542" />
            {details && (
              <>
                <Stat
                  label="Current"
                  value={`₹${details.currentPrice}`}
                  accent={hitTarget ? "#4ade80" : "#66c0f4"}
                />
                {details.discount > 0 && (
                  <Stat label="Discount" value={`−${details.discount}%`} accent="#f87171" />
                )}
                <Stat label="All‑time Low" value={`₹${details.lowestPrice}`} accent="#a78bfa" />
              </>
            )}
          </div>
        </div>

        <div className="flex gap-2 shrink-0">
          <button
            onClick={toggle}
            className="px-4 py-2 rounded-lg text-sm font-bold transition-all"
            style={{
              background: open ? "#2a475e" : "#66c0f4",
              color: open ? "#66c0f4" : "#000",
              border: open ? "1px solid #66c0f4" : "none",
            }}
          >
            {loading ? "…" : open ? "Hide" : "View"}
          </button>
          <button
            onClick={() => onDelete(game.id)}
            className="px-4 py-2 rounded-lg text-sm font-bold bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/25 transition-all"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Expanded Section */}
      {open && (
        <div className="border-t px-5 pb-5 pt-4" style={{ borderColor: "#2a475e" }}>
          {loading && (
            <div className="flex items-center gap-2 text-[#8ba3b8] text-sm py-4">
              <span className="animate-spin inline-block">⟳</span> Loading price data…
            </div>
          )}
          {error && <p className="text-red-400 text-sm py-2">{error}</p>}

          {!loading && !error && details && history && (
            <>
              <PriceChart
                history={history}
                targetPrice={game.targetPrice}
                currentPrice={details.currentPrice}
              />
              <div className="mt-3 flex justify-end">
                <a
                  href={`https://store.steampowered.com/${game.type}/${game.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-[#66c0f4] hover:underline"
                >
                  View on Steam →
                </a>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}