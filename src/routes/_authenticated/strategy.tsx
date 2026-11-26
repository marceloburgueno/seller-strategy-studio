import { PrimaryLineNote } from "@/components/primary-line-note";
import { createFileRoute } from "@tanstack/react-router";
import { Page } from "@/components/page";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IcpEditor } from "@/components/icp-editor";
import { BudgetQuarters } from "@/components/budget-quarters";
import { PaybackQuarters } from "@/components/payback-quarters";
import { Motions } from "@/components/strategy/motions";
import { GtmPlanTab } from "@/components/strategy/gtm-plan";
import { FunnelDiagnosisPanel } from "@/components/strategy/funnel-diagnosis";
import { Pillars, Positioning } from "@/components/strategy/positioning";
import { StrategyReviewPanel } from "@/components/strategy-review";
import { RecentChanges } from "@/components/recent-changes";
import { HubScreen } from "@/components/hub/hub-screen";
import { RULES_SECTIONS } from "@/lib/legacy-redirects";

const STRATEGY_TABS = [
  "plan",
  "motions",
  "diagnosis",
  "payback",
  "budget",
  "icp",
  "positioning",
  "pillars",
  "review",
  "rules",
] as const;
type StrategySearch = {
  tab?: (typeof STRATEGY_TABS)[number];
  seccion?: string;
  doc?: string;
  q?: string;
};

export const Route = createFileRoute("/_authenticated/strategy")({
  // seccion/doc/q belong to the embedded «Reglas y voz» tab (same keys Conocimiento used).
  validateSearch: (s: Record<string, unknown>): StrategySearch => {
    const tab = STRATEGY_TABS.includes(s.tab as (typeof STRATEGY_TABS)[number])
      ? (s.tab as (typeof STRATEGY_TABS)[number])
      : undefined;
    if (!tab) return {};
    if (tab !== "rules") return { tab };
    return {
      tab,
      ...((RULES_SECTIONS as readonly unknown[]).includes(s.seccion)
        ? { seccion: s.seccion as string }
        : {}),
      ...(typeof s.doc === "string" ? { doc: s.doc } : {}),
    };
  },
  head: () => ({
    meta: [
      { title: "Estrategia GTM — Nokko" },
      {
        name: "description",
        content: "Plan GTM, modelos de venta por segmento, ICP y posicionamiento.",
      },
      { property: "og:title", content: "Estrategia GTM — Nokko" },
      {
        property: "og:description",
        content: "Modelos de venta por segmento, ICP y posicionamiento.",
      },
    ],
  }),
  component: Strategy,
});

function Strategy() {
  const { tab } = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <Page eyebrow="Capa estratégica" title="Estrategia GTM">
      <PrimaryLineNote className="mb-6" />
      {/* Controlled by ?tab= so the embedded «Reglas y voz» can keep its own ?seccion= in the same URL. */}
      <Tabs
        value={tab ?? "plan"}
        onValueChange={(v) =>
          navigate({ search: { tab: v as (typeof STRATEGY_TABS)[number] }, replace: true })
        }
      >
        <TabsList className="mb-6">
          <TabsTrigger value="plan">Plan GTM</TabsTrigger>
          <TabsTrigger value="motions">Modelos de venta por segmento</TabsTrigger>
          <TabsTrigger value="diagnosis">Diagnóstico AARRR</TabsTrigger>
          <TabsTrigger value="payback">Payback real</TabsTrigger>
          <TabsTrigger value="budget">Presupuesto vs real</TabsTrigger>
          <TabsTrigger value="icp">ICP</TabsTrigger>
          <TabsTrigger value="positioning">Posicionamiento</TabsTrigger>
          <TabsTrigger value="pillars">Mensajes</TabsTrigger>
          <TabsTrigger value="review">Revisión con IA</TabsTrigger>
          <TabsTrigger value="rules">Reglas y voz</TabsTrigger>
        </TabsList>
        <TabsContent value="plan">
          <GtmPlanTab />
        </TabsContent>
        <TabsContent value="motions">
          <Motions />
        </TabsContent>
        <TabsContent value="diagnosis">
          <FunnelDiagnosisPanel />
        </TabsContent>
        <TabsContent value="payback">
          <PaybackQuarters />
        </TabsContent>
        <TabsContent value="budget">
          <BudgetQuarters />
        </TabsContent>
        <TabsContent value="icp">
          <IcpEditor />
        </TabsContent>
        <TabsContent value="positioning">
          <Positioning />
        </TabsContent>
        <TabsContent value="pillars">
          <Pillars />
        </TabsContent>
        <TabsContent value="review">
          <StrategyReviewPanel />
        </TabsContent>
        <TabsContent value="rules">
          <HubScreen only={RULES_SECTIONS} />
        </TabsContent>
      </Tabs>
      <RecentChanges />
    </Page>
  );
}
