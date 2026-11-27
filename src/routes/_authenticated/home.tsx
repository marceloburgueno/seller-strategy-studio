import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useCurrency, useMe } from "@/hooks/use-me";
import { useSetup } from "@/hooks/use-setup";
import { NowCard } from "@/components/home/guide-card";
import { TodayInbox } from "@/components/home/today-inbox";
import { useOnboarding } from "@/hooks/use-onboarding";
import { useSuggestions } from "@/components/suggestions";
import { NewDealButton } from "@/components/new-deal";
import { showRoadmapCard } from "@/lib/onboarding";
import { Button } from "@/components/ui/button";
import { Empty, Kpi } from "@/components/page";
import { ROLES, canDecideApprovals, type Role } from "@/lib/roles";
import { homeHeadline } from "@/lib/headlines";
import { homeScope } from "@/lib/today-inbox";
import { homeQuery, settle } from "@/hooks/screen-queries";
import { storageGet, storageSet } from "@/lib/safe-storage";
import { DEMO_EXCLUDED_DOMAINS, isDemoMode } from "@/lib/demo-mode";
import { TIME_BUDGETS, budgetKey, parseBudget, type TimeBudget } from "@/lib/daily-queue";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({
    meta: [
      { title: "Inicio — Nokko" },
      { name: "description", content: "Tu vista según tu rol." },
      { property: "og:title", content: "Inicio — Nokko" },
      { property: "og:description", content: "Tu vista según tu rol." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => settle(context.queryClient.ensureQueryData(homeQuery)),
  component: HomePage,
});

function HomePage() {
  const { data: me } = useMe();
  const { money: fmt } = useCurrency();
  const { data: setup } = useSetup();
  const { data: onboarding } = useOnboarding();
  const { data: suggestions = [] } = useSuggestions();
  const { data } = useQuery(homeQuery);
  const orgId = me?.currentOrg?.org_id;
  const [budget, setBudget] = useState<TimeBudget>(parseBudget(null));
  const [excluded, setExcluded] = useState<number | null>(null);
  // Browser storage is read after hydration so server and client render the same first frame.
  useEffect(() => {
    if (orgId) setBudget(parseBudget(storageGet("local", budgetKey(orgId))));
  }, [orgId]);
  useEffect(() => {
    setExcluded(isDemoMode() ? DEMO_EXCLUDED_DOMAINS.length : null);
  }, []);
  function pickBudget(b: TimeBudget) {
    setBudget(b);
    if (orgId) storageSet("local", budgetKey(orgId), b);
  }
  const roles = me?.roles ?? [];
  const role = (roles[0] ?? "ae") as Role;
  const leader = roles.some((r) => r === "owner" || r === "sales_leader");
  // The strategy card already shows what is missing; the deck does not repeat it.
  const strategyPending = leader && !!setup && showRoadmapCard(onboarding, setup.status.pct);
  const best =
    (strategyPending
      ? suggestions.filter((x) => !x.dedupe_key?.startsWith("setup_incomplete:"))
      : suggestions)[0] ?? null;
  // One scope for the headline and the strip: a leader sees the company, everyone else their own deals.
  const scope = homeScope(data?.deals ?? [], { leader, userId: me?.user.id });
  const today = new Date().toISOString().slice(0, 10);
  const meetings = data?.meetings ?? [];
  const firstName = me?.profile?.full_name?.split(" ")[0] ?? "";
  const hello = firstName ? `Hola, ${firstName}` : "Inicio";
  const headline = homeHeadline({
    ...scope,
    pendingApprovals: canDecideApprovals(roles) ? (data?.approvals.length ?? 0) : 0,
    meetingsToday: meetings.filter((m) => m.scheduled_at?.slice(0, 10) === today).length,
    money: fmt,
    fallback: hello,
  });

  // Ronda 2B: titular, una tarjeta «Ahora», una franja de tres cifras y una sola lista «Hoy».
  // Sin FlowStrip: Inicio no es un paso del flujo, es el punto de partida.
  return (
    <div className="mx-auto max-w-5xl px-4 pb-28 pt-6 sm:px-5 md:px-10 md:py-10">
      <header className="mb-6 md:mb-8">
        <p className="kicker">{[hello, ROLES[role]?.label].filter(Boolean).join(" · ")}</p>
        <h1 className="page-title mt-1 max-w-[48ch] text-balance break-words [overflow-wrap:anywhere]">
          {data ? headline : hello}
        </h1>
        <TrustLine excluded={excluded} />
      </header>
      <div className="space-y-8">
        <NowCard strategyPending={strategyPending} suggestion={best} />
        {data && scope.openDeals === 0 ? (
          <Empty
            title={leader ? "Todavía no hay deals abiertos" : "Todavía no tienes deals abiertos"}
            action={<NewDealButton />}
            secondaryAction={
              <Button variant="outline" asChild>
                <Link to="/integrations">Importar desde tu CRM</Link>
              </Button>
            }
          >
            Crea tu primer deal o tráelo de tu CRM para ver aquí tu pipeline y lo que está en
            riesgo.
          </Empty>
        ) : (
          <div
            aria-label={leader ? "Cifras de la empresa" : "Tus cifras"}
            role="group"
            className="grid grid-cols-3 divide-x divide-hairline rounded-lg border bg-card [&>*]:px-4 [&>*]:py-3"
          >
            <Kpi
              size="inline"
              label="Pipeline abierto"
              value={data ? fmt(scope.openAmount) : "—"}
              hint={
                data ? `${scope.openDeals} ${scope.openDeals === 1 ? "deal" : "deals"}` : undefined
              }
            />
            <Kpi
              size="inline"
              label="Ponderado"
              value={data ? fmt(scope.weighted) : "—"}
              hint="por probabilidad"
            />
            <Kpi
              size="inline"
              label="Deals en riesgo"
              value={data ? String(scope.riskDeals) : "—"}
              tone={scope.riskDeals ? "alarm" : undefined}
              hint={scope.riskDeals ? fmt(scope.riskAmount) : undefined}
              hintTone={scope.riskDeals ? "alarm" : undefined}
            />
          </div>
        )}
        <TodayInbox
          meetings={meetings}
          excludeSuggestionId={best?.id}
          budget={budget}
          controls={<BudgetPicker value={budget} onChange={pickBudget} />}
        />
      </div>
    </div>
  );
}

/**
 * V2 trust line: nothing leaves without the person's permission. The excluded-domains count only appears when
 * there is a real list behind it (the demo today), never an invented number.
 */
function TrustLine({ excluded }: { excluded: number | null }) {
  return (
    <p className="mt-2 flex items-center gap-2 text-xs text-ink-mid">
      <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-state-ok" />
      <span className="min-w-0 break-words">
        Nada sale sin tu permiso
        {excluded ? ` · ${excluded} dominios excluidos (clientes e inversores)` : ""}
      </span>
    </p>
  );
}

/** «¿Cuánto tiempo tienes?»: 15 min · 30 min · 1 h. «Hoy» shows only what fits; the rest waits, paused. */
function BudgetPicker({
  value,
  onChange,
}: {
  value: TimeBudget;
  onChange: (b: TimeBudget) => void;
}) {
  const hint = TIME_BUDGETS.find((b) => b.id === value)?.hint;
  return (
    <div
      role="radiogroup"
      aria-label="Tiempo disponible hoy"
      className="flex items-center gap-1"
      title={hint}
    >
      {TIME_BUDGETS.map((b) => {
        const on = b.id === value;
        return (
          <button
            key={b.id}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(b.id)}
            className={`min-h-9 rounded-full border px-3 text-xs md:min-h-7 ${on ? "border-ink bg-ink text-ink-reverse" : "border-hairline text-ink-mid hover:text-ink"}`}
          >
            {b.label}
          </button>
        );
      })}
    </div>
  );
}
