import { Request, Response } from "express";
import { UserService } from "../services/user.service";

export class UserController {
	static async getAllUsers(req: Request, res: Response) {
		try {
			const users = await UserService.getAllUsers();
			res.status(200).json({
				success: true,
				data: users,
			});
		} catch (error) {
			res.status(500).json({
				success: false,
				message: "Error fetching users",
				error: error instanceof Error ? error.message : "Unknown error",
			});
		}
	}

	static async getUserById(req: Request, res: Response) {
		try {
			const id = parseInt(req.params.id);
			const user = await UserService.getUserById(id);

			if (!user) {
				return res.status(404).json({
					success: false,
					message: "User not found",
				});
			}

			res.status(200).json({
				success: true,
				data: user,
			});
		} catch (error) {
			res.status(500).json({
				success: false,
				message: "Error fetching user",
				error: error instanceof Error ? error.message : "Unknown error",
			});
		}
	}

	static async createUser(req: Request, res: Response) {
		try {
			const { email, name } = req.body;

			if (!email) {
				return res.status(400).json({
					success: false,
					message: "Email is required",
				});
			}

			const user = await UserService.createUser({ email, name });
			res.status(201).json({
				success: true,
				data: user,
			});
		} catch (error) {
			res.status(500).json({
				success: false,
				message: "Error creating user",
				error: error instanceof Error ? error.message : "Unknown error",
			});
		}
	}

	static async updateUser(req: Request, res: Response) {
		try {
			const id = parseInt(req.params.id);
			const { email, name } = req.body;

			const user = await UserService.updateUser(id, { email, name });
			res.status(200).json({
				success: true,
				data: user,
			});
		} catch (error) {
			res.status(500).json({
				success: false,
				message: "Error updating user",
				error: error instanceof Error ? error.message : "Unknown error",
			});
		}
	}

	static async deleteUser(req: Request, res: Response) {
		try {
			const id = parseInt(req.params.id);
			const user = await UserService.deleteUser(id);
			res.status(200).json({
				success: true,
				data: user,
				message: "User deleted successfully",
			});
		} catch (error) {
			res.status(500).json({
				success: false,
				message: "Error deleting user",
				error: error instanceof Error ? error.message : "Unknown error",
			});
		}
	}
}
