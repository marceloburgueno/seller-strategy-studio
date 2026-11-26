import { createFileRoute, Link } from "@tanstack/react-router";
import { useJob } from "@/components/background";
import { Page, Empty, ScreenState } from "@/components/page";
import { SuggestionInbox, useRecheckSuggestions, useSuggestions } from "@/components/suggestions";
import { AssistantActions } from "@/components/assistant-actions";
import { StrategyChanges } from "@/components/strategy-execute";
import { SuggestionBoard } from "@/components/suggestion-board";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { suggestionsHeadline } from "@/lib/headlines";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useMe } from "@/hooks/use-me";

export const Route = createFileRoute("/_authenticated/inbox")({
  head: () => ({
    meta: [
      { title: "Sugerencias — Nokko" },
      {
        name: "description",
        content:
          "Riesgos y próximos pasos que el motor proactivo ha detectado, listos para aprobar.",
      },
      { property: "og:title", content: "Sugerencias — Nokko" },
      {
        property: "og:description",
        content: "Riesgos y próximos pasos detectados, listos para aprobar.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Inbox,
});

function Inbox() {
  const { data = [], isPending, error, refetch } = useSuggestions();
  const { data: me } = useMe();
  const qc = useQueryClient();
  const recheck = useRecheckSuggestions();
  const weekly = useJob("weekly_report", {
    onDone: () => qc.invalidateQueries({ queryKey: ["suggestions"] }),
  });
  const canReport = (me?.roles ?? []).some((r) => r === "owner" || r === "sales_leader");
  return (
    <Page
      eyebrow="Sugerencias"
      title={
        isPending
          ? "Sugerencias"
          : suggestionsHeadline({
              pending: data.length,
              urgent: data.filter((s) => s.priority === 1).length,
            })
      }
      actions={
        canReport ? (
          <Button variant="outline" disabled={weekly.running} onClick={() => weekly.start({})}>
            {weekly.running ? "Preparando en segundo plano…" : "Informe de la semana ahora"}
          </Button>
        ) : undefined
      }
    >
      <Tabs defaultValue="me">
        <TabsList className="mb-6">
          <TabsTrigger value="me">Para mí</TabsTrigger>
          <TabsTrigger value="team">Equipo</TabsTrigger>
        </TabsList>
        <TabsContent value="team">
          <SuggestionBoard />
        </TabsContent>
        <TabsContent value="me">
          <AssistantActions />
          <StrategyChanges />
          <ScreenState isPending={isPending} error={error} refetch={refetch}>
            {data.length === 0 ? (
              <Empty
                title="Bandeja al día"
                action={
                  <Button size="sm" onClick={recheck}>
                    Buscar sugerencias ahora
                  </Button>
                }
                secondaryAction={
                  <Button size="sm" variant="outline" asChild>
                    <Link to="/deals" search={{ deal: undefined }}>
                      Ir al pipeline
                    </Link>
                  </Button>
                }
              >
                No hay sugerencias pendientes. Te aviso aquí cuando detecte un riesgo o un próximo
                paso.
              </Empty>
            ) : (
              <SuggestionInbox items={data} />
            )}
          </ScreenState>
        </TabsContent>
      </Tabs>
    </Page>
  );
}
