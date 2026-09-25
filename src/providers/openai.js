// OpenAI provider: Chat Completions with strict Structured Outputs.

import OpenAI from "openai";
import { ProviderError } from "./errors.js";

const NAME = "OpenAI";

export function createOpenAIProvider() {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || "gpt-5.4-mini";
  const reasoningEffort = process.env.OPENAI_REASONING_EFFORT;
  let client;

  return {
    name: NAME,
    model,
    isConfigured: () => Boolean(apiKey),

    async generate({ system, user, schema }) {
      client ??= new OpenAI({ apiKey });
      let completion;
      try {
        completion = await client.chat.completions.create({
          model,
          max_completion_tokens: 16000,
          // Only for reasoning models (the gpt-5 and o-series families); other models reject it.
          ...(reasoningEffort && { reasoning_effort: reasoningEffort }),
          response_format: {
            type: "json_schema",
            json_schema: { name: "commit_messages", strict: true, schema },
          },
          messages: [
            { role: "developer", content: system },
            { role: "user", content: user },
          ],
        });
      } catch (error) {
        throw toProviderError(error, model);
      }

      const choice = completion.choices[0];
      if (choice?.message?.refusal || choice?.finish_reason === "content_filter") {
        throw new ProviderError({ provider: NAME, kind: "refused", status: 422, message: "OpenAI declined to describe this diff." });
      }
      if (choice?.finish_reason === "length") {
        throw new ProviderError({ provider: NAME, kind: "truncated", message: "OpenAI's response was cut off. Try a smaller diff." });
      }
      try {
        return JSON.parse(choice.message.content);
      } catch {
        throw new ProviderError({ provider: NAME, kind: "invalid_output", message: "OpenAI returned a response Pickup couldn't read." });
      }
    },
  };
}

function retryAfterMs(error) {
  const seconds = Number(error.headers?.get?.("retry-after"));
  return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : null;
}

function toProviderError(error, model) {
  const fail = (kind, status, message, extra = {}) => new ProviderError({ provider: NAME, kind, status, message, ...extra });

  if (error instanceof OpenAI.AuthenticationError) {
    return fail("auth", 401, "The OpenAI API key was rejected. Check OPENAI_API_KEY in your .env file.");
  }
  if (error instanceof OpenAI.PermissionDeniedError) {
    return fail("auth", 403, "This OpenAI key doesn't have access to that model. Check your project's settings on platform.openai.com.");
  }
  if (error instanceof OpenAI.NotFoundError) {
    return fail("not_found", 404, `The OpenAI model "${model}" isn't available to your account. Set OPENAI_MODEL in .env to one that is.`);
  }
  if (error instanceof OpenAI.RateLimitError) {
    if (error.code === "insufficient_quota") {
      return fail("quota", 402, "Your OpenAI account is out of credit. Add credit at platform.openai.com/settings/organization/billing.");
    }
    return fail("rate_limit", 429, "OpenAI is rate limiting requests right now.", { retryAfterMs: retryAfterMs(error) });
  }
  if (error instanceof OpenAI.BadRequestError) {
    return fail("bad_request", 400, `OpenAI rejected the request: ${error.message}`);
  }
  if (error instanceof OpenAI.APIConnectionError) {
    return fail("unavailable", 503, "Couldn't reach the OpenAI API. Check your internet connection.");
  }
  if (error instanceof OpenAI.APIError) {
    return fail("unavailable", 502, `The OpenAI API returned an error (${error.status}).`);
  }
  return error;
}
