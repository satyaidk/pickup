import { Fragment } from "react";
import { BashPrompt, BashTitleBar } from "./Bash.jsx";

const Bold = ({ children }) => <span className="t-bold">{children}</span>;
const Dim = ({ children }) => <span className="t-dim">{children}</span>;
const Num = ({ n }) => <span className="t-num">[{n}]</span>;

// A Git Bash session, one entry per line. Each command follows Git Bash's two-line prompt.
const SESSION = [
  <BashPrompt />,
  "$ git add .",
  "",
  <BashPrompt />,
  "$ pickup",
  "",
  <Dim>Adds a password reset flow: a form, an email token, and an API route.</Dim>,
  "",
  <><Num n={1} /> <Bold>feat(auth): add password reset by email</Bold>  <Dim>39 chars</Dim></>,
  "    Users who forget their password can now request a reset link.",
  <>    <Dim>The best fit if the reset flow is the main point.</Dim></>,
  "",
  <><Num n={2} /> <Bold>feat: add forgot-password form and reset route</Bold>  <Dim>46 chars</Dim></>,
  <><Num n={3} /> <Bold>feat(auth): send one-time reset tokens by email</Bold>  <Dim>47 chars</Dim></>,
  "",
  <>Commit with which message? [1-3, or q to quit] 1</>,
  "[main 4f2a91c] feat(auth): add password reset by email",
  " 3 files changed, 58 insertions(+), 2 deletions(-)",
  "",
  <BashPrompt />,
  <>$ <span className="bash-cursor" aria-hidden="true" /></>,
];

export default function TerminalDemo() {
  return (
    <section className="cli" id="cli" aria-labelledby="cli-title">
      <div className="cli-copy">
        <h2 id="cli-title">Use it from your terminal</h2>
        <p>
          Skip the copy and paste. Stage your changes, run <code>pickup</code>, and type the number
          of the message you want. Pickup makes the commit for you.
        </p>
        <p>
          Lockfiles are left out of what Pickup reads, since they describe dependencies, not your intent.
          Add <code>--hint "what you were doing"</code> for a better explanation of why,
          or <code>--dry-run</code> to see suggestions without committing.
        </p>
      </div>
      <div className="bash bash-demo">
        <BashTitleBar />
        <pre className="bash-output" tabIndex={0} aria-label="Example Git Bash session">
          {SESSION.map((line, i) => (
            <Fragment key={i}>
              {line}
              {i < SESSION.length - 1 && "\n"}
            </Fragment>
          ))}
        </pre>
      </div>
    </section>
  );
}
