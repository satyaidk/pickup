// Calls to the Pickup server. The Claude API key lives there, never in the browser.

export async function generateMessages({ diff, hint, style, includeBody }) {
  let response;
  try {
    response = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ diff, hint, style, includeBody }),
    });
  } catch {
    throw new Error("Couldn't reach the Pickup server. Make sure it's still running in your terminal.");
  }
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || `The server returned an error (${response.status}).`);
  return result;
}

export async function fetchStatus() {
  const response = await fetch("/api/status");
  if (!response.ok) throw new Error(`Status check failed (${response.status})`);
  return response.json();
}
