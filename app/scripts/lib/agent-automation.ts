import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export type AgentProfile = {
  id: string;
  name: string;
  filePath: string;
  purpose: string;
  requiredSkills: string[];
  successCriteria: string[];
  raw: string;
};

export type SkillProfile = {
  id: string;
  name: string;
  filePath: string;
  purpose: string;
  qualityBar: string[];
  raw: string;
};

export type DispatchResult = {
  selectedAgentId: string;
  reason: string;
  scores: Record<string, number>;
  workflow: string[];
};

const CURRENT_DIR = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(CURRENT_DIR, "../../..");
export const AGENT_SKILLS_ROOT = path.resolve(REPO_ROOT, "agents/ai_agents_skills");
export const AGENTS_DIR = path.resolve(AGENT_SKILLS_ROOT, "agents");
export const SKILLS_DIR = path.resolve(AGENT_SKILLS_ROOT, "skills");
export const AGENT_RUNS_DIR = path.resolve(REPO_ROOT, "app/output/agent-runs");

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function section(content: string, title: string): string {
  const pattern = new RegExp(
    `^##\\s+${escapeRegExp(title)}\\s*\\n([\\s\\S]*?)(?=^##\\s+|\\Z)`,
    "m",
  );
  const match = content.match(pattern);
  return match?.[1]?.trim() ?? "";
}

function firstHeading(content: string): string {
  const match = content.match(/^#\s+(.+)$/m);
  return match?.[1]?.trim() ?? "";
}

function parseBullets(content: string): string[] {
  const bullets = content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^-\s+/.test(line))
    .map((line) => line.replace(/^-\s+/, "").trim());

  if (bullets.length > 0) {
    return bullets;
  }

  return content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function normalizeId(fileName: string): string {
  return fileName.replace(/\.md$/i, "");
}

async function loadMarkdownFiles(dir: string): Promise<Array<{ name: string; fullPath: string; raw: string }>> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = entries.filter((entry) => entry.isFile() && entry.name.endsWith(".md"));

  const loaded = await Promise.all(
    files.map(async (entry) => {
      const fullPath = path.resolve(dir, entry.name);
      const raw = await fs.readFile(fullPath, "utf8");
      return { name: entry.name, fullPath, raw };
    }),
  );

  return loaded.sort((a, b) => a.name.localeCompare(b.name));
}

export async function loadAgents(): Promise<AgentProfile[]> {
  const files = await loadMarkdownFiles(AGENTS_DIR);
  return files.map((file) => {
    const requiredSkills = parseBullets(section(file.raw, "Required Skills")).map((skill) => skill.replace(/`/g, ""));
    return {
      id: normalizeId(file.name),
      name: firstHeading(file.raw) || normalizeId(file.name),
      filePath: file.fullPath,
      purpose: section(file.raw, "Purpose"),
      requiredSkills,
      successCriteria: parseBullets(section(file.raw, "Success Criteria")),
      raw: file.raw,
    };
  });
}

export async function loadSkills(): Promise<SkillProfile[]> {
  const files = await loadMarkdownFiles(SKILLS_DIR);
  return files.map((file) => ({
    id: normalizeId(file.name),
    name: firstHeading(file.raw) || normalizeId(file.name),
    filePath: file.fullPath,
    purpose: section(file.raw, "Purpose"),
    qualityBar: parseBullets(section(file.raw, "Quality Bar")),
    raw: file.raw,
  }));
}

export function splitChangedFiles(rawValue: string | undefined): string[] {
  if (!rawValue) {
    return [];
  }

  return rawValue
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

function incScore(
  scores: Record<string, number>,
  signals: string[],
  agentId: string,
  points: number,
  reason: string,
): void {
  scores[agentId] = (scores[agentId] ?? 0) + points;
  signals.push(reason);
}

export function dispatchAgent(task: string, changedFiles: string[], agents: AgentProfile[]): DispatchResult {
  const allAgentIds = agents.map((agent) => agent.id);
  const scores = Object.fromEntries(allAgentIds.map((id) => [id, 0]));
  const signals: string[] = [];

  const keywordMap: Record<string, string[]> = {
    "backend-agent": ["api", "endpoint", "db", "database", "postgres", "migration", "auth", "schema", "server"],
    "frontend-agent": ["ui", "form", "component", "page", "mobile", "preview", "download", "rtl"],
    "image-rendering-agent": ["image", "render", "png", "sharp", "font", "arabic", "composite", "layout"],
    "qa-agent": ["qa", "test", "verify", "regression", "lighthouse", "edge case"],
    "devops-agent": ["deploy", "deployment", "ci", "cd", "workflow", "docker", "pipeline", "env", "release"],
    "observability-agent": ["log", "metric", "monitor", "alert", "latency", "trace", "kpi"],
    "solution-architect-agent": ["architecture", "blueprint", "topology", "boundary", "design"],
    "product-agent": ["prd", "requirements", "scope", "acceptance", "user flow"],
    "orchestrator-agent": ["orchestrate", "coordination", "handoff", "workstream", "plan"],
  };

  const taskText = task.toLowerCase();
  Object.entries(keywordMap).forEach(([agentId, keywords]) => {
    keywords.forEach((keyword) => {
      if (taskText.includes(keyword)) {
        incScore(scores, signals, agentId, 2, `${agentId}: task mentions "${keyword}"`);
      }
    });
  });

  changedFiles.forEach((file) => {
    const normalized = file.replace(/\\/g, "/").toLowerCase();

    if (
      normalized.includes("/api/") ||
      normalized.includes("lib/db") ||
      normalized.includes("scripts/migrate") ||
      normalized.includes("scripts/test-track") ||
      normalized.includes("scripts/test-stats")
    ) {
      incScore(scores, signals, "backend-agent", 3, `backend-agent: changed path "${file}"`);
    }
    if (
      normalized.includes("app/page") ||
      normalized.includes("components/") ||
      normalized.includes("/ui/") ||
      normalized.includes("layout.tsx")
    ) {
      incScore(scores, signals, "frontend-agent", 3, `frontend-agent: changed path "${file}"`);
    }
    if (
      normalized.includes("lib/composite") ||
      normalized.includes("lib/layout") ||
      normalized.includes("fonts/") ||
      normalized.includes("templates/")
    ) {
      incScore(scores, signals, "image-rendering-agent", 3, `image-rendering-agent: changed path "${file}"`);
    }
    if (
      normalized.includes("test") ||
      normalized.includes("playwright") ||
      normalized.includes("vitest")
    ) {
      incScore(scores, signals, "qa-agent", 2, `qa-agent: changed path "${file}"`);
    }
    if (
      normalized.includes(".github/workflows") ||
      normalized.includes("docker-compose") ||
      normalized.includes(".env") ||
      normalized.includes("next.config")
    ) {
      incScore(scores, signals, "devops-agent", 3, `devops-agent: changed path "${file}"`);
    }
    if (normalized.includes("log") || normalized.includes("metric") || normalized.includes("telemetry")) {
      incScore(scores, signals, "observability-agent", 3, `observability-agent: changed path "${file}"`);
    }
  });

  const ranked = Object.entries(scores)
    .filter(([agentId]) => agentId !== "orchestrator-agent")
    .sort((a, b) => b[1] - a[1]);

  const [topAgentId, topScore] = ranked[0] ?? ["orchestrator-agent", 0];
  const selectedAgentId = topScore > 0 ? topAgentId : "orchestrator-agent";

  const reason =
    signals.slice(0, 4).join("; ") ||
    "No strong signal detected. Use orchestrator first to assign ownership.";

  const workflow =
    selectedAgentId === "orchestrator-agent"
      ? ["orchestrator-agent"]
      : uniqueIds([
          "orchestrator-agent",
          selectedAgentId,
          "qa-agent",
          "devops-agent",
          "observability-agent",
        ]);

  return { selectedAgentId, reason, scores, workflow };
}

function uniqueIds(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  values.forEach((value) => {
    if (!seen.has(value)) {
      seen.add(value);
      out.push(value);
    }
  });
  return out;
}

export function findAgentById(agents: AgentProfile[], id: string): AgentProfile | undefined {
  return agents.find((agent) => agent.id === id);
}

export function findSkillById(skills: SkillProfile[], id: string): SkillProfile | undefined {
  return skills.find((skill) => skill.id === id);
}

export function runId(prefix: string): string {
  const now = new Date();
  const date = now.toISOString().replace(/[:.]/g, "-");
  return `${prefix}-${date}`;
}

export async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

export async function writeJson(filePath: string, value: unknown): Promise<void> {
  const json = JSON.stringify(value, null, 2);
  await fs.writeFile(filePath, `${json}\n`, "utf8");
}

export function readArg(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  if (index === -1) {
    return undefined;
  }

  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    return undefined;
  }

  return value;
}

export function hasFlag(args: string[], flag: string): boolean {
  return args.includes(flag);
}
