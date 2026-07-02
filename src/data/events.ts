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
  trust: {
    label: string;
    effect: string; // human-readable cost line
    cash?: number; // $M cost (negative = cost)
    eBonus?: number;
    ePenalty?: number;
    vp?: number;
    sigma?: number; // note: applied as production wobble, not release sigma
    relationship?: number;
  };
  protect: {
    label: string;
    effect: string;
    cash?: number;
    eBonus?: number;
    ePenalty?: number;
    vp?: number;
    relationship?: number;
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
    protect: { label: "Wrap on schedule", effect: "-8 Vision · outcomes narrow", vp: -8, eBonus: 0 },
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
    trust: { label: "“They'll get it in context”", effect: "Outcomes widen slightly", sigma: 2 },
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
    body: "A rig failed. The stunt double is fine — the schedule is not, and the insurers have entered the chat.",
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
    trust: { label: "Trust the composer", effect: "Wider outcomes", sigma: 2 },
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
];
