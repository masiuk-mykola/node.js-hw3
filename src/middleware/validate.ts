import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";

type Source = "body" | "params" | "query";

function validate(source: Source) {
  return (schema: ZodType) =>
    (req: Request, res: Response, next: NextFunction) => {
      const result = schema.safeParse(req[source]);

      if (!result.success) {
        return res.status(400).json({
          error: "Validation failed",
          details: {
            [source]: result.error.issues.map((issue) =>
              issue.path.length
                ? `${issue.path.join(".")}: ${issue.message}`
                : issue.message,
            ),
          },
        });
      }

      // req.query is a getter in Express 5, so it can't be reassigned directly
      Object.defineProperty(req, source, {
        value: result.data,
        writable: true,
        enumerable: true,
        configurable: true,
      });
      next();
    };
}

export const validateBody = validate("body");
export const validateParams = validate("params");
export const validateQuery = validate("query");
