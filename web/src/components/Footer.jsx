import { useEffect, useState } from "react";
import { AUTHOR_NAME, AUTHOR_URL } from "../config.js";
import { fetchStatus } from "../lib/api.js";

export default function Footer() {
  const [modelLine, setModelLine] = useState("");

  useEffect(() => {
    fetchStatus()
      .then(({ model, demo }) => setModelLine(demo ? "Demo mode: showing example output" : `Messages written by ${model}`))
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
