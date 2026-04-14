import { animalKingdom } from "./animalKingdom.js";
import { classic } from "./classic.js";

export const THEMES = {
  [animalKingdom.id]: animalKingdom,
  [classic.id]: classic,
};

export const THEME_LIST = Object.values(THEMES);

export const DEFAULT_THEME_ID = "animalKingdom";

export function getTheme(id) {
  return THEMES[id] || THEMES[DEFAULT_THEME_ID];
}
