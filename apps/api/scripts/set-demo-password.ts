import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const password = await bcrypt.hash("Admin123!", 10);
const result = await prisma.users.updateMany({ data: { password } });
console.log(`updated ${result.count} users`);
await prisma.$disconnect();
