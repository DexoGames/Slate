import { useEffect, useState } from "react";
import { Button } from "../../components/Button/Button";
import { VERDICT_LABELS } from "../../engine/release";
import type { Film } from "../../engine/types";
import { IconCritic, IconCrowd, IconLegacy } from "../../icons";
import { fmtMoney } from "../../lib/format";
import { cx } from "../../lib/cx";
import styles from "./ReleaseNight.module.css";

function pullQuote(kind: "crowd" | "critic", score: number): string {
  if (kind === "crowd") {
    if (score >= 85) return "“I have already bought tickets to see it again.”";
    if (score >= 70) return "“Worth every penny of the babysitter.”";
    if (score >= 55) return "“Pretty good! Long, though.”";
    if (score >= 40) return "“It was fine. The parking was a nightmare.”";
    return "“We left when the projector was still on.”";
  }
  if (score >= 85) return "“A masterpiece. Full stop, end of review.”";
  if (score >= 70) return "“Thrillingly alive — the rare studio picture with a pulse.”";
  if (score >= 55) return "“Ambitious, uneven, worth your time.”";
  if (score >= 40) return "“Competent, anonymous, forgotten by dinner.”";
  return "“One star, and that's for the catering in the lobby scene.”";
}

function legacyLine(band: [number, number], eligible: boolean): string {
  if (!eligible) return "COMPROMISED — this one will not be remembered.";
  const mid = (band[0] + band[1]) / 2;
  if (mid >= 65) return "Early cult murmurs. People are already arguing about it.";
  if (mid >= 45) return "A certain kind of person is going to love this in ten years.";
  if (mid >= 25) return "Time will tell. Time usually shrugs.";
  return "Instantly forgotten, pending appeal.";
}

export function ReleaseNight({ film, onDone }: { film: Film; onDone: () => void }) {
  const [stage, setStage] = useState(0);
  const result = film.result;

  useEffect(() => {
    setStage(0);
    const times = [600, 1700, 2800, 3900, 4800];
    const timers = times.map((t, i) => setTimeout(() => setStage(i + 1), t));
    return () => timers.forEach(clearTimeout);
  }, [film.id]);

  if (!result || !film.legacy) return null;
  const isStreaming = film.release?.strategy === "streaming";

  return (
    <div className={styles.wrap} onClick={() => setStage(5)}>
      <p className={cx(styles.kicker, styles.in)}>
        {isStreaming ? "NOW STREAMING" : "OPENING NIGHT"}
      </p>
      <h1 className={cx(styles.marquee, styles.in)}>{film.title}</h1>

      {stage >= 1 && (
        <div className={cx(styles.money, styles.in)}>
          {isStreaming ? (
            <>
              <span className={styles.moneyLabel}>FLAT SALE</span>
              <span className={styles.moneyValue}>{fmtMoney(result.streaming)}</span>
            </>
          ) : (
            <>
              <span className={styles.moneyLabel}>OPENING WEEKEND</span>
              <CountUp target={result.opening} />
            </>
          )}
        </div>
      )}

      {stage >= 2 && (
        <div className={styles.reviews}>
          <div className={cx(styles.review, styles.crowdReview, styles.in)}>
            <span className={styles.reviewHead}>
              <IconCrowd size={14} /> CROWDS · {result.crowdScore}
            </span>
            <p>{pullQuote("crowd", result.crowdScore)}</p>
          </div>
          <div className={cx(styles.review, styles.criticReview, styles.in)} style={{ animationDelay: "0.4s" }}>
            <span className={styles.reviewHead}>
              <IconCritic size={14} /> CRITICS · {result.criticScore}
            </span>
            <p>{pullQuote("critic", result.criticScore)}</p>
          </div>
        </div>
      )}

      {stage >= 3 && (
        <div className={cx(styles.verdict, styles.stamp)}>
          {VERDICT_LABELS[result.verdict]}
          <span className={styles.profit}>
            {result.profit >= 0 ? "+" : ""}
            {fmtMoney(result.profit)} net
          </span>
        </div>
      )}

      {stage >= 4 && (
        <div className={cx(styles.legacySignal, styles.in)}>
          <span className={styles.legacyHead}>
            <IconLegacy size={13} /> THE LONG GAME
          </span>
          {film.legacy.eligible ? (
            <div className={styles.band}>
              <div
                className={styles.bandFill}
                style={{
                  left: `${film.legacy.signalBand[0]}%`,
                  width: `${Math.max(2, film.legacy.signalBand[1] - film.legacy.signalBand[0])}%`,
                }}
              />
            </div>
          ) : (
            <div className={styles.compromised}>COMPROMISED</div>
          )}
          <p className={styles.legacyLine}>{legacyLine(film.legacy.signalBand, film.legacy.eligible)}</p>
        </div>
      )}

      {stage >= 5 && (
        <div className={cx(styles.done, styles.in)}>
          <Details film={film} />
          <Button onClick={onDone}>CONTINUE</Button>
        </div>
      )}
    </div>
  );
}

function CountUp({ target }: { target: number }) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const dur = 900;
    let raf: number;
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / dur);
      setValue(target * (1 - (1 - p) ** 3));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return <span className={styles.moneyValue}>{fmtMoney(value)}</span>;
}

function Details({ film }: { film: Film }) {
  const [open, setOpen] = useState(false);
  const result = film.result!;
  return (
    <div className={styles.details}>
      <button className={styles.detailsToggle} onClick={() => setOpen(!open)}>
        {open ? "▲ WHY DID THIS HAPPEN" : "▼ WHY DID THIS HAPPEN"}
      </button>
      {open && (
        <div className={styles.breakdowns}>
          {result.breakdown.map((b) => (
            <div key={b.label} className={styles.breakdown}>
              <b>{b.label}</b>
              <ul>
                <li>
                  <span>base</span>
                  <span>{b.base}</span>
                </li>
                {b.modifiers
                  .filter((m) => m.value !== 0)
                  .map((m) => (
                    <li key={m.name}>
                      <span>{m.name}</span>
                      <span>
                        {m.value > 0 ? "+" : ""}
                        {m.value}
                      </span>
                    </li>
                  ))}
                {b.noise !== 0 && (
                  <li className={styles.noise}>
                    <span>the roll</span>
                    <span>
                      {b.noise > 0 ? "+" : ""}
                      {b.noise}
                    </span>
                  </li>
                )}
                <li className={styles.final}>
                  <span>final</span>
                  <span>{b.final}</span>
                </li>
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
