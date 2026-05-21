import { execSync } from "node:child_process";

const port = process.argv[2] ?? "4000";

try {
  if (process.platform === "win32") {
    const out = execSync(`netstat -ano | findstr :${port}`, { encoding: "utf-8" });
    const pids = new Set();
    for (const line of out.split("\n")) {
      if (!line.includes("LISTENING")) continue;
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (pid && pid !== "0") pids.add(pid);
    }
    for (const pid of pids) {
      try {
        execSync(`taskkill /PID ${pid} /F`, { stdio: "ignore" });
        console.log(`Puerto ${port}: proceso ${pid} detenido`);
      } catch {
        /* ignore */
      }
    }
  } else {
    execSync(`lsof -ti:${port} | xargs kill -9 2>/dev/null || true`, { shell: true });
  }
} catch {
  /* puerto libre */
}
