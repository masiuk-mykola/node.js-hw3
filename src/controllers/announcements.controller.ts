import type { Request, Response } from "express";
import createError from "http-errors";
import prisma from "../../prisma/client.ts";
import type { Prisma } from "../../generated/prisma/client.ts";
import { publicUserSelect } from "./auth.controller.ts";
import { uploadImage } from "../cloudinary.ts";
import logger from "../logger.ts";
import type {
  CreateAnnouncementInput,
  IdParam,
  ListQuery,
  UpdateAnnouncementInput,
} from "../validators/announcements.validator.ts";

const PER_PAGE = 10;

const announcementSelect = {
  id: true,
  title: true,
  description: true,
  price: true,
  category: true,
  imageUrl: true,
  createdAt: true,
  updatedAt: true,
  user: { select: publicUserSelect },
} as const;

async function findOwnedAnnouncement(id: number, userId: number) {
  const announcement = await prisma.announcement.findUnique({
    where: { id },
    select: { userId: true },
  });
  if (!announcement) {
    throw createError(404, "Announcement not found");
  }
  if (announcement.userId !== userId) {
    throw createError(403, "Access denied");
  }
}

export async function listAnnouncements(req: Request, res: Response) {
  const { search, sort, page } = req.query as unknown as ListQuery;

  const where: Prisma.AnnouncementWhereInput = search
    ? { title: { contains: search, mode: "insensitive" } }
    : {};

  const [data, total] = await Promise.all([
    prisma.announcement.findMany({
      where,
      select: announcementSelect,
      orderBy: { createdAt: sort === "oldest" ? "asc" : "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    prisma.announcement.count({ where }),
  ]);

  res.json({
    data,
    pagination: {
      total,
      page,
      totalPages: Math.ceil(total / PER_PAGE),
      perPage: PER_PAGE,
    },
  });
}

export async function getAnnouncement(req: Request, res: Response) {
  const { id } = req.params as unknown as IdParam;

  const announcement = await prisma.announcement.findUnique({
    where: { id },
    select: announcementSelect,
  });
  if (!announcement) {
    throw createError(404, "Announcement not found");
  }

  res.json(announcement);
}

export async function createAnnouncement(req: Request, res: Response) {
  const body = req.body as CreateAnnouncementInput;
  const imageUrl = req.file ? await uploadImage(req.file.path) : undefined;

  const announcement = await prisma.announcement.create({
    data: { ...body, imageUrl, userId: req.user!.sub },
    select: announcementSelect,
  });

  logger.info(
    { announcementId: announcement.id, userId: req.user!.sub },
    "Announcement created",
  );
  res.status(201).json(announcement);
}

export async function updateAnnouncement(req: Request, res: Response) {
  const { id } = req.params as unknown as IdParam;
  const body = req.body as UpdateAnnouncementInput;

  if (Object.keys(body).length === 0 && !req.file) {
    return res.status(400).json({
      error: "Validation failed",
      details: { body: ["At least one field or an image must be provided"] },
    });
  }

  await findOwnedAnnouncement(id, req.user!.sub);
  const imageUrl = req.file ? await uploadImage(req.file.path) : undefined;

  const announcement = await prisma.announcement.update({
    where: { id },
    data: { ...body, imageUrl },
    select: announcementSelect,
  });

  logger.info(
    { announcementId: id, userId: req.user!.sub },
    "Announcement updated",
  );
  res.json(announcement);
}

export async function deleteAnnouncement(req: Request, res: Response) {
  const { id } = req.params as unknown as IdParam;
  await findOwnedAnnouncement(id, req.user!.sub);

  await prisma.announcement.delete({ where: { id } });

  res.status(204).end();
}
