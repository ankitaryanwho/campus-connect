import { Router } from "express";
import { db } from "@workspace/db";
import { walletsTable, transactionsTable } from "@workspace/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { authMiddleware } from "../lib/auth";
import { generateId } from "../lib/id";

const router = Router();

router.get("/", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const wallets = await db.select().from(walletsTable).where(eq(walletsTable.userId, userId)).limit(1);
    if (!wallets.length) {
      res.status(404).json({ error: "NotFound", message: "Wallet not found" });
      return;
    }
    res.json(wallets[0]);
  } catch (err) {
    res.status(500).json({ error: "ServerError", message: "Failed to get wallet" });
  }
});

router.get("/transactions", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const wallets = await db.select().from(walletsTable).where(eq(walletsTable.userId, userId)).limit(1);
    if (!wallets.length) {
      res.json({ transactions: [] });
      return;
    }
    const txns = await db.select().from(transactionsTable)
      .where(eq(transactionsTable.walletId, wallets[0].id))
      .orderBy(desc(transactionsTable.createdAt));
    res.json({ transactions: txns });
  } catch (err) {
    res.status(500).json({ error: "ServerError", message: "Failed to get transactions" });
  }
});

router.post("/add-money", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { amount, method } = req.body;
    if (!amount || amount <= 0) {
      res.status(400).json({ error: "ValidationError", message: "Valid amount required" });
      return;
    }

    const wallets = await db.select().from(walletsTable).where(eq(walletsTable.userId, userId)).limit(1);
    if (!wallets.length) {
      res.status(404).json({ error: "NotFound", message: "Wallet not found" });
      return;
    }

    await db.update(walletsTable)
      .set({ balance: sql`${walletsTable.balance} + ${amount}`, updatedAt: new Date() })
      .where(eq(walletsTable.userId, userId));

    await db.insert(transactionsTable).values({
      id: generateId(), walletId: wallets[0].id, type: "credit", amount: amount.toString(),
      description: `Added via ${method?.toUpperCase() || "UPI"}`, status: "completed",
    });

    const updated = await db.select().from(walletsTable).where(eq(walletsTable.userId, userId)).limit(1);
    res.json(updated[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "ServerError", message: "Failed to add money" });
  }
});

router.post("/transfer", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { recipientId, amount, note } = req.body;
    if (!recipientId || !amount || amount <= 0) {
      res.status(400).json({ error: "ValidationError", message: "recipientId and valid amount required" });
      return;
    }

    const senderWallet = await db.select().from(walletsTable).where(eq(walletsTable.userId, userId)).limit(1);
    const recipientWallet = await db.select().from(walletsTable).where(eq(walletsTable.userId, recipientId)).limit(1);

    if (!senderWallet.length || !recipientWallet.length) {
      res.status(404).json({ error: "NotFound", message: "Wallet not found" });
      return;
    }

    if (parseFloat(senderWallet[0].balance) < amount) {
      res.status(400).json({ error: "InsufficientFunds", message: "Insufficient wallet balance" });
      return;
    }

    await db.update(walletsTable)
      .set({ balance: sql`${walletsTable.balance} - ${amount}`, updatedAt: new Date() })
      .where(eq(walletsTable.userId, userId));
    await db.update(walletsTable)
      .set({ balance: sql`${walletsTable.balance} + ${amount}`, updatedAt: new Date() })
      .where(eq(walletsTable.userId, recipientId));

    await db.insert(transactionsTable).values({
      id: generateId(), walletId: senderWallet[0].id, type: "debit", amount: amount.toString(),
      description: note || "Transfer to user", status: "completed",
    });
    await db.insert(transactionsTable).values({
      id: generateId(), walletId: recipientWallet[0].id, type: "credit", amount: amount.toString(),
      description: note || "Received transfer", status: "completed",
    });

    const updated = await db.select().from(walletsTable).where(eq(walletsTable.userId, userId)).limit(1);
    res.json(updated[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "ServerError", message: "Failed to transfer money" });
  }
});

export default router;
