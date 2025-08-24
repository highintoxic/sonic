import { Router } from "express";
import userRoutes from "./user.routes";
import shazamRoutes from "./shazam.routes";

const router: Router = Router();

// Mount routes
router.use("/users", userRoutes);
router.use("/", shazamRoutes);

export default router;
