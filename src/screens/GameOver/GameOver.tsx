import { useState } from "react";
import { scenarioById } from "../../data/scenarios";
import { Panel } from "../../components/Bits/Bits";
import { Button } from "../../components/Button/Button";
import { TUNING } from "../../engine/tuning";
import type { Film, GameState } from "../../engine/types";
import { IconCritic, IconLegacy, IconMoney, IconTrophy } from "../../icons";
import styles from "./GameOver.module.css";

function shareText(game: GameState): string {
  const films = game.studio.filmIds
    .map((id) => game.films[id])
    .filter((f): f is Film => !!f && f.stage === "released");
  const classics = films.filter(
    (f) => (f.legacy?.finalScore ?? 0) >= TUNING.legacyThresholds.classic,
  ).length;
  const profit = Math.round(films.reduce((s, f) => s + (f.result?.profit ?? 0), 0));
  const score = game.gameOver?.score;
  const years = game.clock.year - 1;
  return [
    `SLATE — ${game.studio.name.toUpperCase()}`,
    score
      ? `${years} years · score ${score.total} · ${score.grade}`
      : `${years} years · bankrupt`,
    `${films.length} films · ${profit >= 0 ? "+" : ""}$${profit}M · ${classics} classic${classics === 1 ? "" : "s"} · ${game.studio.legacyPoints} legacy`,
    `slate.dexo.games`,
  ].join("\n");
}

export function GameOver({
  game,
  onNewGame,
  onContinueEndless,
}: {
  game: GameState;
  onNewGame: () => void;
  onContinueEndless: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const over = game.gameOver;
  if (!over) return null;
  const score = over.score;
  const bankrupt = over.reason === "bankrupt";
  const scenario =
    game.mode.kind === "scenario" ? scenarioById(game.mode.scenarioId) : undefined;
  const scenarioWon = scenario ? scenario.won(game) && !bankrupt : false;

  const copy = () => {
    navigator.clipboard?.writeText(shareText(game)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    });
  };

  return (
    <div className={styles.wrap}>
      <p className={styles.kicker}>
        {bankrupt ? "CHAPTER 11" : scenario ? scenario.name.toUpperCase() : "THE FINAL REEL"}
      </p>
      <h1 className={styles.title}>
        {bankrupt
          ? "THE MONEY RAN OUT"
          : scenario
            ? scenarioWon
              ? "YOU DID IT"
              : "TIME'S UP"
            : "THAT'S A WRAP."}
      </h1>
      {scenario && !bankrupt && (
        <p className={styles.scenarioVerdict}>
          {scenarioWon ? scenario.winText : scenario.loseText}
        </p>
      )}
      {score && (
        <>
          <div className={styles.grade}>
            <span className={styles.total}>{score.total}</span>
            <span className={styles.gradeLabel}>{score.grade}</span>
          </div>
          <div className={styles.parts}>
            <span>
              <IconMoney size={14} /> {score.parts.profit} <em>money</em>
            </span>
            <span>
              <IconCritic size={14} /> {score.parts.prestige} <em>prestige</em>
            </span>
            <span>
              <IconLegacy size={14} /> {score.parts.legacy} <em>legacy</em>
            </span>
            <span>
              <IconTrophy size={14} /> {score.parts.awards} <em>awards</em>
            </span>
          </div>
          <Panel className={styles.obituary}>
            <p>{score.obituary}</p>
          </Panel>
        </>
      )}
      <pre className={styles.share}>{shareText(game)}</pre>
      <div className={styles.actions}>
        <Button variant="secondary" onClick={copy}>
          {copied ? "COPIED" : "COPY RESULT"}
        </Button>
        {!bankrupt && !scenario && (
          <Button onClick={onContinueEndless}>KEEP THE LIGHTS ON (ENDLESS)</Button>
        )}
        <Button variant={bankrupt || scenario ? "primary" : "secondary"} onClick={onNewGame}>
          NEW STUDIO
        </Button>
      </div>
    </div>
  );
}
