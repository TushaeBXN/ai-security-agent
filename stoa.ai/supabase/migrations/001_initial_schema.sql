-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─── Certifications catalog ───────────────────────────────────────────────────

create table certifications (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text not null unique,
  provider text not null default 'AWS',
  level text not null check (level in ('foundational', 'associate', 'professional', 'specialty')),
  created_at timestamptz default now()
);

create table domains (
  id uuid primary key default uuid_generate_v4(),
  certification_id uuid not null references certifications(id) on delete cascade,
  name text not null,
  slug text not null,
  weight_percent numeric(5,2) not null,
  sort_order int not null default 0,
  unique (certification_id, slug)
);

create table subtopics (
  id uuid primary key default uuid_generate_v4(),
  domain_id uuid not null references domains(id) on delete cascade,
  name text not null,
  slug text not null,
  unique (domain_id, slug)
);

-- ─── User profiles ────────────────────────────────────────────────────────────

create table user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  subscription_status text not null default 'free'
    check (subscription_status in ('free', 'active', 'canceled', 'past_due')),
  subscription_tier text check (subscription_tier in ('monthly', 'yearly')),
  stripe_customer_id text unique,
  created_at timestamptz default now()
);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into user_profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ─── User certifications ──────────────────────────────────────────────────────

create table user_certifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references user_profiles(id) on delete cascade,
  certification_id uuid not null references certifications(id) on delete cascade,
  started_at timestamptz default now(),
  exam_booked_for date,
  passed_at timestamptz,
  exam_readiness_score numeric(5,2) default 0,
  unique (user_id, certification_id)
);

-- ─── Progress tracking ────────────────────────────────────────────────────────

create table domain_progress (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references user_profiles(id) on delete cascade,
  domain_id uuid not null references domains(id) on delete cascade,
  score_percent numeric(5,2) default 0,
  questions_seen int default 0,
  questions_correct int default 0,
  last_studied_at timestamptz default now(),
  unique (user_id, domain_id)
);

create table subtopic_progress (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references user_profiles(id) on delete cascade,
  subtopic_id uuid not null references subtopics(id) on delete cascade,
  score_percent numeric(5,2) default 0,
  questions_seen int default 0,
  questions_correct int default 0,
  last_studied_at timestamptz default now(),
  unique (user_id, subtopic_id)
);

-- ─── Question bank ────────────────────────────────────────────────────────────

create table questions (
  id uuid primary key default uuid_generate_v4(),
  certification_id uuid not null references certifications(id) on delete cascade,
  domain_id uuid not null references domains(id) on delete cascade,
  subtopic_id uuid references subtopics(id) on delete set null,
  text text not null,
  options jsonb not null,          -- [{id, text}, ...]
  correct_option_id text not null,
  explanation text not null,
  difficulty text not null default 'medium'
    check (difficulty in ('easy', 'medium', 'hard')),
  is_ai_generated boolean default true,
  created_at timestamptz default now()
);

-- ─── Quiz sessions ────────────────────────────────────────────────────────────

create table quiz_sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references user_profiles(id) on delete cascade,
  certification_id uuid not null references certifications(id) on delete cascade,
  session_type text not null check (session_type in ('assessment', 'practice', 'mock_exam')),
  score_percent numeric(5,2),
  completed_at timestamptz,
  created_at timestamptz default now()
);

create table quiz_answers (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid not null references quiz_sessions(id) on delete cascade,
  question_id uuid not null references questions(id) on delete cascade,
  selected_option_id text,
  is_correct boolean,
  time_spent_seconds int,
  answered_at timestamptz default now()
);

-- ─── Flashcards (spaced repetition) ──────────────────────────────────────────

create table flashcards (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references user_profiles(id) on delete cascade,
  question_id uuid not null references questions(id) on delete cascade,
  domain_id uuid not null references domains(id) on delete cascade,
  subtopic_id uuid references subtopics(id) on delete set null,
  front text not null,
  back text not null,
  next_review_at timestamptz default now(),
  interval_days numeric(8,2) default 1,
  ease_factor numeric(4,2) default 2.5,
  review_count int default 0,
  created_at timestamptz default now(),
  unique (user_id, question_id)
);

-- ─── Row-level security ───────────────────────────────────────────────────────

alter table user_profiles enable row level security;
alter table user_certifications enable row level security;
alter table domain_progress enable row level security;
alter table subtopic_progress enable row level security;
alter table quiz_sessions enable row level security;
alter table quiz_answers enable row level security;
alter table flashcards enable row level security;

-- Users can only see/edit their own data
create policy "users_own_profile" on user_profiles
  for all using (auth.uid() = id);

create policy "users_own_certifications" on user_certifications
  for all using (auth.uid() = user_id);

create policy "users_own_domain_progress" on domain_progress
  for all using (auth.uid() = user_id);

create policy "users_own_subtopic_progress" on subtopic_progress
  for all using (auth.uid() = user_id);

create policy "users_own_quiz_sessions" on quiz_sessions
  for all using (auth.uid() = user_id);

create policy "users_own_quiz_answers" on quiz_answers
  for all using (
    session_id in (select id from quiz_sessions where user_id = auth.uid())
  );

create policy "users_own_flashcards" on flashcards
  for all using (auth.uid() = user_id);

-- Catalog tables are public read
alter table certifications enable row level security;
alter table domains enable row level security;
alter table subtopics enable row level security;
alter table questions enable row level security;

create policy "certifications_public_read" on certifications for select using (true);
create policy "domains_public_read" on domains for select using (true);
create policy "subtopics_public_read" on subtopics for select using (true);
create policy "questions_public_read" on questions for select using (true);
