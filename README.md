# SLATE.

A film-studio management sim for the browser — live at [slate.dexo.games](https://slate.dexo.games).

You run a studio. Each season you option scripts, negotiate directors' demands, cast stars,
set budgets, pick your safety tools and release windows — and then the dice roll twice:
once on opening night, and once, slowly, over the eight years that decide whether anyone
remembers the film at all.

**The rule the whole game is built on: money buys quality, never taste.**

- **Money** keeps the lights on. Bankruptcy ends the run (you get one library sale).
- **Acclaim** comes in two currencies — crowds and critics — that rarely pay out together.
- **Legacy** only accrues to films whose *Vision* survived your own de-risking. Test
  screenings, reshoots, focus-grouped marketing and denied demands all chip the vision
  bar; below the gold line a film is COMPROMISED and can never become a classic, no
  matter what it grossed. The legacy roll's variance cannot be reduced by anything —
  the safest films are the least likely to be remembered.

## Stack

React 18 + Vite + TypeScript (strict), CSS Modules, no runtime dependencies beyond React.
Game state lives in `localStorage` (`slate:` namespace); saves are versioned and the whole
engine is deterministic from a seed (mulberry32 threaded through `GameState`).

```
npm run dev       # dev server
npm run build     # type-check + production build
npm run test      # engine unit tests (vitest)
npm run sim       # policy-bot balance harness — prints the tuning table
```

## Where things live

- `src/engine/` — pure, React-free game logic. Every formula's constants are in
  `engine/tuning.ts`: that file is the balance dial panel.
- `src/engine/sim/` — headless bots (max-safety / max-vision / balanced) that play whole
  campaigns through the real reducer; the assertions in `balance.test.ts` are the design
  contract (no dominant strategy, double-high acclaim stays rare, safety starves legacy).
- `src/state/` — the reducer, persistence, and the `useGame` hook.
- `src/screens/`, `src/components/` — UI, one folder per component, CSS Modules, visual
  identity shared with [dexo.games](https://www.dexo.games).

Deployed to GitHub Pages via `.github/workflows/deploy.yml` (CNAME: `slate.dexo.games`).
