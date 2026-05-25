import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import {
  computeSwissPairings,
  createTournamentRound,
  currentRoundComplete,
  extractPairingHistory,
  extractParticipants,
  finishTournament,
  getTournament,
  joinTournament,
  startTournament,
} from "../lib/tournament.js";
import { supabase } from "../lib/supabase.js";
import { SummitBadge } from "./SummitBadge.jsx";
import {
  cardStyle,
  errorBoxStyle,
  ghostBtnStyle,
  menuDescStyle,
  menuLabelStyle,
  primaryBtnStyle,
} from "./ui.js";

const RESULT_LABEL = { white: "White wins", black: "Black wins", draw: "Draw", bye: "Bye" };
const RESULT_COLOR = {
  white: "var(--success)", black: "var(--accent-hover)", draw: "var(--text-secondary)", bye: "var(--text-tertiary)",
};

export function TournamentRoom() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tournament, setTournament] = useState(null);
  const [loading, setLoading]       = useState(true);
  const [err, setErr]               = useState(null);
  const [busy, setBusy]             = useState(false);

  const load = useCallback(async () => {
    try {
      setTournament(await getTournament(id));
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
    // Realtime: refresh on any change to tournament tables
    const ch = supabase
      .channel(`tournament-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tournaments", filter: `id=eq.${id}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "tournament_participants" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "tournament_pairings" }, load)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [id, load]);

  if (loading) return <Screen><p style={{ color: "var(--text-tertiary)" }}>Loading…</p></Screen>;
  if (!tournament) return <Screen><p style={{ color: "var(--error)" }}>{err ?? "Tournament not found."}</p></Screen>;

  const isHost     = user?.id === tournament.host_id;
  const isMember   = (tournament.tournament_participants ?? []).some((p) => p.player_id === user?.id);
  const participants = extractParticipants(tournament);
  const roundsDone = currentRoundComplete(tournament);
  const allRoundsDone = tournament.current_round >= tournament.rounds_total && roundsDone;

  // Standings: sort by score desc, then ELO desc
  const standings = [...participants].sort((a, b) => b.score - a.score || b.elo - a.elo);

  // Current round pairings
  const currentRound = (tournament.tournament_rounds ?? []).find(
    (r) => r.round_number === tournament.current_round
  );

  const handleJoin = async () => {
    setBusy(true);
    try {
      await joinTournament(id);
      await load();
      setErr(null);
    } catch (e) { setErr(e.message || String(e)); }
    finally { setBusy(false); }
  };

  const handleStart = async () => {
    setBusy(true);
    try {
      await startTournament(id);
      await load();
      setErr(null);
    } catch (e) { setErr(e.message || String(e)); }
    finally { setBusy(false); }
  };

  const handleStartRound = async () => {
    setBusy(true);
    try {
      const history  = extractPairingHistory(tournament);
      const nextRound = tournament.current_round + 1;
      const pairings = computeSwissPairings(participants, history, nextRound);
      await createTournamentRound(id, pairings);
      await load();
      setErr(null);
    } catch (e) { setErr(e.message || String(e)); }
    finally { setBusy(false); }
  };

  const handleFinish = async () => {
    if (!window.confirm("End the tournament and lock the final standings?")) return;
    setBusy(true);
    try {
      await finishTournament(id);
      await load();
      setErr(null);
    } catch (e) { setErr(e.message || String(e)); }
    finally { setBusy(false); }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", justifyContent: "center", padding: "32px 20px 64px" }}>
      <div style={{ maxWidth: 640, width: "100%" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
          <SummitBadge size="header" showWordmark />
          <button onClick={() => navigate("/tournament")} style={ghostBtnStyle}>← Back</button>
        </div>

        {/* Title + status */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h2 style={{
              fontFamily: "var(--font-display)", fontSize: "var(--text-lg)", fontWeight: 700,
              color: "var(--text-primary)", margin: 0, letterSpacing: "-0.02em",
              fontVariationSettings: '"SOFT" 30, "opsz" 144',
            }}>
              {tournament.name}
            </h2>
            <StatusBadge status={tournament.status} />
          </div>
          <p style={{ color: "var(--text-secondary)", fontSize: "var(--text-sm)", margin: "4px 0 0" }}>
            Host: {tournament.host?.display_name ?? "Unknown"} · {tournament.rounds_total} rounds
            {tournament.status === "active" && ` · Round ${tournament.current_round}/${tournament.rounds_total}`}
          </p>
        </div>

        {err && <div style={{ ...errorBoxStyle, marginBottom: 16 }}>{err}</div>}

        {/* ── LOBBY state ── */}
        {tournament.status === "lobby" && (
          <div style={{ ...cardStyle, padding: "20px 24px", marginBottom: 16 }}>
            <SectionLabel>Players ({participants.length})</SectionLabel>
            <PlayerList participants={standings} userId={user?.id} hostId={tournament.host_id} />

            <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
              {!isMember && (
                <button onClick={handleJoin} disabled={busy} style={{ ...primaryBtnStyle, padding: "10px 20px" }}>
                  {busy ? "Joining…" : "Join Tournament"}
                </button>
              )}
              {isHost && (
                <button onClick={handleStart} disabled={busy || participants.length < 2} style={{ ...primaryBtnStyle, padding: "10px 20px" }}>
                  {busy ? "Starting…" : `Start Tournament (${participants.length} players)`}
                </button>
              )}
            </div>
            {isHost && participants.length < 2 && (
              <p style={{ color: "var(--text-tertiary)", fontSize: "var(--text-xs)", marginTop: 8 }}>
                Need at least 2 players to start.
              </p>
            )}
          </div>
        )}

        {/* ── ACTIVE / FINISHED state ── */}
        {(tournament.status === "active" || tournament.status === "finished") && (
          <>
            {/* Standings */}
            <div style={{ ...cardStyle, padding: "20px 24px", marginBottom: 16 }}>
              <SectionLabel>Standings</SectionLabel>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--text-sm)" }}>
                <thead>
                  <tr>
                    {["#", "Player", "Score", "ELO"].map((h) => (
                      <th key={h} style={{
                        textAlign: h === "#" || h === "Score" || h === "ELO" ? "center" : "left",
                        padding: "6px 8px", fontSize: "var(--text-xs)", color: "var(--text-tertiary)",
                        textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600,
                        borderBottom: "1px solid var(--border)",
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {standings.map((p, i) => {
                    const isMe = p.playerId === user?.id;
                    return (
                      <tr key={p.playerId} style={{ background: isMe ? "var(--primary-tint)" : "transparent" }}>
                        <td style={{ textAlign: "center", padding: "10px 8px", fontWeight: 700, color: i < 3 ? "var(--accent-hover)" : "var(--text-tertiary)" }}>
                          {i + 1}
                        </td>
                        <td style={{ padding: "10px 8px", fontWeight: isMe ? 700 : 400, color: "var(--text-primary)" }}>
                          {p.displayName}{isMe && " (you)"}
                        </td>
                        <td style={{ textAlign: "center", padding: "10px 8px", fontWeight: 700, color: "var(--primary)" }}>
                          {p.score % 1 === 0 ? p.score : p.score.toFixed(1)}
                        </td>
                        <td style={{ textAlign: "center", padding: "10px 8px", color: "var(--text-secondary)" }}>
                          {p.elo}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Current round pairings */}
            {currentRound && (
              <div style={{ ...cardStyle, padding: "20px 24px", marginBottom: 16 }}>
                <SectionLabel>Round {currentRound.round_number} Pairings</SectionLabel>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {(currentRound.tournament_pairings ?? []).map((p) => {
                    const pending = p.result == null;
                    const isMyGame = p.white_id === user?.id || p.black_id === user?.id;
                    return (
                      <div
                        key={p.id}
                        style={{
                          display: "flex", alignItems: "center", gap: 12,
                          padding: "12px 14px", borderRadius: "var(--radius-sm)",
                          border: `1px solid ${isMyGame && pending ? "var(--accent)" : "var(--border)"}`,
                          background: isMyGame && pending ? "var(--accent-tint)" : "var(--bg-sunk)",
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ ...menuLabelStyle, fontSize: "var(--text-sm)" }}>
                            {p.black_id
                              ? `${p.white?.display_name ?? "?"} vs ${p.black?.display_name ?? "?"}`
                              : `${p.white?.display_name ?? "?"}`}
                          </span>
                          {p.black_id && (
                            <span style={menuDescStyle}>
                              {p.white?.elo ?? "?"} vs {p.black?.elo ?? "?"} ELO
                            </span>
                          )}
                        </div>
                        {pending && p.game_id && isMyGame && (
                          <button
                            onClick={() => navigate(`/game/${p.game_id}`)}
                            style={{ ...primaryBtnStyle, padding: "8px 16px", fontSize: "var(--text-xs)" }}
                          >
                            Play →
                          </button>
                        )}
                        {pending && p.game_id && !isMyGame && (
                          <button
                            onClick={() => navigate(`/game/${p.game_id}`)}
                            style={{ ...ghostBtnStyle, fontSize: "var(--text-xs)" }}
                          >
                            Watch
                          </button>
                        )}
                        {p.result === "bye" && (
                          <span style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)", fontWeight: 600 }}>BYE +1</span>
                        )}
                        {p.result && p.result !== "bye" && (
                          <span style={{
                            fontSize: "var(--text-xs)", fontWeight: 700, padding: "3px 8px",
                            borderRadius: "var(--radius-pill)", background: "var(--bg-raised)",
                            color: RESULT_COLOR[p.result] ?? "var(--text-secondary)",
                          }}>
                            {RESULT_LABEL[p.result] ?? p.result}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Host controls */}
            {isHost && tournament.status === "active" && (
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {!allRoundsDone && roundsDone && (
                  <button onClick={handleStartRound} disabled={busy} style={{ ...primaryBtnStyle, padding: "12px 24px" }}>
                    {busy ? "Starting…" : `Start Round ${tournament.current_round + 1}`}
                  </button>
                )}
                {tournament.current_round === 0 && (
                  <button onClick={handleStartRound} disabled={busy} style={{ ...primaryBtnStyle, padding: "12px 24px" }}>
                    {busy ? "Starting…" : "Start Round 1"}
                  </button>
                )}
                {allRoundsDone && (
                  <button onClick={handleFinish} disabled={busy} style={{ ...primaryBtnStyle, padding: "12px 24px" }}>
                    {busy ? "Finishing…" : "End Tournament"}
                  </button>
                )}
                {!roundsDone && tournament.current_round > 0 && (
                  <p style={{ color: "var(--text-tertiary)", fontSize: "var(--text-sm)", margin: 0, alignSelf: "center" }}>
                    Waiting for all round {tournament.current_round} games to finish…
                  </p>
                )}
              </div>
            )}

            {tournament.status === "finished" && (
              <div style={{ ...cardStyle, padding: "20px 24px", textAlign: "center" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🏆</div>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "var(--text-lg)", color: "var(--text-primary)" }}>
                  {standings[0]?.displayName ?? "—"} wins!
                </div>
                <div style={{ color: "var(--text-secondary)", fontSize: "var(--text-sm)", marginTop: 4 }}>
                  Final score: {standings[0]?.score ?? 0} points
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Screen({ children }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      {children}
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize: "var(--text-xs)", color: "var(--text-tertiary)", textTransform: "uppercase",
      letterSpacing: "0.12em", fontWeight: 600, marginBottom: 12,
    }}>
      {children}
    </div>
  );
}

function StatusBadge({ status }) {
  const colors = { lobby: "var(--success)", active: "var(--accent-hover)", finished: "var(--text-tertiary)" };
  const labels = { lobby: "Open", active: "In Progress", finished: "Finished" };
  return (
    <span style={{
      fontSize: "var(--text-xs)", fontWeight: 700, padding: "4px 10px",
      borderRadius: "var(--radius-pill)", background: "var(--bg-sunk)",
      color: colors[status] ?? "var(--text-tertiary)",
    }}>
      {labels[status] ?? status}
    </span>
  );
}

function PlayerList({ participants, userId, hostId }) {
  if (participants.length === 0) {
    return <p style={{ color: "var(--text-tertiary)", fontSize: "var(--text-sm)", margin: 0, fontStyle: "italic" }}>No players yet.</p>;
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {participants.map((p) => (
        <div key={p.playerId} style={{
          display: "flex", alignItems: "center", gap: 10, padding: "8px 12px",
          borderRadius: "var(--radius-sm)", background: p.playerId === userId ? "var(--primary-tint)" : "var(--bg-sunk)",
        }}>
          <span style={{ flex: 1, fontSize: "var(--text-sm)", fontWeight: p.playerId === userId ? 700 : 400, color: "var(--text-primary)" }}>
            {p.displayName}
            {p.playerId === userId && " (you)"}
            {p.playerId === hostId && <span style={{ color: "var(--text-tertiary)", fontWeight: 400, marginLeft: 6, fontSize: "var(--text-xs)" }}>host</span>}
          </span>
          <span style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)" }}>ELO {p.elo}</span>
        </div>
      ))}
    </div>
  );
}
