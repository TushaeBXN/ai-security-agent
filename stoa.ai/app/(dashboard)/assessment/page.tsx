"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, Loader2 } from "lucide-react";

const CERTS = [
  {
    id: "11111111-0000-0000-0000-000000000001",
    name: "AWS Cloud Practitioner",
    badge: "CLF-C02",
    level: "Foundational",
    desc: "Perfect if you're new to AWS or cloud computing. ~20 questions across 4 domains.",
    color: "border-orange-200 bg-orange-50",
    badgeColor: "bg-orange-100 text-orange-700",
  },
  {
    id: "11111111-0000-0000-0000-000000000002",
    name: "Solutions Architect – Associate",
    badge: "SAA-C03",
    level: "Associate",
    desc: "For technical professionals already familiar with AWS. ~20 questions across 4 domains.",
    color: "border-blue-200 bg-blue-50",
    badgeColor: "bg-blue-100 text-blue-700",
  },
];

export default function AssessmentPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"pick" | "confirm">("pick");

  async function startAssessment() {
    if (!selected) return;
    setLoading(true);

    const res = await fetch("/api/assessment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ certificationId: selected }),
    });

    const data = await res.json();
    if (data.sessionId) {
      router.push(`/quiz?session=${data.sessionId}&type=assessment`);
    } else {
      setLoading(false);
    }
  }

  const cert = CERTS.find((c) => c.id === selected);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Choose your certification</h1>
        <p className="text-gray-500 mt-1">
          We'll run a 20-question diagnostic to map your knowledge gaps across every domain.
        </p>
      </div>

      {step === "pick" && (
        <div className="space-y-4">
          {CERTS.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelected(c.id)}
              className={`w-full text-left rounded-2xl border-2 p-6 transition-all ${
                selected === c.id
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-100 bg-white hover:border-gray-200"
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-md ${c.badgeColor}`}>
                    {c.badge}
                  </span>
                  <h3 className="font-semibold text-gray-900 mt-2 mb-1">{c.name}</h3>
                  <p className="text-sm text-gray-500">{c.desc}</p>
                </div>
                {selected === c.id && (
                  <CheckCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-1" />
                )}
              </div>
            </button>
          ))}

          <button
            onClick={() => setStep("confirm")}
            disabled={!selected}
            className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-semibold text-sm hover:bg-blue-700 transition-colors disabled:opacity-40 mt-2"
          >
            Continue
          </button>
        </div>
      )}

      {step === "confirm" && cert && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
          <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🎯</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Ready for your assessment?</h2>
          <p className="text-gray-500 text-sm mb-6 max-w-sm mx-auto">
            You'll answer ~20 questions across all {cert.name} domains. Don't worry about the score —
            this is just to find your gaps. It takes about 15 minutes.
          </p>

          <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600 mb-6 space-y-1.5">
            <p>✓ No wrong answers penalized here — just discovery</p>
            <p>✓ Your study plan is built from the results</p>
            <p>✓ Takes ~15 minutes to complete</p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep("pick")}
              className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-xl font-medium text-sm hover:bg-gray-50 transition-colors"
            >
              Back
            </button>
            <button
              onClick={startAssessment}
              disabled={loading}
              className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-blue-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating questions…
                </>
              ) : (
                "Start assessment"
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
