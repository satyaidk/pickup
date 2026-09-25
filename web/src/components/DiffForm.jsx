import { useMemo, useRef, useState } from "react";
import { EXAMPLE_DIFF } from "../data/exampleDiff.js";
import { diffStats, pluralFiles } from "../lib/commit.js";
import DiffEditor from "./DiffEditor.jsx";

const DIFF_COMMAND = "git diff --staged";
const PLACEHOLDER = "Paste the output here…";

export default function DiffForm({ form, onChange, onSubmit, busy, diffRef }) {
  const submitRef = useRef(null);
  const [commandCopied, setCommandCopied] = useState(false);
  const stats = useMemo(() => (form.diff.trim() ? diffStats(form.diff) : null), [form.diff]);

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit();
  }

  function handleKeyDown(event) {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      onSubmit();
    }
  }

  function fillExample() {
    onChange({ diff: EXAMPLE_DIFF, hint: "" });
    if (diffRef.current) diffRef.current.scrollTop = 0;
    submitRef.current?.focus();
  }

  async function copyCommand() {
    try {
      await navigator.clipboard.writeText(DIFF_COMMAND);
      setCommandCopied(true);
      setTimeout(() => setCommandCopied(false), 1400);
    } catch {
      // Clipboard unavailable; the command is visible to copy by hand.
    }
  }

  return (
    <form className="pane pane-input" noValidate onSubmit={handleSubmit} onKeyDown={handleKeyDown}>
      <div className="field">
        <div className="field-head">
          <label htmlFor="diff">Your changes</label>
          <span className="stats" aria-live="polite">
            {stats && (
              <>
                {stats.files > 0 && `${pluralFiles(stats.files)}  `}
                <span className="add">+{stats.added}</span>
                <span className="del"> −{stats.removed}</span>
              </>
            )}
          </span>
        </div>
        <p className="help" id="diff-help">
          Stage your work, run{" "}
          <button type="button" className="inline-code" title="Copy command" onClick={copyCommand}>
            {commandCopied ? "Copied" : DIFF_COMMAND}
          </button>
          , and paste the output here.
        </p>
        <DiffEditor
          value={form.diff}
          onChange={(diff) => onChange({ diff })}
          textareaRef={diffRef}
          placeholder={PLACEHOLDER}
          describedBy="diff-help"
        />
      </div>

      <div className="field">
        <label htmlFor="hint">
          What were you trying to do? <span className="optional">Optional</span>
        </label>
        <input
          id="hint"
          type="text"
          autoComplete="off"
          placeholder="Users kept getting logged out when they refreshed"
          value={form.hint}
          onChange={(event) => onChange({ hint: event.target.value })}
        />
      </div>

      <div className="options">
        <fieldset>
          <legend>Format</legend>
          <label className="choice">
            <input
              type="radio"
              name="style"
              value="conventional"
              checked={form.style === "conventional"}
              onChange={() => onChange({ style: "conventional" })}
            />
            Conventional <code>feat: …</code>
          </label>
          <label className="choice">
            <input
              type="radio"
              name="style"
              value="simple"
              checked={form.style === "simple"}
              onChange={() => onChange({ style: "simple" })}
            />
            Plain sentence
          </label>
        </fieldset>
        <label className="choice">
          <input
            type="checkbox"
            checked={form.includeBody}
            onChange={(event) => onChange({ includeBody: event.target.checked })}
          />
          Include a body
        </label>
      </div>

      <div className="actions">
        <button type="submit" className="btn btn-primary" ref={submitRef} disabled={busy}>
          {busy ? "Writing messages" : "Write messages"}
        </button>
        <button type="button" className="btn btn-quiet" onClick={fillExample}>
          Use an example diff
        </button>
        <span className="kbd-hint">
          or press <kbd>Ctrl</kbd> <kbd>Enter</kbd>
        </span>
      </div>
    </form>
  );
}
