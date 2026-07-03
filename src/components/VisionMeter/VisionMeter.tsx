import { useEffect, useRef, useState } from "react";
import type { VisionEntry } from "../../engine/types";
import { IconVision } from "../../icons";
import { cx } from "../../lib/cx";
import styles from "./VisionMeter.module.css";

/**
 * Vision Preservation as a cream bar that visibly chips away. When VP drops,
 * the lost segment "cracks off" (flashes danger-red before settling into the
 * hatched void). The 50-line is marked: below it the film is COMPROMISED and
 * can never earn Legacy.
 */
export function VisionMeter({
  value,
  threshold,
  ledger,
  big,
}: {
  value: number;
  threshold: number;
  ledger?: VisionEntry[];
  big?: boolean;
}) {
  const compromised = value < threshold;
  const prev = useRef(value);
  const [crack, setCrack] = useState<{ from: number; to: number } | null>(null);

  useEffect(() => {
    const last = prev.current;
    prev.current = value;
    if (value >= last) return;
    setCrack({ from: value, to: last });
    const t = setTimeout(() => setCrack(null), 700);
    return () => clearTimeout(t);
  }, [value]);

  return (
    <div className={cx(styles.wrap, big && styles.big)}>
      <div className={styles.head}>
        <span className={styles.label}>
          <IconVision size={13} /> VISION
        </span>
        <span className={cx(styles.value, compromised && styles.badValue)}>
          {Math.round(value)}
          {compromised && " · COMPROMISED"}
        </span>
      </div>
      <div className={styles.track}>
        <div className={styles.fill} style={{ width: `${Math.min(100, value)}%` }} />
        {crack && (
          <div
            className={styles.crack}
            style={{
              left: `${Math.min(100, crack.from)}%`,
              width: `${Math.min(100, crack.to) - Math.min(100, crack.from)}%`,
            }}
          />
        )}
        <div className={styles.gate} style={{ left: `${threshold}%` }} />
      </div>
      {big && (
        <div className={styles.gateLabel} style={{ paddingLeft: `${threshold}%` }}>
          ← LEGACY ELIGIBILITY
        </div>
      )}
      {ledger && ledger.length > 0 && (
        <ul className={styles.ledger}>
          {ledger.map((e, i) => (
            <li key={i} className={cx(styles.entry, e.delta > 0 && styles.credit)}>
              <span>{e.label}</span>
              <span>{e.delta > 0 ? `+${e.delta}` : e.delta}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
