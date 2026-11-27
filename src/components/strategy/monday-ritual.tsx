import { useState } from "react";
import { Check } from "lucide-react";
import { IconText } from "@/components/icon-text";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  VERDICT_LABEL,
  formatPlanDate,
  ritualHeadline,
  type Hypothesis,
  type ProposalAdjustment,
  type ProposalView,
} from "@/lib/gtm-plan";

/**
 * Ritual del Lunes: the week's proposals, read like a calm sales lead would read them. Each one says whether the
 * problem is the bet («Mala hipótesis») or how it was run («Ejecución o momento») before proposing a change.
 */
export function MondayRitual({
  company,
  proposals,
  hypotheses,
  sampleNote,
  onApprove,
  onAdjust,
}: {
  company: string;
  proposals: ProposalView[];
  hypotheses: Hypothesis[];
  sampleNote: string;
  onApprove: (id: string) => void;
  onAdjust: (id: string, adj: ProposalAdjustment) => void;
}) {
  return (
    <section
      aria-labelledby="ritual-title"
      className="rounded-xl border border-hairline-firm bg-card p-5 md:p-6"
    >
      <p className="eyebrow">Ritual del lunes · {company}</p>
      <h2 id="ritual-title" className="mt-1 font-display text-xl font-semibold text-balance">
        {ritualHeadline(proposals)}
      </h2>
      <p className="text-meta mt-1">{sampleNote}</p>
      <ul className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {proposals.map((p) => (
          <ProposalCard
            key={p.id}
            proposal={p}
            hypothesis={hypotheses.find((h) => h.id === p.target)}
            onApprove={() => onApprove(p.id)}
            onAdjust={(adj) => onAdjust(p.id, adj)}
          />
        ))}
      </ul>
    </section>
  );
}

function ProposalCard({
  proposal: p,
  hypothesis,
  onApprove,
  onAdjust,
}: {
  proposal: ProposalView;
  hypothesis: Hypothesis | undefined;
  onApprove: () => void;
  onAdjust: (adj: ProposalAdjustment) => void;
}) {
  const [editing, setEditing] = useState(false);
  const titleId = `proposal-${p.id}`;
  return (
    <li
      aria-labelledby={titleId}
      className={`min-w-0 rounded-lg border p-4 ${p.executed ? "border-hairline bg-paper-sunk" : "border-hairline bg-card"}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={p.verdict === "hypothesis" ? "outline" : "secondary"}>
          {VERDICT_LABEL[p.verdict]}
        </Badge>
        {hypothesis && (
          <span className="text-meta">
            Hipótesis {hypothesis.label} · Tier {hypothesis.tier}
          </span>
        )}
      </div>
      <h3 id={titleId} className="mt-2 text-sm font-semibold">
        {p.title}
      </h3>
      <p className="mt-1.5 text-sm text-ink-mid">{p.reading}</p>
      <p className="mt-2 text-sm">
        <span className="font-medium">{p.executed ? "Cambio aplicado: " : "Propongo: "}</span>
        {p.change}
      </p>

      {p.executed ? (
        <p className="mt-3 text-xs font-medium text-state-ok">
          Ejecutada el {formatPlanDate(p.executed.date)} · guardada en Decisiones
        </p>
      ) : editing ? (
        <AdjustForm
          proposal={p}
          label={hypothesis?.label ?? ""}
          onCancel={() => setEditing(false)}
          onSave={(adj) => {
            onAdjust(adj);
            setEditing(false);
          }}
        />
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" onClick={onApprove} aria-describedby={titleId}>
            <IconText icon={Check}>Aprobar</IconText>
          </Button>
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
            Ajustar
          </Button>
        </div>
      )}
    </li>
  );
}

function AdjustForm({
  proposal: p,
  label,
  onCancel,
  onSave,
}: {
  proposal: ProposalView;
  label: string;
  onCancel: () => void;
  onSave: (adj: ProposalAdjustment) => void;
}) {
  const [offer, setOffer] = useState(p.offer);
  const [focus, setFocus] = useState(p.focus == null ? "" : String(p.focus));
  const focusNum = Number(focus);
  const focusOk = p.focus == null || (/^\d{1,3}$/.test(focus) && focusNum <= 100);
  const valid = offer.trim() !== "" && focusOk;
  return (
    <form
      className="mt-3 grid grid-cols-1 gap-3 rounded-md border border-hairline p-3 sm:grid-cols-[minmax(0,1fr)_120px]"
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        onSave(p.focus == null ? { offer } : { offer, focus: focusNum });
      }}
    >
      <div className={`min-w-0 space-y-1 ${p.focus == null ? "sm:col-span-2" : ""}`}>
        <Label htmlFor={`${p.id}-offer`}>Nueva oferta</Label>
        <Input id={`${p.id}-offer`} value={offer} onChange={(e) => setOffer(e.target.value)} />
      </div>
      {p.focus != null && (
        <div className="min-w-0 space-y-1">
          <Label htmlFor={`${p.id}-focus`}>Foco en {label} (%)</Label>
          <Input
            id={`${p.id}-focus`}
            inputMode="numeric"
            value={focus}
            onChange={(e) => setFocus(e.target.value)}
          />
        </div>
      )}
      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit" size="sm" disabled={!valid}>
          Guardar ajuste
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
