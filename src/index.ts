import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { getDb, throwIfMatuError } from "./db/matu.js";

const app = createApp();

async function start() {
  try {
    const { error } = await getDb().from("profiles").select("id").limit(1);
    throwIfMatuError(error);
    console.log(`MatuDB connected (${env.MATUDB_URL} / ${env.MATUDB_PROJECT_ID})`);
  } catch (err) {
    console.error("MatuDB connection failed. Verifica matu-db-api y npm run db:migrate");
    console.error(err);
    process.exit(1);
  }

  const server = app.listen(env.PORT, () => {
    console.log(`MatuHost API running on http://localhost:${env.PORT}`);
    console.log("Modo watch: los cambios en src/ recargan el servidor automáticamente");
  });

  server.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") {
      console.error(
        `\nPuerto ${env.PORT} ya en uso. Ejecuta: npm run dev:restart\n(o cierra la otra terminal con el backend)\n`
      );
      process.exit(1);
    }
    throw err;
  });

  const shutdown = () => {
    server.close(() => process.exit(0));
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

start();
