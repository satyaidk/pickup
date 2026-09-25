// Shared pieces for the Git Bash (mintty) look used by the diff box and the terminal demo.

const PROJECT_PATH = "/c/Users/you/my-project";

export function BashTitleBar() {
  return (
    <div className="bash-titlebar" aria-hidden="true">
      <span className="bash-title">MINGW64:{PROJECT_PATH}</span>
      <span className="bash-controls">
        <span>&#x2013;</span>
        <span>&#x25A1;</span>
        <span>&#x2715;</span>
      </span>
    </div>
  );
}

/** The first line of Git Bash's two-line prompt: user@host, MINGW64, path and branch. */
export function BashPrompt() {
  return (
    <>
      <span className="b-green">you@laptop</span> <span className="b-magenta">MINGW64</span>{" "}
      <span className="b-yellow">~/my-project</span> <span className="b-cyan">(main)</span>
    </>
  );
}
