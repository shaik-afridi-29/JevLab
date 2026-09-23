import { describe, it, expect } from "vitest";
import { Chess } from "chess.js";
import {
  describePosition,
  buildMoveCriteria,
  moveChoiceInstructions,
  STYLE_SUFFIX,
  type JevStyle,
} from "./chess";

describe("describePosition", () => {
  it("describes the starting position for White", () => {
    const c = new Chess();
    const s = describePosition(c, "b");
    expect(s).toContain("White to move");
    expect(s).toContain("Move 1");
    expect(s).toContain("You play Black");
    expect(s).toContain("FEN");
  });
  it("reports check and move number mid-game", () => {
    const c = new Chess();
    c.move("e4");
    c.move("e5");
    c.move("Qh5");
    const s = describePosition(c, "b");
    expect(s).toContain("Black to move");
    expect(s).toContain("2. Qh5");
  });
});

describe("buildMoveCriteria", () => {
  it("returns one option per legal move with safe keys", () => {
    const c = new Chess();
    const { criteria, indexToSan } = buildMoveCriteria(c);
    expect(Object.keys(criteria)).toHaveLength(20);
    expect(Object.keys(criteria)[0]).toBe("move_0");
    expect(indexToSan["move_0"]).toMatch(/^[a-h][1-8]?/);
    // descriptions carry the SAN and a plain-English gloss
    expect(Object.values(criteria)[0]).toContain(indexToSan["move_0"]);
  });
  it("annotates captures and checks", () => {
    const c = new Chess("r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 1");
    const { criteria, indexToSan } = buildMoveCriteria(c);
    const sanList = Object.values(indexToSan);
    const capIdx = sanList.findIndex((s) => s.includes("x"));
    expect(capIdx).toBeGreaterThan(-1);
    expect(criteria[`move_${capIdx}`]).toMatch(/captures/i);
  });
});

describe("instructions", () => {
  it("has a suffix per style and names the side", () => {
    const styles: JevStyle[] = ["solid", "balanced", "aggressive"];
    for (const st of styles) {
      expect(STYLE_SUFFIX[st].length).toBeGreaterThan(10);
    }
    expect(moveChoiceInstructions("Black", "solid")).toContain("Black");
  });
});
