import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") || "10");

  // Get due flashcards (spaced repetition)
  const { data: flashcards } = await supabase
    .from("flashcards")
    .select("*, domain:domains(name), question:questions(text, options, correct_option_id, explanation)")
    .eq("user_id", user.id)
    .lte("next_review_at", new Date().toISOString())
    .order("next_review_at", { ascending: true })
    .limit(limit);

  return NextResponse.json({ flashcards: flashcards || [] });
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { flashcardId, rating } = await req.json();
  // rating: 0 (again), 1 (hard), 2 (good), 3 (easy)

  const { data: card } = await supabase
    .from("flashcards")
    .select()
    .eq("id", flashcardId)
    .eq("user_id", user.id)
    .single();

  if (!card) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // SM-2 spaced repetition algorithm
  const { intervalDays, easeFactor } = calculateNextReview(
    card.interval_days,
    card.ease_factor,
    rating
  );

  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + intervalDays);

  await supabase
    .from("flashcards")
    .update({
      interval_days: intervalDays,
      ease_factor: easeFactor,
      next_review_at: nextReview.toISOString(),
      review_count: card.review_count + 1,
    })
    .eq("id", flashcardId);

  return NextResponse.json({ nextReviewAt: nextReview.toISOString() });
}

function calculateNextReview(
  intervalDays: number,
  easeFactor: number,
  rating: number
): { intervalDays: number; easeFactor: number } {
  // SM-2 algorithm
  const newEase = Math.max(1.3, easeFactor + (0.1 - (3 - rating) * (0.08 + (3 - rating) * 0.02)));

  let newInterval: number;
  if (rating === 0) {
    newInterval = 1;
  } else if (rating === 1) {
    newInterval = Math.max(1, intervalDays * 0.5);
  } else if (intervalDays <= 1) {
    newInterval = 1;
  } else if (intervalDays <= 6) {
    newInterval = 6;
  } else {
    newInterval = Math.round(intervalDays * newEase);
  }

  return { intervalDays: newInterval, easeFactor: newEase };
}
