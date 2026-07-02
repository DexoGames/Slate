import type { ReactNode } from "react";
import { cx } from "../../lib/cx";
import styles from "./RangeBar.module.css";

export interface RangeBarProps {
  label: string;
  icon: ReactNode;
  /** CSS colour for this axis (a var() reference) */
  color: string;
  domain: [number, number];
  floor: number;
  expected: number;
  ceiling: number;
  /** previous values, rendered as a ghost for decision diffing */
  ghost?: { floor: number; expected: number; ceiling: number } | null;
  format?: (n: number) => string;
  /** dashed & dimmed, e.g. an ineligible legacy bar */
  dead?: boolean;
  deadLabel?: string;
}

/**
 * The signature UI element: a horizontal outcome-range bar. The box spans
 * floor→ceiling, the tick marks the expected value; toggling any decision
 * visibly widens/narrows the box against a ghost of the previous state.
 */
export function RangeBar({
  label,
  icon,
  color,
  domain,
  floor,
  expected,
  ceiling,
  ghost,
  format,
  dead,
  deadLabel,
}: RangeBarProps) {
  const [lo, hi] = domain;
  const pct = (v: number) => `${Math.max(0, Math.min(100, ((v - lo) / (hi - lo)) * 100))}%`;
  const width = (a: number, b: number) =>
    `${Math.max(0.5, Math.min(100, ((b - a) / (hi - lo)) * 100))}%`;
  const fmt = format ?? ((n: number) => String(Math.round(n)));

  return (
    <div className={cx(styles.row, dead && styles.dead)}>
      <span className={styles.icon} style={{ color }}>
        {icon}
      </span>
      <div className={styles.main}>
        <div className={styles.labels}>
          <span className={styles.label}>{label}</span>
          {dead ? (
            <span className={styles.deadLabel}>{deadLabel ?? "INELIGIBLE"}</span>
          ) : (
            <span className={styles.values}>
              {fmt(floor)} <em>· {fmt(expected)} ·</em> {fmt(ceiling)}
            </span>
          )}
        </div>
        <div className={styles.track}>
          {ghost && !dead && (
            <div
              className={styles.ghost}
              style={{ left: pct(ghost.floor), width: width(ghost.floor, ghost.ceiling) }}
            />
          )}
          {!dead && (
            <>
              <div
                className={styles.box}
                style={{
                  left: pct(floor),
                  width: width(floor, ceiling),
                  background: color,
                }}
              />
              <div className={styles.tick} style={{ left: pct(expected) }} />
            </>
          )}
          {dead && <div className={styles.deadline} />}
        </div>
      </div>
    </div>
  );
}
