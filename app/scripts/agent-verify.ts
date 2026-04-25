import path from "node:path";
import { promises as fs } from "node:fs";
import { AGENT_RUNS_DIR, ensureDir, hasFlag, runId, writeJson } from "./lib/agent-automation";
import { runNpmScript } from "./lib/command-runner";

type StepResult = {
  step: string;
  success: boolean;
  durationMs: number;
};

type VerifyReport = {
  generatedAt: string;
  includeAnalytics: boolean;
  success: boolean;
  steps: StepResult[];
};

function buildEnvForBuild(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  if (!env.STATS_SECRET || env.STATS_SECRET.length < 32) {
    env.STATS_SECRET = "ci-build-secret-at-least-32-characters";
  }
  return env;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const includeAnalytics = hasFlag(args, "--analytics");

  const results: StepResult[] = [];
  const steps: Array<{ name: string; script: string; env?: NodeJS.ProcessEnv }> = [
    { name: "lint", script: "lint" },
    { name: "test", script: "test" },
    { name: "build", script: "build", env: buildEnvForBuild() },
  ];

  if (includeAnalytics) {
    steps.push({ name: "qa:analytics", script: "qa:analytics" });
  }

  for (const step of steps) {
    const result = await runNpmScript(step.script, step.env);
    const success = result.exitCode === 0;
    results.push({
      step: step.name,
      success,
      durationMs: result.durationMs,
    });
    if (!success) {
      break;
    }
  }

  const report: VerifyReport = {
    generatedAt: new Date().toISOString(),
    includeAnalytics,
    success: results.every((step) => step.success),
    steps: results,
  };

  const outDir = path.resolve(AGENT_RUNS_DIR, runId("verify"));
  await ensureDir(outDir);
  await writeJson(path.resolve(outDir, "verify-report.json"), report);
  await fs.writeFile(
    path.resolve(outDir, "verify-report.md"),
    [
      "# Agent Verify Report",
      "",
      `- Generated: ${report.generatedAt}`,
      `- Include analytics: ${String(includeAnalytics)}`,
      `- Success: ${String(report.success)}`,
      "",
      "## Steps",
      "",
      ...report.steps.map((step) => `- ${step.step}: ${step.success ? "pass" : "fail"} (${step.durationMs}ms)`),
      "",
    ].join("\n"),
    "utf8",
  );

  console.log(`Verification report: ${path.relative(process.cwd(), outDir).replace(/\\/g, "/")}`);
  if (!report.success) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("agent-verify failed:", error);
  process.exit(1);
});
