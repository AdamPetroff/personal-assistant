import twilio from "twilio";
import { env } from "../config/constants";
import { twiml } from "twilio";

const accountSid = env.TWILIO_ACCOUNT_SID;
const authToken = env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

export class TwilioService {
    private client: twilio.Twilio;
    private VoiceResponse: typeof twiml.VoiceResponse;

    constructor() {
        this.client = client;
        this.VoiceResponse = twiml.VoiceResponse;
    }

    // Generate TwiML for echo stream
    public generateEchoStreamResponse(): string {
        const response = new this.VoiceResponse();

        // Add Stream with track "inbound" for receiving audio
        response.start().stream({
            name: "echo",
            track: "inbound_track"
        });

        // Connect the call and enable real-time audio stream
        const connect = response.connect();
        connect.stream({
            name: "echo",
            track: "outbound_track"
        });

        return response.toString();
    }

    // Make a call with media streams enabled
    public async makeCall(to: string) {
        // return this.client.calls.create({
        //     url: `${env.SERVER_URL}/twiml/echo`, // You'll need to create this endpoint
        //     to: to,
        //     from: "+12766226415"
        // });
    }
}

export const twilioService = new TwilioService();
