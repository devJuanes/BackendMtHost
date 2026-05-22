import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler.js";
import { validateBody, validateParams } from "../middleware/validate.js";
import { authenticate } from "../middleware/auth.js";
import * as domainService from "../services/domain.service.js";

const router = Router();
router.use(authenticate);

const idParam = z.object({ id: z.string().uuid() });

const createSchema = z.object({
  fqdn: z.string().min(3).max(253),
  notes: z.string().max(500).optional(),
});

const updateSchema = z.object({
  status: z.enum(["pending", "active", "expired", "suspended"]).optional(),
  notes: z.string().max(500).optional(),
  server_ip: z.string().optional(),
});

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const domains = await domainService.listDomains(req.userId!);
    res.json({ success: true, data: domains });
  })
);

router.get(
  "/:id",
  validateParams(idParam),
  asyncHandler(async (req, res) => {
    const domain = await domainService.getDomain(req.userId!, req.params.id);
    res.json({ success: true, data: domain });
  })
);

router.post(
  "/",
  validateBody(createSchema),
  asyncHandler(async (req, res) => {
    const domain = await domainService.createDomain(req.userId!, req.body.fqdn, req.body.notes);
    res.status(201).json({ success: true, data: domain });
  })
);

router.patch(
  "/:id",
  validateParams(idParam),
  validateBody(updateSchema),
  asyncHandler(async (req, res) => {
    const domain = await domainService.updateDomain(req.userId!, req.params.id, req.body);
    res.json({ success: true, data: domain });
  })
);

router.post(
  "/:id/activate",
  validateParams(idParam),
  asyncHandler(async (req, res) => {
    const domain = await domainService.activateDomain(req.userId!, req.params.id);
    res.json({ success: true, data: domain });
  })
);

router.post(
  "/:id/verify-dns",
  validateParams(idParam),
  asyncHandler(async (req, res) => {
    const domain = await domainService.verifyDomainDnsForUser(req.userId!, req.params.id);
    res.json({ success: true, data: domain });
  })
);

router.post(
  "/:id/provision",
  validateParams(idParam),
  asyncHandler(async (req, res) => {
    const domain = await domainService.reprovisionDomain(req.userId!, req.params.id);
    res.json({ success: true, data: domain });
  })
);

router.delete(
  "/:id",
  validateParams(idParam),
  asyncHandler(async (req, res) => {
    await domainService.deleteDomain(req.userId!, req.params.id);
    res.json({ success: true, data: { deleted: true } });
  })
);

export default router;
