import { PrismaClient } from "@prisma/client";
import { logger } from "./logger";

const globalForPrisma = globalThis as unknown as {
	prisma: PrismaClient | undefined;
};

export const prisma =
	globalForPrisma.prisma ??
	new PrismaClient({
		log: ["error", "warn"], // Only log errors and warnings to avoid spam
	});

// Custom query logging - disabled due to TypeScript compatibility issues
// Database operations are logged at the service level instead
/*
if (
	process.env.NODE_ENV === "development" &&
	process.env.PRISMA_DEBUG === "true"
) {
	// prisma.$on("query", (e) => {
		// Skip logging bulk fingerprint insertions to reduce spam
		if (
			e.query.includes('INSERT INTO "public"."fingerprints"') &&
			e.params.split(",").length > 10
		) {
			const paramCount = e.params.split(",").length;
			logger.debug(
				`� Bulk fingerprint insertion (${Math.ceil(
					paramCount / 4
				)} records) completed in ${e.duration}ms`
			);
			return;
		}

		// Log other queries normally but with cleaner format
		if (e.duration > 50) {
			// Only log queries that take more than 50ms
			const shortQuery = e.query.replace(/\s+/g, " ").substring(0, 80);
			logger.debug(
				`� Query (${e.duration}ms): ${shortQuery}${
					e.query.length > 80 ? "..." : ""
				}`
			);
		// }
	// });
}
*/

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

/**
 * Check if the database connection is working
 */
export async function checkDatabaseConnection(): Promise<boolean> {
	try {
		logger.info("🔍 Checking database connection...");

		// Try to perform a simple query to test the connection
		await prisma.$queryRaw`SELECT 1`;

		logger.info("✅ Database connection successful");
		return true;
	} catch (error) {
		logger.error("❌ Database connection failed:", {
			error: error instanceof Error ? error.message : "Unknown error",
			stack: error instanceof Error ? error.stack : undefined,
		});
		return false;
	}
}

/**
 * Connect to the database with retry logic
 */
export async function connectToDatabase(
	maxRetries: number = 5,
	retryDelay: number = 2000
): Promise<void> {
	let attempts = 0;

	while (attempts < maxRetries) {
		attempts++;

		try {
			logger.info(`🔄 Database connection attempt ${attempts}/${maxRetries}`);

			// Connect to Prisma
			await prisma.$connect();

			// Test the connection
			const isConnected = await checkDatabaseConnection();

			if (isConnected) {
				logger.info("🎉 Successfully connected to the database");
				return;
			}

			throw new Error("Database connection test failed");
		} catch (error) {
			logger.warn(
				`Database connection attempt ${attempts}/${maxRetries} failed:`,
				{
					error: error instanceof Error ? error.message : "Unknown error",
				}
			);

			if (attempts >= maxRetries) {
				logger.error("💥 Failed to connect to database after all attempts");
				throw new Error(
					`Failed to connect to database after ${maxRetries} attempts`
				);
			}

			// Wait before retrying
			logger.info(`⏳ Waiting ${retryDelay}ms before retry...`);
			await new Promise((resolve) => setTimeout(resolve, retryDelay));
		}
	}
}
