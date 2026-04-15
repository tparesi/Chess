#!/usr/bin/env node
/**
 * Curate a small, progression-ordered puzzle book from the Lichess puzzle DB.
 *
 * Usage:
 *   node scripts/build-puzzles.mjs
 *
 * Steps:
 *   1. Check for scripts/lichess_db_puzzle.csv (~2GB uncompressed)
 *   2. If missing, download and decompress from database.lichess.org
 *   3. Stream the CSV line by line (don't load into memory)
 *   4. For each chapter spec, collect puzzles that match its filter
 *   5. Sort by rating within each chapter, take the top N
 *   6. Write src/puzzles/data.json with the flattened, ordered curriculum
 *
 * The output is deterministic given the same input CSV: chapters and their
 * ordering are fixed, and within each chapter we sort by (rating, puzzle_id)
 * ascending before trimming.
 *
 * Raw CSV is gitignored; the curated data.json (~100KB) is committed.
 */

import { createReadStream, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = dirname(__dirname);
const CSV_PATH = join(__dirname, "lichess_db_puzzle.csv");
const CSV_ZST_PATH = join(__dirname, "lichess_db_puzzle.csv.zst");
const OUT_DIR = join(REPO_ROOT, "src", "puzzles");
const OUT_PATH = join(OUT_DIR, "data.json");
const DOWNLOAD_URL = "https://database.lichess.org/lichess_db_puzzle.csv.zst";

// ─── Chapter specs ─────────────────────────────────────────────────────
// Each spec describes a filter over the Lichess puzzle rows. The build
// script walks the CSV once, collects candidates per chapter, then trims
// to `count` after sorting by (rating, puzzleId). A puzzle is allocated to
// the FIRST matching chapter (in the order below) so chapters don't share
// puzzles.

// Rating windows climb monotonically so the curriculum never regresses in
// difficulty between chapters. Within each chapter we sample evenly across
// the window (see pickEvenlySpaced below) so puzzle 1 of a chapter is near
// the window's min and the last is near its max.
const CHAPTERS = [
  {
    id: 1,
    title: "Mate with the queen",
    count: 15,
    ratingMin: 400,
    ratingMax: 700,
    match: (row) => row.themes.has("mateIn1") && movesQueen(row),
  },
  {
    id: 2,
    title: "Mate with the rook",
    count: 15,
    ratingMin: 600,
    ratingMax: 900,
    match: (row) => row.themes.has("mateIn1") && movesRook(row),
  },
  {
    id: 3,
    title: "Sneaky mates in one",
    count: 10,
    ratingMin: 700,
    ratingMax: 1000,
    match: (row) => row.themes.has("mateIn1"),
  },
  {
    id: 4,
    title: "Don't lose your pieces",
    count: 15,
    ratingMin: 800,
    ratingMax: 1100,
    match: (row) => row.themes.has("hangingPiece"),
  },
  {
    id: 5,
    title: "The fork",
    count: 15,
    ratingMin: 900,
    ratingMax: 1200,
    match: (row) => row.themes.has("fork"),
  },
  {
    id: 6,
    title: "The pin",
    count: 15,
    ratingMin: 1000,
    ratingMax: 1300,
    match: (row) => row.themes.has("pin"),
  },
  {
    id: 7,
    title: "The skewer",
    count: 10,
    ratingMin: 1050,
    ratingMax: 1350,
    match: (row) => row.themes.has("skewer"),
  },
  {
    id: 8,
    title: "Surprise attacks",
    count: 10,
    ratingMin: 1100,
    ratingMax: 1400,
    match: (row) => row.themes.has("discoveredAttack"),
  },
  {
    id: 9,
    title: "Back rank mate",
    count: 15,
    ratingMin: 1150,
    ratingMax: 1450,
    match: (row) => row.themes.has("backRankMate"),
  },
  {
    id: 10,
    title: "Mate in two",
    count: 20,
    ratingMin: 1200,
    ratingMax: 1600,
    match: (row) => row.themes.has("mateIn2"),
  },
  {
    id: 11,
    title: "Endgames that win",
    count: 10,
    ratingMin: 1200,
    ratingMax: 1500,
    match: (row) => row.themes.has("endgame"),
  },
];

const TOTAL_EXPECTED = CHAPTERS.reduce((s, c) => s + c.count, 0);

// ─── Heuristics that need the FEN ───────────────────────────────────────
// Lichess doesn't tag mateIn1 puzzles by which piece mates, so we peek at
// the player's expected move (the 2nd move in the Moves list — the first
// is the opponent setup) and look at the piece it comes from in the
// post-setup board.

function movesPieceType(row) {
  // Returns the piece type (K/Q/R/B/N/P) the player uses on their first move.
  try {
    const [setupMoveUCI, playerMoveUCI] = row.movesList;
    if (!playerMoveUCI) return null;
    const board = fenToBoard(row.fen);
    // Apply the setup move naively (copy, move, no promotion logic — we
    // just need to know what piece is on the player's from-square)
    const fromSetup = [8 - Number(setupMoveUCI[1]), fileIdx(setupMoveUCI[0])];
    const toSetup = [8 - Number(setupMoveUCI[3]), fileIdx(setupMoveUCI[2])];
    board[toSetup[0]][toSetup[1]] = board[fromSetup[0]][fromSetup[1]];
    board[fromSetup[0]][fromSetup[1]] = null;

    const fromPlayer = [8 - Number(playerMoveUCI[1]), fileIdx(playerMoveUCI[0])];
    const piece = board[fromPlayer[0]][fromPlayer[1]];
    return piece ? piece.toUpperCase() : null;
  } catch {
    return null;
  }
}

const movesQueen = (row) => movesPieceType(row) === "Q";
const movesRook = (row) => movesPieceType(row) === "R";

function fenToBoard(fen) {
  const placement = fen.split(/\s+/)[0];
  const board = Array.from({ length: 8 }, () => Array(8).fill(null));
  const ranks = placement.split("/");
  for (let r = 0; r < 8; r++) {
    let col = 0;
    for (const ch of ranks[r]) {
      if (/[1-8]/.test(ch)) col += Number(ch);
      else {
        board[r][col] = ch;
        col += 1;
      }
    }
  }
  return board;
}

const FILES = "abcdefgh";
const fileIdx = (ch) => FILES.indexOf(ch);

// Given a sorted-by-rating pool, pick N items spread evenly across it:
// the first pick is the easiest in the pool, the last is the hardest, and
// the ones in between are evenly distributed. Gives each chapter a real
// difficulty climb within itself.
function pickEvenlySpaced(pool, n) {
  if (pool.length === 0) return [];
  if (pool.length <= n) return [...pool];
  const out = [];
  for (let i = 0; i < n; i++) {
    const idx = Math.round((i * (pool.length - 1)) / (n - 1));
    out.push(pool[idx]);
  }
  return out;
}

// ─── Download + decompress ──────────────────────────────────────────────

async function ensureCsv() {
  if (existsSync(CSV_PATH)) {
    console.log(`✓ Using existing ${CSV_PATH}`);
    return;
  }
  if (!existsSync(CSV_ZST_PATH)) {
    console.log(`↓ Downloading ${DOWNLOAD_URL}`);
    console.log(`   (this is ~300MB compressed, be patient)`);
    const curl = spawnSync("curl", ["-fL", "-o", CSV_ZST_PATH, DOWNLOAD_URL], {
      stdio: "inherit",
    });
    if (curl.status !== 0) {
      throw new Error("curl failed; install curl or download the file manually");
    }
  }
  console.log(`⏳ Decompressing ${CSV_ZST_PATH}`);
  const zstd = spawnSync("zstd", ["-d", "-f", CSV_ZST_PATH, "-o", CSV_PATH], {
    stdio: "inherit",
  });
  if (zstd.status !== 0) {
    throw new Error("zstd -d failed; install zstd (brew install zstd)");
  }
}

// ─── Stream parser ──────────────────────────────────────────────────────

async function streamCsv() {
  const stream = createReadStream(CSV_PATH, { encoding: "utf8" });
  const rl = createInterface({ input: stream, crlfDelay: Infinity });

  // Collect candidates per chapter
  const candidates = CHAPTERS.map(() => []);
  let totalScanned = 0;
  let headerSeen = false;

  for await (const line of rl) {
    if (!headerSeen) {
      headerSeen = true;
      // First line is "PuzzleId,FEN,Moves,Rating,..."
      continue;
    }
    totalScanned++;
    if (totalScanned % 500000 === 0) {
      process.stdout.write(`   scanned ${totalScanned.toLocaleString()} rows\r`);
    }

    const cols = line.split(",");
    if (cols.length < 8) continue;
    const [puzzleId, fen, movesStr, ratingStr, , popularityStr, nbPlaysStr, themesStr] =
      cols;
    const rating = Number(ratingStr);
    const popularity = Number(popularityStr);
    const nbPlays = Number(nbPlaysStr);

    // Baseline quality filters
    if (!(popularity > 80)) continue;
    if (!(nbPlays > 500)) continue;
    if (!Number.isFinite(rating)) continue;

    // Player is always white. Lichess convention: the opponent plays the
    // first move from the given FEN, then the player plays. So if the FEN
    // says black-to-move, black blunders first → player is white. Skip
    // the reverse.
    const fenTurn = fen.split(" ")[1];
    if (fenTurn !== "b") continue;

    const movesList = movesStr.split(" ");
    if (movesList.length < 2) continue;
    const themes = new Set(themesStr.split(" "));

    const row = { puzzleId, fen, movesList, rating, themes };

    // Allocate to the FIRST matching chapter (by spec order) where the rating
    // is in the target window. No cap — we want the full pool so we can
    // evenly sample across the rating range afterwards.
    for (let i = 0; i < CHAPTERS.length; i++) {
      const spec = CHAPTERS[i];
      if (rating < spec.ratingMin || rating > spec.ratingMax) continue;
      if (!spec.match(row)) continue;
      candidates[i].push(row);
      break; // first-match wins, no duplicates across chapters
    }
  }

  console.log(`   scanned ${totalScanned.toLocaleString()} rows total`);
  return candidates;
}

// ─── Main ───────────────────────────────────────────────────────────────

async function main() {
  console.log("Slope Chess puzzle book — curation build");
  console.log("──");

  await ensureCsv();
  console.log(`⏳ Scanning CSV and bucketing by chapter...`);
  const candidates = await streamCsv();

  console.log(`✓ Sampling evenly across each chapter's rating window:`);
  const out = [];
  let globalIndex = 0;
  for (let i = 0; i < CHAPTERS.length; i++) {
    const spec = CHAPTERS[i];
    const pool = candidates[i];
    pool.sort((a, b) => {
      if (a.rating !== b.rating) return a.rating - b.rating;
      return a.puzzleId.localeCompare(b.puzzleId);
    });
    const chosen = pickEvenlySpaced(pool, spec.count);
    const stats =
      chosen.length > 0
        ? ` (${chosen[0].rating}→${chosen[chosen.length - 1].rating})`
        : "";
    console.log(
      `   ch.${spec.id} ${spec.title.padEnd(26)} ${String(chosen.length).padStart(2)}/${spec.count} from pool of ${String(pool.length).padStart(5)}${stats}` +
        (chosen.length < spec.count ? "  ⚠ underfull" : "")
    );
    for (const row of chosen) {
      out.push({
        id: row.puzzleId,
        fen: row.fen,
        moves: row.movesList,
        rating: row.rating,
        themes: [...row.themes],
        chapter: spec.id,
        index: globalIndex++,
      });
    }
  }

  if (out.length < TOTAL_EXPECTED) {
    console.warn(
      `⚠ Only ${out.length} / ${TOTAL_EXPECTED} puzzles found; relax filters or raise caps`
    );
  }

  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(OUT_PATH, JSON.stringify(out, null, 2) + "\n", "utf8");
  console.log(`✓ Wrote ${out.length} puzzles → ${OUT_PATH}`);
}

main().catch((err) => {
  console.error("✗ Build failed:", err);
  process.exit(1);
});
