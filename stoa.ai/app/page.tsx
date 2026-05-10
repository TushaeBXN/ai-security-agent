import Link from "next/link";
import { ArrowRight, Brain, Target, TrendingUp, CheckCircle, Zap } from "lucide-react";

const FEATURES = [
  {
    icon: Target,
    title: "Gap-First Learning",
    desc: "Take a skill assessment on day one. We identify exactly what you don't know so you never waste time on topics you already understand.",
  },
  {
    icon: Brain,
    title: "Active Recall Engine",
    desc: "Quiz → wrong answer → flashcard. Every mistake is automatically converted into a spaced-repetition flashcard that brings it back at the right moment.",
  },
  {
    icon: TrendingUp,
    title: "Real-Time Readiness Score",
    desc: "Know your exam readiness by domain, updated after every quiz. We tell you exactly when to book — no guessing, no flying blind.",
  },
  {
    icon: Zap,
    title: "AI-Generated Questions",
    desc: "Claude generates fresh, exam-quality questions targeted at your weakest subtopics. No recycled question banks, no memorizing answer patterns.",
  },
];

const CERTS = [
  { name: "AWS Cloud Practitioner", level: "Foundational", badge: "CLF-C02", color: "bg-orange-100 text-orange-700" },
  { name: "Solutions Architect – Associate", level: "Associate", badge: "SAA-C03", color: "bg-blue-100 text-blue-700" },
  { name: "More coming soon", level: "Azure · GCP · Terraform", badge: "2025", color: "bg-gray-100 text-gray-500" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-gray-100 px-6 py-4 flex items-center justify-between max-w-7xl mx-auto">
        <span className="text-xl font-bold text-gray-900">stoa<span className="text-blue-600">.ai</span></span>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
            Sign in
          </Link>
          <Link
            href="/signup"
            className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Start free
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 text-sm font-medium px-3 py-1 rounded-full mb-6">
          <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          AWS certified in weeks, not months
        </div>
        <h1 className="text-5xl sm:text-6xl font-extrabold text-gray-900 leading-tight mb-6">
          Study your gaps.<br />
          <span className="text-blue-600">Not everything.</span>
        </h1>
        <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10">
          Stoa identifies what you already know, then focuses every study session on your weakest domains —
          with AI-generated questions, automatic flashcards, and a real-time readiness score that tells you exactly when to book.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/signup"
            className="flex items-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
          >
            Start your assessment <ArrowRight className="w-5 h-5" />
          </Link>
          <Link
            href="/login"
            className="flex items-center gap-2 text-gray-600 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-gray-50 transition-colors border border-gray-200"
          >
            Sign in
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">The daily learning loop</h2>
          <p className="text-center text-gray-500 mb-14 max-w-xl mx-auto">
            Log in, hit start. That's it. Every session is personalized to your weakest area automatically.
          </p>
          <div className="grid sm:grid-cols-4 gap-4">
            {[
              { step: "1", title: "Assessment", desc: "Day 1: take a diagnostic across all exam domains to map your knowledge" },
              { step: "2", title: "Focused quiz", desc: "Daily 5-question quiz on your weakest domain, generated fresh by AI" },
              { step: "3", title: "Auto flashcards", desc: "Wrong answers become flashcards. Spaced repetition surfaces them at the right time" },
              { step: "4", title: "Book with confidence", desc: "Your readiness score hits 80%+ across all domains — we give you the signal" },
            ].map((item) => (
              <div key={item.step} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center text-sm font-bold mb-4">
                  {item.step}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-14">Built differently</h2>
        <div className="grid sm:grid-cols-2 gap-8">
          {FEATURES.map((f) => (
            <div key={f.title} className="flex gap-4">
              <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <f.icon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Certifications */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Available certifications</h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {CERTS.map((c) => (
              <div key={c.name} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <span className={`text-xs font-semibold px-2 py-1 rounded-md ${c.color}`}>{c.badge}</span>
                <h3 className="font-semibold text-gray-900 mt-3 mb-1">{c.name}</h3>
                <p className="text-sm text-gray-500">{c.level}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social proof */}
      <section className="max-w-3xl mx-auto px-6 py-20 text-center">
        <div className="flex flex-col items-center gap-3 mb-8">
          {["Passed CLF-C02 in 11 days — was dreading the 30-hour Udemy course", "Finally understood my weak spots after the assessment. Game changer.", "Flashcards auto-created from my wrong answers saved me hours of prep"].map((q) => (
            <div key={q} className="flex items-start gap-3 bg-gray-50 rounded-xl px-5 py-4 text-left max-w-lg w-full">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-gray-700">{q}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-blue-600 py-20 text-center">
        <h2 className="text-3xl font-bold text-white mb-4">Ready to study smarter?</h2>
        <p className="text-blue-100 mb-8 max-w-md mx-auto">
          Take your free skill assessment today. No credit card required to start.
        </p>
        <Link
          href="/signup"
          className="inline-flex items-center gap-2 bg-white text-blue-600 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-blue-50 transition-colors shadow-lg"
        >
          Start free assessment <ArrowRight className="w-5 h-5" />
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8 text-center text-sm text-gray-400">
        <span>stoa.ai — built for cloud engineers who ship</span>
      </footer>
    </div>
  );
}
