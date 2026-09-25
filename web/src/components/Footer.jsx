import { useEffect, useState } from "react";
import { AUTHOR_NAME, AUTHOR_URL } from "../config.js";
import { fetchStatus } from "../lib/api.js";

/** "Messages written by OpenAI (gpt-5.4-mini), with Gemini as backup" */
function describeProviders(providers = []) {
  if (providers.length === 0) return "";
  const [first, ...backups] = providers;
  const backup = backups.length ? `, with ${backups.map((p) => p.name).join(" and ")} as backup` : "";
  return `Messages written by ${first.name} (${first.model})${backup}`;
}

export default function Footer() {
  const [modelLine, setModelLine] = useState("");

  useEffect(() => {
    fetchStatus()
      .then(({ demo, providers }) => setModelLine(demo ? "Demo mode: showing example output" : describeProviders(providers)))
      .catch(() => {});
  }, []);

  return (
    <footer className="foot">
      <p>
        Pickup is open source. Built by <a href={AUTHOR_URL}>{AUTHOR_NAME}</a> with Passion.
      </p>
      <p className="model">{modelLine}</p>
    </footer>
  );
}
