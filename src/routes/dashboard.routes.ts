import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { authenticate } from "../middleware/auth.js";
import * as dashboardService from "../services/dashboard.service.js";

const router = Router();
router.use(authenticate);

router.get(
  "/stats",
  asyncHandler(async (req, res) => {
    const stats = await dashboardService.getStats(req.userId!);
    res.json({ success: true, data: stats });
  })
);

export default router;
