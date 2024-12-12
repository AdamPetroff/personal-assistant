import { Request, Response } from "express";
import { twilioService } from "../services/twillio";

export class TwilioController {
    public handleEchoStream(req: Request, res: Response): void {
        const twimlResponse = twilioService.generateEchoStreamResponse();

        res.type("text/xml");
        res.send(twimlResponse);
    }
}

export const twilioController = new TwilioController();
