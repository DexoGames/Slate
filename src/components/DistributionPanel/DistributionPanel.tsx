import { useEffect, useRef, useState } from "react";
import type { OutcomeEstimate } from "../../engine/distribution";
import { TUNING } from "../../engine/tuning";
import { IconCritic, IconCrowd, IconLegacy, IconMoney } from "../../icons";
import { fmtMoney } from "../../lib/format";
import { VisionMeter } from "../VisionMeter/VisionMeter";
import { RangeBar } from "../RangeBar/RangeBar";
import styles from "./DistributionPanel.module.css";

/**
 * The always-visible consequences panel: four box plots + the vision meter.
 * Keeps a ghost of the previous estimate for ~1.5s after any change so every
 * toggle's cost is FELT.
 */
export function DistributionPanel({ estimate }: { estimate: OutcomeEstimate }) {
  const prev = useRef<OutcomeEstimate | null>(null);
  const [ghost, setGhost] = useState<OutcomeEstimate | null>(null);

  useEffect(() => {
    const last = prev.current;
    prev.current = estimate;
    if (!last) return;
    const axisChanged = (a: keyof OutcomeEstimate & ("money" | "crowd" | "critic" | "legacy")) =>
      last[a].median !== estimate[a].median ||
      last[a].min !== estimate[a].min ||
      last[a].max !== estimate[a].max;
    const changed =
      axisChanged("money") ||
      axisChanged("crowd") ||
      axisChanged("critic") ||
      axisChanged("legacy") ||
      last.vision !== estimate.vision;
    if (!changed) return;
    setGhost(last);
    const t = setTimeout(() => setGhost(null), 1500);
    return () => clearTimeout(t);
  }, [estimate]);

  const moneyLo = Math.min(estimate.money.min, ghost?.money.min ?? 0, -20);
  const moneyHi = Math.max(estimate.money.max, ghost?.money.max ?? 0, 40) * 1.1;

  return (
    <div className={styles.panel}>
      <h3 className={styles.title}>FORECAST</h3>
      <div className={styles.bars}>
        <RangeBar
          label="Money"
          icon={<IconMoney size={15} />}
          color="var(--stat-money)"
          domain={[moneyLo, moneyHi]}
          value={estimate.money}
          ghost={ghost?.money ?? null}
          format={fmtMoney}
        />
        <RangeBar
          label="Crowd"
          icon={<IconCrowd size={15} />}
          color="var(--stat-crowd)"
          domain={[0, 100]}
          value={estimate.crowd}
          ghost={ghost?.crowd ?? null}
        />
        <RangeBar
          label="Critics"
          icon={<IconCritic size={15} />}
          color="var(--stat-critic)"
          domain={[0, 100]}
          value={estimate.critic}
          ghost={ghost?.critic ?? null}
        />
        <RangeBar
          label="Legacy potential"
          icon={<IconLegacy size={15} />}
          color="var(--stat-legacy)"
          domain={[0, 100]}
          value={estimate.legacy}
          ghost={estimate.eligible ? ghost?.legacy ?? null : null}
          dead={!estimate.eligible}
          deadLabel="COMPROMISED"
        />
      </div>
      <VisionMeter value={estimate.vision} threshold={TUNING.vpEligibleAt} />
    </div>
  );
}
