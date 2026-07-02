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
