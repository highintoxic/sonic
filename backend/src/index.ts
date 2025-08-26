import express, { Express, Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import cors from "cors";
import morgan from "morgan";
import routes from "./routes";
import { logger, loggerStream } from "./utils/logger";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./swagger";
import { connectToDatabase, prisma } from "./utils/prisma";

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// HTTP request logging
app.use(morgan("combined", { stream: loggerStream }));

// Swagger Docs
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.get("/", async (req: Request, res: Response) => {
	logger.info("Health check endpoint accessed");

	// Check database connection status
	let databaseStatus = "unknown";
	try {
		await prisma.$queryRaw`SELECT 1`;
		databaseStatus = "connected";
	} catch (error) {
		databaseStatus = "disconnected";
		logger.warn("Database health check failed:", {
			error: error instanceof Error ? error.message : "Unknown error",
		});
	}

	res.json({
		message: "Shazam Clone API",
		version: "1.0.0",
		status: "running",
		database: databaseStatus,
		timestamp: new Date().toISOString(),
	});
});

app.use("/api", routes);

// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
	logger.error("Unhandled error:", {
		error: err.message,
		stack: err.stack,
		url: req.url,
		method: req.method,
		ip: req.ip,
		userAgent: req.get("User-Agent"),
	});

	res.status(500).json({
		success: false,
		message: "Something went wrong!",
		error:
			process.env.NODE_ENV === "development"
				? err.message
				: "Internal server error",
	});
});

// 404 handler
app.use((req: Request, res: Response) => {
	logger.warn(`404 - Route not found: ${req.method} ${req.originalUrl}`, {
		ip: req.ip,
		userAgent: req.get("User-Agent"),
	});

	res.status(404).json({
		success: false,
		message: "Route not found",
	});
});

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
	logger.info(`Received ${signal}, shutting down gracefully`);

	try {
		// Disconnect from database
		await prisma.$disconnect();
		logger.info("Database connection closed");
	} catch (error) {
		logger.error("Error closing database connection:", {
			error: error instanceof Error ? error.message : "Unknown error",
		});
	}

	process.exit(0);
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Start server with database connection check
async function startServer() {
	try {
		// First, try to connect to the database
		await connectToDatabase();

		// Start the server only if database connection is successful
		app.listen(port, () => {
			logger.info(`🚀 Server is running at http://localhost:${port}`, {
				port: port,
				environment: process.env.NODE_ENV || "development",
				database: "connected",
			});
			logger.info(
				`📖 API Documentation available at http://localhost:${port}/docs`
			);
		});
	} catch (error) {
		logger.error("Failed to start server:", {
			error: error instanceof Error ? error.message : "Unknown error",
		});
		logger.error("💥 Shutting down due to database connection failure");
		process.exit(1);
	}
}

// Start the application
startServer().catch((error) => {
	logger.error("Unexpected error during server startup:", {
		error: error instanceof Error ? error.message : "Unknown error",
		stack: error instanceof Error ? error.stack : undefined,
	});
	process.exit(1);
});
