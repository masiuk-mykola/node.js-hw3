import { Router } from "express";
import { registry } from "../openapi.ts";
import { authenticate } from "../middleware/authenticate.ts";
import { uploadImage } from "../middleware/upload.ts";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "../middleware/validate.ts";
import * as announcements from "../controllers/announcements.controller.ts";
import {
  announcementListSchema,
  announcementSchema,
  createAnnouncementFormSchema,
  createAnnouncementSchema,
  idParamSchema,
  listQuerySchema,
  updateAnnouncementFormSchema,
  updateAnnouncementSchema,
} from "../validators/announcements.validator.ts";
import { errorSchema } from "../validators/auth.validator.ts";

const router = Router();

router.get("/", validateQuery(listQuerySchema), announcements.listAnnouncements);
router.get("/:id", validateParams(idParamSchema), announcements.getAnnouncement);
router.post(
  "/",
  authenticate,
  uploadImage,
  validateBody(createAnnouncementSchema),
  announcements.createAnnouncement,
);
router.patch(
  "/:id",
  authenticate,
  validateParams(idParamSchema),
  uploadImage,
  validateBody(updateAnnouncementSchema),
  announcements.updateAnnouncement,
);
router.delete(
  "/:id",
  authenticate,
  validateParams(idParamSchema),
  announcements.deleteAnnouncement,
);

const json = (schema: Parameters<typeof registry.register>[1]) => ({
  "application/json": { schema },
});
const form = (schema: Parameters<typeof registry.register>[1]) => ({
  "multipart/form-data": { schema },
});
const error = (description: string) => ({ description, content: json(errorSchema) });

registry.registerPath({
  method: "get",
  path: "/announcements",
  tags: ["Announcements"],
  summary: "List announcements with search, sorting and pagination",
  request: { query: listQuerySchema },
  responses: {
    200: { description: "Paginated list", content: json(announcementListSchema) },
    400: error("Validation failed"),
  },
});

registry.registerPath({
  method: "get",
  path: "/announcements/{id}",
  tags: ["Announcements"],
  summary: "Get announcement by id",
  request: { params: idParamSchema },
  responses: {
    200: { description: "Announcement", content: json(announcementSchema) },
    400: error("Validation failed"),
    404: error("Announcement not found"),
  },
});

registry.registerPath({
  method: "post",
  path: "/announcements",
  tags: ["Announcements"],
  summary: "Create announcement",
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        ...form(createAnnouncementFormSchema),
        ...json(createAnnouncementSchema),
      },
    },
  },
  responses: {
    201: { description: "Created", content: json(announcementSchema) },
    400: error("Validation failed"),
    401: error("Unauthorized"),
  },
});

registry.registerPath({
  method: "patch",
  path: "/announcements/{id}",
  tags: ["Announcements"],
  summary: "Partially update own announcement",
  security: [{ bearerAuth: [] }],
  request: {
    params: idParamSchema,
    body: {
      content: {
        ...form(updateAnnouncementFormSchema),
        ...json(updateAnnouncementSchema),
      },
    },
  },
  responses: {
    200: { description: "Updated", content: json(announcementSchema) },
    400: error("Validation failed"),
    401: error("Unauthorized"),
    403: error("Access denied"),
    404: error("Announcement not found"),
  },
});

registry.registerPath({
  method: "delete",
  path: "/announcements/{id}",
  tags: ["Announcements"],
  summary: "Delete own announcement",
  security: [{ bearerAuth: [] }],
  request: { params: idParamSchema },
  responses: {
    204: { description: "Deleted" },
    401: error("Unauthorized"),
    403: error("Access denied"),
    404: error("Announcement not found"),
  },
});

export default router;
