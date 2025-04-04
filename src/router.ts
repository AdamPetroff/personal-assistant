import express, { Express } from "express";
import swaggerJSDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { twilioController } from "./controllers/twilioController";
import tokenRoutes from "./routes/tokenRoutes";
import portfolioRoutes from "./routes/portfolioRoutes";
import path from "path";
import { env } from "./config/constants";

// Swagger configuration
const swaggerOptions = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "Personal Assistant API",
            version: "1.0.0",
            description: "API documentation for the Personal Assistant application"
        },
        servers: [
            {
                url: `http://localhost:${env.PORT}`,
                description: "Development server"
            }
        ]
    },
    apis: ["./src/routes/*.ts"] // Path to the API routes with JSDoc comments
};

export default function registerRoutes(app: Express) {
    const swaggerSpec = swaggerJSDoc(swaggerOptions);
    app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

    // Register routes
    app.post("/twiml/echo", twilioController.handleEchoStream);

    // Token management routes
    app.use("/api/tokens", tokenRoutes);

    // Portfolio management routes
    app.use("/api/portfolio", portfolioRoutes);

    // Serve chart images statically
    app.use("/charts", express.static(path.join(__dirname, "../uploads/charts")));
}
