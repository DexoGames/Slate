import { stageIndex } from "../../engine/needs";
import type { Film } from "../../engine/types";
import { cx } from "../../lib/cx";
import styles from "./StagePips.module.css";

const LABELS = ["DEV", "SHOOT", "POST", "DATED", "OUT"];

/**
 * Where a film is in its life, at a glance: five pips, filled to the current
 * stage. The current pip pulses when the film is waiting on the player.
 */
export function StagePips({ film, needsAction }: { film: Film; needsAction: boolean }) {
  const current = stageIndex(film);
  return (
    <div className={styles.strip} aria-label={`Stage: ${LABELS[current]}`}>
      {LABELS.map((label, i) => (
        <span key={label} className={styles.step}>
          <i
            className={cx(
              styles.pip,
              i < current && styles.done,
              i === current && styles.current,
              i === current && needsAction && styles.needs,
            )}
          />
          <em className={cx(styles.label, i === current && styles.labelOn)}>{label}</em>
        </span>
      ))}
    </div>
  );
}
