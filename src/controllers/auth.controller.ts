import { randomUUID } from "node:crypto";
import type { Request, Response } from "express";
import bcrypt from "bcrypt";
import createError from "http-errors";
import jwt from "jsonwebtoken";
import prisma from "../../prisma/client.ts";
import logger from "../logger.ts";
import type {
  LoginInput,
  RefreshInput,
  RegisterInput,
} from "../validators/auth.validator.ts";

const ACCESS_TOKEN_TTL = "15m";
const REFRESH_TOKEN_TTL = "7d";
const SALT_ROUNDS = 10;

export const publicUserSelect = {
  id: true,
  username: true,
  email: true,
  name: true,
} as const;

function signAccessToken(user: { id: number; username: string }) {
  return jwt.sign(
    { type: "access", username: user.username },
    process.env.JWT_SECRET!,
    { subject: String(user.id), expiresIn: ACCESS_TOKEN_TTL },
  );
}

function signRefreshToken(user: { id: number }) {
  // jwtid keeps tokens unique even when issued within the same second
  return jwt.sign({ type: "refresh" }, process.env.JWT_SECRET!, {
    subject: String(user.id),
    jwtid: randomUUID(),
    expiresIn: REFRESH_TOKEN_TTL,
  });
}

function issueTokens(user: { id: number; username: string }) {
  return {
    accessToken: signAccessToken(user),
    refreshToken: signRefreshToken(user),
  };
}

export async function register(req: Request, res: Response) {
  const { username, email, password, name } = req.body as RegisterInput;

  const existing = await prisma.user.findFirst({
    where: { OR: [{ username }, { email }] },
  });
  if (existing) {
    throw createError(409, "Username or email already taken");
  }

  const user = await prisma.user.create({
    data: {
      username,
      email,
      name,
      password: await bcrypt.hash(password, SALT_ROUNDS),
    },
    select: publicUserSelect,
  });

  const tokens = issueTokens(user);
  await prisma.refreshToken.create({
    data: { token: tokens.refreshToken, userId: user.id },
  });

  logger.info({ userId: user.id, username }, "User registered");
  res.status(201).json({ user, ...tokens });
}

export async function login(req: Request, res: Response) {
  const { username, password } = req.body as LoginInput;

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    logger.warn({ username }, "Failed login attempt");
    throw createError(401, "Invalid credentials");
  }

  const tokens = issueTokens(user);
  await prisma.$transaction([
    prisma.refreshToken.deleteMany({ where: { userId: user.id } }),
    prisma.refreshToken.create({
      data: { token: tokens.refreshToken, userId: user.id },
    }),
  ]);

  logger.info({ userId: user.id, username }, "User logged in");
  res.json({
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
    },
    ...tokens,
  });
}

export async function refresh(req: Request, res: Response) {
  const { refreshToken } = req.body as RefreshInput;

  try {
    const payload = jwt.verify(refreshToken, process.env.JWT_SECRET!);
    if (typeof payload === "string" || payload.type !== "refresh") {
      throw new Error("Wrong token type");
    }
  } catch {
    throw createError(401, "Invalid refresh token");
  }

  const stored = await prisma.refreshToken.findUnique({
    where: { token: refreshToken },
    include: { user: true },
  });
  if (!stored) {
    throw createError(401, "Invalid refresh token");
  }

  const tokens = issueTokens(stored.user);
  await prisma.$transaction([
    prisma.refreshToken.delete({ where: { id: stored.id } }),
    prisma.refreshToken.create({
      data: { token: tokens.refreshToken, userId: stored.userId },
    }),
  ]);

  res.json(tokens);
}

export async function logout(req: Request, res: Response) {
  await prisma.refreshToken.deleteMany({ where: { userId: req.user!.sub } });
  res.status(204).end();
}

export async function me(req: Request, res: Response) {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.sub },
    select: { ...publicUserSelect, createdAt: true },
  });
  if (!user) {
    throw createError(404, "User not found");
  }

  res.json(user);
}
