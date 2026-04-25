import path from "node:path";
import { promises as fs } from "node:fs";
import { AGENT_RUNS_DIR, ensureDir, hasFlag, runId, writeJson } from "./lib/agent-automation";
import { runNpmScript } from "./lib/command-runner";

type ReleaseGateReport = {
  generatedAt: string;
  includeAnalytics: boolean;
  verifyPassed: boolean;
  analyticsPassed: boolean;
  success: boolean;
};

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const includeAnalytics = hasFlag(args, "--analytics");

  const verifyResult = await runNpmScript("agent:verify");
  const verifyPassed = verifyResult.exitCode === 0;

  let analyticsPassed = false;
  if (verifyPassed && includeAnalytics) {
    const analyticsResult = await runNpmScript("qa:analytics");
    analyticsPassed = analyticsResult.exitCode === 0;
  } else if (!includeAnalytics) {
    analyticsPassed = true;
  }

  const report: ReleaseGateReport = {
    generatedAt: new Date().toISOString(),
    includeAnalytics,
    verifyPassed,
    analyticsPassed,
    success: verifyPassed && analyticsPassed,
  };

  const outDir = path.resolve(AGENT_RUNS_DIR, runId("release-gate"));
  await ensureDir(outDir);
  await writeJson(path.resolve(outDir, "release-gate.json"), report);
  await fs.writeFile(
    path.resolve(outDir, "release-gate.md"),
    [
      "# Release Gate",
      "",
      `- Generated: ${report.generatedAt}`,
      `- Verify passed: ${String(report.verifyPassed)}`,
      `- Analytics checked: ${String(report.includeAnalytics)}`,
      `- Analytics passed: ${String(report.analyticsPassed)}`,
      `- Gate success: ${String(report.success)}`,
      "",
      "Use `npm run agent:release-gate -- --analytics` when DATABASE_URL and STATS_SECRET are ready.",
      "",
    ].join("\n"),
    "utf8",
  );

  console.log(`Release gate report: ${path.relative(process.cwd(), outDir).replace(/\\/g, "/")}`);
  if (!report.success) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("agent-release-gate failed:", error);
  process.exit(1);
});
