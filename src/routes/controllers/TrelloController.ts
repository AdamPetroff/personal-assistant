import { Body, Controller, Delete, Get, Path, Post, Put, Route, Tags } from "tsoa";
import { TrelloService, initTrelloService } from "../../services/trello";

interface CreateTaskRequest {
    title: string;
    description?: string;
    dueDate?: string;
}

interface CreateMultipleTasksRequest {
    tasks: CreateTaskRequest[];
}

@Route("tasks")
@Tags("Tasks")
export class TrelloController extends Controller {
    private readonly trelloService: TrelloService;

    constructor() {
        super();
        this.trelloService = initTrelloService();
    }

    @Post()
    public async createTask(@Body() body: CreateTaskRequest) {
        return this.trelloService.createCard(
            this.trelloService.getDefaultListId(),
            body.title,
            body.description,
            body.dueDate ? new Date(body.dueDate) : undefined
        );
    }

    @Post("bulk")
    public async createMultipleTasks(@Body() body: CreateMultipleTasksRequest) {
        const results = [];

        for (const task of body.tasks) {
            const result = await this.trelloService.createCard(
                this.trelloService.getDefaultListId(),
                task.title,
                task.description,
                task.dueDate ? new Date(task.dueDate) : undefined
            );
            results.push(result);
        }

        return {
            success: true,
            tasks: results,
            message: `Successfully created ${results.length} tasks: ${results
                .map((task) => `"${task.name}"`)
                .join(", ")}`
        };
    }

    @Put("{taskId}/complete")
    public async completeTask(@Path() taskId: string) {
        return this.trelloService.updateCardCompletion(taskId, true);
    }

    @Delete("{taskId}")
    public async deleteTask(@Path() taskId: string) {
        await this.trelloService.deleteCard(taskId);
        return { success: true, message: "Task deleted successfully" };
    }

    @Get()
    public async listTodos() {
        const cards = await this.trelloService.getCardsInList(this.trelloService.getDefaultListId());

        if (cards.length === 0) {
            return {
                text: "You don't have any tasks in your todo list.",
                success: true,
                tasks: []
            };
        }

        return {
            success: true,
            count: cards.length,
            tasks: cards
        };
    }
}

