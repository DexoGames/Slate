import type { ReactNode } from "react";
import { cx } from "../../lib/cx";
import styles from "./Bits.module.css";

/** icon + value chip — the atom of the icon-first information design */
export function StatChip({
  icon,
  value,
  label,
  color,
  title,
}: {
  icon: ReactNode;
  value: ReactNode;
  label?: string;
  color?: string;
  title?: string;
}) {
  return (
    <span className={styles.chip} style={color ? { color } : undefined} title={title ?? label}>
      {icon}
      <b>{value}</b>
      {label && <em>{label}</em>}
    </span>
  );
}

/** a single labelled magnitude bar — the workhorse for "compare this stat across
 *  ten boxes at a glance" (craft, appeal, fame, fit …). Colour carries meaning. */
export function StatBar({
  label,
  value,
  max = 100,
  color = "var(--bone)",
  icon,
  hint,
}: {
  label: string;
  value: number;
  max?: number;
  color?: string;
  icon?: ReactNode;
  hint?: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className={styles.bar} title={hint ?? label}>
      <span className={styles.barLabel}>
        {icon}
        {label}
      </span>
      <div className={styles.barTrack}>
        <div className={styles.barFill} style={{ width: `${pct}%`, background: color }} />
      </div>
      <b className={styles.barVal} style={{ color }}>
        {Math.round(value)}
      </b>
    </div>
  );
}

/** a bar carrying an *estimate* and its uncertainty: a faded band shows the
 *  range the town might be wrong by (narrower the better you know them), a solid
 *  tick marks the best guess. Says "this is a guess" visually, so no card has to
 *  print the word every time. */
export function BandBar({
  label,
  est,
  band,
  color = "var(--bone)",
  max = 100,
  icon,
  hint,
}: {
  label: string;
  est: number;
  band: number;
  color?: string;
  max?: number;
  icon?: ReactNode;
  hint?: string;
}) {
  const clamp = (n: number) => Math.max(0, Math.min(max, n));
  const p = (v: number) => (clamp(v) / max) * 100;
  const lo = p(est - band);
  const hi = p(est + band);
  return (
    <div className={styles.bar} title={hint ?? `${label}, as the town estimates it`}>
      <span className={styles.barLabel}>
        {icon}
        {label}
      </span>
      <div className={styles.barTrack}>
        <div
          className={styles.bandFuzz}
          style={{ left: `${lo}%`, width: `${Math.max(2, hi - lo)}%`, background: color }}
        />
        <div className={styles.bandTick} style={{ left: `${p(est)}%`, background: color }} />
      </div>
      <b className={styles.barVal} style={{ color }}>
        ~{Math.round(est)}
      </b>
    </div>
  );
}

/** the appeal-vs-craft double bar that makes every actor's trade-off legible */
export function DualBar({
  a,
  b,
  aLabel,
  bLabel,
  aColor = "var(--stat-money)",
  bColor = "var(--stat-critic)",
}: {
  a: number;
  b: number;
  aLabel: string;
  bLabel: string;
  aColor?: string;
  bColor?: string;
}) {
  return (
    <div className={styles.dual}>
      <div className={styles.dualRow}>
        <span className={styles.dualLabel}>{aLabel}</span>
        <div className={styles.dualTrack}>
          <div style={{ width: `${a}%`, background: aColor }} />
        </div>
        <span className={styles.dualVal}>{a}</span>
      </div>
      <div className={styles.dualRow}>
        <span className={styles.dualLabel}>{bLabel}</span>
        <div className={styles.dualTrack}>
          <div style={{ width: `${b}%`, background: bColor }} />
        </div>
        <span className={styles.dualVal}>{b}</span>
      </div>
    </div>
  );
}

/** small uppercase section header with the orange underline accent */
export function SectionTitle({ children }: { children: ReactNode }) {
  return <h3 className={styles.section}>{children}</h3>;
}

/** flame icons for demand weight */
export function Weight({ n }: { n: 1 | 2 | 3 }) {
  return (
    <span className={styles.weight} title={`They care: ${n}/3`}>
      {"▲".repeat(n)}
      <i>{"▲".repeat(3 - n)}</i>
    </span>
  );
}

export function Panel({
  children,
  className,
  tone,
}: {
  children: ReactNode;
  className?: string;
  tone?: "default" | "orange" | "danger";
}) {
  return (
    <div
      className={cx(
        styles.panel,
        tone === "orange" && styles.panelOrange,
        tone === "danger" && styles.panelDanger,
        className,
      )}
    >
      {children}
    </div>
  );
}
