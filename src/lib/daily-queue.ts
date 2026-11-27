// V2 «cola sin culpa acumulada»: the pure rules behind Inicio and Bandeja, tested so screens and tests agree.
// - Time budget: the founder says how much time they have (15 min · 30 min · 1 h) and «Hoy» shows only the
//   highest-signal rows; the rest stays paused, never overdue.
// - Causal chain: a suggestion may carry tier, hypothesis, exact signal (source + age), a draft and the
//   commercial reason. Read defensively from the row: missing fields hide the block, never invent it.
// - Draft and outcome capture: local memory only (per company), never sent anywhere.
import { storageGet, storageSet } from "@/lib/safe-storage";

// ─── Time budget ──────────────────────────────────────────────────────────────────────────────────

export type TimeBudget = "15" | "30" | "60";

export const TIME_BUDGETS: { id: TimeBudget; label: string; rows: number; hint: string }[] = [
  { id: "15", label: "15 min", rows: 2, hint: "Lo justo: 2 acciones" },
  { id: "30", label: "30 min", rows: 4, hint: "20–30 min: las 3–4 de mayor señal" },
  { id: "60", label: "1 h", rows: 8, hint: "Una hora: hasta 8 acciones" },
];

export const DEFAULT_BUDGET: TimeBudget = "30";

export function parseBudget(raw: string | null | undefined): TimeBudget {
  return raw === "15" || raw === "30" || raw === "60" ? raw : DEFAULT_BUDGET;
}

export const budgetKey = (orgId: string) => `nokko-time-budget:${orgId}`;

/** Rows that fit the time budget, in the order given (the caller already sorts by signal). */
export function splitByBudget<T>(items: T[], budget: TimeBudget): { shown: T[]; paused: number } {
  const rows = TIME_BUDGETS.find((b) => b.id === budget)?.rows ?? 4;
  return { shown: items.slice(0, rows), paused: Math.max(0, items.length - rows) };
}

/** The calm line under a trimmed list. Never «atrasado» or «vencido»: paused work does not expire. */
export function pausedNote(paused: number): string | null {
  if (paused <= 0) return null;
  return paused === 1
    ? "1 acción más queda guardada en pausa, sin vencerse."
    : `El resto (${paused}) queda guardado en pausa, sin vencerse.`;
}

// ─── Causal chain ─────────────────────────────────────────────────────────────────────────────────

export type Tier = "Tier 1 · ABM" | "Tier 2";

export type CausalChain = {
  tier: Tier | null;
  hypothesis: string | null;
  signal: string | null;
  signalSource: string | null;
  signalAge: string | null;
  draftMessage: string | null;
  pedagogyReason: string | null;
};

const text = (v: unknown): string | null =>
  typeof v === "string" && v.trim() ? v.trim().slice(0, 2000) : null;

/** The causal fields of a suggestion row, or null when it carries none (real detectors today). */
export function causalChain(row: unknown): CausalChain | null {
  if (!row || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;
  const tier = r.tier === "Tier 1 · ABM" || r.tier === "Tier 2" ? r.tier : null;
  const c: CausalChain = {
    tier,
    hypothesis: text(r.hypothesis),
    signal: text(r.signal),
    signalSource: text(r.signalSource),
    signalAge: text(r.signalAge),
    draftMessage: text(r.draftMessage),
    pedagogyReason: text(r.pedagogyReason),
  };
  return Object.values(c).some(Boolean) ? c : null;
}

/** Badge text: Tier 1 is account-based, Tier 2 works a segment. */
export function tierLabel(t: Tier): string {
  return t === "Tier 1 · ABM" ? "Tier 1 · ABM" : "Tier 2 · Segmento";
}

/** «Nuevo director de operaciones · LinkedIn · hace 2 días»; only the parts that exist. */
export function signalLine(c: Pick<CausalChain, "signal" | "signalSource" | "signalAge">) {
  return [c.signal, c.signalSource, c.signalAge].filter(Boolean).join(" · ") || null;
}

// ─── Draft ────────────────────────────────────────────────────────────────────────────────────────

/** Filler that makes a cold email sound generated. A draft must contain none of them. */
export const GENERIC_PHRASES = [
  "espero que estés teniendo una gran semana",
  "espero que estés bien",
  "espero que este correo te encuentre bien",
  "me pongo en contacto contigo",
  "quería presentarme",
  "solución líder",
  "sinergias",
];

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();

/** Generic phrases found in a text (accent and case insensitive). */
export function genericPhrases(s: string): string[] {
  const t = norm(s);
  return GENERIC_PHRASES.filter((p) => t.includes(norm(p)));
}

/** True when the person changed the draft beyond whitespace. */
export function draftEdited(original: string, current: string): boolean {
  return norm(original) !== norm(current);
}

// ─── Outcome capture (1 click, local memory) ──────────────────────────────────────────────────────

export type Outcome = "replied" | "objection" | "meeting" | "no_reply";

export const OUTCOMES: { id: Outcome; label: string }[] = [
  { id: "replied", label: "Respondió" },
  { id: "objection", label: "Objeción" },
  { id: "meeting", label: "Reunión agendada" },
  { id: "no_reply", label: "Sin respuesta" },
];

export type OutcomeRecord = { outcome: Outcome; at: string; edited: boolean };
export type OutcomeLog = Record<string, OutcomeRecord>;

export const outcomeKey = (orgId: string) => `nokko-outcomes:${orgId}`;
export const variantKey = (orgId: string) => `nokko-draft-variants:${orgId}`;

const isOutcome = (v: unknown): v is Outcome => OUTCOMES.some((o) => o.id === v);

/** Parses the stored log, dropping anything malformed. */
export function parseOutcomes(raw: string | null): OutcomeLog {
  if (!raw) return {};
  try {
    const v: unknown = JSON.parse(raw);
    if (!v || typeof v !== "object" || Array.isArray(v)) return {};
    const out: OutcomeLog = {};
    for (const [k, r] of Object.entries(v as Record<string, unknown>)) {
      if (!r || typeof r !== "object") continue;
      const o = r as Record<string, unknown>;
      if (isOutcome(o.outcome) && typeof o.at === "string")
        out[k] = { outcome: o.outcome, at: o.at, edited: o.edited === true };
    }
    return out;
  } catch {
    return {};
  }
}

/** Same click again clears it (the chip is a toggle); another chip replaces it. */
export function toggleOutcome(
  log: OutcomeLog,
  id: string,
  outcome: Outcome,
  edited: boolean,
  now: Date = new Date(),
): OutcomeLog {
  const next = { ...log };
  if (next[id]?.outcome === outcome) delete next[id];
  else next[id] = { outcome, at: now.toISOString(), edited };
  return next;
}

export function readOutcomes(orgId: string): OutcomeLog {
  return parseOutcomes(storageGet("local", outcomeKey(orgId)));
}

export function saveOutcomes(orgId: string, log: OutcomeLog): boolean {
  return storageSet("local", outcomeKey(orgId), JSON.stringify(log));
}

/** Keeps the last edited draft per suggestion, so the style can be learned later. Local only. */
export function saveVariant(orgId: string, id: string, draft: string): boolean {
  let all: Record<string, string> = {};
  try {
    const v: unknown = JSON.parse(storageGet("local", variantKey(orgId)) ?? "{}");
    if (v && typeof v === "object" && !Array.isArray(v)) all = v as Record<string, string>;
  } catch {
    /* corrupt: start over */
  }
  all[id] = draft.slice(0, 4000);
  return storageSet("local", variantKey(orgId), JSON.stringify(all));
}

export function readVariant(orgId: string, id: string): string | null {
  try {
    const v: unknown = JSON.parse(storageGet("local", variantKey(orgId)) ?? "{}");
    const d = v && typeof v === "object" ? (v as Record<string, unknown>)[id] : null;
    return typeof d === "string" ? d : null;
  } catch {
    return null;
  }
}
