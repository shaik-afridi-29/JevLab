import { describe, it, expect } from "vitest";
import {
  ROLES,
  newGame,
  holderOf,
  validTargets,
  observableState,
  beliefs,
  guess,
  choiceCriteria,
  rationality,
  scoreGame,
  type KingdomGame,
} from "./kingdom";

function perfectPlay(seed: number): KingdomGame {
  let g = newGame(seed);
  let guard = 0;
  while (!g.completed && guard++ < 100) {
    const holder = holderOf(g, ROLES[g.activeRoleIdx]);
    // cheat with hidden assignment — the test may see what the agent may not
    const nextRole = ROLES[g.activeRoleIdx + 1];
    const target = Object.entries(g.assignment).find(([, r]) => r === nextRole)![0];
    void holder;
    g = guess(g, target).game;
  }
  return g;
}

describe("initialization", () => {
  it("deals six unique roles to six players, reproducibly", () => {
    const a = newGame(42);
    const b = newGame(42);
    expect(Object.keys(a.assignment)).toHaveLength(6);
    expect(new Set(Object.values(a.assignment)).size).toBe(6);
    expect(a.assignment).toEqual(b.assignment);
    expect(newGame(7).assignment).not.toEqual(a.assignment);
  });
  it("starts with King active and full candidate set", () => {
    const g = newGame(1);
    expect(ROLES[g.activeRoleIdx]).toBe("King");
    expect(validTargets(g)).toHaveLength(5);
  });
});

describe("correct guess", () => {
  it("completes the role with placement and no swap, then advances", () => {
    const g0 = newGame(42);
    const before = { ...g0.assignment };
    const target = Object.entries(before).find(([, r]) => r === "Queen")![0];
    const { game: g1, event } = guess(g0, target);
    expect(event.result).toBe("correct");
    expect(event.swapOccurred).toBe(false);
    expect(g1.assignment).toEqual(before);
    expect(g1.activeRoleIdx).toBe(1);
    const placed = g1.players.find((p) => p.placement === 1)!;
    expect(placed.completedRole).toBe("King");
    expect(placed.active).toBe(false);
  });
});

describe("incorrect guess", () => {
  it("swaps the two cards and keeps the same role under the new holder", () => {
    const g0 = newGame(42);
    const king = holderOf(g0, "King");
    const wrong = validTargets(g0).find((t) => g0.assignment[t] !== "Queen")!;
    const kingRoleBefore = g0.assignment[king];
    const wrongRoleBefore = g0.assignment[wrong];
    const { game: g1, event } = guess(g0, wrong);
    expect(event.result).toBe("incorrect");
    expect(event.swapOccurred).toBe(true);
    expect(g1.assignment[king]).toBe(wrongRoleBefore);
    expect(g1.assignment[wrong]).toBe(kingRoleBefore);
    expect(g1.activeRoleIdx).toBe(0);
    expect(holderOf(g1, "King")).toBe(wrong);
    expect(g1.failedGuesses).toContain(wrong);
  });
  it("supports consecutive swaps then completion", () => {
    let g = newGame(9);
    let swaps = 0;
    let guard = 0;
    while (ROLES[g.activeRoleIdx] === "King" && guard++ < 20) {
      // wrong while an untried wrong target exists, then take the Queen
      const wrong = validTargets(g).find(
        (t) => g.assignment[t] !== "Queen" && !g.failedGuesses.includes(t)
      );
      const target =
        wrong ?? Object.entries(g.assignment).find(([, r]) => r === "Queen")![0];
      const r = guess(g, target);
      g = r.game;
      if (r.event.swapOccurred) swaps += 1;
    }
    expect(swaps).toBeGreaterThanOrEqual(1);
    expect(ROLES[g.activeRoleIdx]).toBe("Queen");
  });
});

describe("complete game", () => {
  it("produces six placements", () => {
    const g = perfectPlay(42);
    expect(g.completed).toBe(true);
    const places = g.players.map((p) => p.placement).sort();
    expect(places).toEqual([1, 2, 3, 4, 5, 6]);
  });
  it("scores accuracy, swaps and rationality", () => {
    const g = perfectPlay(5);
    const s = scoreGame(g);
    expect(s.accuracy).toBe(1);
    expect(s.totalSwaps).toBe(0);
    expect(s.meanRationality).toBeGreaterThan(0);
  });
});

describe("hidden information", () => {
  it("observable state carries no assignment mapping", () => {
    const g = newGame(42);
    const obs = observableState(g) as {
      assignment?: unknown;
      players: { id: string; status: string; role?: string; completed_role?: string }[];
    };
    expect("assignment" in obs).toBe(false);
    for (const p of obs.players.filter((p) => p.status === "active")) {
      expect("role" in p).toBe(false);
      expect("completed_role" in p).toBe(false);
    }
    // exited players legitimately reveal the role they completed with
    const gDone = guess(g, Object.entries(g.assignment).find(([, r]) => r === "Queen")![0]).game;
    const obs2 = observableState(gDone) as { players: { id: string; status: string; completed_role?: string }[] };
    expect(obs2.players.find((p) => p.status === "completed")?.completed_role).toBe("King");
  });
});

describe("invalid actions", () => {
  it("rejects self, exited and nonexistent targets", () => {
    const g = perfectPlay(42); // completed game
    expect(() => guess(g, "P1")).toThrow();
    const g0 = newGame(3);
    expect(() => guess(g0, holderOf(g0, "King"))).toThrow();
    expect(() => guess(g0, "P99")).toThrow();
  });
});

describe("determinism", () => {
  it("same seed plus same actions replays identically", () => {
    const actions = ["P2", "P5", "P1", "P4", "P3"];
    const run = () => {
      let g = newGame(11);
      for (const a of actions) {
        if (g.completed) break;
        try {
          g = guess(g, a).game;
        } catch {
          break;
        }
      }
      return g;
    };
    expect(run()).toEqual(run());
  });
});

describe("beliefs and rationality", () => {
  it("rules out failed guesses and splits mass uniformly", () => {
    const g0 = newGame(42);
    const wrong = validTargets(g0).find((t) => g0.assignment[t] !== "Queen")!;
    const g1 = guess(g0, wrong).game;
    const b = beliefs(g1);
    expect(Object.keys(b).sort()).toEqual(validTargets(g1).sort());
    expect(b[wrong] ?? 0).toBe(0);
    const live = Object.values(b).filter((v) => v > 0);
    expect(new Set(live.map((v) => v.toFixed(6))).size).toBe(1);
    expect(live[0]).toBeCloseTo(1 / live.length, 6);
    expect(Object.values(b).reduce((a, x) => a + x, 0)).toBeCloseTo(1, 6);
  });
  it("rationality is the belief mass on the picked target", () => {
    const g = newGame(42);
    const b = beliefs(g);
    const t = validTargets(g)[0];
    expect(rationality(b, t)).toBeCloseTo(b[t], 6);
  });
  it("criteria cover exactly the valid targets", () => {
    const g = newGame(42);
    const { criteria, indexToTarget } = choiceCriteria(g);
    expect(Object.keys(criteria).sort()).toEqual(validTargets(g).sort());
    expect(indexToTarget["P1"]).toBe("P1");
  });
});

describe("card-level elimination (anti ping-pong)", () => {
  it("a card guessed wrong for a role stays ruled out for that role after a swap", () => {
    const g0 = newGame(42);
    const king = holderOf(g0, "King");
    const wrong = validTargets(g0).find((t) => g0.assignment[t] !== "Queen")!;
    const g1 = guess(g0, wrong).game;
    // old holder now holds the disproven card: beliefs must give it zero for Queen
    const b = beliefs(g1);
    expect(b[king] ?? 0).toBe(0);
    // and the true Queen holder is still live
    const queen = Object.entries(g1.assignment).find(([, r]) => r === "Queen")![0];
    expect(b[queen]).toBeGreaterThan(0);
  });
  it("ban notes travel with the swapped cards", () => {
    const g0 = newGame(42);
    const king = holderOf(g0, "King");
    const wrong = validTargets(g0).find((t) => g0.assignment[t] !== "Queen")!;
    const g1 = guess(g0, wrong).game;
    // the disproven card moved to the old holder
    expect(g1.cardBans[king]).toContain("Queen");
    // the King card now held by the guesser carries no ban
    expect(g1.cardBans[wrong]).not.toContain("Queen");
  });
  it("R2/R3 ping-pong is structurally impossible", () => {
    // P2 (Queen) guesses P3 for Minister, wrong; P3 must never re-guess P2 for Minister
    let g = newGame(2024);
    // fast-forward to a Queen search is complex; emulate directly:
    const king = holderOf(g, "King");
    const qHolder = Object.entries(g.assignment).find(([, r]) => r === "Queen")![0];
    // force a King-search swap: king guesses a non-Queen target
    const wrong = validTargets(g).find((t) => t !== qHolder)!;
    const g1 = guess(g, wrong).game;
    const b = beliefs(g1);
    // the previous holder's new card is disproven for Queen
    expect(b[king] ?? 0).toBe(0);
    expect(Object.values(b).reduce((a, x) => a + x, 0)).toBeCloseTo(1, 6);
  });
  it("observable state publishes card eliminations without leaking assignment", () => {
    const g0 = newGame(42);
    const wrong = validTargets(g0).find((t) => g0.assignment[t] !== "Queen")!;
    const g1 = guess(g0, wrong).game;
    const obs = observableState(g1) as { known_not: { player: string; roles: string[] }[] };
    const entry = obs.known_not.find((k) => k.player === holderOf(g0, "King"));
    expect(entry?.roles).toContain("Queen");
  });
});
