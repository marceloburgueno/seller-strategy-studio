import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { AGENT_ICON, NAV_ICONS } from "./nav";

// NK-0168: icons always come with their text. Outside the shadcn primitives and IconText itself,
// a lucide icon may only be passed to <IconText icon={…}>, never rendered on its own as <Icon />.
const ROOT = "src";
const ALLOWED = [/^src\/components\/ui\//, /^src\/components\/icon-text\.tsx$/];

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) return files(p);
    return /\.tsx$/.test(n) && !/\.test\.tsx$/.test(n) ? [p] : [];
  });
}

export function bareIconUses(path: string, src: string): string[] {
  const m = src.match(/import\s*\{([^}]*)\}\s*from\s*"lucide-react"/);
  if (!m) return [];
  const names = m[1]
    .split(",")
    .map((x) =>
      x
        .trim()
        .split(/\s+as\s+/)
        .pop()!,
    )
    .filter((x) => x && !x.startsWith("type "));
  return names.filter((n) => new RegExp(`<${n}[\\s/>]`).test(src)).map((n) => `${path}: <${n}>`);
}

describe("NK-0168 icon rule", () => {
  it("no lucide icon is rendered without IconText", () => {
    const bad = files(ROOT)
      .filter((p) => !ALLOWED.some((r) => r.test(p.replaceAll("\\", "/"))))
      .flatMap((p) => bareIconUses(p, readFileSync(p, "utf8")));
    expect(bad).toEqual([]);
  });
  it("the guard catches a bare icon", () => {
    expect(
      bareIconUses(
        "x.tsx",
        'import { Trash2 } from "lucide-react";\nconst a = <Trash2 size={16} />;',
      ),
    ).toHaveLength(1);
    expect(
      bareIconUses(
        "x.tsx",
        'import { Trash2 } from "lucide-react";\nconst a = <IconText icon={Trash2}>Borrar</IconText>;',
      ),
    ).toHaveLength(0);
  });
  it("one icon per concept: delete=Trash2, discard changes=Eraser, disqualify=Ban, cancel=X", () => {
    const want: Record<string, string> = {
      Borrar: "Trash2",
      Eliminar: "Trash2",
      "Descartar cambios": "Eraser",
      Descalificar: "Ban",
      Cancelar: "X",
    };
    const bad = files(ROOT).flatMap((p) =>
      [...readFileSync(p, "utf8").matchAll(/<IconText icon=\{(\w+)\}[^>]*>([^<]+)<\/IconText>/g)]
        .filter(([, icon, text]) => want[text.trim()] && want[text.trim()] !== icon)
        .map(([m]) => `${p}: ${m}`),
    );
    expect(bad).toEqual([]);
  });
  it("navigation icons (Ronda 2A) are registered once per concept and never reuse an action icon", () => {
    const nav = { ...NAV_ICONS, agent: AGENT_ICON };
    const icons = Object.values(nav);
    expect(new Set(icons).size).toBe(icons.length);
    const names = icons.map((i) => i.displayName);
    for (const reserved of ["Trash2", "Eraser", "Ban", "X", "Check", "Spline", "Cable"])
      expect(
        names.filter((n) => n === reserved).length,
        `${reserved} belongs to its own concept`,
      ).toBeLessThanOrEqual(reserved === "Spline" || reserved === "Cable" ? 1 : 0);
  });
  it("the shell renders nav, bottom bar and agent icons only through IconText", () => {
    const shell = readFileSync("src/routes/_authenticated/route.tsx", "utf8");
    expect(shell).toMatch(/<IconText icon=\{NAV_ICONS\[t\.to\]\}/);
    expect(shell).toMatch(/<IconText icon=\{AGENT_ICON\}/);
    expect(shell).toMatch(/<IconText icon=\{icon\} size="nav">/);
  });
});
