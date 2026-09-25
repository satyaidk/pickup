#!/usr/bin/env node
// Pickup CLI: reads your staged changes, suggests three commit messages,
// and commits with the one you pick.

import { execFileSync, spawnSync } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { stdin, stdout, argv, exit } from "node:process";
import { loadEnv } from "../src/env.js";

loadEnv();
if (process.argv.includes("--demo")) process.env.PICKUP_DEMO = "1";
const { generateCommitMessages, PickupError } = await import("../src/generate.js");

// Generated files add noise and cost without saying anything about intent.
const EXCLUDED = [
  "package-lock.json", "yarn.lock", "pnpm-lock.yaml", "bun.lockb", "Cargo.lock",
  "poetry.lock", "composer.lock", "Gemfile.lock", "go.sum",
];

const HELP = `Usage: pickup [options]

Suggests commit messages for your staged changes (git add first).

Options:
  --simple          Plain subject lines instead of Conventional Commits
  --no-body         Subject lines only
  --hint "<text>"   Tell Pickup what you were trying to do
  --pick <n>        Commit with suggestion n without asking
  --pick <n>        Commit with suggestion n without asking
  --dry-run         Show suggestions without committing
  -h, --help        Show this help`;

const bold = (s) => (stdout.isTTY ? `\x1b[1m${s}\x1b[22m` : s);
const dim = (s) => (stdout.isTTY ? `\x1b[2m${s}\x1b[22m` : s);
const green = (s) => (stdout.isTTY ? `\x1b[32m${s}\x1b[39m` : s);
const yellow = (s) => (stdout.isTTY ? `\x1b[33m${s}\x1b[39m` : s);
const clearLine = () => stdout.isTTY && stdout.write("\r\x1b[K");

function sentence(text) {
  const trimmed = text.trim();
  const capitalized = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  return /[.!?]$/.test(capitalized) ? capitalized : `${capitalized}.`;
}

function parseArgs(args) {
  const options = { style: "conventional", includeBody: true, hint: "", dryRun: false, pick: null };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--simple") options.style = "simple";
    else if (arg === "--no-body") options.includeBody = false;
    else if (arg === "--dry-run") options.dryRun = true;
    else if (arg === "--demo") continue;
    else if (arg === "--hint") options.hint = args[++i] ?? "";
    else if (arg === "--pick") options.pick = args[++i] ?? "";
    else if (arg === "-h" || arg === "--help") {
      console.log(HELP);
      exit(0);
    } else {
      console.error(`Unknown option: ${arg}\n\n${HELP}`);
      exit(1);
    }
  }
  return options;
}

function git(args) {
  return execFileSync("git", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
}

function stagedDiff() {
  try {
    git(["rev-parse", "--is-inside-work-tree"]);
  } catch {
    throw new PickupError("This folder isn't a git repository. Run pickup inside your project.");
  }
  const excludes = EXCLUDED.map((file) => `:(exclude,glob)**/${file}`);
  const diff = git(["diff", "--staged", "--no-color", "--", ".", ...excludes]);
  if (!diff.trim()) {
    const anyStaged = git(["diff", "--staged", "--name-only"]).trim();
    throw new PickupError(
      anyStaged
        ? "Only lockfiles are staged. Stage the source files you changed, then run pickup again."
        : "Nothing is staged. Stage your changes with git add, then run pickup again.",
    );
  }
  return diff;
}

function fullMessage({ subject, body }) {
  return body.trim() ? `${subject}\n\n${body.trim()}` : subject;
}

function printCandidates({ summary, candidates, split_hint }) {
  console.log(`\n${dim(summary)}\n`);
  candidates.forEach((candidate, i) => {
    const length = candidate.subject.length;
    const count = length > 72 ? yellow(`${length} chars`) : dim(`${length} chars`);
    console.log(`${bold(green(`[${i + 1}]`))} ${bold(candidate.subject)}  ${count}`);
    if (candidate.body.trim()) {
      console.log(candidate.body.trim().split("\n").map((line) => `    ${line}`).join("\n"));
    }
    console.log(dim(`    ${sentence(candidate.note)}\n`));
  });
  if (split_hint) console.log(`${yellow("Consider splitting this commit:")} ${split_hint}\n`);
}

async function main() {
  const options = parseArgs(argv.slice(2));
  const diff = stagedDiff();

  if (stdout.isTTY) stdout.write(dim("Reading your staged changes..."));
  const result = await generateCommitMessages({ diff, ...options });
  clearLine();
  printCandidates(result);

  if (options.dryRun) return;

  let answer = options.pick;
  if (answer === null) {
    if (!stdin.isTTY) return;
    const rl = createInterface({ input: stdin, output: stdout });
    answer = (await rl.question(`Commit with which message? [1-${result.candidates.length}, or q to quit] `)).trim();
    rl.close();
  }

  const picked = result.candidates[Number(answer) - 1];
  if (!picked) {
    console.log("No commit made.");
    return;
  }
  const commit = spawnSync("git", ["commit", "-F", "-"], { input: fullMessage(picked), stdio: ["pipe", "inherit", "inherit"] });
  exit(commit.status ?? 1);
}

main().catch((error) => {
  clearLine();
  console.error(error instanceof PickupError ? error.message : error);
  exit(1);
});
