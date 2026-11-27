import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const navigate = vi.hoisted(() => vi.fn());
vi.mock("@tanstack/react-router", () => ({ useNavigate: () => navigate }));

import { DemoTour, TOUR_STEPS, demoTourSeen, markDemoTourSeen } from "@/components/demo-tour";

beforeEach(() => {
  navigate.mockClear();
  window.sessionStorage.clear();
});

describe("DemoTour", () => {
  it("renders nothing while closed", () => {
    const { container } = render(<DemoTour open={false} onClose={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("opens on step 1 of 4 and goes to /home", () => {
    render(<DemoTour open onClose={() => {}} />);
    expect(screen.getByText("Paso 1 de 4")).toBeInTheDocument();
    expect(screen.getByText("Tu día en 20 min, sin culpa")).toBeInTheDocument();
    expect(navigate).toHaveBeenLastCalledWith({ to: "/home" });
  });

  it("«Siguiente →» walks the four steps and navigates to each route", () => {
    const onClose = vi.fn();
    render(<DemoTour open onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "Siguiente →" }));
    expect(screen.getByText("Paso 2 de 4")).toBeInTheDocument();
    expect(navigate).toHaveBeenLastCalledWith({ to: "/inbox" });
    fireEvent.click(screen.getByRole("button", { name: "Siguiente →" }));
    expect(screen.getByText("Ritual del Lunes y Goal-to-Test")).toBeInTheDocument();
    expect(navigate).toHaveBeenLastCalledWith({ to: "/strategy" });
    fireEvent.click(screen.getByRole("button", { name: "Siguiente →" }));
    expect(screen.getByText("Paso 4 de 4")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Siguiente →" })).toBeNull();
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Terminar" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("«Saltar» closes at any step", () => {
    const onClose = vi.fn();
    render(<DemoTour open onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "Saltar" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("is not a modal: no dialog role, so the page stays usable", () => {
    render(<DemoTour open onClose={() => {}} />);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByLabelText("Guía de la demo")).toBeInTheDocument();
  });

  it("renders nothing when not on the dev server (production build)", () => {
    vi.stubEnv("DEV", false);
    const { container } = render(<DemoTour open onClose={() => {}} />);
    expect(container).toBeEmptyDOMElement();
    vi.unstubAllEnvs();
  });

  it("remembers in sessionStorage that the tour already opened", () => {
    expect(demoTourSeen()).toBe(false);
    markDemoTourSeen();
    expect(demoTourSeen()).toBe(true);
  });

  it("has four steps on the expected routes", () => {
    expect(TOUR_STEPS.map((s) => s.path)).toEqual(["/home", "/inbox", "/strategy", "/strategy"]);
  });
});
