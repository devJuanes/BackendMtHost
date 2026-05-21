import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler.js";
import { validateBody, validateParams } from "../middleware/validate.js";
import { authenticate } from "../middleware/auth.js";
import * as nginxService from "../services/nginx.service.js";

const router = Router();
router.use(authenticate);

const idParam = z.object({ id: z.string().uuid() });

const createSchema = z.object({
  server_name: z.string().min(3).max(253),
  hosting_account_id: z.string().uuid().optional(),
  domain_id: z.string().uuid().optional(),
});

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const vhosts = await nginxService.listVhosts(req.userId!);
    res.json({ success: true, data: vhosts });
  })
);

router.get(
  "/:id",
  validateParams(idParam),
  asyncHandler(async (req, res) => {
    const vhost = await nginxService.getVhost(req.userId!, req.params.id);
    res.json({ success: true, data: vhost });
  })
);

router.post(
  "/",
  validateBody(createSchema),
  asyncHandler(async (req, res) => {
    const vhost = await nginxService.createVhost(req.userId!, req.body);
    res.status(201).json({ success: true, data: vhost });
  })
);

router.post(
  "/:id/enable",
  validateParams(idParam),
  asyncHandler(async (req, res) => {
    const vhost = await nginxService.enableVhost(req.userId!, req.params.id);
    res.json({ success: true, data: vhost });
  })
);

router.post(
  "/:id/disable",
  validateParams(idParam),
  asyncHandler(async (req, res) => {
    const vhost = await nginxService.disableVhost(req.userId!, req.params.id);
    res.json({ success: true, data: vhost });
  })
);

router.delete(
  "/:id",
  validateParams(idParam),
  asyncHandler(async (req, res) => {
    await nginxService.deleteVhost(req.userId!, req.params.id);
    res.json({ success: true, data: { deleted: true } });
  })
);

export default router;
