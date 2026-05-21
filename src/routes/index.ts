import { Router } from "express";
import authRoutes from "./auth.routes.js";
import domainsRoutes from "./domains.routes.js";
import hostingRoutes from "./hosting.routes.js";
import subdomainsRoutes from "./subdomains.routes.js";
import dnsRoutes from "./dns.routes.js";
import nginxRoutes from "./nginx.routes.js";
import sslRoutes from "./ssl.routes.js";
import dashboardRoutes from "./dashboard.routes.js";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({ success: true, data: { status: "ok", service: "matuhost-api" } });
});

router.use("/auth", authRoutes);
router.use("/domains", domainsRoutes);
router.use("/hosting", hostingRoutes);
router.use("/subdomains", subdomainsRoutes);
router.use("/dns", dnsRoutes);
router.use("/nginx", nginxRoutes);
router.use("/ssl", sslRoutes);
router.use("/dashboard", dashboardRoutes);

export default router;
