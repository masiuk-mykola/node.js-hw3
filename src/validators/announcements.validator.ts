import { z } from "zod";
import "../openapi.ts";
import { publicUserSchema } from "./auth.validator.ts";

export const categories = ["sale", "service", "job", "other"] as const;

const announcementFields = {
  title: z.string().trim().min(5).max(50),
  description: z.string().trim().min(10),
  price: z.number().positive(),
  category: z.enum(categories),
};

export const createAnnouncementSchema = z
  .object(announcementFields)
  .openapi("CreateAnnouncementInput");

export const updateAnnouncementSchema = z
  .object(announcementFields)
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  })
  .openapi("UpdateAnnouncementInput");

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const listQuerySchema = z.object({
  search: z.string().trim().optional(),
  sort: z.enum(["newest", "oldest"]).default("newest"),
  page: z.coerce.number().int().positive().default(1),
});

export const announcementSchema = z
  .object({
    id: z.number().int(),
    ...announcementFields,
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    user: publicUserSchema,
  })
  .openapi("Announcement");

export const announcementListSchema = z
  .object({
    data: z.array(announcementSchema),
    pagination: z.object({
      total: z.number().int(),
      page: z.number().int(),
      totalPages: z.number().int(),
      perPage: z.number().int(),
    }),
  })
  .openapi("AnnouncementList");

export type CreateAnnouncementInput = z.infer<typeof createAnnouncementSchema>;
export type UpdateAnnouncementInput = z.infer<typeof updateAnnouncementSchema>;
export type IdParam = z.infer<typeof idParamSchema>;
export type ListQuery = z.infer<typeof listQuerySchema>;
