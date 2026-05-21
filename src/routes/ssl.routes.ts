import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler.js";
import { validateBody, validateParams } from "../middleware/validate.js";
import { authenticate } from "../middleware/auth.js";
import * as sslService from "../services/ssl.service.js";

const router = Router();
router.use(authenticate);

const idParam = z.object({ id: z.string().uuid() });
const domainParam = z.object({ domainId: z.string().uuid() });

const requestSchema = z.object({
  vhost_id: z.string().uuid().optional(),
});

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const certs = await sslService.listSsl(req.userId!);
    res.json({ success: true, data: certs });
  })
);

router.get(
  "/domain/:domainId",
  validateParams(domainParam),
  asyncHandler(async (req, res) => {
    const cert = await sslService.getSslForDomain(req.userId!, req.params.domainId);
    res.json({ success: true, data: cert });
  })
);

router.post(
  "/request",
  validateBody(z.object({ domain_id: z.string().uuid(), vhost_id: z.string().uuid().optional() })),
  asyncHandler(async (req, res) => {
    const cert = await sslService.requestSsl(req.userId!, req.body.domain_id, req.body.vhost_id);
    res.status(201).json({ success: true, data: cert });
  })
);

router.post(
  "/:id/issue",
  validateParams(idParam),
  asyncHandler(async (req, res) => {
    const cert = await sslService.simulateIssueSsl(req.userId!, req.params.id);
    res.json({ success: true, data: cert });
  })
);

router.post(
  "/:id/check",
  validateParams(idParam),
  asyncHandler(async (req, res) => {
    const cert = await sslService.checkSslStatus(req.userId!, req.params.id);
    res.json({ success: true, data: cert });
  })
);

export default router;
