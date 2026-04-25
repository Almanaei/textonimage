import path from "node:path";
import { promises as fs } from "node:fs";
import {
  AGENT_RUNS_DIR,
  dispatchAgent,
  ensureDir,
  loadAgents,
  loadSkills,
  readArg,
  runId,
  splitChangedFiles,
  writeJson,
} from "./lib/agent-automation";

type DispatchOutput = {
  task: string;
  changedFiles: string[];
  selectedAgentId: string;
  selectedAgentFile: string;
  requiredSkills: string[];
  missingSkills: string[];
  workflow: string[];
  reason: string;
  scores: Record<string, number>;
  generatedAt: string;
};

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const task = readArg(args, "--task") ?? "";
  const changedFiles = splitChangedFiles(readArg(args, "--changed"));
  const customOutDir = readArg(args, "--out");
  const jsonOnly = args.includes("--json");

  const agents = await loadAgents();
  const skills = await loadSkills();
  const skillIds = new Set(skills.map((skill) => skill.id));

  const dispatch = dispatchAgent(task, changedFiles, agents);
  const selectedAgent = agents.find((agent) => agent.id === dispatch.selectedAgentId);

  if (!selectedAgent) {
    throw new Error(`Selected agent "${dispatch.selectedAgentId}" not found.`);
  }

  const missingSkills = selectedAgent.requiredSkills.filter((skillId) => !skillIds.has(skillId));

  const out: DispatchOutput = {
    task,
    changedFiles,
    selectedAgentId: selectedAgent.id,
    selectedAgentFile: path.relative(process.cwd(), selectedAgent.filePath).replace(/\\/g, "/"),
    requiredSkills: selectedAgent.requiredSkills,
    missingSkills,
    workflow: dispatch.workflow,
    reason: dispatch.reason,
    scores: dispatch.scores,
    generatedAt: new Date().toISOString(),
  };

  const dir = customOutDir
    ? path.resolve(process.cwd(), customOutDir)
    : path.resolve(AGENT_RUNS_DIR, runId("dispatch"));
  await ensureDir(dir);

  const jsonPath = path.resolve(dir, "dispatch.json");
  await writeJson(jsonPath, out);

  const markdown = [
    "# Agent Dispatch",
    "",
    `- Generated: ${out.generatedAt}`,
    `- Selected agent: ${out.selectedAgentId}`,
    `- Agent file: ${out.selectedAgentFile}`,
    `- Reason: ${out.reason}`,
    `- Workflow: ${out.workflow.join(" -> ")}`,
    `- Required skills: ${out.requiredSkills.join(", ") || "(none)"}`,
    `- Missing skills: ${out.missingSkills.join(", ") || "(none)"}`,
    "",
    "## Task",
    "",
    task || "(empty task; dispatch relied on changed files/signals)",
    "",
    "## Changed Files",
    "",
    ...(changedFiles.length > 0 ? changedFiles.map((file) => `- ${file}`) : ["- (none)"]),
    "",
  ].join("\n");
  await fs.writeFile(path.resolve(dir, "dispatch.md"), markdown, "utf8");

  if (jsonOnly) {
    console.log(JSON.stringify(out, null, 2));
    return;
  }

  console.log(`Selected agent: ${out.selectedAgentId}`);
  console.log(`Reason: ${out.reason}`);
  console.log(`Workflow: ${out.workflow.join(" -> ")}`);
  console.log(`Required skills: ${out.requiredSkills.join(", ") || "(none)"}`);
  if (out.missingSkills.length > 0) {
    console.log(`Missing skills: ${out.missingSkills.join(", ")}`);
  }
  console.log(`Dispatch artifacts: ${path.relative(process.cwd(), dir).replace(/\\/g, "/")}`);
}

main().catch((error) => {
  console.error("agent-dispatcher failed:", error);
  process.exit(1);
});
