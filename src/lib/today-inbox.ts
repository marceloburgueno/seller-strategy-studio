// Ronda 2B: Inicio answers «qué hago hoy» in three pure pieces, tested here so the screen and the tests agree:
// - homeFocus: the one «Ahora» card (onboarding → strategy → best suggestion → nothing pending);
// - homeScope: the figures of the strip, with the same role scope as the headline (a leader sees the
//   company, everyone else their own deals), so the headline and the strip never disagree;
// - mergeInbox: the single «Hoy» list (meetings, approvals, tasks, agent actions, suggestions, replies).
//   Surface only: each item links to the screen that already decides it; no table changes.
export type InboxKind = "reunion" | "aprobacion" | "tarea" | "agente" | "sugerencia" | "respuesta";

export type InboxItem = {
  id: string;
  kind: InboxKind;
  title: string;
  /** 1 urgent · 2 important · 3 when you can. */
  priority: 1 | 2 | 3;
  at: string;
  /** Screen that decides it; a meeting or task opens its account, or nothing when it has none. */
  href: "/inbox" | "/approvals" | "/replies" | null;
  accountId?: string | null;
};

export const KIND_LABEL: Record<InboxKind, string> = {
  reunion: "Reunión",
  aprobacion: "Aprobación",
  tarea: "Tarea",
  agente: "Del agente",
  sugerencia: "Sugerencia",
  respuesta: "Respuestas",
};

type Sug = { id: string; title: string; priority?: number | null; created_at: string };
type Appr = { id: string; title: string; created_at: string };
type Task = {
  id: string;
  title: string;
  due_date: string | null;
  created_at: string;
  account_id?: string | null;
};
type Act = { id: string; summary: string; created_at: string };
type Meeting = {
  id: string;
  title: string;
  scheduled_at: string | null;
  account_id?: string | null;
};

const prio = (n: number | null | undefined): 1 | 2 | 3 => (n === 1 ? 1 : n === 3 ? 3 : 2);

/** A task due today or earlier is urgent; with a future date, important; without date, when you can. */
export function taskPriority(due: string | null, today: string): 1 | 2 | 3 {
  if (!due) return 3;
  return due.slice(0, 10) <= today ? 1 : 2;
}

/**
 * The «Hoy» list. Today's meetings come first in time order (they have a fixed hour), then everything else,
 * urgent first. `replies` is the count of new replies; it adds one row only when the caller passes a number
 * above zero (it passes nothing when no mailbox is linked).
 */
export function mergeInbox(
  s: {
    suggestions: Sug[];
    approvals: Appr[];
    tasks: Task[];
    actions: Act[];
    meetings?: Meeting[];
    replies?: number;
  },
  today: string,
): InboxItem[] {
  const meetings: InboxItem[] = (s.meetings ?? [])
    .filter((m) => m.scheduled_at?.slice(0, 10) === today)
    .map((m) => ({
      id: `m:${m.id}`,
      kind: "reunion" as const,
      title: m.title,
      priority: 1 as const,
      at: m.scheduled_at ?? "",
      href: null,
      accountId: m.account_id ?? null,
    }))
    .sort((a, b) => a.at.localeCompare(b.at));
  const rest: InboxItem[] = [
    ...s.approvals.map((x) => ({
      id: `a:${x.id}`,
      kind: "aprobacion" as const,
      title: x.title,
      priority: 1 as const,
      at: x.created_at,
      href: "/approvals" as const,
    })),
    ...s.tasks.map((x) => ({
      id: `t:${x.id}`,
      kind: "tarea" as const,
      title: x.title,
      priority: taskPriority(x.due_date, today),
      at: x.due_date ?? x.created_at,
      href: null,
      accountId: x.account_id ?? null,
    })),
    ...s.actions.map((x) => ({
      id: `g:${x.id}`,
      kind: "agente" as const,
      title: x.summary,
      priority: 1 as const,
      at: x.created_at,
      href: "/inbox" as const,
    })),
    ...(s.replies && s.replies > 0
      ? [
          {
            id: "r:replies",
            kind: "respuesta" as const,
            title:
              s.replies === 1
                ? "1 respuesta nueva de tus leads"
                : `${s.replies} respuestas nuevas de tus leads`,
            priority: 2 as const,
            at: today,
            href: "/replies" as const,
          },
        ]
      : []),
    ...s.suggestions.map((x) => ({
      id: `s:${x.id}`,
      kind: "sugerencia" as const,
      title: x.title,
      priority: prio(x.priority),
      at: x.created_at,
      href: "/inbox" as const,
    })),
  ].sort((a, b) => a.priority - b.priority || a.at.localeCompare(b.at));
  return [...meetings, ...rest];
}

export type HomeFocus = "onboarding" | "strategy" | "suggestion" | "empty";

/** The one «Ahora» card, in priority order. */
export function homeFocus(i: {
  onboardingPending: boolean;
  strategyPending: boolean;
  hasSuggestion: boolean;
}): HomeFocus {
  if (i.onboardingPending) return "onboarding";
  if (i.strategyPending) return "strategy";
  if (i.hasSuggestion) return "suggestion";
  return "empty";
}

type Deal = {
  stage: string;
  amount: number | null;
  probability: number | null;
  health: string | null;
  owner_id: string | null;
};

/** Open deals in the person's scope and the figures the headline and the strip share. */
export function homeScope(deals: Deal[], who: { leader: boolean; userId: string | undefined }) {
  const open = deals.filter((d) => d.stage !== "won" && d.stage !== "lost");
  const scope = who.leader ? open : open.filter((d) => !!who.userId && d.owner_id === who.userId);
  const amount = (ds: Deal[]) => ds.reduce((s, d) => s + Number(d.amount ?? 0), 0);
  const risk = scope.filter((d) => d.health === "red");
  return {
    openDeals: scope.length,
    openAmount: amount(scope),
    weighted: scope.reduce((s, d) => s + (Number(d.amount ?? 0) * (d.probability ?? 0)) / 100, 0),
    riskDeals: risk.length,
    riskAmount: amount(risk),
  };
}
