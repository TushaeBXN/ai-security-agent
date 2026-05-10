"use client";

import { useEffect, useState } from "react";
import { Layers, Loader2, RotateCcw, ChevronRight } from "lucide-react";

type Flashcard = {
  id: string;
  front: string;
  back: string;
  domain: { name: string };
};

type ViewState = "front" | "back";

export default function FlashcardsPage() {
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [view, setView] = useState<ViewState>("front");
  const [done, setDone] = useState(false);
  const [rating, setRating] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/flashcards/generate?limit=20")
      .then((r) => r.json())
      .then(({ flashcards }) => {
        setCards(flashcards);
        setLoading(false);
      });
  }, []);

  async function submitRating(r: number) {
    if (!cards[currentIdx]) return;
    setRating(r);

    await fetch("/api/flashcards/generate", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ flashcardId: cards[currentIdx].id, rating: r }),
    });

    if (currentIdx + 1 >= cards.length) {
      setDone(true);
    } else {
      setCurrentIdx(currentIdx + 1);
      setView("front");
      setRating(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96 gap-3">
        <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
        <span className="text-gray-500 text-sm">Loading flashcards…</span>
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="max-w-lg mx-auto text-center py-16">
        <Layers className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-700 mb-2">No flashcards due</h2>
        <p className="text-gray-400 text-sm">
          Flashcards are created automatically when you get quiz questions wrong. Complete a quiz to build your deck.
        </p>
      </div>
    );
  }

  if (done) {
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">🎉</span>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">All caught up!</h2>
        <p className="text-gray-500 text-sm mb-6">
          You've reviewed all {cards.length} flashcards due today. They'll resurface based on how well you knew them.
        </p>
        <button
          onClick={() => {
            setCurrentIdx(0);
            setView("front");
            setDone(false);
          }}
          className="flex items-center gap-2 mx-auto text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          <RotateCcw className="w-4 h-4" />
          Review again
        </button>
      </div>
    );
  }

  const card = cards[currentIdx];

  return (
    <div className="max-w-xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Flashcards</h1>
        <span className="text-sm text-gray-400">{currentIdx + 1} / {cards.length}</span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-100 rounded-full h-1.5 mb-8">
        <div
          className="bg-purple-500 h-1.5 rounded-full transition-all"
          style={{ width: `${(currentIdx / cards.length) * 100}%` }}
        />
      </div>

      {/* Card */}
      <div
        className="bg-white rounded-2xl border border-gray-100 shadow-sm cursor-pointer select-none min-h-64 flex flex-col items-center justify-center p-10 text-center mb-4 transition-all hover:shadow-md"
        onClick={() => view === "front" && setView("back")}
      >
        {view === "front" ? (
          <>
            <p className="text-xs font-medium text-purple-500 uppercase tracking-wide mb-4">
              {card.domain?.name}
            </p>
            <p className="text-lg font-medium text-gray-900 leading-relaxed">{card.front}</p>
            <p className="text-sm text-gray-400 mt-6 flex items-center gap-1">
              Tap to reveal answer <ChevronRight className="w-3 h-3" />
            </p>
          </>
        ) : (
          <>
            <p className="text-xs font-medium text-green-500 uppercase tracking-wide mb-4">Answer</p>
            <p className="text-base text-gray-700 leading-relaxed">{card.back}</p>
          </>
        )}
      </div>

      {/* Rating buttons */}
      {view === "back" && (
        <div>
          <p className="text-center text-sm text-gray-500 mb-3">How well did you know this?</p>
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: "Again", value: 0, color: "bg-red-50 text-red-700 border-red-100 hover:bg-red-100" },
              { label: "Hard", value: 1, color: "bg-orange-50 text-orange-700 border-orange-100 hover:bg-orange-100" },
              { label: "Good", value: 2, color: "bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100" },
              { label: "Easy", value: 3, color: "bg-green-50 text-green-700 border-green-100 hover:bg-green-100" },
            ].map((btn) => (
              <button
                key={btn.value}
                onClick={() => submitRating(btn.value)}
                disabled={rating !== null}
                className={`py-3 rounded-xl border text-sm font-semibold transition-colors disabled:opacity-50 ${btn.color}`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
