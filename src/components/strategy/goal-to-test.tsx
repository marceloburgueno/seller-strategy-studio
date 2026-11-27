import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { MAX_MONTHLY_GOAL, type GoalToTest as GoalToTestResult } from "@/lib/gtm-plan";

/** Goal-to-Test: the monthly goal, worked backwards into weekly tests, with a plain warning when the pace is short. */
export function GoalToTest({
  result,
  onGoalChange,
}: {
  result: GoalToTestResult;
  onGoalChange: (goal: number) => void;
}) {
  const [draft, setDraft] = useState(String(result.goal));
  // Follow the saved goal when it arrives after mount or is reset.
  useEffect(() => setDraft(String(result.goal)), [result.goal]);
  const short = result.testsPerWeekNeeded != null && !result.onPace;

  return (
    <section aria-labelledby="goal-title" className="rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <h3 id="goal-title" className="section-title">
            Goal-to-Test
          </h3>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm">
            <span>Meta:</span>
            <Input
              aria-label="Reuniones cualificadas este mes"
              inputMode="numeric"
              className="h-8 w-16 text-center"
              value={draft}
              onChange={(e) => {
                const v = e.target.value;
                setDraft(v);
                const n = Number(v);
                if (/^\d{1,3}$/.test(v) && n >= 1 && n <= MAX_MONTHLY_GOAL) onGoalChange(n);
              }}
            />
            <span>reuniones cualificadas este mes</span>
          </div>
        </div>
        <dl className="flex gap-6 text-sm">
          <div>
            <dt className="text-meta">Pruebas/semana necesarias</dt>
            <dd
              className={`font-display text-xl font-semibold tabular-nums ${short ? "text-state-alarm" : ""}`}
            >
              {result.testsPerWeekNeeded ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-meta">Ritmo actual</dt>
            <dd className="font-display text-xl font-semibold tabular-nums">
              {result.testsPerWeekNow}
            </dd>
          </div>
        </dl>
      </div>
      <p role="status" className={`mt-3 text-sm ${short ? "text-state-alarm" : "text-ink-mid"}`}>
        {result.message}
      </p>
    </section>
  );
}
