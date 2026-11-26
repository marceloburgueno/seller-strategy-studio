import { describe, expect, it } from "vitest";
import {
  EMPTY_LOCAL_STATE,
  EXAMPLE_PLAN,
  NO_FILTERS,
  PLAN_WEEKS,
  addDecision,
  applyLocalState,
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
    });
  });
});
