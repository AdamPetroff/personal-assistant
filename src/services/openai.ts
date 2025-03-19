import OpenAI from "openai";
import { env } from "../config/constants";
export class OpenAIService {
    private client: OpenAI;

    constructor() {
        if (!env.OPENAI_API_KEY) {
            throw new Error("OPENAI_API_KEY is required");
        }

        this.client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
    }
}
