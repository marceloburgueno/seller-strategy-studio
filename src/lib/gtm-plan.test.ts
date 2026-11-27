import { describe, expect, it } from "vitest";
import {
  EMPTY_LOCAL_STATE,
  EXAMPLE_PLAN,
  NO_FILTERS,
  PLAN_WEEKS,
  addDecision,
  adjustProposal,
  applyLocalState,
  approveProposal,
  goalToTest,
  hasResettableChanges,
  liveHypotheses,
  proposalViews,
  resetLocalState,
  ritualHeadline,
  sampleNote,
  setGoal,
  shiftFocus,
  barGeometry,
  criticalDependencies,
  criticalImpact,
  criticalPath,
  filterTasks,
  formatPlanDate,
  kpiProgress,
  parseLocalState,
  planHeadline,
  setTaskOverride,
  slackWeeks,
  taskProgress,
  toggleSubtask,
  weekMonth,
  weekRangeLabel,
  type PlanTask,
} from "./gtm-plan";

const tasks = EXAMPLE_PLAN.tasks;
const task = (id: string) => tasks.find((t) => t.id === id)!;

describe("example plan", () => {
  it("is internally consistent: dependencies exist, weeks fit the year, subtasks fit their task", () => {
    const ids = new Set(tasks.map((t) => t.id));
    for (const t of tasks) {
      for (const d of t.dependsOn) expect(ids.has(d), `${t.id} → ${d}`).toBe(true);
      expect(t.startWeek).toBeGreaterThanOrEqual(1);
      expect(t.endWeek).toBeLessThanOrEqual(PLAN_WEEKS);
      expect(t.startWeek).toBeLessThanOrEqual(t.endWeek);
      for (const s of t.subtasks) {
        expect(s.startWeek, s.id).toBeGreaterThanOrEqual(t.startWeek);
        expect(s.endWeek, s.id).toBeLessThanOrEqual(t.endWeek);
      }
    }
    expect(new Set(tasks.map((t) => t.area)).size).toBe(4);
    expect(EXAMPLE_PLAN.objectives).toHaveLength(3);
  });
});

describe("critical path", () => {
  it("walks back from the last task through the driving dependency", () => {
    expect([...criticalPath(tasks)].sort()).toEqual(
      ["t-fintech", "t-fintech-deals", "t-icp", "t-msg", "t-plan-2027"].sort(),
    );
  });
  it("marks non-critical tasks that feed a critical one as dependencies", () => {
    const c = criticalPath(tasks);
    expect([...criticalDependencies(tasks, c)].sort()).toEqual(["t-trial", "t-winloss"]);
  });
  it("follows ties into every driving branch and handles an empty plan", () => {
    const mk = (id: string, s: number, e: number, deps: string[] = []): PlanTask => ({
      ...tasks[0],
      id,
      startWeek: s,
      endWeek: e,
      dependsOn: deps,
    });
    const tie = [mk("a", 1, 5), mk("b", 1, 5), mk("c", 6, 10, ["a", "b"])];
    expect([...criticalPath(tie)].sort()).toEqual(["a", "b", "c"]);
    expect(criticalPath([]).size).toBe(0);
  });
  it("gives slack to the rest and explains the impact", () => {
    expect(slackWeeks(tasks, "t-fintech")).toBe(0);
    // Battlecards end in week 28 and nothing depends on them: margin until the plan ends (52).
    expect(slackWeeks(tasks, "t-battle")).toBe(24);
    const critical = criticalImpact(tasks, "t-fintech-deals");
    expect(critical.critical).toBe(true);
    expect(critical.message).toMatch(/camino crítico y en riesgo/);
    expect(critical.blocks.map((b) => b.id)).toEqual(["t-plan-2027"]);
    const loose = criticalImpact(tasks, "t-battle");
    expect(loose.critical).toBe(false);
    expect(loose.message).toBe("Tiene 24 semanas de margen antes de afectar a otras tareas.");
  });
});

describe("filters", () => {
  it("filters by area, status and critical path (with its dependencies)", () => {
    expect(filterTasks(tasks, NO_FILTERS)).toHaveLength(tasks.length);
    expect(
      filterTasks(tasks, { ...NO_FILTERS, area: "demand" }).every((t) => t.area === "demand"),
    ).toBe(true);
    expect(filterTasks(tasks, { ...NO_FILTERS, status: "at_risk" }).map((t) => t.id)).toEqual([
      "t-fintech",
      "t-fintech-deals",
    ]);
    expect(filterTasks(tasks, { ...NO_FILTERS, criticalOnly: true })).toHaveLength(7);
    expect(
      filterTasks(tasks, { area: "feedback", status: "pending", criticalOnly: true }).map(
        (t) => t.id,
      ),
    ).toEqual(["t-plan-2027"]);
  });
});

describe("weeks", () => {
  it("maps weeks to months and bars to percentages of the year", () => {
    expect(weekMonth(1)).toBe(0);
    expect(weekMonth(52)).toBe(11);
    expect(weekRangeLabel(1, 6)).toBe("Sem. 1–6 · Ene–Feb");
    expect(weekRangeLabel(1, 3)).toBe("Sem. 1–3 · Ene");
    expect(barGeometry(1, 52)).toEqual({ left: 0, width: 100 });
    expect(barGeometry(27, 26)).toEqual({ left: 50, width: (1 / 52) * 100 });
  });
});

describe("summary", () => {
  it("respects the good direction of each KPI", () => {
    const cac = EXAMPLE_PLAN.kpis.find((k) => k.id === "cac")!;
    expect(kpiProgress(cac).onTrack).toBe(true); // 6500/7200 ≈ 0.90
    expect(kpiProgress({ ...cac, actual: 9000 }).onTrack).toBe(false);
    const demos = EXAMPLE_PLAN.kpis.find((k) => k.id === "demos")!;
    expect(kpiProgress(demos).ratio).toBeGreaterThan(1);
    expect(kpiProgress({ ...demos, actual: 0 }).onTrack).toBe(false);
  });
  it("concludes from the data", () => {
    expect(planHeadline(tasks)).toBe("2 tareas del camino crítico están en riesgo");
    const calm = tasks.map((t) =>
      t.status === "at_risk" ? { ...t, status: "in_progress" as const } : t,
    );
    expect(planHeadline(calm)).toMatch(/^\d+ de 13 tareas hechas; el camino crítico va en plazo$/);
  });
  it("measures progress by subtasks unless the task is done", () => {
    expect(taskProgress(task("t-icp"))).toBe(1);
    expect(taskProgress(task("t-fintech"))).toBeCloseTo(1 / 3);
  });
  it("formats ISO dates without timezone drift", () => {
    expect(formatPlanDate("2026-01-20")).toBe("20 ene 2026");
  });
});

describe("local state", () => {
  it("applies status, note and subtasks on top of the plan", () => {
    let s = setTaskOverride(EMPTY_LOCAL_STATE, "t-fintech", {
      status: "in_progress",
      note: "Hay sponsor",
    });
    s = toggleSubtask(s, task("t-fintech"), "s-fin-2");
    const t = applyLocalState(EXAMPLE_PLAN, s).tasks.find((x) => x.id === "t-fintech")!;
    expect(t.status).toBe("in_progress");
    expect(t.note).toBe("Hay sponsor");
    expect(t.subtasks.map((x) => x.done)).toEqual([true, true, false]);
    // Toggling again unchecks it, starting from what the person sees.
    const again = toggleSubtask(s, t, "s-fin-2");
    expect(again.tasks["t-fintech"].doneSubtasks).toEqual(["s-fin-1"]);
    expect(again.tasks["t-fintech"].status).toBe("in_progress");
  });
  it("adds valid decisions first and rejects incomplete ones", () => {
    const s = addDecision(
      EMPTY_LOCAL_STATE,
      { title: " Precio anual ", validatedBy: "Owner", date: "2026-11-26" },
      "x",
    );
    expect(applyLocalState(EXAMPLE_PLAN, s).decisions[0]).toEqual({
      id: "x",
      title: "Precio anual",
      validatedBy: "Owner",
      date: "2026-11-26",
    });
    expect(
      addDecision(EMPTY_LOCAL_STATE, { title: " ", validatedBy: "Owner", date: "2026-11-26" }, "y"),
    ).toBe(EMPTY_LOCAL_STATE);
    expect(
      addDecision(EMPTY_LOCAL_STATE, { title: "A", validatedBy: "Owner", date: "26/11" }, "y"),
    ).toBe(EMPTY_LOCAL_STATE);
  });
  it("round-trips through storage and drops malformed data", () => {
    const s = setTaskOverride(EMPTY_LOCAL_STATE, "t-icp", {
      status: "at_risk",
      doneSubtasks: ["s-icp-1"],
    });
    expect(parseLocalState(JSON.stringify(s))).toEqual(s);
    expect(parseLocalState(null)).toEqual(EMPTY_LOCAL_STATE);
    expect(parseLocalState("{nope")).toEqual(EMPTY_LOCAL_STATE);
    expect(
      parseLocalState(
        JSON.stringify({
          tasks: { a: { status: "bogus", note: 3, doneSubtasks: ["x", 1] }, b: null },
          decisions: [{ id: "1", title: "t", date: "2026-01-01", validatedBy: "AE" }, { id: 2 }],
        }),
      ),
    ).toEqual({
      tasks: { a: { doneSubtasks: ["x"] } },
      decisions: [{ id: "1", title: "t", date: "2026-01-01", validatedBy: "AE" }],
      adjustments: {},
      goal: null,
    });
  });
});

describe("hypotheses", () => {
  it("are consistent: focus adds up to 100 and linked tasks exist", () => {
    const hs = EXAMPLE_PLAN.hypotheses;
    expect(hs).toHaveLength(3);
    expect(hs.reduce((n, h) => n + h.focus, 0)).toBe(100);
    const ids = new Set(tasks.map((t) => t.id));
    for (const h of hs) for (const t of h.taskIds) expect(ids.has(t), `${h.id} → ${t}`).toBe(true);
    for (const p of EXAMPLE_PLAN.proposals) expect(hs.some((h) => h.id === p.target)).toBe(true);
  });

  it("shiftFocus gives the target its share and spreads the rest in proportion, total 100", () => {
    const out = shiftFocus(EXAMPLE_PLAN.hypotheses, "h-b", 70);
    expect(out.map((h) => [h.id, h.focus])).toEqual([
      ["h-a", 20],
      ["h-b", 70],
      ["h-c", 10],
    ]);
    const odd = shiftFocus(EXAMPLE_PLAN.hypotheses, "h-a", 33);
    expect(odd.reduce((n, h) => n + h.focus, 0)).toBe(100);
    expect(shiftFocus(EXAMPLE_PLAN.hypotheses, "nope", 70)).toBe(EXAMPLE_PLAN.hypotheses);
  });
});

describe("Ritual del Lunes", () => {
  it("starts with two pending proposals that tell bad hypothesis from bad execution", () => {
    const ps = proposalViews(EXAMPLE_PLAN, EMPTY_LOCAL_STATE);
    expect(ps.map((p) => p.verdict)).toEqual(["hypothesis", "execution"]);
    expect(ps.every((p) => p.executed === null)).toBe(true);
    expect(ps[0].change).toBe(
      "Mover el 70 % del foco a B y cambiar la oferta a «Diagnóstico rápido de 10 min».",
    );
    expect(ps[1].change).toMatch(/^Mantener el foco en C y cambiar la oferta a «.+»; enviar/);
    expect(ritualHeadline(ps)).toBe("2 propuestas para esta semana, con la evidencia delante");
  });

  it("approving writes one decision with date, evidence and change, and applies it to the board", () => {
    const s = approveProposal(EXAMPLE_PLAN, EMPTY_LOCAL_STATE, "p-focus-b", "2026-11-30");
    expect(s.decisions).toEqual([
      {
        id: "ritual-p-focus-b",
        title: "Mover el foco de A a B",
        date: "2026-11-30",
        validatedBy: "Owner",
        evidence: EXAMPLE_PLAN.proposals[0].evidence,
        change: "Mover el 70 % del foco a B y cambiar la oferta a «Diagnóstico rápido de 10 min».",
        proposalId: "p-focus-b",
        applied: { target: "h-b", focus: 70, offer: "Diagnóstico rápido de 10 min" },
      },
    ]);
    // Idempotent: approving again does not write twice.
    expect(approveProposal(EXAMPLE_PLAN, s, "p-focus-b", "2026-12-01")).toBe(s);
    const b = liveHypotheses(EXAMPLE_PLAN, s).find((h) => h.id === "h-b")!;
    expect(b).toMatchObject({ focus: 70, offer: "Diagnóstico rápido de 10 min" });
    expect(ritualHeadline(proposalViews(EXAMPLE_PLAN, s))).toBe(
      "Queda una propuesta por decidir esta semana",
    );
  });

  it("«Ajustar» changes what approval applies; invalid adjustments are ignored", () => {
    let s = adjustProposal(EMPTY_LOCAL_STATE, "p-focus-b", {
      focus: 60,
      offer: "Auditoría exprés",
    });
    expect(adjustProposal(s, "p-focus-b", { offer: "  " })).toBe(s);
    expect(adjustProposal(s, "p-focus-b", { focus: 140 })).toBe(s);
    expect(proposalViews(EXAMPLE_PLAN, s)[0].change).toBe(
      "Mover el 60 % del foco a B y cambiar la oferta a «Auditoría exprés».",
    );
    s = approveProposal(EXAMPLE_PLAN, s, "p-focus-b", "2026-11-30");
    expect(s.adjustments).toEqual({});
    expect(liveHypotheses(EXAMPLE_PLAN, s).map((h) => h.focus)).toEqual([27, 60, 13]);
  });

  it("the commercial memory survives storage and «Restablecer ejemplo»", () => {
    let s = approveProposal(EXAMPLE_PLAN, EMPTY_LOCAL_STATE, "p-fix-c", "2026-11-30");
    s = setGoal(setTaskOverride(s, "t-icp", { status: "at_risk" }), 12);
    const back = parseLocalState(JSON.stringify(s));
    expect(back).toEqual(s);
    expect(hasResettableChanges(back)).toBe(true);
    const reset = resetLocalState(back);
    expect(reset.decisions).toEqual(s.decisions);
    expect(reset.goal).toBeNull();
    expect(hasResettableChanges(reset)).toBe(false);
    expect(proposalViews(EXAMPLE_PLAN, reset)[1].executed?.date).toBe("2026-11-30");
  });

  it("flags a small sample", () => {
    expect(sampleNote(EXAMPLE_PLAN.hypotheses, EXAMPLE_PLAN.pace)).toBe(
      "Muestra pequeña: 93 toques en 3 semanas. Lo leo como una señal, no como una sentencia.",
    );
  });
});

describe("Goal-to-Test", () => {
  it("works the monthly goal back into weekly tests and warns when the pace falls short", () => {
    const r = goalToTest(8, EXAMPLE_PLAN.hypotheses, EXAMPLE_PLAN.pace);
    expect(r).toMatchObject({
      testsPerWeekNow: 31,
      testsPerWeekNeeded: 62,
      projectedMeetings: 4,
      onPace: false,
    });
    expect(r.message).toMatch(/necesitas 62 pruebas por semana y hoy haces 31/);
    expect(goalToTest(4, EXAMPLE_PLAN.hypotheses, EXAMPLE_PLAN.pace).onPace).toBe(true);
  });

  it("does not invent a number without meetings, and rejects invalid goals", () => {
    const none = EXAMPLE_PLAN.hypotheses.map((h) => ({ ...h, meetings: 0 }));
    expect(goalToTest(8, none, EXAMPLE_PLAN.pace).testsPerWeekNeeded).toBeNull();
    expect(setGoal(EMPTY_LOCAL_STATE, 0)).toBe(EMPTY_LOCAL_STATE);
    expect(setGoal(EMPTY_LOCAL_STATE, 2.5)).toBe(EMPTY_LOCAL_STATE);
  });
});
