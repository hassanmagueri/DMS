import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { AppError } from "../../lib/errors";
import { nextId, prisma } from "../../lib/prisma";
import { signToken } from "../../middleware/auth";

const PUBLIC_USER = {
  id: true,
  username: true,
  email: true,
  phone: true,
  first_name: true,
  last_name: true,
  role: true,
  status: true,
  enabled: true,
} as const;

export function toPublicUser(user: {
  id: bigint;
  username: string;
  email: string;
  phone: string;
  first_name: string;
  last_name: string;
  role: string;
  status: string;
  enabled: boolean;
}) {
  return {
    id: Number(user.id),
    username: user.username,
    email: user.email,
    phone: user.phone,
    firstName: user.first_name,
    lastName: user.last_name,
    role: user.role,
    status: user.status,
    enabled: user.enabled,
  };
}

const SIGN_IN_ROLES = ["ADMIN", "DISPATCHER", "DRIVER", "CUSTOMER"] as const;

async function openSession(user: {
  id: bigint;
  username: string;
  email: string;
  phone: string;
  first_name: string;
  last_name: string;
  role: string;
  status: string;
  enabled: boolean;
}) {
  const token = signToken(user.id, user.role);
  await prisma.tokens.create({
    data: {
      id: await nextId("tokens_id_seq"),
      token,
      user_id: user.id,
      revoked: false,
      created_at: new Date(),
      last_modified_date: new Date(),
    },
  });
  return { token, user: toPublicUser(user) };
}

export async function login(email: string, password: string) {
  const user = await prisma.users.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw new AppError(401, "Invalid email or password");
  }
  if (!user.enabled) {
    throw new AppError(403, "Account is disabled");
  }
  if (!SIGN_IN_ROLES.includes(user.role as (typeof SIGN_IN_ROLES)[number])) {
    throw new AppError(403, "This account cannot sign in");
  }
  return openSession(user);
}

export async function register(input: {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  phone: string;
  password: string;
}) {
  const customerRole = await prisma.roles.findUnique({ where: { name: "ROLE_CUSTOMER" } });
  const password = await bcrypt.hash(input.password, 10);
  const userId = await nextId("users_id_seq");

  try {
    const user = await prisma.users.create({
      data: {
        id: userId,
        first_name: input.firstName,
        last_name: input.lastName,
        username: input.username,
        email: input.email,
        phone: input.phone,
        password,
        role: "CUSTOMER",
        status: "ACTIVE",
        enabled: true,
        ...(customerRole
          ? { users_roles: { create: { role_id: customerRole.id } } }
          : {}),
      },
      select: PUBLIC_USER,
    });
    return openSession(user);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const target = Array.isArray(error.meta?.target) ? error.meta.target.join(" ") : "";
      if (target.includes("email")) throw new AppError(409, "That email is already registered");
      if (target.includes("phone")) throw new AppError(409, "That phone number is already registered");
      if (target.includes("username")) throw new AppError(409, "That username is already taken");
      throw new AppError(409, "An account with those details already exists");
    }
    throw error;
  }
}

export async function logout(token: string) {
  await prisma.tokens.updateMany({
    where: { token },
    data: { revoked: true, last_modified_date: new Date() },
  });
}

export async function currentUser(userId: bigint) {
  const user = await prisma.users.findUnique({
    where: { id: userId },
    select: PUBLIC_USER,
  });
  if (!user) {
    throw new AppError(401, "Sign in required");
  }
  return toPublicUser(user);
}
