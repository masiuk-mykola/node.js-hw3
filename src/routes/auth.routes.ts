import { Router } from "express";
import { registry } from "../openapi.ts";
import { authenticate } from "../middleware/authenticate.ts";
import { validateBody } from "../middleware/validate.ts";
import { authLimiter } from "../middleware/rateLimiter.ts";
import * as auth from "../controllers/auth.controller.ts";
import {
  authResponseSchema,
  errorSchema,
  loginSchema,
  meSchema,
  refreshSchema,
  registerSchema,
  tokenPairSchema,
} from "../validators/auth.validator.ts";

const router = Router();

router.use(authLimiter);

router.post("/register", validateBody(registerSchema), auth.register);
router.post("/login", validateBody(loginSchema), auth.login);
router.post("/refresh", validateBody(refreshSchema), auth.refresh);
router.post("/logout", authenticate, auth.logout);
router.get("/me", authenticate, auth.me);

const json = (schema: Parameters<typeof registry.register>[1]) => ({
  "application/json": { schema },
});
const error = (description: string) => ({ description, content: json(errorSchema) });

registry.registerPath({
  method: "post",
  path: "/auth/register",
  tags: ["Auth"],
  summary: "Register a new user",
  request: { body: { content: json(registerSchema) } },
  responses: {
    201: { description: "User created", content: json(authResponseSchema) },
    400: error("Validation failed"),
    409: error("Username or email already taken"),
    429: error("Too many requests, please try again later"),
  },
});

registry.registerPath({
  method: "post",
  path: "/auth/login",
  tags: ["Auth"],
  summary: "Log in",
  request: { body: { content: json(loginSchema) } },
  responses: {
    200: { description: "Logged in", content: json(authResponseSchema) },
    400: error("Validation failed"),
    401: error("Invalid credentials"),
    429: error("Too many requests, please try again later"),
  },
});

registry.registerPath({
  method: "post",
  path: "/auth/refresh",
  tags: ["Auth"],
  summary: "Rotate refresh token and get a new token pair",
  request: { body: { content: json(refreshSchema) } },
  responses: {
    200: { description: "New token pair", content: json(tokenPairSchema) },
    400: error("Validation failed"),
    401: error("Invalid refresh token"),
    429: error("Too many requests, please try again later"),
  },
});

registry.registerPath({
  method: "post",
  path: "/auth/logout",
  tags: ["Auth"],
  summary: "Invalidate the current user's refresh token",
  security: [{ bearerAuth: [] }],
  responses: {
    204: { description: "Logged out" },
    401: error("Unauthorized"),
    429: error("Too many requests, please try again later"),
  },
});

registry.registerPath({
  method: "get",
  path: "/auth/me",
  tags: ["Auth"],
  summary: "Current user profile",
  security: [{ bearerAuth: [] }],
  responses: {
    200: { description: "Current user", content: json(meSchema) },
    401: error("Unauthorized"),
    429: error("Too many requests, please try again later"),
  },
});

export default router;
