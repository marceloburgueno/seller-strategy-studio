import { beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_BUDGET,
  causalChain,
  draftEdited,
  genericPhrases,
  parseBudget,
  parseOutcomes,
  pausedNote,
  readOutcomes,
  readVariant,
  saveOutcomes,
  saveVariant,
  signalLine,
  splitByBudget,
  tierLabel,
  toggleOutcome,
} from "@/lib/daily-queue";

describe("time budget", () => {
  const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  it("defaults to 20–30 min and shows the 4 highest-signal rows", () => {
    expect(parseBudget(null)).toBe(DEFAULT_BUDGET);
    expect(parseBudget("bogus")).toBe("30");
    expect(splitByBudget(items, "30")).toEqual({ shown: [1, 2, 3, 4], paused: 6 });
  });
  it("15 min shows 2 and 1 h shows 8", () => {
    expect(splitByBudget(items, "15").shown).toEqual([1, 2]);
    expect(splitByBudget(items, "60")).toEqual({ shown: items.slice(0, 8), paused: 2 });
    expect(splitByBudget([1], "15")).toEqual({ shown: [1], paused: 0 });
  });
  it("the paused note is calm and never says overdue", () => {
    expect(pausedNote(0)).toBeNull();
    expect(pausedNote(1)).toMatch(/en pausa, sin vencerse/);
    expect(pausedNote(6)).toBe("El resto (6) queda guardado en pausa, sin vencerse.");
    expect(pausedNote(6)).not.toMatch(/atrasad|vencid/i);
  });
});

describe("causal chain", () => {
  it("reads only valid fields and hides the block when there are none", () => {
    expect(causalChain({ id: "x", title: "t" })).toBeNull();
    expect(causalChain(null)).toBeNull();
    const c = causalChain({ tier: "Tier 2", hypothesis: " H ", signal: 3, signalAge: "" });
    expect(c).toMatchObject({ tier: "Tier 2", hypothesis: "H", signal: null, signalAge: null });
    expect(causalChain({ tier: "Tier 9" })).toBeNull();
  });
  it("words the tier and the exact signal", () => {
    expect(tierLabel("Tier 1 · ABM")).toBe("Tier 1 · ABM");
    expect(tierLabel("Tier 2")).toBe("Tier 2 · Segmento");
    expect(
      signalLine({
        signal: "Nuevo director de operaciones",
        signalSource: "LinkedIn",
        signalAge: "hace 2 días",
      }),
    ).toBe("Nuevo director de operaciones · LinkedIn · hace 2 días");
    expect(signalLine({ signal: null, signalSource: null, signalAge: null })).toBeNull();
  });
});

describe("draft", () => {
  it("flags generic filler regardless of accents and case", () => {
    expect(genericPhrases("Hola, ESPERO QUE ESTES TENIENDO UNA GRAN SEMANA.")).toHaveLength(1);
    expect(genericPhrases("Vi que se incorporó un nuevo director.")).toEqual([]);
  });
  it("whitespace is not an edit", () => {
    expect(draftEdited("Hola  Diego\n", "Hola Diego")).toBe(false);
    expect(draftEdited("Hola Diego", "Hola Diego, ¿qué tal?")).toBe(true);
  });
});

describe("outcome capture", () => {
  beforeEach(() => globalThis.localStorage?.clear());
  it("one click records, the same click clears, another replaces", () => {
    const now = new Date("2026-11-27T10:00:00Z");
    let log = toggleOutcome({}, "s1", "replied", false, now);
    expect(log.s1).toEqual({ outcome: "replied", at: now.toISOString(), edited: false });
    log = toggleOutcome(log, "s1", "meeting", true, now);
    expect(log.s1?.outcome).toBe("meeting");
    expect(toggleOutcome(log, "s1", "meeting", true, now)).toEqual({});
  });
  it("drops malformed storage", () => {
    expect(parseOutcomes("not json")).toEqual({});
    expect(parseOutcomes("[]")).toEqual({});
    expect(
      parseOutcomes(
        JSON.stringify({ a: { outcome: "nope", at: "x" }, b: { outcome: "no_reply", at: "y" } }),
      ),
    ).toEqual({ b: { outcome: "no_reply", at: "y", edited: false } });
  });
  it("round-trips through local storage per company, or degrades to nothing", () => {
    const saved = saveOutcomes("org", { s1: { outcome: "objection", at: "t", edited: false } });
    expect(readOutcomes("org")).toEqual(
      saved ? { s1: { outcome: "objection", at: "t", edited: false } } : {},
    );
    expect(readOutcomes("other")).toEqual({});
    if (saveVariant("org", "s1", "Mi versión")) expect(readVariant("org", "s1")).toBe("Mi versión");
  });
});
