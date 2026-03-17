import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, walletsTable } from "@workspace/db/schema";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { generateToken, authMiddleware } from "../lib/auth";
import { generateId } from "../lib/id";

const router = Router();

router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role = "student", college, program } = req.body;
    if (!name || !email || !password) {
      res.status(400).json({ error: "ValidationError", message: "Name, email, and password are required" });
      return;
    }

    const existing = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (existing.length > 0) {
      res.status(400).json({ error: "ConflictError", message: "Email already registered" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = generateId();

    await db.insert(usersTable).values({
      id: userId, name, email, passwordHash, role, college, program,
      followersCount: 0, followingCount: 0, postsCount: 0,
    });

    // Create wallet
    await db.insert(walletsTable).values({
      id: generateId(), userId, balance: "0", currency: "INR",
    });

    const user = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    const token = generateToken(userId);
    const { passwordHash: _, ...safeUser } = user[0];

    res.status(201).json({ token, user: safeUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "ServerError", message: "Registration failed" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: "ValidationError", message: "Email and password are required" });
      return;
    }

    const users = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (users.length === 0) {
      res.status(401).json({ error: "AuthError", message: "Invalid email or password" });
      return;
    }

    const user = users[0];
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "AuthError", message: "Invalid email or password" });
      return;
    }

    const token = generateToken(user.id);
    const { passwordHash: _, ...safeUser } = user;
    res.json({ token, user: safeUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "ServerError", message: "Login failed" });
  }
});

router.get("/me", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const users = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (users.length === 0) {
      res.status(404).json({ error: "NotFound", message: "User not found" });
      return;
    }
    const { passwordHash: _, ...safeUser } = users[0];
    res.json(safeUser);
  } catch (err) {
    res.status(500).json({ error: "ServerError", message: "Failed to get user" });
  }
});

export default router;
