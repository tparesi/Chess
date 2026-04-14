import { colorOf, FILES, findKing } from "../chess/board.js";
import { CaptureAnim } from "./CaptureAnim.jsx";
import { CheckFlash } from "./CheckFlash.jsx";

const SQ = "min(10vw,64px)";

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

  const renderRow = (rowIdx) =>
    board[rowIdx].map((piece, colIdx) => {
      const r = rowIdx;
      const c = colIdx;
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

      return (
        <div
          key={`${r}-${c}`}
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
          {c === 0 && (
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
              {flipped ? r + 1 : 8 - r}
            </span>
          )}
          {r === 7 && (
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
              {flipped ? FILES[7 - c] : FILES[c]}
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
    });

  const rowOrder = flipped ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];

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
        {rowOrder.flatMap((r) => renderRow(r))}
      </div>
      {captureAnim && (
        <CaptureAnim
          pieceKey={captureAnim.pieceKey}
          theme={theme}
          row={captureAnim.row}
          col={captureAnim.col}
          onDone={onCaptureAnimDone}
        />
      )}
      {kingPos && inCheck && <CheckFlash row={kingPos[0]} col={kingPos[1]} />}
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
