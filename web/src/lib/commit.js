// Pure helpers for diffs and commit messages. No React, easy to test.

export const SUBJECT_TARGET = 50;
export const SUBJECT_MAX = 72;

export function diffStats(diff) {
  let files = 0, added = 0, removed = 0;
  for (const line of diff.split("\n")) {
    if (line.startsWith("diff --git ")) files += 1;
    else if (line.startsWith("+") && !line.startsWith("+++")) added += 1;
    else if (line.startsWith("-") && !line.startsWith("---")) removed += 1;
  }
  return { files, added, removed };
}

export function pluralFiles(count) {
  return `${count} ${count === 1 ? "file" : "files"}`;
}

/** "" within 50 characters, "over" up to 72, "too-long" beyond. */
export function subjectLevel(length) {
  if (length > SUBJECT_MAX) return "too-long";
  if (length > SUBJECT_TARGET) return "over";
  return "";
}

export function fullMessage({ subject, body }) {
  return body.trim() ? `${subject}\n\n${body.trim()}` : subject;
}

export function gitCommand({ subject, body }) {
  const quote = (text) => `"${text.replace(/(["\\$`])/g, "\\$1")}"`;
  const args = [`git commit -m ${quote(subject)}`];
  if (body.trim()) args.push(`-m ${quote(body.trim())}`);
  return args.join(" ");
}

/** Join hard-wrapped lines so a body can reflow on screen; paragraphs stay separate. */
export function reflow(body) {
  return body.trim().replace(/([^\n])\n(?=[^\n])/g, "$1 ");
}

/** Capitalize and end with a period, for model-written notes. */
export function sentence(text) {
  const trimmed = text.trim();
  const capitalized = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  return /[.!?]$/.test(capitalized) ? capitalized : `${capitalized}.`;
}
