import { SUBJECT_MAX, reflow, sentence, subjectLevel } from "../lib/commit.js";

const LENGTH_TITLES = {
  "": "Within 50 characters",
  over: "Over 50 characters, still under 72",
  "too-long": "Longer than 72 characters",
};

export default function Candidate({ candidate, index, checked, onSelect }) {
  const length = candidate.subject.length;
  const level = subjectLevel(length);
  const fill = `${(Math.min(length, SUBJECT_MAX) / SUBJECT_MAX) * 100}%`;

  return (
    <label className="candidate">
      <input type="radio" name="candidate" value={index} checked={checked} onChange={() => onSelect(index)} />
      <span className="c-subject">{candidate.subject}</span>
      {/* 72-column meter with the 50-column guide */}
      <span className="c-meter" aria-hidden="true">
        <span className={`c-fill ${level}`} style={{ "--fill": fill }} />
      </span>
      <span className={`c-length ${level}`} title={LENGTH_TITLES[level]}>
        {length}/50
      </span>
      {/* Reflowed to fit the panel; copying keeps the original 72-column wrapping. */}
      <span className="c-body">{reflow(candidate.body)}</span>
      <span className="c-note">{sentence(candidate.note)}</span>
    </label>
  );
}
