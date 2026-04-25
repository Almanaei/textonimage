import { spawn } from "node:child_process";

export type CommandResult = {
  command: string;
  args: string[];
  exitCode: number;
  durationMs: number;
};

export function npmCommand(): string {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

export async function runCommand(
  command: string,
  args: string[],
  env?: NodeJS.ProcessEnv,
): Promise<CommandResult> {
  const startedAt = Date.now();

  const exitCode = await new Promise<number>((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      env: env ?? process.env,
      shell: process.platform === "win32",
    });

    child.on("error", reject);
    child.on("close", (code) => resolve(code ?? 1));
  });

  return {
    command,
    args,
    exitCode,
    durationMs: Date.now() - startedAt,
  };
}

export async function runNpmScript(
  scriptName: string,
  env?: NodeJS.ProcessEnv,
): Promise<CommandResult> {
  return runCommand(npmCommand(), ["run", scriptName], env);
}
