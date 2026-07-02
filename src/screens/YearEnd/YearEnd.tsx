import { Panel, SectionTitle } from "../../components/Bits/Bits";
import { Button } from "../../components/Button/Button";
import type { GameState } from "../../engine/types";
import { IconCritic, IconLegacy, IconMoney, IconTrophy } from "../../icons";
import { fmtMoney } from "../../lib/format";
import { cx } from "../../lib/cx";
import styles from "./YearEnd.module.css";

export function YearEnd({ game, onDone }: { game: GameState; onDone: () => void }) {
  const report = game.yearEnd;
  if (!report) return null;
  return (
    <div className={styles.wrap}>
      <p className={styles.kicker}>THE YEAR IN PICTURES</p>
      <h1 className={styles.year}>YEAR {report.year}</h1>

      {report.awards && (
        <Panel className={styles.block}>
          <SectionTitle>
            <IconTrophy size={12} /> THE AURIC AWARDS
          </SectionTitle>
          <div className={styles.categories}>
            {report.awards.categories.map((c) => (
              <div key={c.name} className={cx(styles.category, c.playerWon && styles.won)}>
                <span className={styles.catName}>{c.name}</span>
                <span className={styles.winner}>
                  “{c.winner.filmTitle}” — {c.winner.studio}
                  {c.playerWon && <b> · YOURS</b>}
                </span>
                <span className={styles.nominees}>
                  vs {c.nominees
                    .filter((n) => n.filmTitle !== c.winner.filmTitle)
                    .map((n) => `“${n.filmTitle}”`)
                    .join(", ") || "no field"}
                </span>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {report.legacyNews.length > 0 && (
        <Panel className={styles.block}>
          <SectionTitle>
            <IconLegacy size={12} /> THE LONG GAME
          </SectionTitle>
          <ul className={styles.news}>
            {report.legacyNews.map((n, i) => (
              <li key={i}>{n.text}</li>
            ))}
          </ul>
        </Panel>
      )}

      <Panel className={styles.block}>
        <SectionTitle>
          <IconMoney size={12} /> THE LEDGER
        </SectionTitle>
        <div className={styles.ledgerRow}>
          <span>
            Film revenue <b style={{ color: "var(--stat-money)" }}>{fmtMoney(report.revenue)}</b>
          </span>
          <span>
            Film costs <b style={{ color: "var(--danger)" }}>{fmtMoney(report.costs)}</b>
          </span>
          <span>
            In the bank <b>{fmtMoney(game.studio.cash)}</b>
          </span>
        </div>
      </Panel>

      <Panel className={styles.block}>
        <SectionTitle>
          <IconCritic size={12} /> STANDINGS
        </SectionTitle>
        <ol className={styles.standings}>
          {report.rivalStandings.map((s) => (
            <li key={s.name} className={cx(s.isPlayer && styles.player)}>
              <span>{s.name}</span>
              <span>{fmtMoney(s.money)} lifetime</span>
              <span>prestige {s.acclaim}</span>
            </li>
          ))}
        </ol>
      </Panel>

      <Button onClick={onDone}>ON TO YEAR {report.year + 1} ▸</Button>
    </div>
  );
}
