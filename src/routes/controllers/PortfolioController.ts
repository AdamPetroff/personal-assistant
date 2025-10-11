import { Controller, Get, Post, Route, Tags, Query } from "tsoa";
import { PortfolioController as ExistingPortfolioController } from "../../controllers/portfolioController";

@Route("portfolio")
@Tags("Portfolio")
export class PortfolioRoutesController extends Controller {
    private readonly controller = new ExistingPortfolioController();

    @Get("latest")
    public async getLatestReport() {
        try {
            return await this.controller.getLatestReportWithData();
        } catch (error) {
            return { success: false, message: (error as Error).message };
        }
    }

    @Post("generate")
    public async generateReport() {
        try {
            const result = await this.controller.generateReportWithData();
            return {
                reportId: result.reportId,
                totalValueUsd: result.totalValueUsd,
                message: "Portfolio report generated successfully"
            };
        } catch (error) {
            return { success: false, message: (error as Error).message };
        }
    }

    @Get("chart-data")
    public async getChartData(@Query() days?: number) {
        try {
            return await this.controller.getChartDataWithData(days);
        } catch (error) {
            return { success: false, message: (error as Error).message };
        }
    }
}

