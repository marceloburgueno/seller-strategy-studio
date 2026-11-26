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
        <TodayInbox meetings={meetings} excludeSuggestionId={best?.id} />
      </div>
    </div>
  );
}
