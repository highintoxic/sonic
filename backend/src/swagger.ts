// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - support both CJS and ESM import styles
import swaggerJSDocImport from "swagger-jsdoc";
import type { Options } from "swagger-jsdoc";
const swaggerJSDoc: any =
	(swaggerJSDocImport as any).default || swaggerJSDocImport;
import { version } from "../package.json";

const options: Options = {
	definition: {
		openapi: "3.0.3",
		info: {
			title: "Sonic API",
			version,
			description:
				"API documentation for the Sonic (Shazam‑style) audio fingerprinting backend",
		},
		servers: [
			{
				url: "/api",
				description: "Base API path",
			},
		],
		components: {
			schemas: {
				User: {
					type: "object",
					properties: {
						id: { type: "integer", example: 1 },
						email: { type: "string", example: "user@example.com" },
						name: { type: "string", nullable: true, example: "John Doe" },
						createdAt: { type: "string", format: "date-time" },
						updatedAt: { type: "string", format: "date-time" },
					},
				},
				CreateUserInput: {
					type: "object",
					required: ["email"],
					properties: {
						email: { type: "string" },
						name: { type: "string", nullable: true },
					},
				},
				Song: {
					type: "object",
					properties: {
						id: { type: "integer" },
						title: { type: "string" },
						artist: { type: "string" },
						album: { type: "string", nullable: true },
						duration: { type: "number", nullable: true },
						createdAt: { type: "string", format: "date-time" },
					},
				},
				AddSongResponse: {
					type: "object",
					properties: {
						songId: { type: "integer" },
						title: { type: "string" },
						artist: { type: "string" },
						album: { type: "string", nullable: true },
						fingerprintsGenerated: { type: "integer" },
						processingTime: { type: "number" },
					},
				},
				IdentifySongResponse: {
					type: "object",
					properties: {
						song: { $ref: "#/components/schemas/Song" },
						confidence: { type: "number" },
						alignedMatches: { type: "integer" },
						totalQueryFingerprints: { type: "integer" },
						processingTime: { type: "number" },
					},
				},
				Stats: {
					type: "object",
					properties: {
						totalSongs: { type: "integer" },
						totalFingerprints: { type: "integer" },
						averageFingerprintsPerSong: { type: "number" },
						totalQueries: { type: "integer" },
						successfulIdentifications: { type: "integer" },
						failedIdentifications: { type: "integer" },
						successRate: { type: "number" },
					},
				},
				Health: {
					type: "object",
					properties: {
						status: { type: "string", enum: ["healthy", "unhealthy"] },
						database: { type: "boolean" },
						timestamp: { type: "string", format: "date-time" },
					},
				},
			},
		},
	},
	apis: ["./src/routes/*.ts", "./src/routes/**/*.ts"],
};

export const swaggerSpec = swaggerJSDoc(options);
