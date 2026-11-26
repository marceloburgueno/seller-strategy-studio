import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useAgent } from "@/components/agent";
import { useOnboarding } from "@/hooks/use-onboarding";
import { useSetup } from "@/hooks/use-setup";
import { onboardingDone, showRoadmapCard } from "@/lib/onboarding";
import { useSetupGuide } from "@/hooks/use-setup-guide";
import { usePrimaryLine } from "@/hooks/use-business-lines";
import { GuideOffer, NextStepMessage } from "@/components/setup/guide";

/** The «Ahora» card in Inicio (Owner / Sales Leader) while the strategy is incomplete and not hidden. */
export function RoadmapCard() {
  const { data: session, save } = useOnboarding();
  const { data: st } = useSetup();
  const { open: openAgent } = useAgent();
  const g = useSetupGuide();
  const pct = st?.status.pct ?? 0;
  const { primary } = usePrimaryLine(g.orgId);
  if (!st || !showRoadmapCard(session, pct)) return null;
  // The archetype comes only from the primary business line (business_lines), never the old per-person diagnosis.
  const diag = primary ? { result: primary.result } : null;
  return (
    <section className="rounded-2xl border bg-card p-6 shadow-xs">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <p className="eyebrow">Ahora · Tu estrategia · {pct} %</p>
        <button
          className="text-xs text-ink-mid hover:text-ink"
          onClick={() => save({ completed_at: new Date().toISOString() })}
        >
          Ocultar
        </button>
      </div>
      <div className="mt-2 h-2 max-w-md overflow-hidden rounded-full bg-paper-sunk">
        <div className="h-full rounded-full bg-lime" style={{ width: `${pct}%` }} />
      </div>
      {diag?.result?.name && (
        <p className="mt-3 text-sm text-ink-mid">
          Arquetipo {diag.result.archetype}, {diag.result.name}. Primero:{" "}
          {diag.result.nextStep?.toLowerCase()}.
        </p>
      )}
      {g.message && (
        <div className="mt-3">
          <NextStepMessage msg={g.message} />
        </div>
      )}
      {g.stale && (
        <p className="mt-2 text-xs text-ink-mid">
          No he podido actualizar tu progreso. Muestro el último estado conocido y lo reintento.
        </p>
      )}
      <div className="mt-3">
        <GuideOffer
          scope="home"
          onlyWhenDue
          orgId={g.orgId}
          wrap={(b) => (
            <div className="border-t border-hairline pt-3 text-sm">
              <p className="eyebrow mb-1">Llevas más de un día sin avanzar</p>
              {b}
            </div>
          )}
        />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button asChild>
          <Link to="/setup">Completar con IA</Link>
        </Button>
        <Button
          variant="outline"
          onClick={() =>
            openAgent({
              mode: "interview",
              prompt:
                "Quiero completar la configuración de mi estrategia GTM. Empieza por lo más importante que falte.",
            })
          }
        >
          Hazme las preguntas
        </Button>
        {!onboardingDone(session) && (
          <Button variant="ghost" asChild>
            <Link to="/onboarding">Seguir con el onboarding</Link>
          </Button>
        )}
      </div>
    </section>
  );
}
