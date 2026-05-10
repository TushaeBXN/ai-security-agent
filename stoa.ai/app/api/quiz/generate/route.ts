import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateQuizQuestions } from "@/lib/claude/quiz-engine";
import { Domain, DomainProgress } from "@/lib/types";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { certificationId, count = 5 } = await req.json();

  // Find weakest domain for this user
  const { data: domainProgressRows } = await supabase
    .from("domain_progress")
    .select("*, domain:domains(*, subtopics(*))")
    .eq("user_id", user.id);

  // Get all domains for this certification
  const { data: cert } = await supabase
    .from("certifications")
    .select("*, domains(*, subtopics(*))")
    .eq("id", certificationId)
    .single();

  if (!cert) return NextResponse.json({ error: "Certification not found" }, { status: 404 });

  const allDomains = cert.domains as Domain[];
  const progressMap = new Map(
    (domainProgressRows || []).map((p: DomainProgress) => [p.domain_id, p])
  );

  // Sort domains by score ascending (weakest first), fall back to unseen
  const sorted = [...allDomains].sort((a, b) => {
    const pa = progressMap.get(a.id);
    const pb = progressMap.get(b.id);
    const sa = pa ? pa.score_percent : -1;
    const sb = pb ? pb.score_percent : -1;
    return sa - sb;
  });

  const targetDomain = sorted[0];

  // Get wrong subtopics to weight towards
  const { data: subtopicProgressRows } = await supabase
    .from("subtopic_progress")
    .select("*, subtopic:subtopics(name)")
    .eq("user_id", user.id)
    .lt("score_percent", 70);

  const previouslyWrong = (subtopicProgressRows || [])
    .map((sp: { subtopic: { name: string } }) => sp.subtopic?.name)
    .filter(Boolean);

  const questions = await generateQuizQuestions({
    certification: cert.name,
    domain: targetDomain,
    subtopics: targetDomain.subtopics,
    count,
    difficulty: "mixed",
    previouslyWrong,
  });

  // Create quiz session
  const { data: session } = await supabase
    .from("quiz_sessions")
    .insert({
      user_id: user.id,
      certification_id: certificationId,
      session_type: "practice",
    })
    .select()
    .single();

  // Store generated questions
  const { data: inserted } = await supabase
    .from("questions")
    .insert(
      questions.map((q) => ({
        certification_id: certificationId,
        domain_id: targetDomain.id,
        text: q.text,
        options: q.options,
        correct_option_id: q.correct_option_id,
        explanation: q.explanation,
        difficulty: q.difficulty,
        is_ai_generated: true,
      }))
    )
    .select();

  return NextResponse.json({
    sessionId: session?.id,
    domain: targetDomain,
    questions: inserted,
  });
}
