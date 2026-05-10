import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Brain, ArrowRight, CalendarCheck, Layers, Trophy } from "lucide-react";

function scoreColor(score: number) {
  if (score >= 80) return "text-green-600";
  if (score >= 60) return "text-yellow-600";
  return "text-red-500";
}

function scoreBg(score: number) {
  if (score >= 80) return "bg-green-50 border-green-100";
  if (score >= 60) return "bg-yellow-50 border-yellow-100";
  return "bg-red-50 border-red-100";
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: userCert }, { data: domainProgress }, { data: flashcardsDue }, { data: recentSessions }] =
    await Promise.all([
      supabase.from("user_profiles").select("full_name").eq("id", user.id).single(),
      supabase
        .from("user_certifications")
        .select("*, certification:certifications(name, domains(id, name, weight_percent))")
        .eq("user_id", user.id)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("domain_progress")
        .select("*, domain:domains(name, weight_percent)")
        .eq("user_id", user.id)
        .order("score_percent", { ascending: true }),
      supabase
        .from("flashcards")
        .select("id", { count: "exact" })
        .eq("user_id", user.id)
        .lte("next_review_at", new Date().toISOString()),
      supabase
        .from("quiz_sessions")
        .select("id, session_type, score_percent, completed_at")
        .eq("user_id", user.id)
        .not("completed_at", "is", null)
        .order("completed_at", { ascending: false })
        .limit(5),
    ]);

  const hasStarted = !!userCert;
  const readinessScore = userCert?.exam_readiness_score ?? 0;
  const readyToBook = readinessScore >= 80 && (domainProgress?.every((d) => d.score_percent >= 75) ?? false);
  const flashcardsCount = flashcardsDue?.length ?? 0;

  const firstName = profile?.full_name?.split(" ")[0] || "there";

  if (!hasStarted) {
    return (
      <div className="max-w-lg mx-auto py-16 text-center">
        <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Brain className="w-8 h-8 text-blue-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome to Stoa, {firstName}!</h1>
        <p className="text-gray-500 mb-8">
          Start with a skill assessment to map your knowledge gaps. It takes about 15 minutes and
          unlocks your personalized study plan.
        </p>
        <Link
          href="/assessment"
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
        >
          Start assessment <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Good morning, {firstName} 👋
        </h1>
        <p className="text-gray-500 mt-1 text-sm">
          {userCert?.certification?.name} — keep the streak going
        </p>
      </div>

      {/* Readiness score + CTA */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
        <div className={`rounded-2xl border p-6 ${readyToBook ? "bg-green-50 border-green-200" : "bg-white border-gray-100"} shadow-sm`}>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Exam Readiness</p>
          <p className={`text-4xl font-extrabold mb-1 ${scoreColor(readinessScore)}`}>
            {Math.round(readinessScore)}%
          </p>
          {readyToBook ? (
            <p className="text-sm text-green-700 font-medium flex items-center gap-1">
              <Trophy className="w-3.5 h-3.5" /> Ready to book!
            </p>
          ) : (
            <p className="text-xs text-gray-400">Target: 80% across all domains</p>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Flashcards Due</p>
          <p className="text-4xl font-extrabold text-gray-900 mb-1">{flashcardsCount}</p>
          {flashcardsCount > 0 ? (
            <Link href="/flashcards" className="text-xs text-blue-600 font-medium hover:underline">
              Review now →
            </Link>
          ) : (
            <p className="text-xs text-gray-400">All caught up!</p>
          )}
        </div>

        <div className="bg-blue-600 rounded-2xl p-6 text-white shadow-sm">
          <p className="text-xs font-medium text-blue-200 uppercase tracking-wide mb-1">Today</p>
          <p className="text-lg font-bold mb-3">Daily Study Session</p>
          <Link
            href="/learn"
            className="inline-flex items-center gap-1.5 bg-white text-blue-600 text-sm font-semibold px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors"
          >
            Start <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Domain breakdown */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
        <h2 className="font-semibold text-gray-900 mb-4">Domain Progress</h2>
        {domainProgress && domainProgress.length > 0 ? (
          <div className="space-y-4">
            {domainProgress.map((dp) => (
              <div key={dp.domain_id}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-700">{dp.domain?.name}</span>
                  <span className={`text-sm font-semibold ${scoreColor(dp.score_percent)}`}>
                    {Math.round(dp.score_percent)}%
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      dp.score_percent >= 80
                        ? "bg-green-500"
                        : dp.score_percent >= 60
                        ? "bg-yellow-400"
                        : "bg-red-400"
                    }`}
                    style={{ width: `${Math.min(100, dp.score_percent)}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{dp.questions_seen} questions attempted</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">Complete a quiz to see your domain progress.</p>
        )}
      </div>

      {/* Recent sessions */}
      {recentSessions && recentSessions.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Recent Sessions</h2>
          <div className="space-y-3">
            {recentSessions.map((s) => (
              <div key={s.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-3">
                  {s.session_type === "assessment" ? (
                    <CalendarCheck className="w-4 h-4 text-purple-500" />
                  ) : s.session_type === "mock_exam" ? (
                    <Trophy className="w-4 h-4 text-yellow-500" />
                  ) : (
                    <Brain className="w-4 h-4 text-blue-500" />
                  )}
                  <span className="text-sm text-gray-700 capitalize">{s.session_type.replace("_", " ")}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`text-sm font-semibold ${scoreColor(s.score_percent || 0)}`}>
                    {Math.round(s.score_percent || 0)}%
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(s.completed_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
