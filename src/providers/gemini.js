// Gemini provider: generateContent with a JSON schema for the response.

import { ApiError, GoogleGenAI } from "@google/genai";
import { ProviderError } from "./errors.js";

const NAME = "Gemini";
const BLOCKED_FINISH = new Set(["SAFETY", "RECITATION", "BLOCKLIST", "PROHIBITED_CONTENT", "SPII"]);

export function createGeminiProvider() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const model = process.env.GEMINI_MODEL || "gemini-flash-latest";
  let client;

  return {
    name: NAME,
    model,
    isConfigured: () => Boolean(apiKey),

    async generate({ system, user, schema }) {
      client ??= new GoogleGenAI({ apiKey });
      let response;
      try {
        response = await client.models.generateContent({
          model,
          contents: user,
          config: {
            systemInstruction: system,
            responseMimeType: "application/json",
            responseJsonSchema: schema,
            maxOutputTokens: 16000,
          },
        });
      } catch (error) {
        throw toProviderError(error, model);
      }

      const finish = response.candidates?.[0]?.finishReason;
      if (response.promptFeedback?.blockReason || BLOCKED_FINISH.has(finish)) {
        throw new ProviderError({ provider: NAME, kind: "refused", status: 422, message: "Gemini declined to describe this diff." });
      }
      if (finish === "MAX_TOKENS") {
        throw new ProviderError({ provider: NAME, kind: "truncated", message: "Gemini's response was cut off. Try a smaller diff." });
      }
      try {
        return JSON.parse(response.text);
      } catch {
        throw new ProviderError({ provider: NAME, kind: "invalid_output", message: "Gemini returned a response Pickup couldn't read." });
      }
    },
  };
}

/** Gemini's 429 messages say how long to wait, e.g. "Please retry in 23.4s" or "retryDelay": "23s". */
function retryAfterMs(message) {
  const match = /retry in ([\d.]+)\s*s/i.exec(message) || /"retryDelay":\s*"([\d.]+)s"/.exec(message);
  return match ? Math.ceil(Number(match[1]) * 1000) : null;
}

function toProviderError(error, model) {
  const fail = (kind, status, message, extra = {}) => new ProviderError({ provider: NAME, kind, status, message, ...extra });

  if (error instanceof ApiError) {
    const text = error.message || "";
    // An invalid key comes back as 400 INVALID_ARGUMENT, so check the message first.
    if (/API key not valid|API_KEY_INVALID|API key expired/i.test(text) || error.status === 401 || error.status === 403) {
      return fail("auth", 401, "The Gemini API key was rejected. Check GEMINI_API_KEY in your .env file.");
    }
    if (error.status === 404) {
      return fail("not_found", 404, `The Gemini model "${model}" wasn't found. Set GEMINI_MODEL in .env to one that exists.`);
    }
    if (error.status === 429) {
      // Daily free-tier quotas won't reset for hours; per-minute limits clear quickly.
      if (/PerDay|per day/i.test(text)) {
        return fail("quota", 429, "Gemini's free daily quota is used up. It resets tomorrow, or you can enable billing in Google AI Studio.");
      }
      return fail("rate_limit", 429, "Gemini is rate limiting requests right now.", { retryAfterMs: retryAfterMs(text) });
    }
    if (error.status >= 500) {
      return fail("unavailable", 502, `The Gemini API returned an error (${error.status}).`);
    }
    return fail("bad_request", 400, `Gemini rejected the request: ${text}`);
  }
  // fetch failures (offline, DNS, reset connections) surface as TypeError
  if (error instanceof TypeError) {
    return fail("unavailable", 503, "Couldn't reach the Gemini API. Check your internet connection.");
  }
  return error;
}
