import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateFlashcard, calculateExamReadiness } from "@/lib/claude/quiz-engine";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sessionId, answers } = await req.json();
  // answers: [{ questionId, selectedOptionId, isCorrect, timeSpentSeconds }]

  const { data: session } = await supabase
    .from("quiz_sessions")
    .select("*, certification:certifications(name)")
    .eq("id", sessionId)
    .single();

  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  // Save answers
  await supabase.from("quiz_answers").insert(
    answers.map((a: { questionId: string; selectedOptionId: string; isCorrect: boolean; timeSpentSeconds: number }) => ({
      session_id: sessionId,
      question_id: a.questionId,
      selected_option_id: a.selectedOptionId,
      is_correct: a.isCorrect,
      time_spent_seconds: a.timeSpentSeconds,
    }))
  );

  const correctCount = answers.filter((a: { isCorrect: boolean }) => a.isCorrect).length;
  const scorePercent = (correctCount / answers.length) * 100;

  // Mark session complete
  await supabase
    .from("quiz_sessions")
    .update({ score_percent: scorePercent, completed_at: new Date().toISOString() })
    .eq("id", sessionId);

  // Group answers by domain to update domain_progress
  const questionIds = answers.map((a: { questionId: string }) => a.questionId);
  const { data: questions } = await supabase
    .from("questions")
    .select("id, domain_id, subtopic_id")
    .in("id", questionIds);

  const domainMap = new Map<string, { seen: number; correct: number }>();
  const subtopicMap = new Map<string, { seen: number; correct: number }>();

  for (const answer of answers as { questionId: string; isCorrect: boolean }[]) {
    const q = questions?.find((q) => q.id === answer.questionId);
    if (!q) continue;

    const dm = domainMap.get(q.domain_id) || { seen: 0, correct: 0 };
    dm.seen++;
    if (answer.isCorrect) dm.correct++;
    domainMap.set(q.domain_id, dm);

    if (q.subtopic_id) {
      const sm = subtopicMap.get(q.subtopic_id) || { seen: 0, correct: 0 };
      sm.seen++;
      if (answer.isCorrect) sm.correct++;
      subtopicMap.set(q.subtopic_id, sm);
    }
  }

  // Upsert domain progress
  for (const [domainId, stats] of domainMap) {
    const { data: existing } = await supabase
      .from("domain_progress")
      .select()
      .eq("user_id", user.id)
      .eq("domain_id", domainId)
      .single();

    const totalSeen = (existing?.questions_seen || 0) + stats.seen;
    const totalCorrect = (existing?.questions_correct || 0) + stats.correct;

    await supabase.from("domain_progress").upsert({
      user_id: user.id,
      domain_id: domainId,
      questions_seen: totalSeen,
      questions_correct: totalCorrect,
      score_percent: (totalCorrect / totalSeen) * 100,
      last_studied_at: new Date().toISOString(),
    }, { onConflict: "user_id,domain_id" });
  }

  // Upsert subtopic progress
  for (const [subtopicId, stats] of subtopicMap) {
    const { data: existing } = await supabase
      .from("subtopic_progress")
      .select()
      .eq("user_id", user.id)
      .eq("subtopic_id", subtopicId)
      .single();

    const totalSeen = (existing?.questions_seen || 0) + stats.seen;
    const totalCorrect = (existing?.questions_correct || 0) + stats.correct;

    await supabase.from("subtopic_progress").upsert({
      user_id: user.id,
      subtopic_id: subtopicId,
      questions_seen: totalSeen,
      questions_correct: totalCorrect,
      score_percent: (totalCorrect / totalSeen) * 100,
      last_studied_at: new Date().toISOString(),
    }, { onConflict: "user_id,subtopic_id" });
  }

  // Generate flashcards for wrong answers
  const wrongAnswers = (answers as { questionId: string; isCorrect: boolean }[]).filter((a) => !a.isCorrect);
  const flashcardsCreated: string[] = [];

  for (const wrong of wrongAnswers) {
    const q = questions?.find((q) => q.id === wrong.questionId);
    if (!q) continue;

    const { data: fullQ } = await supabase
      .from("questions")
      .select("text, options, correct_option_id, explanation")
      .eq("id", wrong.questionId)
      .single();

    if (!fullQ) continue;

    const correctOption = (fullQ.options as { id: string; text: string }[]).find(
      (o) => o.id === fullQ.correct_option_id
    );

    try {
      const flashcard = await generateFlashcard({
        questionText: fullQ.text,
        correctAnswer: correctOption?.text || "",
        explanation: fullQ.explanation,
        subtopic: "",
      });

      await supabase.from("flashcards").upsert({
        user_id: user.id,
        question_id: wrong.questionId,
        domain_id: q.domain_id,
        subtopic_id: q.subtopic_id,
        front: flashcard.front,
        back: flashcard.back,
        next_review_at: new Date().toISOString(),
      }, { onConflict: "user_id,question_id" });

      flashcardsCreated.push(wrong.questionId);
    } catch {}
  }

  // Recalculate exam readiness
  const { data: allDomainProgress } = await supabase
    .from("domain_progress")
    .select("*, domain:domains(name)")
    .eq("user_id", user.id);

  let readiness = null;
  if (allDomainProgress && allDomainProgress.length > 0) {
    readiness = await calculateExamReadiness({
      certification: session.certification.name,
      domainScores: allDomainProgress.map((dp: { domain: { name: string }; score_percent: number; questions_seen: number }) => ({
        domainName: dp.domain?.name || "",
        score: dp.score_percent,
        questionsAttempted: dp.questions_seen,
      })),
    });

    await supabase.from("user_certifications").upsert({
      user_id: user.id,
      certification_id: session.certification_id,
      exam_readiness_score: readiness.overallScore,
    }, { onConflict: "user_id,certification_id" });
  }

  return NextResponse.json({
    scorePercent,
    correctCount,
    totalCount: answers.length,
    flashcardsCreated: flashcardsCreated.length,
    examReadiness: readiness,
  });
}
