import { useEffect, useRef, useState } from "react";
import { cx } from "../../lib/cx";
import styles from "./Ticker.module.css";

/**
 * A number that counts between values instead of jumping, with a brief
 * green/red flash for direction. Spending should never be a silent swap.
 */
export function Ticker({
  value,
  format,
  flash = true,
  duration = 500,
}: {
  value: number;
  format: (n: number) => string;
  flash?: boolean;
  duration?: number;
}) {
  const [shown, setShown] = useState(value);
  const [pulse, setPulse] = useState<"up" | "down" | null>(null);
  const prev = useRef(value);

  useEffect(() => {
    const from = prev.current;
    prev.current = value;
    if (from === value) return;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setShown(value);
      return;
    }
    if (flash) {
      setPulse(value > from ? "up" : "down");
      setTimeout(() => setPulse(null), 700);
    }
    const start = performance.now();
    let raf: number;
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      setShown(from + (value - from) * (1 - (1 - p) ** 3));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, duration, flash]);

  return (
    <span className={cx(pulse === "up" && styles.up, pulse === "down" && styles.down)}>
      {format(shown)}
    </span>
  );
}
