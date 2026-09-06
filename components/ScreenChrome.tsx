import { CHROME_TOP, type Screen } from "@/lib/tokens";

/** the system chrome a screen can draw: the 9:41 status bar (signal, wifi,
 *  battery) and the home indicator. Not parts — the OS owns these — so they
 *  render from the screen's own `chrome` flag in every surface. */
export function ScreenChrome({ screen, dark }: { screen: Screen; dark: boolean }) {
  if (!screen.chrome) return null;
  return (
    <div className="screen-chrome" style={{ color: dark ? "#fff" : "#000" }} aria-hidden>
      <span className="chrome-time">9:41</span>
      <svg className="chrome-status" width="78" height="13" viewBox="0 0 78 13" fill="currentColor">
        <rect x="0" y="8" width="3" height="4" rx="1" />
        <rect x="5" y="6" width="3" height="6" rx="1" />
        <rect x="10" y="4" width="3" height="8" rx="1" />
        <rect x="15" y="2" width="3" height="10" rx="1" />
        <path d="M25 5.6 A 9.5 9.5 0 0 1 39 5.6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M28.4 8.6 A 5.5 5.5 0 0 1 35.6 8.6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <circle cx="32" cy="11" r="1.4" />
        <rect x="49" y="2" width="23" height="9" rx="2.6" fill="none" stroke="currentColor" strokeOpacity="0.4" />
        <rect x="51" y="4" width="16" height="5" rx="1.2" />
        <path d="M73.6 4.8 v3.4" stroke="currentColor" strokeOpacity="0.4" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
      <div className="chrome-home" />
    </div>
  );
}

export const CHROME_TOP_PX = CHROME_TOP;
