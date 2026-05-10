import Anthropic from "@anthropic-ai/sdk";
import { GeneratedQuestion, Domain, Subtopic } from "@/lib/types";

const client = new Anthropic();

const SYSTEM_PROMPT = `You are an expert AWS certification exam question writer with deep knowledge of AWS services, architecture patterns, and best practices. You create realistic, challenging multiple-choice questions that mirror the style and difficulty of actual AWS certification exams.

Rules:
- Questions must test genuine understanding, not memorization
- Distractors (wrong answers) must be plausible — never obviously wrong
- Explanations must teach the WHY, not just state the correct answer
- Always include the AWS service name or concept being tested
- Match the difficulty level requested`;

export async function generateQuizQuestions({
  certification,
  domain,
  subtopics,
  count,
  difficulty,
  previouslyWrong,
}: {
  certification: string;
  domain: Domain;
  subtopics: Subtopic[];
  count: number;
  difficulty: "easy" | "medium" | "hard" | "mixed";
  previouslyWrong?: string[];
}): Promise<GeneratedQuestion[]> {
  const subtopicList = subtopics.map((s) => `- ${s.name}`).join("\n");
  const wrongContext =
    previouslyWrong && previouslyWrong.length > 0
      ? `\nThe user previously got these topics wrong — weight towards these:\n${previouslyWrong.join(", ")}`
      : "";

  const prompt = `Generate ${count} multiple-choice questions for the ${certification} certification exam.

Domain: ${domain.name} (${domain.weight_percent}% of exam)
Subtopics to cover:
${subtopicList}
${wrongContext}

Difficulty: ${difficulty}

Return ONLY a valid JSON array with this exact structure:
[
  {
    "text": "Question text here",
    "options": [
      {"id": "A", "text": "Option A text"},
      {"id": "B", "text": "Option B text"},
      {"id": "C", "text": "Option C text"},
      {"id": "D", "text": "Option D text"}
    ],
    "correct_option_id": "A",
    "explanation": "Detailed explanation of why A is correct and why B, C, D are wrong",
    "difficulty": "medium",
    "subtopic": "exact subtopic name from the list above"
  }
]`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: prompt }],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error("Failed to parse quiz questions from Claude");

  return JSON.parse(jsonMatch[0]) as GeneratedQuestion[];
}

export async function generateAssessmentQuestions({
  certification,
  domains,
  questionsPerDomain,
}: {
  certification: string;
  domains: Domain[];
  questionsPerDomain: number;
}): Promise<{ domainId: string; questions: GeneratedQuestion[] }[]> {
  // Generate questions for all domains in parallel (with prompt caching)
  const results = await Promise.all(
    domains.map(async (domain) => {
      const questions = await generateQuizQuestions({
        certification,
        domain,
        subtopics: domain.subtopics,
        count: questionsPerDomain,
        difficulty: "mixed",
      });
      return { domainId: domain.id, questions };
    })
  );

  return results;
}

export async function generateFlashcard({
  questionText,
  correctAnswer,
  explanation,
  subtopic,
}: {
  questionText: string;
  correctAnswer: string;
  explanation: string;
  subtopic: string;
}): Promise<{ front: string; back: string }> {
  const prompt = `Convert this AWS exam question into a concise flashcard for active recall.

Question: ${questionText}
Correct Answer: ${correctAnswer}
Explanation: ${explanation}
Subtopic: ${subtopic}

Return ONLY valid JSON:
{
  "front": "A clear, concise question or concept prompt (1-2 sentences max)",
  "back": "The answer with the key insight — what makes this right and what to watch out for (2-4 sentences max)"
}`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 512,
    messages: [{ role: "user", content: prompt }],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Failed to parse flashcard from Claude");

  return JSON.parse(jsonMatch[0]);
}

export async function calculateExamReadiness({
  certification,
  domainScores,
}: {
  certification: string;
  domainScores: { domainName: string; score: number; questionsAttempted: number }[];
}): Promise<{
  overallScore: number;
  readyToBook: boolean;
  recommendation: string;
}> {
  const scoresText = domainScores
    .map((d) => `${d.domainName}: ${d.score.toFixed(1)}% (${d.questionsAttempted} questions)`)
    .join("\n");

  const weakDomains = domainScores.filter((d) => d.score < 75);
  const hasEnoughData = domainScores.every((d) => d.questionsAttempted >= 10);
  const overallScore =
    domainScores.reduce((sum, d) => sum + d.score, 0) / domainScores.length;
  const readyToBook =
    hasEnoughData && overallScore >= 80 && weakDomains.length === 0;

  const prompt = `A student is preparing for ${certification}. Analyze their readiness and give a one-sentence recommendation.

Domain scores:
${scoresText}

Overall: ${overallScore.toFixed(1)}%
Ready to book: ${readyToBook}

Return ONLY valid JSON:
{
  "recommendation": "One actionable sentence about what to focus on next or whether to book the exam"
}`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 256,
    messages: [{ role: "user", content: prompt }],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { recommendation: "" };

  return {
    overallScore,
    readyToBook,
    recommendation: parsed.recommendation,
  };
}
