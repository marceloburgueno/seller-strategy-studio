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

/**
 * One entry of the commercial memory. Entries are append-only: nothing edits or deletes them. Decisions approved
 * in the Ritual del Lunes also carry the evidence they were based on, the change applied and the proposal id.
 */
export type Decision = {
  id: string;
  title: string;
  date: string;
  validatedBy: string;
  evidence?: string;
  change?: string;
  proposalId?: string;
  /** What the approval applied to the hypotheses board. */
  applied?: AppliedChange;
};
export type AppliedChange = { target: string; focus: number | null; offer: string };

// ---------- Hypotheses, Ritual del Lunes and Goal-to-Test (V2) ----------

export type Confidence = "low" | "medium" | "high";
export const CONFIDENCE_LABEL: Record<Confidence, string> = {
  low: "Bajo",
  medium: "Medio",
  high: "Alto",
};

/** A live go-to-market bet: who, which pain, which offer, and what the small sample says so far. */
export type Hypothesis = {
  id: string;
  label: string;
  version: "v1" | "v2";
  tier: 1 | 2;
  segment: string;
  pain: string;
  offer: string;
  confidence: Confidence;
  /** Share of the weekly effort (all hypotheses add up to 100). */
  focus: number;
  touches: number;
  meetings: number;
  /** Qualitative evidence: what people actually said or did. */
  evidence: string[];
  /** Plan tasks this hypothesis feeds (ids of PlanTask). */
  taskIds: string[];
};

/**
 * «hypothesis»: the bet itself is wrong (no pain, no urgency, wrong buyer).
 * «execution»: the bet holds, but timing, channel or offer got in the way. Changing the bet would be a mistake.
 */
export type Verdict = "hypothesis" | "execution";
export const VERDICT_LABEL: Record<Verdict, string> = {
  hypothesis: "Mala hipótesis",
  execution: "Ejecución o momento",
};

export type RitualProposal = {
  id: string;
  verdict: Verdict;
  title: string;
  /** The mentor's reading, evidence first. */
  reading: string;
  /** Short evidence line kept in the decision. */
  evidence: string;
  target: string;
  /** Share of the weekly effort to move to the target; null keeps the current split. */
  focus: number | null;
  offer: string;
  /** Extra instruction for the week (optional). */
  extra?: string;
};

/** How the team is testing right now: tests (touches) and qualified meetings over the last weeks. */
export type TestPace = { weeks: number };

export type GtmPlan = {
  company: string;
  year: number;
  objectives: Objective[];
  kpis: PlanKpi[];
  decisions: Decision[];
  tasks: PlanTask[];
  hypotheses: Hypothesis[];
  proposals: RitualProposal[];
  pace: TestPace;
  /** Default monthly goal of qualified meetings. */
  monthlyGoal: number;
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
  hypotheses: [
    {
      id: "h-a",
      label: "A",
      version: "v1",
      tier: 1,
      segment: "Mid-market tecnológico en España, 50 a 500 personas",
      pain: "La factura cloud crece y nadie sabe por qué",
      offer: "Demo de producto de 45 min",
      confidence: "low",
      focus: 50,
      touches: 45,
      meetings: 0,
      evidence: [
        "«Lo miramos el año que viene» (4 respuestas parecidas)",
        "Reconocen el gasto, pero no hay una fecha que les obligue a moverse",
      ],
      taskIds: ["t-seq", "t-scale"],
    },
    {
      id: "h-b",
      label: "B",
      version: "v2",
      tier: 1,
      segment: "Fintech con auditoría de costes cloud",
      pain: "La auditoría pide justificar cada euro de cloud",
      offer: "Prueba guiada de 14 días",
      confidence: "medium",
      focus: 25,
      touches: 18,
      meetings: 2,
      evidence: [
        "3 de 18 tienen contrato con su proveedor hasta septiembre y quieren llegar con datos",
        "El CFO y el CTO deciden juntos: decisor validado en las dos reuniones",
      ],
      taskIds: ["t-fintech", "t-fintech-deals"],
    },
    {
      id: "h-c",
      label: "C",
      version: "v1",
      tier: 2,
      segment: "Scale-ups en México después de una ronda",
      pain: "El gasto cloud se dispara al crecer el equipo",
      offer: "Webinar de ahorro cloud",
      confidence: "medium",
      focus: 25,
      touches: 30,
      meetings: 1,
      evidence: [
        "12 de 30 abrieron el correo, solo 1 respondió",
        "Los envíos salieron el viernes por la tarde, hora de España",
      ],
      taskIds: ["t-webinar", "t-scale"],
    },
  ],
  proposals: [
    {
      id: "p-focus-b",
      verdict: "hypothesis",
      title: "Mover el foco de A a B",
      reading:
        "No falló tu producto: en Hipótesis B, 3 de 18 dijeron que tienen contrato hasta septiembre (dolor y decisor validados). En Hipótesis A, 0 reuniones en 45 toques por falta de urgencia.",
      evidence:
        "B: 3 de 18 con contrato hasta septiembre, 2 reuniones. A: 0 reuniones en 45 toques.",
      target: "h-b",
      focus: 70,
      offer: "Diagnóstico rápido de 10 min",
    },
    {
      id: "p-fix-c",
      verdict: "execution",
      title: "Arreglar la ejecución de C antes de juzgarla",
      reading:
        "En Hipótesis C el problema no es el segmento: 12 de 30 abrieron, pero los envíos salieron un viernes por la tarde y pedíamos un webinar de una hora. Con 30 toques todavía no sabemos si la hipótesis es mala.",
      evidence: "C: 12 de 30 abrieron, 1 respondió; envíos el viernes por la tarde.",
      target: "h-c",
      focus: null,
      offer: "Llamada de 15 min con su cifra de gasto",
      extra:
        "enviar martes y miércoles por la mañana, hora de México, y volver a mirarla en dos semanas",
    },
  ],
  pace: { weeks: 3 },
  monthlyGoal: 8,
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
/** What the person changed in a proposal with «Ajustar» before approving it. */
export type ProposalAdjustment = { focus?: number | null; offer?: string };
export type PlanLocalState = {
  tasks: Record<string, TaskOverride>;
  decisions: Decision[];
  adjustments: Record<string, ProposalAdjustment>;
  /** Monthly goal of qualified meetings; null uses the plan's default. */
  goal: number | null;
};
export const EMPTY_LOCAL_STATE: PlanLocalState = {
  tasks: {},
  decisions: [],
  adjustments: {},
  goal: null,
};

/**
 * «Restablecer ejemplo» brings tasks, goal and pending adjustments back, but keeps the decisions:
 * the commercial memory is append-only, and executed proposals stay executed.
 */
export function resetLocalState(local: PlanLocalState): PlanLocalState {
  return { ...EMPTY_LOCAL_STATE, decisions: local.decisions };
}

/** True when there is something «Restablecer ejemplo» would undo (decisions never count). */
export function hasResettableChanges(local: PlanLocalState): boolean {
  return (
    Object.keys(local.tasks).length > 0 ||
    Object.keys(local.adjustments).length > 0 ||
    local.goal !== null
  );
}
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
  const adjustments: Record<string, ProposalAdjustment> = {};
  const rawAdj = (data as { adjustments?: unknown }).adjustments;
  if (rawAdj && typeof rawAdj === "object" && !Array.isArray(rawAdj)) {
    for (const [id, v] of Object.entries(rawAdj as Record<string, unknown>)) {
      if (!v || typeof v !== "object") continue;
      const o = v as Record<string, unknown>;
      const clean: ProposalAdjustment = {};
      if (o.focus === null || isFocus(o.focus)) clean.focus = o.focus as number | null;
      if (typeof o.offer === "string" && o.offer.trim()) clean.offer = o.offer;
      adjustments[id] = clean;
    }
  }
  const rawGoal = (data as { goal?: unknown }).goal;
  const goal = isGoal(rawGoal) ? rawGoal : null;
  return { tasks, decisions: decisions.map(cleanDecision), adjustments, goal };
}

const OPTIONAL_DECISION_KEYS = ["evidence", "change", "proposalId"] as const;
/** Keeps the four required fields and only the optional ones that are strings. */
function cleanDecision(x: Decision): Decision {
  const out: Decision = { id: x.id, title: x.title, date: x.date, validatedBy: x.validatedBy };
  for (const k of OPTIONAL_DECISION_KEYS) {
    const v = (x as Record<string, unknown>)[k];
    if (typeof v === "string") out[k] = v;
  }
  const a = (x as { applied?: unknown }).applied;
  if (a && typeof a === "object") {
    const o = a as Record<string, unknown>;
    if (
      typeof o.target === "string" &&
      typeof o.offer === "string" &&
      (o.focus === null || isFocus(o.focus))
    )
      out.applied = { target: o.target, focus: o.focus as number | null, offer: o.offer };
  }
  return out;
}

const isFocus = (v: unknown): v is number =>
  typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 100;
export const MAX_MONTHLY_GOAL = 999;
const isGoal = (v: unknown): v is number =>
  typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= MAX_MONTHLY_GOAL;

// ---------- Ritual del Lunes ----------

export type ProposalView = RitualProposal & {
  /** Values after «Ajustar»; what approval will apply. */
  focus: number | null;
  offer: string;
  change: string;
  executed: Decision | null;
};

/** The change in one sentence, as it will be applied and written in the decision. */
export function proposalChange(
  p: Pick<RitualProposal, "focus" | "offer" | "extra" | "target">,
  hypotheses: Hypothesis[],
): string {
  const label = hypotheses.find((h) => h.id === p.target)?.label ?? "";
  const head =
    p.focus == null
      ? `Mantener el foco en ${label} y cambiar la oferta a «${p.offer}»`
      : `Mover el ${p.focus} % del foco a ${label} y cambiar la oferta a «${p.offer}»`;
  return p.extra ? `${head}; ${p.extra}.` : `${head}.`;
}

export function proposalViews(plan: GtmPlan, local: PlanLocalState): ProposalView[] {
  const decisions = [...local.decisions, ...plan.decisions];
  return plan.proposals.map((p) => {
    const executed = decisions.find((d) => d.proposalId === p.id) ?? null;
    const adj = executed ? {} : (local.adjustments[p.id] ?? {});
    const focus = adj.focus !== undefined ? adj.focus : p.focus;
    const offer = adj.offer ?? p.offer;
    return {
      ...p,
      focus,
      offer,
      change: executed?.change ?? proposalChange({ ...p, focus, offer }, plan.hypotheses),
      executed,
    };
  });
}

export function adjustProposal(
  local: PlanLocalState,
  id: string,
  adj: ProposalAdjustment,
): PlanLocalState {
  const offer = adj.offer?.trim();
  if (adj.offer !== undefined && !offer) return local;
  if (adj.focus !== undefined && adj.focus !== null && !isFocus(adj.focus)) return local;
  const clean: ProposalAdjustment = { ...local.adjustments[id] };
  if (adj.focus !== undefined) clean.focus = adj.focus;
  if (offer) clean.offer = offer;
  return { ...local, adjustments: { ...local.adjustments, [id]: clean } };
}

/**
 * Approving executes the proposal and appends it to the commercial memory with date, evidence and the change
 * applied. Idempotent: a proposal already in the memory is never written twice.
 */
export function approveProposal(
  plan: GtmPlan,
  local: PlanLocalState,
  id: string,
  date: string,
): PlanLocalState {
  const view = proposalViews(plan, local).find((p) => p.id === id);
  if (!view || view.executed || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return local;
  const { [id]: _done, ...adjustments } = local.adjustments;
  const decision: Decision = {
    id: `ritual-${id}`,
    title: view.title,
    date,
    validatedBy: "Owner",
    evidence: view.evidence,
    change: view.change,
    proposalId: id,
    applied: { target: view.target, focus: view.focus, offer: view.offer },
  };
  return { ...local, adjustments, decisions: [decision, ...local.decisions] };
}

/**
 * Moves `share` % of the effort to `target` and spreads the rest over the others in proportion to what they had.
 * Rounds to whole points and keeps the total at exactly 100.
 */
export function shiftFocus(hypotheses: Hypothesis[], target: string, share: number): Hypothesis[] {
  if (!hypotheses.some((h) => h.id === target)) return hypotheses;
  const s = Math.min(100, Math.max(0, Math.round(share)));
  const others = hypotheses.filter((h) => h.id !== target);
  const otherTotal = others.reduce((n, h) => n + h.focus, 0);
  const rest = 100 - s;
  const raw = others.map((h) =>
    otherTotal > 0 ? (h.focus / otherTotal) * rest : rest / others.length,
  );
  const rounded = raw.map(Math.floor);
  let left = rest - rounded.reduce((n, x) => n + x, 0);
  // Largest remainders first, so the split stays fair.
  const order = raw.map((x, i) => ({ i, r: x - Math.floor(x) })).sort((a, b) => b.r - a.r);
  for (const { i } of order) {
    if (left <= 0) break;
    rounded[i] += 1;
    left -= 1;
  }
  const byId = new Map(others.map((h, i) => [h.id, rounded[i]]));
  return hypotheses.map((h) => ({
    ...h,
    focus: h.id === target ? s : (byId.get(h.id) ?? h.focus),
  }));
}

/** Hypotheses as they are after the executed proposals (oldest first): focus and offer changes applied. */
export function liveHypotheses(plan: GtmPlan, local: PlanLocalState): Hypothesis[] {
  const executed = proposalViews(plan, local)
    .filter((p) => p.executed)
    .sort((a, b) => (a.executed!.date < b.executed!.date ? -1 : 1));
  let hs = plan.hypotheses;
  for (const p of executed) {
    // The decision is the record of what was applied, including any «Ajustar» change.
    const a = p.executed!.applied ?? { target: p.target, focus: p.focus, offer: p.offer };
    if (a.focus !== null) hs = shiftFocus(hs, a.target, a.focus);
    hs = hs.map((h) => (h.id === a.target ? { ...h, offer: a.offer } : h));
  }
  return hs;
}

export function ritualHeadline(proposals: ProposalView[]): string {
  const pending = proposals.filter((p) => !p.executed).length;
  if (pending === 0) return "Ritual hecho: los cambios de esta semana ya están en marcha";
  if (pending === 1) return "Queda una propuesta por decidir esta semana";
  return `${pending} propuestas para esta semana, con la evidencia delante`;
}

/** Sample-size caveat: with few touches the reading is a signal, not a verdict. */
export function sampleNote(hypotheses: Hypothesis[], pace: TestPace): string {
  const touches = hypotheses.reduce((n, h) => n + h.touches, 0);
  const weeks = `${pace.weeks} ${pace.weeks === 1 ? "semana" : "semanas"}`;
  return touches < 200
    ? `Muestra pequeña: ${touches} toques en ${weeks}. Lo leo como una señal, no como una sentencia.`
    : `${touches} toques en ${weeks}: la muestra ya permite comparar hipótesis.`;
}

// ---------- Goal-to-Test ----------

export const WEEKS_PER_MONTH = 4;

export type GoalToTest = {
  goal: number;
  /** Meetings per test with the current evidence (0 when there are no meetings yet). */
  rate: number;
  testsPerWeekNow: number;
  /** Weekly tests needed for the goal; null when there is no rate to calculate from. */
  testsPerWeekNeeded: number | null;
  projectedMeetings: number;
  onPace: boolean;
  message: string;
};

/** Works backwards from the monthly goal to the weekly tests it needs, with the rate the hypotheses show. */
export function goalToTest(goal: number, hypotheses: Hypothesis[], pace: TestPace): GoalToTest {
  const touches = hypotheses.reduce((n, h) => n + h.touches, 0);
  const meetings = hypotheses.reduce((n, h) => n + h.meetings, 0);
  const weeks = Math.max(1, pace.weeks);
  const testsPerWeekNow = Math.round(touches / weeks);
  const rate = touches > 0 ? meetings / touches : 0;
  if (rate === 0) {
    return {
      goal,
      rate,
      testsPerWeekNow,
      testsPerWeekNeeded: null,
      projectedMeetings: 0,
      onPace: false,
      message:
        "Todavía no hay reuniones con qué calcular. Antes de subir volumen, consigue la primera con una sola hipótesis.",
    };
  }
  const testsPerWeekNeeded = Math.ceil(goal / rate / WEEKS_PER_MONTH);
  const projectedMeetings = Math.floor(testsPerWeekNow * WEEKS_PER_MONTH * rate);
  const onPace = testsPerWeekNow >= testsPerWeekNeeded;
  const every = Math.round(1 / rate);
  const message = onPace
    ? `Con 1 reunión cada ${every} toques, tu ritmo de ${testsPerWeekNow} pruebas por semana llega a la meta.`
    : `Con 1 reunión cada ${every} toques necesitas ${testsPerWeekNeeded} pruebas por semana y hoy haces ${testsPerWeekNow}. A este ritmo llegas a unas ${projectedMeetings} de ${goal}: o subes el volumen o subes la tasa, y lo segundo suele costar menos.`;
  return { goal, rate, testsPerWeekNow, testsPerWeekNeeded, projectedMeetings, onPace, message };
}

export function setGoal(local: PlanLocalState, goal: number): PlanLocalState {
  return isGoal(goal) ? { ...local, goal } : local;
}

/** «20 ene 2026» from an ISO date, without timezone drift. */
export function formatPlanDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${d} ${MONTHS[m - 1]?.toLowerCase() ?? ""} ${y}`;
}
