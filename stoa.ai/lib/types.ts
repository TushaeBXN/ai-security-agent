export type Certification = {
  id: string;
  name: string;
  slug: string;
  provider: string;
  level: "foundational" | "associate" | "professional" | "specialty";
  domains: Domain[];
};

export type Domain = {
  id: string;
  certification_id: string;
  name: string;
  slug: string;
  weight_percent: number;
  subtopics: Subtopic[];
};

export type Subtopic = {
  id: string;
  domain_id: string;
  name: string;
  slug: string;
};

export type UserProfile = {
  id: string;
  email: string;
  full_name: string | null;
  subscription_status: "free" | "active" | "canceled" | "past_due";
  subscription_tier: "monthly" | "yearly" | null;
  stripe_customer_id: string | null;
  created_at: string;
};

export type UserCertification = {
  id: string;
  user_id: string;
  certification_id: string;
  started_at: string;
  exam_booked_for: string | null;
  passed_at: string | null;
  exam_readiness_score: number;
  certification?: Certification;
};

export type DomainProgress = {
  id: string;
  user_id: string;
  domain_id: string;
  score_percent: number;
  questions_seen: number;
  questions_correct: number;
  last_studied_at: string;
  domain?: Domain;
};

export type SubtopicProgress = {
  id: string;
  user_id: string;
  subtopic_id: string;
  score_percent: number;
  questions_seen: number;
  questions_correct: number;
  last_studied_at: string;
  subtopic?: Subtopic;
};

export type Question = {
  id: string;
  certification_id: string;
  domain_id: string;
  subtopic_id: string | null;
  text: string;
  options: QuestionOption[];
  correct_option_id: string;
  explanation: string;
  difficulty: "easy" | "medium" | "hard";
  is_ai_generated: boolean;
  created_at: string;
};

export type QuestionOption = {
  id: string;
  text: string;
};

export type QuizSession = {
  id: string;
  user_id: string;
  certification_id: string;
  session_type: "assessment" | "practice" | "mock_exam";
  questions: QuizQuestion[];
  score_percent: number | null;
  completed_at: string | null;
  created_at: string;
};

export type QuizQuestion = {
  question_id: string;
  selected_option_id: string | null;
  is_correct: boolean | null;
  time_spent_seconds: number | null;
  question?: Question;
};

export type Flashcard = {
  id: string;
  user_id: string;
  question_id: string;
  domain_id: string;
  subtopic_id: string | null;
  front: string;
  back: string;
  next_review_at: string;
  interval_days: number;
  ease_factor: number;
  review_count: number;
  question?: Question;
};

export type GeneratedQuiz = {
  questions: GeneratedQuestion[];
};

export type GeneratedQuestion = {
  text: string;
  options: { id: string; text: string }[];
  correct_option_id: string;
  explanation: string;
  difficulty: "easy" | "medium" | "hard";
  subtopic: string;
};

export type ExamReadiness = {
  overall_score: number;
  domain_scores: { domain: Domain; score: number }[];
  ready_to_book: boolean;
  weakest_domains: Domain[];
  strongest_domains: Domain[];
};
