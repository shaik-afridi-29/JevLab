import type { Chess, Move } from "chess.js";

export type JevStyle = "solid" | "balanced" | "aggressive";
export type Side = "w" | "b";

const PIECE_NAMES: Record<string, string> = {
  p: "pawn",
  n: "knight",
  b: "bishop",
  r: "rook",
  q: "queen",
  k: "king",
};

export const STYLE_SUFFIX: Record<JevStyle, string> = {
  solid:
    "Prefer safe, solid moves that keep the king secure and avoid unnecessary risk.",
  balanced:
    "Balance safety and activity: develop pieces, control the center, and avoid blunders.",
  aggressive:
    "Prefer aggressive, attacking moves that create threats and complications.",
};

/** Human-readable position summary sent to Jev as `state`. */
export function describePosition(game: Chess, jevSide: Side): string {
  const turn = game.turn();
  const moveNo = Math.floor(game.history().length / 2) + 1;
  const history = game.history();
  const histStr =
    history.length === 0
      ? "(no moves yet — opening position)"
      : history
          .map((san, i) =>
            i % 2 === 0 ? `${i / 2 + 1}. ${san}` : san
          )
          .join(" ");

  const captured = capturedSummary(game.history({ verbose: true }));

  const status = game.isCheckmate()
    ? "The game is over by checkmate."
    : game.isCheck()
      ? "The side to move is in check."
      : "Nobody is in check.";

  return [
    `Chess position. You play ${jevSide === "w" ? "White" : "Black"}.`,
    `${turn === "w" ? "White" : "Black"} to move. Move ${moveNo}.`,
    `FEN: ${game.fen()}`,
    `History (SAN): ${histStr}`,
    `Captured material: ${captured}`,
    status,
  ].join("\n");
}

function capturedSummary(verboseHistory: Move[]): string {
  const byWhite: string[] = [];
  const byBlack: string[] = [];
  for (const m of verboseHistory) {
    if (!m.captured) continue;
    (m.color === "w" ? byWhite : byBlack).push(PIECE_NAMES[m.captured] ?? m.captured);
  }
  const fmt = (xs: string[]) => (xs.length ? xs.join(", ") : "nothing");
  return `White captured ${fmt(byWhite)}; Black captured ${fmt(byBlack)}.`;
}

/**
 * One Choice criterion per legal move. Keys are index-based (`move_0…`)
 * so SAN punctuation can never break key handling; SAN travels in the
 * description and `indexToSan` maps the answer back to a move.
 */
export function buildMoveCriteria(game: Chess): {
  criteria: Record<string, string>;
  indexToSan: Record<string, string>;
} {
  const moves = game.moves({ verbose: true });
  const criteria: Record<string, string> = {};
  const indexToSan: Record<string, string> = {};
  moves.forEach((m, i) => {
    const key = `move_${i}`;
    indexToSan[key] = m.san;
    criteria[key] = `${m.san} — ${glossMove(m)}`;
  });
  return { criteria, indexToSan };
}

function glossMove(m: Move): string {
  const piece = PIECE_NAMES[m.piece] ?? m.piece;
  const bits: string[] = [`${piece} from ${m.from} to ${m.to}`];
  if (m.captured) bits.push(`captures ${PIECE_NAMES[m.captured] ?? m.captured}`);
  if (m.promotion) bits.push(`promotes to ${PIECE_NAMES[m.promotion] ?? m.promotion}`);
  if (m.flags.includes("k")) bits.push("kingside castle");
  if (m.flags.includes("q")) bits.push("queenside castle");
  if (m.flags.includes("e")) bits.push("en passant capture");
  if (m.san.includes("+")) bits.push("gives check");
  if (m.san.includes("#")) bits.push("checkmate");
  return bits.join(", ") + ".";
}

export function moveChoiceInstructions(jevColorName: string, style: JevStyle): string {
  return `Which move is best for ${jevColorName} in this chess position? ${STYLE_SUFFIX[style]}`;
}

export const WHITE_WINNING_INSTRUCTIONS = "Is White winning this chess position?";
export const DANGER_INSTRUCTIONS = "How dangerous is this chess position for the side to move?";
export const DANGER_LEVELS = ["Safe", "Mild pressure", "Risky", "Very dangerous", "Lost"];
