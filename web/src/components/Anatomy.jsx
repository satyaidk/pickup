const TYPES = [
  ["feat", "Something new a user can see or use"],
  ["fix", "A bug fix"],
  ["refactor", "Code restructured, behavior unchanged"],
  ["docs", "README, comments, or other documentation"],
  ["style", "Formatting only, like whitespace or semicolons"],
  ["test", "Tests added or changed"],
  ["chore", "Upkeep: dependencies, config, tooling"],
  ["perf", "Faster or lighter, same behavior"],
];

const BODY_LINES = [
  "The session cookie was set without a max-age, so browsers",
  "dropped it on reload. Set it to 7 days to match the token",
  "expiry on the server.",
];

function Line({ number, children, className = "msg", ...props }) {
  return (
    <div className="ln-row">
      <span className="ln" aria-hidden="true">{number}</span>
      <code className={className} {...props}>{children}</code>
    </div>
  );
}

export default function Anatomy() {
  return (
    <section className="anatomy" id="anatomy" aria-labelledby="anatomy-title">
      <h2 id="anatomy-title">What a good commit message looks like</h2>
      <p className="section-lede">
        Every message Pickup writes follows the same shape. Once you've seen it a few times,
        you'll start writing them yourself.
      </p>

      {/* Laid out like a code review: message lines, with a note under each part. */}
      <figure className="specimen">
        <figcaption className="visually-hidden">An example commit message with review notes on each part</figcaption>
        <Line number={1} className="msg msg-subject">
          <span className="tok-type">fix</span>
          <span className="tok-scope">(auth)</span>: keep users signed in after refresh
        </Line>
        <p className="comment">
          <strong>Type, scope, subject.</strong> <code>fix</code> is the kind of change and <code>(auth)</code> is
          where it happened. Then say what the commit does, as a command ("keep", not "kept"), in under 50
          characters with no period.
        </p>
        <Line number={2} aria-label="Blank line" />
        <p className="comment">
          <strong>Blank line.</strong> Git and GitHub use it to tell the subject from the body.
        </p>
        {BODY_LINES.map((line, i) => (
          <Line key={line} number={i + 3}>{line}</Line>
        ))}
        <p className="comment">
          <strong>Body.</strong> Explain why the change was needed, since the diff already shows how.
          Wrap lines at 72 characters.
        </p>
      </figure>

      <h3>The types you'll use most</h3>
      <dl className="types">
        {TYPES.map(([type, meaning]) => (
          <div key={type}>
            <dt>{type}</dt>
            <dd>{meaning}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
