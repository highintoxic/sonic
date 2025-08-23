import { prisma } from '../utils/prisma';
import { CreateUserInput, UpdateUserInput, User } from '../models/user.model';

export class UserService {
  static async getAllUsers(): Promise<User[]> {
    return await prisma.user.findMany();
  }

  static async getUserById(id: number): Promise<User | null> {
    return await prisma.user.findUnique({
      where: { id },
    });
  }

  static async createUser(data: CreateUserInput): Promise<User> {
    return await prisma.user.create({
      data,
    });
  }

  static async updateUser(id: number, data: UpdateUserInput): Promise<User> {
    return await prisma.user.update({
      where: { id },
      data,
    });
  }

  static async deleteUser(id: number): Promise<User> {
    return await prisma.user.delete({
      where: { id },
    });
  }
}
