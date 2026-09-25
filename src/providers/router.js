// Tries AI providers in order and falls back to the next when one fails.
// A provider that is out of quota, rate limited or misconfigured is skipped for a while
// (a "cooldown"), so later requests go straight to the backup instead of failing first.

import { ProviderError } from "./errors.js";
import { createGeminiProvider } from "./gemini.js";
import { createOpenAIProvider } from "./openai.js";

const MINUTE = 60_000;

/** How long to skip a provider after each kind of failure. 0 means try it again next time. */
function cooldownFor(error) {
  switch (error.kind) {
    case "quota":
      return 15 * MINUTE; // credit or a daily quota won't come back in seconds
    case "rate_limit":
      return error.retryAfterMs ?? MINUTE;
    case "auth":
    case "not_found":
      return 10 * MINUTE; // needs a config fix; restart Pickup after fixing .env to retry sooner
    case "unavailable":
      return 30_000;
    default:
      return 0;
  }
}

const REASONS = {
  quota: "is out of credit",
  rate_limit: "hit its rate limit",
  auth: "rejected its API key",
  not_found: "doesn't have the configured model",
  unavailable: "couldn't be reached",
};
const reasonText = (kind) => REASONS[kind] ?? "had a problem";

export class AllProvidersFailedError extends Error {
  constructor(failures) {
    super(failures.map((f) => f.message).join(" "));
    this.failures = failures;
  }
}

export class NoProviderError extends Error {}

/**
 * @param {Array<{name: string, model: string, isConfigured(): boolean, generate(request): Promise<object>}>} providers
 *   in order of preference
 * @param {{now?: () => number, log?: (message: string) => void}} [options]
 */
export function createRouter(providers, { now = Date.now, log = (message) => console.warn(`[pickup] ${message}`) } = {}) {
  const cooldowns = new Map(); // provider name -> { until, kind }

  const configured = () => providers.filter((p) => p.isConfigured());
  const coolingDown = (p) => (cooldowns.get(p.name)?.until ?? 0) > now();

  async function generate(request) {
    const available = configured();
    if (available.length === 0) throw new NoProviderError("No AI provider is set up.");

    const ready = available.filter((p) => !coolingDown(p));
    // If every provider is cooling down, try them all anyway rather than failing without asking.
    const attempts = ready.length > 0 ? ready : available;
    const skipped = available.filter((p) => !attempts.includes(p));
    const failures = [];

    for (const [i, provider] of attempts.entries()) {
      try {
        const data = await provider.generate(request);
        cooldowns.delete(provider.name);
        return { data, provider: provider.name, model: provider.model, fallbackNote: fallbackNote(provider, skipped, failures) };
      } catch (error) {
        if (!(error instanceof ProviderError)) throw error; // a bug, not a provider failure
        failures.push(error);

        const wait = cooldownFor(error);
        if (wait > 0) cooldowns.set(provider.name, { until: now() + wait, kind: error.kind });

        const next = attempts[i + 1];
        if (next) {
          log(`${provider.name} ${reasonText(error.kind)} (${error.message}) Switching to ${next.name}.`);
        }
        if (wait > 0 && available.length > 1) {
          log(`Skipping ${provider.name} for ${Math.round(wait / 1000)}s.`);
        }
      }
    }
    throw new AllProvidersFailedError(failures);
  }

  /** Explains a fallback in one sentence for the person using Pickup, or null if none happened. */
  function fallbackNote(served, skipped, failures) {
    const first = failures[0] ?? (skipped[0] && { provider: skipped[0].name, kind: cooldowns.get(skipped[0].name)?.kind });
    if (!first) return null;
    return `${first.provider} ${reasonText(first.kind)}, so ${served.name} wrote these instead.`;
  }

  function status() {
    return configured().map((p) => ({
      name: p.name,
      model: p.model,
      coolingDownFor: coolingDown(p) ? Math.ceil((cooldowns.get(p.name).until - now()) / 1000) : 0,
    }));
  }

  return { generate, status, configured };
}

// Provider order comes from PICKUP_PROVIDERS (default "openai,gemini").
const FACTORIES = { openai: createOpenAIProvider, gemini: createGeminiProvider };

let defaultRouter;
export function getRouter() {
  if (!defaultRouter) {
    const order = (process.env.PICKUP_PROVIDERS || "openai,gemini")
      .split(",")
      .map((name) => name.trim().toLowerCase())
      .filter((name) => FACTORIES[name]);
    defaultRouter = createRouter(order.map((name) => FACTORIES[name]()));
  }
  return defaultRouter;
}
