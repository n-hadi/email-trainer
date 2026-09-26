import { useState } from "react";
import { api } from "./api.js";

const LANGUAGES = ["German", "English", "French", "Spanish"];
const TIME_LIMITS = { easy: 180, medium: 180, hard: 240 };
const EMPTY = { businessEnvironment: "", language: "German", communicationStyle: "", difficulty: "medium" };

export default function Setup({ onStart }) {
  const [config, setConfig] = useState(() => JSON.parse(localStorage.getItem("config")) ?? EMPTY);
  const [status, setStatus] = useState("");
  const set = (key) => (e) => setConfig({ ...config, [key]: e.target.value });

  async function start(e) {
    e.preventDefault();
    localStorage.setItem("config", JSON.stringify(config));
    setStatus("Generating scenario…");
    try {
      onStart({
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        configuration: { ...config, timeLimit: TIME_LIMITS[config.difficulty] },
        scenario: await api("/api/scenario", config),
      });
    } catch (err) {
      setStatus(`Error: ${err.message}`);
    }
  }

  return (
    <form onSubmit={start}>
      <label>
        Your workplace
        <textarea rows={6} required value={config.businessEnvironment} onChange={set("businessEnvironment")}
          placeholder="e.g. Technical procurement at a large industrial company. I deal with suppliers, RFQs, quotations…" />
      </label>
      <label>
        Communication style
        <textarea rows={3} value={config.communicationStyle} onChange={set("communicationStyle")}
          placeholder="e.g. Professional but concise. Internal communication uses “du”, external uses “Sie”." />
      </label>
      <div className="row">
        <label>
          Language
          <select value={config.language} onChange={set("language")}>
            {LANGUAGES.map((l) => <option key={l}>{l}</option>)}
          </select>
        </label>
        <label>
          Difficulty
          <select value={config.difficulty} onChange={set("difficulty")}>
            {Object.entries(TIME_LIMITS).map(([d, s]) => <option key={d} value={d}>{d} ({s / 60} min)</option>)}
          </select>
        </label>
      </div>
      <button disabled={status === "Generating scenario…"}>Start exercise</button>
      <p>{status}</p>
    </form>
  );
}
