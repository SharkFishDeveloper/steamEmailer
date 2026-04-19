"use client";

import { useCallback, useEffect, useState } from "react";
import GameCard from "./GameCard";

interface Game {
  id: string;
  name: string;
  type: "app" | "sub";
  targetPrice: number;
}

export default function TrackerClient() {
  const [games, setGames] = useState<Game[]>([]);
  const [url, setUrl] = useState("");
  const [targetPrice, setTargetPrice] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  /* ── Fetch game list ── */
  const fetchGames = useCallback(async () => {
    try {
      const res = await fetch("/api/games");
      const data = await res.json();
      setGames(Array.isArray(data) ? data : []);
    } catch {
      setGames([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchGames();
  }, [fetchGames]);

  /* ── Add game ── */
  const addGame = async () => {
    if (!url.trim() || !targetPrice) {
      setAddError("Provide a Steam URL and target price.");
      return;
    }
    setAdding(true);
    setAddError(null);
    try {
      const res = await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), targetPrice: Number(targetPrice) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAddError(data.error || "Failed to add game.");
        return;
      }
      setUrl("");
      setTargetPrice("");
      await fetchGames();
    } catch {
      setAddError("Network error.");
    } finally {
      setAdding(false);
    }
  };

  /* ── Delete game ── */
  const deleteGame = async (id: string) => {
    if (!window.confirm("Remove this game from tracking?")) return;
    await fetch("/api/games", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setGames((prev) => prev.filter((g) => g.id !== id));
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") addGame();
  };

  return (
    <>
      {/* ── Add Form ── */}
      <div
        className="rounded-xl p-5 mb-8"
        style={{ background: "#1e3347", border: "1px solid #2a475e" }}
      >
        <h2
          className="text-sm font-bold uppercase tracking-widest mb-4"
          style={{ color: "#66c0f4" }}
        >
          Track a Game
        </h2>

        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="https://store.steampowered.com/app/…"
            value={url}
            onChange={(e) => { setUrl(e.target.value); setAddError(null); }}
            onKeyDown={handleKey}
            className="flex-1 px-4 py-2.5 rounded-lg text-sm text-[#c7d5e0] placeholder-[#4a6a80] outline-none focus:ring-1 focus:ring-[#66c0f4]"
            style={{ background: "#162330", border: "1px solid #2a475e" }}
          />
          <input
            type="number"
            placeholder="Target ₹"
            value={targetPrice}
            onChange={(e) => { setTargetPrice(e.target.value); setAddError(null); }}
            onKeyDown={handleKey}
            className="w-32 px-4 py-2.5 rounded-lg text-sm text-[#c7d5e0] placeholder-[#4a6a80] outline-none focus:ring-1 focus:ring-[#66c0f4]"
            style={{ background: "#162330", border: "1px solid #2a475e" }}
          />
          <button
            onClick={addGame}
            disabled={adding}
            className="px-6 py-2.5 rounded-lg text-sm font-bold transition-all disabled:opacity-50"
            style={{ background: "#66c0f4", color: "#000" }}
          >
            {adding ? "Adding…" : "Add"}
          </button>
        </div>

        {addError && <p className="mt-3 text-red-400 text-sm">{addError}</p>}
      </div>

      {/* ── Game List ── */}
      <div className="flex items-center justify-between mb-4">
        <h2
          className="text-sm font-bold uppercase tracking-widest"
          style={{ color: "#66c0f4" }}
        >
          Tracked Games
        </h2>
        <span className="text-xs text-[#8ba3b8]">
          {games.length} game{games.length !== 1 ? "s" : ""}
        </span>
      </div>

      {loading ? (
        <div className="text-[#8ba3b8] text-sm">Loading…</div>
      ) : games.length === 0 ? (
        <div
          className="rounded-xl p-10 text-center"
          style={{ background: "#1e3347", border: "1px solid #2a475e" }}
        >
          <p className="text-[#8ba3b8] text-sm">
            No games tracked yet. Paste a Steam URL above to get started.
          </p>
        </div>
      ) : (
        games.map((game) => (
          <GameCard key={game.id} game={game} onDelete={deleteGame} />
        ))
      )}
    </>
  );
}