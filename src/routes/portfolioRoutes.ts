import express from "express";
import { PortfolioController } from "../controllers/portfolioController";

const router = express.Router();
const portfolioController = new PortfolioController();

// Get latest portfolio report
router.get("/latest", async (req, res) => {
    await portfolioController.getLatestReport(req, res);
});

// Generate new portfolio report
router.post("/generate", async (req, res) => {
    await portfolioController.generateReport(req, res);
});

// Get portfolio chart data
router.get("/chart-data", async (req, res) => {
    await portfolioController.getChartData(req, res);
});

export default router;
