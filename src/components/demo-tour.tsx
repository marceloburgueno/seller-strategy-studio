// Ronda 4: guided tour of the four new pillars for the local demo mode. Dev server only: every export is inert in a
// production build (import.meta.env.DEV is false there), so nothing renders and the module tree-shakes away.
import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export type TourStep = { path: "/home" | "/inbox" | "/strategy"; title: string; body: string };

export const TOUR_STEPS: readonly TourStep[] = [
  {
    path: "/home",
    title: "Tu día en 20 min, sin culpa",
    body: "Mira el escudo «Nada sale sin tu permiso». Prueba el selector de 15/30/60 min y abre la tarjeta «Ahora».",
  },
  {
    path: "/inbox",
    title: "Decide con evidencia",
    body: "Cada sugerencia trae señal + fuente. Edita el borrador (aprende tu estilo) y prueba la captura en 1 clic.",
  },
  {
    path: "/strategy",
    title: "Ritual del Lunes y Goal-to-Test",
    body: "Revisa el cálculo de ritmo semanal y las hipótesis vivas. [Aprobar] registra decisiones inmutables.",
  },
  {
    path: "/strategy",
    title: "Plan GTM y Camino Crítico",
    body: "Activa «Solo camino crítico» y haz clic en cualquier barra para ver sus subtareas.",
  },
];

const SEEN_KEY = "nokko-demo-tour-seen";

function store(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.sessionStorage : null;
  } catch {
    return null;
  }
}

/** True once the tour has opened by itself in this tab, so closing it is never undone by a reload. */
export function demoTourSeen(): boolean {
  try {
    return store()?.getItem(SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

export function markDemoTourSeen(): void {
  try {
    store()?.setItem(SEEN_KEY, "1");
  } catch {
    /* blocked storage: the tour just may open again */
  }
}

/** Floating card (not a modal): the page behind stays usable. */
export function DemoTour({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  // Every opening starts from step 1 on its own screen.
  useEffect(() => {
    if (!open) return;
    setStep(0);
    void navigate({ to: TOUR_STEPS[0]!.path });
  }, [open, navigate]);

  if (!import.meta.env.DEV || !open) return null;
  const current = TOUR_STEPS[step] ?? TOUR_STEPS[0]!;
  const last = step === TOUR_STEPS.length - 1;

  function next() {
    if (last) return onClose();
    const to = TOUR_STEPS[step + 1]!;
    setStep(step + 1);
    void navigate({ to: to.path });
  }

  return (
    <aside
      aria-label="Guía de la demo"
      className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-4 z-40 w-[calc(100vw-2rem)] max-w-[360px] rounded-xl border border-hairline-firm bg-card p-4 text-ink shadow-lg md:bottom-6 md:right-6"
    >
      <p className="text-xs font-medium text-ink-mid">
        Paso {step + 1} de {TOUR_STEPS.length}
      </p>
      <h2 className="mt-1 text-base font-semibold">{current.title}</h2>
      <p className="mt-1 text-sm text-ink-mid">{current.body}</p>
      <div className="mt-3 flex items-center justify-between gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          Saltar
        </Button>
        <Button type="button" size="sm" onClick={next}>
          {last ? "Terminar" : "Siguiente →"}
        </Button>
      </div>
    </aside>
  );
}
