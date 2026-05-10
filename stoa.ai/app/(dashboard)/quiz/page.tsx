"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Question } from "@/lib/types";
import { CheckCircle, XCircle, ChevronRight, Loader2 } from "lucide-react";

type QuizState = "loading" | "question" | "revealed" | "complete";

type Answer = {
  questionId: string;
  selectedOptionId: string;
  isCorrect: boolean;
  timeSpentSeconds: number;
};

function QuizContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClient();

  const sessionId = searchParams.get("session");

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [state, setState] = useState<QuizState>("loading");
  const [startTime, setStartTime] = useState(Date.now());
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<{
    scorePercent: number;
    flashcardsCreated: number;
    examReadiness: { overallScore: number; readyToBook: boolean; recommendation: string } | null;
  } | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    loadQuestions();
  }, [sessionId]);

  async function loadQuestions() {
    const { data } = await supabase
      .from("quiz_answers")
      .select("question:questions(*)")
      .eq("session_id", sessionId);

    if (data && data.length > 0) {
      const qs = data.map((row) => row.question as Question);
      setQuestions(qs);
      setState("question");
      setStartTime(Date.now());
    } else {
      // Questions from API are stored but not yet answered — fetch from questions table via session
      const { data: sessionData } = await supabase
        .from("quiz_sessions")
        .select("certification_id")
        .eq("id", sessionId)
        .single();

      if (sessionData) {
        const { data: questionRows } = await supabase
          .from("questions")
          .select("*")
          .eq("certification_id", sessionData.certification_id)
          .order("created_at", { ascending: false })
          .limit(20);

        if (questionRows) {
          setQuestions(questionRows as Question[]);
          setState("question");
          setStartTime(Date.now());
        }
      }
    }
  }

  function selectOption(optionId: string) {
    if (state !== "question") return;
    setSelected(optionId);
    setState("revealed");
  }

  const current = questions[currentIdx];

  function next() {
    if (!current || !selected) return;

    const elapsed = Math.round((Date.now() - startTime) / 1000);
    const answer: Answer = {
      questionId: current.id,
      selectedOptionId: selected,
      isCorrect: selected === current.correct_option_id,
      timeSpentSeconds: elapsed,
    };

    const newAnswers = [...answers, answer];
    setAnswers(newAnswers);

    if (currentIdx + 1 >= questions.length) {
      submitSession(newAnswers);
    } else {
      setCurrentIdx(currentIdx + 1);
      setSelected(null);
      setState("question");
      setStartTime(Date.now());
    }
  }

  const submitSession = useCallback(async (finalAnswers: Answer[]) => {
    setSubmitting(true);
    setState("complete");

    const res = await fetch("/api/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, answers: finalAnswers }),
    });

    const data = await res.json();
    setResults(data);
    setSubmitting(false);
  }, [sessionId]);

  if (state === "loading") {
    return (
      <div className="flex flex-col items-center justify-center min-h-96 gap-3">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        <p className="text-gray-500 text-sm">Loading your questions…</p>
      </div>
    );
  }

  if (state === "complete") {
    if (submitting || !results) {
      return (
        <div className="flex flex-col items-center justify-center min-h-96 gap-3">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <p className="text-gray-500 text-sm">Saving results and creating flashcards…</p>
        </div>
      );
    }

    const score = results.scorePercent;
    const passed = score >= 80;

    return (
      <div className="max-w-lg mx-auto text-center">
        <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 ${passed ? "bg-green-50" : "bg-orange-50"}`}>
          <span className="text-4xl font-bold" style={{ color: passed ? "#16a34a" : "#ea580c" }}>
            {Math.round(score)}%
          </span>
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {passed ? "Great start!" : "Assessment complete"}
        </h2>
        <p className="text-gray-500 mb-6">
          {results.flashcardsCreated > 0
            ? `${results.flashcardsCreated} flashcards created from your wrong answers`
            : "All correct — impressive start!"}
        </p>

        {results.examReadiness && (
          <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600 mb-6">
            <p className="font-medium text-gray-800 mb-1">AI Recommendation</p>
            <p>{results.examReadiness.recommendation}</p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => router.push("/dashboard")}
            className="flex-1 border border-gray-200 text-gray-700 py-3 rounded-xl font-medium text-sm hover:bg-gray-50 transition-colors"
          >
            View dashboard
          </button>
          <button
            onClick={() => router.push("/learn")}
            className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-blue-700 transition-colors"
          >
            Start daily study
          </button>
        </div>
      </div>
    );
  }

  if (!current) return null;

  const correctOption = current.options.find((o) => o.id === current.correct_option_id);
  const correctCount = answers.filter((a) => a.isCorrect).length;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress */}
      <div className="flex items-center justify-between mb-6">
        <span className="text-sm text-gray-500">
          Question {currentIdx + 1} of {questions.length}
        </span>
        <span className="text-sm font-medium text-gray-700">
          {correctCount} correct
        </span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-1.5 mb-8">
        <div
          className="bg-blue-500 h-1.5 rounded-full transition-all"
          style={{ width: `${((currentIdx) / questions.length) * 100}%` }}
        />
      </div>

      {/* Question */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 mb-4">
        <p className="text-gray-900 font-medium text-lg leading-relaxed mb-6">{current.text}</p>

        <div className="space-y-3">
          {current.options.map((option) => {
            let style = "border-gray-200 text-gray-700 hover:border-gray-300";
            if (state === "revealed") {
              if (option.id === current.correct_option_id) {
                style = "border-green-400 bg-green-50 text-green-800";
              } else if (option.id === selected) {
                style = "border-red-400 bg-red-50 text-red-800";
              } else {
                style = "border-gray-100 text-gray-400";
              }
            } else if (option.id === selected) {
              style = "border-blue-400 bg-blue-50 text-blue-800";
            }

            return (
              <button
                key={option.id}
                onClick={() => selectOption(option.id)}
                disabled={state === "revealed"}
                className={`w-full text-left px-5 py-4 rounded-xl border-2 text-sm font-medium transition-all ${style}`}
              >
                <span className="font-bold mr-3">{option.id}.</span>
                {option.text}
              </button>
            );
          })}
        </div>
      </div>

      {/* Explanation */}
      {state === "revealed" && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4">
          <div className="flex items-center gap-2 mb-2">
            {selected === current.correct_option_id ? (
              <CheckCircle className="w-4 h-4 text-green-500" />
            ) : (
              <XCircle className="w-4 h-4 text-red-500" />
            )}
            <span className="text-sm font-semibold text-gray-900">
              {selected === current.correct_option_id ? "Correct!" : `Correct: ${correctOption?.text}`}
            </span>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">{current.explanation}</p>
        </div>
      )}

      {state === "revealed" && (
        <button
          onClick={next}
          className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-semibold text-sm hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
        >
          {currentIdx + 1 >= questions.length ? "See results" : "Next question"}
          <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

export default function QuizPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-96"><Loader2 className="w-8 h-8 text-blue-500 animate-spin" /></div>}>
      <QuizContent />
    </Suspense>
  );
}
