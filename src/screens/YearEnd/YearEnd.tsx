import { useEffect, useRef, useState } from "react";
import { Panel, SectionTitle } from "../../components/Bits/Bits";
import { Button } from "../../components/Button/Button";
import { tierName } from "../../engine/score";
import type { AwardsCeremony as AwardsCeremonyData, GameState } from "../../engine/types";
import { IconCritic, IconLegacy, IconMoney, IconTrophy } from "../../icons";
import { fmtMoney } from "../../lib/format";
import { cx } from "../../lib/cx";
import styles from "./YearEnd.module.css";

export function YearEnd({ game, onDone }: { game: GameState; onDone: () => void }) {
  const report = game.yearEnd;
  // the awards play as an animated ceremony first, then the ledger view
  const [showLedger, setShowLedger] = useState(!report?.awards);
  if (!report) return null;

  if (report.awards && !showLedger) {
    return <AwardsCeremony awards={report.awards} onDone={() => setShowLedger(true)} />;
  }

  return (
    <div className={styles.wrap}>
      <p className={styles.kicker}>THE YEAR IN PICTURES</p>
      <h1 className={styles.year}>YEAR {report.year}</h1>

      {report.tierUp !== undefined && (
        <div className={styles.tierStamp}>
          RECLASSIFIED · {tierName(report.tierUp)}
        </div>
      )}

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
                  “{c.winner.filmTitle}” · {c.winner.studio}
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

/**
 * The awards ceremony (§9): per category the nominees fade in, an envelope beat
 * ("AND THE WINNER IS…"), then the winner stamps in — gold flash and a "YOURS"
 * burst when you took it. Click advances; a rapid double-click skips the lot.
 */
function AwardsCeremony({
  awards,
  onDone,
}: {
  awards: AwardsCeremonyData;
  onDone: () => void;
}) {
  const cats = awards.categories;
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const lastClick = useRef(0);
  const cat = cats[index];

  useEffect(() => {
    setRevealed(false);
    // let the nominees fade in, hold the envelope beat, then reveal the winner
    const delay = 1400 + cat.nominees.length * 250;
    const t = setTimeout(() => setRevealed(true), delay);
    return () => clearTimeout(t);
  }, [index, cat.nominees.length]);

  const finish = () => onDone();
  const onClick = () => {
    const now = Date.now();
    if (now - lastClick.current < 350) {
      finish(); // a rapid second click skips the whole ceremony
      return;
    }
    lastClick.current = now;
    if (!revealed) {
      setRevealed(true);
    } else if (index + 1 < cats.length) {
      setIndex(index + 1);
    } else {
      finish();
    }
  };

  return (
    <div className={styles.ceremony} onClick={onClick}>
      <p className={styles.ceremonyKicker}>THE AURIC AWARDS · {awards.year}</p>
      <h2 className={styles.ceremonyCat}>{cat.name}</h2>
      <div className={styles.nomList}>
        {cat.nominees.map((n, i) => (
          <div
            key={`${n.filmTitle}-${i}`}
            className={cx(
              styles.nominee,
              revealed && n.filmTitle === cat.winner.filmTitle && styles.nomineeWon,
              revealed && n.filmTitle !== cat.winner.filmTitle && styles.nomineeFade,
            )}
            style={{ animationDelay: `${i * 0.25}s` }}
          >
            “{n.filmTitle}” <em>{n.studio}</em>
          </div>
        ))}
      </div>
      {!revealed ? (
        <p className={styles.envelope}>AND THE WINNER IS…</p>
      ) : (
        <div className={cx(styles.winnerStamp, cat.playerWon && styles.winnerYours)}>
          “{cat.winner.filmTitle}”
          {cat.playerWon && <span className={styles.burst}>YOURS</span>}
        </div>
      )}
      <div className={styles.dots}>
        {cats.map((c, i) => (
          <i
            key={c.name}
            className={cx(styles.dot, i === index && styles.dotOn, i < index && styles.dotDone)}
          />
        ))}
      </div>
      <p className={styles.skipHint}>click to advance · double-click to skip</p>
    </div>
  );
}
