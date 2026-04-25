import path from "node:path";
import { promises as fs } from "node:fs";
import {
  AGENT_RUNS_DIR,
  dispatchAgent,
  ensureDir,
  findAgentById,
  findSkillById,
  loadAgents,
  loadSkills,
  readArg,
  runId,
  splitChangedFiles,
  writeJson,
} from "./lib/agent-automation";

type RunSummary = {
  phase: "plan" | "implement" | "verify" | "release";
  task: string;
  selectedAgentId: string;
  workflow: string[];
  changedFiles: string[];
  requiredSkills: string[];
  missingSkills: string[];
  artifactsDir: string;
  generatedAt: string;
};

function normalizePhase(value: string | undefined): "plan" | "implement" | "verify" | "release" {
  if (value === "plan" || value === "implement" || value === "verify" || value === "release") {
    return value;
  }
  return "implement";
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const phase = normalizePhase(readArg(args, "--phase"));
  const task = readArg(args, "--task") ?? "";
  const requestedAgentId = readArg(args, "--agent");
  const changedFiles = splitChangedFiles(readArg(args, "--changed"));
  const customOutDir = readArg(args, "--out");
  const printPrompt = args.includes("--print");

  const agents = await loadAgents();
  const skills = await loadSkills();

  const dispatch = dispatchAgent(task, changedFiles, agents);
  const selectedAgentId = requestedAgentId ?? dispatch.selectedAgentId;
  const selectedAgent = findAgentById(agents, selectedAgentId);
  if (!selectedAgent) {
    throw new Error(`Unknown agent "${selectedAgentId}".`);
  }

  const requiredSkills = selectedAgent.requiredSkills;
  const loadedSkills = requiredSkills
    .map((skillId) => findSkillById(skills, skillId))
    .filter((skill): skill is NonNullable<typeof skill> => Boolean(skill));
  const missingSkills = requiredSkills.filter((skillId) => !loadedSkills.some((skill) => skill.id === skillId));

  const workflow =
    requestedAgentId && requestedAgentId !== dispatch.selectedAgentId
      ? ["orchestrator-agent", requestedAgentId, "qa-agent", "devops-agent", "observability-agent"]
      : dispatch.workflow;

  const outDir = customOutDir
    ? path.resolve(process.cwd(), customOutDir)
    : path.resolve(AGENT_RUNS_DIR, runId(`run-${phase}`));
  await ensureDir(outDir);

  const prompt = [
    "# Agent Execution Pack",
    "",
    `- Generated: ${new Date().toISOString()}`,
    `- Phase: ${phase}`,
    `- Selected agent: ${selectedAgent.id}`,
    `- Agent file: ${path.relative(process.cwd(), selectedAgent.filePath).replace(/\\/g, "/")}`,
    `- Workflow: ${workflow.join(" -> ")}`,
    "",
    "## Task",
    "",
    task || "(No explicit task provided; use changed files + workflow plan.)",
    "",
    "## Changed Files (Hint)",
    "",
    ...(changedFiles.length > 0 ? changedFiles.map((file) => `- ${file}`) : ["- (none)"]),
    "",
    "## Agent Purpose",
    "",
    selectedAgent.purpose || "(not specified)",
    "",
    "## Required Skills",
    "",
    ...(requiredSkills.length > 0 ? requiredSkills.map((skill) => `- ${skill}`) : ["- (none)"]),
    "",
    "## Execution Protocol",
    "",
    "1. Identify owner agent and required skills.",
    "2. Follow the skill methods and quality bars.",
    "3. Implement the task with minimal scope changes.",
    "4. Verify against acceptance criteria before completion.",
    "",
    "## Agent Success Criteria",
    "",
    ...(selectedAgent.successCriteria.length > 0
      ? selectedAgent.successCriteria.map((criterion) => `- ${criterion}`)
      : ["- (not specified)"]),
    "",
    "## Skill Guidance",
    "",
    ...loadedSkills.flatMap((skill) => [
      `### ${skill.id}`,
      "",
      skill.purpose || "(purpose not specified)",
      "",
      ...(skill.qualityBar.length > 0
        ? ["Quality bar:", ...skill.qualityBar.map((item) => `- ${item}`)]
        : ["Quality bar: (not specified)"]),
      "",
    ]),
  ].join("\n");

  const summary: RunSummary = {
    phase,
    task,
    selectedAgentId: selectedAgent.id,
    workflow,
    changedFiles,
    requiredSkills,
    missingSkills,
    artifactsDir: path.relative(process.cwd(), outDir).replace(/\\/g, "/"),
    generatedAt: new Date().toISOString(),
  };

  await fs.writeFile(path.resolve(outDir, "prompt.md"), prompt, "utf8");
  await writeJson(path.resolve(outDir, "run.json"), summary);

  const referencesDir = path.resolve(outDir, "references");
  await ensureDir(referencesDir);
  await fs.copyFile(selectedAgent.filePath, path.resolve(referencesDir, path.basename(selectedAgent.filePath)));
  for (const skill of loadedSkills) {
    await fs.copyFile(skill.filePath, path.resolve(referencesDir, path.basename(skill.filePath)));
  }

  if (printPrompt) {
    console.log(prompt);
    return;
  }

  console.log(`Execution pack generated: ${summary.artifactsDir}`);
  console.log(`Selected agent: ${summary.selectedAgentId}`);
  console.log(`Required skills: ${requiredSkills.join(", ") || "(none)"}`);
  if (missingSkills.length > 0) {
    console.log(`Missing skills: ${missingSkills.join(", ")}`);
  }
  console.log(`Prompt file: ${path.relative(process.cwd(), path.resolve(outDir, "prompt.md")).replace(/\\/g, "/")}`);
}

main().catch((error) => {
  console.error("run-agent failed:", error);
  process.exit(1);
});
