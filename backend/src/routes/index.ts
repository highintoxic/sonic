import { Router } from "express";
import userRoutes from "./user.routes";

const router: Router = Router();

// Mount user routes
router.use("/users", userRoutes);

export default router;
