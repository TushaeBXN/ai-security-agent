import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateAssessmentQuestions } from "@/lib/claude/quiz-engine";
import { Domain } from "@/lib/types";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { certificationId } = await req.json();

  // Fetch certification + domains + subtopics
  const { data: cert } = await supabase
    .from("certifications")
    .select("*, domains(*, subtopics(*))")
    .eq("id", certificationId)
    .single();

  if (!cert) return NextResponse.json({ error: "Certification not found" }, { status: 404 });

  const domains = cert.domains as Domain[];

  // Generate 5 questions per domain (20 total for CCP, adjust per cert)
  const questionsPerDomain = Math.max(3, Math.min(5, Math.floor(20 / domains.length)));

  const generated = await generateAssessmentQuestions({
    certification: cert.name,
    domains,
    questionsPerDomain,
  });

  // Store questions in DB and create quiz session
  const { data: session } = await supabase
    .from("quiz_sessions")
    .insert({
      user_id: user.id,
      certification_id: certificationId,
      session_type: "assessment",
    })
    .select()
    .single();

  const questionsToInsert = generated.flatMap(({ domainId, questions }) =>
    questions.map((q) => ({
      certification_id: certificationId,
      domain_id: domainId,
      text: q.text,
      options: q.options,
      correct_option_id: q.correct_option_id,
      explanation: q.explanation,
      difficulty: q.difficulty,
      is_ai_generated: true,
    }))
  );

  const { data: insertedQuestions } = await supabase
    .from("questions")
    .insert(questionsToInsert)
    .select();

  return NextResponse.json({
    sessionId: session?.id,
    questions: insertedQuestions,
    certificationName: cert.name,
  });
}
