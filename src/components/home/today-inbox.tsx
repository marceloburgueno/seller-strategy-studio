// Ronda 2B: the single «Hoy» list in Inicio — meetings, approvals, tasks, agent actions, replies and suggestions
// in clean rows with a colored dot per kind. Reads what each screen already reads (RLS) and links to where it is
// decided. Order and rows are pure in src/lib/today-inbox.ts (tested).
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/hooks/use-me";
import { useSuggestions } from "@/components/suggestions";
import { canDecideApprovals } from "@/lib/roles";
import { KIND_LABEL, mergeInbox, type InboxItem, type InboxKind } from "@/lib/today-inbox";

const MAX_ROWS = 8;

// One categorical color per kind (series palette): red, amber and green stay reserved for state.
const DOT: Record<InboxKind, string> = {
  reunion: "bg-series-1",
  aprobacion: "bg-series-2",
  tarea: "bg-series-3",
  agente: "bg-series-4",
  respuesta: "bg-series-5",
  sugerencia: "bg-series-rest",
};

type Meeting = {
  id: string;
  title: string;
  scheduled_at: string | null;
  account_id: string | null;
};

export function TodayInbox({
  meetings,
  excludeSuggestionId,
}: {
  meetings: Meeting[];
  /** The suggestion already shown in «Ahora», so it is not repeated here. */
  excludeSuggestionId?: string | null;
}) {
  const { data: me } = useMe();
  const userId = me?.user.id;
  const orgId = me?.currentOrg?.org_id;
  const approver = canDecideApprovals(me?.roles ?? []);
  const { data: suggestions = [] } = useSuggestions();
  const { data } = useQuery({
    queryKey: ["today-inbox", userId, approver],
    enabled: !!userId,
    queryFn: async () => {
      const [appr, tasks, acts] = await Promise.all([
        approver
          ? supabase
              .from("approvals")
              .select("id,title,created_at")
              .eq("status", "pending")
              .limit(50)
          : Promise.resolve({ data: [] as { id: string; title: string; created_at: string }[] }),
        supabase
          .from("tasks")
          .select("id,title,due_date,created_at,account_id")
          .eq("done", false)
          .eq("owner_id", userId!)
          .limit(50),
        supabase
          .from("agent_pending_actions")
          .select("id,summary,created_at")
          .eq("status", "pending")
          .eq("user_id", userId!)
          .limit(50),
      ]);
      return { approvals: appr.data ?? [], tasks: tasks.data ?? [], actions: acts.data ?? [] };
    },
  });
  // Replies only exist with a linked mailbox; without one the row is not shown at all.
  const { data: replies } = useQuery({
    queryKey: ["home-replies", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data: link } = await supabase
        .from("mailbox_links")
        .select("status")
        .eq("org_id", orgId!)
        .maybeSingle();
      if (!link || link.status === "disconnected") return undefined;
      const since = new Date(Date.now() - 7 * 864e5).toISOString();
      const { count } = await supabase
        .from("inbox_replies")
        .select("id", { count: "exact", head: true })
        .gte("received_at", since);
      return count ?? 0;
    },
  });
  const today = new Date().toISOString().slice(0, 10);
  const items = mergeInbox(
    {
      suggestions: suggestions.filter((s) => s.id !== excludeSuggestionId),
      approvals: data?.approvals ?? [],
      tasks: data?.tasks ?? [],
      actions: data?.actions ?? [],
      meetings,
      replies,
    },
    today,
  );
  const shown = items.slice(0, MAX_ROWS);
  return (
    <section aria-labelledby="today-title">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h2 id="today-title" className="section-title">
          Hoy
        </h2>
        {items.length > MAX_ROWS && (
          <Link to="/inbox" className="py-2 text-xs text-signal md:py-0">
            Ver las {items.length} →
          </Link>
        )}
      </div>
      {shown.length === 0 ? (
        <p className="border-t border-hairline py-6 text-sm text-ink-mid">
          Nada pendiente para hoy: ni reuniones, ni tareas, ni decisiones.
        </p>
      ) : (
        <ul className="divide-y divide-hairline border-y border-hairline">
          {shown.map((i) => (
            <li key={i.id}>
              <Row item={i} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function meta(i: InboxItem) {
  if (i.kind === "reunion" && i.at)
    return `${KIND_LABEL.reunion} · ${new Date(i.at).toLocaleTimeString("es-ES", { timeStyle: "short" })}`;
  if (i.kind === "tarea" && i.priority === 1) return "Tarea · vence hoy";
  return KIND_LABEL[i.kind];
}

function Row({ item: i }: { item: InboxItem }) {
  const body = (
    <>
      <span aria-hidden className={`size-2 shrink-0 rounded-full ${DOT[i.kind]}`} />
      <span className="min-w-0 flex-1 truncate">{i.title}</span>
      <span
        className={`shrink-0 text-xs ${i.priority === 1 && i.kind !== "reunion" ? "text-signal" : "text-ink-mid"}`}
      >
        {meta(i)}
      </span>
    </>
  );
  const cls = "flex min-h-10 items-center gap-3 px-1 py-2 text-sm";
  if (i.href)
    return (
      <Link to={i.href} className={`${cls} hover:bg-paper-sunk`}>
        {body}
      </Link>
    );
  if (i.accountId)
    return (
      <Link
        to="/accounts/$id"
        params={{ id: i.accountId }}
        className={`${cls} hover:bg-paper-sunk`}
      >
        {body}
      </Link>
    );
  return <div className={cls}>{body}</div>;
}
