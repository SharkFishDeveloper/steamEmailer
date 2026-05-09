"use client";

import { useState } from "react";
import PriceChart from "./PriceChart";
import Stat from "./Stat";

interface PredictionResult {
  nextDropDate: Date | null;
  predictedSalePrice: number | null;
}

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

// -----------------------------
// LINEAR REGRESSION
// -----------------------------
function linearRegression(data: { x: number; y: number }[]) {
  const n = data.length;
  if (n < 2) return { slope: 0, intercept: 0 };

  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  for (const point of data) {
    sumX += point.x;
    sumY += point.y;
    sumXY += point.x * point.y;
    sumXX += point.x * point.x;
  }

  const denominator = n * sumXX - sumX * sumX;
  if (denominator === 0) return { slope: 0, intercept: 0 };

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

// -----------------------------
// PREDICTION FUNCTION
// -----------------------------
// -----------------------------
// ADVANCED ESTIMATOR
// -----------------------------

/**
 * Calculates a weighted average of sale gaps, 
 * giving 2x more weight to the most recent 3 sales.
 */
function getWeightedInterval(sales: HistoryEntry[]): number {
  if (sales.length < 2) return 0;
  const gaps: number[] = [];
  for (let i = 1; i < sales.length; i++) {
    gaps.push(sales[i].time - sales[i - 1].time);
  }

  // Weight the recent intervals more heavily
  let totalWeight = 0;
  let weightedSum = 0;
  
  gaps.forEach((gap, index) => {
    const weight = index > gaps.length - 4 ? 2 : 1; // Recent 3 gaps get double weight
    weightedSum += gap * weight;
    totalWeight += weight;
  });

  return weightedSum / totalWeight;
}

export function predictSteamPrice(history: HistoryEntry[]): PredictionResult {
  if (history.length < 5) {
    // Fallback to your simpler logic if data is sparse
    return fallbackPrediction(history);
  }

  const sorted = [...history].sort((a, b) => a.time - b.time);
  const sales = sorted.filter((h) => h.discount > 0);

  if (sales.length < 3) return { nextDropDate: null, predictedSalePrice: null };

  // 1. INTERVAL PREDICTION (When?)
  const avgGap = getWeightedInterval(sales);
  const lastSale = sales[sales.length - 1];
  const now = Date.now();
  
  let nextDropTime = lastSale.time + avgGap;
  // If the predicted date is in the past, add intervals until it's in the future
  while (nextDropTime <= now) {
    nextDropTime += (avgGap * 0.8); // Adjusting for "Sale Pressure"
  }

  // 2. PRICE PREDICTION (How much?)
  // We use the "Mode" of recent sale prices or a Piecewise floor
  const recentSales = sales.slice(-5); // Look at last 5 sales
  const lowestRecent = Math.min(...recentSales.map(s => s.price));
  
  // Calculate price decay (are the sales getting deeper over time?)
  const firstSalePrice = sales[0].price;
  const lastSalePrice = sales[sales.length - 1].price;
  const priceDecay = (firstSalePrice - lastSalePrice) / sales.length;

  // Prediction: Usually the lowest recent price, minus a small decay factor
  const predictedSalePrice = Math.max(
    Math.round(lowestRecent - (priceDecay > 0 ? priceDecay : 0)),
    Math.min(...sales.map(s => s.price)) * 0.9 // Don't predict lower than 10% below ATL
  );

  return { 
    nextDropDate: new Date(nextDropTime), 
    predictedSalePrice: Math.round(predictedSalePrice) 
  };
}

// Simple fallback for games with very little history
function fallbackPrediction(history: HistoryEntry[]): PredictionResult {
    // ... existing linear logic ...
    return { nextDropDate: null, predictedSalePrice: null };
}

// -----------------------------
// PRED STAT HELPER
// -----------------------------
function PredStat({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        background: "#162a3a",
        border: "1px solid #2a475e",
        borderRadius: 8,
        padding: "8px 12px",
      }}
    >
      <p
        style={{
          fontSize: 10,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: "#8ba3b8",
          margin: "0 0 2px",
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: "#c7d5e0",
          margin: 0,
        }}
      >
        {value}
      </p>
    </div>
  );
}

// -----------------------------
// GAME CARD
// -----------------------------
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

      if (!resGame.ok || !resHistory.ok) throw new Error("Failed to load data");

      const gameData: GameDetails = await resGame.json();
      const histData: HistoryEntry[] = await resHistory.json();

      setDetails(gameData);
      setHistory(histData);
    } catch (e) {
      setError("Could not load price data.");
    } finally {
      setLoading(false);
    }
  };

  // Accuracy Calculation
  const getHistorySpanInDays = () => {
    if (!history || history.length < 2) return 0;
    const sorted = [...history].sort((a, b) => a.time - b.time);
    return (sorted[sorted.length - 1].time - sorted[0].time) / (1000 * 60 * 60 * 24);
  };

  const daysOfHistory = getHistorySpanInDays();
  const isLowConfidence = daysOfHistory > 0 && daysOfHistory < 50;

  const prediction = history ? predictSteamPrice(history) : null;
  const hitTarget = details && details.currentPrice <= game.targetPrice;

  return (
    <div
      className="rounded-xl overflow-hidden mb-4 transition-all duration-300"
      style={{
        background: "#1e3347",
        border: `1px solid ${hitTarget ? "#4ade80" : "#2a475e"}`,
        boxShadow: hitTarget ? "0 0 0 1px #4ade8040, 0 4px 24px #4ade8015" : "0 2px 12px #00000030",
      }}
    >
      {/* ── Card Header ── */}
      <div className="flex items-center justify-between gap-4 p-5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <h3 className="text-base font-bold text-[#c7d5e0] truncate">{game.name}</h3>
            {hitTarget && (
              <span className="text-[10px] bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-0.5 rounded-full font-bold uppercase">
                🎯 Target Hit
              </span>
            )}
          </div>

          <div className="flex gap-6 flex-wrap">
            <Stat label="Target" value={`₹${game.targetPrice}`} accent="#f4c542" />
            {details && (
              <>
                <Stat label="Current" value={`₹${details.currentPrice}`} accent={hitTarget ? "#4ade80" : "#66c0f4"} />
                {details.discount > 0 && <Stat label="Discount" value={`−${details.discount}%`} accent="#f87171" />}
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

      {/* ── Expanded Section ── */}
      {open && (
        <div className="border-t px-5 pb-5 pt-4 border-[#2a475e]">
          {loading && <div className="text-[#8ba3b8] text-sm py-4 animate-pulse">⟳ Loading price data…</div>}
          {error && <p className="text-red-400 text-sm py-2">{error}</p>}

          {!loading && !error && details && history && (
            <>
              <PriceChart history={history} targetPrice={game.targetPrice} currentPrice={details.currentPrice} />

              {isLowConfidence && (
                <div className="mt-4 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded text-[10px] text-yellow-200/70 flex items-center gap-2">
                  <span>⚠️</span>
                  <span><b>Low Confidence:</b> Only {Math.round(daysOfHistory)} days of data. Accuracy may vary.</span>
                </div>
              )}

              {prediction?.nextDropDate ? (
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <PredStat label="Expected next sale" value={prediction.nextDropDate.toDateString()} />
                  <PredStat label="Predicted sale price" value={`₹${prediction.predictedSalePrice}`} />
                </div>
              ) : (
                <p className="mt-4 text-xs text-[#8ba3b8] text-center">Insufficent history for prediction.</p>
              )}

              <div className="mt-4 flex justify-end">
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