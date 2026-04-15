import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { useAuth } from "./hooks/useAuth.js";
import { AIGame } from "./components/AIGame.jsx";
import { FeedbackForm } from "./components/FeedbackForm.jsx";
import { GameRoom } from "./components/GameRoom.jsx";
import { Leaderboard } from "./components/Leaderboard.jsx";
import { Lobby } from "./components/Lobby.jsx";
import { LoginScreen } from "./components/LoginScreen.jsx";
import { Menu } from "./components/Menu.jsx";
import { PlayMenu } from "./components/PlayMenu.jsx";
import { PuzzleBookHome } from "./components/PuzzleBookHome.jsx";
import { ChapterIntro } from "./components/ChapterIntro.jsx";
import { PuzzleMode } from "./components/PuzzleMode.jsx";

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#78716c" }}>
        Loading…
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return children;
}

function RedirectHome() {
  const { user, loading } = useAuth();
  if (loading) return null;
  return <Navigate to={user ? "/menu" : "/login"} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RedirectHome />} />
        <Route path="/login" element={<LoginScreen />} />
        <Route
          path="/menu"
          element={
            <RequireAuth>
              <Menu />
            </RequireAuth>
          }
        />
        <Route
          path="/play"
          element={
            <RequireAuth>
              <PlayMenu />
            </RequireAuth>
          }
        />
        <Route
          path="/play/ai/:difficulty"
          element={
            <RequireAuth>
              <AIGame />
            </RequireAuth>
          }
        />
        <Route
          path="/lobby"
          element={
            <RequireAuth>
              <Lobby />
            </RequireAuth>
          }
        />
        <Route
          path="/game/:id"
          element={
            <RequireAuth>
              <GameRoom />
            </RequireAuth>
          }
        />
        <Route
          path="/puzzles"
          element={
            <RequireAuth>
              <PuzzleBookHome />
            </RequireAuth>
          }
        />
        <Route
          path="/puzzles/chapter/:id"
          element={
            <RequireAuth>
              <ChapterIntro />
            </RequireAuth>
          }
        />
        <Route
          path="/puzzles/solve/:idx"
          element={
            <RequireAuth>
              <PuzzleMode />
            </RequireAuth>
          }
        />
        <Route
          path="/leaderboard"
          element={
            <RequireAuth>
              <Leaderboard />
            </RequireAuth>
          }
        />
        <Route
          path="/feedback"
          element={
            <RequireAuth>
              <FeedbackForm />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
