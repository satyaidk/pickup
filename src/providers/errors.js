// A provider failure in a shape the router can act on, whichever SDK it came from.

/**
 * kind is one of:
 *   "quota"        out of credit or free-tier quota
 *   "rate_limit"   too many requests right now
 *   "auth"         key missing, invalid or not allowed
 *   "not_found"    the configured model doesn't exist for this key
 *   "unavailable"  network error or provider outage
 *   "bad_request", "refused", "truncated", "invalid_output"
 */
export class ProviderError extends Error {
  constructor({ provider, kind, message, status = 502, retryAfterMs = null }) {
    super(message);
    this.provider = provider;
    this.kind = kind;
    this.status = status;
    this.retryAfterMs = retryAfterMs;
  }
}
