import { syncAllZones } from "../services/dns-zone.service.js";

const count = await syncAllZones();
console.log(`Zonas DNS sincronizadas: ${count}`);
process.exit(0);
