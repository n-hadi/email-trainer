import { useEffect, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "./api.js";
import { clock } from "./Exercise.jsx";
import Review from "./Review.jsx";

const FILTERS = [
  ["Language", (e) => e.configuration.language],
  ["Difficulty", (e) => e.configuration.difficulty],
  ["Workplace", (e) => e.configuration.businessEnvironment],
  ["Scenario type", (e) => e.scenario.type],
];

// Local calendar date as YYYY-MM-DD (the Swedish locale happens to use that format).
const day = (e) => new Date(e.timestamp).toLocaleDateString("sv");
const avg = (numbers) => numbers.reduce((a, b) => a + b, 0) / numbers.length;
const stars = (rating) => "★".repeat(rating) + "☆".repeat(3 - rating);

// The same figures summarise all exercises, one difficulty or one scenario type.
function summary(list) {
  return {
    count: list.length,
    rating: avg(list.map((e) => e.evaluation.rating)).toFixed(1),
    errors: avg(list.map((e) => e.languageAnalysis.errors.length)).toFixed(1),
    time: clock(Math.round(avg(list.map((e) => e.submission.durationSeconds)))),
    timedOut: list.filter((e) => e.submission.timedOut).length,
  };
}

function Breakdown({ title, list, by }) {
  return (
    <table>
      <thead>
        <tr><th>{title}</th><th>Exercises</th><th>Avg rating</th><th>Avg errors</th><th>Avg time</th><th>Timed out</th></tr>
      </thead>
      <tbody>
        {Object.entries(Object.groupBy(list, by)).map(([key, group]) => {
          const s = summary(group);
          return <tr key={key}><td>{key}</td><td>{s.count}</td><td>{s.rating}</td><td>{s.errors}</td><td>{s.time}</td><td>{s.timedOut}</td></tr>;
        })}
      </tbody>
    </table>
  );
}

function Trend({ title, data, dataKey, domain }) {
  return (
    <>
      <h3>{title}</h3>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -24 }}>
          <CartesianGrid stroke="#8883" vertical={false} />
          <XAxis dataKey="date" fontSize={12} />
          <YAxis domain={domain} allowDecimals={false} fontSize={12} />
          <Tooltip contentStyle={{ background: "Canvas" }} />
          <Line name={title} dataKey={dataKey} stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </>
  );
}

export default function Analysis() {
  const [all, setAll] = useState(null);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({});
  const [open, setOpen] = useState(null);

  useEffect(() => {
    api("/api/exercises").then(setAll).catch((err) => setError(err.message));
  }, []);

  if (error) return <p>Error: {error}</p>;
  if (!all) return <p>Loading…</p>;
  if (open) return <><button onClick={() => setOpen(null)}>← Back to analysis</button><Review exercise={open} /></>;

  const set = (key) => (e) => setFilters({ ...filters, [key]: e.target.value });
  const shown = all.filter((e) =>
    FILTERS.every(([label, get]) => !filters[label] || get(e) === filters[label]) &&
    (!filters.from || day(e) >= filters.from) &&
    (!filters.to || day(e) <= filters.to));

  const filterRow = (
    <div className="row">
      {FILTERS.map(([label, get]) => (
        <label key={label}>
          {label}
          <select value={filters[label] ?? ""} onChange={set(label)}>
            <option value="">All</option>
            {[...new Set(all.map(get))].map((v) => <option key={v} value={v}>{v.slice(0, 60)}</option>)}
          </select>
        </label>
      ))}
      <label>From<input type="date" value={filters.from ?? ""} onChange={set("from")} /></label>
      <label>To<input type="date" value={filters.to ?? ""} onChange={set("to")} /></label>
    </div>
  );
  if (!shown.length) return <>{filterRow}<p>No exercises match these filters.</p></>;

  const s = summary(shown);
  const errors = shown.flatMap((e) => e.languageAnalysis.errors);
  const mistakes = Object.entries(Object.groupBy(errors, (e) => `${e.original} → ${e.correction ?? "?"}`))
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 10);
  const missed = shown.flatMap((e) => e.evaluation.missingRequirements.map((text) => ({ text, e })));
  const trend = shown.map((e) => ({ date: day(e), rating: e.evaluation.rating, errors: e.languageAnalysis.errors.length }));

  return (
    <>
      {filterRow}
      <p>
        <strong>{s.count}</strong> exercises · average rating <strong>{s.rating}</strong> · average
        writing time <strong>{s.time}</strong> · <strong>{s.timedOut}</strong> timed out ·{" "}
        <strong>{s.errors}</strong> language errors per email
      </p>

      <Trend title="Rating" data={trend} dataKey="rating" domain={[1, 3]} />
      <Trend title="Language errors" data={trend} dataKey="errors" domain={[0, "auto"]} />

      <h3>By difficulty</h3>
      <Breakdown title="Difficulty" list={shown} by={(e) => e.configuration.difficulty} />
      <h3>By scenario type</h3>
      <Breakdown title="Type" list={shown} by={(e) => e.scenario.type} />

      <h3>Language errors by type</h3>
      <p>{Object.entries(Object.groupBy(errors, (e) => e.type)).map(([type, list]) => (
        <span key={type}><mark className={type}>{type}</mark> {list.length} &nbsp; </span>
      ))}</p>
      <h3>Most common mistakes</h3>
      <table>
        <tbody>
          {mistakes.map(([mistake, list]) => <tr key={mistake}><td>{mistake}</td><td>{list[0].type}</td><td>{list.length}×</td></tr>)}
        </tbody>
      </table>

      <h3>Missed requirements</h3>
      <p>{new Set(missed.map((m) => m.e)).size} of {shown.length} emails missed at least one requirement. Most recent:</p>
      <ul>
        {missed.slice(-15).reverse().map((m, i) => (
          <li key={i}>{m.text} <a href="#" onClick={(ev) => { ev.preventDefault(); setOpen(m.e); }}>({m.e.scenario.title})</a></li>
        ))}
      </ul>

      <h3>All exercises</h3>
      <div className="scroll">
        <table>
          <thead>
            <tr><th>Date</th><th>Language</th><th>Difficulty</th><th>Type</th><th>Scenario</th><th>Rating</th><th>Errors</th><th>Time</th></tr>
          </thead>
          <tbody>
            {[...shown].reverse().map((e) => (
              <tr key={e.id} className="clickable" onClick={() => setOpen(e)}>
                <td>{day(e)}</td><td>{e.configuration.language}</td><td>{e.configuration.difficulty}</td><td>{e.scenario.type}</td>
                <td>{e.scenario.title}</td><td>{stars(e.evaluation.rating)}</td><td>{e.languageAnalysis.errors.length}</td>
                <td className={e.submission.timedOut ? "failed" : ""}>{clock(e.submission.durationSeconds)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
