import { Glob } from "bun";

// The frontend runs a strict CSP with no unsafe-inline, so style attributes cannot be
// hashed and get blocked in production. Biome only parses Astro frontmatter, never the
// template, so its noInlineStyles rule cannot see these.
const CHECKS = [
  { pattern: /\sstyle=["'{]/g, rule: "style attribute" },
  { pattern: /\sdefine:vars=/g, rule: "define:vars" },
];

type Violation = {
  file: string;
  line: number;
  rule: string;
};

// Frontmatter is TypeScript, not markup, and is already covered by Biome. Blank it out
// while keeping the line count so reported line numbers still point at the real source.
const withoutFrontmatter = (source: string): string => {
  if (!source.startsWith("---")) {
    return source;
  }
  const end = source.indexOf("\n---", 3);
  if (end === -1) {
    return source;
  }
  const head = source.slice(0, end + 4);
  return head.replace(/[^\n]/g, "") + source.slice(end + 4);
};

const scan = (file: string, source: string): Violation[] => {
  const markup = file.endsWith(".astro") ? withoutFrontmatter(source) : source;
  const violations: Violation[] = [];

  markup.split("\n").forEach((line, index) => {
    for (const { pattern, rule } of CHECKS) {
      pattern.lastIndex = 0;
      if (pattern.test(line)) {
        violations.push({ file, line: index + 1, rule });
      }
    }
  });

  return violations;
};

const glob = new Glob("apps/*/src/**/*.{astro,html}");
const violations: Violation[] = [];

for await (const file of glob.scan(".")) {
  violations.push(...scan(file, await Bun.file(file).text()));
}

if (violations.length > 0) {
  console.error("Inline styles are blocked by the strict CSP (see apps/frontend/AGENTS.md):");
  for (const violation of violations) {
    console.error(`  ${violation.file}:${violation.line}  ${violation.rule}`);
  }
  console.error("\nUse Tailwind classes or a scoped <style> block instead.");
  process.exit(1);
}
