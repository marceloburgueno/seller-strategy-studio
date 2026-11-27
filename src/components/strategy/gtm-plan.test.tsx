// Ronda 3A · Plan GTM: summary, Gantt with critical-path filter, task side panel and local persistence.
// Fictional NubeOps data, no network: the view gets its money formatter as a prop.
import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { GtmPlanView } from "@/components/strategy/gtm-plan";
import { PLAN_STORAGE_KEY, parseLocalState } from "@/lib/gtm-plan";

const money = (n: number) => `${n} EUR`;
const TODAY = new Date("2026-11-26T12:00:00Z");
const renderPlan = () => render(<GtmPlanView money={money} today={TODAY} />);

beforeEach(() => window.localStorage.clear());

describe("Plan GTM", () => {
  it("shows the executive summary: headline, objectives, KPIs with target and decisions", () => {
    renderPlan();
    expect(screen.getByText("2 tareas del camino crítico están en riesgo")).toBeInTheDocument();
    expect(screen.getByText("Abrir el segmento fintech")).toBeInTheDocument();
    expect(screen.getByText("Pipeline generado")).toBeInTheDocument();
    expect(screen.getByText("Meta 3600000 EUR · por debajo")).toBeInTheDocument();
    expect(screen.getByText(/Precio por cuenta cloud conectada/)).toBeInTheDocument();
  });

  it("registers a new decision and keeps it in this browser", () => {
    renderPlan();
    fireEvent.click(screen.getByRole("button", { name: "Registrar decisión" }));
    fireEvent.change(screen.getByLabelText("Qué se aprobó"), {
      target: { value: "Priorizar fintech en el segundo semestre" },
    });
    fireEvent.change(screen.getByLabelText("Fecha"), { target: { value: "2026-11-26" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar decisión" }));
    expect(screen.getByText("Priorizar fintech en el segundo semestre")).toBeInTheDocument();
    expect(screen.getByText("26 nov 2026 · validó Owner")).toBeInTheDocument();
    expect(window.localStorage.getItem(PLAN_STORAGE_KEY)).toContain("Priorizar fintech");
  });

  it("«Solo camino crítico» keeps the critical tasks and their dependencies", () => {
    renderPlan();
    const table = screen.getByRole("table", { name: "Plan GTM por áreas" });
    expect(
      within(table).getByRole("button", { name: "Battlecards de competidores" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("switch", { name: "Solo camino crítico" }));
    expect(within(table).queryByRole("button", { name: "Battlecards de competidores" })).toBeNull();
    expect(
      within(table).getByRole("button", {
        name: /Primeras 10 cuentas fintech: En riesgo.*camino crítico/,
      }),
    ).toBeInTheDocument();
    expect(
      within(table).getByRole("button", {
        name: /Prueba guiada de 14 días: Hecha.*dependencia del camino crítico/,
      }),
    ).toBeInTheDocument();
  });

  it("expands subtasks and collapses an area", () => {
    renderPlan();
    fireEvent.click(
      screen.getByRole("button", { name: "Ver subtareas de Posicionamiento para fintech" }),
    );
    expect(screen.getByRole("button", { name: "Página de solución fintech" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Posicionamiento e ICP" }));
    expect(screen.queryByRole("button", { name: "Página de solución fintech" })).toBeNull();
  });

  it("opens the side panel: subtasks, critical impact, note — all saved locally", () => {
    renderPlan();
    const table = screen.getByRole("table", { name: "Plan GTM por áreas" });
    fireEvent.click(within(table).getByRole("button", { name: "Posicionamiento para fintech" }));
    const panel = screen.getByRole("dialog");
    expect(within(panel).getByText("Impacto en el camino crítico")).toBeInTheDocument();
    expect(within(panel).getByText(/Está en el camino crítico y en riesgo/)).toBeInTheDocument();
    expect(within(panel).getByText("Bloquea a: Primeras 10 cuentas fintech")).toBeInTheDocument();
    expect(within(panel).getByText("1 de 3 · 33 %")).toBeInTheDocument();

    fireEvent.click(within(panel).getByRole("checkbox", { name: /Página de solución fintech/ }));
    expect(within(panel).getByText("2 de 3 · 67 %")).toBeInTheDocument();

    fireEvent.change(within(panel).getByLabelText("Nota de feedback"), {
      target: { value: "Los bancos piden SOC 2 antes de la prueba." },
    });
    fireEvent.click(within(panel).getByRole("button", { name: "Guardar nota" }));
    expect(within(panel).getByText("Nota guardada en este navegador.")).toBeInTheDocument();

    const saved = JSON.parse(window.localStorage.getItem(PLAN_STORAGE_KEY)!);
    expect(saved.tasks["t-fintech"]).toEqual({
      doneSubtasks: ["s-fin-1", "s-fin-2"],
      note: "Los bancos piden SOC 2 antes de la prueba.",
    });
  });

  it("restores saved changes on the next visit and can reset to the example", () => {
    window.localStorage.setItem(
      PLAN_STORAGE_KEY,
      JSON.stringify({
        tasks: { "t-fintech": { status: "done" }, "t-fintech-deals": { status: "in_progress" } },
        decisions: [],
      }),
    );
    renderPlan();
    expect(
      screen.getByText(/^\d+ de 13 tareas hechas; el camino crítico va en plazo$/),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Restablecer ejemplo" }));
    expect(screen.getByText("2 tareas del camino crítico están en riesgo")).toBeInTheDocument();
  });

  it("Ritual del Lunes: approving a proposal executes it and writes it in the commercial memory", () => {
    renderPlan();
    expect(
      screen.getByText("2 propuestas para esta semana, con la evidencia delante"),
    ).toBeInTheDocument();
    const card = screen.getByRole("listitem", { name: "Mover el foco de A a B" });
    expect(within(card).getByText("Mala hipótesis")).toBeInTheDocument();
    expect(within(card).getByText(/No falló tu producto/)).toBeInTheDocument();
    expect(
      within(screen.getByRole("listitem", { name: /Arreglar la ejecución de C/ })).getByText(
        "Ejecución o momento",
      ),
    ).toBeInTheDocument();

    fireEvent.click(within(card).getByRole("button", { name: "Aprobar" }));
    expect(within(card).queryByRole("button", { name: "Aprobar" })).toBeNull();
    expect(within(card).getByText(/Ejecutada el 26 nov 2026/)).toBeInTheDocument();
    expect(screen.getByText("Queda una propuesta por decidir esta semana")).toBeInTheDocument();

    // The board follows the decision: 70 % of the focus and the new offer on B.
    const b = screen.getByRole("listitem", { name: "Hipótesis B" });
    expect(within(b).getByText("Diagnóstico rápido de 10 min")).toBeInTheDocument();
    expect(within(b).getByText(/70 % del foco/)).toBeInTheDocument();

    const memory = parseLocalState(window.localStorage.getItem(PLAN_STORAGE_KEY));
    expect(memory.decisions[0]).toMatchObject({
      proposalId: "p-focus-b",
      date: "2026-11-26",
      change: "Mover el 70 % del foco a B y cambiar la oferta a «Diagnóstico rápido de 10 min».",
    });
    expect(screen.getAllByText(/Cambio aplicado:/).length).toBeGreaterThanOrEqual(2);
  });

  it("«Ajustar» edits the offer and focus before approving", () => {
    renderPlan();
    const card = screen.getByRole("listitem", { name: "Mover el foco de A a B" });
    fireEvent.click(within(card).getByRole("button", { name: "Ajustar" }));
    fireEvent.change(within(card).getByLabelText("Nueva oferta"), {
      target: { value: "Auditoría exprés de 20 min" },
    });
    fireEvent.change(within(card).getByLabelText("Foco en B (%)"), { target: { value: "60" } });
    fireEvent.click(within(card).getByRole("button", { name: "Guardar ajuste" }));
    expect(
      within(card).getByText(
        "Mover el 60 % del foco a B y cambiar la oferta a «Auditoría exprés de 20 min».",
      ),
    ).toBeInTheDocument();
  });

  it("Goal-to-Test recalculates from the local goal and warns when the pace falls short", () => {
    renderPlan();
    expect(screen.getByRole("status")).toHaveTextContent(
      /necesitas 62 pruebas por semana y hoy haces 31/,
    );
    fireEvent.change(screen.getByLabelText("Reuniones cualificadas este mes"), {
      target: { value: "4" },
    });
    expect(screen.getByRole("status")).toHaveTextContent(/llega a la meta/);
    expect(parseLocalState(window.localStorage.getItem(PLAN_STORAGE_KEY)).goal).toBe(4);
  });

  it("each hypothesis opens the plan tasks it feeds", () => {
    renderPlan();
    const b = screen.getByRole("listitem", { name: "Hipótesis B" });
    expect(within(b).getByText("Confianza: Medio")).toBeInTheDocument();
    expect(within(b).getByText("Tier 1")).toBeInTheDocument();
    fireEvent.click(within(b).getByRole("button", { name: "Primeras 10 cuentas fintech" }));
    expect(
      within(screen.getByRole("dialog")).getByText("Impacto en el camino crítico"),
    ).toBeInTheDocument();
  });
});
