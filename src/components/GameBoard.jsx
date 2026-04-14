import { colorOf, FILES, findKing } from "../chess/board.js";
import { CaptureAnim } from "./CaptureAnim.jsx";
import { CheckFlash } from "./CheckFlash.jsx";

const SQ = "min(10vw,64px)";

// Map a visual grid position (gridR, gridC = 0..7) to the logical board
// coordinate. When `flipped` is true (black's POV) BOTH axes mirror, so
// the h-file ends up on black's left and white's pieces sit at the
// bottom of their screen — matching a real flipped board.
const logicalCoord = (gridR, gridC, flipped) =>
  flipped ? [7 - gridR, 7 - gridC] : [gridR, gridC];
const gridCoord = (logicalR, logicalC, flipped) =>
  flipped ? [7 - logicalR, 7 - logicalC] : [logicalR, logicalC];

export function GameBoard({
  board,
  theme,
  selected,
  validMoves,
  lastMove,
  turn,
  inCheck,
  captureAnim,
  onSquareClick,
  onCaptureAnimDone,
  disabled,
  flipped = false,
}) {
  const kingPos = inCheck ? findKing(board, turn) : null;
  const kingGrid = kingPos ? gridCoord(kingPos[0], kingPos[1], flipped) : null;
  const animGrid = captureAnim
    ? gridCoord(captureAnim.row, captureAnim.col, flipped)
    : null;

  // Build the 64 squares in grid order (top-left → bottom-right of what the
  // player sees). Each cell derives its logical coord for piece lookup and
  // click wiring.
  const squares = [];
  for (let gridR = 0; gridR < 8; gridR++) {
    for (let gridC = 0; gridC < 8; gridC++) {
      const [r, c] = logicalCoord(gridR, gridC, flipped);
      const piece = board[r][c];
      const lightSquare = (r + c) % 2 === 0;
      const isSel = selected && selected[0] === r && selected[1] === c;
      const isValidTarget = validMoves.some(([vr, vc]) => vr === r && vc === c);
      const isLastFrom = lastMove && lastMove.from[0] === r && lastMove.from[1] === c;
      const isLastTo = lastMove && lastMove.to[0] === r && lastMove.to[1] === c;
      const isCheckSq = kingPos && kingPos[0] === r && kingPos[1] === c;

      let bg = lightSquare ? theme.boardColors.light : theme.boardColors.dark;
      if (isSel) bg = shade(bg, 0.08);
      else if (isLastFrom || isLastTo) bg = shade(bg, -0.08);
      if (isCheckSq) bg = "#c0392b";

      const interactable =
        !disabled &&
        !captureAnim &&
        ((piece && colorOf(piece) === turn) || isValidTarget);

      squares.push(
        <div
          key={`${gridR}-${gridC}`}
          onClick={() => !disabled && !captureAnim && onSquareClick(r, c)}
          style={{
            width: SQ,
            height: SQ,
            backgroundColor: bg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            userSelect: "none",
            cursor: interactable ? "pointer" : "default",
            transition: "background-color .12s",
            backgroundImage: lightSquare
              ? "repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(255,255,255,.05) 3px,rgba(255,255,255,.05) 6px)"
              : "repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,.05) 3px,rgba(0,0,0,.05) 6px)",
          }}
        >
          {gridC === 0 && (
            <span
              style={{
                position: "absolute",
                top: 2,
                left: 3,
                fontSize: 9,
                fontWeight: 500,
                opacity: 0.5,
                pointerEvents: "none",
                color: theme.boardColors.coord,
              }}
            >
              {8 - r}
            </span>
          )}
          {gridR === 7 && (
            <span
              style={{
                position: "absolute",
                bottom: 1,
                right: 3,
                fontSize: 9,
                fontWeight: 500,
                opacity: 0.5,
                pointerEvents: "none",
                color: theme.boardColors.coord,
              }}
            >
              {FILES[c]}
            </span>
          )}
          {isValidTarget && !piece && (
            <div
              style={{
                width: "26%",
                height: "26%",
                borderRadius: "50%",
                background: "rgba(0,0,0,.25)",
                position: "absolute",
              }}
            />
          )}
          {isValidTarget && piece && (
            <div
              style={{
                width: "88%",
                height: "88%",
                borderRadius: "50%",
                border: "3.5px solid rgba(0,0,0,.25)",
                position: "absolute",
                boxSizing: "border-box",
              }}
            />
          )}
          {piece && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                pointerEvents: "none",
                zIndex: isValidTarget ? 2 : 1,
                lineHeight: 1,
              }}
            >
              {theme.renderPiece(piece, { size: `calc(${SQ} * 0.78)` })}
            </span>
          )}
        </div>
      );
    }
  }

  return (
    <div
      style={{
        borderRadius: 4,
        overflow: "hidden",
        position: "relative",
        boxShadow: "0 8px 32px rgba(0,0,0,.6)",
        border: `3px solid ${theme.boardColors.border}`,
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(8, ${SQ})`,
          gridTemplateRows: `repeat(8, ${SQ})`,
        }}
      >
        {squares}
      </div>
      {captureAnim && animGrid && (
        <CaptureAnim
          pieceKey={captureAnim.pieceKey}
          theme={theme}
          row={animGrid[0]}
          col={animGrid[1]}
          flipped={flipped}
          onDone={onCaptureAnimDone}
        />
      )}
      {kingGrid && inCheck && <CheckFlash row={kingGrid[0]} col={kingGrid[1]} />}
    </div>
  );
}

// Rough HSL-independent shade: tweak a hex color lighter/darker.
function shade(hex, amount) {
  const h = hex.replace("#", "");
  const num = parseInt(h, 16);
  let r = (num >> 16) + Math.round(255 * amount);
  let g = ((num >> 8) & 0xff) + Math.round(255 * amount);
  let b = (num & 0xff) + Math.round(255 * amount);
  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));
  return "#" + ((r << 16) | (g << 8) | b).toString(16).padStart(6, "0");
}

export { SQ };
