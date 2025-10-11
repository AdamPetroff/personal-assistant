import { Body, Controller, Delete, Get, Path, Post, Put, Route, Tags } from "tsoa";
import { remindersService } from "../../services/reminders";

interface CreateReminderRequest {
    title: string;
    reminderTime: string;
    description?: string;
}

@Route("reminders")
@Tags("Reminders")
export class RemindersController extends Controller {
    @Post()
    public async createReminder(@Body() body: CreateReminderRequest) {
        const reminderTime = new Date(body.reminderTime);
        return remindersService.createReminder(body.title, reminderTime, body.description);
    }

    @Get("upcoming")
    public getUpcomingReminders() {
        return remindersService.getUpcomingReminders();
    }

    @Put("{reminderId}/complete")
    public updateReminderCompletion(@Path() reminderId: string) {
        return remindersService.updateReminderCompletion(reminderId, true);
    }

    @Delete("{reminderId}")
    public deleteReminder(@Path() reminderId: string) {
        return remindersService.deleteReminder(reminderId);
    }
}

