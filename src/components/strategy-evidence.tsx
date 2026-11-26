// What a strategic suggestion rests on and how far to trust it (SDD-20261027 strategic-suggestions-engine, F0 · H-1):
// level in words with its visible rule, sample size, and the source records with a link each. No icons, «tú».
import { Link } from "@tanstack/react-router";
import { linkTarget } from "@/lib/proactive/resolve";
import {
  ACTION_LABEL,
  EVIDENCE_LEVEL_RULE,
  levelLabel,
  sampleLabel,
  type StrategyMeta,
} from "@/lib/strategy-suggestions";

export function StrategyBadge({ m }: { m: StrategyMeta }) {
  return (
    <p className="mt-2 text-xs text-muted-foreground" title={EVIDENCE_LEVEL_RULE}>
      Evidencia: <span className="font-medium text-foreground">{levelLabel(m.evidence_level)}</span>{" "}
      · {sampleLabel(m.sample_size)} · {ACTION_LABEL[m.action_type]}
    </p>
  );
}

/** `defaultOpen`: the evidence is already unfolded (the inbox detail shows it under «Por qué ahora»). */
export function StrategyEvidence({ m, defaultOpen }: { m: StrategyMeta; defaultOpen?: boolean }) {
  return (
    <details className="mt-2 text-sm" open={defaultOpen}>
      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
        Ver evidencia
      </summary>
      <p className="mt-2 text-xs text-muted-foreground">{EVIDENCE_LEVEL_RULE}</p>
      {m.evidence.length === 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Todavía no hay registros de tu empresa en los que apoyar esta sugerencia. Completa el dato
          que falta.
        </p>
      ) : (
        <ul className="mt-2 space-y-1">
          {m.evidence.map((e) => {
            const t = linkTarget(e.link);
            return (
              <li key={`${e.table}:${e.id}`} className="break-words">
                {t ? (
                  <Link
                    to={t.to}
                    search={t.search}
                    className="underline underline-offset-4 hover:text-foreground"
                  >
                    {e.label}
                  </Link>
                ) : (
                  e.label
                )}
              </li>
            );
          })}
          {m.sample_size > m.evidence.length && (
            <li className="text-xs text-muted-foreground">
              y {m.sample_size - m.evidence.length} más en la muestra
            </li>
          )}
        </ul>
      )}
    </details>
  );
}
