import CopyCommand from "./CopyCommand.jsx";

// Copying the diff straight to the clipboard depends on the operating system.
function clipboardCommand() {
  const platform = (navigator.userAgentData?.platform || navigator.platform || "").toLowerCase();
  if (platform.includes("win")) return { command: "git diff --staged | clip", note: null };
  if (platform.includes("mac")) return { command: "git diff --staged | pbcopy", note: null };
  return { command: "git diff --staged", note: "Then select the output in your terminal and copy it." };
}

function steps() {
  const clip = clipboardCommand();
  return [
    {
      title: "Open a terminal in your project",
      body: "In VS Code, open the Terminal menu and choose New Terminal. It opens in your project folder.",
    },
    {
      title: "Stage your changes",
      body: "This tells git which changes belong in your next commit. The dot means everything you changed.",
      command: "git add .",
    },
    {
      title: "Copy your staged changes",
      body: "This copies the diff: the exact lines you added and removed.",
      command: clip.command,
      note: clip.note,
    },
    {
      title: "Paste them into Pickup",
      body: "Paste into Your changes. You can also add a sentence about what you were trying to do. It helps Pickup explain why.",
    },
    {
      title: "Pick a message",
      body: "Select Write messages. You get three options, each with a note on when it fits. Pick one. If its green bar passes the orange mark, the subject is over 50 characters.",
    },
    {
      title: "Commit",
      body: "Select Copy as git command, paste it into your terminal and press Enter. Using the Source Control box in VS Code instead? Select Copy message and paste it there.",
    },
    {
      title: "Push to GitHub",
      body: "Your commit, with a clear message, goes up to GitHub.",
      command: "git push",
    },
  ];
}

export default function GuideDialog({ dialogRef }) {
  function close() {
    dialogRef.current?.close();
  }

  function goToChanges() {
    close();
    const diff = document.getElementById("diff");
    diff?.scrollIntoView({ block: "center" });
    diff?.focus({ preventScroll: true });
  }

  // Clicks on the backdrop land on the dialog element itself.
  function handleClick(event) {
    if (event.target === event.currentTarget) close();
  }

  const list = steps();

  return (
    <dialog className="guide-dialog" ref={dialogRef} aria-labelledby="guide-title" onClick={handleClick}>
      <div className="guide-panel">
        <div className="guide-head">
          <h2 id="guide-title">How to use Pickup</h2>
          <button type="button" className="guide-close" onClick={close}>
            Close
          </button>
        </div>
        <p className="guide-intro">
          From finished code to a commit on GitHub, in {list.length} steps. Each command has a copy button,
          so you don't need to remember any of them.
        </p>

        <ol className="timeline">
          {list.map((step, i) => (
            <li key={step.title} className={i === list.length - 1 ? "step step-last" : "step"}>
              <span className="step-dot" aria-hidden="true">{i + 1}</span>
              <h3>{step.title}</h3>
              <p className="step-body">{step.body}</p>
              {step.command && <CopyCommand command={step.command} />}
              {step.note && <p className="step-note">{step.note}</p>}
            </li>
          ))}
        </ol>

        <div className="guide-foot">
          <button type="button" className="btn btn-primary" onClick={goToChanges}>
            Go to Your changes
          </button>
          <p>
            Prefer the terminal? After step 2, run <code>pickup</code> and it handles steps 3 to 6 for you.{" "}
            <a href="#cli" onClick={close}>See how</a>
          </p>
        </div>
      </div>
    </dialog>
  );
}
