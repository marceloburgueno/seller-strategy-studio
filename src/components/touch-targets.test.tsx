// SDD-20261118-ux-legibilidad-pantallas-diarias · U-5 · CA-8, CA-9: below md the elements named in the SDD are at
// least 44 px tall (min-h-11 / h-11, the pattern move-menu.tsx already uses) and from md up they keep today's size.
// Classes only: the real height at 375 px is measured in the browser (SDD sections 16 and 17).
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, ...p }: { children: React.ReactNode; to: string }) => (
    <a href={String(to)} {...p}>
      {children}
    </a>
  ),
  useRouterState: ({ select }: { select: (r: { location: { pathname: string } }) => unknown }) =>
    select({ location: { pathname: "/leads" } }),
}));
vi.mock("@/hooks/use-me", async () => (await import("@/test/metrics-mocks")).fakeUseMeModule());
vi.mock("@/hooks/use-business-lines", () => ({
  usePrimaryLine: () => ({
    isLoading: false,
    error: null,
    primary: { label: "Línea ficticia", result: { archetype: "B", name: "Otro" }, extra: 0 },
  }),
}));

import { FlowStrip } from "@/components/flow-strip";
import { PrimaryLineNote } from "@/components/primary-line-note";

const cls = (el: Element | null | undefined) => (el?.className ?? "").toString().split(" ");
const src = (p: string) => readFileSync(resolve(__dirname, p), "utf8");

describe("CA-8 touch targets below md", () => {
  it("Button size sm (Tablero / Listado and every small button) is 44 px tall", () => {
    render(<Button size="sm">Tablero</Button>);
    const c = cls(screen.getByRole("button", { name: "Tablero" }));
    expect(c).toContain("h-11");
    expect(c).not.toContain("h-9");
  });

  it("the tab row and its triggers are 44 px tall", () => {
    render(
      <Tabs defaultValue="a">
        <TabsList>
          <TabsTrigger value="a">Resumen</TabsTrigger>
        </TabsList>
      </Tabs>,
    );
    expect(cls(screen.getByRole("tab", { name: "Resumen" }))).toContain("h-11");
    expect(cls(screen.getByRole("tablist"))).toContain("h-[3.25rem]");
  });

  it("the breadcrumb links of the flow strip are 44 px tall and the li itself carries no min-height", () => {
    const { container } = render(<FlowStrip />);
    const crumbs = [...container.querySelectorAll("ol a")];
    expect(crumbs.length).toBeGreaterThanOrEqual(3);
    for (const a of crumbs) {
      expect(cls(a), a.textContent ?? "").toContain("min-h-11");
      expect(cls(a), a.textContent ?? "").toContain("md:min-h-0");
    }
    for (const li of container.querySelectorAll("ol li")) expect(cls(li)).not.toContain("min-h-11");
  });

  it("the «Después» link reaches 44 px with an invisible hit area, not with a taller line", () => {
    const { container } = render(<FlowStrip />);
    const next = container.querySelector("p a");
    expect(next).not.toBeNull();
    const c = cls(next);
    expect(c).toContain("before:absolute");
    expect(c).toContain("before:-inset-y-4");
    expect(c).not.toContain("min-h-11");
    expect(c).not.toContain("inline-flex");
    expect(c).toContain("md:before:hidden");
  });

  it("«Editar líneas» has a 44 px target", () => {
    render(<PrimaryLineNote />);
    const edit = cls(screen.getByRole("link", { name: "Editar líneas" }));
    expect(edit).toContain("min-h-11");
    expect(edit).toContain("md:min-h-0");
  });

  it("the section links of Métricas (a nav of links, not TabsTrigger) have a 44 px target", () => {
    const s = src("../routes/_authenticated/metrics.tsx");
    const nav = s.slice(s.indexOf('aria-label="Secciones de Métricas"'), s.indexOf("</nav>"));
    expect(nav).toContain("min-h-11");
    expect(nav).toContain("md:min-h-0");
  });

  it("the «Avisos» trigger has a 44 px target", () => {
    const s = src("./notification-center.tsx");
    const trigger = s.slice(s.indexOf("<PopoverTrigger asChild>"), s.indexOf("</PopoverTrigger>"));
    expect(trigger).toContain("min-h-11");
    expect(trigger).toContain("md:min-h-0");
  });
});

describe("Ronda 2A: shell navigation touch targets below md", () => {
  const shell = src("../routes/_authenticated/route.tsx");
  const fn = (name: string) => {
    const at = shell.indexOf(`function ${name}(`);
    const next = shell.indexOf("\nfunction ", at + 1);
    return shell.slice(at, next < 0 ? undefined : next);
  };

  it("bottom bar tabs keep a 60 px bar, 44 px minimum per tab and an icon over each label", () => {
    const bar = fn("BottomBar");
    expect(bar).toContain("h-[calc(3.75rem+env(safe-area-inset-bottom))]");
    expect(bar).toMatch(/const item =\s*"[^"]*min-h-11[^"]*flex-1/);
    expect(bar).toContain("<IconText icon={NAV_ICONS[t.to]}");
    expect(bar).toContain("<IconText icon={AGENT_ICON}");
  });

  it("sidebar links, group toggles, the setup pill and the user menu are 44 px tall on mobile only", () => {
    expect(shell).toMatch(/const linkClass =\s*"[^"]*min-h-11[^"]*md:min-h-0/);
    expect(shell).toMatch(/aria-expanded=\{open\}\s*className="[^"]*min-h-11[^"]*md:min-h-8/);
    expect(fn("SetupPill")).toMatch(/min-h-11[^"]*md:min-h-8/);
    expect(fn("UserMenu")).toContain("min-h-11");
  });
});

describe("CA-9 from md up the sizes stay", () => {
  it("Button default and sm, TabsList and TabsTrigger keep their md heights", () => {
    render(
      <>
        <Button size="sm">Pequeño</Button>
        <Button>Normal</Button>
        <Tabs defaultValue="a">
          <TabsList>
            <TabsTrigger value="a">Uno</TabsTrigger>
          </TabsList>
        </Tabs>
      </>,
    );
    expect(cls(screen.getByRole("button", { name: "Pequeño" }))).toContain("md:h-7");
    const normal = cls(screen.getByRole("button", { name: "Normal" }));
    expect(normal).toContain("h-10");
    expect(normal).toContain("md:h-9");
    expect(cls(screen.getByRole("tab", { name: "Uno" }))).toContain("md:h-8");
    expect(cls(screen.getByRole("tablist"))).toContain("md:h-10");
  });
});
