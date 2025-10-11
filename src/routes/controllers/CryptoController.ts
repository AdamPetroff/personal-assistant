import { Body, Controller, Get, Post, Route, Tags } from "tsoa";
import { cryptoService, initCryptoService } from "../../services/crypto";
import { walletService, initWalletService } from "../../services/wallet";
import { binanceService, initBinanceService } from "../../services/binance";

interface TokenDataRequest {
    contractAddress: string;
    network: string;
}

@Route("crypto")
@Tags("Crypto")
export class CryptoController extends Controller {
    constructor() {
        super();
        initCryptoService();
        initWalletService();
        initBinanceService();
    }

    @Post("token-data")
    public async getTokenData(@Body() body: TokenDataRequest) {
        const tokenData = await cryptoService().fetchTokenData(body.contractAddress, body.network as any);

        return {
            symbol: tokenData.symbol,
            name: tokenData.name,
            decimals: tokenData.decimals,
            contractAddress: tokenData.contractAddress,
            network: tokenData.network,
            networkId: tokenData.networkId
        };
    }

    @Get("wallet/balance")
    public async getWalletBalance() {
        const walletData = await walletService.getAllWalletsValueUsd();
        return walletService.formatWalletReport(walletData);
    }

    @Get("wallet/holdings")
    public async getTotalHoldings() {
        const holdings = await walletService.getTotalCryptoHoldings();
        return holdings.formattedReport;
    }

    @Get("binance/balance")
    public async getBinanceBalance() {
        const binance = binanceService();
        const balances = await binance.getNonZeroBalances();
        return binance.formatBalanceReport(balances);
    }
}
