import { Panel, SectionTitle } from "../../components/Bits/Bits";
import { Button } from "../../components/Button/Button";
import { GenreTitle } from "../../components/GenreTitle/GenreTitle";
import { canAfford, scriptAllIn } from "../../engine/economy";
import { GENRE_LABELS } from "../../engine/tuning";
import { genreColor } from "../../lib/genreColor";
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
  onBuyIP,
  onBack,
}: {
  game: GameState;
  onBuy: (scriptId: string) => void;
  onBuyIP: (ipId: string) => void;
  onBack: () => void;
}) {
  // most relevant first: scripts you owe a greenlight on, then what the market
  // wants right now, then raw buzz
  const promisedIds = new Set(game.studio.promises.map((p) => p.scriptId));
  const rank = (s: Script) =>
    (promisedIds.has(s.id) ? 10000 : 0) +
    (s.genre === game.trends.hot || s.subGenre === game.trends.hot ? 400 : 0) +
    s.buzz;
  const scripts = [...game.market.scripts].sort((a, b) => rank(b) - rank(a));
  return (
    <div>
      <div className={styles.head}>
        <SectionTitle>THE SCRIPT MARKET</SectionTitle>
        <Button variant="secondary" onClick={onBack}>
          ← Slate
        </Button>
      </div>
      {game.market.ips.length > 0 && (
        <div className={styles.ipRow}>
          {game.market.ips.map((l) => (
            <Panel key={l.ip.id} className={styles.ipCard} tone="orange">
              <span className={styles.ipKind}>
                {l.ip.kind === "remake" ? "REMAKE RIGHTS" : "ADAPTATION RIGHTS"} ·{" "}
                <b style={{ color: genreColor(l.ip.genre) }}>{GENRE_LABELS[l.ip.genre].toUpperCase()}</b>
              </span>
              <GenreTitle as="h4" genre={l.ip.genre} className={styles.title}>
                {l.ip.name}
              </GenreTitle>
              <p className={styles.logline}>{l.blurb}</p>
              <span className={styles.ipStats}>
                AWARENESS {l.ip.awareness} · FANS EXPECT {l.ip.expectation}
                {l.ip.fatigue > 0 && ` · FATIGUE ${l.ip.fatigue}`}
              </span>
              <Button
                variant="spendMinor"
                onClick={() => onBuyIP(l.ip.id)}
                disabled={!canAfford(game, l.price)}
              >
                {fmtMoney(l.price)}
              </Button>
            </Panel>
          ))}
        </div>
      )}
      <div className={styles.grid}>
        {scripts.map((s) => (
          <ScriptCard
            key={s.id}
            script={s}
            affordable={canAfford(game, s.askingPrice)}
            allIn={scriptAllIn(game, s.genre, s.askingPrice)}
            hot={s.buzz >= 70}
            trend={
              s.genre === game.trends.hot || s.subGenre === game.trends.hot
                ? "hot"
                : s.genre === game.trends.cold || s.subGenre === game.trends.cold
                  ? "cold"
                  : null
            }
            promisedBy={game.studio.promises.find((p) => p.scriptId === s.id)?.byYear}
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
  affordable,
  allIn,
  hot,
  trend,
  promisedBy,
  onBuy,
}: {
  script: Script;
  affordable: boolean;
  allIn: number;
  hot: boolean;
  trend: "hot" | "cold" | null;
  /** deadline year of a passion-project promise attached to this script */
  promisedBy?: number;
  onBuy: () => void;
}) {
  return (
    <Panel className={styles.card}>
      <span
        className={styles.genreStripe}
        style={{
          background: script.subGenre
            ? `linear-gradient(90deg, ${genreColor(script.genre)} 50%, ${genreColor(script.subGenre)} 50%)`
            : genreColor(script.genre),
        }}
      />
      <div className={styles.topRow}>
        <span className={styles.genre} style={{ color: genreColor(script.genre) }}>
          <IconScript size={12} /> {GENRE_LABELS[script.genre].toUpperCase()}
          {script.subGenre && (
            <em style={{ color: genreColor(script.subGenre), fontStyle: "normal" }}>
              {" "}+ {GENRE_LABELS[script.subGenre].toUpperCase()}
            </em>
          )}
          {trend === "hot" && (
            <b className={styles.trendHot} title="The market wants this right now">▲</b>
          )}
          {trend === "cold" && (
            <b className={styles.trendCold} title="The market is tired of this: cheaper, weaker openings">▼</b>
          )}
        </span>
        {promisedBy !== undefined ? (
          <span
            className={styles.promised}
            title={`You promised ${script.writerName} a greenlight by the end of year ${promisedBy}. Break it and word gets around.`}
          >
            OWED · Y{promisedBy}
          </span>
        ) : (
          hot && (
            <span className={styles.hot} title="Rivals are circling">
              <IconFlame size={12} /> HOT
            </span>
          )
        )}
      </div>
      <GenreTitle as="h4" genre={script.genre} className={styles.title}>
        {script.title}
      </GenreTitle>
      <p className={styles.logline}>{script.logline}</p>
      <div className={styles.axes}>
        <div className={styles.axis} title="Hook: how commercial the idea is">
          <IconCrowd size={12} />
          <div className={styles.track}>
            <div style={{ width: `${script.hook}%`, background: "var(--stat-crowd)" }} />
          </div>
          <b>{script.hook}</b>
        </div>
        <div className={styles.axis} title="Ambition: how far the script reaches">
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
      <div className={styles.buyRow}>
        <span className={styles.allIn} title="Rough total cost to make and release a film in this genre">
          ALL-IN ~{fmtMoney(allIn)}
        </span>
        <Button variant="spendMinor" className={styles.buy} onClick={onBuy} disabled={!affordable}>
          {fmtMoney(script.askingPrice)}
        </Button>
      </div>
    </Panel>
  );
}
