/* tslint:disable */
/* eslint-disable */
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import type { TsoaRoute } from '@tsoa/runtime';
import {  fetchMiddlewares, ExpressTemplateService } from '@tsoa/runtime';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { WalletController } from './../controllers/WalletController';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { TrelloController } from './../controllers/TrelloController';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { TokensRoutesController } from './../controllers/TokensController';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { RemindersController } from './../controllers/RemindersController';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { PortfolioRoutesController } from './../controllers/PortfolioController';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { InterestsController } from './../controllers/InterestsController';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { FinanceController } from './../controllers/FinanceController';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { ExchangeController } from './../controllers/ExchangeController';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { CryptoController } from './../controllers/CryptoController';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { CoinMarketCapController } from './../controllers/CoinMarketCapController';
import type { Request as ExRequest, Response as ExResponse, RequestHandler, Router } from 'express';



// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

const models: TsoaRoute.Models = {
    "TrelloCard": {
        "dataType": "refObject",
        "properties": {
            "id": {"dataType":"string","required":true},
            "name": {"dataType":"string","required":true},
            "desc": {"dataType":"string","required":true},
            "due": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "dueComplete": {"dataType":"boolean","required":true},
            "idList": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CreateTaskRequest": {
        "dataType": "refObject",
        "properties": {
            "title": {"dataType":"string","required":true},
            "description": {"dataType":"string"},
            "dueDate": {"dataType":"string"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CreateMultipleTasksRequest": {
        "dataType": "refObject",
        "properties": {
            "tasks": {"dataType":"array","array":{"dataType":"refObject","ref":"CreateTaskRequest"},"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "BlockchainNetwork": {
        "dataType": "refEnum",
        "enums": ["ethereum","bsc","polygon","solana","arbitrum","optimism","avalanche","base"],
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "TokenInfo": {
        "dataType": "refObject",
        "properties": {
            "contractAddress": {"dataType":"string","required":true},
            "network": {"ref":"BlockchainNetwork","required":true},
            "symbol": {"dataType":"string","required":true},
            "name": {"dataType":"string","required":true},
            "decimals": {"dataType":"double","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CreateTokenBody": {
        "dataType": "refObject",
        "properties": {
            "name": {"dataType":"string","required":true},
            "symbol": {"dataType":"string","required":true},
            "network": {"dataType":"string","required":true},
            "contractAddress": {"dataType":"string"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "Partial_CreateTokenBody_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"name":{"dataType":"string"},"symbol":{"dataType":"string"},"network":{"dataType":"string"},"contractAddress":{"dataType":"string"}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CreateReminderRequest": {
        "dataType": "refObject",
        "properties": {
            "title": {"dataType":"string","required":true},
            "reminderTime": {"dataType":"string","required":true},
            "description": {"dataType":"string"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PortfolioChartDataPoint": {
        "dataType": "refObject",
        "properties": {
            "timestamp": {"dataType":"datetime","required":true},
            "totalValueUsd": {"dataType":"double","required":true},
            "walletsValueUsd": {"dataType":"double","required":true},
            "exchangeValueUsd": {"dataType":"double","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "TrackInterestRequest": {
        "dataType": "refObject",
        "properties": {
            "topic": {"dataType":"string","required":true},
            "description": {"dataType":"string"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "Currency": {
        "dataType": "refAlias",
        "type": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["CZK"]},{"dataType":"enum","enums":["EUR"]},{"dataType":"enum","enums":["USD"]}],"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "SpendingByCategory": {
        "dataType": "refObject",
        "properties": {
            "category": {"dataType":"string","required":true},
            "totalUsdAmount": {"dataType":"double","required":true},
            "transactionCount": {"dataType":"double","required":true},
            "currency": {"ref":"Currency"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "IndividualTransaction": {
        "dataType": "refObject",
        "properties": {
            "name": {"dataType":"string","required":true},
            "usdAmount": {"dataType":"double","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "TransactionTimeRangeAnalysis": {
        "dataType": "refObject",
        "properties": {
            "startDate": {"dataType":"datetime","required":true},
            "endDate": {"dataType":"datetime","required":true},
            "totalUsdSpending": {"dataType":"double","required":true},
            "totalCzkSpending": {"dataType":"double","required":true},
            "spendingByCategory": {"dataType":"array","array":{"dataType":"refObject","ref":"SpendingByCategory"},"required":true},
            "totalTransactions": {"dataType":"double","required":true},
            "individualTransactions": {"dataType":"array","array":{"dataType":"refObject","ref":"IndividualTransaction"}},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "AnalyzeFinancesRequest": {
        "dataType": "refObject",
        "properties": {
            "startDate": {"dataType":"string","required":true},
            "endDate": {"dataType":"string","required":true},
            "includeZeroAmounts": {"dataType":"boolean"},
            "expanded": {"dataType":"boolean"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ComparePeriodsRequest": {
        "dataType": "refObject",
        "properties": {
            "firstPeriodStart": {"dataType":"string","required":true},
            "firstPeriodEnd": {"dataType":"string","required":true},
            "secondPeriodStart": {"dataType":"string","required":true},
            "secondPeriodEnd": {"dataType":"string","required":true},
            "includeZeroAmounts": {"dataType":"boolean"},
            "expanded": {"dataType":"boolean"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ConvertCurrencyRequest": {
        "dataType": "refObject",
        "properties": {
            "amount": {"dataType":"double","required":true},
            "fromCurrency": {"dataType":"string","required":true},
            "toCurrency": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "TokenDataRequest": {
        "dataType": "refObject",
        "properties": {
            "contractAddress": {"dataType":"string","required":true},
            "network": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CryptoPriceRequest": {
        "dataType": "refObject",
        "properties": {
            "symbol": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "TokenDetails": {
        "dataType": "refObject",
        "properties": {
            "id": {"dataType":"double","required":true},
            "name": {"dataType":"string","required":true},
            "symbol": {"dataType":"string","required":true},
            "category": {"dataType":"string","required":true},
            "description": {"dataType":"string"},
            "slug": {"dataType":"string","required":true},
            "logo": {"dataType":"string"},
            "subreddit": {"dataType":"string"},
            "notice": {"dataType":"string"},
            "tags": {"dataType":"array","array":{"dataType":"string"}},
            "tag_names": {"dataType":"array","array":{"dataType":"string"}},
            "tag_groups": {"dataType":"array","array":{"dataType":"string"}},
            "urls": {"dataType":"nestedObjectLiteral","nestedProperties":{"announcement":{"dataType":"array","array":{"dataType":"string"},"required":true},"source_code":{"dataType":"array","array":{"dataType":"string"},"required":true},"technical_doc":{"dataType":"array","array":{"dataType":"string"},"required":true},"reddit":{"dataType":"array","array":{"dataType":"string"},"required":true},"explorer":{"dataType":"array","array":{"dataType":"string"},"required":true},"facebook":{"dataType":"array","array":{"dataType":"string"},"required":true},"chat":{"dataType":"array","array":{"dataType":"string"},"required":true},"message_board":{"dataType":"array","array":{"dataType":"string"},"required":true},"twitter":{"dataType":"array","array":{"dataType":"string"},"required":true},"website":{"dataType":"array","array":{"dataType":"string"},"required":true}}},
            "platform": {"dataType":"nestedObjectLiteral","nestedProperties":{"token_address":{"dataType":"string","required":true},"slug":{"dataType":"string","required":true},"symbol":{"dataType":"string","required":true},"name":{"dataType":"string","required":true},"id":{"dataType":"double","required":true}}},
            "date_added": {"dataType":"string"},
            "twitter_username": {"dataType":"string"},
            "is_hidden": {"dataType":"double"},
            "date_launched": {"dataType":"string"},
            "contract_address": {"dataType":"array","array":{"dataType":"nestedObjectLiteral","nestedProperties":{"platform":{"dataType":"nestedObjectLiteral","nestedProperties":{"coin":{"dataType":"nestedObjectLiteral","nestedProperties":{"slug":{"dataType":"string","required":true},"symbol":{"dataType":"string","required":true},"name":{"dataType":"string","required":true},"id":{"dataType":"string","required":true}},"required":true},"name":{"dataType":"string","required":true}},"required":true},"contract_address":{"dataType":"string","required":true}}}},
            "self_reported_circulating_supply": {"dataType":"double"},
            "self_reported_tags": {"dataType":"array","array":{"dataType":"string"}},
            "self_reported_market_cap": {"dataType":"double"},
            "infinite_supply": {"dataType":"boolean"},
            "rank": {"dataType":"double","required":true},
            "is_active": {"dataType":"double","required":true},
            "contractAddress": {"dataType":"string"},
            "network": {"ref":"BlockchainNetwork"},
            "networkId": {"dataType":"double"},
            "decimals": {"dataType":"double"},
            "onChainSymbol": {"dataType":"string"},
            "onChainName": {"dataType":"string"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "TokenDetailsRequest": {
        "dataType": "refObject",
        "properties": {
            "symbol": {"dataType":"string","required":true},
            "network": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
};
const templateService = new ExpressTemplateService(models, {"noImplicitAdditionalProperties":"silently-remove-extras","bodyCoercion":true});

// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa




export function RegisterRoutes(app: Router) {

    // ###########################################################################################################
    //  NOTE: If you do not see routes for all of your controllers in this file, then you might not have informed tsoa of where to look
    //      Please look into the "controllerPathGlobs" config option described in the readme: https://github.com/lukeautry/tsoa
    // ###########################################################################################################


    
        const argsWalletController_getWalletBalance: Record<string, TsoaRoute.ParameterSchema> = {
        };
        app.get('/wallet/balance',
            ...(fetchMiddlewares<RequestHandler>(WalletController)),
            ...(fetchMiddlewares<RequestHandler>(WalletController.prototype.getWalletBalance)),

            async function WalletController_getWalletBalance(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsWalletController_getWalletBalance, request, response });

                const controller = new WalletController();

              await templateService.apiHandler({
                methodName: 'getWalletBalance',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsWalletController_getTotalHoldings: Record<string, TsoaRoute.ParameterSchema> = {
        };
        app.get('/wallet/holdings',
            ...(fetchMiddlewares<RequestHandler>(WalletController)),
            ...(fetchMiddlewares<RequestHandler>(WalletController.prototype.getTotalHoldings)),

            async function WalletController_getTotalHoldings(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsWalletController_getTotalHoldings, request, response });

                const controller = new WalletController();

              await templateService.apiHandler({
                methodName: 'getTotalHoldings',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsTrelloController_createTask: Record<string, TsoaRoute.ParameterSchema> = {
                body: {"in":"body","name":"body","required":true,"ref":"CreateTaskRequest"},
        };
        app.post('/tasks',
            ...(fetchMiddlewares<RequestHandler>(TrelloController)),
            ...(fetchMiddlewares<RequestHandler>(TrelloController.prototype.createTask)),

            async function TrelloController_createTask(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsTrelloController_createTask, request, response });

                const controller = new TrelloController();

              await templateService.apiHandler({
                methodName: 'createTask',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsTrelloController_createMultipleTasks: Record<string, TsoaRoute.ParameterSchema> = {
                body: {"in":"body","name":"body","required":true,"ref":"CreateMultipleTasksRequest"},
        };
        app.post('/tasks/bulk',
            ...(fetchMiddlewares<RequestHandler>(TrelloController)),
            ...(fetchMiddlewares<RequestHandler>(TrelloController.prototype.createMultipleTasks)),

            async function TrelloController_createMultipleTasks(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsTrelloController_createMultipleTasks, request, response });

                const controller = new TrelloController();

              await templateService.apiHandler({
                methodName: 'createMultipleTasks',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsTrelloController_completeTask: Record<string, TsoaRoute.ParameterSchema> = {
                taskId: {"in":"path","name":"taskId","required":true,"dataType":"string"},
        };
        app.put('/tasks/:taskId/complete',
            ...(fetchMiddlewares<RequestHandler>(TrelloController)),
            ...(fetchMiddlewares<RequestHandler>(TrelloController.prototype.completeTask)),

            async function TrelloController_completeTask(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsTrelloController_completeTask, request, response });

                const controller = new TrelloController();

              await templateService.apiHandler({
                methodName: 'completeTask',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsTrelloController_deleteTask: Record<string, TsoaRoute.ParameterSchema> = {
                taskId: {"in":"path","name":"taskId","required":true,"dataType":"string"},
        };
        app.delete('/tasks/:taskId',
            ...(fetchMiddlewares<RequestHandler>(TrelloController)),
            ...(fetchMiddlewares<RequestHandler>(TrelloController.prototype.deleteTask)),

            async function TrelloController_deleteTask(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsTrelloController_deleteTask, request, response });

                const controller = new TrelloController();

              await templateService.apiHandler({
                methodName: 'deleteTask',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsTrelloController_listTodos: Record<string, TsoaRoute.ParameterSchema> = {
        };
        app.get('/tasks',
            ...(fetchMiddlewares<RequestHandler>(TrelloController)),
            ...(fetchMiddlewares<RequestHandler>(TrelloController.prototype.listTodos)),

            async function TrelloController_listTodos(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsTrelloController_listTodos, request, response });

                const controller = new TrelloController();

              await templateService.apiHandler({
                methodName: 'listTodos',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsTokensRoutesController_getAllTokens: Record<string, TsoaRoute.ParameterSchema> = {
        };
        app.get('/tokens',
            ...(fetchMiddlewares<RequestHandler>(TokensRoutesController)),
            ...(fetchMiddlewares<RequestHandler>(TokensRoutesController.prototype.getAllTokens)),

            async function TokensRoutesController_getAllTokens(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsTokensRoutesController_getAllTokens, request, response });

                const controller = new TokensRoutesController();

              await templateService.apiHandler({
                methodName: 'getAllTokens',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsTokensRoutesController_getTokensByNetwork: Record<string, TsoaRoute.ParameterSchema> = {
                network: {"in":"path","name":"network","required":true,"dataType":"string"},
        };
        app.get('/tokens/network/:network',
            ...(fetchMiddlewares<RequestHandler>(TokensRoutesController)),
            ...(fetchMiddlewares<RequestHandler>(TokensRoutesController.prototype.getTokensByNetwork)),

            async function TokensRoutesController_getTokensByNetwork(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsTokensRoutesController_getTokensByNetwork, request, response });

                const controller = new TokensRoutesController();

              await templateService.apiHandler({
                methodName: 'getTokensByNetwork',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsTokensRoutesController_addToken: Record<string, TsoaRoute.ParameterSchema> = {
                body: {"in":"body","name":"body","required":true,"ref":"CreateTokenBody"},
        };
        app.post('/tokens',
            ...(fetchMiddlewares<RequestHandler>(TokensRoutesController)),
            ...(fetchMiddlewares<RequestHandler>(TokensRoutesController.prototype.addToken)),

            async function TokensRoutesController_addToken(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsTokensRoutesController_addToken, request, response });

                const controller = new TokensRoutesController();

              await templateService.apiHandler({
                methodName: 'addToken',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsTokensRoutesController_updateToken: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
                body: {"in":"body","name":"body","required":true,"ref":"Partial_CreateTokenBody_"},
        };
        app.put('/tokens/:id',
            ...(fetchMiddlewares<RequestHandler>(TokensRoutesController)),
            ...(fetchMiddlewares<RequestHandler>(TokensRoutesController.prototype.updateToken)),

            async function TokensRoutesController_updateToken(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsTokensRoutesController_updateToken, request, response });

                const controller = new TokensRoutesController();

              await templateService.apiHandler({
                methodName: 'updateToken',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsTokensRoutesController_deleteToken: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
        };
        app.delete('/tokens/:id',
            ...(fetchMiddlewares<RequestHandler>(TokensRoutesController)),
            ...(fetchMiddlewares<RequestHandler>(TokensRoutesController.prototype.deleteToken)),

            async function TokensRoutesController_deleteToken(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsTokensRoutesController_deleteToken, request, response });

                const controller = new TokensRoutesController();

              await templateService.apiHandler({
                methodName: 'deleteToken',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsRemindersController_createReminder: Record<string, TsoaRoute.ParameterSchema> = {
                body: {"in":"body","name":"body","required":true,"ref":"CreateReminderRequest"},
        };
        app.post('/reminders',
            ...(fetchMiddlewares<RequestHandler>(RemindersController)),
            ...(fetchMiddlewares<RequestHandler>(RemindersController.prototype.createReminder)),

            async function RemindersController_createReminder(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsRemindersController_createReminder, request, response });

                const controller = new RemindersController();

              await templateService.apiHandler({
                methodName: 'createReminder',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsRemindersController_getUpcomingReminders: Record<string, TsoaRoute.ParameterSchema> = {
        };
        app.get('/reminders/upcoming',
            ...(fetchMiddlewares<RequestHandler>(RemindersController)),
            ...(fetchMiddlewares<RequestHandler>(RemindersController.prototype.getUpcomingReminders)),

            async function RemindersController_getUpcomingReminders(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsRemindersController_getUpcomingReminders, request, response });

                const controller = new RemindersController();

              await templateService.apiHandler({
                methodName: 'getUpcomingReminders',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsRemindersController_updateReminderCompletion: Record<string, TsoaRoute.ParameterSchema> = {
                reminderId: {"in":"path","name":"reminderId","required":true,"dataType":"string"},
        };
        app.put('/reminders/:reminderId/complete',
            ...(fetchMiddlewares<RequestHandler>(RemindersController)),
            ...(fetchMiddlewares<RequestHandler>(RemindersController.prototype.updateReminderCompletion)),

            async function RemindersController_updateReminderCompletion(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsRemindersController_updateReminderCompletion, request, response });

                const controller = new RemindersController();

              await templateService.apiHandler({
                methodName: 'updateReminderCompletion',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsRemindersController_deleteReminder: Record<string, TsoaRoute.ParameterSchema> = {
                reminderId: {"in":"path","name":"reminderId","required":true,"dataType":"string"},
        };
        app.delete('/reminders/:reminderId',
            ...(fetchMiddlewares<RequestHandler>(RemindersController)),
            ...(fetchMiddlewares<RequestHandler>(RemindersController.prototype.deleteReminder)),

            async function RemindersController_deleteReminder(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsRemindersController_deleteReminder, request, response });

                const controller = new RemindersController();

              await templateService.apiHandler({
                methodName: 'deleteReminder',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsPortfolioRoutesController_getLatestReport: Record<string, TsoaRoute.ParameterSchema> = {
        };
        app.get('/portfolio/latest',
            ...(fetchMiddlewares<RequestHandler>(PortfolioRoutesController)),
            ...(fetchMiddlewares<RequestHandler>(PortfolioRoutesController.prototype.getLatestReport)),

            async function PortfolioRoutesController_getLatestReport(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsPortfolioRoutesController_getLatestReport, request, response });

                const controller = new PortfolioRoutesController();

              await templateService.apiHandler({
                methodName: 'getLatestReport',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsPortfolioRoutesController_generateReport: Record<string, TsoaRoute.ParameterSchema> = {
        };
        app.post('/portfolio/generate',
            ...(fetchMiddlewares<RequestHandler>(PortfolioRoutesController)),
            ...(fetchMiddlewares<RequestHandler>(PortfolioRoutesController.prototype.generateReport)),

            async function PortfolioRoutesController_generateReport(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsPortfolioRoutesController_generateReport, request, response });

                const controller = new PortfolioRoutesController();

              await templateService.apiHandler({
                methodName: 'generateReport',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsPortfolioRoutesController_getChartData: Record<string, TsoaRoute.ParameterSchema> = {
                days: {"in":"query","name":"days","dataType":"double"},
        };
        app.get('/portfolio/chart-data',
            ...(fetchMiddlewares<RequestHandler>(PortfolioRoutesController)),
            ...(fetchMiddlewares<RequestHandler>(PortfolioRoutesController.prototype.getChartData)),

            async function PortfolioRoutesController_getChartData(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsPortfolioRoutesController_getChartData, request, response });

                const controller = new PortfolioRoutesController();

              await templateService.apiHandler({
                methodName: 'getChartData',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsInterestsController_trackInterest: Record<string, TsoaRoute.ParameterSchema> = {
                body: {"in":"body","name":"body","required":true,"ref":"TrackInterestRequest"},
        };
        app.post('/interests',
            ...(fetchMiddlewares<RequestHandler>(InterestsController)),
            ...(fetchMiddlewares<RequestHandler>(InterestsController.prototype.trackInterest)),

            async function InterestsController_trackInterest(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsInterestsController_trackInterest, request, response });

                const controller = new InterestsController();

              await templateService.apiHandler({
                methodName: 'trackInterest',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsInterestsController_getInterests: Record<string, TsoaRoute.ParameterSchema> = {
        };
        app.get('/interests',
            ...(fetchMiddlewares<RequestHandler>(InterestsController)),
            ...(fetchMiddlewares<RequestHandler>(InterestsController.prototype.getInterests)),

            async function InterestsController_getInterests(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsInterestsController_getInterests, request, response });

                const controller = new InterestsController();

              await templateService.apiHandler({
                methodName: 'getInterests',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsInterestsController_deleteInterest: Record<string, TsoaRoute.ParameterSchema> = {
                interestId: {"in":"path","name":"interestId","required":true,"dataType":"string"},
        };
        app.delete('/interests/:interestId',
            ...(fetchMiddlewares<RequestHandler>(InterestsController)),
            ...(fetchMiddlewares<RequestHandler>(InterestsController.prototype.deleteInterest)),

            async function InterestsController_deleteInterest(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsInterestsController_deleteInterest, request, response });

                const controller = new InterestsController();

              await templateService.apiHandler({
                methodName: 'deleteInterest',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsFinanceController_analyzeFinances: Record<string, TsoaRoute.ParameterSchema> = {
                body: {"in":"body","name":"body","required":true,"ref":"AnalyzeFinancesRequest"},
        };
        app.post('/finance/analyze',
            ...(fetchMiddlewares<RequestHandler>(FinanceController)),
            ...(fetchMiddlewares<RequestHandler>(FinanceController.prototype.analyzeFinances)),

            async function FinanceController_analyzeFinances(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsFinanceController_analyzeFinances, request, response });

                const controller = new FinanceController();

              await templateService.apiHandler({
                methodName: 'analyzeFinances',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsFinanceController_comparePeriods: Record<string, TsoaRoute.ParameterSchema> = {
                body: {"in":"body","name":"body","required":true,"ref":"ComparePeriodsRequest"},
        };
        app.post('/finance/compare',
            ...(fetchMiddlewares<RequestHandler>(FinanceController)),
            ...(fetchMiddlewares<RequestHandler>(FinanceController.prototype.comparePeriods)),

            async function FinanceController_comparePeriods(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsFinanceController_comparePeriods, request, response });

                const controller = new FinanceController();

              await templateService.apiHandler({
                methodName: 'comparePeriods',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsFinanceController_healthCheck: Record<string, TsoaRoute.ParameterSchema> = {
        };
        app.get('/finance/health',
            ...(fetchMiddlewares<RequestHandler>(FinanceController)),
            ...(fetchMiddlewares<RequestHandler>(FinanceController.prototype.healthCheck)),

            async function FinanceController_healthCheck(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsFinanceController_healthCheck, request, response });

                const controller = new FinanceController();

              await templateService.apiHandler({
                methodName: 'healthCheck',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsExchangeController_convertCurrency: Record<string, TsoaRoute.ParameterSchema> = {
                body: {"in":"body","name":"body","required":true,"ref":"ConvertCurrencyRequest"},
        };
        app.post('/exchange/convert',
            ...(fetchMiddlewares<RequestHandler>(ExchangeController)),
            ...(fetchMiddlewares<RequestHandler>(ExchangeController.prototype.convertCurrency)),

            async function ExchangeController_convertCurrency(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsExchangeController_convertCurrency, request, response });

                const controller = new ExchangeController();

              await templateService.apiHandler({
                methodName: 'convertCurrency',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsCryptoController_getTokenData: Record<string, TsoaRoute.ParameterSchema> = {
                body: {"in":"body","name":"body","required":true,"ref":"TokenDataRequest"},
        };
        app.post('/crypto/token-data',
            ...(fetchMiddlewares<RequestHandler>(CryptoController)),
            ...(fetchMiddlewares<RequestHandler>(CryptoController.prototype.getTokenData)),

            async function CryptoController_getTokenData(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsCryptoController_getTokenData, request, response });

                const controller = new CryptoController();

              await templateService.apiHandler({
                methodName: 'getTokenData',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsCryptoController_getWalletBalance: Record<string, TsoaRoute.ParameterSchema> = {
        };
        app.get('/crypto/wallet/balance',
            ...(fetchMiddlewares<RequestHandler>(CryptoController)),
            ...(fetchMiddlewares<RequestHandler>(CryptoController.prototype.getWalletBalance)),

            async function CryptoController_getWalletBalance(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsCryptoController_getWalletBalance, request, response });

                const controller = new CryptoController();

              await templateService.apiHandler({
                methodName: 'getWalletBalance',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsCryptoController_getTotalHoldings: Record<string, TsoaRoute.ParameterSchema> = {
        };
        app.get('/crypto/wallet/holdings',
            ...(fetchMiddlewares<RequestHandler>(CryptoController)),
            ...(fetchMiddlewares<RequestHandler>(CryptoController.prototype.getTotalHoldings)),

            async function CryptoController_getTotalHoldings(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsCryptoController_getTotalHoldings, request, response });

                const controller = new CryptoController();

              await templateService.apiHandler({
                methodName: 'getTotalHoldings',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsCryptoController_getBinanceBalance: Record<string, TsoaRoute.ParameterSchema> = {
        };
        app.get('/crypto/binance/balance',
            ...(fetchMiddlewares<RequestHandler>(CryptoController)),
            ...(fetchMiddlewares<RequestHandler>(CryptoController.prototype.getBinanceBalance)),

            async function CryptoController_getBinanceBalance(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsCryptoController_getBinanceBalance, request, response });

                const controller = new CryptoController();

              await templateService.apiHandler({
                methodName: 'getBinanceBalance',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsCoinMarketCapController_getCryptoPrice: Record<string, TsoaRoute.ParameterSchema> = {
                body: {"in":"body","name":"body","required":true,"ref":"CryptoPriceRequest"},
        };
        app.post('/coinmarketcap/price',
            ...(fetchMiddlewares<RequestHandler>(CoinMarketCapController)),
            ...(fetchMiddlewares<RequestHandler>(CoinMarketCapController.prototype.getCryptoPrice)),

            async function CoinMarketCapController_getCryptoPrice(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsCoinMarketCapController_getCryptoPrice, request, response });

                const controller = new CoinMarketCapController();

              await templateService.apiHandler({
                methodName: 'getCryptoPrice',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsCoinMarketCapController_getTokenDetails: Record<string, TsoaRoute.ParameterSchema> = {
                body: {"in":"body","name":"body","required":true,"ref":"TokenDetailsRequest"},
        };
        app.post('/coinmarketcap/details',
            ...(fetchMiddlewares<RequestHandler>(CoinMarketCapController)),
            ...(fetchMiddlewares<RequestHandler>(CoinMarketCapController.prototype.getTokenDetails)),

            async function CoinMarketCapController_getTokenDetails(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsCoinMarketCapController_getTokenDetails, request, response });

                const controller = new CoinMarketCapController();

              await templateService.apiHandler({
                methodName: 'getTokenDetails',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa


    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
}

// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
