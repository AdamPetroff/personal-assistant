import { Controller, Get, Route, Tags } from "tsoa";
import { walletService } from "../../services/wallet";

@Route("wallet")
@Tags("Wallet")
export class WalletController extends Controller {
    @Get("balance")
    public async getWalletBalance() {
        const walletData = await walletService.getAllWalletsValueUsd();
        return walletService.formatWalletReport(walletData);
    }

    @Get("holdings")
    public async getTotalHoldings() {
        const holdings = await walletService.getTotalCryptoHoldings();
        return {
            totalUsd: holdings.totalUsd,
            formattedReport: holdings.formattedReport
        };
    }
}

