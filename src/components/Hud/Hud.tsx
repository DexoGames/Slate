import type { GameState } from "../../engine/types";
import { prestigeTier } from "../../engine/score";
import { IconCritic, IconCrowd, IconLegacy, IconMoney } from "../../icons";
import { fmtMoney, fmtSeason } from "../../lib/format";
import { cx } from "../../lib/cx";
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
  const low = studio.cash < 10;
  return (
    <header className={styles.hud}>
      <button className={styles.brand} onClick={onDashboard}>
        SLATE<span className={styles.accent}>.</span>
      </button>
      <div className={styles.studio}>{studio.name}</div>
      <div className={styles.stats}>
        <span className={cx(styles.stat, styles.cash, low && styles.low)}>
          <IconMoney size={14} />
          {fmtMoney(studio.cash)}
        </span>
        <span className={styles.stat} title="Crowd reputation">
          <IconCrowd size={14} />
          {studio.reputation.crowd}
        </span>
        <span className={styles.stat} title="Prestige">
          <IconCritic size={14} />
          {studio.reputation.prestige}
        </span>
        <button
          className={cx(styles.stat, styles.legacy)}
          onClick={onVault}
          title="Legacy points — opens the Vault"
        >
          <IconLegacy size={14} />
          {studio.legacyPoints}
          <em>T{prestigeTier(studio.legacyPoints)}</em>
        </button>
      </div>
      <div className={styles.clock}>{fmtSeason(clock).toUpperCase()}</div>
    </header>
  );
}
