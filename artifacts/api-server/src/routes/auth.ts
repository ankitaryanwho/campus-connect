import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, walletsTable, otpCodesTable } from "@workspace/db/schema";
import bcrypt from "bcryptjs";
import { eq, and, gt } from "drizzle-orm";
import { generateToken, authMiddleware } from "../lib/auth";
import { generateId } from "../lib/id";
import { sendOtpEmail } from "../lib/mailer";
import jwt from "jsonwebtoken";

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || "campusconnect-secret-key-2024";

export const COLLEGES = [
  { id: "bennett", name: "Bennett University (Greater Noida)", domain: "bennett.edu.in" },
  { id: "amity", name: "Amity University (Noida)", domain: "amity.edu" },
  { id: "manipal", name: "Manipal University (Jaipur)", domain: "jaipur.manipal.edu" },
  { id: "sharda", name: "Sharda University (Greater Noida)", domain: "sharda.ac.in" },
  { id: "galgotias", name: "Galgotias University (Greater Noida)", domain: "galgotiasuniversity.edu.in" },
];

router.get("/colleges", (_req, res) => {
  res.json({ colleges: COLLEGES });
});

router.post("/send-otp", async (req, res) => {
  try {
    const { email, collegeId } = req.body;
    if (!email || !collegeId) {
      res.status(400).json({ error: "ValidationError", message: "Email and college are required" });
      return;
    }

    const college = COLLEGES.find(c => c.id === collegeId);
    if (!college) {
      res.status(400).json({ error: "ValidationError", message: "Invalid college selected" });
      return;
    }

    const emailLower = email.trim().toLowerCase();
    const emailDomain = emailLower.split("@")[1];
    if (emailDomain !== college.domain) {
      res.status(400).json({
        error: "DomainError",
        message: `Please use your ${college.name} email (@${college.domain})`,
      });
      return;
    }

    const existing = await db.select().from(usersTable).where(eq(usersTable.email, emailLower)).limit(1);
    if (existing.length > 0) {
      res.status(400).json({ error: "ConflictError", message: "This email is already linked to another account" });
      return;
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await db.insert(otpCodesTable).values({
      id: generateId(),
      email: emailLower,
      code,
      expiresAt,
    });

    try {
      await sendOtpEmail(emailLower, code);
      console.log(`OTP sent via email to ${emailLower}`);
    } catch (emailErr) {
      console.error("Failed to send OTP email:", emailErr);
      res.status(500).json({ error: "EmailError", message: "Failed to send verification email. Please try again." });
      return;
    }

    res.json({ message: "Verification code sent to your email. Please check your inbox." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "ServerError", message: "Failed to send OTP" });
  }
});

router.post("/verify-otp", async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      res.status(400).json({ error: "ValidationError", message: "Email and OTP code are required" });
      return;
    }

    const emailLower = email.trim().toLowerCase();
    const now = new Date();

    const otps = await db.select().from(otpCodesTable).where(
      and(
        eq(otpCodesTable.email, emailLower),
        eq(otpCodesTable.code, code.trim()),
        eq(otpCodesTable.used, false),
        gt(otpCodesTable.expiresAt, now),
      )
    ).limit(1);

    if (otps.length === 0) {
      res.status(400).json({ error: "InvalidOTP", message: "Invalid or expired OTP. Please request a new one." });
      return;
    }

    await db.update(otpCodesTable).set({ used: true }).where(eq(otpCodesTable.id, otps[0].id));

    const verificationToken = jwt.sign(
      { email: emailLower, type: "email_verification" },
      JWT_SECRET,
      { expiresIn: "30m" }
    );

    res.json({ verificationToken });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "ServerError", message: "OTP verification failed" });
  }
});

router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role = "student", college, collegeId, program, year, phone, services, verificationToken } = req.body;
    if (!name || !email || !password) {
      res.status(400).json({ error: "ValidationError", message: "Name, email, and password are required" });
      return;
    }

    if (!verificationToken) {
      res.status(400).json({ error: "ValidationError", message: "Email verification required. Please verify your OTP." });
      return;
    }

    let tokenPayload: any;
    try {
      tokenPayload = jwt.verify(verificationToken, JWT_SECRET) as any;
    } catch {
      res.status(400).json({ error: "ValidationError", message: "Verification token expired. Please verify your OTP again." });
      return;
    }

    const emailLower = email.trim().toLowerCase();
    if (tokenPayload.type !== "email_verification" || tokenPayload.email !== emailLower) {
      res.status(400).json({ error: "ValidationError", message: "Email verification mismatch. Please verify your OTP again." });
      return;
    }

    const selectedCollege = COLLEGES.find(c => c.id === collegeId);
    if (!selectedCollege) {
      res.status(400).json({ error: "ValidationError", message: "Please select a valid college." });
      return;
    }

    const emailDomain = emailLower.split("@")[1];
    if (emailDomain !== selectedCollege.domain) {
      res.status(400).json({
        error: "DomainError",
        message: `Email must be from @${selectedCollege.domain} for ${selectedCollege.name}`,
      });
      return;
    }

    const existing = await db.select().from(usersTable).where(eq(usersTable.email, emailLower)).limit(1);
    if (existing.length > 0) {
      res.status(400).json({ error: "ConflictError", message: "This email is already linked to another account" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = generateId();

    const servicesJson = Array.isArray(services) && services.length > 0
      ? JSON.stringify(services)
      : null;

    await db.insert(usersTable).values({
      id: userId,
      name: name.trim(),
      email: emailLower,
      passwordHash,
      role,
      college: college || selectedCollege.name,
      program,
      year: year ? parseInt(year) : null,
      phone: phone ? phone.trim() : null,
      services: servicesJson,
      emailVerified: true,
      followersCount: 0,
      followingCount: 0,
      postsCount: 0,
    });

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
