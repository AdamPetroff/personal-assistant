import { Body, Controller, Get, Post, Route, Tags } from "tsoa";
import { financeAnalysisService } from "../../services/financeAnalysisService";
import { startOfDay, endOfDay } from "../../utils/dateUtils";

interface AnalyzeFinancesRequest {
    startDate: string;
    endDate: string;
    includeZeroAmounts?: boolean;
    expanded?: boolean;
}

interface ComparePeriodsRequest {
    firstPeriodStart: string;
    firstPeriodEnd: string;
    secondPeriodStart: string;
    secondPeriodEnd: string;
    includeZeroAmounts?: boolean;
    expanded?: boolean;
}

@Route("finance")
@Tags("Finance")
export class FinanceController extends Controller {
    @Post("analyze")
    public async analyzeFinances(@Body() body: AnalyzeFinancesRequest) {
        const start = startOfDay(new Date(body.startDate));
        const end = endOfDay(new Date(body.endDate));

        const analysis = await financeAnalysisService.analyzeTransactionsByDateRange(start, end, {
            includeZeroAmounts: body.includeZeroAmounts,
            expanded: body.expanded
        });

        return {
            data: analysis,
            summary: `Analysis for period ${body.startDate} to ${body.endDate}: Total spending: $${analysis.totalUsdSpending.toFixed(2)}, Transactions: ${analysis.totalTransactions}`
        };
    }

    @Post("compare")
    public async comparePeriods(@Body() body: ComparePeriodsRequest) {
        const startDate1 = startOfDay(new Date(body.firstPeriodStart));
        const endDate1 = endOfDay(new Date(body.firstPeriodEnd));
        const startDate2 = startOfDay(new Date(body.secondPeriodStart));
        const endDate2 = endOfDay(new Date(body.secondPeriodEnd));

        const comparison = await financeAnalysisService.compareTimePeriods(startDate1, endDate1, startDate2, endDate2, {
            includeZeroAmounts: body.includeZeroAmounts,
            expanded: body.expanded
        });

        return {
            success: true,
            data: comparison,
            summary: `Comparison results: Period 1 ($${comparison.firstPeriod.totalUsdSpending.toFixed(2)}) vs Period 2 ($${comparison.secondPeriod.totalUsdSpending.toFixed(2)}). Change: ${comparison.differences.percentageChange.toFixed(2)}%`
        };
    }

    @Get("health")
    public healthCheck() {
        return { status: "Finance service operational" };
    }
}

