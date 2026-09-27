/**
 * The theme: light, dark, or whatever the OS says. The pick is kept in localStorage, which the
 * window and the canvas in its frame share, being one origin. The script at the top of index.html,
 * home.html and canvas.html puts it on `<html>` as `data-theme` before the page paints, and again
 * on the storage event, which is how a pick made in the window reaches the canvas (tokens.css turns
 * it into a `color-scheme`, App.tsx into tldraw's). The desktop app is told too, for its title bar.
 */
export type Theme = "system" | "light" | "dark";

export const THEME_KEY = "sp-theme";

/** The pick, "system" when there is none. */
export function storedTheme(): Theme {
  let theme: string | null = null;
  try {
    theme = localStorage.getItem(THEME_KEY);
  } catch {} // storage turned off: the OS decides, as it does with nothing picked
  return theme === "light" || theme === "dark" ? theme : "system";
}

/** This page's theme now, every other page's on the storage event, and the app's title bar's. */
export function pickTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {} // the pick then lasts only as long as this page
  window.startup?.theme(theme);
}
