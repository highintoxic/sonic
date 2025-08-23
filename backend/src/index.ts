import express, { Express, Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import cors from "cors";
import morgan from "morgan";
import routes from "./routes";
import { logger, loggerStream } from "./utils/logger";

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// HTTP request logging
app.use(morgan('combined', { stream: loggerStream }));

// Routes
app.get("/", (req: Request, res: Response) => {
	logger.info("Health check endpoint accessed");
	res.json({
		message: "Shazam Clone API",
		version: "1.0.0",
		status: "running",
		timestamp: new Date().toISOString()
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
		userAgent: req.get('User-Agent')
	});
	
	res.status(500).json({
		success: false,
		message: "Something went wrong!",
		error: process.env.NODE_ENV === "development" ? err.message : "Internal server error"
	});
});

// 404 handler
app.use("*", (req: Request, res: Response) => {
	logger.warn(`404 - Route not found: ${req.method} ${req.originalUrl}`, {
		ip: req.ip,
		userAgent: req.get('User-Agent')
	});
	
	res.status(404).json({
		success: false,
		message: "Route not found"
	});
});

// Graceful shutdown
const gracefulShutdown = (signal: string) => {
	logger.info(`Received ${signal}, shutting down gracefully`);
	process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

app.listen(port, () => {
	logger.info(`🚀 Server is running at http://localhost:${port}`, {
		port: port,
		environment: process.env.NODE_ENV || 'development'
	});
});
