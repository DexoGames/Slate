import { Panel, SectionTitle, StatChip } from "../../components/Bits/Bits";
import { Button } from "../../components/Button/Button";
import { GenreTitle } from "../../components/GenreTitle/GenreTitle";
import { StagePips } from "../../components/StagePips/StagePips";
import { VisionMeter } from "../../components/VisionMeter/VisionMeter";
import { creditLeft, interestDue } from "../../engine/economy";
import { filmNeedsAction } from "../../engine/needs";
import { BUDGET_CLASS_LABELS, budgetClass } from "../../engine/schedule";
import {
  nextTierThreshold,
  prestigeTier,
  productionSlots,
  TIER_NUMERALS,
  tierName,
} from "../../engine/score";
import { GENRE_LABELS, TUNING } from "../../engine/tuning";
import type { Film, GameState } from "../../engine/types";
import { filmVision } from "../../engine/vision";
import {
  IconCalendar,
  IconChevron,
  IconCritic,
  IconCrowd,
  IconMoney,
  IconScript,
} from "../../icons";
import { fmtMoney, SEASON_NAMES } from "../../lib/format";
import { genreColor } from "../../lib/genreColor";
import { cx } from "../../lib/cx";
import styles from "./Dashboard.module.css";

export function Dashboard({
  game,
  onOpenFilm,
  onMarket,
  onAdvance,
}: {
  game: GameState;
  onOpenFilm: (id: string) => void;
  onMarket: () => void;
  onAdvance: () => void;
}) {
  const films = game.studio.filmIds
    .map((id) => game.films[id])
    .filter((f): f is Film => !!f);
  // films that need the player come first
  const active = films
    .filter((f) => f.stage !== "released")
    .sort((a, b) => Number(!!filmNeedsAction(b)) - Number(!!filmNeedsAction(a)));
  const slots = productionSlots(game.studio.legacyPoints);
  const inFlight = active.filter((f) => f.stage !== "development").length;
  const blocked = game.pendingEvents.length > 0;
  const tier = prestigeTier(game.studio.legacyPoints);
  const nextTh = nextTierThreshold(game.studio.legacyPoints);
  const nextSlots = nextTh !== null ? TUNING.slotsByTier[tier] : slots;

  return (
    <div className={styles.grid}>
      <div className={styles.left}>
        <SectionTitle>THE SLATE</SectionTitle>
        {active.length === 0 && (
          <Panel className={styles.empty}>
            <p>Nothing in development. Time to find a script.</p>
            <Button onClick={onMarket}>
              <IconScript size={14} /> Browse the script market
            </Button>
          </Panel>
        )}
        <div className={styles.cards}>
          {active.map((f) => {
            const need = filmNeedsAction(f);
            return (
              <button
                key={f.id}
                className={cx(styles.card, need && styles.cardNeeds)}
                style={{ borderTopColor: genreColor(f.genre) }}
                onClick={() => onOpenFilm(f.id)}
              >
                {need && <span className={styles.needBadge}>{need}</span>}
                <StagePips film={f} needsAction={!!need} />
                <GenreTitle genre={f.genre} className={styles.cardTitle}>
                  {f.title}
                </GenreTitle>
                <span className={styles.meta}>
                  <b style={{ color: genreColor(f.genre) }}>{GENRE_LABELS[f.genre]}</b>
                  {f.directorName ? ` · ${f.directorName}` : ""}
                </span>
                <div className={styles.chips}>
                  <StatChip icon={<IconMoney size={13} />} value={fmtMoney(f.budget)} color="var(--stat-money)" />
                  <span className={styles.budgetClass}>{BUDGET_CLASS_LABELS[budgetClass(f.budget)]}</span>
                  {f.release && (
                    <StatChip
                      icon={<IconCalendar size={13} />}
                      value={`${SEASON_NAMES[f.release.season.season]} ’${String(f.release.season.year).padStart(2, "0")}`}
                    />
                  )}
                </div>
                <VisionMeter value={filmVision(f)} threshold={TUNING.vpEligibleAt} />
                <span className={styles.open}>
                  OPEN <IconChevron size={11} />
                </span>
              </button>
            );
          })}
          {active.length > 0 && (
            <button className={cx(styles.card, styles.newCard)} onClick={onMarket}>
              <IconScript size={22} />
              <span>SCRIPT MARKET</span>
            </button>
          )}
        </div>
      </div>

      <div className={styles.right}>
        <Panel>
          <SectionTitle>THIS SEASON</SectionTitle>
          <p className={styles.slotLine}>
            Production slots: <b>{inFlight}/{slots}</b>
          </p>
          <p className={styles.overhead}>
            Overhead {fmtMoney(TUNING.overheadPerSeason + (slots - 1) * TUNING.overheadPerExtraSlot)}/season
          </p>
          <p className={styles.overhead}>
            Credit left <b className={styles.creditVal}>{fmtMoney(creditLeft(game))}</b>
            {interestDue(game) > 0 && (
              <span className={styles.interest}> · interest −{fmtMoney(interestDue(game))}/season</span>
            )}
          </p>
          {game.studio.promises.map((p) => (
            <p
              key={p.directorId}
              className={cx(styles.promise, game.clock.year >= p.byYear && styles.promiseDue)}
              title={`You owe ${p.directorName} a greenlight on “${p.scriptTitle}” by the end of year ${p.byYear}. Their script is in the market.`}
            >
              OWED: “{p.scriptTitle.toUpperCase()}” · BY Y{p.byYear}
            </p>
          ))}
          <Button className={styles.advance} onClick={onAdvance} disabled={blocked}>
            {blocked ? "RESOLVE PRODUCTION EVENTS" : `ADVANCE TO ${nextSeasonLabel(game)}`} <IconChevron size={13} />
          </Button>
        </Panel>
        <Panel>
          <SectionTitle>STUDIO STANDING</SectionTitle>
          <p className={styles.tierNow}>
            TIER {TIER_NUMERALS[tier - 1]} · {tierName(tier)}
          </p>
          {nextTh !== null ? (
            <p className={styles.tierNext}>
              NEXT: {nextSlots} PRODUCTION SLOT{nextSlots > 1 ? "S" : ""} + $
              {TUNING.credit.perTier}M CREDIT AT {nextTh} LEGACY PTS
            </p>
          ) : (
            <p className={styles.tierNext}>THE TOP OF THE TOWN. A dream factory.</p>
          )}
        </Panel>
        <Panel>
          <SectionTitle>STANDINGS</SectionTitle>
          <ul className={styles.standings}>
            {standings(game).map((s) => (
              <li key={s.name} className={cx(s.isPlayer && styles.player)}>
                <span className={styles.rname}>{s.name}</span>
                <span className={styles.rstat}>
                  <IconMoney size={11} /> {fmtMoney(s.money)}
                </span>
                <span className={styles.rstat}>
                  <IconCritic size={11} /> {s.acclaim}
                </span>
                <span className={styles.rstat}>
                  <IconCrowd size={11} /> {s.crowd}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}

function nextSeasonLabel(game: GameState): string {
  const s = game.clock.season;
  const label = SEASON_NAMES[(s + 1) % 4].toUpperCase();
  return s === 3 ? `${label} ’${String(game.clock.year + 1).padStart(2, "0")}` : label;
}

function standings(game: GameState) {
  const playerMoney = game.studio.filmIds.reduce(
    (sum, id) => sum + (game.films[id]?.result?.profit ?? 0),
    0,
  );
  return [
    {
      name: game.studio.name,
      money: playerMoney,
      acclaim: game.studio.reputation.prestige,
      crowd: game.studio.reputation.crowd,
      isPlayer: true,
    },
    ...game.rivals.map((r) => ({
      name: r.name,
      money: r.score.money,
      acclaim: Math.min(99, Math.round(50 + r.score.acclaim / 10)),
      crowd: 50,
      isPlayer: false,
    })),
  ].sort((a, b) => b.money - a.money);
}
