import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { NAV, NAV_GROUPS, NAV_ICONS, groupOpen, visibleItems } from "./nav";
import { paletteItems } from "./palette";

const g = (k: string) => NAV_GROUPS.find((x) => x.key === k)!;

describe("Menú (Ronda 2A)", () => {
  it("shows exactly six fixed daily entries, each with its icon", () => {
    const daily = visibleItems(g("daily"), false);
    expect(daily.map((i) => i.label)).toEqual([
      "Inicio",
      "Bandeja",
      "Cuentas",
      "Leads",
      "Pipeline",
      "Métricas",
    ]);
    expect(g("daily").collapsible).toBe(false);
    for (const i of daily) expect(NAV_ICONS[i.to], i.to).toBeDefined();
  });
  it("groups strategy under a collapsible «Estrategia»", () => {
    expect(g("strategy").collapsible).toBe(true);
    expect(g("strategy").items.map((i) => i.to)).toEqual([
      "/strategy",
      "/plays",
      "/products",
      "/hub",
    ]);
  });
  it("keeps Onboarding and Configuración out of the sidebar but in ⌘K", () => {
    const sidebar = NAV_GROUPS.flatMap((x) => visibleItems(x, true, true)).map((i) => i.to);
    expect(sidebar).not.toContain("/onboarding");
    expect(sidebar).not.toContain("/setup");
    const palette = NAV_GROUPS.flatMap((x) => paletteItems(x, false)).map((i) => i.to);
    expect(palette).toContain("/onboarding");
    expect(palette).toContain("/setup");
  });
  it("hides Asesor GTM from non-leaders", () => {
    expect(visibleItems(g("more"), false).some((i) => i.to === "/advisor")).toBe(false);
    expect(visibleItems(g("more"), true).some((i) => i.to === "/advisor")).toBe(true);
  });
  it("lists Plays for every member, and the ⌘K palette reads the same list (CA-7)", () => {
    const item = g("strategy").items.find((i) => i.to === "/plays");
    expect(item?.label).toBe("Plays");
    expect(item?.leadersOnly).toBeFalsy();
    expect(visibleItems(g("strategy"), false).some((i) => i.to === "/plays")).toBe(true);
    expect(NAV.some((i) => i.to === "/plays")).toBe(true);
    expect(readFileSync("src/components/command-palette.tsx", "utf8")).toMatch(/NAV_GROUPS\.map/);
  });
  it("finds Plays in ⌘K when you type «equipos» or «plays gtm» (SDD play-teams CA-12)", () => {
    const words = g("strategy")
      .items.find((i) => i.to === "/plays")
      ?.keywords?.split(/\s+/);
    expect(words).toContain("equipos");
    expect(words).toContain("gtm");
  });
  it("opens a collapsed group when you are on one of its pages", () => {
    expect(groupOpen(g("more"), "/debates", false)).toBe(true);
    expect(groupOpen(g("strategy"), "/strategy", false)).toBe(true);
    expect(groupOpen(g("more"), "/home", false)).toBe(false);
  });
  it("one icon per destination: no two routes share an icon", () => {
    const icons = Object.values(NAV_ICONS);
    expect(new Set(icons).size).toBe(icons.length);
  });
});
