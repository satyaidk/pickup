import QuoteLog from "./QuoteLog.jsx";

export default function WhyIBuiltThis() {
  return (
    <section className="why" id="why" aria-labelledby="why-title">
      <h2 id="why-title">Why I built this</h2>
      <div className="why-body">
        <div className="prose">
          <p>
            I write code every day, and the moment that slowed me down most wasn't a failing build.
            It was the empty commit box. After an hour of work I knew exactly what I'd changed,
            but putting it into one clear line felt like a second job, so I'd type "update" and push.
          </p>
          <p>
            A lot of developers are in the same place, especially people who build with AI assistants
            and ship real projects without ever being taught git's conventions. Their history fills up
            with "fix stuff" and "final changes". That makes it hard to review work, find the commit that
            broke something, or show a project to anyone else.
          </p>
          <p>
            Pickup closes that gap. It reads the actual diff, so the message describes what really changed
            instead of guessing. It follows the conventions teams use, so every commit it writes is also
            an example of how to write one. The goal is that you keep building, and your history
            still tells the story of what you built.
          </p>
        </div>
        <QuoteLog />
      </div>
    </section>
  );
}
