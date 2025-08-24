import { Router } from "express";
import { ShazamController } from "../controllers/shazam.controller";
import { upload } from "../middleware/upload.middleware";

const router: Router = Router();
const shazamController = new ShazamController();

/**
 * @openapi
 * tags:
 *   - name: Shazam
 *     description: Audio fingerprinting & identification
 */
/**
 * @openapi
 * /add_song:
 *   post:
 *     summary: Add a new song (and generate fingerprints)
 *     tags: [Shazam]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               audio:
 *                 type: string
 *                 format: binary
 *                 
 *               title:
 *                 type: string
 *               artist:
 *                 type: string
 *               album:
 *                 type: string
 *             required: [audio, title, artist]
 *     responses:
 *       201:
 *         description: Song added successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { $ref: '#/components/schemas/AddSongResponse' }
 *       400:
 *         description: Missing file or required metadata
 *       500:
 *         description: Internal server error
 */
router.post("/add_song", upload.single("audio"), shazamController.addSong);

/**
 * @openapi
 * /identify:
 *   post:
 *     summary: Identify a song from an audio clip
 *     tags: [Shazam]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               audio:
 *                 type: string
 *                 format: binary
 *             required: [audio]
 *     responses:
 *       200:
 *         description: Identification result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { $ref: '#/components/schemas/IdentifySongResponse' }
 *       400:
 *         description: No file uploaded
 *       500:
 *         description: Internal server error
 */
router.post("/identify", upload.single("audio"), shazamController.identifySong);

/**
 * @openapi
 * /stats:
 *   get:
 *     summary: Get system statistics
 *     tags: [Shazam]
 *     responses:
 *       200:
 *         description: System stats
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { $ref: '#/components/schemas/Stats' }
 *       500:
 *         description: Internal server error
 */
router.get("/stats", shazamController.getStats);

/**
 * @openapi
 * /health:
 *   get:
 *     summary: Health check
 *     tags: [Shazam]
 *     responses:
 *       200:
 *         description: Service healthy
 *       503:
 *         description: Service unhealthy
 */
router.get("/health", shazamController.healthCheck);

export default router;
