import type { GameState } from "../../engine/types";
import { studioBrand } from "../../engine/publicity";
import { nextTierThreshold, prestigeTier, TIER_NUMERALS, tierName } from "../../engine/score";
import { TUNING } from "../../engine/tuning";
import { IconCritic, IconCrowd, IconLegacy, IconMoney } from "../../icons";
import { fmtMoney, fmtSeason } from "../../lib/format";
import { cx } from "../../lib/cx";
import { Ticker } from "../Ticker/Ticker";
import styles from "./Hud.module.css";

export function Hud({
  game,
  onVault,
  onDashboard,
}: {
  game: GameState;
  onVault: () => void;
  onDashboard: () => void;
}) {
  const { studio, clock } = game;
  const inDebt = studio.cash < 0;
  const low = studio.cash < 10;
  // tier standing + progress to the next reclassification (§10)
  const tier = prestigeTier(studio.legacyPoints);
  const nextTh = nextTierThreshold(studio.legacyPoints);
  const prevTh = TUNING.tierThresholds[tier - 1];
  const tierProgress =
    nextTh === null ? 1 : (studio.legacyPoints - prevTh) / (nextTh - prevTh);
  const slots = TUNING.slotsByTier[tier - 1];
  const perkTip =
    `TIER ${TIER_NUMERALS[tier - 1]} · ${tierName(tier)} — ` +
    `${slots} production slot${slots > 1 ? "s" : ""}, +$${TUNING.credit.perTier * (tier - 1)}M credit` +
    (nextTh === null ? " · top of the town" : ` · next tier at ${nextTh} legacy pts`);
  return (
    <header className={styles.hud}>
      <button className={styles.brand} onClick={onDashboard}>
        SLATE<span className={styles.accent}>.</span>
      </button>
      <div className={styles.studio}>
        {studio.name}
        <em className={styles.brand} title="Your brand">
          {studioBrand(game).label}
        </em>
      </div>
      <div className={styles.stats}>
        <span className={cx(styles.stat, styles.cash, low && styles.low)}>
          <IconMoney size={14} />
          <Ticker value={studio.cash} format={fmtMoney} />
          {inDebt && <em className={styles.debtTag}>DEBT</em>}
        </span>
        <span className={styles.stat} title="Crowd reputation">
          <IconCrowd size={14} />
          {studio.reputation.crowd}
        </span>
        <span className={styles.stat} title="Prestige">
          <IconCritic size={14} />
          {studio.reputation.prestige}
        </span>
        <button className={cx(styles.stat, styles.legacy)} onClick={onVault} title={perkTip}>
          <span className={styles.legacyTop}>
            <IconLegacy size={14} />
            {studio.legacyPoints}
            <em className={styles.tierChip}>
              T{TIER_NUMERALS[tier - 1]} · {tierName(tier)}
            </em>
          </span>
          <span className={styles.tierBar}>
            <span
              className={styles.tierBarFill}
              style={{ width: `${Math.round(Math.max(0, Math.min(1, tierProgress)) * 100)}%` }}
            />
          </span>
        </button>
      </div>
      <div className={styles.clock}>{fmtSeason(clock).toUpperCase()}</div>
    </header>
  );
}
