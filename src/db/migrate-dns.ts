import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { getServiceClient } from "./matuclient.js";
import { matuErrorMessage } from "./matu.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function migrateDns() {
  const sql = await fs.readFile(path.join(__dirname, "schema-dns-zones.sql"), "utf-8");
  const { error } = await getServiceClient().rpc(sql);
  if (error) {
    console.error("DNS schema migration failed:", matuErrorMessage(error));
    process.exit(1);
  }
  console.log("DNS zones schema applied.");
  process.exit(0);
}

migrateDns().catch((e) => {
  console.error(e);
  process.exit(1);
});
