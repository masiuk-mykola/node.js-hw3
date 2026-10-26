import type { NextFunction, Request, Response } from "express";
import createError from "http-errors";
import jwt from "jsonwebtoken";

export interface AuthUser {
  sub: number;
  username: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    return next(createError(401, "Unauthorized"));
  }

  try {
    const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET!);

    // Refresh tokens share the secret, so only accept tokens typed as access
    if (typeof payload === "string" || !payload.sub || payload.type !== "access") {
      return next(createError(401, "Unauthorized"));
    }

    req.user = { sub: Number(payload.sub), username: payload.username };
    next();
  } catch {
    next(createError(401, "Invalid or expired token"));
  }
}
