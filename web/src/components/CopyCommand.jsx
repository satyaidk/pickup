import { useState } from "react";

/** A terminal command with a copy button. */
export default function CopyCommand({ command }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      // Clipboard unavailable; the command is visible to copy by hand.
    }
  }

  return (
    <div className="command">
      <code>
        <span className="command-prompt" aria-hidden="true">$ </span>
        {command}
      </code>
      <button type="button" className="command-copy" onClick={copy} aria-label={`Copy ${command}`}>
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
