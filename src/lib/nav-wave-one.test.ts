import { describe, expect, it } from "vitest";
import { NAV, NAV_GROUPS, visibleItems } from "./nav";

describe("Ola 1 → Ronda 2A: agrupación y avanzado", () => {
  it("CA-1 tres grupos y los destinos exactos en orden, sin perder ninguna ruta", () => {
    expect(NAV_GROUPS.map((g) => g.title)).toEqual(["Hoy", "Estrategia", "Más"]);
    expect(NAV_GROUPS.map((g) => g.items.map((i) => i.to))).toEqual([
      ["/home", "/inbox", "/accounts", "/leads", "/deals", "/metrics"],
      ["/strategy", "/plays", "/products", "/hub"],
      [
        "/approvals",
        "/replies",
        "/people",
        "/abm",
        "/discoveries",
        "/advisor",
        "/cycle",
        "/debates",
        "/theory-u",
        "/company",
        "/team",
        "/integrations",
        "/memory",
        "/onboarding",
        "/setup",
      ],
    ]);
    expect(NAV_GROUPS[0]?.collapsible).toBe(false);
  });
  it("CA-3 oculta solo tres destinos avanzados, no los elimina del catálogo", () => {
    const group = NAV_GROUPS.find((g) => g.key === "more");
    if (!group) throw new Error("Falta el grupo");
    const adv = ["/cycle", "/debates", "/theory-u"];
    expect(visibleItems(group, true).some((i) => adv.includes(i.to))).toBe(false);
    for (const to of adv) expect(visibleItems(group, true, true).map((i) => i.to)).toContain(to);
    expect(visibleItems(group, false, true).some((i) => i.to === "/advisor")).toBe(false);
    expect(NAV.map((i) => i.to)).toContain("/connect");
    expect(new Set(NAV.map((i) => i.to)).size).toBe(26);
  });
});
