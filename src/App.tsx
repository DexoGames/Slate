import { useEffect, useRef, useState } from "react";
import { EventModal } from "./components/EventModal/EventModal";
import { Hud } from "./components/Hud/Hud";
import { NewsTicker } from "./components/NewsTicker/NewsTicker";
import { fmtSeason } from "./lib/format";
import type { GameMode } from "./engine/types";
import { Casting } from "./screens/Casting/Casting";
import { Dashboard } from "./screens/Dashboard/Dashboard";
import { FilmDetail } from "./screens/FilmDetail/FilmDetail";
import { GameOver } from "./screens/GameOver/GameOver";
import { Market } from "./screens/Market/Market";
import { Negotiation } from "./screens/Negotiation/Negotiation";
import { ReleaseNight } from "./screens/ReleaseNight/ReleaseNight";
import { Title } from "./screens/Title/Title";
import { Vault } from "./screens/Vault/Vault";
import { YearEnd } from "./screens/YearEnd/YearEnd";
import { clearGame } from "./state/persistence";
import { useGame } from "./state/useGame";
import styles from "./App.module.css";

type View =
  | { kind: "dashboard" }
  | { kind: "market" }
  | { kind: "film"; id: string }
  | { kind: "negotiation"; filmId: string }
  | { kind: "casting"; filmId: string }
  | { kind: "vault" };

export function App() {
  const { game, dispatch } = useGame();
  const [onTitle, setOnTitle] = useState(true);
  const [view, setView] = useState<View>({ kind: "dashboard" });
  const [interstitial, setInterstitial] = useState<string | null>(null);
  const lastClock = useRef<string | null>(null);

  // the turn's heartbeat: a brief season card when the clock moves quietly
  // (suppressed when a release night or year-end ceremony is queued)
  useEffect(() => {
    if (!game) return;
    const stamp = `${game.clock.year}-${game.clock.season}`;
    const prevStamp = lastClock.current;
    lastClock.current = stamp;
    if (prevStamp === null || prevStamp === stamp) return;
    if (game.screen !== "dashboard" || game.pendingEvents.length > 0) return;
    setInterstitial(fmtSeason(game.clock).toUpperCase());
    const t = setTimeout(() => setInterstitial(null), 700);
    return () => clearTimeout(t);
  }, [game]);

  if (!game || onTitle) {
    return (
      <Title
        hasSave={!!game && !game.gameOver}
        onContinue={() => setOnTitle(false)}
        onNew={(seed: number, mode: GameMode) => {
          clearGame();
          dispatch({ type: "NEW_GAME", seed, mode });
          setView({ kind: "dashboard" });
          setOnTitle(false);
        }}
      />
    );
  }

  // forced screens override local navigation
  const forced = game.screen;
  const releaseFilm =
    forced === "release-night" && game.releaseQueue.length > 0
      ? game.films[game.releaseQueue[0]]
      : null;

  const film =
    view.kind === "film" || view.kind === "negotiation" || view.kind === "casting"
      ? game.films[view.kind === "film" ? view.id : view.filmId]
      : null;

  const body = (() => {
    if (game.gameOver) {
      return (
        <GameOver
          game={game}
          onNewGame={() => setOnTitle(true)}
          onContinueEndless={() => dispatch({ type: "CONTINUE_ENDLESS" })}
        />
      );
    }
    if (releaseFilm) {
      return (
        <ReleaseNight
          film={releaseFilm}
          onDone={() => dispatch({ type: "DISMISS_RELEASE" })}
        />
      );
    }
    if (forced === "year-end" && game.yearEnd) {
      return <YearEnd game={game} onDone={() => dispatch({ type: "DISMISS_YEAR_END" })} />;
    }
    if (view.kind === "market") {
      return (
        <Market
          game={game}
          onBuy={(scriptId) => {
            dispatch({ type: "BUY_SCRIPT", scriptId });
            setView({ kind: "dashboard" });
          }}
          onBuyIP={(ipId) => dispatch({ type: "BUY_IP", ipId })}
          onBack={() => setView({ kind: "dashboard" })}
        />
      );
    }
    if (view.kind === "vault") {
      return (
        <Vault
          game={game}
          onBack={() => setView({ kind: "dashboard" })}
          onDevelopSequel={(franchiseId) => {
            dispatch({ type: "DEVELOP_SEQUEL", franchiseId });
            setView({ kind: "dashboard" });
          }}
        />
      );
    }
    if (view.kind === "negotiation" && film) {
      return (
        <Negotiation
          game={game}
          film={film}
          onHire={(directorId, decisions) => {
            dispatch({ type: "HIRE_DIRECTOR", filmId: film.id, directorId, decisions });
            setView({ kind: "film", id: film.id });
          }}
          onBack={() => setView({ kind: "film", id: film.id })}
        />
      );
    }
    if (view.kind === "casting" && film) {
      return (
        <Casting
          game={game}
          film={film}
          onCast={(cast, contractActorIds) => {
            dispatch({ type: "SET_CAST", filmId: film.id, cast, contractActorIds });
            setView({ kind: "film", id: film.id });
          }}
          onBack={() => setView({ kind: "film", id: film.id })}
        />
      );
    }
    if (view.kind === "film" && film) {
      return (
        <FilmDetail
          game={game}
          film={film}
          onBack={() => setView({ kind: "dashboard" })}
          onNegotiate={() => setView({ kind: "negotiation", filmId: film.id })}
          onCasting={() => setView({ kind: "casting", filmId: film.id })}
          onRewrite={(byFixer) => dispatch({ type: "REWRITE", filmId: film.id, byFixer })}
          onAbandon={() => {
            dispatch({ type: "ABANDON_FILM", filmId: film.id });
            setView({ kind: "dashboard" });
          }}
          onGreenlight={(budget, days, bond) =>
            dispatch({ type: "GREENLIGHT", filmId: film.id, budget, days, bond })
          }
          onSchedule={(dr, marketing, season, strategy, posture) => {
            dispatch({
              type: "SCHEDULE_RELEASE",
              filmId: film.id,
              deRisking: dr,
              marketing,
              season,
              strategy,
              posture,
            });
            setView({ kind: "dashboard" });
          }}
          onFestival={() => dispatch({ type: "SUBMIT_FESTIVAL", filmId: film.id })}
        />
      );
    }
    return (
      <Dashboard
        game={game}
        onOpenFilm={(id) => setView({ kind: "film", id })}
        onMarket={() => setView({ kind: "market" })}
        onAdvance={() => dispatch({ type: "ADVANCE_SEASON" })}
      />
    );
  })();

  const pending = game.pendingEvents[0];
  const pendingFilm = pending ? game.films[pending.filmId] : null;

  return (
    <div className={styles.shell}>
      <Hud
        game={game}
        onVault={() => setView({ kind: "vault" })}
        onDashboard={() => setView({ kind: "dashboard" })}
      />
      <main className={styles.main}>{body}</main>
      <NewsTicker news={game.newsLog} />
      {interstitial && (
        <div className={styles.interstitial} onClick={() => setInterstitial(null)}>
          <span>{interstitial}</span>
        </div>
      )}
      {pending && pendingFilm && !game.gameOver && (
        <EventModal
          event={pending}
          film={pendingFilm}
          onChoose={(choice) =>
            dispatch({
              type: "RESOLVE_EVENT",
              filmId: pending.filmId,
              eventId: pending.eventId,
              choice,
            })
          }
        />
      )}
    </div>
  );
}
