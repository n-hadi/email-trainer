import { clock } from "./Exercise.jsx";

const RATINGS = { 3: "Ready to send", 2: "Acceptable, needs improvement", 1: "Needs substantial improvement" };
const ERROR_TYPES = ["spelling", "grammar", "punctuation", "capitalization"];

// Underlines each LanguageTool error in place. Overlapping matches are skipped so the text is never duplicated.
function Highlighted({ text, errors }) {
  const parts = [];
  let pos = 0;
  for (const e of errors) {
    if (e.offset < pos) continue;
    parts.push(text.slice(pos, e.offset));
    parts.push(<mark key={e.offset} className={e.type} title={e.message}>{e.original}</mark>);
    pos = e.offset + e.length;
  }
  parts.push(text.slice(pos));
  return <div>{parts}</div>;
}

function List({ title, items }) {
  if (!items.length) return null;
  return <><h4>{title}</h4><ul>{items.map((item, i) => <li key={i}>{item}</li>)}</ul></>;
}

export default function Review({ exercise }) {
  const { configuration, scenario, submission, languageAnalysis, evaluation, modelAnswer } = exercise;
  const { errors } = languageAnalysis;
  const inField = (field) => errors.filter((e) => e.field === field);

  return (
    <>
      <h2>{scenario.title}</h2>
      <p className="scenario">{scenario.text}</p>

      <h3>Your email</h3>
      <p>
        Written in {clock(submission.durationSeconds)} (limit {clock(configuration.timeLimit)}).{" "}
        {submission.timedOut && <strong className="failed">Timed out: exercise failed.</strong>}
      </p>
      <div className="email">
        <strong><Highlighted text={submission.subject} errors={inField("subject")} /></strong>
        <Highlighted text={submission.body} errors={inField("body")} />
      </div>

      <h3>Language errors: {errors.length}</h3>
      <p>{ERROR_TYPES.map((t) => <span key={t}><mark className={t}>{t}</mark> {errors.filter((e) => e.type === t).length} &nbsp; </span>)}</p>
      <ul>
        {errors.map((e, i) => (
          <li key={i}><mark className={e.type}>{e.original}</mark>{e.correction && ` → ${e.correction}`}: {e.message}</li>
        ))}
      </ul>

      <h3>{"★".repeat(evaluation.rating)}{"☆".repeat(3 - evaluation.rating)} {RATINGS[evaluation.rating]}</h3>
      <List title="Missing" items={evaluation.missingRequirements} />
      <List title="Problematic statements" items={evaluation.problematicStatements} />
      <List title="Feedback" items={evaluation.feedback} />

      <h3>Model answer</h3>
      <div className="email">
        <strong>{modelAnswer.subject}</strong>
        <div>{modelAnswer.body}</div>
      </div>
    </>
  );
}
