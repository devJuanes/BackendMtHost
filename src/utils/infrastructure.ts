import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function runInfrastructureCommand(
  cmd: string | undefined,
  label: string
): Promise<{ ok: boolean; output?: string }> {
  const command = cmd?.trim();
  if (!command) return { ok: true };

  try {
    const { stdout, stderr } = await execAsync(command);
    return { ok: true, output: (stdout || stderr).trim() };
  } catch (err) {
    const message = (err as Error).message;
    console.warn(`[MatuHost] ${label} falló:`, message);
    return { ok: false, output: message };
  }
}
