import { Body, Controller, Post, Route, Tags } from "tsoa";
import { exchangeRateService } from "../../services/exchangeRate";

interface ConvertCurrencyRequest {
    amount: number;
    fromCurrency: string;
    toCurrency: string;
}

@Route("exchange")
@Tags("Exchange")
export class ExchangeController extends Controller {
    @Post("convert")
    public async convertCurrency(@Body() body: ConvertCurrencyRequest) {
        try {
            const convertedAmount = await exchangeRateService.convertCurrency(
                body.amount,
                body.fromCurrency,
                body.toCurrency
            );

            return `${body.amount} ${body.fromCurrency} = ${convertedAmount.toFixed(2)} ${body.toCurrency}`;
        } catch (error) {
            return "Sorry, I couldn't convert the currency. Please check the currency codes and try again.";
        }
    }
}

