import { useEffect, useRef, useState } from "react";
import type { OutcomeEstimate } from "../../engine/distribution";
import { TUNING } from "../../engine/tuning";
import { IconCritic, IconCrowd, IconLegacy, IconMoney } from "../../icons";
import { fmtMoney } from "../../lib/format";
import { VisionMeter } from "../VisionMeter/VisionMeter";
import { RangeBar } from "../RangeBar/RangeBar";
import styles from "./DistributionPanel.module.css";

/**
 * The always-visible consequences panel: four outcome range bars + the vision
 * meter. Keeps a ghost of the previous estimate for ~1.5s after any change so
 * every toggle's cost is FELT.
 */
export function DistributionPanel({ estimate }: { estimate: OutcomeEstimate }) {
  const prev = useRef<OutcomeEstimate | null>(null);
  const [ghost, setGhost] = useState<OutcomeEstimate | null>(null);

  useEffect(() => {
    const last = prev.current;
    prev.current = estimate;
    if (!last) return;
    const changed =
      last.money.expected !== estimate.money.expected ||
      last.money.floor !== estimate.money.floor ||
      last.money.ceiling !== estimate.money.ceiling ||
      last.crowd.expected !== estimate.crowd.expected ||
      last.critic.expected !== estimate.critic.expected ||
      last.legacy.expected !== estimate.legacy.expected ||
      last.vision !== estimate.vision;
    if (!changed) return;
    setGhost(last);
    const t = setTimeout(() => setGhost(null), 1500);
    return () => clearTimeout(t);
  }, [estimate]);

  const moneyLo = Math.min(estimate.money.floor, ghost?.money.floor ?? 0, -20);
  const moneyHi = Math.max(estimate.money.ceiling, ghost?.money.ceiling ?? 0, 40) * 1.15;

  return (
    <div className={styles.panel}>
      <h3 className={styles.title}>THE SHAPE OF THE BET</h3>
      <div className={styles.bars}>
        <RangeBar
          label="Money"
          icon={<IconMoney size={15} />}
          color="var(--stat-money)"
          domain={[moneyLo, moneyHi]}
          floor={estimate.money.floor}
          expected={estimate.money.expected}
          ceiling={estimate.money.ceiling}
          ghost={ghost?.money ?? null}
          format={fmtMoney}
        />
        <RangeBar
          label="Crowd"
          icon={<IconCrowd size={15} />}
          color="var(--stat-crowd)"
          domain={[0, 100]}
          floor={estimate.crowd.floor}
          expected={estimate.crowd.expected}
          ceiling={estimate.crowd.ceiling}
          ghost={ghost?.crowd ?? null}
        />
        <RangeBar
          label="Critics"
          icon={<IconCritic size={15} />}
          color="var(--stat-critic)"
          domain={[0, 100]}
          floor={estimate.critic.floor}
          expected={estimate.critic.expected}
          ceiling={estimate.critic.ceiling}
          ghost={ghost?.critic ?? null}
        />
        <RangeBar
          label="Legacy potential"
          icon={<IconLegacy size={15} />}
          color="var(--stat-legacy)"
          domain={[0, 100]}
          floor={estimate.legacy.floor}
          expected={estimate.legacy.expected}
          ceiling={estimate.legacy.ceiling}
          ghost={estimate.eligible ? ghost?.legacy ?? null : null}
          dead={!estimate.eligible}
          deadLabel="COMPROMISED"
        />
      </div>
      <VisionMeter value={estimate.vision} threshold={TUNING.vpEligibleAt} />
    </div>
  );
}
