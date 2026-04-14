// The default theme — a cute animal kingdom.
// Uppercase keys = white pieces (Savanna); lowercase = black pieces (Forest).

export const animalKingdom = {
  id: "animalKingdom",
  name: "Animal Kingdom",
  pieces: {
    K: "🦁",
    Q: "🦅",
    R: "🐘",
    B: "🦊",
    N: "🐴",
    P: "🐰",
    k: "🐺",
    q: "🦉",
    r: "🐻",
    b: "🐍",
    n: "🦌",
    p: "🐭",
  },
  labels: {
    K: "Lion",
    Q: "Eagle",
    R: "Elephant",
    B: "Fox",
    N: "Horse",
    P: "Rabbit",
    k: "Wolf",
    q: "Owl",
    r: "Bear",
    b: "Snake",
    n: "Deer",
    p: "Mouse",
  },
  boardColors: {
    light: "#88c255",
    dark: "#5d9a2f",
    border: "#4a6b2a",
    coord: "#2d4a1a",
  },
  sideNames: { white: "Savanna", black: "Forest" },
  sideEmojis: { white: "🦁", black: "🐺" },
  sideClimates: { white: "☀️", black: "🌲" },
  winText: {
    white: "The lion reigns supreme",
    black: "The wolf rules the forest",
  },
};
