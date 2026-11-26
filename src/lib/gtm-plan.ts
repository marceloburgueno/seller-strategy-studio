// Plan GTM (Ronda 3A): the living outcome once Nokko understands the business. Pure types, example data for a
// fictional B2B SaaS («NubeOps») and the rules the Gantt needs (critical path, slack, filters, local state).
// Everything here is deterministic and tested; the screen lives in src/components/strategy/gtm-plan.tsx.

export const PLAN_WEEKS = 52;

export type TaskStatus = "pending" | "in_progress" | "done" | "at_risk";
export type Role = "AE" | "SDR" | "Marketing" | "Owner";
export type AreaId = "positioning" | "demand" | "pipeline" | "feedback";

export const STATUS_LABEL: Record<TaskStatus, string> = {
  pending: "Pendiente",
  in_progress: "En curso",
  done: "Hecha",
  at_risk: "En riesgo",
};
export const STATUSES = Object.keys(STATUS_LABEL) as TaskStatus[];

export const AREAS: { id: AreaId; name: string; goal: string }[] = [
  {
    id: "positioning",
    name: "Posicionamiento e ICP",
    goal: "A quién vendemos y por qué nos eligen",
  },
  { id: "demand", name: "Demanda / Outbound", goal: "Conversaciones nuevas con cuentas ICP" },
  { id: "pipeline", name: "Pipeline y Cuentas", goal: "Convertir conversaciones en ingresos" },
  {
    id: "feedback",
    name: "Feedback y Competidores",
    goal: "Aprender de cada venta ganada o perdida",
  },
];

export type Subtask = {
  id: string;
  title: string;
  startWeek: number;
  endWeek: number;
  owner: Role;
  done: boolean;
};

export type PlanTask = {
  id: string;
  area: AreaId;
  title: string;
  description: string;
  owner: Role;
  startWeek: number;
  endWeek: number;
  status: TaskStatus;
  dependsOn: string[];
  subtasks: Subtask[];
  note: string;
};

export type ObjectiveStatus = "on_track" | "at_risk" | "achieved";
export const OBJECTIVE_LABEL: Record<ObjectiveStatus, string> = {
  on_track: "En camino",
  at_risk: "En riesgo",
  achieved: "Logrado",
};
export type Objective = { id: string; title: string; detail: string; status: ObjectiveStatus };

/** `money` KPIs are formatted with the company currency; `better` says which direction is good. */
export type PlanKpi = {
  id: string;
  label: string;
  target: number;
  actual: number;
  unit: "money" | "percent" | "count";
  better: "higher" | "lower";
};

export type Decision = { id: string; title: string; date: string; validatedBy: string };

export type GtmPlan = {
  company: string;
  year: number;
  objectives: Objective[];
  kpis: PlanKpi[];
  decisions: Decision[];
  tasks: PlanTask[];
};

const sub = (
  id: string,
  title: string,
  startWeek: number,
  endWeek: number,
  owner: Role,
  done = false,
): Subtask => ({ id, title, startWeek, endWeek, owner, done });

/** Example plan for NubeOps, a fictional SaaS that sells cloud-cost observability to mid-market tech teams. */
export const EXAMPLE_PLAN: GtmPlan = {
  company: "NubeOps",
  year: 2026,
  objectives: [
    {
      id: "o1",
      title: "Llegar a 1,2 M de ARR nuevo",
      detail: "Mid-market tecnológico en España y México, ticket medio de 18.000.",
      status: "on_track",
    },
    {
      id: "o2",
      title: "Abrir el segmento fintech",
      detail: "10 cuentas fintech en producción antes de diciembre.",
      status: "at_risk",
    },
    {
      id: "o3",
      title: "Bajar el ciclo de venta a 45 días",
      detail: "Hoy 62 días; la prueba guiada de 14 días es la palanca principal.",
      status: "on_track",
    },
  ],
  kpis: [
    {
      id: "pipeline",
      label: "Pipeline generado",
      target: 3600000,
      actual: 3100000,
      unit: "money",
      better: "higher",
    },
    {
      id: "conversion",
      label: "Tasa de conversión",
      target: 22,
      actual: 19,
      unit: "percent",
      better: "higher",
    },
    {
      id: "cac",
      label: "CAC objetivo",
      target: 6500,
      actual: 7200,
      unit: "money",
      better: "lower",
    },
    { id: "demos", label: "Demos/mes", target: 40, actual: 42, unit: "count", better: "higher" },
  ],
  decisions: [
    {
      id: "d1",
      title:
        "ICP principal: equipos de plataforma de 50 a 500 personas con gasto cloud > 30.000/mes",
      date: "2026-01-20",
      validatedBy: "Owner",
    },
    {
      id: "d2",
      title: "Precio por cuenta cloud conectada, sin límite de usuarios",
      date: "2026-02-11",
      validatedBy: "Owner",
    },
    {
      id: "d3",
      title: "Outbound SDR solo a cuentas con señal de crecimiento de gasto",
      date: "2026-04-02",
      validatedBy: "Marketing",
    },
  ],
  tasks: [
    // Posicionamiento e ICP
    {
      id: "t-icp",
      area: "positioning",
      title: "Definir ICP y personas compradoras",
      description:
        "Firmografía, señales de compra y los tres perfiles que deciden (CTO, FinOps, plataforma).",
      owner: "Owner",
      startWeek: 1,
      endWeek: 6,
      status: "done",
      dependsOn: [],
      subtasks: [
        sub("s-icp-1", "Entrevistar a 12 clientes actuales", 1, 3, "AE", true),
        sub("s-icp-2", "Analizar ganadas y perdidas de 2025", 2, 4, "Owner", true),
        sub("s-icp-3", "Escribir fichas de persona", 4, 6, "Marketing", true),
      ],
      note: "",
    },
    {
      id: "t-msg",
      area: "positioning",
      title: "Mensajes y propuesta de valor",
      description: "Una promesa por persona compradora y prueba de ahorro con casos reales.",
      owner: "Marketing",
      startWeek: 7,
      endWeek: 12,
      status: "done",
      dependsOn: ["t-icp"],
      subtasks: [
        sub("s-msg-1", "Matriz de mensajes por persona", 7, 9, "Marketing", true),
        sub("s-msg-2", "Dos casos de éxito con cifra de ahorro", 8, 12, "Marketing", true),
      ],
      note: "",
    },
    {
      id: "t-fintech",
      area: "positioning",
      title: "Posicionamiento para fintech",
      description:
        "Adaptar el mensaje a cumplimiento y auditoría de costes para el segmento fintech.",
      owner: "Marketing",
      startWeek: 20,
      endWeek: 30,
      status: "at_risk",
      dependsOn: ["t-msg"],
      subtasks: [
        sub("s-fin-1", "Entrevistas con 5 CTO fintech", 20, 24, "AE", true),
        sub("s-fin-2", "Página de solución fintech", 24, 28, "Marketing"),
        sub("s-fin-3", "Checklist de cumplimiento", 26, 30, "Owner"),
      ],
      note: "",
    },
    // Demanda / Outbound
    {
      id: "t-lists",
      area: "demand",
      title: "Listas de cuentas con señal",
      description:
        "300 cuentas ICP con señal de crecimiento de gasto cloud, priorizadas por encaje.",
      owner: "SDR",
      startWeek: 7,
      endWeek: 10,
      status: "done",
      dependsOn: ["t-icp"],
      subtasks: [
        sub("s-lst-1", "Fuentes de señales (ofertas de empleo, stack)", 7, 8, "SDR", true),
        sub("s-lst-2", "Puntuación de encaje y prioridad", 8, 10, "SDR", true),
      ],
      note: "",
    },
    {
      id: "t-seq",
      area: "demand",
      title: "Secuencias outbound por persona",
      description: "Secuencias de 6 pasos con email, LinkedIn y llamada para CTO y FinOps.",
      owner: "SDR",
      startWeek: 11,
      endWeek: 20,
      status: "done",
      dependsOn: ["t-lists", "t-msg"],
      subtasks: [
        sub("s-seq-1", "Redactar secuencia CTO", 11, 13, "SDR", true),
        sub("s-seq-2", "Redactar secuencia FinOps", 12, 14, "SDR", true),
        sub("s-seq-3", "Prueba A/B de asunto", 15, 20, "Marketing", true),
      ],
      note: "",
    },
    {
      id: "t-webinar",
      area: "demand",
      title: "Ciclo de webinars de ahorro cloud",
      description: "Un webinar al mes con un cliente que muestra su ahorro real.",
      owner: "Marketing",
      startWeek: 14,
      endWeek: 40,
      status: "in_progress",
      dependsOn: ["t-msg"],
      subtasks: [
        sub("s-web-1", "Calendario y ponentes", 14, 16, "Marketing", true),
        sub("s-web-2", "Seguimiento SDR de asistentes", 17, 40, "SDR"),
      ],
      note: "",
    },
    {
      id: "t-scale",
      area: "demand",
      title: "Escalar outbound a México",
      description: "Replicar las secuencias que funcionan con un segundo SDR en Ciudad de México.",
      owner: "SDR",
      startWeek: 30,
      endWeek: 44,
      status: "in_progress",
      dependsOn: ["t-seq"],
      subtasks: [
        sub("s-mx-1", "Contratar y formar SDR", 30, 35, "Owner", true),
        sub("s-mx-2", "Adaptar secuencias al mercado", 34, 38, "SDR", true),
        sub("s-mx-3", "Primeras 50 conversaciones", 38, 44, "SDR"),
      ],
      note: "",
    },
    // Pipeline y Cuentas
    {
      id: "t-trial",
      area: "pipeline",
      title: "Prueba guiada de 14 días",
      description:
        "Conectar una cuenta cloud y mostrar ahorro en la primera semana, con un AE al lado.",
      owner: "AE",
      startWeek: 13,
      endWeek: 22,
      status: "done",
      dependsOn: ["t-msg"],
      subtasks: [
        sub("s-trl-1", "Guion de la demo de ahorro", 13, 15, "AE", true),
        sub("s-trl-2", "Plan de éxito de la prueba", 15, 18, "AE", true),
        sub("s-trl-3", "Revisión de prueba en el día 7", 18, 22, "AE", true),
      ],
      note: "",
    },
    {
      id: "t-fintech-deals",
      area: "pipeline",
      title: "Primeras 10 cuentas fintech",
      description:
        "Llevar a producción las primeras cuentas fintech con la prueba guiada adaptada.",
      owner: "AE",
      startWeek: 31,
      endWeek: 48,
      status: "at_risk",
      dependsOn: ["t-fintech", "t-trial"],
      subtasks: [
        sub("s-fd-1", "Pipeline de 25 oportunidades fintech", 31, 38, "AE"),
        sub("s-fd-2", "Revisión de seguridad con 3 bancos", 36, 44, "Owner"),
        sub("s-fd-3", "Cierres y onboarding", 42, 48, "AE"),
      ],
      note: "",
    },
    {
      id: "t-expansion",
      area: "pipeline",
      title: "Expansión en cuentas actuales",
      description: "Sumar cuentas cloud nuevas en clientes con ahorro demostrado.",
      owner: "AE",
      startWeek: 36,
      endWeek: 50,
      status: "pending",
      dependsOn: ["t-trial"],
      subtasks: [
        sub("s-exp-1", "Revisiones trimestrales de ahorro", 36, 44, "AE"),
        sub("s-exp-2", "Propuesta de expansión", 44, 50, "AE"),
      ],
      note: "",
    },
    // Feedback y Competidores
    {
      id: "t-winloss",
      area: "feedback",
      title: "Análisis de ganadas y perdidas",
      description: "Entrevista a cada cuenta perdida y resumen mensual con el motivo real.",
      owner: "Owner",
      startWeek: 18,
      endWeek: 46,
      status: "in_progress",
      dependsOn: ["t-trial"],
      subtasks: [
        sub("s-wl-1", "Plantilla de entrevista", 18, 19, "Owner", true),
        sub("s-wl-2", "Resumen mensual al equipo", 20, 46, "Owner"),
      ],
      note: "",
    },
    {
      id: "t-battle",
      area: "feedback",
      title: "Battlecards de competidores",
      description: "Una página por competidor: cuándo ganamos, cuándo perdemos y qué responder.",
      owner: "Marketing",
      startWeek: 22,
      endWeek: 28,
      status: "done",
      dependsOn: ["t-msg"],
      subtasks: [
        sub("s-bc-1", "Battlecard proveedor cloud nativo", 22, 25, "Marketing", true),
        sub("s-bc-2", "Battlecard herramienta FinOps", 24, 28, "Marketing", true),
      ],
      note: "",
    },
    {
      id: "t-plan-2027",
      area: "feedback",
      title: "Revisión del plan para 2027",
      description: "Cerrar el año con lo aprendido: ICP, precio y canal que repetimos o cambiamos.",
      owner: "Owner",
      startWeek: 49,
      endWeek: 52,
      status: "pending",
      dependsOn: ["t-fintech-deals", "t-winloss"],
      subtasks: [
        sub("s-p27-1", "Taller con AE, SDR y Marketing", 49, 50, "Owner"),
        sub("s-p27-2", "Objetivos y KPI 2027", 50, 52, "Owner"),
      ],
      note: "",
    },
  ],
};

// ---------- Weeks and months ----------

export const MONTHS = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];

/** Month (0-11) a plan week falls in; weeks are spread evenly over the year. */
export function weekMonth(week: number): number {
  const w = Math.min(PLAN_WEEKS, Math.max(1, week));
  return Math.min(11, Math.floor(((w - 1) * 12) / PLAN_WEEKS));
}

export function weekRangeLabel(start: number, end: number): string {
  const a = MONTHS[weekMonth(start)];
  const b = MONTHS[weekMonth(end)];
  return `Sem. ${start}–${end} · ${a === b ? a : `${a}–${b}`}`;
}

/** Position of a bar as percentages of the year. */
export function barGeometry(start: number, end: number): { left: number; width: number } {
  const s = Math.min(PLAN_WEEKS, Math.max(1, start));
  const e = Math.min(PLAN_WEEKS, Math.max(s, end));
  return { left: ((s - 1) / PLAN_WEEKS) * 100, width: ((e - s + 1) / PLAN_WEEKS) * 100 };
}

/** ISO-ish week of the year (1-52) for the «hoy» marker; only meaningful in the plan's year. */
export function weekOfYear(date: Date): number {
  const start = Date.UTC(date.getUTCFullYear(), 0, 1);
  const day = Math.floor((date.getTime() - start) / 86400000);
  return Math.min(PLAN_WEEKS, Math.floor(day / 7) + 1);
}

// ---------- Critical path ----------

/**
 * Critical path with fixed dates: start at the task(s) that finish last and walk back through the driving
 * dependency (the one that finishes latest). Those tasks have no slack: any delay moves the plan's end.
 */
export function criticalPath(tasks: PlanTask[]): Set<string> {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const critical = new Set<string>();
  if (tasks.length === 0) return critical;
  const planEnd = Math.max(...tasks.map((t) => t.endWeek));
  const stack = tasks.filter((t) => t.endWeek === planEnd);
  while (stack.length) {
    const t = stack.pop()!;
    if (critical.has(t.id)) continue;
    critical.add(t.id);
    const deps = t.dependsOn.map((d) => byId.get(d)).filter((d): d is PlanTask => !!d);
    if (deps.length === 0) continue;
    const latest = Math.max(...deps.map((d) => d.endWeek));
    stack.push(...deps.filter((d) => d.endWeek === latest));
  }
  return critical;
}

/** Tasks that are not critical but feed a critical task: shown as dependencies of the critical path. */
export function criticalDependencies(tasks: PlanTask[], critical: Set<string>): Set<string> {
  const deps = new Set<string>();
  for (const t of tasks) {
    if (!critical.has(t.id)) continue;
    for (const d of t.dependsOn) if (!critical.has(d)) deps.add(d);
  }
  return deps;
}

/** Tasks that depend directly on `id`. */
export function successors(tasks: PlanTask[], id: string): PlanTask[] {
  return tasks.filter((t) => t.dependsOn.includes(id));
}

/** Weeks a task can slip before it delays a successor or the plan's end. 0 for critical tasks. */
export function slackWeeks(tasks: PlanTask[], id: string): number {
  const t = tasks.find((x) => x.id === id);
  if (!t) return 0;
  const planEnd = Math.max(...tasks.map((x) => x.endWeek));
  const next = successors(tasks, id);
  const limit = next.length ? Math.min(...next.map((n) => n.startWeek - 1)) : planEnd;
  return Math.max(0, limit - t.endWeek);
}

export type CriticalImpact = {
  critical: boolean;
  slack: number;
  blocks: PlanTask[];
  message: string;
};

export function criticalImpact(tasks: PlanTask[], id: string): CriticalImpact {
  const critical = criticalPath(tasks).has(id);
  const slack = critical ? 0 : slackWeeks(tasks, id);
  const blocks = successors(tasks, id);
  const t = tasks.find((x) => x.id === id);
  let message: string;
  if (critical) {
    message =
      t?.status === "at_risk"
        ? "Está en el camino crítico y en riesgo: cada semana de retraso mueve el fin del plan."
        : "Está en el camino crítico: cada semana de retraso mueve el fin del plan.";
  } else if (slack === 0) {
    message = "No tiene margen: si se retrasa, retrasa la tarea que depende de ella.";
  } else {
    message = `Tiene ${slack} ${slack === 1 ? "semana" : "semanas"} de margen antes de afectar a otras tareas.`;
  }
  return { critical, slack, blocks, message };
}

// ---------- Filters ----------

export type PlanFilters = {
  area: AreaId | "all";
  status: TaskStatus | "all";
  criticalOnly: boolean;
};
export const NO_FILTERS: PlanFilters = { area: "all", status: "all", criticalOnly: false };

/** Tasks shown in the Gantt. «Solo camino crítico» keeps critical tasks and the dependencies that feed them. */
export function filterTasks(tasks: PlanTask[], f: PlanFilters): PlanTask[] {
  const critical = criticalPath(tasks);
  const deps = criticalDependencies(tasks, critical);
  return tasks.filter(
    (t) =>
      (f.area === "all" || t.area === f.area) &&
      (f.status === "all" || t.status === f.status) &&
      (!f.criticalOnly || critical.has(t.id) || deps.has(t.id)),
  );
}

// ---------- Summary ----------

/** Progress of a KPI towards its target (1 = met), respecting which direction is good. */
export function kpiProgress(k: PlanKpi): { ratio: number; onTrack: boolean } {
  if (k.target <= 0 || k.actual <= 0) return { ratio: 0, onTrack: false };
  const ratio = k.better === "higher" ? k.actual / k.target : k.target / k.actual;
  return { ratio, onTrack: ratio >= 0.9 };
}

export function taskProgress(t: PlanTask): number {
  if (t.status === "done") return 1;
  if (t.subtasks.length === 0) return 0;
  return t.subtasks.filter((s) => s.done).length / t.subtasks.length;
}

export function statusCounts(tasks: PlanTask[]): Record<TaskStatus, number> {
  const out: Record<TaskStatus, number> = { pending: 0, in_progress: 0, done: 0, at_risk: 0 };
  for (const t of tasks) out[t.status] += 1;
  return out;
}

/** The plan's headline: a conclusion from the data, never an invented number. */
export function planHeadline(tasks: PlanTask[]): string {
  const critical = criticalPath(tasks);
  const risky = tasks.filter((t) => t.status === "at_risk" && critical.has(t.id));
  if (risky.length === 1) return `«${risky[0].title}» está en riesgo y frena el camino crítico`;
  if (risky.length > 1) return `${risky.length} tareas del camino crítico están en riesgo`;
  const c = statusCounts(tasks);
  return `${c.done} de ${tasks.length} tareas hechas; el camino crítico va en plazo`;
}

// ---------- Local state (React + localStorage) ----------

export type TaskOverride = { status?: TaskStatus; note?: string; doneSubtasks?: string[] };
export type PlanLocalState = {
  tasks: Record<string, TaskOverride>;
  decisions: Decision[];
};
export const EMPTY_LOCAL_STATE: PlanLocalState = { tasks: {}, decisions: [] };
export const PLAN_STORAGE_KEY = "nokko-gtm-plan-v1";

/** Applies the person's local changes on top of the plan. Unknown task or subtask ids are ignored. */
export function applyLocalState(plan: GtmPlan, local: PlanLocalState): GtmPlan {
  return {
    ...plan,
    decisions: [...local.decisions, ...plan.decisions],
    tasks: plan.tasks.map((t) => {
      const o = local.tasks[t.id];
      if (!o) return t;
      return {
        ...t,
        status: o.status ?? t.status,
        note: o.note ?? t.note,
        subtasks: o.doneSubtasks
          ? t.subtasks.map((s) => ({ ...s, done: o.doneSubtasks!.includes(s.id) }))
          : t.subtasks,
      };
    }),
  };
}

export function setTaskOverride(
  local: PlanLocalState,
  id: string,
  patch: TaskOverride,
): PlanLocalState {
  return { ...local, tasks: { ...local.tasks, [id]: { ...local.tasks[id], ...patch } } };
}

/** Toggles a subtask, starting from the subtasks as the person currently sees them. */
export function toggleSubtask(
  local: PlanLocalState,
  task: PlanTask,
  subtaskId: string,
): PlanLocalState {
  const done = new Set(task.subtasks.filter((s) => s.done).map((s) => s.id));
  if (done.has(subtaskId)) done.delete(subtaskId);
  else done.add(subtaskId);
  return setTaskOverride(local, task.id, { doneSubtasks: [...done] });
}

export function addDecision(
  local: PlanLocalState,
  input: { title: string; validatedBy: string; date: string },
  id: string,
): PlanLocalState {
  const title = input.title.trim();
  const validatedBy = input.validatedBy.trim();
  if (!title || !validatedBy || !/^\d{4}-\d{2}-\d{2}$/.test(input.date)) return local;
  return {
    ...local,
    decisions: [{ id, title, validatedBy, date: input.date }, ...local.decisions],
  };
}

const isStatus = (v: unknown): v is TaskStatus => STATUSES.includes(v as TaskStatus);

/** Reads saved state defensively: anything malformed is dropped instead of breaking the screen. */
export function parseLocalState(raw: string | null): PlanLocalState {
  if (!raw) return EMPTY_LOCAL_STATE;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return EMPTY_LOCAL_STATE;
  }
  if (!data || typeof data !== "object") return EMPTY_LOCAL_STATE;
  const d = data as { tasks?: unknown; decisions?: unknown };
  const tasks: Record<string, TaskOverride> = {};
  if (d.tasks && typeof d.tasks === "object") {
    for (const [id, v] of Object.entries(d.tasks as Record<string, unknown>)) {
      if (!v || typeof v !== "object") continue;
      const o = v as Record<string, unknown>;
      const clean: TaskOverride = {};
      if (isStatus(o.status)) clean.status = o.status;
      if (typeof o.note === "string") clean.note = o.note;
      if (Array.isArray(o.doneSubtasks))
        clean.doneSubtasks = o.doneSubtasks.filter((s): s is string => typeof s === "string");
      tasks[id] = clean;
    }
  }
  const decisions = Array.isArray(d.decisions)
    ? d.decisions.filter(
        (x): x is Decision =>
          !!x &&
          typeof x === "object" &&
          ["id", "title", "date", "validatedBy"].every(
            (k) => typeof (x as Record<string, unknown>)[k] === "string",
          ),
      )
    : [];
  return { tasks, decisions };
}

/** «20 ene 2026» from an ISO date, without timezone drift. */
export function formatPlanDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${d} ${MONTHS[m - 1]?.toLowerCase() ?? ""} ${y}`;
}
