// Ronda 2C — Bandeja (/inbox): master-detail from md with Enter / E / H, the swipe deck below md, and «Abrir y completar»
// on experiment/task suggestions opening the form instead of an error. Fictional data; supabase and server functions mocked.
import { fireEvent, render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { buildStrategySuggestion } from "@/lib/strategy-suggestions";

const hoisted = vi.hoisted(() => ({ decide: vi.fn(), openAgent: vi.fn() }));

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
  useMe: () => ({ data: { user: { id: "u1" }, roles: ["owner"], currentOrg: { org_id: "o1" } } }),
}));
vi.mock("@tanstack/react-start", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-start")>()),
  useServerFn: (f: unknown) => f,
}));
vi.mock("@/lib/agent.functions", () => ({
  decideSuggestion: hoisted.decide,
  refreshSuggestions: vi.fn(() => Promise.resolve()),
}));
vi.mock("@/components/agent", () => ({ useAgent: () => ({ open: hoisted.openAgent }) }));
vi.mock("sonner", () => ({
  toast: Object.assign(
    vi.fn(() => "t"),
    { success: vi.fn(), error: vi.fn(), dismiss: vi.fn() },
  ),
}));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children }: { to: string; children: React.ReactNode }) => (
    <a href={to}>{children}</a>
  ),
  useNavigate: () => vi.fn(),
}));

import { SuggestionInbox, ageLabel, areaLabel, recordRef } from "@/components/suggestions";
import { SuggestionDeck } from "@/components/suggestion-deck";

const strategic = (
  id: string,
  action_type: "strategy_change" | "experiment" | "commercial_action",
) => {
  const b = buildStrategySuggestion({
    element: "icp",
    kind: "create",
    action_type,
    cause: id,
    priority: 2,
    title: `Estratégica ${id}`,
    body: "texto",
    evidence: [{ table: "deals", id: "d1", label: "Deal 1" }],
  });
  return {
    id,
    title: b.title,
    body: b.body,
    priority: b.priority,
    link: null,
    action: null,
    created_at: "2026-11-20T00:00:00Z",
    detector: b.detector,
    dedupe_key: b.dedupe_key,
    strategy: b.strategy,
  };
};
const operational = (id: string, priority = 2) => ({
  id,
  title: `Operativa ${id}`,
  body: `Por qué ${id}`,
  priority,
  link: null,
  action: null,
  created_at: "2026-11-20T00:00:00Z",
  detector: "meddpicc_gaps",
  dedupe_key: `m:${id}`,
  strategy: null,
});
type Items = React.ComponentProps<typeof SuggestionInbox>["items"];

const wrap = (ui: React.ReactElement) =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      {ui}
    </QueryClientProvider>,
  );
const detail = () => screen.getByRole("region", { name: "Detalle de la sugerencia" });
const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  hoisted.decide.mockReset();
  hoisted.decide.mockResolvedValue({ message: "ok" });
  hoisted.openAgent.mockReset();
  vi.mocked(toast.error).mockClear();
});

describe("pure helpers", () => {
  it("ageLabel is short and never negative", () => {
    const now = new Date("2026-11-26T12:00:00Z");
    expect(ageLabel("2026-11-26T11:30:00Z", now)).toBe("ahora");
    expect(ageLabel("2026-11-26T07:00:00Z", now)).toBe("5 h");
    expect(ageLabel("2026-11-23T12:00:00Z", now)).toBe("3 d");
    expect(ageLabel("2026-11-05T12:00:00Z", now)).toBe("3 sem");
    expect(ageLabel("2026-08-01T12:00:00Z", now)).toBe("3 meses");
    expect(ageLabel("2026-12-01T12:00:00Z", now)).toBe("ahora");
  });
  it("recordRef reads an account or a deal from the link, not other routes", () => {
    expect(recordRef("/accounts/a1?tab=signals")).toEqual({ table: "accounts", id: "a1" });
    expect(recordRef("/deals?deal=d9")).toEqual({ table: "deals", id: "d9" });
    expect(recordRef("/accounts/assignment")).toBeNull();
    expect(recordRef("/deals")).toBeNull();
    expect(recordRef(null)).toBeNull();
  });
  it("areaLabel names the screen when there is no record", () => {
    expect(areaLabel({ link: "/leads", strategy: null })).toBe("Leads");
    expect(areaLabel({ link: null, strategy: null })).toBeNull();
  });
});

describe("deck: «Abrir y completar» on an experiment or a task", () => {
  it("opens the form instead of an error, and decides nothing until it is saved", async () => {
    vi.useFakeTimers();
    try {
      wrap(
        <SuggestionDeck
          items={[strategic("x", "experiment")] as unknown as Items}
          keyboard={false}
        />,
      );
      fireEvent.click(screen.getByRole("button", { name: "Abrir y completar" }));
      expect(screen.getByText("Crear el experimento")).toBeInTheDocument();
      await vi.advanceTimersByTimeAsync(5100);
      expect(hoisted.decide).not.toHaveBeenCalled();
      expect(toast.error).not.toHaveBeenCalled();
      expect(screen.getByText("Estratégica x")).toBeInTheDocument(); // the card stays
    } finally {
      vi.useRealTimers();
    }
  });
  it("a task says «Abrir y completar» and opens «Crear la tarea»", () => {
    wrap(
      <SuggestionDeck
        items={[strategic("t", "commercial_action")] as unknown as Items}
        keyboard={false}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Abrir y completar" }));
    expect(screen.getByText("Crear la tarea")).toBeInTheDocument();
  });
});

describe("inbox master-detail (md and up)", () => {
  it("lists every suggestion with a priority dot and shows the first one in the detail with «Por qué ahora»", () => {
    wrap(
      <SuggestionInbox items={[operational("a", 1), operational("b", 3)] as unknown as Items} />,
    );
    const list = screen.getByRole("listbox", { name: "Sugerencias pendientes" });
    expect(within(list).getAllByRole("option")).toHaveLength(2);
    expect(list.querySelector(".bg-state-alarm")).not.toBeNull();
    expect(list.querySelector(".bg-ink-faint")).not.toBeNull();
    expect(within(detail()).getByText("Operativa a")).toBeInTheDocument();
    expect(within(detail()).getByText("Por qué ahora")).toBeInTheDocument();
    expect(within(detail()).getByText("Por qué a")).toBeInTheDocument();
    fireEvent.click(within(list).getByText("Operativa b"));
    expect(within(detail()).getByText("Operativa b")).toBeInTheDocument();
  });
  it("E discards, H snoozes and Enter does the selected one, moving to the next", async () => {
    wrap(
      <SuggestionInbox
        items={[operational("a"), operational("b"), operational("c")] as unknown as Items}
      />,
    );
    fireEvent.keyDown(window, { key: "e" });
    await flush();
    expect(hoisted.decide).toHaveBeenLastCalledWith({ data: { id: "a", decision: "dismiss" } });
    expect(within(detail()).getByText("Operativa b")).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "h" });
    await flush();
    expect(hoisted.decide).toHaveBeenLastCalledWith({ data: { id: "b", decision: "snooze" } });
    fireEvent.keyDown(window, { key: "Enter" });
    await flush();
    expect(hoisted.decide).toHaveBeenLastCalledWith({ data: { id: "c", decision: "approve" } });
  });
  it("a failed decision brings the row back and shows a readable error", async () => {
    hoisted.decide.mockRejectedValueOnce(new Error("Algo falló"));
    wrap(<SuggestionInbox items={[operational("a"), operational("b")] as unknown as Items} />);
    fireEvent.keyDown(window, { key: "e" });
    await flush();
    await flush();
    expect(toast.error).toHaveBeenCalled();
    expect(within(screen.getByRole("listbox")).getAllByRole("option")).toHaveLength(2);
  });
  it("Enter on an experiment opens the form; no error and no decision", async () => {
    wrap(<SuggestionInbox items={[strategic("x", "experiment")] as unknown as Items} />);
    expect(within(detail()).getByRole("button", { name: /Abrir y completar/ })).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "Enter" });
    expect(screen.getByText("Crear el experimento")).toBeInTheDocument();
    expect(hoisted.decide).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  });
  it("shortcuts are ignored while typing the reason", () => {
    wrap(<SuggestionInbox items={[strategic("s", "strategy_change")] as unknown as Items} />);
    const input = within(detail()).getByLabelText("Motivo de tu decisión (opcional)");
    fireEvent.keyDown(input, { key: "e" });
    expect(hoisted.decide).not.toHaveBeenCalled();
  });
  it("«Resolver con el agente» opens the agent", () => {
    wrap(<SuggestionInbox items={[operational("a")] as unknown as Items} />);
    fireEvent.click(within(detail()).getByRole("button", { name: "Resolver con el agente" }));
    expect(hoisted.openAgent).toHaveBeenCalled();
  });
});

describe("V2 causal chain, human draft and 1-click capture", () => {
  const causal = (id: string) => ({
    ...operational(id, 1),
    tier: "Tier 1 · ABM",
    hypothesis: "Las logísticas renuevan cuando operaciones ve el ahorro",
    signal: "Nuevo director de operaciones",
    signalSource: "LinkedIn",
    signalAge: "hace 2 días",
    draftMessage: "Hola Diego:\n\nVi que se incorporó un nuevo director de operaciones.\n\nLaura",
    pedagogyReason: "Un cambio en operaciones reabre la renovación.",
  });
  beforeEach(() => globalThis.localStorage?.clear());

  it("shows tier, hypothesis, exact signal with source and age, and the commercial reason", () => {
    wrap(<SuggestionInbox items={[causal("a")] as unknown as Items} />);
    const d = within(detail());
    expect(d.getByText("Tier 1 · ABM")).toBeInTheDocument();
    expect(d.getByText(/Las logísticas renuevan/)).toBeInTheDocument();
    expect(
      d.getByText("Nuevo director de operaciones · LinkedIn · hace 2 días"),
    ).toBeInTheDocument();
    expect(d.getByText(/Por qué este ángulo ahora/)).toBeInTheDocument();
  });

  it("an edited draft says it is learning; typing in it never triggers shortcuts", () => {
    wrap(<SuggestionInbox items={[causal("a")] as unknown as Items} />);
    const box = within(detail()).getByLabelText("Borrador") as HTMLTextAreaElement;
    expect(box.value).toMatch(/^Hola Diego/);
    expect(within(detail()).queryByText(/Editado · aprendiendo/)).toBeNull();
    fireEvent.change(box, { target: { value: "Hola Diego, ¿qué tal? Te escribo corto." } });
    fireEvent.keyDown(box, { key: "e" });
    expect(hoisted.decide).not.toHaveBeenCalled();
    expect(
      within(detail()).getByText("Editado · aprendiendo tu estilo y registrando variante"),
    ).toBeInTheDocument();
  });

  it("one chip records the outcome without a form and does not decide the suggestion", () => {
    wrap(<SuggestionInbox items={[causal("a")] as unknown as Items} />);
    const chip = within(detail()).getByRole("button", { name: "Reunión agendada" });
    fireEvent.click(chip);
    expect(chip).toHaveAttribute("aria-pressed", "true");
    expect(within(detail()).getByText(/Guardado: Reunión agendada/)).toBeInTheDocument();
    expect(hoisted.decide).not.toHaveBeenCalled();
    fireEvent.click(chip);
    expect(chip).toHaveAttribute("aria-pressed", "false");
  });

  it("a suggestion without causal fields shows none of it", () => {
    wrap(<SuggestionInbox items={[operational("a")] as unknown as Items} />);
    expect(within(detail()).queryByText(/Tier/)).toBeNull();
    expect(within(detail()).queryByLabelText("Borrador")).toBeNull();
    expect(within(detail()).queryByText(/Capturar resultado/)).toBeNull();
  });
});
