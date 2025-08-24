import { Router } from 'express';
import { ShazamController } from '../controllers/shazam.controller';
import { upload } from '../middleware/upload.middleware';

const router: Router = Router();
const shazamController = new ShazamController();

// Add song endpoint
router.post('/add_song', upload.single('audio'), shazamController.addSong);

// Identify song endpoint
router.post('/identify', upload.single('audio'), shazamController.identifySong);

// Get statistics endpoint
router.get('/stats', shazamController.getStats);

// Health check endpoint
router.get('/health', shazamController.healthCheck);

export default router;
