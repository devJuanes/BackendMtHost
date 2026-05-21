import { getServiceClient } from "./matuclient.js";
import { throwIfMatuError } from "./matu.js";
import { ensureDefaultSite } from "../utils/default-site.js";

async function provision() {
  const { data, error } = await getServiceClient()
    .from("domains")
    .select("fqdn")
    .order("created_at", { ascending: false });

  throwIfMatuError(error);
  const domains = (data ?? []) as { fqdn: string }[];

  for (const { fqdn } of domains) {
    const root = await ensureDefaultSite(fqdn);
    console.log(`✓ ${fqdn} → ${root}`);
  }

  console.log(`Listo: ${domains.length} dominio(s).`);
  process.exit(0);
}

provision().catch((err) => {
  console.error(err);
  process.exit(1);
});
