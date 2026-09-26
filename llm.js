import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

const client = new Anthropic();
const model = process.env.ANTHROPIC_MODEL || "claude-opus-5";

async function ask(system, prompt, schema) {
  const res = await client.messages.parse({
    model,
    max_tokens: 16000,
    system,
    messages: [{ role: "user", content: prompt }],
    output_config: { format: zodOutputFormat(schema) },
  });
  if (!res.parsed_output) throw new Error(`The model returned no usable answer (stop reason: ${res.stop_reason}).`);
  return res.parsed_output;
}

const TYPES = [
  "request", "follow-up", "clarification", "scheduling", "delay", "correction",
  "escalation", "information request", "response to an inquiry", "meeting summary", "deadline issue",
];

const DIFFICULTY = {
  easy: "One recipient and one clear goal. All needed facts are given and nothing is in conflict.",
  medium: "Two or three things the email must achieve, or one mildly sensitive point such as a small delay or a correction.",
  hard: "Several required actions plus a complication: conflicting information, a problem that needs diplomatic handling, or pressure to promise something the writer is not authorised to promise.",
};

const Scenario = z.object({
  title: z.string(),
  text: z.string(),
  facts: z.array(z.string()),
  requiredActions: z.array(z.string()),
  constraints: z.array(z.string()),
});

export async function generateScenario({ businessEnvironment, language, communicationStyle, difficulty }) {
  // Picking the type here rather than letting the model choose keeps the exercises varied.
  const type = TYPES[Math.floor(Math.random() * TYPES.length)];
  const scenario = await ask(
    `You write realistic email-writing exercises for professionals training their business writing.
Write every field in ${language}.
Use the terminology, roles and processes of the described workplace. Invent plausible names, numbers and dates, but do not invent specific internal procedures, systems or policies the description does not support.
The email must be writable in 3-4 minutes, so keep the situation to what a short email can handle.

Fields:
- title: a few words naming the situation.
- text: the brief the trainee sees, addressed to them in the informal second person singular. Say who they write to and why, include any incoming message they are replying to, and give every fact they need. 60-150 words. Do not list the grading checklist and do not hint at pitfalls.
- facts: the concrete facts the email may rely on.
- requiredActions: what a good email must accomplish. Used only for grading, never shown.
- constraints: what the email must not do (for example commit to something the writer cannot authorise), and the register expected for this recipient under the communication style. Used only for grading, never shown.`,
    `Workplace:\n${businessEnvironment}\n\nCommunication style:\n${communicationStyle}\n\nScenario type: ${type}\nDifficulty: ${difficulty}. ${DIFFICULTY[difficulty]}`,
    Scenario,
  );
  return { ...scenario, type };
}

const bullets = (items) => items.map((item) => `- ${item}`).join("\n");

// The full situation, including the grading checklist. Shared by the evaluation and the model answer.
const context = ({ configuration, scenario }) => `Workplace:
${configuration.businessEnvironment}

Communication style:
${configuration.communicationStyle}

Scenario (${scenario.type}): ${scenario.title}
${scenario.text}

Facts:
${bullets(scenario.facts)}

Required actions:
${bullets(scenario.requiredActions)}

Constraints:
${bullets(scenario.constraints)}`;

const Evaluation = z.object({
  rating: z.number().int().min(1).max(3),
  missingRequirements: z.array(z.string()),
  problematicStatements: z.array(z.string()),
  feedback: z.array(z.string()),
});

export function evaluate(exercise) {
  const { subject, body } = exercise.submission;
  return ask(
    `You review emails written in a timed business-writing exercise. Write every field in ${exercise.configuration.language}.
A separate tool already reports spelling, grammar, punctuation and capitalization errors, so do not mention those.
Judge the email as a whole, in context: Does it accomplish the task? Is important information missing, or is anything wrong compared with the facts? Do register and style suit the recipient and the stated communication style? Is anything awkward, unclear, needlessly long or inappropriate? Does it commit to something the writer is not authorised to promise?
Wording that differs from what you would have written is fine. Only flag real problems.

rating: 3 = good, ready to send. 2 = acceptable but needs improvement. 1 = needs substantial improvement.
missingRequirements: required actions or essential information the email leaves out, one short sentence each.
problematicStatements: passages that are wrong, inappropriate or promise too much. Quote the passage and say briefly why.
feedback: one to four short, concrete points. Say what works if something does, and what to change.`,
    `${context(exercise)}\n\nThe email:\nSubject: ${subject}\n\n${body}`,
    Evaluation,
  );
}

const ModelAnswer = z.object({ subject: z.string(), body: z.string() });

export function writeModelAnswer(exercise) {
  return ask(
    `You write the model answer for a timed business-writing exercise: the email a skilled professional in this workplace would actually send.
Write it in ${exercise.configuration.language}, follow the communication style, accomplish every required action and respect every constraint.
Keep it realistic and concise, about what can be written in a few minutes.`,
    context(exercise),
    ModelAnswer,
  );
}
