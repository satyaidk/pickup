import { useEffect, useState } from "react";

// Keep in sync with the inline script in web/index.html, which applies a saved choice before React loads.
const STORAGE_KEY = "pickup-theme";
const darkQuery = () => window.matchMedia("(prefers-color-scheme: dark)");

function savedTheme() {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null;
  }
}

const systemTheme = () => (darkQuery().matches ? "dark" : "light");

/**
 * Follows the system theme until the person picks one, then remembers their pick.
 * The page's CSS reads data-theme on <html>; with no attribute it follows prefers-color-scheme.
 */
export default function ThemeToggle() {
  const [theme, setTheme] = useState(() => savedTheme() ?? systemTheme());
  const [switched, setSwitched] = useState(false); // animate the icon only after a click, not on load

  // While nothing is saved, track system changes (for example, an OS that switches at sunset).
  useEffect(() => {
    const query = darkQuery();
    const onChange = () => {
      if (!savedTheme()) setTheme(systemTheme());
    };
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    setSwitched(true);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Storage blocked: the switch still works for this visit.
    }
  }

  const label = theme === "dark" ? "Switch to light theme" : "Switch to dark theme";

  return (
    <button type="button" className={switched ? "theme-toggle switched" : "theme-toggle"} onClick={toggle} aria-label={label} title={label}>
      {/* key remounts the icon so it replays its turn-in animation */}
      {theme === "dark" ? <SunIcon key="sun" /> : <MoonIcon key="moon" />}
    </button>
  );
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="theme-icon">
      <circle cx="12" cy="12" r="4.2" />
      <g strokeLinecap="round">
        <line x1="12" y1="2.5" x2="12" y2="4.6" />
        <line x1="12" y1="19.4" x2="12" y2="21.5" />
        <line x1="2.5" y1="12" x2="4.6" y2="12" />
        <line x1="19.4" y1="12" x2="21.5" y2="12" />
        <line x1="5.3" y1="5.3" x2="6.8" y2="6.8" />
        <line x1="17.2" y1="17.2" x2="18.7" y2="18.7" />
        <line x1="5.3" y1="18.7" x2="6.8" y2="17.2" />
        <line x1="17.2" y1="6.8" x2="18.7" y2="5.3" />
      </g>
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="theme-icon">
      <path d="M20.2 14.6A8.4 8.4 0 0 1 9.4 3.8a8.4 8.4 0 1 0 10.8 10.8Z" strokeLinejoin="round" />
    </svg>
  );
}
