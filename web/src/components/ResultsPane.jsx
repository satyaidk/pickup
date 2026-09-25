import { useState } from "react";
import { fullMessage, gitCommand, pluralFiles } from "../lib/commit.js";
import Candidate from "./Candidate.jsx";

export default function ResultsPane({ output }) {
  return (
    <div className="pane pane-output" aria-live="polite" aria-busy={output.status === "loading"}>
      {output.status === "empty" && (
        <div className="state state-empty">
          <p className="state-title">Your messages will appear here.</p>
          <p>
            Paste a diff and select <strong>Write messages</strong>. No diff handy? Try the example to see what you get.
          </p>
        </div>
      )}

      {output.status === "loading" && (
        <div className="state state-loading">
          <p className="state-title">Reading your changes</p>
          <p>
            {output.stats.files > 0 &&
              `${pluralFiles(output.stats.files)}, ${output.stats.added} lines added and ${output.stats.removed} removed. `}
            This usually takes a few seconds.
          </p>
          <div className="scan" aria-hidden="true" />
        </div>
      )}

      {output.status === "error" && (
        <div className="state state-error">
          <p className="state-title">Couldn't write messages</p>
          <p>{output.error}</p>
        </div>
      )}

      {output.status === "results" && <Results result={output.result} />}
    </div>
  );
}

function Results({ result }) {
  const { summary, candidates, split_hint: splitHint } = result;
  const [selected, setSelected] = useState(0);
  const [copyStatus, setCopyStatus] = useState("");

  // Results remount after every loading state, so each new set starts on the top pick.
  const pick = candidates[selected] ?? candidates[0];

  async function copy(text, confirmation) {
    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus(confirmation);
    } catch {
      setCopyStatus("Couldn't copy. Select the text and copy it manually.");
    }
  }

  function select(index) {
    setSelected(index);
    setCopyStatus("");
  }

  return (
    <div className="state state-results">
      <p className="summary">{summary}</p>
      <fieldset className="candidates">
        <legend className="visually-hidden">Pick a commit message</legend>
        {candidates.map((candidate, index) => (
          <Candidate
            key={`${index}-${candidate.subject}`}
            candidate={candidate}
            index={index}
            checked={index === selected}
            onSelect={select}
          />
        ))}
      </fieldset>
      {splitHint && <p className="split">Consider splitting this commit. {splitHint}</p>}
      <div className="actions">
        <button type="button" className="btn btn-primary" onClick={() => copy(fullMessage(pick), "Message copied")}>
          Copy message
        </button>
        <button type="button" className="btn btn-quiet" onClick={() => copy(gitCommand(pick), "Command copied")}>
          Copy as git command
        </button>
        <span className="copied" role="status">{copyStatus}</span>
      </div>
    </div>
  );
}
