import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { IconText } from "@/components/icon-text";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  AREAS,
  MONTHS,
  STATUSES,
  STATUS_LABEL,
  barGeometry,
  criticalDependencies,
  criticalPath,
  filterTasks,
  weekRangeLabel,
  type AreaId,
  type PlanFilters,
  type PlanTask,
  type TaskStatus,
} from "@/lib/gtm-plan";

/** Bar fill per status: green done, blue in progress, red at risk, neutral pending. */
export const STATUS_BAR: Record<TaskStatus, string> = {
  done: "bg-state-ok",
  in_progress: "bg-signal",
  at_risk: "bg-state-alarm",
  pending: "border border-hairline-firm bg-paper-sunk",
};
export const STATUS_DOT: Record<TaskStatus, string> = {
  done: "bg-state-ok",
  in_progress: "bg-signal",
  at_risk: "bg-state-alarm",
  pending: "bg-ink-faint",
};

const CRITICAL_RING = "ring-2 ring-ink ring-offset-1 ring-offset-card";
const DEPENDENCY_RING = "outline outline-1 outline-dashed outline-offset-2 outline-ink-mid";

export function StatusLabel({ status }: { status: TaskStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium ${status === "at_risk" ? "text-state-alarm" : "text-ink-mid"}`}
    >
      <span aria-hidden className={`size-2 shrink-0 rounded-full ${STATUS_DOT[status]}`} />
      {STATUS_LABEL[status]}
    </span>
  );
}

function Timeline({
  children,
  todayWeek,
}: {
  children?: React.ReactNode;
  todayWeek: number | null;
}) {
  return (
    <div className="relative h-full min-h-9">
      <div aria-hidden className="absolute inset-0 grid grid-cols-12">
        {MONTHS.map((m) => (
          <div key={m} className="border-l border-hairline first:border-l-0" />
        ))}
      </div>
      {todayWeek != null && (
        <div
          aria-hidden
          className="absolute inset-y-0 w-px bg-signal/60"
          style={{ left: `${barGeometry(todayWeek, todayWeek).left}%` }}
        />
      )}
      {children}
    </div>
  );
}

export function GtmGantt({
  tasks,
  filters,
  onFiltersChange,
  onOpenTask,
  todayWeek,
}: {
  tasks: PlanTask[];
  filters: PlanFilters;
  onFiltersChange: (f: PlanFilters) => void;
  onOpenTask: (id: string) => void;
  todayWeek: number | null;
}) {
  const critical = useMemo(() => criticalPath(tasks), [tasks]);
  const deps = useMemo(() => criticalDependencies(tasks, critical), [tasks, critical]);
  const visible = useMemo(() => filterTasks(tasks, filters), [tasks, filters]);
  const [collapsedAreas, setCollapsedAreas] = useState<Set<AreaId>>(new Set());
  const [openTasks, setOpenTasks] = useState<Set<string>>(new Set());

  const toggle = <T,>(set: Set<T>, v: T) => {
    const next = new Set(set);
    if (next.has(v)) next.delete(v);
    else next.add(v);
    return next;
  };

  const areas = AREAS.filter((a) => filters.area === "all" || a.id === filters.area);

  return (
    <section aria-labelledby="gtm-gantt-title" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 id="gtm-gantt-title" className="section-title">
            Ejecución por áreas
          </h2>
          <p className="text-meta mt-0.5">
            Haz clic en una tarea para ver su detalle, marcar subtareas y dejar feedback.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Select
            value={filters.area}
            onValueChange={(v) => onFiltersChange({ ...filters, area: v as PlanFilters["area"] })}
          >
            <SelectTrigger className="h-9 w-[200px]" aria-label="Filtrar por área">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las áreas</SelectItem>
              {AREAS.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filters.status}
            onValueChange={(v) =>
              onFiltersChange({ ...filters, status: v as PlanFilters["status"] })
            }
          >
            <SelectTrigger className="h-9 w-[170px]" aria-label="Filtrar por estado">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_LABEL[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Switch
              id="gtm-critical-only"
              checked={filters.criticalOnly}
              onCheckedChange={(v) => onFiltersChange({ ...filters, criticalOnly: v })}
            />
            <Label htmlFor="gtm-critical-only" className="text-sm">
              Solo camino crítico
            </Label>
          </div>
        </div>
      </div>

      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-meta" aria-label="Leyenda">
        {STATUSES.map((s) => (
          <li key={s} className="inline-flex items-center gap-1.5">
            <span aria-hidden className={`h-2.5 w-5 rounded-sm ${STATUS_BAR[s]}`} />
            {STATUS_LABEL[s]}
          </li>
        ))}
        <li className="inline-flex items-center gap-1.5">
          <span aria-hidden className={`h-2.5 w-5 rounded-sm bg-paper-sunk ${CRITICAL_RING}`} />
          Camino crítico
        </li>
        <li className="inline-flex items-center gap-1.5">
          <span aria-hidden className={`h-2.5 w-5 rounded-sm bg-paper-sunk ${DEPENDENCY_RING}`} />
          Dependencia del camino crítico
        </li>
        {todayWeek != null && (
          <li className="inline-flex items-center gap-1.5">
            <span aria-hidden className="h-3 w-px bg-signal/60" />
            Hoy
          </li>
        )}
      </ul>

      <div className="min-w-0 overflow-x-auto rounded-lg border bg-card">
        <div className="min-w-[880px]" role="table" aria-label="Plan GTM por áreas">
          <div role="row" className="grid grid-cols-[280px_minmax(0,1fr)] border-b border-hairline">
            <div
              role="columnheader"
              className="sticky left-0 z-10 bg-card px-3 py-2 text-meta font-medium"
            >
              Área y tarea
            </div>
            <div role="columnheader" className="grid grid-cols-12">
              {MONTHS.map((m) => (
                <span
                  key={m}
                  className="border-l border-hairline py-2 text-center text-meta first:border-l-0"
                >
                  {m}
                </span>
              ))}
            </div>
          </div>

          {visible.length === 0 && (
            <p className="px-3 py-8 text-sm text-ink-mid">
              Ninguna tarea cumple estos filtros. Cambia el área, el estado o desactiva «Solo camino
              crítico».
            </p>
          )}

          {areas.map((area) => {
            const areaTasks = visible.filter((t) => t.area === area.id);
            if (areaTasks.length === 0) return null;
            const collapsed = collapsedAreas.has(area.id);
            return (
              <div
                key={area.id}
                role="rowgroup"
                className="border-b border-hairline last:border-b-0"
              >
                <div role="row" className="grid grid-cols-[280px_minmax(0,1fr)] bg-paper-edge">
                  <div role="rowheader" className="sticky left-0 z-10 bg-paper-edge px-3 py-2">
                    <button
                      type="button"
                      aria-expanded={!collapsed}
                      onClick={() => setCollapsedAreas((s) => toggle(s, area.id))}
                      className="cursor-pointer text-left text-sm font-semibold"
                    >
                      <IconText icon={collapsed ? ChevronRight : ChevronDown}>{area.name}</IconText>
                    </button>
                    <p className="text-meta pl-[22px]">
                      {areaTasks.length} {areaTasks.length === 1 ? "tarea" : "tareas"} · {area.goal}
                    </p>
                  </div>
                  <div role="cell">
                    <Timeline todayWeek={todayWeek} />
                  </div>
                </div>

                {!collapsed &&
                  areaTasks.map((t) => {
                    const isCritical = critical.has(t.id);
                    const isDep = deps.has(t.id);
                    const geo = barGeometry(t.startWeek, t.endWeek);
                    const expanded = openTasks.has(t.id);
                    return (
                      <div key={t.id} role="presentation">
                        <div
                          role="row"
                          data-critical={isCritical || undefined}
                          className={`grid grid-cols-[280px_minmax(0,1fr)] border-t border-hairline`}
                        >
                          <div
                            role="rowheader"
                            className={`sticky left-0 z-10 flex min-w-0 items-start gap-1 bg-card px-3 py-2 ${isCritical ? "border-l-2 border-ink" : "border-l-2 border-transparent"}`}
                          >
                            {t.subtasks.length > 0 && (
                              <button
                                type="button"
                                aria-expanded={expanded}
                                aria-label={`${expanded ? "Ocultar" : "Ver"} subtareas de ${t.title}`}
                                onClick={() => setOpenTasks((s) => toggle(s, t.id))}
                                className="mt-0.5 shrink-0 cursor-pointer text-meta"
                              >
                                <IconText icon={expanded ? ChevronDown : ChevronRight}>
                                  {t.subtasks.length}
                                </IconText>
                              </button>
                            )}
                            <div className="min-w-0">
                              <button
                                type="button"
                                onClick={() => onOpenTask(t.id)}
                                className="block max-w-full cursor-pointer truncate text-left text-sm font-medium hover:underline"
                              >
                                {t.title}
                              </button>
                              <p className="flex flex-wrap items-center gap-x-2 text-meta">
                                <StatusLabel status={t.status} />
                                <span>{t.owner}</span>
                                {isCritical && <Badge variant="outline">Crítica</Badge>}
                              </p>
                            </div>
                          </div>
                          <div role="cell" className="py-1">
                            <Timeline todayWeek={todayWeek}>
                              <button
                                type="button"
                                onClick={() => onOpenTask(t.id)}
                                aria-label={`${t.title}: ${STATUS_LABEL[t.status]}, ${weekRangeLabel(t.startWeek, t.endWeek)}${isCritical ? ", camino crítico" : isDep ? ", dependencia del camino crítico" : ""}`}
                                title={`${t.title} · ${weekRangeLabel(t.startWeek, t.endWeek)}`}
                                className={`absolute top-1/2 h-4 -translate-y-1/2 cursor-pointer rounded-sm transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-focus ${STATUS_BAR[t.status]} ${isCritical ? CRITICAL_RING : isDep ? DEPENDENCY_RING : ""}`}
                                style={{ left: `${geo.left}%`, width: `${geo.width}%` }}
                              />
                            </Timeline>
                          </div>
                        </div>
                        {expanded &&
                          t.subtasks.map((s) => {
                            const g = barGeometry(s.startWeek, s.endWeek);
                            const st: TaskStatus = s.done ? "done" : "pending";
                            return (
                              <div
                                key={s.id}
                                role="row"
                                className="grid grid-cols-[280px_minmax(0,1fr)] border-t border-dashed border-hairline"
                              >
                                <div
                                  role="rowheader"
                                  className="sticky left-0 z-10 min-w-0 bg-card py-1.5 pl-10 pr-3"
                                >
                                  <button
                                    type="button"
                                    onClick={() => onOpenTask(t.id)}
                                    className={`block max-w-full cursor-pointer truncate text-left text-xs hover:underline ${s.done ? "text-ink-faint line-through" : "text-ink-mid"}`}
                                  >
                                    {s.title}
                                  </button>
                                  <p className="text-meta">
                                    {s.owner} · {s.done ? "Hecha" : "Pendiente"}
                                  </p>
                                </div>
                                <div role="cell" className="py-1">
                                  <Timeline todayWeek={todayWeek}>
                                    <span
                                      aria-hidden
                                      className={`absolute top-1/2 h-2 -translate-y-1/2 rounded-sm ${STATUS_BAR[st]}`}
                                      style={{ left: `${g.left}%`, width: `${g.width}%` }}
                                    />
                                  </Timeline>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    );
                  })}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
