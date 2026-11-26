import { useEffect, useRef, useState } from "react";
import { storageGet, storageSet } from "@/lib/safe-storage";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/hooks/use-me";
import { Button } from "@/components/ui/button";
import { useAgent } from "@/components/agent";
import { invalidateSetup } from "@/hooks/setup-invalidation";
import { decideSuggestion, refreshSuggestions } from "@/lib/agent.functions";
import { digest } from "@/lib/proactive";
import { linkTarget, resolvePlan } from "@/lib/proactive/resolve";
import { errorText } from "@/lib/errors";
import { actionTool } from "@/lib/json";
import { Input } from "@/components/ui/input";
import {
  canViewStrategy,
  limitStrategy,
  parseStrategy,
  strategyHeading,
} from "@/lib/strategy-suggestions";
import { StrategyBadge, StrategyEvidence } from "@/components/strategy-evidence";
import { ExecuteDialog, executeKind } from "@/components/strategy-execute";
import { SuggestionDeck } from "@/components/suggestion-deck";
import { useIsMobile } from "@/hooks/use-mobile";

const PRIO: Record<number, string> = { 1: "Urgente", 2: "Importante", 3: "Cuando puedas" };

// Suggestions the user opened with «Resolver» and that have not been re-checked yet (per tab, per org).
const resolvingKey = (orgId: string) => `gtm-resolving-${orgId}`;
function readResolving(orgId: string): string[] {
  try {
    return JSON.parse(sessionStorage.getItem(resolvingKey(orgId)) ?? "[]");
  } catch {
    return [];
  }
}
function markResolving(orgId: string, id: string) {
  try {
    sessionStorage.setItem(
      resolvingKey(orgId),
      JSON.stringify([...new Set([...readResolving(orgId), id])]),
    );
  } catch {
    /* storage off: the next check closes it as solved */
  }
}
function clearResolving(orgId: string) {
  try {
    sessionStorage.removeItem(resolvingKey(orgId));
  } catch {
    /* nothing to clear */
  }
}

/** Re-runs the detectors now; what the user resolved and no longer applies closes as done. */
export function useRecheckSuggestions() {
  const { data: me } = useMe();
  const orgId = me?.currentOrg?.org_id;
  const refresh = useServerFn(refreshSuggestions);
  const qc = useQueryClient();
  return () => {
    if (!orgId) return;
    const touched = readResolving(orgId);
    refresh({ data: { touched } })
      .then(() => {
        clearResolving(orgId);
        qc.invalidateQueries({ queryKey: ["suggestions"] });
      })
      .catch((e) => toast.error(`No pude revisar las sugerencias: ${errorText(e)}`));
  };
}

export function useSuggestions() {
  const { data: me } = useMe();
  const orgId = me?.currentOrg?.org_id;
  const refresh = useServerFn(refreshSuggestions);
  const qc = useQueryClient();
  // Re-run the (database-only) detectors once per org when the app opens, and right away when the user
  // comes back after a «Resolver».
  useEffect(() => {
    if (!orgId) return;
    const k = `gtm-detect-${orgId}`;
    const touched = readResolving(orgId);
    // NK-0161: blocked or full storage never takes the app down.
    const last = Number(storageGet("session", k) ?? 0);
    if (!touched.length && Date.now() - last < 5 * 60_000) return;
    storageSet("session", k, String(Date.now()));
    refresh({ data: { touched } })
      .then(() => {
        if (touched.length) clearResolving(orgId);
        qc.invalidateQueries({ queryKey: ["suggestions"] });
      })
      .catch((e) =>
        console.warn(
          "[suggestions] background recheck failed",
          e instanceof Error ? e.name : "unknown",
        ),
      );
  }, [orgId, refresh, qc]);
  return useQuery({
    queryKey: ["suggestions", orgId, (me?.roles ?? []).join(",")],
    enabled: !!orgId,
    queryFn: async () => {
      const { data } = await supabase
        .from("suggestions")
        .select("id,title,body,priority,link,action,created_at,detector,dedupe_key,strategy")
        .eq("org_id", orgId!)
        .eq("status", "pending")
        .or(`user_id.is.null,user_id.eq.${me!.user.id}`)
        .order("priority")
        .order("created_at", { ascending: false })
        .limit(100);
      // At most 7 strategic suggestions open at once (CA-7); the operational ones are not capped.
      return limitStrategy(
        (data ?? []).filter((r) => canViewStrategy(r, me?.roles ?? [])),
        new Date(),
      );
    },
  });
}

type S = NonNullable<ReturnType<typeof useSuggestions>["data"]>[number];

/** «Resolver con el agente»: go to the exact record and open the agent beside it with the problem already set out. */
function useResolve() {
  const { data: me } = useMe();
  const { open } = useAgent();
  const navigate = useNavigate();
  const recheck = useRecheckSuggestions();
  return (s: S) => {
    const plan = resolvePlan(s);
    const orgId = me?.currentOrg?.org_id;
    if (orgId) markResolving(orgId, s.id);
    open({
      prompt: plan.prompt,
      fresh: true,
      docked: true,
      side: plan.side,
      mode: "chat",
      personaId: null,
      workflowId: null,
      onClose: recheck,
    });
    const to = linkTarget(plan.to);
    if (to) navigate({ to: to.to, search: to.search });
  };
}

export function SuggestionCard({ s, compact = false }: { s: S; compact?: boolean }) {
  const decide = useServerFn(decideSuggestion);
  const qc = useQueryClient();
  const resolveWith = useResolve();
  const [busy, setBusy] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [form, setForm] = useState(false);
  const strategy = parseStrategy(s.strategy);
  async function act(decision: "approve" | "snooze" | "dismiss") {
    setBusy(decision);
    try {
      const r = await decide({
        data: {
          id: s.id,
          decision,
          ...(strategy && reason.trim() ? { reason: reason.trim() } : {}),
        },
      });
      toast.success(r.message);
      qc.invalidateQueries();
    } catch (e) {
      toast.error(errorText(e));
    } finally {
      setBusy(null);
    }
  }
  const hasAction = !!actionTool(s.action);
  const target = linkTarget(s.link);
  const resolve = () => resolveWith(s);
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p
            className={`font-mono text-xs uppercase ${s.priority === 1 ? "text-signal" : "text-muted-foreground"}`}
          >
            {PRIO[s.priority]}
            {strategy ? ` · ${strategyHeading(strategy)}` : ""}
          </p>
          <p className="mt-0.5 break-words font-medium">{s.title}</p>
          <p
            className={`mt-1 whitespace-pre-line break-words text-sm text-muted-foreground ${compact ? "line-clamp-3" : ""}`}
          >
            {s.body}
          </p>
          {strategy && (
            <>
              <StrategyBadge m={strategy} />
              <StrategyEvidence m={strategy} />
            </>
          )}
        </div>
        {target && (
          <Link
            to={target.to}
            search={target.search}
            className="-m-2 shrink-0 p-2 text-muted-foreground hover:text-foreground md:m-0 md:p-0"
            aria-label="Abrir"
          >
            <span aria-hidden>→</span>
          </Link>
        )}
      </div>
      {strategy && executeKind(s) && form && (
        <ExecuteDialog s={s} open={form} onOpenChange={setForm} reason={reason} />
      )}
      {strategy && (
        <Input
          className="mt-3"
          maxLength={500}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Motivo (opcional)"
          aria-label="Motivo de tu decisión (opcional)"
        />
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {strategy ? (
          <>
            <Button
              size="sm"
              disabled={!!busy}
              onClick={() => (executeKind(s) ? setForm(true) : act("approve"))}
            >
              Aceptar
            </Button>
            <Button size="sm" variant="outline" disabled={!!busy} onClick={() => act("snooze")}>
              Más tarde
            </Button>
            <Button size="sm" variant="ghost" disabled={!!busy} onClick={() => act("dismiss")}>
              Descartar
            </Button>
          </>
        ) : (
          <>
            {hasAction ? (
              <Button size="sm" disabled={!!busy} onClick={() => act("approve")}>
                Aprobar y hacer
              </Button>
            ) : (
              <>
                <Button size="sm" disabled={!!busy} onClick={resolve}>
                  Resolver
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!!busy}
                  onClick={() => act("approve")}
                >
                  Hecho
                </Button>
              </>
            )}
            <Button size="sm" variant="outline" disabled={!!busy} onClick={() => act("snooze")}>
              En 3 días
            </Button>
            <Button size="sm" variant="ghost" disabled={!!busy} onClick={() => act("dismiss")}>
              Descartar
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export function TodayDigest() {
  const { data = [] } = useSuggestions();
  const top = digest(data, 3);
  return (
    <div className="rounded-lg border bg-card p-5">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-x-3 gap-y-1">
        <h3 className="text-2xl">3 cosas para hoy</h3>
        <Link
          to="/inbox"
          className="-my-2 py-2 text-xs text-muted-foreground hover:text-foreground md:my-0 md:py-0"
        >
          {data.length === 1 ? "Ver 1 sugerencia" : `Ver las ${data.length} sugerencias`}
        </Link>
      </div>
      {top.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Todo en orden. Te avisaré cuando detecte algo.
        </p>
      ) : (
        <div className="space-y-3">
          {top.map((s) => (
            <SuggestionCard key={s.id} s={s} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Bandeja (/inbox): master-detail on desktop, swipe deck on phones ────────────────────────────

/** Priority dot: red urgent, amber important, grey when you can. */
export const PRIORITY_DOT: Record<number, string> = {
  1: "bg-state-alarm",
  2: "bg-state-watch",
  3: "bg-ink-faint",
};

/** Short age of a suggestion for a list row: «ahora», «5 h», «3 d», «2 sem», «4 meses». */
export function ageLabel(iso: string, now: Date = new Date()): string {
  const h = Math.floor((now.getTime() - new Date(iso).getTime()) / 3_600_000);
  if (!Number.isFinite(h) || h < 1) return "ahora";
  if (h < 24) return `${h} h`;
  const d = Math.floor(h / 24);
  if (d < 14) return `${d} d`;
  if (d < 60) return `${Math.floor(d / 7)} sem`;
  const m = Math.floor(d / 30);
  return m === 1 ? "1 mes" : `${m} meses`;
}

/** The account or deal a suggestion points at, read from its link ("/accounts/<id>", "/deals?deal=<id>"). */
export function recordRef(link: string | null): { table: "accounts" | "deals"; id: string } | null {
  const t = linkTarget(link);
  if (!t) return null;
  const acc = /^\/accounts\/([^/]+)$/.exec(t.to);
  if (acc?.[1] && acc[1] !== "assignment") return { table: "accounts", id: acc[1] };
  if (t.to === "/deals" && t.search.deal) return { table: "deals", id: t.search.deal };
  return null;
}

const AREA: Record<string, string> = {
  accounts: "Cuentas",
  deals: "Pipeline",
  leads: "Leads",
  strategy: "Estrategia",
  metrics: "Métricas",
  onboarding: "Onboarding",
  products: "Productos",
  abm: "ABM",
};
/** Where a suggestion lives when there is no named record: the strategy element or the screen of its link. */
export function areaLabel(s: Pick<S, "link" | "strategy">): string | null {
  const m = parseStrategy(s.strategy);
  if (m) return strategyHeading(m);
  const seg = linkTarget(s.link)?.to.split("/")[1];
  return (seg && AREA[seg]) || null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Account name per suggestion id (a deal shows its account, else its own name). One read per table, member RLS. */
function useRecordNames(items: S[]) {
  const refs = items
    .map((s) => ({ s: s.id, r: recordRef(s.link) }))
    .filter((x): x is { s: string; r: NonNullable<ReturnType<typeof recordRef>> } =>
      Boolean(x.r && UUID.test(x.r.id)),
    );
  const accIds = [...new Set(refs.filter((x) => x.r.table === "accounts").map((x) => x.r.id))];
  const dealIds = [...new Set(refs.filter((x) => x.r.table === "deals").map((x) => x.r.id))];
  const { data } = useQuery({
    queryKey: ["suggestion-records", accIds.sort().join(","), dealIds.sort().join(",")],
    enabled: refs.length > 0,
    staleTime: 60_000,
    queryFn: async () => {
      const names = new Map<string, string>();
      const [acc, deals] = await Promise.all([
        accIds.length
          ? supabase.from("accounts").select("id,name").in("id", accIds)
          : Promise.resolve({ data: [] as { id: string; name: string }[] }),
        dealIds.length
          ? supabase.from("deals").select("id,name,accounts(name)").in("id", dealIds)
          : Promise.resolve({ data: [] as { id: string; name: string; accounts: null }[] }),
      ]);
      for (const a of acc.data ?? []) names.set(`accounts:${a.id}`, a.name);
      for (const d of (deals.data ?? []) as {
        id: string;
        name: string;
        accounts: { name: string } | null;
      }[])
        names.set(`deals:${d.id}`, d.accounts?.name || d.name);
      return names;
    },
  });
  return (s: S) => {
    const r = recordRef(s.link);
    return (r && data?.get(`${r.table}:${r.id}`)) || areaLabel(s);
  };
}

function Kbd({ children }: { children: string }) {
  return (
    <kbd className="ml-2 hidden rounded border border-current/30 px-1 font-mono text-xs leading-4 opacity-70 md:inline">
      {children}
    </kbd>
  );
}

/** Sugerencias as a decision inbox: list + detail with Enter / E / H from md up, the swipe deck below md. */
export function SuggestionInbox({ items }: { items: S[] }) {
  const mobile = useIsMobile();
  const list = limitStrategy(items, new Date()); // CA-7, same cap as the deck
  return (
    <>
      <div className="md:hidden">
        <SuggestionDeck items={list} keyboard={mobile} done={null} />
      </div>
      <div className="hidden md:block">
        <MasterDetail items={list} keys={!mobile} />
      </div>
    </>
  );
}

function MasterDetail({ items, keys }: { items: S[]; keys: boolean }) {
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const lastIndex = useRef(0);
  const nameOf = useRecordNames(items);
  const visible = items.filter((s) => !hidden.has(s.id));
  let index = visible.findIndex((s) => s.id === selectedId);
  if (index < 0) index = Math.min(lastIndex.current, visible.length - 1);
  lastIndex.current = Math.max(0, index);
  const current = visible[index];
  const rows = useRef<Record<string, HTMLButtonElement | null>>({});
  function select(i: number) {
    const s = visible[Math.max(0, Math.min(visible.length - 1, i))];
    if (!s) return;
    setSelectedId(s.id);
    rows.current[s.id]?.scrollIntoView?.({ block: "nearest" });
  }
  if (!current) return null;
  return (
    <div className="grid grid-cols-[minmax(0,20rem)_minmax(0,1fr)] overflow-hidden rounded-lg border bg-card lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
      <div
        role="listbox"
        aria-label="Sugerencias pendientes"
        className="max-h-[calc(100vh-15rem)] min-h-80 overflow-y-auto border-r"
      >
        {visible.map((s, i) => {
          const where = nameOf(s);
          const on = s.id === current.id;
          return (
            <button
              key={s.id}
              ref={(el) => {
                rows.current[s.id] = el;
              }}
              type="button"
              role="option"
              aria-selected={on}
              onClick={() => select(i)}
              className={`flex w-full items-start gap-3 border-b px-4 py-3 text-left last:border-b-0 ${on ? "bg-paper-sunk" : "hover:bg-paper-sunk/60"}`}
            >
              <span
                aria-hidden
                className={`mt-1.5 size-2 shrink-0 rounded-full ${PRIORITY_DOT[s.priority] ?? PRIORITY_DOT[3]}`}
              />
              <span className="min-w-0 flex-1">
                <span className="sr-only">{PRIO[s.priority]}: </span>
                <span className="block truncate text-sm font-medium">{s.title}</span>
                <span className="mt-0.5 flex gap-2 text-xs text-ink-mid">
                  {where && <span className="min-w-0 truncate">{where}</span>}
                  <span
                    className="ml-auto shrink-0"
                    title={new Date(s.created_at).toLocaleString("es")}
                  >
                    {ageLabel(s.created_at)}
                  </span>
                </span>
              </span>
            </button>
          );
        })}
      </div>
      <SuggestionDetail
        key={current.id}
        s={current}
        where={nameOf(current)}
        keys={keys}
        onMove={(d) => select(index + d)}
        onDecided={(id, ok) =>
          setHidden((h) => {
            const n = new Set(h);
            if (ok) n.add(id);
            else n.delete(id);
            return n;
          })
        }
      />
    </div>
  );
}

function SuggestionDetail({
  s,
  where,
  keys,
  onMove,
  onDecided,
}: {
  s: S;
  where: string | null;
  keys: boolean;
  onMove: (delta: number) => void;
  /** ok=true hides the row right away; ok=false brings it back after a failed decision. */
  onDecided: (id: string, ok: boolean) => void;
}) {
  const decide = useServerFn(decideSuggestion);
  const qc = useQueryClient();
  const resolve = useResolve();
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState("");
  const [form, setForm] = useState(false);
  const strategy = parseStrategy(s.strategy);
  const kind = executeKind(s);
  const hasAction = !!actionTool(s.action);
  const target = linkTarget(s.link);
  const primary = kind
    ? "Abrir y completar"
    : strategy
      ? "Aceptar"
      : hasAction
        ? "Aprobar y hacer"
        : "Marcar como hecha";

  async function act(decision: "approve" | "snooze" | "dismiss") {
    if (busy) return;
    setBusy(true);
    onDecided(s.id, true);
    try {
      const r = await decide({
        data: {
          id: s.id,
          decision,
          ...(strategy && reason.trim() ? { reason: reason.trim() } : {}),
        },
      });
      toast.success(r.message);
      qc.invalidateQueries({ queryKey: ["suggestions"] });
      if (decision === "approve") invalidateSetup(qc); // «Aprobar y hacer» may add an account
    } catch (e) {
      onDecided(s.id, false);
      toast.error(errorText(e));
      setBusy(false);
    }
  }
  const doPrimary = () => (kind ? setForm(true) : act("approve"));

  useEffect(() => {
    if (!keys) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || form || busy) return;
      const t = e.target instanceof HTMLElement ? e.target : null;
      if (t && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName))) return;
      if (document.querySelector('[role="dialog"],[role="alertdialog"]')) return;
      const k = e.key.toLowerCase();
      if (e.key === "Enter") {
        // A focused button or link already answers Enter itself.
        if (t && t.closest("button,a,summary")) return;
        e.preventDefault();
        doPrimary();
      } else if (k === "e") {
        e.preventDefault();
        void act("dismiss");
      } else if (k === "h") {
        e.preventDefault();
        void act("snooze");
      } else if (e.key === "ArrowDown" || k === "j") {
        e.preventDefault();
        onMove(1);
      } else if (e.key === "ArrowUp" || k === "k") {
        e.preventDefault();
        onMove(-1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <section
      aria-label="Detalle de la sugerencia"
      className="max-h-[calc(100vh-15rem)] min-w-0 overflow-y-auto p-6 lg:p-8"
    >
      <p className={`eyebrow ${s.priority === 1 ? "text-state-alarm" : ""}`}>
        {PRIO[s.priority]}
        {where ? ` · ${where}` : ""}
        {hasAction && !strategy ? " · Nokko lo hace por ti" : ""}
      </p>
      <h2 className="mt-2 break-words font-display text-2xl leading-tight">{s.title}</h2>
      <div className="mt-6 rounded-lg bg-paper-sunk/60 p-4">
        <h3 className="text-sm font-medium">Por qué ahora</h3>
        {s.body ? (
          <p className="mt-1 whitespace-pre-line break-words text-sm text-ink-mid">{s.body}</p>
        ) : (
          !strategy && (
            <p className="mt-1 text-sm text-ink-mid">
              El motor lo detectó{" "}
              {ageLabel(s.created_at) === "ahora"
                ? "hace un momento"
                : `hace ${ageLabel(s.created_at)}`}
              .
            </p>
          )
        )}
        {strategy && (
          <>
            <StrategyBadge m={strategy} />
            <StrategyEvidence m={strategy} defaultOpen />
          </>
        )}
        {target && (
          <Link
            to={target.to}
            search={target.search}
            className="mt-3 inline-block text-sm underline underline-offset-4 hover:text-foreground"
          >
            Abrir el registro
          </Link>
        )}
      </div>
      {strategy && (
        <Input
          className="mt-4"
          maxLength={500}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Motivo (opcional)"
          aria-label="Motivo de tu decisión (opcional)"
        />
      )}
      <div className="mt-5 flex flex-wrap gap-2">
        <Button disabled={busy} onClick={doPrimary} aria-keyshortcuts="Enter">
          {primary}
          <Kbd>↵</Kbd>
        </Button>
        <Button
          variant="outline"
          disabled={busy}
          onClick={() => act("snooze")}
          aria-keyshortcuts="H"
        >
          Más tarde
          <Kbd>H</Kbd>
        </Button>
        <Button
          variant="ghost"
          disabled={busy}
          onClick={() => act("dismiss")}
          aria-keyshortcuts="E"
        >
          Descartar
          <Kbd>E</Kbd>
        </Button>
        <Button variant="outline" disabled={busy} onClick={() => resolve(s)}>
          Resolver con el agente
        </Button>
      </div>
      {kind && form && <ExecuteDialog s={s} open={form} onOpenChange={setForm} reason={reason} />}
    </section>
  );
}
