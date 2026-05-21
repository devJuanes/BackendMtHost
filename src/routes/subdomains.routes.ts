import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler.js";
import { validateBody, validateParams } from "../middleware/validate.js";
import { authenticate } from "../middleware/auth.js";
import * as subdomainService from "../services/subdomain.service.js";

const router = Router();
router.use(authenticate);

const idParam = z.object({ id: z.string().uuid() });

const createSchema = z.object({
  domain_id: z.string().uuid(),
  hostname: z.string().min(3).max(253),
  target_path: z.string().default("/"),
});

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const domainId = req.query.domain_id as string | undefined;
    const subdomains = await subdomainService.listSubdomains(req.userId!, domainId);
    res.json({ success: true, data: subdomains });
  })
);

router.post(
  "/",
  validateBody(createSchema),
  asyncHandler(async (req, res) => {
    const sub = await subdomainService.createSubdomain(
      req.userId!,
      req.body.domain_id,
      req.body.hostname,
      req.body.target_path
    );
    res.status(201).json({ success: true, data: sub });
  })
);

router.delete(
  "/:id",
  validateParams(idParam),
  asyncHandler(async (req, res) => {
    await subdomainService.deleteSubdomain(req.userId!, req.params.id);
    res.json({ success: true, data: { deleted: true } });
  })
);

export default router;
