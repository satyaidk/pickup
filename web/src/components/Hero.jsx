import { useEffect, useRef, useState } from "react";
import { SUBJECT_TARGET } from "../lib/commit.js";

// The headline is itself a commit subject, set on an editor's column ruler.
const SUBJECT = "feat: never stare at an empty commit box again";
const TYPE = "feat";
const RULER_MARKS = [10, 20, 30, 40, 50];

// Loop timing, in milliseconds
const START_DELAY = 600;
const HOLD_FULL = 3800; // finished line stays up
const ERASE_STEP = 28; // backspace held down
const HOLD_EMPTY = 700; // empty line before retyping

const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function typingDelay(char) {
  if (char === ":") return 420; // a beat after the commit type, like deciding what comes next
  if (char === " ") return 90 + Math.random() * 60;
  return 55 + Math.random() * 45;
}

export default function Hero() {
  const reduceMotion = useRef(prefersReducedMotion()).current;
  const [shown, setShown] = useState(reduceMotion ? SUBJECT.length : 0);
  // "typing" | "holding" | "erasing" | "empty"
  const [phase, setPhase] = useState(reduceMotion ? "holding" : "typing");
  const guideRef = useRef(null);

  // Type, hold, erase, repeat. Pauses while the headline is off screen or the tab is hidden.
  useEffect(() => {
    if (reduceMotion) return;
    let count = 0;
    let current = "typing";
    let timer = null;
    let onScreen = true;

    const canRun = () => onScreen && document.visibilityState === "visible";
    const enter = (next) => {
      current = next;
      setPhase(next);
    };
    const schedule = (ms) => {
      timer = canRun() ? setTimeout(tick, ms) : null;
    };

    function tick() {
      timer = null;
      if (current === "typing") {
        count += 1;
        setShown(count);
        if (count === SUBJECT.length) {
          enter("holding");
          schedule(HOLD_FULL);
        } else {
          schedule(typingDelay(SUBJECT[count - 1]));
        }
      } else if (current === "holding") {
        enter("erasing");
        schedule(ERASE_STEP);
      } else if (current === "erasing") {
        count -= 1;
        setShown(count);
        if (count === 0) {
          enter("empty");
          schedule(HOLD_EMPTY);
        } else {
          schedule(ERASE_STEP);
        }
      } else {
        enter("typing");
        schedule(typingDelay(""));
      }
    }

    // Resume or pause when visibility changes; the loop picks up where it left off.
    const sync = () => {
      if (canRun() && !timer) timer = setTimeout(tick, 400);
      if (!canRun() && timer) {
        clearTimeout(timer);
        timer = null;
      }
    };

    const observer = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      sync();
    });
    observer.observe(guideRef.current);
    document.addEventListener("visibilitychange", sync);

    setShown(0);
    enter("typing");
    if (canRun()) timer = setTimeout(tick, START_DELAY);

    return () => {
      clearTimeout(timer);
      observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, [reduceMotion]);

  const typed = SUBJECT.slice(0, shown);
  // The caret blinks while it waits, and stays solid while typing or erasing, as in an editor.
  const caretWaiting = !reduceMotion && (phase === "holding" || phase === "empty");

  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="guide" ref={guideRef}>
        <div className="ruler" aria-hidden="true">
          {RULER_MARKS.map((col) => (
            // labels are 0.24em of the ruler font, so scale the offset back up
            <span key={col} style={{ left: `calc(${col}ch / 0.24)` }}>{col}</span>
          ))}
        </div>
        <h1 id="hero-title" className="subject" aria-label={SUBJECT}>
          <span className="typed" aria-hidden="true">
            <span className="tok-type">{typed.slice(0, TYPE.length)}</span>
            {typed.slice(TYPE.length)}
          </span>
          <span className={caretWaiting ? "caret blinking" : "caret"} aria-hidden="true" />
        </h1>
        <p className="count" aria-hidden="true">
          <span className="count-text"><span>{shown}</span>/{SUBJECT_TARGET}</span>
        </p>
      </div>
      <p className="lede">
        Pickup reads the changes you're about to commit and writes the message for you.
        You get three options in the format real teams use, ready to paste.
      </p>
    </section>
  );
}
