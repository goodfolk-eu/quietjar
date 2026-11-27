import { readFile } from "node:fs/promises";
import { createSlopSift } from "slopsift";

type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

function* strings(value: Json, path: string[] = []): Generator<[string, string]> {
  if (typeof value === "string") {
    yield [path.join("."), value];
  } else if (Array.isArray(value)) {
    for (const [index, item] of value.entries()) yield* strings(item, [...path, String(index)]);
  } else if (value !== null && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) yield* strings(item, [...path, key]);
  }
}

// Prose rules that misfire on short UI copy such as empty states ("No goals yet.") and
// form hints ("This cannot be changed later.").
const skippedRules = new Set(["ai-style/dramatic-fragment", "ai-style/passive-actor-hiding"]);

const files = process.argv.slice(2);
const slopsift = await createSlopSift();
let findings = 0;

for (const file of files) {
  const json: Json = JSON.parse(await readFile(file, "utf8"));
  for (const [key, text] of strings(json)) {
    // The .md name makes slopsift parse the string as Markdown.
    const result = await slopsift.lintSource("string.md", text, { level: "warning" });
    const lints = (result?.lints ?? []).filter((lint) => !skippedRules.has(lint.ruleId));
    for (const lint of lints) {
      findings++;
      console.log(`${file} > ${key}`);
      console.log(`  ${lint.severity}  ${lint.message}  ${lint.ruleId}`);
      console.log(`  "${lint.text}"`);
    }
  }
}

if (findings > 0) {
  console.log(`\n${findings} problem${findings === 1 ? "" : "s"} in i18n strings`);
  process.exit(1);
}
