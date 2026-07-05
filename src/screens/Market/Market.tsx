import { useState } from "react";
import { Panel } from "../../components/Bits/Bits";
import { Button } from "../../components/Button/Button";
import { GenreTitle } from "../../components/GenreTitle/GenreTitle";
import { canAfford, scriptAllIn } from "../../engine/economy";
import { filmsTogether, yourPeople } from "../../engine/roster";
import { GENRE_LABELS, TUNING } from "../../engine/tuning";
import { genreColor } from "../../lib/genreColor";
import type { GameState, Script } from "../../engine/types";
import { IconCritic, IconCrowd, IconFlame, IconScript, IconWriter } from "../../icons";
import { fmtMoney } from "../../lib/format";
import { cx } from "../../lib/cx";
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
  const [tab, setTab] = useState<"scripts" | "people">("scripts");
  const promisedIds = new Set(game.studio.promises.map((p) => p.scriptId));
  const rank = (s: Script) =>
    (promisedIds.has(s.id) ? 10000 : 0) +
    (s.genre === game.trends.hot || s.subGenre === game.trends.hot ? 400 : 0) +
    s.buzz;
  const scripts = [...game.market.scripts].sort((a, b) => rank(b) - rank(a));
  const peopleCount = yourPeople(game).length;
  return (
    <div>
      <div className={styles.head}>
        <div className={styles.tabs}>
          <button
            className={cx(styles.tab, tab === "scripts" && styles.tabOn)}
            onClick={() => setTab("scripts")}
          >
            THE SCRIPT MARKET
          </button>
          <button
            className={cx(styles.tab, tab === "people" && styles.tabOn)}
            onClick={() => setTab("people")}
          >
            YOUR PEOPLE {peopleCount > 0 && <em>{peopleCount}</em>}
          </button>
        </div>
        <Button variant="secondary" onClick={onBack}>
          ← Slate
        </Button>
      </div>
      {tab === "people" && <YourPeople game={game} />}
      {tab === "scripts" && (
        <>
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
        </>
      )}
    </div>
  );
}

/** the roster you've built: rapport, films together, contracts, chemistry (§3) */
function YourPeople({ game }: { game: GameState }) {
  const nameOf = (id: string): { name: string; kind: string } => {
    const d = game.market.directors.find((x) => x.id === id);
    if (d) return { name: d.name, kind: "director" };
    const a = game.market.actors.find((x) => x.id === id);
    if (a) return { name: a.name, kind: "actor" };
    const w = game.market.writers.find((x) => x.id === id);
    if (w) return { name: w.name, kind: "writer" };
    for (const fid of game.studio.filmIds) {
      const f = game.films[fid];
      if (!f) continue;
      if (f.directorId === id) return { name: f.directorName, kind: "director" };
      const slot = f.cast.find((c) => c.actorId === id);
      if (slot) return { name: slot.actorName, kind: "actor" };
    }
    return { name: "", kind: "person" };
  };

  const rows = yourPeople(game)
    .map((id) => {
      const info = nameOf(id);
      const rel = game.studio.relationships[id] ?? 0;
      const together = filmsTogether(game, id);
      const contract = game.studio.contracts[id];
      const partners = Object.entries(game.studio.pairChemistry)
        .filter(([k]) => k.split("|").includes(id))
        .map(([k, v]) => ({ name: nameOf(k.split("|").find((x) => x !== id)!).name, value: v }))
        .filter((p) => p.name && Math.abs(p.value) > TUNING.chemistry.deadZone);
      return { id, ...info, rel, together, contract, partners };
    })
    .filter((r) => r.name)
    .sort((a, b) => b.rel + b.together * 5 - (a.rel + a.together * 5));

  if (rows.length === 0) {
    return (
      <Panel>
        <p className={styles.empty}>
          You haven't worked with anyone yet. Hire, cast, and re-team — the people
          you build a rapport with are yours to grow.
        </p>
      </Panel>
    );
  }

  return (
    <div className={styles.peopleGrid}>
      {rows.map((r) => (
        <Panel key={r.id} className={styles.personCard}>
          <div className={styles.personHead}>
            <b className={styles.personName}>{r.name}</b>
            <span className={styles.personKind}>{r.kind}</span>
          </div>
          <div className={styles.personStats}>
            {r.rel !== 0 && (
              <span className={styles.personRapport}>♥ {r.rel > 0 ? `+${r.rel}` : r.rel}</span>
            )}
            {r.together > 0 && (
              <span>
                {r.together} film{r.together > 1 ? "s" : ""} together
              </span>
            )}
            {r.contract && (
              <span className={styles.personContract}>
                CONTRACT · {r.contract.filmsLeft} film{r.contract.filmsLeft > 1 ? "s" : ""} left
              </span>
            )}
          </div>
          {r.partners.length > 0 && (
            <div className={styles.personChem}>
              {r.partners.map((p) => (
                <span
                  key={p.name}
                  className={cx(styles.chemTag, p.value > 0 ? styles.chemTagGood : styles.chemTagBad)}
                >
                  {p.value > 0 ? "⚡" : "💥"} {p.name.split(" ")[0]} {p.value > 0 ? `+${p.value}` : p.value}
                </span>
              ))}
            </div>
          )}
        </Panel>
      ))}
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
