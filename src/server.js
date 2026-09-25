// Pickup web server: the /api endpoints plus the React app.
// In development (--dev) the app is served through Vite with hot reload;
// otherwise the production build in dist/ is served.
// The API key stays here on the server and is never sent to the browser.

import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "./env.js";

loadEnv();
if (process.argv.includes("--demo")) process.env.PICKUP_DEMO = "1";
const DEV = process.argv.includes("--dev");
const { generateCommitMessages, PickupError, MAX_DIFF_CHARS, providerStatus } = await import("./generate.js");

const DIST_DIR = fileURLToPath(new URL("../dist/", import.meta.url));
const PORT = Number(process.env.PORT) || 5173;
const HOST = process.env.HOST || "127.0.0.1";
const MAX_BODY_BYTES = MAX_DIFF_CHARS * 4 + 10_000;

const CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

function sendJson(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data));
}

async function readJsonBody(req) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new PickupError("That request is too large. Try a smaller diff.", 413);
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new PickupError("The request body wasn't valid JSON.");
  }
}

async function handleGenerate(req, res) {
  try {
    const { diff, hint, style, includeBody } = await readJsonBody(req);
    const result = await generateCommitMessages({ diff, hint, style, includeBody: includeBody !== false });
    sendJson(res, 200, result);
  } catch (error) {
    if (error instanceof PickupError) return sendJson(res, error.status, { error: error.message });
    console.error(error);
    sendJson(res, 500, { error: "Something went wrong on the server. Check the terminal running Pickup for details." });
  }
}

async function serveBuild(req, res) {
  const url = new URL(req.url, "http://localhost");
  const relative = normalize(decodeURIComponent(url.pathname)).replace(/^([/\\])+/, "") || "index.html";
  const filePath = join(DIST_DIR, relative);
  if (!filePath.startsWith(DIST_DIR)) {
    res.writeHead(403).end();
    return;
  }
  try {
    const body = await readFile(filePath);
    const cache = relative.startsWith("assets") ? "public, max-age=31536000, immutable" : "no-cache";
    res.writeHead(200, { "Content-Type": CONTENT_TYPES[extname(filePath)] || "application/octet-stream", "Cache-Control": cache });
    res.end(body);
  } catch {
    // Unknown paths fall back to the app itself.
    const index = await readFile(join(DIST_DIR, "index.html"));
    res.writeHead(200, { "Content-Type": CONTENT_TYPES[".html"], "Cache-Control": "no-cache" }).end(index);
  }
}

let vite;

const server = createServer((req, res) => {
  const path = req.url.split("?")[0];
  if (path === "/api/generate" && req.method === "POST") return handleGenerate(req, res);
  if (path === "/api/status" && req.method === "GET") {
    return sendJson(res, 200, { demo: process.env.PICKUP_DEMO === "1", providers: providerStatus() });
  }
  if (path.startsWith("/api/")) return sendJson(res, 404, { error: "Not found" });
  if (vite) return vite.middlewares(req, res);
  if (req.method === "GET") return serveBuild(req, res);
  res.writeHead(405).end();
});

if (DEV) {
  const { createServer: createViteServer } = await import("vite");
  vite = await createViteServer({
    configFile: fileURLToPath(new URL("../vite.config.js", import.meta.url)),
    server: { middlewareMode: true, hmr: { server } },
    appType: "spa",
  });
} else if (!existsSync(join(DIST_DIR, "index.html"))) {
  console.error("No production build found. Run npm run build first, or use npm run dev while developing.");
  process.exit(1);
}

server.on("error", async (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(
      `Port ${PORT} is already in use, probably by another Pickup server that's still running.\n` +
        `Stop that one (Ctrl+C in its terminal), or pick another port: PORT=5174 npm run dev`,
    );
  } else {
    console.error(error);
  }
  await vite?.close();
  process.exit(1);
});

server.listen(PORT, HOST, () => {
  const where = HOST === "0.0.0.0" ? "localhost" : HOST;
  console.log(`Pickup is running at http://${where}:${PORT}${DEV ? " (development, hot reload on)" : ""}`);
  if (process.env.PICKUP_DEMO === "1") {
    console.log("Demo mode: responses are canned examples and no API calls are made.");
  } else {
    const providers = providerStatus();
    if (providers.length === 0) {
      console.log("No AI provider is set up. Copy .env.example to .env and add OPENAI_API_KEY, GEMINI_API_KEY, or both.");
    } else {
      const [first, ...backups] = providers.map((p) => `${p.name} (${p.model})`);
      console.log(`AI: ${first}${backups.length ? `, falling back to ${backups.join(", then ")}` : ""}.`);
    }
  }
});
