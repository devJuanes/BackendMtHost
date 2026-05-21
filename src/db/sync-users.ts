import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { getServiceClient } from "./matuclient.js";
import { matuErrorMessage } from "./matu.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function syncUsers() {
  const sql = await fs.readFile(path.join(__dirname, "sync-users.sql"), "utf-8");
  const { data, error } = await getServiceClient().rpc(sql);

  if (error) {
    console.error("Sync failed:", matuErrorMessage(error));
    process.exit(1);
  }

  console.log("Users synced from profiles.", data ?? "");
  process.exit(0);
}

syncUsers().catch((err) => {
  console.error(err);
  process.exit(1);
});
