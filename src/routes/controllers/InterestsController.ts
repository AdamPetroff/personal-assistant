import { Body, Controller, Delete, Get, Path, Post, Route, Tags } from "tsoa";
import { interestService } from "../../services/interestService";

interface TrackInterestRequest {
    topic: string;
    description?: string;
}

@Route("interests")
@Tags("Interests")
export class InterestsController extends Controller {
    @Post()
    public async trackInterest(@Body() body: TrackInterestRequest) {
        await interestService.trackInterest(body.topic, body.description);
        return {
            success: true,
            message: "Interest added successfully. You will be notified with the details about the topic soon."
        };
    }

    @Get()
    public async getInterests() {
        const interests = await interestService.getInterests();

        if (interests.length === 0) {
            return {
                text: "You don't have any tracked interests.",
                success: true,
                interests: []
            };
        }

        return {
            success: true,
            count: interests.length,
            interests
        };
    }

    @Delete("{interestId}")
    public deleteInterest(@Path() interestId: string) {
        return interestService.deleteInterest(interestId);
    }
}

