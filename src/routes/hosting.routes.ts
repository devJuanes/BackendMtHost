import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler.js";
import { validateBody, validateParams } from "../middleware/validate.js";
import { authenticate } from "../middleware/auth.js";
import * as hostingService from "../services/hosting.service.js";

const router = Router();
router.use(authenticate);

const idParam = z.object({ id: z.string().uuid() });

const createSchema = z.object({
  label: z.string().min(2).max(100),
  username: z.string().regex(/^[a-z0-9_-]{3,32}$/),
  domain_id: z.string().uuid().optional(),
});

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const accounts = await hostingService.listHosting(req.userId!);
    res.json({ success: true, data: accounts });
  })
);

router.get(
  "/:id",
  validateParams(idParam),
  asyncHandler(async (req, res) => {
    const account = await hostingService.getHosting(req.userId!, req.params.id);
    res.json({ success: true, data: account });
  })
);

router.post(
  "/",
  validateBody(createSchema),
  asyncHandler(async (req, res) => {
    const account = await hostingService.createHosting(req.userId!, req.body);
    res.status(201).json({ success: true, data: account });
  })
);

router.patch(
  "/:id/suspend",
  validateParams(idParam),
  asyncHandler(async (req, res) => {
    const account = await hostingService.updateHostingStatus(req.userId!, req.params.id, "suspended");
    res.json({ success: true, data: account });
  })
);

router.delete(
  "/:id",
  validateParams(idParam),
  asyncHandler(async (req, res) => {
    await hostingService.deleteHosting(req.userId!, req.params.id);
    res.json({ success: true, data: { deleted: true } });
  })
);

export default router;
