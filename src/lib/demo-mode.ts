// Ronda 3B: local demo mode. Lets someone walk the whole app on `vite dev` without an account and without touching
// the real backend: the session check answers with a fictitious user, and every request to the Supabase URL is
// answered in the browser from an in-memory dataset («Demo GTM»). Server functions are refused before they leave.
// Hard rule: everything here is gated by import.meta.env.DEV, which `vite build` replaces with false, so in a
// production bundle isDemoMode() is always false and the backend is never patched.
import type { User } from "@supabase/supabase-js";
import type { Tables } from "@/integrations/supabase/types";

const STORAGE_KEY = "nokko-demo-local";

export const DEMO_USER_ID = "00000000-0000-4000-8000-00000000d001";
export const DEMO_ORG_ID = "00000000-0000-4000-8000-00000000d0a1";
export const DEMO_ORG_NAME = "Demo GTM";

/** True only on the dev server: the button and the bypass never exist in a production build. */
export const demoAvailable = (): boolean => import.meta.env.DEV === true;

function storage(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.sessionStorage : null;
  } catch {
    return null;
  }
}

/** Demo mode is on for this tab (dev server only). */
export function isDemoMode(): boolean {
  if (!demoAvailable()) return false;
  try {
    return storage()?.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

/** Turns demo mode on for this tab and installs the local backend. No-op outside the dev server. */
export function enterDemoMode(): boolean {
  if (!demoAvailable()) return false;
  try {
    storage()?.setItem(STORAGE_KEY, "1");
  } catch {
    return false;
  }
  resetDemoData();
  installDemoBackend();
  return isDemoMode();
}

/** Turns demo mode off, restores the real fetch and drops the in-memory data. */
export function exitDemoMode(): void {
  try {
    storage()?.removeItem(STORAGE_KEY);
  } catch {
    /* blocked storage */
  }
  uninstallDemoBackend();
  data = null;
}

// ---------------------------------------------------------------------------------------------------------------
// Fictitious identity
// ---------------------------------------------------------------------------------------------------------------

const ISO_CREATED = "2026-01-15T09:00:00.000Z";

export const DEMO_USER: User = {
  id: DEMO_USER_ID,
  aud: "authenticated",
  role: "authenticated",
  email: "demo@nokko.local",
  app_metadata: { provider: "demo" },
  user_metadata: { full_name: "Laura Demo" },
  created_at: ISO_CREATED,
};

const DEMO_PROFILE: Tables<"profiles"> = {
  id: DEMO_USER_ID,
  full_name: "Laura Demo",
  email: "demo@nokko.local",
  current_org_id: DEMO_ORG_ID,
  created_at: ISO_CREATED,
};

/** The value meQuery returns in demo mode: one company, «Demo GTM», where the demo user is owner. */
export function demoMe() {
  const membership = {
    org_id: DEMO_ORG_ID,
    role: "owner",
    name: DEMO_ORG_NAME,
    currency: "EUR",
    website: "https://demo-gtm.example",
    archived: false,
  };
  return {
    user: DEMO_USER,
    profile: DEMO_PROFILE,
    memberships: [membership],
    archived: [] as (typeof membership)[],
    currentOrg: membership,
    roles: [membership.role],
  };
}

// ---------------------------------------------------------------------------------------------------------------
// Dataset
// ---------------------------------------------------------------------------------------------------------------

type Row = Record<string, unknown>;
type Dataset = Record<string, Row[]>;

const id = (prefix: string, n: number) =>
  `00000000-0000-4000-8000-${prefix}${String(n).padStart(12 - prefix.length, "0")}`;

/** Builds the fictitious company around `now`, so meetings are upcoming and deals close this quarter. */
export function buildDemoData(now: Date = new Date()): Dataset {
  const day = 864e5;
  const at = (days: number, hour = 10) => {
    const d = new Date(now.getTime() + days * day);
    d.setUTCHours(hour, 0, 0, 0);
    return d.toISOString();
  };
  const date = (days: number) => at(days).slice(0, 10);
  const base = {
    org_id: DEMO_ORG_ID,
    created_at: at(-60),
    updated_at: at(-2),
    created_by: DEMO_USER_ID,
    updated_by: DEMO_USER_ID,
  };

  const segments: Row[] = [
    {
      name: "Mid-market SaaS",
      motion: "sales_led",
      acv_min: 15000,
      acv_max: 60000,
      priority: 1,
      cycle_days: 75,
      win_rate_target: 0.25,
      ae_quota: 600000,
      gross_margin_pct: 0.8,
      cac_target: 12000,
    },
    {
      name: "Scale-ups fintech",
      motion: "sales_led",
      acv_min: 40000,
      acv_max: 150000,
      priority: 2,
      cycle_days: 120,
      win_rate_target: 0.2,
      ae_quota: 900000,
      gross_margin_pct: 0.78,
      cac_target: 30000,
    },
    {
      name: "Pymes de servicios",
      motion: "product_led",
      acv_min: 3000,
      acv_max: 12000,
      priority: 3,
      cycle_days: 30,
      win_rate_target: 0.3,
      ae_quota: 350000,
      gross_margin_pct: 0.85,
      cac_target: 2500,
    },
  ].map((s, i) => ({
    ...base,
    id: id("5e9", i + 1),
    acquisition_motion: null,
    ae_per_se: null,
    business_line_id: null,
    field_sources: {},
    last_human_edit_at: null,
    notes: null,
    payback_months: null,
    sdr_per_ae: null,
    ...s,
  }));

  const accountSeeds: [string, string, string, string, number][] = [
    ["Lumen Analytics", "lumen-analytics.example", "Software", "green", 0],
    ["Northwind Pagos", "northwind-pagos.example", "Fintech", "yellow", 1],
    ["Cobalto Logística", "cobalto.example", "Logística", "red", 0],
    ["Atlas Seguros", "atlas-seguros.example", "Seguros", "green", 1],
    ["Brío Salud", "brio-salud.example", "Salud digital", "yellow", 0],
    ["Faro Energía", "faro-energia.example", "Energía", "green", 1],
    ["Quanta RRHH", "quanta-rrhh.example", "Software", "green", 2],
    ["Vela Retail", "vela-retail.example", "Retail", "red", 2],
  ];
  const accounts: Row[] = accountSeeds.map(([name, domain, industry, health, seg], i) => ({
    ...base,
    id: id("acc", i + 1),
    name,
    domain,
    industry,
    health,
    country: "ES",
    size: i % 2 ? "201-500" : "51-200",
    tier: i < 3 ? "A" : i < 6 ? "B" : "C",
    abm_tier: i < 2 ? "1:1" : null,
    is_target: i < 6,
    segment_id: segments[seg]!.id,
    owner_id: DEMO_USER_ID,
    notes: null,
    linkedin_url: null,
    field_sources: {},
    auto_researched_at: null,
    signals_checked_at: null,
    last_human_edit_at: null,
  }));

  const dealSeeds: [string, number, string, number, number, string, number][] = [
    // name, account, stage, amount, close in days, health, probability
    ["Lumen · Plataforma anual", 0, "negotiation", 48000, 12, "green", 0.7],
    ["Northwind · Piloto pagos", 1, "proposal", 72000, 25, "yellow", 0.5],
    ["Cobalto · Renovación", 2, "demo", 26000, 9, "red", 0.3],
    ["Atlas · Expansión equipos", 3, "qualified", 54000, 40, "green", 0.25],
    ["Brío · Módulo analítica", 4, "discovery", 18000, 55, "yellow", 0.1],
    ["Faro · Licencias 2027", 5, "proposal", 96000, 30, "green", 0.5],
    ["Quanta · Onboarding", 6, "won", 14000, -6, "green", 1],
    ["Vela · Prueba tiendas", 7, "lost", 22000, -15, "red", 0],
    ["Atlas · Integración CRM", 3, "won", 31000, -20, "green", 1],
    ["Northwind · Riesgo y fraude", 1, "discovery", 120000, 80, "yellow", 0.1],
  ];
  const deals: Row[] = dealSeeds.map(
    ([name, acc, stage, amount, close, health, probability], i) => ({
      ...base,
      id: id("dea", i + 1),
      name,
      account_id: accounts[acc]!.id,
      segment_id: accounts[acc]!.segment_id,
      stage,
      amount,
      probability,
      health,
      close_date: date(close),
      closed_at: stage === "won" || stage === "lost" ? at(close) : null,
      created_at: at(-50 + i * 3),
      updated_at: at(-(i % 5)),
      owner_id: DEMO_USER_ID,
      forecast_category: stage === "negotiation" ? "commit" : "pipeline",
      gross_margin: 0.8,
      meddpicc: {},
      slip_count: i === 2 ? 2 : 0,
      source: i % 3 ? "outbound" : "inbound",
      lost_reason: stage === "lost" ? "Precio" : null,
      lost_reason_detail: null,
      lost_competitor: null,
      external_id: null,
      lead_source_id: null,
      last_human_edit_at: null,
      one_off_amount: null,
      partner_id: null,
    }),
  );

  const meetingSeeds: [string, number, number, number][] = [
    ["Negociación final con Lumen", 0, 0, 15],
    ["Demo técnica Cobalto", 2, 1, 11],
    ["Discovery Brío Salud", 4, 2, 9],
    ["Revisión propuesta Faro", 5, 3, 16],
    ["Kick-off Quanta", 6, 6, 10],
  ];
  const meetings: Row[] = meetingSeeds.map(([title, acc, days, hour], i) => ({
    ...base,
    id: id("mee", i + 1),
    title,
    account_id: accounts[acc]!.id,
    deal_id: deals.find((d) => d.account_id === accounts[acc]!.id)?.id ?? null,
    scheduled_at: at(days, hour),
    agenda: null,
    ai_brief: null,
    attendees: null,
    auto_prepped_at: null,
    call_notes: {},
    call_review: "",
    desired_outcome: null,
    listening_coaching: "",
    listening_level: null,
    listening_reflection: "",
    materials: null,
    next_steps: null,
    notes: null,
    objections: null,
    objective: null,
    questions: null,
  }));

  const stakeholders: Row[] = [
    ["Marta Ríos", "VP Sales", 0, "decision_maker"],
    ["Iván Soler", "Head of RevOps", 0, "champion"],
    ["Clara Vidal", "CFO", 1, "decision_maker"],
    ["Diego Pons", "COO", 2, "blocker"],
    ["Sara Gil", "Head of Data", 4, "influencer"],
  ].map(([name, title, acc, role], i) => ({
    ...base,
    id: id("stk", i + 1),
    name,
    title,
    account_id: accounts[acc as number]!.id,
    buying_role: role,
    email: null,
    linkedin_url: null,
    phone: null,
    priorities: null,
    reports_to: null,
    research: null,
    support: null,
  }));

  const people: Row[] = stakeholders.map((s, i) => ({
    ...base,
    id: id("peo", i + 1),
    full_name: s.name,
    title: s.title,
    account_id: s.account_id,
    company: accounts.find((a) => a.id === s.account_id)?.name ?? null,
    tier: i < 2 ? "A" : "B",
    crm_stage: i % 2 ? "sql" : "mql",
    email: null,
    linkedin_url: null,
    sequence_stage: null,
    source: "demo",
  }));

  const suggestionSeeds: [string, string, number, string, string][] = [
    [
      "Cobalto lleva 2 retrasos de cierre",
      "La renovación de Cobalto Logística cierra en 9 días con salud roja. Agenda una llamada con el COO antes de la demo.",
      1,
      "/deals",
      "deal_slipping",
    ],
    [
      "Faro Energía no tiene champion identificado",
      "Una propuesta de 96.000 € sin champion suele alargar el ciclo. Mapea stakeholders antes de la revisión.",
      1,
      "/accounts",
      "missing_champion",
    ],
    [
      "Prepara la negociación con Lumen",
      "La reunión es hoy: revisa MEDDPICC y el plan de concesiones.",
      2,
      "/deals",
      "meeting_prep",
    ],
    [
      "3 cuentas objetivo sin actividad en 14 días",
      "Atlas Seguros, Brío Salud y Vela Retail no tienen toques recientes.",
      2,
      "/accounts",
      "stale_accounts",
    ],
    [
      "Revisa el ICP de Pymes de servicios",
      "El win rate real (18 %) está por debajo del objetivo (30 %).",
      3,
      "/strategy",
      "icp_review",
    ],
  ];
  const suggestions: Row[] = suggestionSeeds.map(([title, body, priority, link, detector], i) => ({
    id: id("sug", i + 1),
    org_id: DEMO_ORG_ID,
    user_id: null,
    title,
    body,
    priority,
    link,
    detector,
    dedupe_key: `demo-${detector}`,
    action: null,
    strategy: null,
    status: "pending",
    snoozed_until: null,
    notified_at: null,
    created_at: at(-i),
    updated_at: at(-i),
  }));

  const approvals: Row[] = [
    ["Descuento del 12 % para Lumen", "discount"],
    ["Extensión de piloto Northwind", "terms"],
  ].map(([title, kind], i) => ({
    ...base,
    id: id("apr", i + 1),
    title,
    kind,
    status: "pending",
    evidence: null,
    decided_by: null,
  }));

  const tasks: Row[] = [
    ["Enviar caso de éxito a Marta Ríos", 0, 1],
    ["Confirmar asistentes de la demo Cobalto", 2, 0],
    ["Preparar business case Faro", 5, 3],
  ].map(([title, acc, due], i) => ({
    ...base,
    id: id("tsk", i + 1),
    title,
    account_id: accounts[acc as number]!.id,
    deal_id: null,
    done: false,
    due_date: date(due as number),
    notes: "",
    owner_id: DEMO_USER_ID,
    source: "demo",
  }));

  const positioning: Row[] = [
    {
      ...base,
      id: id("pos", 1),
      product_name: "Demo GTM",
      category: "Plataforma de revenue operations",
      target_customer: "Equipos comerciales B2B de 10 a 200 vendedores",
      need: "Saber qué cuentas y deals priorizar cada semana",
      key_benefit: "Pipeline previsible sin hojas de cálculo",
      competitive_alternative: "CRM + hojas de cálculo + intuición",
      differentiator: "Recomendaciones accionables a partir de tus propios datos",
      one_liner: "Tu sistema comercial, con criterio.",
      tagline: "Primero el sistema, luego el equipo.",
      elevator_pitch:
        "Demo GTM conecta estrategia y ejecución: define segmentos, prioriza cuentas y te dice qué hacer hoy.",
      short_pitch: null,
      alternatives: null,
      best_customers: null,
      differentiation: null,
      trend: null,
      value: null,
      copy_status: {},
      field_sources: {},
      last_human_edit_at: null,
    },
  ];

  const messaging_pillars: Row[] = [
    ["Foco", "No sabes qué deals priorizar", "Una lista diaria de decisiones", "Ciclo −18 %"],
    [
      "Previsibilidad",
      "El forecast falla cada trimestre",
      "Forecast con salud por deal",
      "Error ±7 %",
    ],
    ["Ejecución", "La estrategia no llega al equipo", "Playbooks por segmento", "Ramp −30 %"],
  ].map(([title, pain, message, proof], i) => ({
    ...base,
    id: id("pil", i + 1),
    title,
    pain,
    message,
    proof,
    position: i,
    field_sources: {},
    last_human_edit_at: null,
  }));

  const icp_profiles: Row[] = segments.map((s, i) => ({
    ...base,
    id: id("icp", i + 1),
    name: `ICP ${s.name as string}`,
    segment_id: s.id,
    industries: i === 1 ? "Fintech, Seguros" : "Software, Servicios",
    company_size: i === 2 ? "10-50" : "50-500",
    geography: "España",
    countries: ["ES"],
    min_employees: i === 2 ? 10 : 50,
    max_employees: i === 2 ? 50 : 500,
    search_keywords: [],
    seniorities: [],
    target_titles: ["VP Sales", "Head of RevOps"],
    anti_icp: null,
    adoption: null,
    funding_signals: null,
    growth_stage: null,
    hiring_signals: null,
    pains: null,
    tech_stack: null,
    why_fit: null,
    field_sources: {},
    last_human_edit_at: null,
  }));

  return {
    organizations: [
      {
        id: DEMO_ORG_ID,
        name: DEMO_ORG_NAME,
        currency: "EUR",
        website: "https://demo-gtm.example",
        archived_at: null,
        created_at: ISO_CREATED,
      },
    ],
    profiles: [DEMO_PROFILE],
    org_members: [
      { org_id: DEMO_ORG_ID, user_id: DEMO_USER_ID, role: "owner", created_at: ISO_CREATED },
    ],
    segments,
    accounts,
    deals,
    meetings,
    stakeholders,
    people,
    suggestions,
    approvals,
    tasks,
    positioning,
    messaging_pillars,
    icp_profiles,
  };
}

let data: Dataset | null = null;

function dataset(): Dataset {
  if (!data) data = buildDemoData();
  return data;
}

/** Starts the demo over from the seed (also used by tests). */
export function resetDemoData(now?: Date) {
  data = buildDemoData(now);
}

// ---------------------------------------------------------------------------------------------------------------
// PostgREST-shaped answers from the dataset (pure enough to test without a browser)
// ---------------------------------------------------------------------------------------------------------------

export type DemoResponse = { status: number; body: unknown; headers?: Record<string, string> };

/** Splits on commas outside parentheses: "a,b(c,d),e" → ["a", "b(c,d)", "e"]. */
function splitTop(s: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of s) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  if (cur) out.push(cur);
  return out.map((p) => p.trim()).filter(Boolean);
}

const unquote = (v: string) => v.replace(/^"(.*)"$/, "$1");

function compare(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a) < String(b) ? -1 : String(a) > String(b) ? 1 : 0;
}

function asComparable(row: Row, col: string, raw: string): [unknown, unknown] {
  const v = row[col];
  if (typeof v === "number") return [v, Number(raw)];
  return [v, raw];
}

/** One PostgREST condition, "op.value" (with optional "not." prefix), against a column of a row. */
function test(row: Row, col: string, cond: string): boolean {
  if (cond.startsWith("not.")) return !test(row, col, cond.slice(4));
  const dot = cond.indexOf(".");
  const op = dot < 0 ? cond : cond.slice(0, dot);
  const raw = dot < 0 ? "" : cond.slice(dot + 1);
  const v = row[col];
  switch (op) {
    case "eq": {
      const [a, b] = asComparable(row, col, unquote(raw));
      return typeof v === "boolean" ? String(v) === raw : a === b;
    }
    case "neq": {
      const [a, b] = asComparable(row, col, unquote(raw));
      return a !== b;
    }
    case "gt":
      return compare(...asComparable(row, col, raw)) > 0 && v != null;
    case "gte":
      return compare(...asComparable(row, col, raw)) >= 0 && v != null;
    case "lt":
      return compare(...asComparable(row, col, raw)) < 0 && v != null;
    case "lte":
      return compare(...asComparable(row, col, raw)) <= 0 && v != null;
    case "is":
      return raw === "null" ? v == null : String(v) === raw;
    case "in": {
      const list = splitTop(raw.replace(/^\(|\)$/g, "")).map(unquote);
      return list.includes(String(v));
    }
    case "like":
    case "ilike": {
      const re = new RegExp(
        "^" +
          unquote(raw)
            .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
            .replace(/[*%]/g, ".*") +
          "$",
        op === "ilike" ? "i" : "",
      );
      return re.test(String(v ?? ""));
    }
    case "cs":
    case "ov":
      return true;
    default:
      // Unknown operator: do not hide data in a demo.
      return true;
  }
}

/** "(a.eq.1,b.is.null)" → any of them holds. Nested and()/or() are supported. */
function testOr(row: Row, expr: string, all = false): boolean {
  const parts = splitTop(expr.replace(/^\(|\)$/g, ""));
  const check = (p: string) => {
    const nested = p.match(/^(not\.)?(and|or)(\(.*\))$/);
    if (nested) {
      const r = testOr(row, nested[3]!, nested[2] === "and");
      return nested[1] ? !r : r;
    }
    const dot = p.indexOf(".");
    return test(row, p.slice(0, dot), p.slice(dot + 1));
  };
  return all ? parts.every(check) : parts.some(check);
}

const RESERVED = new Set(["select", "order", "limit", "offset", "on_conflict", "columns"]);

function filterRows(rows: Row[], params: URLSearchParams): Row[] {
  return rows.filter((row) => {
    for (const [key, value] of params) {
      if (RESERVED.has(key) || key.includes(".")) continue;
      if (key === "or" && !testOr(row, value)) return false;
      if (key === "and" && !testOr(row, value, true)) return false;
      if (key !== "or" && key !== "and" && !test(row, key, value)) return false;
    }
    return true;
  });
}

function orderRows(rows: Row[], order: string | null): Row[] {
  if (!order) return rows;
  const keys = order.split(",").map((o) => {
    const [col, ...mods] = o.split(".");
    return { col: col!, desc: mods.includes("desc") };
  });
  return [...rows].sort((a, b) => {
    for (const k of keys) {
      const c = compare(a[k.col], b[k.col]);
      if (c) return k.desc ? -c : c;
    }
    return 0;
  });
}

const singular = (table: string) =>
  table === "people"
    ? "person"
    : table.endsWith("ies")
      ? table.slice(0, -3) + "y"
      : table.replace(/s$/, "");

/** Adds embedded resources from select=… («accounts(name)», «owner:profiles(full_name)», «deals!inner(id)»). */
function embed(rows: Row[], table: string, select: string | null): Row[] {
  if (!select) return rows;
  const embeds = splitTop(select)
    .map((p) => p.match(/^(?:([\w]+):)?([\w]+)(?:![\w]+)?\((.*)\)$/))
    .filter((m): m is RegExpMatchArray => !!m);
  if (!embeds.length) return rows;
  const db = dataset();
  return rows.map((row) => {
    const out: Row = { ...row };
    for (const m of embeds) {
      const alias = m[1] ?? m[2]!;
      const target = m[2]!;
      const targetRows = db[target] ?? [];
      // Many-to-one when the row holds the key («owner:profiles» → owner_id, organizations → org_id).
      const fk = [
        `${alias}_id`,
        `${singular(target)}_id`,
        target === "organizations" ? "org_id" : "",
      ]
        .filter(Boolean)
        .find((k) => k in row);
      if (fk) {
        out[alias] = targetRows.find((t) => t.id === row[fk]) ?? null;
      } else {
        const back = `${singular(table)}_id`;
        out[alias] = targetRows.filter((t) => t[back] === row.id);
      }
    }
    return out;
  });
}

const RPC_ANSWERS: Record<string, unknown> = {
  accept_invites: null,
  is_platform_admin: false,
  is_org_member: true,
};

function newRow(table: string, input: Row): Row {
  const now = new Date().toISOString();
  const fresh: Row = {
    id: globalThis.crypto?.randomUUID?.() ?? `demo-${Math.random().toString(36).slice(2)}`,
    created_at: now,
    updated_at: now,
    ...input,
  };
  if (table !== "organizations" && table !== "profiles" && !("org_id" in fresh))
    fresh.org_id = DEMO_ORG_ID;
  return fresh;
}

/**
 * Answers one REST request aimed at the Supabase project: /rest/v1 (tables and rpc) from the dataset, /auth/v1 with
 * the demo user, anything else with an empty success. Writes change the in-memory copy only.
 */
export function demoRest(method: string, url: URL, headers: Headers, body: unknown): DemoResponse {
  const path = url.pathname;
  const m = method.toUpperCase();

  if (path.startsWith("/auth/v1/")) {
    if (path === "/auth/v1/user") return { status: 200, body: DEMO_USER };
    if (path === "/auth/v1/logout") return { status: 204, body: null };
    return { status: 200, body: {} };
  }
  if (path.startsWith("/rest/v1/rpc/")) {
    const fn = path.slice("/rest/v1/rpc/".length);
    return { status: 200, body: fn in RPC_ANSWERS ? RPC_ANSWERS[fn] : null };
  }
  if (!path.startsWith("/rest/v1/")) {
    if (path.startsWith("/storage/v1/")) return { status: 200, body: [] };
    return { status: 200, body: {} };
  }

  const table = decodeURIComponent(path.slice("/rest/v1/".length));
  const db = dataset();
  const rows = (db[table] ??= []);
  const params = url.searchParams;
  const prefer = headers.get("prefer") ?? "";
  const wantsRows = prefer.includes("return=representation");
  const single = (headers.get("accept") ?? "").includes("application/vnd.pgrst.object+json");

  let result: Row[];
  let status = 200;
  if (m === "GET" || m === "HEAD") {
    result = orderRows(filterRows(rows, params), params.get("order"));
  } else if (m === "POST") {
    const input = (Array.isArray(body) ? body : [body]).filter(
      (r): r is Row => !!r && typeof r === "object",
    );
    const upsert = prefer.includes("resolution=merge-duplicates");
    result = input.map((r) => {
      const existing = upsert && r.id ? rows.find((x) => x.id === r.id) : undefined;
      if (existing) return Object.assign(existing, r, { updated_at: new Date().toISOString() });
      const row = newRow(table, r);
      rows.push(row);
      return row;
    });
    status = 201;
  } else if (m === "PATCH") {
    const patch = body && typeof body === "object" ? (body as Row) : {};
    result = filterRows(rows, params).map((r) =>
      Object.assign(r, patch, { updated_at: new Date().toISOString() }),
    );
  } else if (m === "DELETE") {
    result = filterRows(rows, params);
    db[table] = rows.filter((r) => !result.includes(r));
  } else {
    return { status: 405, body: { message: "Método no soportado en modo demo" } };
  }

  const total = result.length;
  const offset = Number(params.get("offset") ?? 0);
  const limit = params.get("limit");
  const page = result.slice(offset, limit != null ? offset + Number(limit) : undefined);
  const out = embed(page, table, params.get("select"));
  const range = `${out.length ? `${offset}-${offset + out.length - 1}` : "*"}/${total}`;
  const respHeaders = { "content-range": range };

  if (m !== "GET" && m !== "HEAD" && !wantsRows)
    return { status: m === "POST" ? 201 : 204, body: null, headers: respHeaders };
  if (single) {
    if (out.length !== 1)
      return {
        status: 406,
        body: {
          code: "PGRST116",
          details: `The result contains ${out.length} rows`,
          hint: null,
          message: "JSON object requested, multiple (or no) rows returned",
        },
      };
    return { status, body: out[0], headers: respHeaders };
  }
  return { status, body: m === "HEAD" ? null : out, headers: respHeaders };
}

// ---------------------------------------------------------------------------------------------------------------
// fetch interception (browser, dev server, demo on)
// ---------------------------------------------------------------------------------------------------------------

let realFetch: typeof fetch | null = null;

function supabaseOrigin(): string | null {
  const raw = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  try {
    return raw ? new URL(raw).origin : null;
  } catch {
    return null;
  }
}

async function readBody(input: RequestInfo | URL, init?: RequestInit): Promise<unknown> {
  let text: string | null = null;
  if (typeof init?.body === "string") text = init.body;
  else if (input instanceof Request) text = await input.clone().text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * Patches window.fetch so requests to the Supabase project are answered locally and server functions never leave
 * the browser. Idempotent; does nothing outside the dev server or when demo mode is off.
 */
export function installDemoBackend(): void {
  if (!isDemoMode() || typeof window === "undefined" || realFetch) return;
  const origin = supabaseOrigin();
  const original = window.fetch.bind(window);
  realFetch = window.fetch;
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const href = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const url = new URL(href, window.location.href);
    if (url.origin === window.location.origin && url.pathname.startsWith("/_serverFn")) {
      // Server functions run with the real backend: in demo they are refused before leaving the browser.
      throw new TypeError("Modo demo local: esta acción necesita una cuenta real.");
    }
    if (!origin || url.origin !== origin) return original(input, init);
    const method = init?.method ?? (input instanceof Request ? input.method : "GET");
    const headers = new Headers(input instanceof Request ? input.headers : undefined);
    new Headers(init?.headers).forEach((v, k) => headers.set(k, v));
    const res = demoRest(method, url, headers, await readBody(input, init));
    const noBody = res.status === 204 || res.body === null;
    return new Response(noBody ? (res.status === 204 ? null : "") : JSON.stringify(res.body), {
      status: res.status,
      headers: { "content-type": "application/json", ...res.headers },
    });
  };
}

function uninstallDemoBackend(): void {
  if (realFetch && typeof window !== "undefined") window.fetch = realFetch;
  realFetch = null;
}
