import { useEffect, useState } from "react";
import { Button } from "../../components/Button/Button";
import { GenreTitle } from "../../components/GenreTitle/GenreTitle";
import type { EpilogueEntry, Film, GameState } from "../../engine/types";
import { IconLegacy, IconMoney } from "../../icons";
import { fmtMoney } from "../../lib/format";
import { cx } from "../../lib/cx";
import styles from "./Epilogue.module.css";

/** the "ten years later" retrospective ceremony (§8) */
export function Epilogue({ game, onDone }: { game: GameState; onDone: () => void }) {
  const [stage, setStage] = useState(0);
  const entries = game.gameOver?.epilogue ?? [];

  // the notable films: the best-remembered, plus the biggest earner
  const notable = [...entries].sort((a, b) => b.finalScore - a.finalScore).slice(0, 6);
  const biggest = game.studio.filmIds
    .map((id) => game.films[id])
    .filter((f): f is Film => !!f?.result)
    .reduce<Film | null>((best, f) => (best && best.result!.grossProfit >= f.result!.grossProfit ? best : f), null);
  const showBiggest = biggest && !notable.some((e) => e.filmId === biggest.id);
  const cardCount = notable.length + (showBiggest ? 1 : 0);

  useEffect(() => {
    setStage(0);
    // title → cards appear → legacy total → the button
    const times = [900, 2000, 2000 + cardCount * 260 + 500];
    const timers = times.map((t, i) => setTimeout(() => setStage(i + 1), t));
    return () => timers.forEach(clearTimeout);
  }, [cardCount]);

  const skip = () => setStage(3);

  return (
    <div className={styles.wrap} onClick={skip}>
      <p className={cx(styles.kicker, styles.in)}>THE BOOKS ARE CLOSED</p>
      <h1 className={cx(styles.title, styles.in)}>TEN YEARS LATER…</h1>

      {stage >= 1 && (
        <>
          <p className={cx(styles.sub, styles.in)}>
            {cardCount === 0
              ? "Nothing in the vault aged into anything. The lights are off; the reels are in a landfill."
              : "What the studio left behind, and how it was remembered."}
          </p>
          <div className={styles.shelf}>
            {notable.map((e, i) => (
              <PosterCard key={e.filmId} entry={e} delay={i * 0.26} />
            ))}
            {showBiggest && biggest && (
              <BiggestCard film={biggest} delay={notable.length * 0.26} />
            )}
          </div>
        </>
      )}

      {stage >= 2 && (
        <div className={cx(styles.total, styles.in)}>
          <span className={styles.totalHead}>
            <IconLegacy size={14} /> LEGACY, ALL TOLD
          </span>
          <CountUp target={game.studio.legacyPoints} />
        </div>
      )}

      {stage >= 3 && (
        <div className={cx(styles.done, styles.in)}>
          <Button onClick={onDone}>SEE THE FINAL SCORE</Button>
        </div>
      )}
    </div>
  );
}

function PosterCard({ entry, delay }: { entry: EpilogueEntry; delay: number }) {
  return (
    <div className={styles.poster} style={{ animationDelay: `${delay}s` }}>
      <GenreTitle as="h2" genre={entry.genre} className={styles.posterTitle}>
        {entry.title}
      </GenreTitle>
      <div className={styles.stamp} style={{ animationDelay: `${delay + 0.35}s` }}>
        {entry.tier}
      </div>
      <div className={styles.posterMeta}>
        <span className={styles.finalScore}>{entry.finalScore}</span>
        {entry.pointsGained > 0 && <span className={styles.pts}>+{entry.pointsGained} legacy</span>}
      </div>
      {entry.bestEventLabel && <p className={styles.note}>“{entry.bestEventLabel}.”</p>}
      {!entry.bestEventLabel && entry.worstEventLabel && (
        <p className={cx(styles.note, styles.noteBad)}>“{entry.worstEventLabel}.”</p>
      )}
    </div>
  );
}

function BiggestCard({ film, delay }: { film: Film; delay: number }) {
  return (
    <div className={cx(styles.poster, styles.biggest)} style={{ animationDelay: `${delay}s` }}>
      <GenreTitle as="h2" genre={film.genre} className={styles.posterTitle}>
        {film.title}
      </GenreTitle>
      <div className={cx(styles.stamp, styles.moneyStamp)} style={{ animationDelay: `${delay + 0.35}s` }}>
        BIGGEST HIT
      </div>
      <div className={styles.posterMeta}>
        <span className={styles.grosser}>
          <IconMoney size={13} /> {fmtMoney(film.result!.grossProfit)} gross
        </span>
      </div>
    </div>
  );
}

function CountUp({ target }: { target: number }) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const dur = 1100;
    let raf: number;
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / dur);
      setValue(Math.round(target * (1 - (1 - p) ** 3)));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return <span className={styles.totalValue}>{value}</span>;
}
