import { Panel, SectionTitle, StatChip } from "../../components/Bits/Bits";
import { Button } from "../../components/Button/Button";
import { VisionMeter } from "../../components/VisionMeter/VisionMeter";
import { productionSlots } from "../../engine/score";
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
import { cx } from "../../lib/cx";
import styles from "./Dashboard.module.css";

const STAGE_LABEL: Record<Film["stage"], string> = {
  development: "IN DEVELOPMENT",
  production: "SHOOTING",
  post: "IN POST",
  scheduled: "SCHEDULED",
  released: "RELEASED",
};

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
  const active = films.filter((f) => f.stage !== "released");
  const slots = productionSlots(game.studio.legacyPoints);
  const inFlight = active.filter((f) => f.stage !== "development").length;
  const blocked = game.pendingEvents.length > 0;

  return (
    <div className={styles.grid}>
      <div className={styles.left}>
        <SectionTitle>THE SLATE</SectionTitle>
        {active.length === 0 && (
          <Panel className={styles.empty}>
            <p>Nothing in development. A studio with no films is just a very sad landlord.</p>
            <Button onClick={onMarket}>
              <IconScript size={14} /> Browse the script market
            </Button>
          </Panel>
        )}
        <div className={styles.cards}>
          {active.map((f) => (
            <button key={f.id} className={styles.card} onClick={() => onOpenFilm(f.id)}>
              <span className={styles.stage}>{STAGE_LABEL[f.stage]}</span>
              <span className={styles.cardTitle}>{f.title}</span>
              <span className={styles.meta}>
                {GENRE_LABELS[f.genre]}
                {f.directorName ? ` · ${f.directorName}` : " · no director"}
              </span>
              <div className={styles.chips}>
                <StatChip icon={<IconMoney size={13} />} value={fmtMoney(f.budget)} color="var(--stat-money)" />
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
          ))}
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
          <Button className={styles.advance} onClick={onAdvance} disabled={blocked}>
            {blocked ? "RESOLVE PRODUCTION EVENTS" : `ADVANCE TO ${nextSeasonLabel(game)}`} <IconChevron size={13} />
          </Button>
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
