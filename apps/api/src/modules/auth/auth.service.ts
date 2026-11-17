import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { AppError } from "../../lib/errors";
import { mailConfigured, sendLinkCode, sendSignupCode } from "../../lib/mail";
import { nextId, prisma } from "../../lib/prisma";
import { syncDriverPresence } from "../drivers/presence";
import { readSetupToken, signSetupToken, signToken } from "../../middleware/auth";

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
  avatar: true,
} as const;

export function toPublicUser(user: {
  id: bigint;
  username: string;
  email: string | null;
  phone: string;
  first_name: string;
  last_name: string;
  role: string;
  status: string;
  enabled: boolean;
  avatar: string | null;
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
    avatar: user.avatar,
  };
}

const SIGN_IN_ROLES = ["ADMIN", "DISPATCHER", "DRIVER", "CUSTOMER"] as const;

async function openSession(user: {
  id: bigint;
  username: string;
  email: string | null;
  phone: string;
  first_name: string;
  last_name: string;
  role: string;
  status: string;
  enabled: boolean;
  avatar: string | null;
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
  if (user.role === "DRIVER") await syncDriverPresence(user.id);
  return { token, user: toPublicUser(user) };
}

function codeHash(userId: bigint, code: string) {
  return createHash("sha256").update(`${userId}:${code}`).digest("hex");
}

function hashesMatch(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function needsSetup(user: { email_verified: boolean; must_change_password: boolean }) {
  return user.must_change_password || !user.email_verified;
}

async function issueEmailCode(
  user: { id: bigint; email: string | null },
  purpose: "signup" | "link",
  destination = user.email,
) {
  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  await prisma.login_codes.deleteMany({ where: { user_id: user.id } });
  await prisma.login_codes.create({
    data: {
      id: await nextId("login_codes_id_seq"),
      user_id: user.id,
      code_hash: codeHash(user.id, code),
      expires_at: expiresAt,
    },
  });
  if (!destination) throw new AppError(400, "Enter the email to link");
  if (mailConfigured()) {
    try {
      if (purpose === "link") await sendLinkCode(destination, code);
      else await sendSignupCode(destination, code);
    } catch {
      throw new AppError(503, "Could not send the verification email");
    }
  }
  return {
    verificationRequired: true as const,
    needsEmail: false,
    email: destination,
    previewCode: mailConfigured() ? null : code,
  };
}

async function findByUsername(username: string) {
  return prisma.users.findUnique({ where: { username: username.trim() } });
}

async function assertPassword(username: string, password: string) {
  const user = await findByUsername(username);
  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw new AppError(401, "Invalid username or password");
  }
  if (!user.enabled) {
    throw new AppError(403, "This account is blocked");
  }
  if (!SIGN_IN_ROLES.includes(user.role as (typeof SIGN_IN_ROLES)[number])) {
    throw new AppError(403, "This account cannot sign in");
  }
  return user;
}

export async function login(username: string, password: string) {
  const user = await assertPassword(username, password);
  if (needsSetup(user)) {
    return { setupRequired: true as const, email: user.pending_email ?? user.email ?? "" };
  }
  return openSession(user);
}

export async function beginEmailLink(username: string, password: string, email: string) {
  const user = await assertPassword(username, password);
  if (!needsSetup(user)) throw new AppError(409, "This account is already set up. Sign in.");
  const address = email.trim().toLowerCase();
  const taken = await prisma.users.findUnique({ where: { email: address } });
  if (taken && taken.id !== user.id) throw new AppError(409, "That email is already registered");
  await prisma.users.update({ where: { id: user.id }, data: { pending_email: address } });
  return issueEmailCode(user, "link", address);
}

export async function verifyLoginSetup(username: string, code: string) {
  const user = await findByUsername(username);
  if (!user || !user.enabled || !needsSetup(user)) {
    throw new AppError(401, "That code is not valid");
  }
  const row = await prisma.login_codes.findFirst({
    where: { user_id: user.id },
    orderBy: { created_at: "desc" },
  });
  if (!row || row.expires_at.getTime() < Date.now()) {
    throw new AppError(401, "That code expired. Sign in again to get a new one.");
  }
  if (row.attempts >= 5) {
    await prisma.login_codes.delete({ where: { id: row.id } });
    throw new AppError(401, "Too many attempts. Request a new code.");
  }
  if (!hashesMatch(row.code_hash, codeHash(user.id, code))) {
    await prisma.login_codes.update({ where: { id: row.id }, data: { attempts: { increment: 1 } } });
    throw new AppError(401, "That code is not valid");
  }
  const linkedEmail = user.pending_email ?? user.email;
  if (!linkedEmail) throw new AppError(400, "Enter the email to link");
  if (user.pending_email) {
    const taken = await prisma.users.findUnique({ where: { email: user.pending_email } });
    if (taken && taken.id !== user.id) throw new AppError(409, "That email is already registered");
  }
  await prisma.users.update({
    where: { id: user.id },
    data: { email: linkedEmail, pending_email: null, email_verified: true, must_change_password: true },
  });
  await prisma.login_codes.deleteMany({ where: { user_id: user.id } });
  return { passwordRequired: true as const, setupToken: signSetupToken(user.id) };
}

export async function completePasswordSetup(setupToken: string, password: string) {
  const userId = readSetupToken(setupToken);
  const user = await prisma.users.findUnique({ where: { id: userId } });
  if (!user || !user.enabled || !user.must_change_password) {
    throw new AppError(401, "That setup step expired. Sign in again.");
  }
  if (!user.email_verified || !user.email) {
    throw new AppError(400, "Confirm the email before choosing a password");
  }
  const hashed = await bcrypt.hash(password, 10);
  const saved = await prisma.users.update({
    where: { id: user.id },
    data: { password: hashed, must_change_password: false },
  });
  return openSession(saved);
}

export async function verifyRegister(username: string, code: string) {
  const user = await prisma.users.findUnique({ where: { username: username.trim() } });
  if (!user || !user.enabled) {
    throw new AppError(401, "That code is not valid");
  }
  if (user.email_verified) {
    throw new AppError(409, "This email is already confirmed. Sign in.");
  }
  const row = await prisma.login_codes.findFirst({
    where: { user_id: user.id },
    orderBy: { created_at: "desc" },
  });
  if (!row || row.expires_at.getTime() < Date.now()) {
    throw new AppError(401, "That code expired. Sign in again to get a new one.");
  }
  if (row.attempts >= 5) {
    await prisma.login_codes.delete({ where: { id: row.id } });
    throw new AppError(401, "Too many attempts. Request a new code.");
  }
  if (!hashesMatch(row.code_hash, codeHash(user.id, code))) {
    await prisma.login_codes.update({ where: { id: row.id }, data: { attempts: { increment: 1 } } });
    throw new AppError(401, "That code is not valid");
  }
  const linkedEmail = user.pending_email ?? user.email;
  if (!linkedEmail) throw new AppError(400, "Enter the email to link");
  if (user.pending_email) {
    const taken = await prisma.users.findUnique({ where: { email: user.pending_email } });
    if (taken && taken.id !== user.id) throw new AppError(409, "That email is already registered");
  }
  const saved = await prisma.users.update({
    where: { id: user.id },
    data: { email: linkedEmail, pending_email: null, email_verified: true },
  });
  await prisma.login_codes.deleteMany({ where: { user_id: user.id } });
  return openSession(saved);
}

export async function register(input: {
  firstName: string;
  lastName: string;
  username: string;
  email?: string | null;
  phone: string;
  password: string;
}) {
  const customerRole = await prisma.roles.findUnique({ where: { name: "ROLE_CUSTOMER" } });
  const password = await bcrypt.hash(input.password, 10);
  const userId = await nextId("users_id_seq");
  const email = input.email?.trim() || null;

  try {
    const user = await prisma.users.create({
      data: {
        id: userId,
        first_name: input.firstName,
        last_name: input.lastName,
        username: input.username,
        email,
        phone: input.phone,
        password,
        role: "CUSTOMER",
        status: "ACTIVE",
        enabled: true,
        email_verified: false,
        ...(customerRole
          ? { users_roles: { create: { role_id: customerRole.id } } }
          : {}),
      },
      select: PUBLIC_USER,
    });
    if (!email) return openSession(user);
    return issueEmailCode(user, "signup");
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
  const row = await prisma.tokens.findUnique({ where: { token }, select: { user_id: true } });
  await prisma.tokens.updateMany({
    where: { token },
    data: { revoked: true, last_modified_date: new Date() },
  });
  if (row?.user_id) await syncDriverPresence(row.user_id);
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
