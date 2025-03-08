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

// Generate chart image and return path/URL
router.get("/chart-image", async (req, res) => {
    await portfolioController.generateChartImage(req, res);
});

// Generate and serve chart image directly
router.get("/chart-image/view", async (req, res) => {
    await portfolioController.serveChartImage(req, res);
});

export default router;
