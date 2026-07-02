import { useEffect, useMemo, useReducer } from "react";
import type { GameState } from "../engine/types";
import { gameReducer, type Action } from "./gameReducer";
import { loadGame, saveGame } from "./persistence";

/** Sentinel pre-game state: `null` game means we're on the title screen. */
type Shell = { game: GameState | null };

function shellReducer(shell: Shell, action: Action): Shell {
  if (action.type === "NEW_GAME" || action.type === "LOAD") {
    return { game: gameReducer(shell.game ?? ({} as GameState), action) };
  }
  if (!shell.game) return shell;
  return { game: gameReducer(shell.game, action) };
}

export function useGame() {
  const [shell, dispatch] = useReducer(shellReducer, undefined, () => ({
    game: loadGame(),
  }));

  // autosave on every state change
  useEffect(() => {
    if (shell.game) saveGame(shell.game);
  }, [shell.game]);

  return useMemo(
    () => ({ game: shell.game, dispatch: dispatch as (a: Action) => void }),
    [shell.game],
  );
}
