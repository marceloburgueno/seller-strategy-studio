import { Badge } from "@/components/ui/badge";
import { CONFIDENCE_LABEL, type Confidence, type Hypothesis, type PlanTask } from "@/lib/gtm-plan";

const CONFIDENCE_TONE: Record<Confidence, string> = {
  low: "text-state-alarm",
  medium: "text-ink-mid",
  high: "text-state-ok",
};

/** Live hypotheses: each bet with its evidence and the plan tasks it feeds (they open the task panel). */
export function HypothesisBoard({
  hypotheses,
  tasks,
  onOpenTask,
}: {
  hypotheses: Hypothesis[];
  tasks: PlanTask[];
  onOpenTask: (id: string) => void;
}) {
  return (
    <section aria-labelledby="hyp-title" className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 id="hyp-title" className="section-title">
          Hipótesis vivas
        </h3>
        <p className="text-meta">Cada hipótesis abre las tareas del plan que dependen de ella.</p>
      </div>
      <ul className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {hypotheses.map((h) => {
          const linked = h.taskIds
            .map((id) => tasks.find((t) => t.id === id))
            .filter((t): t is PlanTask => !!t);
          return (
            <li
              key={h.id}
              aria-label={`Hipótesis ${h.label}`}
              className="flex min-w-0 flex-col rounded-lg border bg-card p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold">Hipótesis {h.label}</span>
                <Badge variant="secondary">{h.version}</Badge>
                <Badge variant={h.tier === 1 ? "default" : "outline"}>Tier {h.tier}</Badge>
                <span className={`ml-auto text-xs font-medium ${CONFIDENCE_TONE[h.confidence]}`}>
                  Confianza: {CONFIDENCE_LABEL[h.confidence]}
                </span>
              </div>
              <dl className="mt-3 space-y-1.5 text-sm">
                <Row term="Segmento" value={h.segment} />
                <Row term="Dolor" value={h.pain} />
                <Row term="Oferta / CTA" value={h.offer} />
              </dl>
              <p className="text-meta mt-3">
                {h.meetings} {h.meetings === 1 ? "reunión" : "reuniones"} en {h.touches} toques ·{" "}
                {h.focus} % del foco
              </p>
              <ul className="mt-2 space-y-1 border-l-2 border-hairline pl-3 text-sm text-ink-mid">
                {h.evidence.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
              {linked.length > 0 && (
                <div className="mt-auto pt-3">
                  <p className="text-meta">En el plan:</p>
                  <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                    {linked.map((t) => (
                      <li key={t.id}>
                        <button
                          type="button"
                          className="text-left text-sm text-accent-text underline-offset-2 hover:underline"
                          onClick={() => onOpenTask(t.id)}
                        >
                          {t.title}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Row({ term, value }: { term: string; value: string }) {
  return (
    <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-2">
      <dt className="text-meta pt-px">{term}</dt>
      <dd className="min-w-0">{value}</dd>
    </div>
  );
}
