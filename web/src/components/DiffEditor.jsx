import { useDeferredValue, useMemo, useRef } from "react";
import { BashPrompt, BashTitleBar } from "./Bash.jsx";

// A textarea styled as a Git Bash (mintty) window. A textarea can't color its own text,
// so a highlighted copy of the diff sits behind a transparent textarea, scrolled in step.

const HEADER_PREFIXES = [
  "diff --git", "index ", "--- ", "+++ ", "new file mode", "deleted file mode",
  "old mode", "new mode", "similarity index", "rename from", "rename to", "Binary files",
];

/** Colors each line the way `git diff` does in a terminal. */
function highlightDiff(text) {
  let inFileHeader = false;
  return text.split("\n").map((line, i) => {
    let content;
    if (line.startsWith("diff --git")) {
      inFileHeader = true;
      content = <span className="d-meta">{line}</span>;
    } else if (inFileHeader && HEADER_PREFIXES.some((prefix) => line.startsWith(prefix))) {
      content = <span className="d-meta">{line}</span>;
    } else if (line.startsWith("@@")) {
      inFileHeader = false;
      const end = line.indexOf("@@", 2);
      content =
        end === -1 ? (
          <span className="d-hunk">{line}</span>
        ) : (
          <>
            <span className="d-hunk">{line.slice(0, end + 2)}</span>
            {line.slice(end + 2)}
          </>
        );
    } else if (line.startsWith("+")) {
      content = <span className="d-add">{line}</span>;
    } else if (line.startsWith("-")) {
      content = <span className="d-del">{line}</span>;
    } else {
      content = line;
    }
    return (
      <span key={i}>
        {content}
        {"\n"}
      </span>
    );
  });
}

export default function DiffEditor({ value, onChange, textareaRef, placeholder, describedBy }) {
  const highlightRef = useRef(null);
  // Highlighting a huge paste can lag; let typing stay responsive and catch up after.
  const deferred = useDeferredValue(value);
  const highlighted = useMemo(() => highlightDiff(deferred), [deferred]);

  function syncScroll(event) {
    highlightRef.current.scrollTop = event.target.scrollTop;
    highlightRef.current.scrollLeft = event.target.scrollLeft;
  }

  return (
    <div className="bash">
      <BashTitleBar />
      <div className="bash-prompt" aria-hidden="true">
        <BashPrompt />
        {"\n"}$ git diff --staged
      </div>
      <div className="bash-editor">
        <pre className="bash-highlight" ref={highlightRef} aria-hidden="true">
          {highlighted}
          {/* room for the textarea's last line and horizontal scrollbar */}
          {"\n "}
        </pre>
        <textarea
          id="diff"
          ref={textareaRef}
          wrap="off"
          spellCheck={false}
          autoComplete="off"
          aria-describedby={describedBy}
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onScroll={syncScroll}
        />
      </div>
    </div>
  );
}
