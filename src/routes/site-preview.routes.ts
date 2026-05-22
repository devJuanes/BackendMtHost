import { Router, type Request, type Response } from "express";
import path from "path";
import fs from "fs/promises";
import { getDomainDocumentRoot } from "../utils/default-site.js";

const router = Router();

function normalizeFqdn(raw: string): string {
  return raw.toLowerCase().replace(/\/+$/, "");
}

router.get("/:fqdn", (req: Request, res: Response) => {
  const fqdn = normalizeFqdn(req.params.fqdn);
  res.redirect(302, `${req.baseUrl}/${fqdn}/`);
});

router.get("/:fqdn/", async (req: Request, res: Response) => {
  const fqdn = normalizeFqdn(req.params.fqdn);
  const indexPath = path.join(getDomainDocumentRoot(fqdn), "index.html");
  try {
    await fs.access(indexPath);
    res.sendFile(indexPath);
  } catch {
    res.status(404).type("html").send(
      `<!DOCTYPE html><html lang="es"><body style="font-family:system-ui;padding:2rem">
      <h1>Sitio no encontrado</h1>
      <p>No hay página de bienvenida para <strong>${fqdn}</strong>. Pulsa sincronizar (↻) en el panel de dominios.</p>
      </body></html>`
    );
  }
});

export default router;
