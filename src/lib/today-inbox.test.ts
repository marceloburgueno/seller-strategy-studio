import { describe, expect, it } from "vitest";
import { homeFocus, homeScope, mergeInbox, taskPriority } from "./today-inbox";

const today = "2026-11-15";
const src = {
  suggestions: [{ id: "1", title: "Llama a Acme", priority: 3, created_at: "2026-11-14" }],
  approvals: [{ id: "2", title: "Descuento 20 %", created_at: "2026-11-13" }],
  tasks: [
    { id: "3", title: "Enviar propuesta", due_date: "2026-11-15", created_at: "2026-11-01" },
    { id: "4", title: "Sin fecha", due_date: null, created_at: "2026-11-01" },
  ],
  actions: [{ id: "5", summary: "Buscar empresas en Clay", created_at: "2026-11-15T08:00" }],
};

describe("Hoy: one list", () => {
  it("merges every source, urgent first", () => {
    const m = mergeInbox(src, today);
    expect(m).toHaveLength(5);
    expect(m.slice(0, 3).every((i) => i.priority === 1)).toBe(true);
    expect(m.at(-1)!.priority).toBe(3);
  });
  it("each kind links to the screen that decides it", () => {
    const m = mergeInbox(src, today);
    expect(m.find((i) => i.kind === "aprobacion")!.href).toBe("/approvals");
    expect(m.find((i) => i.kind === "tarea")!.href).toBeNull();
  });
  it("only today's meetings, first and in time order, opening their account", () => {
    const m = mergeInbox(
      {
        ...src,
        meetings: [
          { id: "m2", title: "Demo B", scheduled_at: "2026-11-15T16:00:00Z", account_id: "b" },
          { id: "m1", title: "Demo A", scheduled_at: "2026-11-15T09:00:00Z", account_id: "a" },
          { id: "m0", title: "Ayer", scheduled_at: "2026-11-14T09:00:00Z", account_id: "c" },
        ],
      },
      today,
    );
    expect(m.slice(0, 2).map((i) => i.title)).toEqual(["Demo A", "Demo B"]);
    expect(m.filter((i) => i.kind === "reunion")).toHaveLength(2);
    expect(m[0]!.accountId).toBe("a");
  });
  it("replies add one row only with new replies", () => {
    expect(mergeInbox({ ...src, replies: 0 }, today).some((i) => i.kind === "respuesta")).toBe(
      false,
    );
    expect(mergeInbox(src, today).some((i) => i.kind === "respuesta")).toBe(false);
    const r = mergeInbox({ ...src, replies: 3 }, today).find((i) => i.kind === "respuesta")!;
    expect(r.title).toBe("3 respuestas nuevas de tus leads");
    expect(r.href).toBe("/replies");
  });
  it("task due today or overdue is urgent; no date is when you can", () => {
    expect(taskPriority("2026-11-10", today)).toBe(1);
    expect(taskPriority("2026-11-20", today)).toBe(2);
    expect(taskPriority(null, today)).toBe(3);
  });
});

describe("Ahora: one card in priority order", () => {
  const all = { onboardingPending: true, strategyPending: true, hasSuggestion: true };
  it("onboarding, then strategy, then the best suggestion, then empty", () => {
    expect(homeFocus(all)).toBe("onboarding");
    expect(homeFocus({ ...all, onboardingPending: false })).toBe("strategy");
    expect(homeFocus({ ...all, onboardingPending: false, strategyPending: false })).toBe(
      "suggestion",
    );
    expect(
      homeFocus({ onboardingPending: false, strategyPending: false, hasSuggestion: false }),
    ).toBe("empty");
  });
});

describe("homeScope: the strip and the headline share the role scope", () => {
  const deals = [
    { stage: "demo", amount: 100, probability: 50, health: "red", owner_id: "me" },
    { stage: "demo", amount: 300, probability: 10, health: "green", owner_id: "other" },
    { stage: "won", amount: 900, probability: 100, health: "red", owner_id: "me" },
    { stage: "lost", amount: 50, probability: 0, health: "red", owner_id: "other" },
    { stage: "proposal", amount: null, probability: null, health: "red", owner_id: "other" },
  ];
  it("a seller sees only their open deals, never the company's risk", () => {
    expect(homeScope(deals, { leader: false, userId: "me" })).toEqual({
      openDeals: 1,
      openAmount: 100,
      weighted: 50,
      riskDeals: 1,
      riskAmount: 100,
    });
  });
  it("a leader sees every open deal", () => {
    expect(homeScope(deals, { leader: true, userId: "me" })).toEqual({
      openDeals: 3,
      openAmount: 400,
      weighted: 80,
      riskDeals: 2,
      riskAmount: 100,
    });
  });
  it("without a user id a seller sees nothing", () => {
    expect(homeScope(deals, { leader: false, userId: undefined }).openDeals).toBe(0);
  });
});
