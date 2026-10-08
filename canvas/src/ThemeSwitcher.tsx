import { useEffect, useState } from "react";
import { DesktopDevice, Moon, Sun } from "./geistIcons";
import { pickTheme, storedTheme } from "./theme";

const CHOICES = [
  ["system", "System", DesktopDevice],
  ["light", "Light", Sun],
  ["dark", "Dark", Moon],
] as const;

/**
 * The theme (theme.ts) as Vercel's footer offers it: three glyphs in a pill, at the right end of
 * the top bar.
 */
export function ThemeSwitcher() {
  const [theme, setTheme] = useState(storedTheme);
  // The app starts on the OS's until the page says, since the pick lives in the page's storage.
  useEffect(() => window.startup?.theme(storedTheme()), []);
  // Picked in another window of the same app, which shares the storage.
  useEffect(() => {
    const follow = () => setTheme(storedTheme());
    window.addEventListener("storage", follow);
    return () => window.removeEventListener("storage", follow);
  }, []);
  return (
    <div className="sp-theme" role="radiogroup" aria-label="Theme">
      {CHOICES.map(([value, label, Icon]) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={theme === value}
          title={label}
          onClick={() => {
            setTheme(value);
            pickTheme(value);
          }}
        >
          <Icon />
        </button>
      ))}
    </div>
  );
}
