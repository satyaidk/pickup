// Core of Pickup: turn a git diff into commit message candidates with Claude.
// Shared by the web server (src/server.js) and the CLI (bin/pickup.js).

import Anthropic from "@anthropic-ai/sdk";

export const MODEL = process.env.PICKUP_MODEL || "claude-opus-5";
export const MAX_DIFF_CHARS = 400_000;

const SYSTEM_PROMPT = `You write git commit messages from diffs.

The person using you is a developer who has just finished a change and wants a clear, honest commit message they can paste. Many of them are new to git conventions, so each message should also be a good example of how commit messages are written.

Rules for every message:
- Subject line in the imperative mood ("Add", "Fix", "Remove", not "Added" or "Adds").
- Subject line of 50 characters or fewer where possible; never more than 72. No trailing period.
- Describe only what the diff shows. Never invent tickets, issue numbers, benchmarks, or motivations the diff does not support.
- A body, when requested, explains what changed and why in plain language, wrapped at 72 characters per line. Leave it empty for trivial changes.
- If the person gave a hint about their intent, use it to explain why, but stay faithful to the diff.

Write exactly three candidates that differ in a useful way: for example one focused on the main change, one broader, one more specific. Put the one you would pick first.

If the diff mixes unrelated changes that belong in separate commits, say so briefly in split_hint; otherwise return an empty string.`;

const STYLE_RULES = {
  conventional:
    'Use the Conventional Commits format for the subject: "type(scope): description" where type is one of feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert. Include a scope only when one area is clearly affected; otherwise use "type: description".',
  simple:
    'Use a plain subject line with no type prefix, starting with a capitalized imperative verb, like "Add password reset form".',
};

// Structured output schema: the API guarantees the response matches it.
const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    summary: {
      type: "string",
      description: "One sentence, in plain language, describing what the diff changes.",
    },
    candidates: {
      type: "array",
      items: {
        type: "object",
        properties: {
          subject: { type: "string", description: "The full first line, exactly as it should be committed." },
          body: { type: "string", description: "Body text wrapped at 72 characters, or an empty string." },
          note: { type: "string", description: "Half a sentence on when this candidate is the right pick." },
        },
        required: ["subject", "body", "note"],
        additionalProperties: false,
      },
    },
    split_hint: { type: "string" },
  },
  required: ["summary", "candidates", "split_hint"],
  additionalProperties: false,
};

export class PickupError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

let client;
function getClient() {
  client ??= new Anthropic();
  return client;
}

/**
 * @param {object} input
 * @param {string} input.diff        Output of `git diff` (staged or not).
 * @param {string} [input.hint]      Optional note from the developer about intent.
 * @param {"conventional"|"simple"} [input.style]
 * @param {boolean} [input.includeBody]
 * @returns {Promise<{summary: string, candidates: {subject: string, body: string, note: string}[], split_hint: string}>}
 */
export async function generateCommitMessages({ diff, hint = "", style = "conventional", includeBody = true }) {
  if (typeof diff !== "string" || !diff.trim()) {
    throw new PickupError("Paste the output of git diff first. There's nothing to describe yet.");
  }
  if (diff.length > MAX_DIFF_CHARS) {
    throw new PickupError(
      `This diff is ${diff.length.toLocaleString("en-US")} characters, over the ${MAX_DIFF_CHARS.toLocaleString("en-US")} limit. ` +
        "Leave out generated files like lockfiles or build output, or split the change into smaller commits.",
      413,
    );
  }
  if (!STYLE_RULES[style]) style = "conventional";

  if (process.env.PICKUP_DEMO === "1") return demoResponse(style);

  const userContent = [
    `<diff>\n${diff}\n</diff>`,
    hint.trim() ? `<hint>${hint.trim()}</hint>` : "",
    STYLE_RULES[style],
    includeBody ? "Include a body where it helps." : "Leave the body empty for every candidate.",
  ]
    .filter(Boolean)
    .join("\n\n");

  let response;
  try {
    response = await getClient().beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      thinking: { type: "adaptive" },
      output_config: {
        effort: process.env.PICKUP_EFFORT || "medium",
        format: { type: "json_schema", schema: OUTPUT_SCHEMA },
      },
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userContent }],
    });
  } catch (error) {
    throw toPickupError(error);
  }

  if (response.stop_reason === "refusal") {
    throw new PickupError("Claude declined to describe this diff. Try removing any secrets or unrelated files from it.", 422);
  }
  if (response.stop_reason === "max_tokens") {
    throw new PickupError("The response was cut off before it finished. Try a smaller diff.", 502);
  }

  const text = response.content.find((block) => block.type === "text")?.text;
  try {
    return JSON.parse(text);
  } catch {
    throw new PickupError("Claude returned a response Pickup couldn't read. Try again.", 502);
  }
}

function toPickupError(error) {
  if (error instanceof Anthropic.AuthenticationError) {
    return new PickupError("The Claude API key was rejected. Check ANTHROPIC_API_KEY in your .env file.", 401);
  }
  if (error instanceof Anthropic.PermissionDeniedError) {
    return new PickupError("This API key doesn't have access to the model. Check your Anthropic Console settings.", 403);
  }
  if (error instanceof Anthropic.RateLimitError) {
    return new PickupError("Too many requests to Claude right now. Wait a few seconds and try again.", 429);
  }
  if (error instanceof Anthropic.BadRequestError) {
    return new PickupError(`Claude rejected the request: ${error.message}`, 400);
  }
  if (error instanceof Anthropic.APIConnectionError) {
    return new PickupError("Couldn't reach the Claude API. Check your internet connection.", 503);
  }
  if (error instanceof Anthropic.APIError) {
    return new PickupError(`The Claude API returned an error (${error.status}). Try again in a moment.`, 502);
  }
  if (error instanceof Error && /credentials|api key|apiKey/i.test(error.message)) {
    return new PickupError("No Claude API key found. Add ANTHROPIC_API_KEY to a .env file in the project folder.", 401);
  }
  return error;
}

// Canned output so the UI and CLI can be tried without an API key (PICKUP_DEMO=1).
function demoResponse(style) {
  const conventional = style === "conventional";
  return new Promise((resolve) =>
    setTimeout(
      () =>
        resolve({
          summary: "Adds a password reset flow: a form, an email token, and an API route that checks it.",
          candidates: [
            {
              subject: conventional ? "feat(auth): add password reset by email" : "Add password reset by email",
              body:
                "Users who forget their password can now request a reset link.\n" +
                "The link carries a signed token that expires after 30 minutes\n" +
                "and can only be used once.",
              note: "the best fit if the reset flow is the main point of this commit",
            },
            {
              subject: conventional ? "feat: add forgot-password form and reset route" : "Add forgot-password form and reset route",
              body: "",
              note: "a shorter option that names both pieces without a body",
            },
            {
              subject: conventional ? "feat(auth): send one-time reset tokens by email" : "Send one-time reset tokens by email",
              body:
                "Tokens are signed with the existing session secret, expire\n" +
                "after 30 minutes, and are deleted once used.",
              note: "pick this if reviewers care most about how the token works",
            },
          ],
          split_hint: "",
        }),
      900,
    ),
  );
}
