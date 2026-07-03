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
              <b>THE LOOP.</b> Pick up a script, hire a director, cast it, set the
              budget and schedule, then greenlight. After the shoot you choose a
              release window and how hard to push it. Each turn is a season, and
              four seasons make a year.
            </p>
            <p>
              <b>THE BET.</b> Every choice reshapes the forecast. Grant a director's
              demands and the range gets wider and the ceiling higher. Deny them and
              it narrows and caps out. A bigger budget sharpens the filmmaking, but
              it won't put ambition into a script that never had it.
            </p>
            <p>
              <b>VISION.</b> Test screenings, reshoots, focus-grouped marketing, and
              denied demands all chip away at a film's Vision. Drop below the line
              and it's compromised, so it can't earn Legacy no matter how it does at
              the box office.
            </p>
            <p>
              <b>LEGACY.</b> The one thing that builds over time. It settles in the
              eight years after release, off the film's ambition and how much of its
              vision survived. You can't play it safe into a classic; the careful
              films are usually the ones nobody remembers.
            </p>
            <p>
              <b>DON'T DIE.</b> Overhead comes out every season. If you have a film
              scheduled, the bank will cover a small shortfall at interest. Run dry
              with nothing coming and you get one library sale to stay open. After
              that you're done.
            </p>
            <p>
              <b>FRANCHISES.</b> A film that makes money and lands with audiences
              becomes a franchise, and adaptation and remake rights turn up in the
              market too. A known name is safer to open, but each new instalment
              raises expectations and tires the audience out. Auteurs will only take
              your sequel if you agree to back their passion project first. Break
              that promise and word gets around.
            </p>
            <p>
              <b>THE NOISE.</b> How loud you go (QUIET, STANDARD, EVENT) sets the
              opening and the bar the film has to clear. Oversell an EVENT and word
              of mouth dies fast. Sneak out a quiet one that beats expectations and
              you have a sleeper. The Meridian Festival each spring is the one place
              to buy some critical buzz before release.
            </p>
            <p>
              <b>PEOPLE.</b> A multi-film deal locks in a rate and keeps rivals from
              poaching, until a star outgrows the contract and starts holding out on
              set. Cheap risky stars come with a catch: when a scandal hits, you
              stand by them or drop them, and people remember which.
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
          <b>ACCLAIM</b> comes from crowds and critics, who rarely agree.
        </div>
        <div>
          <b>LEGACY</b> arrives years later, only for films whose vision survived to
          release.
        </div>
      </div>
      <p className={styles.footer}>
        a <a href="https://www.dexo.games" target="_blank" rel="noopener noreferrer">dexo.games</a> project
      </p>
    </div>
  );
}
