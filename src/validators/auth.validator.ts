import { z } from "zod";
import "../openapi.ts";

export const registerSchema = z
  .object({
    username: z.string().trim().min(3).max(30),
    email: z.email(),
    password: z.string().min(6),
    name: z.string().trim().min(2),
  })
  .openapi("RegisterInput");

export const loginSchema = z
  .object({
    username: z.string().min(1),
    password: z.string().min(1),
  })
  .openapi("LoginInput");

export const refreshSchema = z
  .object({
    refreshToken: z.string().min(1),
  })
  .openapi("RefreshInput");

export const publicUserSchema = z
  .object({
    id: z.number().int(),
    username: z.string(),
    email: z.string(),
    name: z.string(),
  })
  .openapi("PublicUser");

export const meSchema = publicUserSchema
  .extend({ createdAt: z.string().datetime() })
  .openapi("Me");

export const tokenPairSchema = z
  .object({
    accessToken: z.string(),
    refreshToken: z.string(),
  })
  .openapi("TokenPair");

export const authResponseSchema = tokenPairSchema
  .extend({ user: publicUserSchema })
  .openapi("AuthResponse");

export const errorSchema = z
  .object({
    error: z.string(),
    details: z.record(z.string(), z.array(z.string())).optional(),
  })
  .openapi("Error");

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
