import { useState } from "react";
import { QUOTES } from "../data/quotes.js";

export default function QuoteLog() {
  const [index, setIndex] = useState(0);
  const [hasSwapped, setHasSwapped] = useState(false);
  const { hash, author, text } = QUOTES[index];

  function showAnother() {
    // any quote except the current one
    let next = Math.floor(Math.random() * (QUOTES.length - 1));
    if (next >= index) next += 1;
    setIndex(next);
    setHasSwapped(true);
  }

  return (
    <aside className="quotes" aria-labelledby="quotes-title">
      <div className="quotes-head">
        <h3 id="quotes-title">Overheard in the git log</h3>
        <button type="button" className="btn btn-quiet btn-small" onClick={showAnother}>
          Show another
        </button>
      </div>
      <div aria-live="polite">
        {/* keyed by quote so the entry remounts and replays its swap animation */}
        <figure key={hash} className={hasSwapped ? "log-entry swap" : "log-entry"}>
          <p className="log-hash">commit {hash}</p>
          <figcaption className="log-author">Author: {author}</figcaption>
          <blockquote>{text}</blockquote>
        </figure>
      </div>
    </aside>
  );
}
