import { useRef, useState } from "react";
import { generateMessages } from "../lib/api.js";
import { diffStats } from "../lib/commit.js";
import DiffForm from "./DiffForm.jsx";
import ResultsPane from "./ResultsPane.jsx";

const INITIAL_FORM = { diff: "", hint: "", style: "conventional", includeBody: true };

export default function Workbench() {
  const [form, setForm] = useState(INITIAL_FORM);
  // status: "empty" | "loading" | "error" | "results"
  const [output, setOutput] = useState({ status: "empty" });
  const diffRef = useRef(null);

  const update = (changes) => setForm((current) => ({ ...current, ...changes }));

  async function generate() {
    if (!form.diff.trim()) {
      setOutput({ status: "error", error: "Paste the output of git diff into Your changes first, or use the example diff." });
      diffRef.current?.focus();
      return;
    }
    setOutput({ status: "loading", stats: diffStats(form.diff) });
    try {
      const result = await generateMessages(form);
      setOutput({ status: "results", result });
    } catch (error) {
      setOutput({ status: "error", error: error.message });
    }
  }

  return (
    <section className="bench" id="bench" aria-label="Write a commit message">
      <DiffForm
        form={form}
        onChange={update}
        onSubmit={generate}
        busy={output.status === "loading"}
        diffRef={diffRef}
      />
      <ResultsPane output={output} />
    </section>
  );
}
