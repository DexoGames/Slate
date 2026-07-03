import type { ReactNode } from "react";
import type { AxisEstimate } from "../../engine/distribution";
import { cx } from "../../lib/cx";
import styles from "./RangeBar.module.css";

export interface RangeBarProps {
  label: string;
  icon: ReactNode;
  /** CSS colour for this axis (a var() reference) */
  color: string;
  domain: [number, number];
  value: AxisEstimate;
  /** previous values, rendered as a ghost for decision diffing */
  ghost?: AxisEstimate | null;
  format?: (n: number) => string;
  /** dashed & dimmed, e.g. an ineligible legacy bar */
  dead?: boolean;
  deadLabel?: string;
}

/**
 * The forecast bar: a box plot. Whisker min→max, solid box q1→q3, tick at the
 * median. Toggling any decision visibly reshapes it against a ghost of the
 * previous state — the cost of every choice is felt, not read.
 */
export function RangeBar({
  label,
  icon,
  color,
  domain,
  value,
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
            <span className={styles.values} title="min · lower quartile · median · upper quartile · max">
              {fmt(value.min)} · {fmt(value.q1)} <em>· {fmt(value.median)} ·</em> {fmt(value.q3)} · {fmt(value.max)}
            </span>
          )}
        </div>
        <div className={styles.track}>
          {ghost && !dead && (
            <>
              <div
                className={styles.ghostWhisker}
                style={{ left: pct(ghost.min), width: width(ghost.min, ghost.max) }}
              />
              <div
                className={styles.ghost}
                style={{ left: pct(ghost.q1), width: width(ghost.q1, ghost.q3) }}
              />
            </>
          )}
          {!dead && (
            <>
              <div
                className={styles.whisker}
                style={{ left: pct(value.min), width: width(value.min, value.max), background: color }}
              />
              <div
                className={styles.box}
                style={{ left: pct(value.q1), width: width(value.q1, value.q3), background: color }}
              />
              <div className={styles.tick} style={{ left: pct(value.median) }} />
            </>
          )}
          {dead && <div className={styles.deadline} />}
        </div>
      </div>
    </div>
  );
}
