import { Body, Controller, Post, Route, Tags } from "tsoa";
import { initCoinMarketCapService } from "../../services/coinMarketCap";

interface CryptoPriceRequest {
    symbol: string;
}

interface TokenDetailsRequest {
    symbol: string;
    network: string;
}

@Route("coinmarketcap")
@Tags("CoinMarketCap")
export class CoinMarketCapController extends Controller {
    private readonly coinMarketCap = initCoinMarketCapService();

    @Post("price")
    public async getCryptoPrice(@Body() body: CryptoPriceRequest) {
        const { price, change24h } = await this.coinMarketCap.getTokenPrice(body.symbol.toUpperCase());
        return this.coinMarketCap.formatPriceMessage(body.symbol.toUpperCase(), price, change24h);
    }

    @Post("details")
    public async getTokenDetails(@Body() body: TokenDetailsRequest) {
        const tokenDetails = await this.coinMarketCap.getTokenDetails(body.symbol.toUpperCase(), body.network);

        if (!tokenDetails) {
            return {
                success: false,
                message: `Token details not found for ${body.symbol} on ${body.network}`
            };
        }

        return tokenDetails;
    }
}

