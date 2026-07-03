import { useState } from "react";
import { SCENARIOS } from "../../data/scenarios";
import { Button } from "../../components/Button/Button";
import { Modal } from "../../components/Modal/Modal";
import { randomSeed } from "../../engine/newGame";
import { TUNING } from "../../engine/tuning";
import type { GameMode } from "../../engine/types";
import styles from "./Title.module.css";

export function Title({
  hasSave,
  onContinue,
  onNew,
}: {
  hasSave: boolean;
  onContinue: () => void;
  onNew: (seed: number, mode: GameMode) => void;
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showScenarios, setShowScenarios] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [seedText, setSeedText] = useState("");

  const seed = () => {
    const parsed = parseInt(seedText, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : randomSeed();
  };
  const start = () => {
    onNew(seed(), { kind: "campaign", lengthYears: TUNING.campaignYears });
  };

  return (
    <div className={styles.wrap}>
      <p className={styles.kicker}>A FILM STUDIO MANAGEMENT SIM</p>
      <h1 className={styles.logo}>
        SLATE<span className={styles.accent}>.</span>
      </h1>
      <p className={styles.tag}>
        Money buys quality. It never buys taste.
      </p>
      <div className={styles.actions}>
        {hasSave && (
          <Button onClick={onContinue}>Continue</Button>
        )}
        <Button variant={hasSave ? "secondary" : "primary"} onClick={start}>
          New campaign · {TUNING.campaignYears} years
        </Button>
        <Button variant="secondary" onClick={() => setShowScenarios(!showScenarios)}>
          Scenarios
        </Button>
        <Button variant="secondary" onClick={() => setShowHelp(true)}>
          How to play
        </Button>
      </div>
      {showScenarios && (
        <div className={styles.scenarios}>
          {SCENARIOS.map((sc) => (
            <button
              key={sc.id}
              className={styles.scenario}
              onClick={() =>
                onNew(seed(), { kind: "scenario", scenarioId: sc.id, lengthYears: sc.years })
              }
            >
              <b>
                {sc.name.toUpperCase()} <em>· {sc.years} YEARS · {sc.runtime}</em>
              </b>
              <span>{sc.blurb}</span>
            </button>
          ))}
        </div>
      )}
      {showHelp && (
        <Modal title="HOW TO PLAY" onClose={() => setShowHelp(false)} wide>
          <div className={styles.help}>
            <p>
              <b>THE LOOP.</b> Option a script, negotiate a director's demands, cast,
              set budget and days, greenlight — then choose your safety tools and a
              release window. Each turn is one season; four seasons make a year.
            </p>
            <p>
              <b>THE BET.</b> Every decision reshapes the outcome bars. Granting a
              director's demands widens the range and raises the ceiling; denying
              them narrows and caps it. Money can buy execution — it cannot buy
              ambition.
            </p>
            <p>
              <b>VISION.</b> Test screenings, reshoots, focus-grouped marketing and
              denied demands all chip the cream Vision bar. Fall below the gold line
              and the film is COMPROMISED: it can never earn Legacy, no matter what
              it grosses.
            </p>
            <p>
              <b>LEGACY.</b> The only score that compounds. It resolves over eight
              years after release, seeded by ambition and surviving vision — and its
              dice can never be loaded. The safest films are the least likely to
              become classics.
            </p>
            <p>
              <b>DON'T DIE.</b> Overhead ticks every season. A scheduled film lets
              the bank bridge a small overdraft (at interest). Run out entirely and
              you get exactly one library sale. Then it's over.
            </p>
            <p>
              <b>FRANCHISES.</b> A profitable, loved film mints an IP; adaptations
              and remake rights appear in the market. Awareness is bankable safety —
              but every instalment raises the bar and tires the audience, and
              auteurs only do your sequel if you promise to greenlight their weird
              thing. Break that promise and the town hears about it.
            </p>
            <p>
              <b>THE NOISE.</b> Marketing posture (QUIET / STANDARD / EVENT) sets
              both the opening and the bar the film is judged against —
              under-deliver on an EVENT and the legs collapse; over-deliver quietly
              and you have a sleeper. The Meridian Festival each Spring is the only
              critic heat money can buy before release.
            </p>
            <p>
              <b>PEOPLE.</b> Multi-film contracts lock a rate and block rival
              poaching — until a star's price outgrows the paper and they hold out
              on set. Risky stars are cheap for a reason: when the scandal breaks,
              you stand by them or cut them loose, and everyone remembers which.
            </p>
          </div>
        </Modal>
      )}
      <button className={styles.advancedToggle} onClick={() => setShowAdvanced(!showAdvanced)}>
        {showAdvanced ? "▲ ADVANCED" : "▼ ADVANCED"}
      </button>
      {showAdvanced && (
        <div className={styles.advanced}>
          <label className={styles.seedLabel}>
            SEED
            <input
              className={styles.seedInput}
              value={seedText}
              onChange={(e) => setSeedText(e.target.value)}
              placeholder="random"
              inputMode="numeric"
            />
          </label>
        </div>
      )}
      <div className={styles.rules}>
        <div>
          <b>MONEY</b> keeps the lights on. Run out and it's over.
        </div>
        <div>
          <b>ACCLAIM</b> comes in two currencies — crowds and critics — that rarely
          pay out together.
        </div>
        <div>
          <b>LEGACY</b> arrives years late, only for films whose vision survived
          your own safety tools.
        </div>
      </div>
      <p className={styles.footer}>
        a <a href="https://www.dexo.games" target="_blank" rel="noopener noreferrer">dexo.games</a> project
      </p>
    </div>
  );
}
