"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Clock, Loader2, AlertCircle } from "lucide-react";

const CERT_ID = "11111111-0000-0000-0000-000000000001"; // TODO: derive from user's active cert

export default function MockExamPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [locked, setLocked] = useState(false); // set true if user needs to unlock

  async function startMockExam() {
    setLoading(true);

    const res = await fetch("/api/quiz/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ certificationId: CERT_ID, count: 65 }),
    });

    const data = await res.json();
    if (data.sessionId) {
      router.push(`/quiz?session=${data.sessionId}&type=mock_exam`);
    }
    setLoading(false);
  }

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Mock Exam</h1>
      <p className="text-gray-500 mb-8">
        Simulate the real exam experience. 65 questions, timed, covering all domains proportionally.
      </p>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 mb-6">
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: "Questions", value: "65" },
            { label: "Time limit", value: "90 min" },
            { label: "Pass score", value: "72%" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-700 flex gap-3 mb-6">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>Mock exam results feed back into your domain readiness score. Take it when you feel ready.</p>
        </div>

        <div className="space-y-2 text-sm text-gray-600 mb-8">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-400" />
            <span>Questions drawn from your weakest domains first</span>
          </div>
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-gray-400" />
            <span>Full explanation revealed for each answer at the end</span>
          </div>
        </div>

        <button
          onClick={startMockExam}
          disabled={loading || locked}
          className="w-full bg-blue-600 text-white py-4 rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating exam…
            </>
          ) : (
            <>
              <BookOpen className="w-5 h-5" />
              Start mock exam
            </>
          )}
        </button>
      </div>
    </div>
  );
}
