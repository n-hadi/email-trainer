import { useEffect, useState } from "react";

export const clock =(s) => `${s < 0 ? "-" : ""}${Math.floor(Math.abs(s) / 60)}:${String(Math.abs(s) % 60).padStart(2, "0")}`;

export default function Exercise({ exercise, onSubmit }) {
  const { scenario, configuration } = exercise;
  const [startedAt] = useState(Date.now);
  const [now, setNow] = useState(Date.now);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, []);

  const left = configuration.timeLimit - Math.floor((now - startedAt) / 1000);

  function submit() {
    const seconds = (Date.now() - startedAt) / 1000;
    onSubmit({ subject, body, durationSeconds: Math.round(seconds), timedOut: seconds >= configuration.timeLimit });
  }

  return (
    <>
      <h2>{scenario.title}</h2>
      <p className="scenario">{scenario.text}</p>
      <p className={left <= 0 ? "clock failed" : "clock"}>
        {clock(left)} {left <= 0 && "Time is up. This exercise counts as failed, but you can finish and submit."}
      </p>
      {/* Browser spellcheck and autocorrect are off: the exercise gives no writing help. */}
      <input placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)}
        spellCheck={false} autoComplete="off" autoCorrect="off" />
      <textarea rows={14} value={body} onChange={(e) => setBody(e.target.value)}
        spellCheck={false} autoCorrect="off" />
      <button onClick={submit} disabled={!body.trim()}>Submit</button>
    </>
  );
}
