import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/hooks/use-me";
import { useOnboarding } from "@/hooks/use-onboarding";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { OrgCreateForm } from "@/components/org-create";
import {
  SEARCH_JOB_KINDS,
  currentStep,
  guideKey,
  guideSteps,
  showGuide,
  type GuideStepId,
} from "@/lib/guide";
import { storageGet, storageSet } from "@/lib/safe-storage";
import { useAgent } from "@/components/agent";
import { useSuggestions } from "@/components/suggestions";
import { SuggestionDeck } from "@/components/suggestion-deck";
import { RoadmapCard } from "@/components/onboarding/home-card";
import { Empty } from "@/components/page";
import { homeFocus } from "@/lib/today-inbox";

type Suggestion = NonNullable<ReturnType<typeof useSuggestions>["data"]>[number];

/**
 * Ronda 2B: the one protagonist card in Inicio («Ahora»), in priority order (homeFocus, tested): unfinished
 * onboarding (create the company, then the onboarding) → incomplete strategy (leaders, RoadmapCard) → the best
 * suggestion of the deck with its buttons → an actionable empty state.
 */
export function NowCard({
  strategyPending,
  suggestion,
}: {
  strategyPending: boolean;
  suggestion: Suggestion | null;
}) {
  const { data: me } = useMe();
  const orgId = me?.currentOrg?.org_id;
  const { data: onboarding } = useOnboarding();
  const { open: openAgent } = useAgent();
  const [hidden, setHidden] = useState(false);
  const [creating, setCreating] = useState(false);
  // Same per-company «Ocultar» as the old guide, read after hydration.
  useEffect(() => {
    setHidden(!!orgId && storageGet("local", guideKey(orgId, "hidden")) === "1");
  }, [orgId]);

  const steps = guideSteps({
    hasCompany: !!orgId,
    onboardingStep: onboarding?.step,
    searched: true,
    metricsSeen: true,
  });
  const cur = currentStep(steps);
  const onboardingPending =
    !!me && !!cur && (cur.id === "company" || (cur.id === "onboarding" && !hidden));
  const focus = homeFocus({ onboardingPending, strategyPending, hasSuggestion: !!suggestion });

  if (focus === "onboarding" && cur) {
    return (
      <section className="rounded-2xl border bg-card p-6 shadow-xs" aria-labelledby="now-title">
        <p className="eyebrow">Ahora · Primeros pasos</p>
        <h2 id="now-title" className="section-title mt-1">
          {cur.title}
        </h2>
        <p className="mt-1 measure-body text-sm text-ink-mid">{cur.body}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {cur.id === "company" ? (
            <Button onClick={() => setCreating(true)}>Crear empresa</Button>
          ) : (
            <>
              <Button asChild>
                <Link to="/onboarding">
                  {onboarding ? "Seguir el onboarding" : "Empezar el onboarding"}
                </Link>
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  if (orgId) storageSet("local", guideKey(orgId, "hidden"), "1");
                  setHidden(true);
                }}
              >
                Ahora no
              </Button>
            </>
          )}
        </div>
        <Dialog open={creating} onOpenChange={setCreating}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Nueva empresa</DialogTitle>
            </DialogHeader>
            <OrgCreateForm
              orgs={[...(me?.memberships ?? []), ...(me?.archived ?? [])]}
              location="guide"
              onDone={() => setCreating(false)}
            />
          </DialogContent>
        </Dialog>
      </section>
    );
  }
  if (focus === "strategy") return <RoadmapCard />;
  if (focus === "suggestion" && suggestion)
    return (
      <section aria-label="Ahora: tu siguiente mejor paso">
        <p className="eyebrow mb-2">Ahora · Tu siguiente mejor paso</p>
        <SuggestionDeck items={[suggestion]} keyboard={false} />
      </section>
    );
  return (
    <Empty
      title="Nada urgente ahora"
      action={
        <Button asChild>
          <Link to="/discoveries">Buscar empresas de tu ICP</Link>
        </Button>
      }
      secondaryAction={
        <Button
          variant="outline"
          onClick={() =>
            openAgent({ prompt: "¿Qué debería hacer hoy para avanzar mi pipeline?", fresh: true })
          }
        >
          Preguntar al agente
        </Button>
      }
    >
      Has decidido todo lo pendiente. Buen momento para abrir cuentas nuevas.
    </Empty>
  );
}

/** «Primeros pasos» (full four-step guide; Inicio now shows NowCard): create company → onboarding → first search → Métricas. */
export function GuideCard() {
  const { data: me } = useMe();
  const orgId = me?.currentOrg?.org_id;
  const { data: onboarding } = useOnboarding();
  const [metricsSeen, setMetricsSeen] = useState(false);
  const [hidden, setHidden] = useState(true);
  const [creating, setCreating] = useState(false);

  // Browser storage is read after hydration so server and client render the same first frame.
  useEffect(() => {
    if (!orgId) return;
    setMetricsSeen(storageGet("local", guideKey(orgId, "metrics")) === "1");
    setHidden(storageGet("local", guideKey(orgId, "hidden")) === "1");
  }, [orgId]);

  const { data: searched = false } = useQuery({
    queryKey: ["guide-searched", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const [jobs, found] = await Promise.all([
        supabase
          .from("background_jobs")
          .select("id", { count: "exact", head: true })
          .in("kind", SEARCH_JOB_KINDS),
        supabase.from("discoveries").select("id", { count: "exact", head: true }),
      ]);
      return (jobs.count ?? 0) + (found.count ?? 0) > 0;
    },
  });

  const steps = guideSteps({
    hasCompany: !!orgId,
    onboardingStep: onboarding?.step,
    searched,
    metricsSeen,
  });
  if (!orgId || !showGuide(steps, hidden)) return null;
  const cur = currentStep(steps);
  const doneCount = steps.filter((s) => s.done).length;

  function hide() {
    storageSet("local", guideKey(orgId!, "hidden"), "1");
    setHidden(true);
  }

  const action = (id: GuideStepId, primary: boolean) => {
    const variant = primary ? "default" : "ghost";
    switch (id) {
      case "company":
        return (
          <Button size="sm" variant={variant} onClick={() => setCreating(true)}>
            {steps[0].done ? "Crear otra" : "Crear empresa"}
          </Button>
        );
      case "onboarding":
        return (
          <Button size="sm" variant={variant} asChild>
            <Link to="/onboarding">{onboarding ? "Seguir" : "Empezar"}</Link>
          </Button>
        );
      case "search":
        return (
          <Button size="sm" variant={variant} asChild>
            <Link to="/discoveries">Buscar</Link>
          </Button>
        );
      case "metrics":
        return (
          <Button size="sm" variant={variant} asChild>
            <Link to="/metrics">Ver Métricas</Link>
          </Button>
        );
    }
  };

  return (
    <section className="mb-8 rounded-xl border bg-card p-5 shadow-xs" aria-labelledby="guide-title">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <p className="eyebrow">
            Primeros pasos · {doneCount} de {steps.length}
          </p>
          <h2 id="guide-title" className="mt-1 text-xl">
            {cur ? cur.title : "Todo listo"}
          </h2>
        </div>
        <button className="text-xs text-ink-mid hover:text-ink" onClick={hide}>
          Ocultar guía
        </button>
      </div>
      <div className="mt-3 h-2 max-w-md overflow-hidden rounded-full bg-paper-sunk">
        <div
          className="h-full rounded-full bg-lime transition-all"
          style={{ width: `${(doneCount / steps.length) * 100}%` }}
        />
      </div>
      <ol className="mt-4 grid gap-2 md:grid-cols-2">
        {steps.map((s, i) => {
          const isCur = cur?.id === s.id;
          return (
            <li
              key={s.id}
              className={`flex min-w-0 items-start gap-3 rounded-lg border p-3 ${isCur ? "border-lime bg-lime-soft" : ""}`}
            >
              <span
                aria-hidden
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium ${s.done ? "bg-lime text-lime-foreground" : isCur ? "border-2 border-lime" : "border text-muted-foreground"}`}
              >
                {s.done ? "✓" : i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p
                  className={`text-sm font-medium ${s.done ? "text-muted-foreground line-through" : ""}`}
                >
                  {s.title}
                  <span className="sr-only">
                    {s.done ? " (hecho)" : isCur ? " (paso actual)" : ""}
                  </span>
                </p>
                {!s.done && <p className="mt-0.5 text-xs text-muted-foreground">{s.body}</p>}
                {(!s.done || s.id === "company") && (
                  <div className="mt-2">{action(s.id, isCur)}</div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nueva empresa</DialogTitle>
          </DialogHeader>
          <OrgCreateForm
            orgs={[...(me?.memberships ?? []), ...(me?.archived ?? [])]}
            location="guide"
            onDone={() => setCreating(false)}
          />
        </DialogContent>
      </Dialog>
    </section>
  );
}
