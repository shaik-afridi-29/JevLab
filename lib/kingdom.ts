/** Kingdom Guessing Game engine: pure, deterministic, fully tested.
 *  Hidden role assignment never leaks into the observable state. */

export const ROLES = ["King", "Queen", "Minister", "Soldier", "Police", "Thief"] as const;
export type Role = (typeof ROLES)[number];

export const PLAYER_IDS = ["P1", "P2", "P3", "P4", "P5", "P6"] as const;

export interface PlayerState {
  id: string;
  active: boolean;
  placement: number | null;
  completedRole: Role | null;
  attempts: number;
  failures: number;
}

export interface RoundEvent {
  round: number;
  activeRole: Role;
  actingPlayer: string;
  guessedPlayer: string;
  result: "correct" | "incorrect";
  swapOccurred: boolean;
  /** Belief mass the decider held on the picked target, from code beliefs. */
  beliefOnTarget: number;
  candidates: string[];
}

export interface KingdomGame {
  seed: number;
  /** Hidden: actual assignment. Never expose to the agent. */
  assignment: Record<string, Role>;
  players: PlayerState[];
  /** Index into ROLES of the role currently searching. 5 == Thief done == completed. */
  activeRoleIdx: number;
  round: number;
  history: RoundEvent[];
  completed: boolean;
  /** Targets already failed for the current role search (survives swaps). */
  failedGuesses: string[];
  /** Card-level memory: roles a player's CURRENT card provably is not.
   *  Notes travel with the cards through swaps, so a disproven card stays
   *  disproven no matter whose hands it is in. Monotonic: never cleared. */
  cardBans: Record<string, Role[]>;
}

/** Deterministic PRNG so games replay from a seed. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function newGame(seed: number): KingdomGame {
  const rand = mulberry32(seed);
  const roles = [...ROLES];
  for (let i = roles.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [roles[i], roles[j]] = [roles[j], roles[i]];
  }
  const assignment: Record<string, Role> = {};
  PLAYER_IDS.forEach((id, i) => {
    assignment[id] = roles[i];
  });
  return {
    seed,
    assignment,
    players: PLAYER_IDS.map((id) => ({
      id,
      active: true,
      placement: null,
      completedRole: null,
      attempts: 0,
      failures: 0,
    })),
    activeRoleIdx: 0,
    round: 1,
    history: [],
    completed: false,
    failedGuesses: [],
    cardBans: Object.fromEntries(PLAYER_IDS.map((id) => [id, []])),
  };
}

export function holderOf(game: KingdomGame, role: Role): string {
  const found = Object.entries(game.assignment).find(([, r]) => r === role);
  if (!found) throw new Error(`No holder for role ${role}`);
  return found[0];
}

/** Valid GUESS targets: active players except the current holder. */
export function validTargets(game: KingdomGame): string[] {
  if (game.completed) return [];
  const holder = holderOf(game, ROLES[game.activeRoleIdx]);
  return game.players.filter((p) => p.active && p.id !== holder).map((p) => p.id);
}

function clone(game: KingdomGame): KingdomGame {
  return JSON.parse(JSON.stringify(game));
}

export function guess(game: KingdomGame, targetId: string): { game: KingdomGame; event: RoundEvent } {
  if (game.completed) throw new Error("Game is already complete");
  const role = ROLES[game.activeRoleIdx];
  const holder = holderOf(game, role);
  const valid = validTargets(game);
  if (!valid.includes(targetId))
    throw new Error(`Invalid guess ${targetId}: must be an active player other than ${holder}`);

  const g = clone(game);
  const h = g.players.find((p) => p.id === holder)!;
  const t = g.players.find((p) => p.id === targetId)!;
  h.attempts += 1;

  const correct = g.assignment[targetId] === ROLES[g.activeRoleIdx + 1];
  const b = beliefs(game);
  const event: RoundEvent = {
    round: g.round,
    activeRole: role,
    actingPlayer: holder,
    guessedPlayer: targetId,
    result: correct ? "correct" : "incorrect",
    swapOccurred: !correct,
    beliefOnTarget: b[targetId] ?? 0,
    candidates: valid,
  };

  if (correct) {
    const placement = g.players.filter((p) => !p.active).length + 1;
    h.active = false;
    h.placement = placement;
    h.completedRole = role;
    g.activeRoleIdx += 1;
    g.failedGuesses = [];
    if (g.activeRoleIdx >= ROLES.length - 1) {
      // Thief takes the last placement without guessing.
      const thief = holderOf(g, "Thief");
      const tp = g.players.find((p) => p.id === thief)!;
      tp.placement = g.players.filter((p) => !p.active).length + 1;
      tp.active = false;
      tp.completedRole = "Thief";
      g.completed = true;
    }
  } else {
    h.failures += 1;
    // The guessed card provably is not the sought role — record it on the
    // card first, then swap cards (notes travel with the cards).
    const sought = ROLES[g.activeRoleIdx + 1];
    if (!g.cardBans[targetId].includes(sought)) g.cardBans[targetId].push(sought);
    const tmp = g.assignment[holder];
    g.assignment[holder] = g.assignment[targetId];
    g.assignment[targetId] = tmp;
    const tmpBans = g.cardBans[holder];
    g.cardBans[holder] = g.cardBans[targetId];
    g.cardBans[targetId] = tmpBans;
    if (!g.failedGuesses.includes(targetId)) g.failedGuesses.push(targetId);
  }
  g.history.push(event);
  g.round += 1;
  return { game: g, event };
}

/** Observable state: everything a real player in this position could know. */
export function observableState(game: KingdomGame): Record<string, unknown> {
  const role = game.completed ? null : ROLES[game.activeRoleIdx];
  // Only live candidates are actionable; disproven cards are not offered.
  let offered = validTargets(game).filter((t) => !isRuledOut(game, t));
  if (offered.length === 0) offered = validTargets(game);
  return {
    current_role: role,
    acting_player: role ? holderOf(game, role) : null,
    round: game.round,
    players: game.players.map((p) => ({
      id: p.id,
      status: p.active ? "active" : "completed",
      ...(p.active ? {} : { placement: p.placement, completed_role: p.completedRole }),
    })),
    failed_guesses_this_search: [...game.failedGuesses],
    known_not: game.players
      .filter((p) => p.active && (game.cardBans[p.id] ?? []).length > 0)
      .map((p) => ({ player: p.id, roles: [...game.cardBans[p.id]] })),
    previous_events: game.history.map((h) => ({
      round: h.round,
      active_role: h.activeRole,
      acting_player: h.actingPlayer,
      guessed_player: h.guessedPlayer,
      result: h.result,
      swap_occurred: h.swapOccurred,
    })),
    available_actions: offered.map((t) => `GUESS(${t})`),
  };
}

/** A target is unpickable when directly failed this search or its current
 *  card was disproven for the sought role in an earlier round. */
export function isRuledOut(game: KingdomGame, targetId: string): boolean {
  if (game.completed) return true;
  const next = ROLES[game.activeRoleIdx + 1];
  return game.failedGuesses.includes(targetId) || (game.cardBans[targetId] ?? []).includes(next);
}

/** Code-computed beliefs for the current search: uniform over valid targets
 *  minus ruled-out candidates (failed guesses AND card-level bans, which
 *  survive holder swaps). Falls back to plain uniform defensively. */
export function beliefs(game: KingdomGame): Record<string, number> {
  const out: Record<string, number> = {};
  const valid = validTargets(game);
  let live = valid.filter((t) => !isRuledOut(game, t));
  if (live.length === 0) live = valid;
  const each = live.length > 0 ? 1 / live.length : 0;
  for (const t of valid) out[t] = live.includes(t) ? each : 0;
  return out;
}

/** Rationality of a pick = belief mass held on the target at decision time. */
export function rationality(belief: Record<string, number>, targetId: string): number {
  return belief[targetId] ?? 0;
}

/** Choice criteria for Jev: one option per LIVE target. Disproven cards are
 *  not offered at all — a gloss saying "don't pick this" is demonstrably
 *  ignored (ρ 0.00 picks), while exclusion is airtight: the true holder's
 *  card can never be banned, so it is always offered. */
export function choiceCriteria(game: KingdomGame): {
  criteria: Record<string, string>;
  indexToTarget: Record<string, string>;
} {
  const role = ROLES[game.activeRoleIdx];
  const next = ROLES[game.activeRoleIdx + 1];
  let offered = validTargets(game).filter((t) => !isRuledOut(game, t));
  if (offered.length === 0) offered = validTargets(game); // defensive; unreachable
  const criteria: Record<string, string> = {};
  const indexToTarget: Record<string, string> = {};
  for (const t of offered) {
    criteria[t] =
      `${t} — could hold the ${next} card. ` +
      `History: ${game.history.length} prior rounds, ${game.failedGuesses.length} failed guess(es) this search. ` +
      `Disproven cards are not listed, so every option here is live.`;
    indexToTarget[t] = t;
  }
  void role;
  return { criteria, indexToTarget };
}

export interface GameScore {
  totalGuesses: number;
  correctGuesses: number;
  accuracy: number;
  totalSwaps: number;
  attemptsPerRole: { role: Role; attempts: number }[];
  meanRationality: number;
  completed: boolean;
}

export function scoreGame(game: KingdomGame): GameScore {
  const totalGuesses = game.history.length;
  const correctGuesses = game.history.filter((h) => h.result === "correct").length;
  const totalSwaps = game.history.filter((h) => h.swapOccurred).length;
  const attemptsPerRole = ROLES.slice(0, 5).map((role) => ({
    role,
    attempts: game.history.filter((h) => h.activeRole === role).length,
  }));
  const meanRationality =
    totalGuesses > 0 ? game.history.reduce((a, h) => a + h.beliefOnTarget, 0) / totalGuesses : 0;
  return {
    totalGuesses,
    correctGuesses,
    accuracy: totalGuesses > 0 ? correctGuesses / totalGuesses : 0,
    totalSwaps,
    attemptsPerRole,
    meanRationality,
    completed: game.completed,
  };
}

export function moveChoiceInstructions(role: Role, next: Role): string {
  return `You are the ${role}. Which player most likely holds the ${next} card? Base your pick only on the observable game history: prior guesses, swaps, and who is still active.`;
}
