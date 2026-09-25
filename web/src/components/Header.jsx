import { useRef } from "react";
import { REPO_URL } from "../config.js";
import GuideDialog from "./GuideDialog.jsx";
import ThemeToggle from "./ThemeToggle.jsx";

export default function Header() {
  const guideRef = useRef(null);

  return (
    <header className="bar">
      <a className="wordmark" href="#top" aria-label="Pickup home">
        <svg viewBox="0 0 20 32" aria-hidden="true">
          <line x1="10" y1="0" x2="10" y2="32" />
          <circle cx="10" cy="16" r="5" />
        </svg>
        pickup
      </a>
      <div className="bar-end">
        <nav aria-label="Page">
          <a href="#anatomy">How to write one</a>
          <a href="#cli">Terminal</a>
          <a href="#why">Why I built it</a>
          <a href={REPO_URL}>GitHub</a>
        </nav>
        <button
          type="button"
          className="btn btn-quiet btn-small guide-open"
          aria-haspopup="dialog"
          onClick={() => guideRef.current?.showModal()}
        >
          How to use
        </button>
        <ThemeToggle />
      </div>
      <GuideDialog dialogRef={guideRef} />
    </header>
  );
}
