import { useId, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { StatusLabel } from "@/components/strategy/gtm-gantt";
import {
  AREAS,
  STATUSES,
  STATUS_LABEL,
  criticalImpact,
  taskProgress,
  weekRangeLabel,
  type PlanTask,
  type TaskStatus,
} from "@/lib/gtm-plan";

type Handlers = {
  onStatusChange: (id: string, status: TaskStatus) => void;
  onToggleSubtask: (task: PlanTask, subtaskId: string) => void;
  onSaveNote: (id: string, note: string) => void;
  onOpenTask: (id: string) => void;
};

export function GtmTaskSheet({
  task,
  tasks,
  onClose,
  ...handlers
}: {
  task: PlanTask | null;
  tasks: PlanTask[];
  onClose: () => void;
} & Handlers) {
  return (
    <Sheet open={!!task} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        {/* Keyed by task so the note draft starts fresh for each task. */}
        {task && <TaskDetail key={task.id} task={task} tasks={tasks} {...handlers} />}
      </SheetContent>
    </Sheet>
  );
}

function TaskDetail({
  task,
  tasks,
  onStatusChange,
  onToggleSubtask,
  onSaveNote,
  onOpenTask,
}: { task: PlanTask; tasks: PlanTask[] } & Handlers) {
  const noteId = useId();
  const [note, setNote] = useState(task.note);
  const [saved, setSaved] = useState(false);
  const impact = criticalImpact(tasks, task.id);
  const area = AREAS.find((a) => a.id === task.area);
  const dependsOn = tasks.filter((t) => task.dependsOn.includes(t.id));
  const done = task.subtasks.filter((s) => s.done).length;

  return (
    <div className="space-y-6 text-sm">
      <SheetHeader className="pr-8">
        <p className="eyebrow">{area?.name}</p>
        <SheetTitle className="text-lg leading-6">{task.title}</SheetTitle>
        <SheetDescription className="text-sm text-ink-mid">{task.description}</SheetDescription>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <StatusLabel status={task.status} />
          {impact.critical && <Badge variant="outline">Camino crítico</Badge>}
        </div>
      </SheetHeader>

      <dl className="grid grid-cols-[minmax(0,auto)_minmax(0,1fr)] gap-x-4 gap-y-1.5">
        <dt className="text-ink-faint">Fechas</dt>
        <dd>{weekRangeLabel(task.startWeek, task.endWeek)}</dd>
        <dt className="text-ink-faint">Responsable</dt>
        <dd>{task.owner}</dd>
        <dt className="text-ink-faint">Depende de</dt>
        <dd>
          {dependsOn.length === 0 ? (
            "Nada: puede empezar sola"
          ) : (
            <ul className="space-y-0.5">
              {dependsOn.map((d) => (
                <li key={d.id}>
                  <button
                    type="button"
                    className="cursor-pointer text-left text-accent-text hover:underline"
                    onClick={() => onOpenTask(d.id)}
                  >
                    {d.title}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </dd>
      </dl>

      <div className="space-y-1.5">
        <Label htmlFor={`${noteId}-status`}>Estado</Label>
        <Select value={task.status} onValueChange={(v) => onStatusChange(task.id, v as TaskStatus)}>
          <SelectTrigger id={`${noteId}-status`} className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_LABEL[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {task.subtasks.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="section-title">Subtareas</h3>
            <span className="text-meta">
              {done} de {task.subtasks.length} · {Math.round(taskProgress(task) * 100)} %
            </span>
          </div>
          <ul className="space-y-2">
            {task.subtasks.map((s) => (
              <li key={s.id} className="flex items-start gap-2.5">
                <Checkbox
                  id={`${noteId}-${s.id}`}
                  checked={s.done}
                  onCheckedChange={() => onToggleSubtask(task, s.id)}
                  className="mt-0.5"
                />
                <label htmlFor={`${noteId}-${s.id}`} className="min-w-0 cursor-pointer">
                  <span className={s.done ? "text-ink-faint line-through" : ""}>{s.title}</span>
                  <span className="block text-meta">
                    {s.owner} · {weekRangeLabel(s.startWeek, s.endWeek)}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div
        className={`space-y-1.5 rounded-lg border p-3 ${impact.critical ? "border-ink" : "border-hairline"}`}
      >
        <h3 className="section-title">Impacto en el camino crítico</h3>
        <p
          className={
            task.status === "at_risk" && impact.critical ? "text-state-alarm" : "text-ink-mid"
          }
        >
          {impact.message}
        </p>
        {impact.blocks.length > 0 && (
          <p className="text-meta">Bloquea a: {impact.blocks.map((b) => b.title).join(", ")}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={noteId}>Nota de feedback</Label>
        <Textarea
          id={noteId}
          value={note}
          rows={4}
          placeholder="Qué aprendiste, qué frena esta tarea o qué cambiarías del plan."
          onChange={(e) => {
            setNote(e.target.value);
            setSaved(false);
          }}
        />
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="outline"
            disabled={note.trim() === task.note}
            onClick={() => {
              const value = note.trim();
              onSaveNote(task.id, value);
              setNote(value);
              setSaved(true);
            }}
          >
            Guardar nota
          </Button>
          {saved && (
            <span role="status" className="text-meta">
              Nota guardada en este navegador.
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
