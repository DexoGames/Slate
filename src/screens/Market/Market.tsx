import { Panel, SectionTitle } from "../../components/Bits/Bits";
import { Button } from "../../components/Button/Button";
import { GENRE_LABELS } from "../../engine/tuning";
import type { GameState, Script } from "../../engine/types";
import { IconCritic, IconCrowd, IconFlame, IconScript, IconWriter } from "../../icons";
import { fmtMoney } from "../../lib/format";
import styles from "./Market.module.css";

/**
 * The spec market. Hook (orange) vs Ambition (blue) opposed bars telegraph the
 * money/art axis from the very first screen.
 */
export function Market({
  game,
  onBuy,
  onBack,
}: {
  game: GameState;
  onBuy: (scriptId: string) => void;
  onBack: () => void;
}) {
  const scripts = [...game.market.scripts].sort((a, b) => b.buzz - a.buzz);
  return (
    <div>
      <div className={styles.head}>
        <SectionTitle>THE SCRIPT MARKET</SectionTitle>
        <Button variant="secondary" onClick={onBack}>
          ← Slate
        </Button>
      </div>
      <div className={styles.grid}>
        {scripts.map((s) => (
          <ScriptCard
            key={s.id}
            script={s}
            canAfford={game.studio.cash >= s.askingPrice}
            hot={s.buzz >= 70}
            onBuy={() => onBuy(s.id)}
          />
        ))}
        {scripts.length === 0 && (
          <Panel>
            <p className={styles.empty}>
              The market is picked clean. New specs land every season.
            </p>
          </Panel>
        )}
      </div>
    </div>
  );
}

function ScriptCard({
  script,
  canAfford,
  hot,
  onBuy,
}: {
  script: Script;
  canAfford: boolean;
  hot: boolean;
  onBuy: () => void;
}) {
  return (
    <Panel className={styles.card}>
      <div className={styles.topRow}>
        <span className={styles.genre}>
          <IconScript size={12} /> {GENRE_LABELS[script.genre].toUpperCase()}
        </span>
        {hot && (
          <span className={styles.hot} title="Rivals are circling">
            <IconFlame size={12} /> HOT
          </span>
        )}
      </div>
      <h4 className={styles.title}>{script.title}</h4>
      <p className={styles.logline}>{script.logline}</p>
      <div className={styles.axes}>
        <div className={styles.axis} title="Hook — commercial concept strength">
          <IconCrowd size={12} />
          <div className={styles.track}>
            <div style={{ width: `${script.hook}%`, background: "var(--stat-crowd)" }} />
          </div>
          <b>{script.hook}</b>
        </div>
        <div className={styles.axis} title="Ambition — thematic depth. Money can't buy this.">
          <IconCritic size={12} />
          <div className={styles.track}>
            <div style={{ width: `${script.ambition}%`, background: "var(--stat-critic)" }} />
          </div>
          <b>{script.ambition}</b>
        </div>
      </div>
      <div className={styles.writerRow}>
        <IconWriter size={12} />
        <span>{script.writerName}</span>
        <span className={styles.coherence} title="Structural coherence">
          COH {script.coherence}
        </span>
      </div>
      <Button className={styles.buy} onClick={onBuy} disabled={!canAfford}>
        OPTION IT · {fmtMoney(script.askingPrice)}
      </Button>
    </Panel>
  );
}
