"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Brain, Layers, Target, Loader2 } from "lucide-react";

export default function LearnPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const CERT_ID = "11111111-0000-0000-0000-000000000001"; // TODO: derive from user's active cert

  async function startDailyQuiz() {
    setLoading(true);
    const res = await fetch("/api/quiz/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ certificationId: CERT_ID, count: 5 }),
    });

    const data = await res.json();
    if (data.sessionId) {
      router.push(`/quiz?session=${data.sessionId}&type=practice`);
    }
    setLoading(false);
  }

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Daily Study</h1>
      <p className="text-gray-500 mb-8">
        Today's session targets your weakest domain. 5 AI-generated questions, then flashcards for anything you miss.
      </p>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
            <Target className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">Today's focus</p>
            <p className="text-xs text-gray-400">Targeting your weakest domain</p>
          </div>
        </div>

        <div className="space-y-3 mb-8 text-sm text-gray-600">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">1</div>
            <span>5 questions on your weakest topic</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">2</div>
            <span>Wrong answers become flashcards automatically</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">3</div>
            <span>Your readiness score updates in real time</span>
          </div>
        </div>

        <button
          onClick={startDailyQuiz}
          disabled={loading}
          className="w-full bg-blue-600 text-white py-4 rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating your questions…
            </>
          ) : (
            <>
              <Brain className="w-5 h-5" />
              Start today's quiz
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => router.push("/flashcards")}
          className="bg-white rounded-xl border border-gray-100 p-5 hover:border-gray-200 transition-colors text-left shadow-sm"
        >
          <Layers className="w-5 h-5 text-purple-500 mb-3" />
          <p className="font-medium text-gray-900 text-sm">Review flashcards</p>
          <p className="text-xs text-gray-400 mt-0.5">Spaced repetition queue</p>
        </button>
        <button
          onClick={() => router.push("/mock-exam")}
          className="bg-white rounded-xl border border-gray-100 p-5 hover:border-gray-200 transition-colors text-left shadow-sm"
        >
          <Target className="w-5 h-5 text-green-500 mb-3" />
          <p className="font-medium text-gray-900 text-sm">Mock exam</p>
          <p className="text-xs text-gray-400 mt-0.5">Full timed simulation</p>
        </button>
      </div>
    </div>
  );
}
