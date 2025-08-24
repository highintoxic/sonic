import { Router } from 'express';
import { UserController } from '../controllers/user.controller';

const router: Router = Router();

// GET /api/users - Get all users
router.get("/", UserController.getAllUsers);

// GET /api/users/:id - Get user by id
router.get("/:id", UserController.getUserById);

// POST /api/users - Create a new user
router.post("/", UserController.createUser);

// PUT /api/users/:id - Update user by id
router.put("/:id", UserController.updateUser);

// DELETE /api/users/:id - Delete user by id
router.delete("/:id", UserController.deleteUser);

export default router;
