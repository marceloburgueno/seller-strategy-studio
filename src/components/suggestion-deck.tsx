import { useRef, useState, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { invalidateSetup } from "@/hooks/setup-invalidation";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { SwipeDeck } from "@/components/swipe-deck";
import { Input } from "@/components/ui/input";
import { useSuggestions } from "@/components/suggestions";
import { useAgent } from "@/components/agent";
import { decideSuggestion } from "@/lib/agent.functions";
import { linkTarget, resolvePlan } from "@/lib/proactive/resolve";
import { actionTool } from "@/lib/json";
import { errorText } from "@/lib/errors";
import { limitStrategy, parseStrategy, strategyHeading } from "@/lib/strategy-suggestions";
import { ExecuteDialog, executeKind } from "@/components/strategy-execute";
import { StrategyBadge, StrategyEvidence } from "@/components/strategy-evidence";
import { causalChain, signalLine, tierLabel, type CausalChain } from "@/lib/daily-queue";

type S = NonNullable<ReturnType<typeof useSuggestions>["data"]>[number];
const PRIO: Record<number, string> = { 1: "Urgente", 2: "Importante", 3: "Cuando puedas" };
const DECISION = { right: "approve", left: "dismiss", up: "snooze" } as const;

/** Sugerencias as a swipe deck: → hacer, ← descartar, ↑ en 3 días. */
export function SuggestionDeck({
  items,
  keyboard = true,
  done,
}: {
  items: S[];
  keyboard?: boolean;
  /** What shows under «Todo decidido»; defaults to a link to the inbox, `null` shows nothing. */
  done?: ReactNode;
}) {
  const decide = useServerFn(decideSuggestion);
  const qc = useQueryClient();
  // Optional reason typed on a strategic card; read when the swipe commits (after the undo window).
  const reasons = useRef<Record<string, string>>({});
  // CA-35/36: an experiment or a task opens its form first («Abrir y completar»); the card stays until it is saved.
  const [completing, setCompleting] = useState<S | null>(null);
  return (
    <>
      <SwipeDeck
        items={limitStrategy(items, new Date())} // CA-7: at most 7 open strategic suggestions
        keyboard={keyboard}
        wordButtons={(s) => !!parseStrategy(s.strategy)}
        labels={(s) =>
          executeKind(s)
            ? { right: "Abrir y completar", left: "Descartar", up: "Más tarde" }
            : parseStrategy(s.strategy)
              ? { right: "Aceptar", left: "Descartar", up: "Más tarde" }
              : { right: "Hacer", left: "Descartar", up: "Más tarde" }
        }
        intercept={(s, dir) => {
          if (dir !== "right" || !executeKind(s)) return false;
          setCompleting(s);
          return true;
        }}
        render={(s) => <DeckFace s={s} onReason={(v) => (reasons.current[s.id] = v)} />}
        onCommit={async (s, dir) => {
          try {
            const reason = parseStrategy(s.strategy) ? reasons.current[s.id]?.trim() : undefined;
            const r = await decide({
              data: { id: s.id, decision: DECISION[dir], ...(reason ? { reason } : {}) },
            });
            if (dir === "right") toast.success(r.message);
            qc.invalidateQueries({ queryKey: ["suggestions"] });
            invalidateSetup(qc); // «Hacer» on create_account runs on the server and adds an account
          } catch (e) {
            toast.error(errorText(e));
            throw e;
          }
        }}
        done={
          done === undefined ? (
            <p className="mt-4 text-sm">
              <Link to="/inbox" className="underline underline-offset-4">
                Ver todas las sugerencias
              </Link>
            </p>
          ) : (
            done
          )
        }
      />
      {completing && (
        <ExecuteDialog
          key={completing.id}
          s={completing}
          open
          onOpenChange={(o) => !o && setCompleting(null)}
          reason={reasons.current[completing.id]}
        />
      )}
    </>
  );
}

function DeckFace({ s, onReason }: { s: S; onReason: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const { open: openAgent } = useAgent();
  const navigate = useNavigate();
  const hasAction = !!actionTool(s.action);
  const strategy = parseStrategy(s.strategy);
  const causal = causalChain(s);
  function resolve() {
    const plan = resolvePlan(s);
    openAgent({
      prompt: plan.prompt,
      fresh: true,
      docked: true,
      side: plan.side,
      mode: "chat",
      personaId: null,
      workflowId: null,
    });
    const to = linkTarget(plan.to);
    if (to) navigate({ to: to.to, search: to.search });
  }
  const stop = (e: React.PointerEvent) => e.stopPropagation();
  return (
    <div className="p-6">
      <p className={`eyebrow ${s.priority === 1 ? "text-state-alarm" : ""}`}>
        {PRIO[s.priority]}
        {hasAction ? " · Nokko lo hace por ti" : ""}
        {strategy ? ` · ${strategyHeading(strategy)}` : ""}
      </p>
      <CausalBadges c={causal} className="mt-2" />
      <h3 className="mt-2 break-words font-display text-2xl leading-tight">{s.title}</h3>
      {causal && signalLine(causal) && (
        <p className="mt-2 break-words text-xs text-ink-mid">Señal: {signalLine(causal)}</p>
      )}
      {s.body && (
        <p
          className={`mt-3 whitespace-pre-line break-words text-sm text-ink-mid ${open ? "max-h-64 overflow-y-auto" : "line-clamp-3"}`}
        >
          {s.body}
        </p>
      )}
      {strategy && (
        <>
          <StrategyBadge m={strategy} />
          <div onPointerDown={stop}>
            <StrategyEvidence m={strategy} />
            <Input
              className="mt-3"
              maxLength={500}
              defaultValue=""
              onChange={(e) => onReason(e.target.value)}
              placeholder="Motivo (opcional)"
              aria-label="Motivo de tu decisión (opcional)"
            />
          </div>
        </>
      )}
      <div className="mt-5 flex flex-wrap gap-3 text-sm" onPointerDown={stop}>
        {s.body && s.body.length > 140 && (
          <button
            type="button"
            className="text-ink-mid underline underline-offset-4 hover:text-ink"
            onClick={() => setOpen((o) => !o)}
          >
            {open ? "Ver menos" : "Ver detalle"}
          </button>
        )}
        <button
          type="button"
          className="text-ink-mid underline underline-offset-4 hover:text-ink"
          onClick={resolve}
        >
          Resolver con el agente
        </button>
      </div>
    </div>
  );
}

/** V2 causal chain, discreet: the tier badge and the hypothesis this action validates. Nothing when absent. */
export function CausalBadges({ c, className = "" }: { c: CausalChain | null; className?: string }) {
  if (!c || (!c.tier && !c.hypothesis)) return null;
  return (
    <div className={`flex min-w-0 flex-wrap items-center gap-2 text-xs ${className}`}>
      {c.tier && (
        <span className="shrink-0 rounded-full border border-hairline px-2 py-0.5 font-medium text-ink">
          {tierLabel(c.tier)}
        </span>
      )}
      {c.hypothesis && (
        <span className="min-w-0 break-words text-ink-mid">
          <span className="font-medium text-ink">Hipótesis:</span> {c.hypothesis}
        </span>
      )}
    </div>
  );
}
