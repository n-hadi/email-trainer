import { useState } from "react";
import { api } from "./api.js";
import Setup from "./Setup.jsx";
import Exercise from "./Exercise.jsx";
import Review from "./Review.jsx";
import Analysis from "./Analysis.jsx";

export default function App() {
  const [view, setView] = useState("train");
  const [exercise, setExercise] = useState(null);
  const [error, setError] = useState("");

  async function submit(submission) {
    const submitted = { ...exercise, submission };
    setExercise(submitted);
    setError("");
    try {
      setExercise(await api("/api/exercises", submitted));
    } catch (err) {
      setError(err.message);
    }
  }

  let page;
  if (view === "analysis") page = <Analysis />;
  else if (!exercise) page = <Setup onStart={setExercise} />;
  else if (!exercise.submission) page = <Exercise exercise={exercise} onSubmit={submit} />;
  else if (!exercise.evaluation) page = error
    ? <p>Error: {error} <button onClick={() => submit(exercise.submission)}>Retry</button></p>
    : <p>Checking your email…</p>;
  else page = <><Review exercise={exercise} /><button onClick={() => setExercise(null)}>Next exercise</button></>;

  // Navigation is hidden while an exercise is running, so leaving the page cannot reset the timer.
  const running = exercise && !exercise.evaluation;

  return (
    <main>
      <nav>
        <h1>Email trainer</h1>
        {!running && <>
          <button onClick={() => { setView("train"); setExercise(null); }}>Train</button>
          <button onClick={() => setView("analysis")}>Analysis</button>
        </>}
      </nav>
      {page}
    </main>
  );
}
