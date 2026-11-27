// V2 «cola sin culpa acumulada»: with a time budget, «Hoy» shows only the rows that fit and says, calmly, that the
// rest stays paused. Supabase is mocked; suggestions come from a mocked hook.
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

const suggestions = Array.from({ length: 7 }, (_, i) => ({
  id: `s${i}`,
  title: `Sugerencia ${i}`,
  priority: i < 2 ? 1 : 2,
  created_at: "2026-11-20T00:00:00Z",
}));

vi.mock("@/integrations/supabase/client", () => {
  const chain = (): object =>
    new Proxy(
      {},
      {
        get: (_t, p) =>
          p === "then"
            ? (f: (v: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(f)
            : () => chain(),
      },
    );
  return { supabase: { from: () => chain() } };
});
vi.mock("@/hooks/use-me", () => ({
  useMe: () => ({ data: { user: { id: "u1" }, roles: ["ae"], currentOrg: { org_id: "o1" } } }),
}));
vi.mock("@/components/suggestions", () => ({ useSuggestions: () => ({ data: suggestions }) }));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children }: { to: string; children: React.ReactNode }) => (
    <a href={to}>{children}</a>
  ),
}));

import { TodayInbox } from "@/components/home/today-inbox";

const wrap = (ui: React.ReactElement) =>
  render(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>);

describe("TodayInbox with a time budget", () => {
  it("30 min shows the 4 highest-signal rows and pauses the rest without guilt", () => {
    wrap(<TodayInbox meetings={[]} budget="30" controls={<span>selector</span>} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
    expect(screen.getByText("selector")).toBeInTheDocument();
    expect(
      screen.getByText(/El resto \(3\) queda guardado en pausa, sin vencerse\./),
    ).toBeInTheDocument();
    expect(screen.queryByText(/vencid|atrasad/i)).toBeNull();
  });
  it("15 min shows 2; 1 h shows all 7 with no paused note", () => {
    const { unmount } = wrap(<TodayInbox meetings={[]} budget="15" />);
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    unmount();
    wrap(<TodayInbox meetings={[]} budget="60" />);
    expect(screen.getAllByRole("listitem")).toHaveLength(7);
    expect(screen.queryByText(/en pausa/)).toBeNull();
  });
});

describe("Inicio wiring (source guard)", () => {
  it("passes the time budget to «Hoy» and shows the excluded count only from a real list", async () => {
    const { readFileSync } = await import("node:fs");
    const src = readFileSync("src/routes/_authenticated/home.tsx", "utf8");
    expect(src).toMatch(/budget=\{budget\}/);
    expect(src).toMatch(/Nada sale sin tu permiso/);
    expect(src).toMatch(/isDemoMode\(\) \? DEMO_EXCLUDED_DOMAINS\.length : null/);
    expect(src).not.toMatch(/14 dominios/);
  });
});
