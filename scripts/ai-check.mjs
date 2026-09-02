import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const reportDir = path.join(root, ".ai");
const reportPath = path.join(reportDir, "ai-check-report.md");

const checks = [
  {
    name: "ESLint",
    command: "npm",
    args: ["run", "lint", "--", "--format", "stylish"],
  },
  {
    name: "TypeScript",
    command: "npx",
    args: ["tsc", "--noEmit", "--pretty", "false"],
  },
  {
    name: "Next Build",
    command: "npm",
    args: ["run", "build"],
  },
];

function runCheck(check) {
  const result = spawnSync(commandLine(check), {
    cwd: root,
    encoding: "utf8",
    shell: true,
    env: {
      ...process.env,
      NEXT_TELEMETRY_DISABLED: "1",
      NO_COLOR: "1",
      FORCE_COLOR: "0",
    },
  });

  return {
    ...check,
    exitCode: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.error
      ? `${result.stderr ?? ""}\n${result.error.name}: ${result.error.message}`
      : result.stderr ?? "",
  };
}

function normalizeSlashes(value) {
  return value.replaceAll("\\", "/");
}

function toRelativeFile(file) {
  const cleaned = file.replace(/^file:\/\//, "").replace(/[()]/g, "");
  const absolute = path.isAbsolute(cleaned)
    ? cleaned
    : path.resolve(root, cleaned);
  return normalizeSlashes(path.relative(root, absolute));
}

function extractLocations(text) {
  const locations = [];
  const seen = new Set();
  const patterns = [
    /((?:[A-Za-z]:)?[^:\n\r()]+?\.(?:tsx|ts|jsx|js|mjs|cjs|css|json)):(\d+):(\d+)/g,
    /((?:[A-Za-z]:)?[^:\n\r()]+?\.(?:tsx|ts|jsx|js|mjs|cjs|css|json))\((\d+),(\d+)\)/g,
  ];

  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const file = toRelativeFile(match[1].trim());
      const line = Number(match[2]);
      const column = Number(match[3] ?? 1);
      if (!file.startsWith("node_modules/") && Number.isFinite(line)) {
        const key = `${file}:${line}:${column}`;
        if (!seen.has(key)) {
          seen.add(key);
          locations.push({ file, line, column });
        }
      }
    }
  }

  return locations;
}

function getSnippet(location, radius = 4) {
  const absolute = path.join(root, location.file);
  if (!existsSync(absolute)) {
    return null;
  }

  const lines = readFileSync(absolute, "utf8").split(/\r?\n/);
  const start = Math.max(1, location.line - radius);
  const end = Math.min(lines.length, location.line + radius);
  const width = String(end).length;

  return {
    ...location,
    start,
    end,
    code: lines
      .slice(start - 1, end)
      .map((line, index) => {
        const lineNumber = start + index;
        const marker = lineNumber === location.line ? ">" : " ";
        return `${marker} ${String(lineNumber).padStart(width, " ")} | ${line}`;
      })
      .join("\n"),
  };
}

function firstUsefulLines(text, limit = 80) {
  const ignored = [
    /^$/,
    /^>/,
    /^npm notice/,
    /^Next\.js telemetry/i,
    /^Learn more:/i,
  ];

  return text
    .split(/\r?\n/)
    .filter((line) => !ignored.some((pattern) => pattern.test(line.trim())))
    .slice(0, limit)
    .join("\n");
}

function commandLine(check) {
  return [check.command, ...check.args].join(" ");
}

function buildReport(results) {
  const failed = results.filter((result) => result.exitCode !== 0);
  const allLocations = [];
  const seen = new Set();

  for (const result of failed) {
    const text = `${result.stdout}\n${result.stderr}`;
    for (const location of extractLocations(text)) {
      const key = `${location.file}:${location.line}:${location.column}`;
      if (!seen.has(key)) {
        seen.add(key);
        allLocations.push(location);
      }
    }
  }

  const snippets = allLocations
    .slice(0, 12)
    .map((location) => getSnippet(location))
    .filter(Boolean);

  const status = failed.length === 0 ? "PASSED" : "FAILED";
  const lines = [
    "# AI Debug Report",
    "",
    `Status: ${status}`,
    `Generated: ${new Date().toISOString()}`,
    `Project: ${path.basename(root)}`,
    "",
    "## What Ran",
    "",
    ...results.map(
      (result) =>
        `- ${result.exitCode === 0 ? "PASS" : "FAIL"} ${result.name}: \`${commandLine(result)}\``,
    ),
    "",
  ];

  if (failed.length > 0) {
    lines.push("## Failing Output", "");
    for (const result of failed) {
      const output = firstUsefulLines(`${result.stdout}\n${result.stderr}`);
      lines.push(`### ${result.name}`, "", "```text", output || "(no output)", "```", "");
    }
  }

  if (snippets.length > 0) {
    lines.push("## Code Locations And Snippets", "");
    for (const snippet of snippets) {
      lines.push(
        `### ${snippet.file}:${snippet.line}:${snippet.column}`,
        "",
        "```text",
        snippet.code,
        "```",
        "",
      );
    }
  } else if (failed.length > 0) {
    lines.push(
      "## Code Locations And Snippets",
      "",
      "No direct local file:line:column locations were found in the command output.",
      "",
    );
  }

  lines.push(
    "## Prompt To Paste Into GPT",
    "",
    "Please help me debug this Next.js project. Based on the failing output and code snippets above, tell me which file and line I should inspect first, what the likely bug is, and what change I should try.",
    "",
  );

  return lines.join("\n");
}

mkdirSync(reportDir, { recursive: true });

const results = checks.map((check) => {
  console.log(`\nRunning ${check.name}...`);
  return runCheck(check);
});

const hasFailures = results.some((result) => result.exitCode !== 0);
const status = hasFailures ? "FAILED" : "PASSED";
const report = buildReport(results);
writeFileSync(reportPath, report, "utf8");

console.log("\n" + report);
console.log(`Report saved to ${path.relative(root, reportPath)}`);
console.log(`Status: ${status}`);

process.exitCode = hasFailures ? 1 : 0;
