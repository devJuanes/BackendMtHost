import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler.js";
import { validateBody, validateParams } from "../middleware/validate.js";
import { authenticate } from "../middleware/auth.js";
import * as dnsService from "../services/dns.service.js";

const router = Router();
router.use(authenticate);

const idParam = z.object({ id: z.string().uuid() });
const domainParam = z.object({ domainId: z.string().uuid() });

const createSchema = z.object({
  type: z.enum(["A", "AAAA", "CNAME", "MX", "TXT", "NS"]),
  name: z.string().min(1).max(253),
  content: z.string().min(1).max(2000),
  ttl: z.number().int().min(60).max(86400).optional(),
  priority: z.number().int().min(0).max(65535).optional(),
});

const updateSchema = createSchema.partial().omit({ type: true });

router.get(
  "/domain/:domainId",
  validateParams(domainParam),
  asyncHandler(async (req, res) => {
    const records = await dnsService.listDnsRecords(req.userId!, req.params.domainId);
    res.json({ success: true, data: records });
  })
);

router.post(
  "/domain/:domainId",
  validateParams(domainParam),
  validateBody(createSchema),
  asyncHandler(async (req, res) => {
    const record = await dnsService.createDnsRecord(req.userId!, req.params.domainId, req.body);
    res.status(201).json({ success: true, data: record });
  })
);

router.patch(
  "/:id",
  validateParams(idParam),
  validateBody(updateSchema),
  asyncHandler(async (req, res) => {
    const record = await dnsService.updateDnsRecord(req.userId!, req.params.id, req.body);
    res.json({ success: true, data: record });
  })
);

router.delete(
  "/:id",
  validateParams(idParam),
  asyncHandler(async (req, res) => {
    await dnsService.deleteDnsRecord(req.userId!, req.params.id);
    res.json({ success: true, data: { deleted: true } });
  })
);

export default router;
