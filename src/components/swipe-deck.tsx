import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useTransform,
  useReducedMotion,
  type PanInfo,
} from "motion/react";
import { toast } from "sonner";
import { Ban, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IconText } from "@/components/icon-text";
import { keyDirection, swipeDirection, type SwipeDir } from "@/lib/swipe";

export type DeckLabels = Record<SwipeDir, string>;

/**
 * Tinder-style deck: drag right / left / up (or ← → ↑, or the buttons) to decide.
 * Decisions commit after a short undo window (Z or «Deshacer»), so nothing happens by accident.
 */
export function SwipeDeck<T extends { id: string }>({
  items,
  labels,
  render,
  onCommit,
  done,
  undoMs = 5000,
  keyboard = true,
  wordButtons,
  intercept,
}: {
  items: T[];
  /** One set for every card, or one per card (strategic suggestions say «Aceptar» instead of «Hacer»). */
  labels: DeckLabels | ((item: T) => DeckLabels);
  render: (item: T) => ReactNode;
  onCommit: (item: T, dir: SwipeDir) => Promise<void> | void;
  done?: ReactNode;
  undoMs?: number;
  /** Arrow keys and Z; off where the page needs arrows to scroll (Inicio). */
  keyboard?: boolean;
  /** Cards that say what each button does in words (Aceptar, Más tarde, Descartar) instead of ✕ and ✓. */
  wordButtons?: (item: T) => boolean;
  /** Return true to handle a decision yourself (e.g. open a form first): the card stays in the deck and nothing commits. */
  intercept?: (item: T, dir: SwipeDir) => boolean;
}) {
  const labelsOf = (i: T): DeckLabels => (typeof labels === "function" ? labels(i) : labels);
  const [gone, setGone] = useState<Map<string, SwipeDir>>(new Map());
  const [exit, setExit] = useState<SwipeDir>("right");
  const [stats, setStats] = useState({ right: 0, left: 0, up: 0 });
  // The stack takes the height of its top card (plus the peek of the cards behind), so a short card leaves no gap.
  const [topH, setTopH] = useState(0);
  const total = useRef(0);
  const visible = items.filter((i) => !gone.has(i.id));
  total.current = Math.max(total.current, items.length);
  const current = visible[0];
  const last = useRef<{ id: string; cancel: () => void } | null>(null);

  function decide(dir: SwipeDir) {
    if (!current) return;
    const item = current;
    if (intercept?.(item, dir)) return;
    setExit(dir);
    setGone((g) => new Map(g).set(item.id, dir));
    setStats((s) => ({ ...s, [dir]: s[dir] + 1 }));
    let cancelled = false;
    const undo = () => {
      cancelled = true;
      setGone((g) => {
        const n = new Map(g);
        n.delete(item.id);
        return n;
      });
      setStats((s) => ({ ...s, [dir]: Math.max(0, s[dir] - 1) }));
      toast.dismiss(tid);
    };
    last.current = { id: item.id, cancel: undo };
    const timer = setTimeout(() => {
      if (cancelled) return;
      if (last.current?.id === item.id) last.current = null;
      void Promise.resolve(onCommit(item, dir)).catch(() => undo());
    }, undoMs);
    const tid = toast(labelsOf(item)[dir], {
      duration: undoMs,
      action: {
        label: "Deshacer",
        onClick: () => {
          clearTimeout(timer);
          undo();
        },
      },
    });
    last.current.cancel = () => {
      clearTimeout(timer);
      undo();
    };
  }

  useEffect(() => {
    if (!keyboard) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName))) return;
      if (e.key === "z" || e.key === "Z") {
        last.current?.cancel();
        last.current = null;
        return;
      }
      const d = keyDirection(e.key);
      if (d) {
        e.preventDefault();
        decide(d);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const decided = total.current - visible.length;
  return (
    <div className="mx-auto w-full max-w-xl">
      <div className="mb-3 flex items-center justify-between text-xs text-ink-mid">
        <span>{current ? `${decided + 1} de ${total.current}` : "Todo decidido"}</span>
        {keyboard && (
          <span className="hidden sm:inline">← descartar · ↑ más tarde · → hacer · Z deshacer</span>
        )}
      </div>
      <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-paper-sunk">
        <motion.div
          className="h-full rounded-full bg-lime"
          animate={{ width: `${total.current ? (decided / total.current) * 100 : 100}%` }}
          transition={{ duration: 0.25 }}
        />
      </div>
      <div
        className="relative"
        style={
          current
            ? { minHeight: topH ? topH + Math.min(visible.length - 1, 2) * 12 : 220 }
            : undefined
        }
      >
        <AnimatePresence initial={false} custom={exit}>
          {visible
            .slice(0, 3)
            .reverse()
            .map((item, i, arr) => {
              const depth = arr.length - 1 - i;
              return (
                <DeckCard
                  key={item.id}
                  depth={depth}
                  labels={labelsOf(item)}
                  onDecide={decide}
                  exitDir={exit}
                  onHeight={depth === 0 ? setTopH : undefined}
                >
                  {render(item)}
                </DeckCard>
              );
            })}
        </AnimatePresence>
        {!current && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl border bg-card p-8 text-center shadow-sm"
          >
            <p className="font-display text-3xl">Todo decidido</p>
            <p className="mt-2 text-sm text-ink-mid">
              {stats.right} hechas · {stats.up} para más tarde · {stats.left} descartadas
            </p>
            {done}
          </motion.div>
        )}
      </div>
      {current && wordButtons?.(current) && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <Button variant="outline" className="rounded-full px-5" onClick={() => decide("left")}>
            {labelsOf(current)["left"]}
          </Button>
          <Button variant="outline" className="rounded-full px-5" onClick={() => decide("up")}>
            {labelsOf(current)["up"]}
          </Button>
          <Button className="rounded-full px-6" onClick={() => decide("right")}>
            {labelsOf(current)["right"]}
          </Button>
        </div>
      )}
      {current && !wordButtons?.(current) && (
        <div className="mt-5 flex items-center justify-center gap-4">
          <Button
            variant="outline"
            size="lg"
            className="h-12 rounded-full px-5"
            onClick={() => decide("left")}
          >
            <IconText icon={Ban}>{labelsOf(current)["left"]}</IconText>
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="h-11 rounded-full px-5"
            aria-label={labelsOf(current)["up"]}
            onClick={() => decide("up")}
          >
            Más tarde
          </Button>
          <Button size="lg" className="h-12 rounded-full px-5" onClick={() => decide("right")}>
            <IconText icon={Check}>{labelsOf(current)["right"]}</IconText>
          </Button>
        </div>
      )}
    </div>
  );
}

function DeckCard({
  children,
  depth,
  labels,
  onDecide,
  exitDir,
  onHeight,
}: {
  onHeight?: (h: number) => void;
  children: ReactNode;
  depth: number;
  labels: DeckLabels;
  onDecide: (d: SwipeDir) => void;
  exitDir: SwipeDir;
}) {
  const reduce = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-240, 240], [-12, 12]);
  const doOpacity = useTransform(x, [20, 110], [0, 1]);
  const noOpacity = useTransform(x, [-110, -20], [1, 0]);
  const laterOpacity = useTransform(y, [-110, -20], [1, 0]);
  const top = depth === 0;
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = box.current;
    if (!el || !onHeight) return;
    onHeight(el.offsetHeight);
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => onHeight(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, [onHeight]);
  function onDragEnd(_: unknown, info: PanInfo) {
    const d = swipeDirection(info.offset.x, info.offset.y, info.velocity.x, info.velocity.y);
    if (d) onDecide(d);
  }
  const fly = {
    right: { x: 600, y: 0, rotate: 18 },
    left: { x: -600, y: 0, rotate: -18 },
    up: { x: 0, y: -600, rotate: 0 },
  }[exitDir];
  return (
    <motion.div
      ref={box}
      className="absolute inset-x-0 top-0 touch-none select-none"
      style={top ? { x, y, rotate, zIndex: 10 } : { zIndex: 10 - depth }}
      initial={{ scale: 0.92, y: 24, opacity: 0 }}
      animate={{ scale: 1 - depth * 0.04, y: depth * 12, opacity: depth > 1 ? 0.6 : 1 }}
      exit={reduce ? { opacity: 0 } : { ...fly, opacity: 0, transition: { duration: 0.28 } }}
      transition={{ type: "spring", stiffness: 380, damping: 32 }}
      drag={top}
      dragSnapToOrigin
      dragElastic={0.7}
      onDragEnd={top ? onDragEnd : undefined}
      whileDrag={{ cursor: "grabbing" }}
    >
      <div className="relative cursor-grab overflow-hidden rounded-2xl border bg-card shadow-md">
        {top && (
          <>
            <motion.span
              style={{ opacity: doOpacity }}
              className="pointer-events-none absolute left-6 top-1/2 z-10 -translate-y-1/2 -rotate-6 rounded-lg border-2 border-lime bg-lime px-3 py-1 text-xl font-semibold text-lime-foreground"
            >
              {labels.right}
            </motion.span>
            <motion.span
              style={{ opacity: noOpacity }}
              className="pointer-events-none absolute right-6 top-1/2 z-10 -translate-y-1/2 rotate-6 rounded-lg border-2 border-state-alarm bg-card px-3 py-1 text-xl font-semibold text-state-alarm"
            >
              {labels.left}
            </motion.span>
            <motion.span
              style={{ opacity: laterOpacity }}
              className="pointer-events-none absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-lg border-2 border-foreground bg-card px-3 py-1 text-xl font-semibold"
            >
              {labels.up}
            </motion.span>
          </>
        )}
        {children}
      </div>
    </motion.div>
  );
}
