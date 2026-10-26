import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Replace the real Prisma client so tests don't need a database
vi.mock("../prisma/client.ts", () => ({
  default: {
    user: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    refreshToken: {
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

const { default: prisma } = await import("../prisma/client.ts");
const { default: app } = await import("../app.ts");

const db = vi.mocked(prisma, { deep: true });

beforeEach(() => {
  vi.clearAllMocks();
});

describe("password hashing", () => {
  it("hashes the password and verifies only the right one", async () => {
    const hash = await bcrypt.hash("secret123", 10);

    expect(hash).not.toBe("secret123");
    expect(await bcrypt.compare("secret123", hash)).toBe(true);
    expect(await bcrypt.compare("wrong-password", hash)).toBe(false);
  });
});

describe("POST /auth/register", () => {
  it("returns 201 with the user and a token pair for valid data", async () => {
    const user = {
      id: 1,
      username: "ivan_petrenko",
      email: "ivan@example.com",
      name: "Іван",
    };
    db.user.findFirst.mockResolvedValue(null);
    db.user.create.mockResolvedValue(user as never);

    const res = await request(app).post("/auth/register").send({
      ...user,
      password: "secret123",
    });

    expect(res.status).toBe(201);
    expect(res.body.user).toEqual(user);
    expect(res.body.refreshToken).toEqual(expect.any(String));

    const payload = jwt.verify(res.body.accessToken, process.env.JWT_SECRET!);
    expect(payload).toMatchObject({ sub: "1", type: "access" });

    // The password must be stored hashed
    const stored = db.user.create.mock.calls[0]![0].data.password;
    expect(await bcrypt.compare("secret123", stored)).toBe(true);
  });

  it("returns 400 for invalid data", async () => {
    const res = await request(app).post("/auth/register").send({
      username: "iv",
      email: "not-an-email",
      password: "123",
      name: "Іван",
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Validation failed");
    expect(db.user.create).not.toHaveBeenCalled();
  });
});

describe("POST /auth/login", () => {
  it("returns 401 for a wrong password", async () => {
    db.user.findUnique.mockResolvedValue({
      id: 1,
      username: "ivan_petrenko",
      email: "ivan@example.com",
      name: "Іван",
      password: await bcrypt.hash("correct-password", 10),
      createdAt: new Date(),
    });

    const res = await request(app)
      .post("/auth/login")
      .send({ username: "ivan_petrenko", password: "wrong-password" });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "Invalid credentials" });
    expect(db.refreshToken.create).not.toHaveBeenCalled();
  });
});
