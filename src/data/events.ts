/**
 * Production event pool. Every event is a "trust the filmmaker" vs "protect
 * the investment" fork with explicit costs on both branches. Effects are
 * interpreted by the season reducer.
 */

export interface ProductionEventDef {
  id: string;
  title: string;
  body: string;
  /** conditions */
  needsTemperament?: number; // min lead temperament
  needsVolatility?: number; // min director volatility
  bigBudgetOnly?: boolean;
  /** only fires when schedule pressure ≥ this (0..1); crunch-born trouble (§1) */
  crunchOnly?: number;
  /** only fires when a billed pair's chemistry ≤ this (negative); §7 */
  needsBadChemistry?: number;
  trust: {
    label: string;
    effect: string; // human-readable cost line
    cash?: number; // $M cost (negative = cost)
    eBonus?: number;
    ePenalty?: number;
    vp?: number;
    sigma?: number; // note: applied as production wobble, not release sigma
    relationship?: number;
    days?: number; // buy shooting days back (relieves crunch pressure)
  };
  protect: {
    label: string;
    effect: string;
    cash?: number;
    eBonus?: number;
    ePenalty?: number;
    vp?: number;
    relationship?: number;
    days?: number;
  };
  /** if true, completion bond absorbs the cash cost of either branch */
  bondable?: boolean;
}

export const PRODUCTION_EVENTS: ProductionEventDef[] = [
  {
    id: "more-days",
    title: "TEN MORE DAYS",
    body: "The director wants ten more days to reshoot the ending they now describe as “a betrayal of the whole film.” The crew is on overtime.",
    trust: { label: "Give them the days", effect: "-$4M · execution may rise", cash: -4, eBonus: 5 },
    protect: { label: "Wrap on schedule", effect: "-8 Vision · forecast narrows", vp: -8, eBonus: 0 },
  },
  {
    id: "feud",
    title: "STAR VS. DIRECTOR",
    body: "Your lead and your director are communicating exclusively through a baffled first AD. One of them called the other “a hat with opinions.”",
    needsTemperament: 55,
    trust: { label: "Back the director", effect: "Lead relationship -15", relationship: -15, eBonus: 3 },
    protect: { label: "Back the star", effect: "-10 Vision · director remembers this", vp: -10, relationship: -8 },
  },
  {
    id: "leak",
    title: "THE CUT LEAKS",
    body: "Twelve minutes leaked online. The internet has decided the film is either a masterpiece or unreleasable, depending on the thread.",
    trust: { label: "“They'll get it in context”", effect: "Forecast widens slightly", sigma: 2 },
    protect: { label: "Recut the act now", effect: "-$3M · -12 Vision · narrows", cash: -3, vp: -12 },
  },
  {
    id: "weather",
    title: "THE SET IS UNDERWATER",
    body: "A weather system with a name has relocated your principal exterior set into a neighbouring county.",
    bondable: true,
    trust: { label: "Rebuild and carry on", effect: "-$6M (bond covers if held)", cash: -6 },
    protect: { label: "Rewrite around it", effect: "-6 Execution · script contorts", ePenalty: 6 },
  },
  {
    id: "method",
    title: "FULLY IN CHARACTER",
    body: "Your lead has been in character for six weeks, including at a parents' evening and one deposition. The performance is remarkable. The set is terrified.",
    needsTemperament: 65,
    trust: { label: "Let it ride", effect: "Execution up · drama risk up", eBonus: 4, sigma: 2 },
    protect: { label: "Send in the producer", effect: "-6 Vision · lead sulks", vp: -6, relationship: -6 },
  },
  {
    id: "overrun",
    title: "THE MONEY IS EVAPORATING",
    body: "Line producer's report: the film is burning cash 20% over plan, mostly on a sequence the director calls “the reason to make the movie.”",
    needsVolatility: 50,
    trust: { label: "Fund the vision", effect: "-$5M", cash: -5, eBonus: 3 },
    protect: { label: "Cut the sequence", effect: "-9 Vision", vp: -9 },
  },
  {
    id: "studio-note",
    title: "A NOTE FROM UPSTAIRS",
    body: "Someone senior watched dailies and asked whether the ending could be “happier, or at least shorter.”",
    trust: { label: "Shred the note", effect: "Nothing happens. The director hears about it anyway. +2 relationship", relationship: 2 },
    protect: { label: "Pass the note along", effect: "-7 Vision · crowd ceiling nudges up", vp: -7 },
  },
  {
    id: "injury",
    title: "STUNT GONE WRONG",
    body: "A rig failed. The stunt double is fine. The schedule is not, and the insurers have entered the chat.",
    bigBudgetOnly: true,
    bondable: true,
    trust: { label: "Pause and reset safely", effect: "-$5M (bond covers if held)", cash: -5 },
    protect: { label: "Shoot around it", effect: "-5 Execution", ePenalty: 5 },
  },
  {
    id: "chemistry",
    title: "LIGHTNING IN A BOTTLE",
    body: "The two leads are improvising entire scenes and the dailies are electric. The script supervisor has stopped supervising and started watching.",
    trust: { label: "Let them cook", effect: "Execution up · coherence wobbles", eBonus: 6, sigma: 2 },
    protect: { label: "Stick to the pages", effect: "Nothing gained, nothing risked" },
  },
  {
    id: "composer",
    title: "THE SCORE ISN'T WORKING",
    body: "The temp track is doing all the emotional work. The composer's new pages sound like a lawsuit against a better film.",
    trust: { label: "Trust the composer", effect: "Wider forecast", sigma: 2 },
    protect: { label: "License the temp track", effect: "-$2M · -4 Vision", cash: -2, vp: -4 },
  },
  {
    id: "tabloid",
    title: "FRONT PAGE, WRONG REASON",
    body: "Your lead is in the tabloids. The story involves a yacht, a parrot, and a phrase your marketing team refuses to repeat.",
    needsTemperament: 45,
    trust: { label: "No comment", effect: "Buzz up, dignity down", sigma: 2 },
    protect: { label: "Crisis PR blitz", effect: "-$2M", cash: -2 },
  },
  {
    id: "footage",
    title: "THE CAMERA NEGATIVE",
    body: "A day's footage came back unusable. The lab is very sorry. The lab is also very much not paying for it.",
    bondable: true,
    trust: { label: "Reshoot it properly", effect: "-$3M (bond covers if held)", cash: -3 },
    protect: { label: "Cut the scene", effect: "-4 Execution", ePenalty: 4 },
  },
  // ---- crunch-born trouble: only fires on a compressed schedule (§1) ----
  {
    id: "schedule-villain",
    title: "THE SCHEDULE IS THE VILLAIN",
    body: "The board is red and the days are gone. The first AD hands you a choice you already knew was coming: find the money for more time, or find out what a rushed third act looks like.",
    crunchOnly: 0.3,
    trust: { label: "Buy five days back", effect: "-$3M · +5 shooting days · crunch eases", cash: -3, days: 5 },
    protect: { label: "Wrap it as-is", effect: "-5 Execution · the seams show", ePenalty: 5 },
  },
  {
    id: "second-unit",
    title: "SECOND UNIT, FIRST MISTAKE",
    body: "To make the day, half the film is being shot by a second unit that has never met the director. The footage is… confident. It is not, however, the same movie.",
    crunchOnly: 0.3,
    trust: { label: "Cut it together and pray", effect: "Wider forecast", sigma: 3 },
    protect: { label: "Reshoot the unit's work", effect: "-$2M", cash: -2 },
  },
  {
    id: "no-sleep",
    title: "NOBODY HAS SLEPT SINCE TUESDAY",
    body: "The crew is running on fumes and vending-machine coffee. Tempers are gone. Someone rigged a bed into the grip truck. The director quietly asks you to just trust the cut and let everyone go home.",
    crunchOnly: 0.3,
    trust: { label: "Trust the cut, send them home", effect: "-4 Execution · the director won't forget it", ePenalty: 4, relationship: 3 },
    protect: { label: "Pay the overtime", effect: "-$1.5M · no penalty", cash: -1.5 },
  },
  // ---- a billed pairing that simply does not work (§7) ----
  {
    id: "cold-front",
    title: "COLD WAR ON STAGE 4",
    body: "Two of your leads have stopped speaking except in the takes, and even then it's frosty. The AD has drawn an invisible line down the middle of the set. The dailies feel like a hostage negotiation.",
    needsBadChemistry: -6,
    trust: { label: "Shoot around it", effect: "Wider forecast · you'll fix it in the edit", sigma: 2 },
    protect: { label: "Producer-mediated truce", effect: "-$2M · a very expensive dinner", cash: -2 },
  },
];
