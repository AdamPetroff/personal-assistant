import { Body, Controller, Delete, Get, Path, Post, Put, Route, Tags } from "tsoa";
import { TokenController } from "../../controllers/tokenController";

const tokenController = new TokenController();

interface CreateTokenBody {
    name: string;
    symbol: string;
    network: string;
    contractAddress?: string;
}

@Route("tokens")
@Tags("Tokens")
export class TokensRoutesController extends Controller {
    private readonly controller = new TokenController();

    @Get()
    public getAllTokens() {
        return this.controller.getAllTokensData();
    }

    @Get("network/{network}")
    public getTokensByNetwork(@Path() network: string) {
        return this.controller.getTokensByNetworkData(network);
    }

    @Post()
    public addToken(@Body() body: CreateTokenBody) {
        return this.controller.addTokenData(body as any);
    }

    @Put("{id}")
    public updateToken(@Path() id: string, @Body() body: Partial<CreateTokenBody>) {
        return this.controller.updateTokenData(id, body as any);
    }

    @Delete("{id}")
    public deleteToken(@Path() id: string) {
        return this.controller.deleteTokenData(id);
    }
}

