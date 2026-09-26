const LANGUAGE_CODES = { German: "de-DE", English: "en-US", French: "fr", Spanish: "es" };

// LanguageTool's category ids differ per language, but its issueType does not. These issue types are optional suggestions, not errors.
const OPTIONAL = ["style", "locale-violation", "register"];

function errorType({ issueType, category }) {
  if (category.id === "CASING") return "capitalization";
  if (category.id === "PUNCTUATION" || issueType === "typographical" || issueType === "whitespace") return "punctuation";
  if (issueType === "misspelling") return "spelling";
  return "grammar";
}

async function check(text, language) {
  const res = await fetch(`${process.env.LANGUAGETOOL_URL}/check`, {
    method: "POST",
    body: new URLSearchParams({ text, language: LANGUAGE_CODES[language] }),
  });
  if (!res.ok) throw new Error(`LanguageTool: ${res.status} ${await res.text()}`);
  return (await res.json()).matches;
}

export async function checkLanguage({ subject, body }, language) {
  const errors = [];
  for (const [field, text] of Object.entries({ subject, body })) {
    if (!text.trim()) continue;
    for (const { rule, offset, length, replacements, message } of await check(text, language)) {
      if (OPTIONAL.includes(rule.issueType)) continue;
      errors.push({
        field,
        type: errorType(rule),
        offset,
        length,
        original: text.substr(offset, length),
        correction: replacements[0]?.value ?? null,
        message,
        ruleId: rule.id,
      });
    }
  }
  return { errors };
}
