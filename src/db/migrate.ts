import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { getServiceClient } from "./matuclient.js";
import { matuErrorMessage } from "./matu.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function migrate() {
  const schemaPath = path.join(__dirname, "schema.sql");
  const sql = await fs.readFile(schemaPath, "utf-8");
  const db = getServiceClient();
 
  console.log("Running MatuHost schema via MatuDB rpc...");
  const { data, error } = await db.rpc(sql);

  if (error) {
    console.error("Migration failed:", matuErrorMessage(error));
    console.error(
      "\nAsegúrate de que matu-db-api esté corriendo y MATUDB_* esté configurado en .env"
    );
    process.exit(1);
  }

  console.log("Migration completed successfully.", data ?? "");
  process.exit(0);
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
