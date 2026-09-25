// Load .env from the project folder, so the CLI works from any repository.

import { fileURLToPath } from "node:url";

export function loadEnv() {
  const projectEnv = fileURLToPath(new URL("../.env", import.meta.url));
  try {
    process.loadEnvFile(projectEnv);
  } catch {
    // No .env file: rely on variables already set in the shell.
  }
}
