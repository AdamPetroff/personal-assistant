import express, { Express } from "express";
import swaggerUi from "swagger-ui-express";
import { twilioController } from "./controllers/twilioController";
import path from "path";
import { RegisterRoutes } from "./routes/generated/routes";
import openApiDocument from "./routes/openapi/openapi.json";
import { env } from "./config/constants";

// Swagger configuration
export default function registerRoutes(app: Express) {
    app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));

    // Register routes
    app.post("/twiml/echo", twilioController.handleEchoStream);

    RegisterRoutes(app);

    // Serve chart images statically
    app.use("/charts", express.static(path.join(__dirname, "../uploads/charts")));
}
