import { useEffect, useMemo, useState } from "react";
import { Plus, RotateCcw } from "lucide-react";
import { IconText } from "@/components/icon-text";
import { Kpi, Panel } from "@/components/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GtmGantt } from "@/components/strategy/gtm-gantt";
import { GtmTaskSheet } from "@/components/strategy/gtm-task-sheet";
import { GoalToTest } from "@/components/strategy/goal-to-test";
import { HypothesisBoard } from "@/components/strategy/hypothesis-board";
import { MondayRitual } from "@/components/strategy/monday-ritual";
import { useCurrency } from "@/hooks/use-me";
import {
  EMPTY_LOCAL_STATE,
  EXAMPLE_PLAN,
  NO_FILTERS,
  OBJECTIVE_LABEL,
  PLAN_STORAGE_KEY,
  addDecision,
  adjustProposal,
  applyLocalState,
  approveProposal,
  formatPlanDate,
  goalToTest,
  hasResettableChanges,
  kpiProgress,
  liveHypotheses,
  parseLocalState,
  planHeadline,
  proposalViews,
  resetLocalState,
  sampleNote,
  setGoal,
  setTaskOverride,
  statusCounts,
  toggleSubtask,
  weekOfYear,
  type GtmPlan,
  type ObjectiveStatus,
  type PlanFilters,
  type PlanKpi,
  type PlanLocalState,
} from "@/lib/gtm-plan";

const OBJECTIVE_DOT: Record<ObjectiveStatus, string> = {
  on_track: "bg-signal",
  at_risk: "bg-state-alarm",
  achieved: "bg-state-ok",
};

/** Local, per-browser state: read after mount (SSR-safe) and written on every change. */
function usePlanLocalState(): [PlanLocalState, (f: (s: PlanLocalState) => PlanLocalState) => void] {
  const [state, setState] = useState<PlanLocalState>(EMPTY_LOCAL_STATE);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    try {
      setState(parseLocalState(window.localStorage.getItem(PLAN_STORAGE_KEY)));
    } catch {
      // Storage blocked: the plan still works for this visit.
    }
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Storage blocked or full: keep the in-memory state.
    }
  }, [state, loaded]);
  return [state, (f) => setState((s) => f(s))];
}

function isoDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function todayIso(): string {
  return isoDate(new Date());
}

/** Strategy tab: wires the company currency into the plan view. */
export function GtmPlanTab() {
  const { money } = useCurrency();
  return <GtmPlanView money={money} />;
}

export function GtmPlanView({
  plan = EXAMPLE_PLAN,
  money,
  today = new Date(),
}: {
  plan?: GtmPlan;
  money: (n: number, compact?: boolean) => string;
  today?: Date;
}) {
  const [local, update] = usePlanLocalState();
  const [filters, setFilters] = useState<PlanFilters>(NO_FILTERS);
  const [openId, setOpenId] = useState<string | null>(null);
  const view = useMemo(() => applyLocalState(plan, local), [plan, local]);
  const openTask = view.tasks.find((t) => t.id === openId) ?? null;
  const todayWeek = today.getFullYear() === plan.year ? weekOfYear(today) : null;
  const counts = statusCounts(view.tasks);
  const hasLocalChanges = hasResettableChanges(local);
  const proposals = useMemo(() => proposalViews(plan, local), [plan, local]);
  const hypotheses = useMemo(() => liveHypotheses(plan, local), [plan, local]);
  const goal = goalToTest(local.goal ?? plan.monthlyGoal, hypotheses, plan.pace);

  const formatKpi = (k: PlanKpi, n: number) =>
    k.unit === "money" ? money(n, true) : k.unit === "percent" ? `${n} %` : n.toLocaleString("es");

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-meta">
          Plan de ejemplo con datos ficticios. Tus cambios se guardan solo en este navegador.
        </p>
        {hasLocalChanges && (
          <Button size="sm" variant="ghost" onClick={() => update(resetLocalState)}>
            <IconText icon={RotateCcw}>Restablecer ejemplo</IconText>
          </Button>
        )}
      </div>

      <MondayRitual
        company={plan.company}
        proposals={proposals}
        hypotheses={hypotheses}
        sampleNote={sampleNote(hypotheses, plan.pace)}
        onApprove={(id) => update((s) => approveProposal(plan, s, id, isoDate(today)))}
        onAdjust={(id, adj) => update((s) => adjustProposal(s, id, adj))}
      />

      <GoalToTest result={goal} onGoalChange={(n) => update((s) => setGoal(s, n))} />

      <HypothesisBoard hypotheses={hypotheses} tasks={view.tasks} onOpenTask={setOpenId} />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow">
            Plan GTM {plan.year} · {plan.company}
          </p>
          <h2 className="mt-1 font-display text-xl font-semibold text-balance">
            {planHeadline(view.tasks)}
          </h2>
        </div>
      </div>

      <section aria-labelledby="gtm-objectives" className="space-y-3">
        <h3 id="gtm-objectives" className="section-title">
          Objetivos del año
        </h3>
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {plan.objectives.map((o) => (
            <li key={o.id} className="min-w-0 rounded-lg border bg-card p-4">
              <span
                className={`inline-flex items-center gap-1.5 text-xs font-medium ${o.status === "at_risk" ? "text-state-alarm" : "text-ink-mid"}`}
              >
                <span aria-hidden className={`size-2 rounded-full ${OBJECTIVE_DOT[o.status]}`} />
                {OBJECTIVE_LABEL[o.status]}
              </span>
              <p className="mt-1.5 text-sm font-semibold">{o.title}</p>
              <p className="mt-0.5 text-meta">{o.detail}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="gtm-kpis" className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 id="gtm-kpis" className="section-title">
            KPIs del plan
          </h3>
          <p className="text-meta">
            {counts.done} hechas · {counts.in_progress} en curso · {counts.at_risk} en riesgo ·{" "}
            {counts.pending} pendientes
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {plan.kpis.map((k) => {
            const p = kpiProgress(k);
            return (
              <Kpi
                key={k.id}
                size="compact"
                label={k.label}
                value={formatKpi(k, k.actual)}
                tone={p.onTrack ? undefined : "alarm"}
                hint={`Meta ${formatKpi(k, k.target)} · ${p.onTrack ? "en camino" : "por debajo"}`}
                hintTone={p.onTrack ? undefined : "alarm"}
              />
            );
          })}
        </div>
      </section>

      <Decisions
        decisions={view.decisions}
        onAdd={(input) => update((s) => addDecision(s, input, `local-${Date.now()}`))}
      />

      <GtmGantt
        tasks={view.tasks}
        filters={filters}
        onFiltersChange={setFilters}
        onOpenTask={setOpenId}
        todayWeek={todayWeek}
      />

      <GtmTaskSheet
        task={openTask}
        tasks={view.tasks}
        onClose={() => setOpenId(null)}
        onOpenTask={setOpenId}
        onStatusChange={(id, status) => update((s) => setTaskOverride(s, id, { status }))}
        onToggleSubtask={(task, subId) => update((s) => toggleSubtask(s, task, subId))}
        onSaveNote={(id, note) => update((s) => setTaskOverride(s, id, { note }))}
      />
    </div>
  );
}

function Decisions({
  decisions,
  onAdd,
}: {
  decisions: GtmPlan["decisions"];
  onAdd: (input: { title: string; validatedBy: string; date: string }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [by, setBy] = useState("Owner");
  const [date, setDate] = useState(todayIso);
  const valid = title.trim() !== "" && by.trim() !== "" && date !== "";

  return (
    <Panel
      title="Decisiones · Memoria comercial"
      action={
        !open && (
          <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
            <IconText icon={Plus}>Registrar decisión</IconText>
          </Button>
        )
      }
    >
      {open && (
        <form
          className="mb-4 grid grid-cols-1 gap-3 rounded-md border border-hairline p-3 sm:grid-cols-[minmax(0,1fr)_160px_160px]"
          onSubmit={(e) => {
            e.preventDefault();
            if (!valid) return;
            onAdd({ title, validatedBy: by, date });
            setTitle("");
            setOpen(false);
          }}
        >
          <div className="min-w-0 space-y-1">
            <Label htmlFor="gtm-decision-title">Qué se aprobó</Label>
            <Input
              id="gtm-decision-title"
              value={title}
              autoFocus
              placeholder="Ej.: Priorizar fintech en el segundo semestre"
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="min-w-0 space-y-1">
            <Label htmlFor="gtm-decision-by">Quién lo validó</Label>
            <Input id="gtm-decision-by" value={by} onChange={(e) => setBy(e.target.value)} />
          </div>
          <div className="min-w-0 space-y-1">
            <Label htmlFor="gtm-decision-date">Fecha</Label>
            <Input
              id="gtm-decision-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="flex gap-2 sm:col-span-3">
            <Button type="submit" size="sm" disabled={!valid}>
              Guardar decisión
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      )}
      <p className="text-meta mb-2">
        Lo que se decidió, cuándo y con qué evidencia. No se edita ni se borra: si algo cambia, se
        registra una decisión nueva.
      </p>
      <ul className="divide-y divide-hairline">
        {decisions.map((d) => (
          <li key={d.id} className="py-2">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4">
              <span className="min-w-0 text-sm">{d.title}</span>
              <span className="text-meta">
                {formatPlanDate(d.date)} · validó {d.validatedBy}
                {d.proposalId ? " · Ritual del lunes" : ""}
              </span>
            </div>
            {(d.evidence || d.change) && (
              <dl className="mt-1 space-y-0.5 text-xs text-ink-mid">
                {d.evidence && (
                  <div>
                    <dt className="inline font-medium">Evidencia: </dt>
                    <dd className="inline">{d.evidence}</dd>
                  </div>
                )}
                {d.change && (
                  <div>
                    <dt className="inline font-medium">Cambio aplicado: </dt>
                    <dd className="inline">{d.change}</dd>
                  </div>
                )}
              </dl>
            )}
          </li>
        ))}
      </ul>
    </Panel>
  );
}
